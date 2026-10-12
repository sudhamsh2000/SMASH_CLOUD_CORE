"""One adapter for every provider that speaks the OpenAI Chat Completions protocol.

OpenAI itself, Google Gemini (via its OpenAI-compatible endpoint) and Ollama all accept
the same request shape, so they differ only in base URL, key and model name.

Tool calls in this protocol differ from Anthropic's:
- they stream as fragments: chunk 1 carries {index: 0, id, name}, later chunks append
  pieces of the `arguments` JSON *string*, so we reassemble them by index;
- the assistant turn is sent back with a `tool_calls` list, and each result is its own
  message with role "tool" and the matching `tool_call_id`.
"""

import asyncio
import json
from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from .base import ChatTurn, Done, StreamEvent, TextDelta, ToolCall, ToolResult


class OpenAICompatibleProvider:
    def __init__(self, id: str, label: str, model: str, api_key: str, base_url: str | None = None, enabled: bool = True):
        self.id = id
        self.label = label
        self.model = model
        self._enabled = enabled and bool(api_key)
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url) if self._enabled else None

    def available(self) -> bool:
        return self._client is not None

    async def stream(self, history: list[ChatTurn], system: str, model: str, toolbox=None,
                     max_rounds: int = 8) -> AsyncIterator[StreamEvent]:
        assert self._client is not None
        messages: list[dict] = [{"role": "system", "content": system}]
        messages += [{"role": t.role, "content": t.content} for t in history]
        tools = [{"type": "function", "function": {"name": s["name"], "description": s["description"],
                                                   "parameters": s["input_schema"]}}
                 for s in toolbox.specs()] if toolbox else None

        input_tokens = output_tokens = 0
        served_model, finish_reason, wrote_text = model, None, False
        for _ in range(max_rounds):
            extra = {"tools": tools} if tools else {}
            stream = await self._client.chat.completions.create(
                model=model, messages=messages, stream=True, stream_options={"include_usage": True}, **extra,
            )
            text_parts: list[str] = []
            calls: dict[int, dict] = {}  # index -> {"id", "name", "arguments", "extra"}
            finish_reason = None
            async for chunk in stream:
                served_model = chunk.model or served_model
                if chunk.usage:
                    input_tokens += chunk.usage.prompt_tokens or 0
                    output_tokens += chunk.usage.completion_tokens or 0
                if not chunk.choices:
                    continue
                choice = chunk.choices[0]
                delta = choice.delta
                if delta and delta.content:
                    wrote_text = True
                    text_parts.append(delta.content)
                    yield TextDelta(delta.content)
                for tc in (delta.tool_calls or []) if delta else []:
                    # OpenAI streams fragments tagged with an index. Gemini sends each call
                    # whole with index=None, so each such chunk is a new call.
                    index = tc.index if tc.index is not None else len(calls)
                    slot = calls.setdefault(index, {"id": "", "name": "", "arguments": "", "extra": None})
                    if tc.id:
                        slot["id"] = tc.id
                    if tc.function and tc.function.name:
                        slot["name"] = tc.function.name
                    if tc.function and tc.function.arguments:
                        slot["arguments"] += tc.function.arguments
                    # Provider-specific data that must be sent back unchanged. Gemini puts its
                    # thought_signature (encrypted reasoning state) here and rejects the next
                    # request without it, the same idea as Claude's thinking blocks.
                    if (tc.model_extra or {}).get("extra_content"):
                        slot["extra"] = tc.model_extra["extra_content"]
                finish_reason = choice.finish_reason or finish_reason

            if not calls:
                break
            if finish_reason == "length":
                yield TextDelta("\n\n_[Stopped: the reply hit the token limit while calling a tool.]_")
                break

            ordered = [calls[i] for i in sorted(calls)]
            for i, c in enumerate(ordered):
                c["id"] = c["id"] or f"call_{i}"  # some compatible servers omit ids
            messages.append({
                "role": "assistant", "content": "".join(text_parts) or None,
                "tool_calls": [{"id": c["id"], "type": "function",
                                "function": {"name": c["name"], "arguments": c["arguments"] or "{}"},
                                **({"extra_content": c["extra"]} if c["extra"] else {})} for c in ordered],
            })
            for c in ordered:
                yield ToolCall(c["id"], c["name"], _parse_args(c["arguments"]))
            outputs = await asyncio.gather(*(toolbox.call(c["name"], c["arguments"]) for c in ordered))
            for c, (out, is_error) in zip(ordered, outputs):
                yield ToolResult(c["id"], c["name"], out, is_error)
                messages.append({"role": "tool", "tool_call_id": c["id"], "content": out})
            if wrote_text:
                yield TextDelta("\n\n")
        else:
            yield TextDelta(f"\n\n_[Stopped after {max_rounds} tool rounds.]_")

        yield Done(model=served_model, input_tokens=input_tokens or None, output_tokens=output_tokens or None,
                   stop_reason=finish_reason)


def _parse_args(raw: str) -> object:
    """Arguments arrive as a JSON string; show them as an object when they parse."""
    try:
        return json.loads(raw or "{}")
    except json.JSONDecodeError:
        return raw

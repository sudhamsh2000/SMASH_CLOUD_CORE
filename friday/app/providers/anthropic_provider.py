"""Claude via the Anthropic Messages API, including the tool-use loop.

One reply can take several API calls:

    call 1:  messages=[...history]                       -> Claude: tool_use(system_stats)
    call 2:  ...history + [assistant: call 1's content]  -> Claude: "CPU is at 12%..."
                        + [user: tool_result]

Two rules make that work:
- Append Claude's *entire* `content` back as the assistant turn, not just its text. It
  contains the tool_use blocks (whose ids the results must reference) and thinking blocks
  (Claude's reasoning, which must be passed back unchanged to continue it).
- All tool results for one turn go back together in a single user message.
"""

import asyncio
from collections.abc import AsyncIterator

from anthropic import AsyncAnthropic

from .base import ChatTurn, Done, StreamEvent, TextDelta, ToolCall, ToolResult


class AnthropicProvider:
    id = "anthropic"
    label = "Claude"

    def __init__(self, api_key: str, model: str, effort: str):
        self.model = model
        self._effort = effort
        self._client = AsyncAnthropic(api_key=api_key) if api_key else None

    def available(self) -> bool:
        return self._client is not None

    async def stream(self, history: list[ChatTurn], system: str, model: str, toolbox=None,
                     max_rounds: int = 8) -> AsyncIterator[StreamEvent]:
        assert self._client is not None
        messages: list[dict] = [{"role": t.role, "content": t.content} for t in history]
        # eager_input_streaming: tool arguments stream as generated instead of being
        # buffered server-side. The trade-off is that the server no longer validates them,
        # which Toolbox.call does (Pydantic) before running anything.
        tools = [{**spec, "eager_input_streaming": True} for spec in toolbox.specs()] if toolbox else []
        input_tokens = output_tokens = 0
        wrote_text = False

        for _ in range(max_rounds):
            extra = {"tools": tools} if tools else {}
            async with self._client.beta.messages.stream(
                model=model,
                max_tokens=64000,
                system=system,
                messages=messages,
                output_config={"effort": self._effort},
                # If a safety classifier declines, the API retries on Anthropic's recommended
                # fallback model inside the same call instead of returning a refusal.
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                **extra,
            ) as stream:
                async for event in stream:
                    if event.type == "text":
                        if not wrote_text and event.text:
                            wrote_text = True
                        yield TextDelta(event.text)
                final = await stream.get_final_message()

            input_tokens += final.usage.input_tokens
            output_tokens += final.usage.output_tokens
            tool_uses = [b for b in final.content if b.type == "tool_use"]

            if final.stop_reason == "refusal":
                # A refusal can cut a tool_use off mid-input: never run that turn's tools.
                yield TextDelta("\n\n_[Claude declined to answer this request.]_")
                break
            if final.stop_reason == "pause_turn":
                messages.append({"role": "assistant", "content": final.content})
                continue
            if not tool_uses:
                break
            if final.stop_reason == "max_tokens":
                # A truncated tool input still parses as a (partial) object; don't run it.
                yield TextDelta("\n\n_[Stopped: the reply hit the token limit while calling a tool.]_")
                break

            messages.append({"role": "assistant", "content": final.content})
            for b in tool_uses:
                yield ToolCall(b.id, b.name, b.input)
            # Independent tools run concurrently; results return in the same order.
            outputs = await asyncio.gather(*(toolbox.call(b.name, b.input) for b in tool_uses))
            results = []
            for b, (out, is_error) in zip(tool_uses, outputs):
                yield ToolResult(b.id, b.name, out, is_error)
                results.append({"type": "tool_result", "tool_use_id": b.id, "content": out, "is_error": is_error})
            messages.append({"role": "user", "content": results})
            if wrote_text:
                yield TextDelta("\n\n")  # keep text written before and after the tool calls apart
        else:
            yield TextDelta(f"\n\n_[Stopped after {max_rounds} tool rounds.]_")

        yield Done(model=final.model, input_tokens=input_tokens, output_tokens=output_tokens,
                   stop_reason=final.stop_reason)

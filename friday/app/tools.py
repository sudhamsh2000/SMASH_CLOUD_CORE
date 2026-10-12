"""FRIDAY's tools: functions the model may ask FRIDAY to run.

How tool calling works (provider-neutral):
  1. FRIDAY sends the conversation plus a list of tool *specs* (name, description, JSON schema).
  2. Instead of answering, the model may reply "call system_stats with {}".
  3. FRIDAY runs the function and sends the result back to the model.
  4. The model either calls more tools or writes its answer using the results.

The model never runs anything itself. It can only *ask*; this file decides what exists
and what each call is allowed to do. Every tool here is read-only on purpose: FRIDAY can
look at SMASH Cloud but not change it. Tools that act (restart, deploy) will need an
explicit approval step before they run.

Adding a tool = one Pydantic model for its input + one async function + one Tool entry.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime

import httpx
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select, text

from .config import get_settings
from .db import Conversation, Message, SessionLocal

MAX_RESULT_CHARS = 8_000  # tool output goes back into the model's context; keep it bounded


@dataclass
class ToolContext:
    """What a tool may use while running on behalf of the logged-in user."""

    token: str  # the user's JWT, forwarded so other services apply the same auth
    http: httpx.AsyncClient


@dataclass
class Tool:
    name: str
    description: str  # the model reads this to decide *when* to call the tool: be specific
    input_model: type[BaseModel]
    run: Callable[[BaseModel, ToolContext], Awaitable[object]]

    def schema(self) -> dict:
        s = self.input_model.model_json_schema()
        s.pop("title", None)
        s.setdefault("properties", {})
        s["additionalProperties"] = False
        return s


# ── Tool implementations ──────────────────────────────────────────────────
class NoInput(BaseModel):
    pass


async def _get(ctx: ToolContext, url: str) -> dict:
    r = await ctx.http.get(url, headers={"Authorization": f"Bearer {ctx.token}"})
    r.raise_for_status()
    return r.json()


async def system_stats(_: NoInput, ctx: ToolContext) -> object:
    return await _get(ctx, f"{get_settings().smash_api_url}/api/system/stats")


async def service_health(_: NoInput, ctx: ToolContext) -> object:
    s = get_settings()
    targets = {"smash-api": f"{s.smash_api_url}/api/health", "veronica": f"{s.veronica_url}/api/veronica/health"}

    async def probe(url: str) -> str:
        try:
            r = await ctx.http.get(url, timeout=3)
            return "healthy" if r.status_code == 200 else f"unhealthy (HTTP {r.status_code})"
        except httpx.HTTPError as e:
            return f"unreachable ({type(e).__name__})"

    async def postgres() -> str:
        try:
            async with SessionLocal() as db:
                await db.execute(text("SELECT 1"))
            return "healthy"
        except Exception as e:  # any driver error means the database is not usable
            return f"unreachable ({type(e).__name__})"

    names = list(targets)
    results = await asyncio.gather(*(probe(u) for u in targets.values()), postgres())
    return {"friday": "healthy (answering this request)", **dict(zip(names + ["postgres"], results))}


async def veronica_status(_: NoInput, ctx: ToolContext) -> object:
    summary = await _get(ctx, f"{get_settings().veronica_url}/api/veronica/summary")
    summary.pop("series", None)  # the full loss curve is noise for the model; latest values suffice
    return summary


class GenerateInput(BaseModel):
    prompt: str = Field(description="Text for VERONICA to continue. It writes novel-style prose, not chat.",
                        min_length=1, max_length=2000)
    max_tokens: int = Field(120, ge=1, le=400, description="How many tokens to generate")


async def veronica_generate(args: GenerateInput, ctx: ToolContext) -> object:
    url = f"{get_settings().veronica_url}/api/veronica/generate"
    text_parts: list[str] = []
    async with ctx.http.stream("POST", url, json={"prompt": args.prompt, "max_tokens": args.max_tokens},
                               headers={"Authorization": f"Bearer {ctx.token}"}, timeout=120) as r:
        r.raise_for_status()
        event = None
        async for line in r.aiter_lines():
            if line.startswith("event: "):
                event = line[7:]
            elif line.startswith("data: ") and event == "delta":
                text_parts.append(json.loads(line[6:])["text"])
    return {"continuation": "".join(text_parts)}


class SearchInput(BaseModel):
    query: str = Field(description="Words to look for in past conversations", min_length=2, max_length=200)
    limit: int = Field(5, ge=1, le=20)


async def search_conversations(args: SearchInput, _: ToolContext) -> object:
    async with SessionLocal() as db:
        rows = (await db.execute(
            select(Conversation.title, Message.role, Message.content, Message.created_at)
            .join(Message, Message.conversation_id == Conversation.id)
            .where(Message.content.ilike(f"%{args.query}%"))
            .order_by(Message.created_at.desc()).limit(args.limit)
        )).all()
    return [{"conversation": t, "role": r, "when": w.isoformat(), "excerpt": _excerpt(c, args.query)}
            for t, r, c, w in rows]


def _excerpt(content: str, query: str, width: int = 300) -> str:
    i = content.lower().find(query.lower())
    start = max(0, i - width // 2)
    return ("…" if start else "") + content[start : start + width] + ("…" if start + width < len(content) else "")


async def current_time(_: NoInput, __: ToolContext) -> object:
    return {"utc": datetime.now(UTC).isoformat(timespec="seconds")}


TOOLS: list[Tool] = [
    Tool("system_stats", "Live CPU, memory, disk, network and uptime of the SMASH Cloud host.", NoInput, system_stats),
    Tool("service_health", "Check whether each SMASH Cloud service (smash-api, veronica, postgres) is up.",
         NoInput, service_health),
    Tool("veronica_status", "Training status of VERONICA, the from-scratch language model: run, step, losses, "
         "throughput, dataset and the latest generated sample.", NoInput, veronica_status),
    Tool("veronica_generate", "Ask VERONICA (a small model trained on public-domain novels) to continue a "
         "piece of text. Use when the user wants to see what VERONICA writes.", GenerateInput, veronica_generate),
    Tool("search_conversations", "Search the user's past FRIDAY conversations for a word or phrase.",
         SearchInput, search_conversations),
    Tool("current_time", "The current date and time in UTC.", NoInput, current_time),
]


class Toolbox:
    """The interface providers use: specs to advertise, and `call` to execute.

    `call` never raises. A failing tool becomes an error *result* the model can read and
    react to ("the service is down, so..."), which is far more useful than aborting the reply.
    """

    def __init__(self, ctx: ToolContext, tools: list[Tool] | None = None):
        self.ctx = ctx
        self.tools = {t.name: t for t in (tools if tools is not None else TOOLS)}

    def specs(self) -> list[dict]:
        return [{"name": t.name, "description": t.description, "input_schema": t.schema()} for t in self.tools.values()]

    async def call(self, name: str, raw_input: object) -> tuple[str, bool]:
        """Returns (result_text, is_error)."""
        tool = self.tools.get(name)
        if tool is None:
            return f"Unknown tool {name!r}", True
        try:
            if isinstance(raw_input, str):  # OpenAI-style APIs send arguments as a JSON string
                raw_input = json.loads(raw_input or "{}")
            args = tool.input_model.model_validate(raw_input or {})
        except (json.JSONDecodeError, ValidationError) as e:
            # Validate before running: the model's arguments are untrusted input.
            return json.dumps({"INVALID_INPUT": str(raw_input)[:500], "error": str(e)[:500]}), True
        try:
            result = await tool.run(args, self.ctx)
        except httpx.HTTPStatusError as e:
            return f"{name} failed: HTTP {e.response.status_code} from {e.request.url.path}", True
        except Exception as e:  # report any tool failure to the model instead of crashing the reply
            return f"{name} failed: {type(e).__name__}: {e}", True
        out = result if isinstance(result, str) else json.dumps(result, default=str)
        if len(out) > MAX_RESULT_CHARS:
            out = out[:MAX_RESULT_CHARS] + "…[truncated]"
        return out, False

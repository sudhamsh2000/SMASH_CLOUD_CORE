import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select

from .auth import CurrentUser, require_user
from .config import get_settings
from .db import AsyncSession, Conversation, Message, SessionLocal, get_session, init_db
from .providers.base import ChatTurn, Done, TextDelta, ToolCall, ToolResult
from .router import Attempt, ModelRouter
from .tools import ToolContext, Toolbox
from . import voice

logging.basicConfig(level=logging.INFO)
router: ModelRouter
http: httpx.AsyncClient  # shared connection pool for tools calling other services


@asynccontextmanager
async def lifespan(_: FastAPI):
    global router, http
    await init_db()
    router = ModelRouter(get_settings())
    http = httpx.AsyncClient(timeout=15)
    yield
    await http.aclose()


app = FastAPI(
    title="FRIDAY", version="0.1.0", lifespan=lifespan,
    docs_url="/api/friday/docs", openapi_url="/api/friday/openapi.json",
)
API = "/api/friday"
app.include_router(voice.router, prefix=API, tags=["voice"])


class ConversationOut(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime


class MessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    provider: str | None
    model: str | None
    input_tokens: int | None
    output_tokens: int | None
    latency_ms: int | None
    tool_calls: list | None = None
    created_at: datetime


class ConversationDetail(ConversationOut):
    messages: list[MessageOut]


class RenameIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class SendIn(BaseModel):
    content: str = Field(min_length=1, max_length=100_000)
    provider: str | None = None
    model: str | None = None
    tools: bool = True  # let the model call FRIDAY's tools for this reply


@app.get(f"{API}/health")
def health() -> dict:
    return {"service": "friday", "status": "ok"}


@app.get(f"{API}/providers")
def providers(_: CurrentUser = Depends(require_user)) -> dict:
    return {"default": router.default, "providers": router.describe()}


@app.get(f"{API}/conversations", response_model=list[ConversationOut])
async def list_conversations(
    q: str | None = None, _: CurrentUser = Depends(require_user), db: AsyncSession = Depends(get_session)
):
    stmt = select(Conversation).order_by(Conversation.updated_at.desc()).limit(200)
    if q:
        # Search titles and message bodies. Plain ILIKE is enough at personal scale.
        hits = select(Message.conversation_id).where(Message.content.ilike(f"%{q}%"))
        stmt = stmt.where(Conversation.title.ilike(f"%{q}%") | Conversation.id.in_(hits))
    return (await db.scalars(stmt)).all()


@app.post(f"{API}/conversations", response_model=ConversationOut, status_code=201)
async def create_conversation(_: CurrentUser = Depends(require_user), db: AsyncSession = Depends(get_session)):
    conv = Conversation()
    db.add(conv)
    await db.commit()
    return conv


async def _get_conv(db: AsyncSession, conv_id: uuid.UUID) -> Conversation:
    conv = await db.get(Conversation, conv_id)
    if conv is None:
        raise HTTPException(404, "Conversation not found")
    return conv


@app.get(f"{API}/conversations/{{conv_id}}", response_model=ConversationDetail)
async def get_conversation(conv_id: uuid.UUID, _: CurrentUser = Depends(require_user), db: AsyncSession = Depends(get_session)):
    conv = await _get_conv(db, conv_id)
    msgs = (await db.scalars(select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at))).all()
    return ConversationDetail(**ConversationOut.model_validate(conv, from_attributes=True).model_dump(),
                              messages=[MessageOut.model_validate(m, from_attributes=True) for m in msgs])


@app.patch(f"{API}/conversations/{{conv_id}}", response_model=ConversationOut)
async def rename_conversation(
    conv_id: uuid.UUID, body: RenameIn, _: CurrentUser = Depends(require_user), db: AsyncSession = Depends(get_session)
):
    conv = await _get_conv(db, conv_id)
    conv.title = body.title
    await db.commit()
    return conv


@app.delete(f"{API}/conversations/{{conv_id}}", status_code=204)
async def delete_conversation(conv_id: uuid.UUID, _: CurrentUser = Depends(require_user), db: AsyncSession = Depends(get_session)):
    await _get_conv(db, conv_id)
    await db.execute(delete(Conversation).where(Conversation.id == conv_id))
    await db.commit()


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.post(f"{API}/conversations/{{conv_id}}/messages")
async def send_message(
    conv_id: uuid.UUID, body: SendIn, user: CurrentUser = Depends(require_user), db: AsyncSession = Depends(get_session)
):
    """Stores the user's message, then streams the reply as Server-Sent Events:
    `attempt` (which provider/model is answering), `delta` (text chunks),
    `tool_call` / `tool_result` (FRIDAY running a tool), `done` (saved message with
    usage) or `error`."""
    settings = get_settings()
    conv = await _get_conv(db, conv_id)

    prior = (await db.scalars(
        select(Message).where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.desc()).limit(settings.friday_history_limit)
    )).all()
    history = [ChatTurn(m.role, m.content) for m in reversed(prior) if m.content]
    # Providers require the history to start with a user turn.
    while history and history[0].role != "user":
        history.pop(0)
    history.append(ChatTurn("user", body.content))

    db.add(Message(conversation_id=conv_id, role="user", content=body.content))
    if conv.title == "New conversation":
        conv.title = body.content.strip().splitlines()[0][:60] or conv.title
    conv.updated_at = datetime.now(UTC)
    await db.commit()

    async def events():
        started = time.monotonic()
        parts: list[str] = []
        attempt: Attempt | None = None
        done: Done | None = None
        tool_log: list[dict] = []
        toolbox = Toolbox(ToolContext(token=user.token, http=http)) if body.tools else None
        try:
            async for ev in router.stream(history, settings.friday_system_prompt, body.provider, body.model,
                                          toolbox, settings.friday_max_tool_rounds):
                if isinstance(ev, Attempt):
                    attempt = ev
                    yield _sse("attempt", {"provider": ev.provider, "model": ev.model})
                elif isinstance(ev, ToolCall):
                    tool_log.append({"id": ev.id, "name": ev.name, "input": ev.input})
                    yield _sse("tool_call", {"id": ev.id, "name": ev.name, "input": ev.input})
                elif isinstance(ev, ToolResult):
                    for t in tool_log:
                        if t["id"] == ev.id:
                            t.update(output=ev.output, is_error=ev.is_error)
                    yield _sse("tool_result", {"id": ev.id, "name": ev.name, "output": ev.output,
                                               "is_error": ev.is_error})
                elif isinstance(ev, TextDelta):
                    parts.append(ev.text)
                    yield _sse("delta", {"text": ev.text})
                elif isinstance(ev, Done):
                    done = ev
        except Exception as e:
            logging.exception("chat stream failed")
            yield _sse("error", {"message": f"{type(e).__name__}: {e}"})
            if not parts and not tool_log:
                return

        # Save whatever was produced (a partial reply is still worth keeping).
        async with SessionLocal() as s:
            msg = Message(
                conversation_id=conv_id, role="assistant", content="".join(parts),
                provider=attempt.provider if attempt else None,
                model=done.model if done else (attempt.model if attempt else None),
                input_tokens=done.input_tokens if done else None,
                output_tokens=done.output_tokens if done else None,
                latency_ms=int((time.monotonic() - started) * 1000),
                tool_calls=tool_log or None,
            )
            s.add(msg)
            await s.commit()
            yield _sse("done", MessageOut.model_validate(msg, from_attributes=True).model_dump(mode="json"))

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get(f"{API}/usage")
async def usage(_: CurrentUser = Depends(require_user), db: AsyncSession = Depends(get_session)) -> list[dict]:
    rows = await db.execute(
        select(
            Message.provider, Message.model, func.count(),
            func.coalesce(func.sum(Message.input_tokens), 0), func.coalesce(func.sum(Message.output_tokens), 0),
            func.avg(Message.latency_ms),
        ).where(Message.role == "assistant").group_by(Message.provider, Message.model)
    )
    return [
        {"provider": p, "model": m, "replies": n, "input_tokens": int(i), "output_tokens": int(o),
         "avg_latency_ms": int(lat) if lat is not None else None}
        for p, m, n, i, o, lat in rows
    ]

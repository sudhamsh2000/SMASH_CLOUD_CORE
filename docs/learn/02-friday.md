# 02 · FRIDAY: talking to language models

FRIDAY is the assistant. It doesn't contain a model; it *orchestrates* models running
elsewhere (Claude, GPT, Gemini over the internet; Ollama locally; VERONICA later). This
chapter is about that orchestration.

Code: `friday/app/` with `main.py` (HTTP API), `router.py` (picks a model),
`providers/` (one adapter per API), `db.py` (conversation storage).

---

## 1. What an LLM API call actually is

Every chat API is the same idea: you send the **whole conversation so far** and get the
next message back.

```json
{ "model": "claude-opus-5-5",
  "system": "You are FRIDAY...",
  "messages": [
    {"role": "user", "content": "What's a JWT?"},
    {"role": "assistant", "content": "A signed token..."},
    {"role": "user", "content": "Can it be revoked?"} ] }
```

**The model has no memory between calls.** "Memory" is FRIDAY re-sending history each
time. That's why `send_message` loads the last `FRIDAY_HISTORY_LIMIT` (40) messages from
Postgres before every call. It's also why long conversations cost more: you pay for
every input token, every turn.

The **system prompt** (`config.py: DEFAULT_SYSTEM_PROMPT`) is standing instructions. Note
it tells FRIDAY to *admit* it can't take actions yet rather than pretend; honest
limitations are part of the design.

---

## 2. Streaming with Server-Sent Events (SSE)

A long answer can take 20+ seconds. Waiting for all of it feels broken, so APIs can
**stream**: send text in small chunks as it's generated.

FRIDAY streams to the browser using **SSE**, a dead-simple format over a normal HTTP
response that just never closes until done:

```
event: attempt
data: {"provider": "anthropic", "model": "claude-opus-5-5"}

event: delta
data: {"text": "A JWT is"}

event: delta
data: {"text": " a signed token"}

event: done
data: {"id": "...", "input_tokens": 812, "output_tokens": 164, ...}
```

Each event is `event:` + `data:` lines, ended by a blank line. Why SSE instead of
WebSockets? Communication is one-way (server → browser) after the request, SSE is plain
HTTP (works through Caddy with no special config except `flush_interval -1`), and there's
nothing to keep alive or reconnect.

In `main.py`, `events()` is an **async generator**: each `yield` sends a chunk
immediately. FastAPI's `StreamingResponse` turns that generator into the HTTP body.

**Saving partial replies.** If the provider dies halfway, the text already streamed is
still saved (`content="".join(parts)`), because the user already saw it, and losing it
from history would make the next turn confusing.

---

## 3. Providers: one interface, many APIs

`providers/base.py` defines the contract every model must meet:

```python
class Provider(Protocol):
    id: str; label: str; model: str
    def available(self) -> bool: ...
    def stream(self, history, system, model) -> AsyncIterator[TextDelta | Done]: ...
```

This is the **adapter pattern**. The rest of FRIDAY only knows `Provider`, never "Anthropic"
or "OpenAI". Adding a model means writing one class.

There are only **two** adapters for four providers:

- `AnthropicProvider` uses Claude's Messages API. The system prompt is a separate
  `system` field. It also uses Claude-specific features: `effort` (how hard the model
  thinks) and server-side fallback (if a safety classifier declines, Anthropic retries on
  a fallback model inside the same call).
- `OpenAICompatibleProvider` serves OpenAI, Gemini, **and** Ollama. The OpenAI Chat
  Completions format became a de facto standard, so Google and Ollama both expose an
  endpoint that accepts it. They differ only by base URL, key and model name. Here the
  system prompt is just the first message with `role: "system"`.

---

## 4. The router and fallback (`router.py`)

When you send a message, the router builds a candidate list: the provider you chose
(or `FRIDAY_DEFAULT_PROVIDER`), then the rest of `FRIDAY_FALLBACK_ORDER`, skipping any
without an API key. It tries them in order.

The crucial rule:

> **Fall back only if the provider fails *before* sending any text.**

If Claude is down, an instant switch to GPT is invisible to you. But if Claude has
already streamed half an answer and *then* fails, switching would append GPT's
fresh answer to Claude's half: a garbled message. So after the first `TextDelta`
(`sent_text = True`) an error is re-raised instead of swallowed.

Each attempt emits an `Attempt` event first, so the UI can show *which* model actually
answered, and the database records `provider`, `model`, tokens and latency on every
assistant message. `/api/friday/usage` aggregates those into per-model stats.

---

## 5. Storage (`db.py`)

Two tables: `friday_conversations` (id, title, timestamps) and `friday_messages`
(role, content, provider, model, token counts, latency). Using **SQLAlchemy async** with the
**asyncpg** driver means a request waiting on the database doesn't block the server from
handling other requests (important while another request is streaming for 30 seconds).

`init_db()` also runs `CREATE EXTENSION vector`, enabling **pgvector**, which stores
*embeddings* (vectors that represent meaning) for semantic memory later: "find past
conversations about X" by meaning rather than exact words.

**Honest note:** tables are created with `create_all`, which can create but never *alter*
tables. The first schema change will need a migration tool (Alembic).

---

## Exercises

1. **Raw SSE.** With a token in `$T`, create a conversation and stream a message with curl:
   ```bash
   curl -N -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
     -d '{"content":"Count to five"}' localhost:8080/api/friday/conversations/<id>/messages
   ```
   `-N` disables curl's buffering so you see events arrive live.
2. **Force a fallback.** Set `ANTHROPIC_API_KEY=wrong` in `.env`, restart friday, and send a
   message. Which `attempt` events do you see? Check `docker compose logs friday`.
3. **Cost of memory.** Ask five questions in one conversation and compare `input_tokens`
   across replies in `/api/friday/usage` or the message JSON. Why does it grow?
4. **Add a provider.** Any OpenAI-compatible API (e.g. a second Ollama model) is one line in
   `ModelRouter.__init__`. Try it.

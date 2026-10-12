# Learning SMASH Cloud

These chapters explain how SMASH Cloud is built, in the order it was built. Each one covers
the *concepts*, *why* each decision was made over the alternatives, a *walkthrough* of the
real code, and *exercises* that make you touch the system to understand it.

| # | Chapter | You'll understand |
|---|---|---|
| 01 | [Foundation](01-foundation.md) | Containers, Compose, the gateway, JWT login shared across services |
| 02 | [FRIDAY](02-friday.md) | Calling LLM APIs, streaming with Server-Sent Events, the model router and fallback |
| 03 | [Tools and voice](03-tools-and-voice.md) | Tool calling across providers, validating model output, streaming ElevenLabs audio |
| 04 | [VERONICA](04-veronica.md) | Tokenizers, Transformers, training, and evaluating a language model you trained yourself |
| 05 | [Operations](05-operations.md) | Where data really lives, automatic backups, restore drills, a real incident |

## The map

```
                 your browser
                      │  http://localhost:8080
                      ▼
               ┌─────────────┐
               │   gateway   │  Caddy: one front door, routes by URL path
               └──────┬──────┘
   /api/friday/*      │ /api/veronica/*     /api/*          everything else
        ┌─────────────┼──────────────┬─────────────┬──────────────┐
        ▼             ▼              ▼             ▼              │
   ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐        │
   │ friday  │  │ veronica │  │ smash-api │  │ dashboard │◀───────┘
   │ FastAPI │  │ FastAPI  │  │ FastAPI   │  │ React app │
   └────┬────┘  └────┬─────┘  └───────────┘  └───────────┘
        │            │ reads runs/ (files)
        ▼            ▲
   ┌──────────┐      │ writes checkpoints + metrics
   │ postgres │   VERONICA training (native, on the Mac GPU)
   └──────────┘
        friday ──▶ Claude / GPT / Gemini / Ollama  (internet APIs)
```

Directory guide:

| Path | What |
|---|---|
| `docker-compose.yml` | Declares every service and how they connect |
| `infrastructure/gateway/Caddyfile` | Gateway routing rules |
| `services/smash-api/` | Login + system metrics |
| `friday/` | The assistant: model router, conversations, streaming chat |
| `veronica/` | The from-scratch language model: tokenizer, model, training, API |
| `apps/dashboard/` | The web UI |
| `infrastructure/backup/` | Automatic Postgres dumps to `./backups` (host folder) + restore script |

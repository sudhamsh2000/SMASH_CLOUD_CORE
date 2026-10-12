# SMASH Cloud

Personal private-cloud + AI platform. Non-commercial, software-first; dedicated hardware comes later.

- **SMASH Cloud** — infrastructure (hosting, storage, databases, compute)
- **FRIDAY** — personal AI assistant running on SMASH Cloud
- **VERONICA** — custom language model trained from scratch

## Quick start

```bash
cp .env.example .env          # fill in the passwords/secret and at least one AI provider key
docker compose up -d --build  # then open http://localhost:8080
```

VERONICA trains natively (Docker on macOS can't use the GPU):

```bash
cd veronica && python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m veronica.data && .venv/bin/python -m veronica.train --run v0.1 --steps 4000
```

**Learn how it's built:** [`docs/learn/`](docs/learn/README.md), one chapter per layer.

## Current state (honest)

| Path | What it is | Status |
|---|---|---|
| `docker-compose.yml`, `infrastructure/gateway/` | Postgres (pgvector), Caddy gateway on 127.0.0.1:8080 | Verified running end to end |
| `services/smash-api/` | Single-owner login (JWT), host metrics | Verified |
| `friday/` | Assistant: Claude/GPT/Gemini/Ollama router with fallback, SSE streaming, history, read-only tools, ElevenLabs voice proxy | Verified end to end with GPT; tool loop verified live with GPT and Gemini. Claude untested live (account out of credits); voice untested live (no ElevenLabs key yet). 11 unit tests |
| `veronica/` | From-scratch LLM: BPE tokenizer, 13.8M-param Transformer, training on public-domain books, evaluation, API | Trains on the M2 GPU; serving verified. 11 unit tests |
| `infrastructure/backup/` | Postgres dumps every 6 h to `./backups` (host folder), restore script | Verified by a restore into a scratch DB |
| `apps/dashboard/` | React dashboard | Being redesigned in a separate session |
| `smash_core/`, `smash_ui/`, `infra/`, `scripts/` | Legacy code superseded by the above | Kept until you decide to delete it |

Removed in cleanup (recoverable from the first git commit): the Nextcloud/MariaDB/Nginx stack, Ansible playbooks,
bare-metal scripts (bootstrap, DuckDNS, rsync backups, terminal display), hardware/Ubuntu docs, and unused UI files.
Those come back, rewritten, during the hardware migration phase.

## Roadmap

0. Repo assessment — done
1. Foundation: monorepo layout, Docker Compose dev env, Postgres, auth, dashboard shell — done
2. FRIDAY MVP: multi-provider model router (Claude, GPT, local), streaming chat, conversation history — done
3. Voice + tools — tools done; voice (ElevenLabs TTS) built, awaiting keys; speech-to-text next
4. VERONICA: tokenizer, tiny Transformer, training loop, evaluation — done (v0.1)
5. Self-hosting: backups done; deployments, HTTPS, central logs, migrations (Alembic) next
6. Hardware migration to bare metal

# SMASH Cloud Core

A portable, self-hosted personal cloud built from the ground up with a focus on reliability, security, and AI‑ready expansion.

## Stack
- Nextcloud (files, calendar, contacts)
- Nginx (production) / Caddy (local HTTPS)
- MariaDB (database)
- Certbot + Let’s Encrypt
- UFW, Fail2ban (security)
- Python dashboard (Rich + Psutil)

## Environments
- Local (Docker Compose): fast iteration with Caddy `tls internal`
- Production (Ubuntu 22.04): Bash bootstrap + systemd services

## Storage
- Single data mount at `/mnt/smash_data` for app data and snapshots

## Quick Start (Local)
1. Copy `infra/docker-compose/.env.sample` to `.env` and set values
2. `cd infra/docker-compose && docker compose up -d`
3. Visit `https://localhost` (trust local CA)

## Project Goals
- Clean architecture with clear separation of infra, config, scripts, and docs
- Secure by default, reproducible, and portable
- Ready for AI integrations in Phase 2

## Repo Layout
See `docs/` for detailed setup guides and checklists.

#!/bin/sh
# Restore a backup into the running stack's Postgres.
#   infrastructure/backup/restore.sh backups/smash-20261011T221500Z.dump
# --clean drops each object before recreating it, so this REPLACES current data.
set -eu
dump="${1:?usage: restore.sh <path to .dump>}"
[ -f "$dump" ] || { echo "no such file: $dump" >&2; exit 1; }
cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a
printf 'This replaces the current database with %s. Type "restore" to continue: ' "$dump"
read -r answer
[ "$answer" = "restore" ] || { echo "aborted"; exit 1; }
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$dump"
echo "restored. Restart services that cache state:  docker compose restart friday"

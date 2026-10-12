#!/bin/sh
# Runs inside the `backup` container: dump Postgres every BACKUP_INTERVAL_HOURS, keep the
# newest BACKUP_KEEP dumps. /backups is a folder on the host (./backups), deliberately
# OUTSIDE Docker's disk image: if Docker's VM disk is lost or reset, the dumps survive.
set -eu
: "${BACKUP_INTERVAL_HOURS:=6}" "${BACKUP_KEEP:=28}"

while true; do
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  tmp="/backups/.smash-$ts.dump.partial"
  # -Fc = custom format: compressed, and pg_restore can restore single tables from it.
  if pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$tmp"; then
    mv "$tmp" "/backups/smash-$ts.dump"   # rename only when complete: no half-written backups
    echo "$(date -u +%FT%TZ) backup ok: smash-$ts.dump ($(du -h "/backups/smash-$ts.dump" | cut -f1))"
    # rotation: delete all but the newest $BACKUP_KEEP
    ls -1t /backups/smash-*.dump | tail -n +$((BACKUP_KEEP + 1)) | xargs -r rm --
  else
    rm -f "$tmp"
    echo "$(date -u +%FT%TZ) BACKUP FAILED" >&2
  fi
  sleep $((BACKUP_INTERVAL_HOURS * 3600))
done

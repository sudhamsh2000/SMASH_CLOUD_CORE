# 05 · Operations: backups, and the day Docker lost everything

The first four chapters are about building things. This one is about keeping them.

## What happened (2026-10-11)

Docker Desktop froze: images built, but no container could start, not even
`docker run alpine echo hi`. It was restarted. When it came back, Docker's entire virtual
disk (`~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw`) was gone, and
Docker created a new empty one. Its log shows the *creation* (`creating ".../Docker.raw"` at
17:10:29) but nothing records what removed the old file.

Every image, container and **volume** was lost, including an unrelated project's database
(`calmguide-main-db`). There was no Time Machine backup to restore it from.

SMASH Cloud itself lost almost nothing, by luck rather than design:
- its code lives in the repo (files on the Mac),
- VERONICA's training writes to `./veronica/runs`, a host folder rather than a Docker volume, so a
  50-minute training run kept going untouched,
- its database was brand new and nearly empty.

## The lesson: where does your data actually live?

On macOS, Docker runs a Linux VM. A **named volume** like `postgres_data:` lives *inside that
VM's single disk image file*. One file, one point of failure. Volumes survive
`docker compose down`, rebuilds, and container crashes, but **not** the loss of the VM disk.

| Where | Survives container rebuild | Survives Docker reset/wipe |
|---|---|---|
| Inside a container's filesystem | no | no |
| Named volume (`postgres_data:`) | yes | **no** |
| Bind mount to a host folder (`./backups:`) | yes | yes |
| A copy on another machine / cloud | yes | yes, and survives the Mac dying too |

The **3-2-1 rule**: 3 copies of your data, on 2 different kinds of storage, 1 off-site.
SMASH Cloud now has the first step (copies on the host). Off-site comes with the hardware
phase (e.g. `rclone` to cloud storage, encrypted).

## The backup service

`docker-compose.yml` → `backup`, script `infrastructure/backup/backup-loop.sh`:

1. Every `BACKUP_INTERVAL_HOURS` (6), run `pg_dump -Fc` against the `postgres` service.
2. Write to a temp name, then **rename only when complete**. A crash mid-dump never
   leaves a half-written file that looks like a backup.
3. Keep the newest `BACKUP_KEEP` (28 = one week at 6 h).
4. Dumps land in `./backups/` on the host: outside Docker, gitignored (they contain your data).

Why `pg_dump` and not copying Postgres's data files? Copying files while the database is
running captures a torn, inconsistent state. `pg_dump` takes a consistent snapshot through
the database itself, and the result restores into any compatible Postgres version.

## A backup you haven't restored is a hope, not a backup

The first dump was verified by restoring it into a scratch database and counting rows:

```bash
pg() { docker compose exec -T postgres "$@"; }
pg createdb -U smash restore_test
pg pg_restore -U smash -d restore_test < backups/smash-<timestamp>.dump
pg psql -U smash -d restore_test -c "select count(*) from friday_messages"
pg dropdb -U smash restore_test
```

To restore for real (replaces current data, asks for confirmation):
`infrastructure/backup/restore.sh backups/smash-<timestamp>.dump`

## Other bugs this phase surfaced

Running the whole stack for the first time found a bug none of the unit tests could:
FRIDAY's timestamp columns were declared as a bare `datetime`, which SQLAlchemy maps to
Postgres `TIMESTAMP WITHOUT TIME ZONE`, but the code stores timezone-aware UTC values.
asyncpg refuses to mix them, so creating a conversation failed. Fix: `DateTime(timezone=True)`
(Postgres `timestamptz`). Because `create_all` can create tables but never alter them, the
(empty) tables had to be dropped and recreated. That's the last schema change that can be
handled this way: the next one needs **migrations** (Alembic), which change a live
schema without losing data.

## Exercises

1. **Run a restore drill** with the commands above. Put it on a monthly reminder.
2. Set `BACKUP_INTERVAL_HOURS=1` in `.env`, `docker compose up -d backup`, and watch
   `docker compose logs -f backup`. Then set it back.
3. **Find every place SMASH Cloud keeps state** (hint: `docker volume ls`, `./veronica/runs`,
   `./veronica/data`, `./backups`, `.env`). For each, what happens if Docker is wiped? If the
   Mac's disk dies?
4. Open a dump with `pg_restore -l backups/<file>.dump` to list what it contains without restoring.

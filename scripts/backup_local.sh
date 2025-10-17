#!/usr/bin/env bash
# SMASH Cloud Core - Local Backup Script
# Creates rsync snapshot backups to /mnt/smash_data/backups/YYYYMMDD
# Usage: bash scripts/backup_local.sh

set -euo pipefail

SOURCE_DIR=${NEXTCLOUD_DATA:-"/mnt/smash_data/data"}
BACKUP_ROOT=${DATA_MOUNT:-"/mnt/smash_data"}/backups
STAMP=$(date +%Y%m%d)
DEST_DIR="$BACKUP_ROOT/$STAMP"
LATEST_LINK="$BACKUP_ROOT/latest"

mkdir -p "$BACKUP_ROOT"

echo "Starting local backup: $SOURCE_DIR -> $DEST_DIR"

if [[ -d "$LATEST_LINK" ]]; then
  RSYNC_LINK="--link-dest=$LATEST_LINK"
else
  RSYNC_LINK=""
fi

rsync -aHAX --delete --numeric-ids \
  $RSYNC_LINK \
  "$SOURCE_DIR/" "$DEST_DIR/"

ln -sfn "$DEST_DIR" "$LATEST_LINK"

echo "Backup completed: $DEST_DIR"


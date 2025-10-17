#!/usr/bin/env bash
# SMASH Cloud Core - Offsite Backup (rclone) Template
# Sync encrypted backups to a remote storage (configure rclone first)
# Usage: bash scripts/backup_offsite_rclone.sh

set -euo pipefail

# Configure these:
RCLONE_REMOTE=${RCLONE_REMOTE:-"remote:smash-cloud"}
LOCAL_BACKUPS=${LOCAL_BACKUPS:-"/mnt/smash_data/backups"}

# Example: rclone config create smash-crypt crypt remote remote:smash-cloud/crypt password <pass> password2 <salt>
echo "Starting offsite sync: $LOCAL_BACKUPS -> $RCLONE_REMOTE"

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone not found. Install with: sudo apt install rclone" >&2
  exit 1
fi

rclone sync "$LOCAL_BACKUPS" "$RCLONE_REMOTE" \
  --checksum --copy-links --one-file-system \
  --exclude "*.tmp" --exclude "lost+found/" \
  --log-file "/var/log/rclone-smash.log" --log-level INFO

echo "Offsite sync completed."


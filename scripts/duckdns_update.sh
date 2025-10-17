#!/usr/bin/env bash
# SMASH Cloud Core - DuckDNS Updater
# Updates DuckDNS with current public IP
# Usage: DUCKDNS_DOMAIN=yourdomain DUCKDNS_TOKEN=token bash scripts/duckdns_update.sh

set -euo pipefail

DOMAIN=${DUCKDNS_DOMAIN:-"smash"}
TOKEN=${DUCKDNS_TOKEN:-"CHANGE_ME"}

if [[ "$TOKEN" == "CHANGE_ME" ]]; then
  echo "Set DUCKDNS_TOKEN and DUCKDNS_DOMAIN environment variables." >&2
  exit 1
fi

URL="https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&ip="

echo "Updating DuckDNS for ${DOMAIN}..."
RES=$(curl -s "$URL")
echo "Response: $RES"

[[ "$RES" == *"OK"* ]] || { echo "DuckDNS update failed" >&2; exit 1; }

echo "DuckDNS update successful."


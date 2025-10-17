#!/usr/bin/env bash
# SMASH Cloud Core - Health Check Script
# Warn if CPU, memory, or disk utilization exceeds 85%
# Usage: bash scripts/health_check.sh

set -euo pipefail

THRESHOLD=${THRESHOLD:-85}

cpu_usage() {
  # Average CPU usage over 1 second
  top -bn2 | grep -E "^%?Cpu" | tail -n1 | awk '{print 100 - $8}'
}

mem_usage() {
  free | awk '/Mem:/ {printf("%.0f", $3/$2 * 100)}'
}

disk_usage() {
  df -P / | awk 'END {print $5}' | tr -d '%'
}

CPU=$(printf '%.0f' "$(cpu_usage)")
MEM=$(mem_usage)
DSK=$(disk_usage)

echo "CPU: ${CPU}% | MEM: ${MEM}% | DISK(/): ${DSK}%"

status=0

if (( CPU > THRESHOLD )); then
  echo "WARNING: CPU usage > ${THRESHOLD}%"
  status=1
fi

if (( MEM > THRESHOLD )); then
  echo "WARNING: Memory usage > ${THRESHOLD}%"
  status=1
fi

if (( DSK > THRESHOLD )); then
  echo "WARNING: Disk usage (/) > ${THRESHOLD}%"
  status=1
fi

exit $status


#!/usr/bin/env bash
# Start Vettr backend against local Postgres (LaunchAgent entrypoint).
set -euo pipefail
export PATH="/opt/homebrew/opt/postgresql@15/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export NODE_ENV="${NODE_ENV:-development}"
ROOT="$(cd "$(dirname "$0")/../backend" && pwd)"
cd "$ROOT"

# Avoid port conflict with a leftover process
LSOF=/usr/sbin/lsof
if "$LSOF" -tiTCP:3001 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 3001 already in use — monitoring existing Vettr API"
  # Stay alive so launchd KeepAlive doesn't thrash; monitor the listener
  while "$LSOF" -tiTCP:3001 -sTCP:LISTEN >/dev/null 2>&1; do
    sleep 30
  done
  echo "Port 3001 freed; starting API"
fi

exec /usr/local/bin/node --max-old-space-size=768 src/index.js

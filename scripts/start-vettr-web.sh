#!/usr/bin/env bash
# Start Vettr Vite web app (LaunchAgent entrypoint).
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/../web" && pwd)"
cd "$ROOT"

LSOF=/usr/sbin/lsof
if "$LSOF" -tiTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 5173 already in use — monitoring existing Vettr web"
  while "$LSOF" -tiTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; do
    sleep 30
  done
  echo "Port 5173 freed; starting web"
fi

# Bind to 0.0.0.0 so phones/tablets on the same Wi-Fi can reach the dev server
# (was 127.0.0.1, which is loopback-only and unreachable from other devices).
# Prefer local vite binary; fall back to npm run dev
if [[ -x "$ROOT/node_modules/.bin/vite" ]]; then
  exec "$ROOT/node_modules/.bin/vite" --host 0.0.0.0 --port 5173 --strictPort
fi

exec /usr/local/bin/npm run dev -- --host 0.0.0.0 --port 5173 --strictPort

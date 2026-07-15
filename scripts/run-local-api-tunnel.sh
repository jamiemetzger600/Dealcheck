#!/usr/bin/env bash
# Start a Cloudflare quick tunnel to the local Vettr API (port 3001).
# Prints the public URL. Keep this process running for live vettr.pages.dev API access.
set -euo pipefail
PORT="${PORT:-3001}"
if ! curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
  echo "ERROR: local API not healthy on :${PORT}. Start backend first: cd backend && npm run dev" >&2
  exit 1
fi
echo "Starting Cloudflare quick tunnel → http://127.0.0.1:${PORT}"
echo "After the URL appears, set Cloudflare Pages VITE_API_URL to https://<host>/api and redeploy if it changed."
exec cloudflared tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate

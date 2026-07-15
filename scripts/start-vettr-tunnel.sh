#!/usr/bin/env bash
# Start Cloudflare quick tunnel to local API; keep Pages URL in sync only when it changes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3001}"
LOG="${HOME}/.cloudflared/vettr-quick-tunnel.log"
URL_FILE="${HOME}/.cloudflared/current-tunnel-origin.txt"
PID_FILE="${HOME}/.cloudflared/vettr-quick-tunnel.pid"
mkdir -p "${HOME}/.cloudflared"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

for i in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
    break
  fi
  sleep 2
done
if ! curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
  echo "ERROR: API not healthy on :${PORT}" >&2
  exit 1
fi

# If an existing managed tunnel is healthy and matches stored URL, keep it (no DNS change).
if [[ -f "$PID_FILE" && -f "$URL_FILE" ]]; then
  old_pid=$(cat "$PID_FILE" || true)
  old_url=$(cat "$URL_FILE" || true)
  if [[ -n "${old_pid}" ]] && kill -0 "$old_pid" 2>/dev/null; then
    if curl -sf --max-time 10 "${old_url}/health" >/dev/null; then
      echo "Reusing healthy tunnel pid=${old_pid} ${old_url}"
      bash "${ROOT}/scripts/sync-pages-api-url.sh" "$old_url" || true
      while kill -0 "$old_pid" 2>/dev/null; do sleep 30; done
      echo "Existing tunnel died; will restart"
    else
      echo "Stored tunnel unhealthy; restarting"
      kill "$old_pid" 2>/dev/null || true
      sleep 1
    fi
  fi
fi

# Also adopt an already-running cloudflared quick tunnel (manual/session) if healthy
if ! { [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; }; then
  # Prefer the actual cloudflared binary PID (not a parent shell)
  LIVE=$(pgrep -x cloudflared | head -1 || true)
  if [[ -n "$LIVE" ]] && [[ -f "$URL_FILE" ]] && curl -sf --max-time 10 "$(cat "$URL_FILE")/health" >/dev/null; then
    echo "$LIVE" > "$PID_FILE"
    echo "Adopted running tunnel pid=$LIVE $(cat "$URL_FILE")"
    bash "${ROOT}/scripts/sync-pages-api-url.sh" "$(cat "$URL_FILE")" || true
    while kill -0 "$LIVE" 2>/dev/null; do sleep 30; done
    echo "Adopted tunnel died; will restart"
  fi
fi

: > "$LOG"
/opt/homebrew/bin/cloudflared tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate >>"$LOG" 2>&1 &
echo $! > "$PID_FILE"
echo "Started cloudflared pid $(cat "$PID_FILE")"

ORIGIN=""
for i in $(seq 1 90); do
  ORIGIN=$(grep -Eo 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$LOG" | tail -1 || true)
  if [[ -n "$ORIGIN" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$ORIGIN" ]]; then
  echo "ERROR: could not parse tunnel URL from $LOG" >&2
  tail -80 "$LOG" >&2 || true
  exit 1
fi

echo "$ORIGIN" > "$URL_FILE"
echo "Tunnel origin: $ORIGIN"
bash "${ROOT}/scripts/sync-pages-api-url.sh" "$ORIGIN"

CF_PID=$(cat "$PID_FILE")
while kill -0 "$CF_PID" 2>/dev/null; do
  sleep 30
done
echo "cloudflared exited"
exit 1

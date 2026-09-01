#!/usr/bin/env bash
# Hourly (or on-demand) health check for Vettr local stack.
# Restarts LaunchAgents when API / web / tunnel are down or unhealthy.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${HOME}/Library/Logs/vettr"
mkdir -p "$LOG_DIR"
LOG="${LOG_DIR}/healthcheck.log"
UID_NUM="$(id -u)"
DOMAIN="gui/${UID_NUM}"
TS="$(date '+%Y-%m-%d %H:%M:%S')"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

log() {
  echo "[$TS] $*" | tee -a "$LOG"
}

kick() {
  local label="$1"
  log "RESTART $label"
  launchctl kickstart -k "${DOMAIN}/${label}" 2>>"$LOG" || \
    launchctl bootstrap "$DOMAIN" "${HOME}/Library/LaunchAgents/${label}.plist" 2>>"$LOG" || true
}

ensure_loaded() {
  local label="$1"
  if ! launchctl print "${DOMAIN}/${label}" >/dev/null 2>&1; then
    local plist="${HOME}/Library/LaunchAgents/${label}.plist"
    if [[ -f "$plist" ]]; then
      log "LOAD missing agent $label"
      launchctl bootstrap "$DOMAIN" "$plist" 2>>"$LOG" || \
        launchctl load -w "$plist" 2>>"$LOG" || true
    else
      log "WARN missing plist for $label ($plist)"
    fi
  fi
}

api_ok() {
  curl -sf --max-time 8 "http://127.0.0.1:3001/health" >/dev/null 2>&1
}

web_ok() {
  curl -sf --max-time 8 "http://127.0.0.1:5173/" >/dev/null 2>&1
}

tunnel_ok() {
  local origin=""
  if [[ -f "${HOME}/.cloudflared/current-tunnel-origin.txt" ]]; then
    origin="$(tr -d '[:space:]' < "${HOME}/.cloudflared/current-tunnel-origin.txt")"
  fi
  if [[ -n "$origin" ]] && curl -sf --max-time 10 "${origin}/health" >/dev/null 2>&1; then
    return 0
  fi
  # Stable Worker proxy (preferred public path)
  if curl -sf --max-time 10 "https://vettr-api.metzgerbuildsthings.workers.dev/health" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

tunnel_rate_limited() {
  local log="${HOME}/.cloudflared/vettr-quick-tunnel.log"
  [[ -f "$log" ]] || return 1
  # Only treat as rate-limited if the *latest* attempt hit 429
  tail -30 "$log" | grep -qE '429 Too Many Requests|error code: 1015'
}

log "healthcheck start"

for label in com.vettr.api com.vettr.web com.vettr.tunnel com.vettr.caffeinate; do
  ensure_loaded "$label"
done

# --- API ---
if api_ok; then
  log "OK api :3001"
else
  log "DOWN api :3001"
  kick com.vettr.api
  sleep 5
  if api_ok; then log "OK api after restart"; else log "FAIL api still down"; fi
fi

# --- Web ---
if web_ok; then
  log "OK web :5173"
else
  log "DOWN web :5173"
  kick com.vettr.web
  sleep 5
  if web_ok; then log "OK web after restart"; else log "FAIL web still down"; fi
fi

# --- Tunnel (needs healthy API first) ---
if tunnel_ok; then
  log "OK tunnel"
elif tunnel_rate_limited; then
  log "SKIP tunnel restart (Cloudflare quick-tunnel rate limited — wait for cooldown)"
else
  log "DOWN tunnel"
  if api_ok; then
    kick com.vettr.tunnel
    # Quick tunnels can take a while (and may be rate-limited after crash loops)
    for i in $(seq 1 12); do
      sleep 10
      if tunnel_ok; then
        log "OK tunnel after restart (${i}0s)"
        break
      fi
      if tunnel_rate_limited; then
        log "SKIP further tunnel waits (rate limited)"
        break
      fi
    done
    if ! tunnel_ok; then
      log "FAIL tunnel still down — see ~/Library/Logs/vettr/tunnel.err"
    fi
  else
    log "SKIP tunnel restart (API still down)"
  fi
fi

log "healthcheck done"
exit 0

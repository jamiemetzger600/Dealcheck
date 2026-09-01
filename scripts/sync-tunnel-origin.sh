#!/usr/bin/env bash
# Sync Cloudflare Worker TUNNEL_ORIGIN to the current quick-tunnel URL.
# Keeps https://vettr-api.metzgerbuildsthings.workers.dev stable for Pages.
set -euo pipefail

ORIGIN="${1:-}"
if [[ -z "$ORIGIN" ]]; then
  echo "Usage: $0 https://xxxx.trycloudflare.com" >&2
  exit 1
fi
ORIGIN="${ORIGIN%/}"

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-b5fb063c1e439dd0d0ce3ffb317ec52c}"
SCRIPT_NAME="vettr-api"
CONFIG="${HOME}/Library/Preferences/.wrangler/config/default.toml"

if [[ ! -f "$CONFIG" ]]; then
  echo "ERROR: wrangler not logged in ($CONFIG missing). Run: wrangler login" >&2
  exit 1
fi

TOKEN=$(python3 - <<'PY'
import tomllib
print(tomllib.load(open(__import__("os").path.expanduser("~/Library/Preferences/.wrangler/config/default.toml"), "rb"))["oauth_token"])
PY
)

# Patch Worker settings env var (no code redeploy required for var update on some APIs;
# Cloudflare requires multipart settings upload — use wrangler for reliability)
cd "$(dirname "$0")/../workers/vettr-api-proxy"
# Update wrangler.toml TUNNEL_ORIGIN then redeploy vars-only via wrangler deploy (fast)
python3 - <<PY
from pathlib import Path
p = Path("wrangler.toml")
text = p.read_text()
import re
new = re.sub(
    r'TUNNEL_ORIGIN\s*=\s*"[^"]*"',
    f'TUNNEL_ORIGIN = "${ORIGIN}"',
    text,
)
if new == text:
    # insert under [vars]
    if "[vars]" in text:
        new = text.replace("[vars]", f'[vars]\nTUNNEL_ORIGIN = "${ORIGIN}"', 1)
    else:
        new = text + f'\n[vars]\nTUNNEL_ORIGIN = "${ORIGIN}"\n'
p.write_text(new)
print("wrangler.toml TUNNEL_ORIGIN -> ${ORIGIN}")
PY

wrangler deploy >/tmp/vettr-sync-tunnel-origin.log 2>&1
tail -20 /tmp/vettr-sync-tunnel-origin.log
echo "${ORIGIN}" > "${HOME}/.cloudflared/current-tunnel-origin.txt"
echo "Synced Worker proxy origin → ${ORIGIN}"

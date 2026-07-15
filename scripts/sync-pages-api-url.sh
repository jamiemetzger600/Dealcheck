#!/usr/bin/env bash
# Point Cloudflare Pages VITE_API_URL at the current tunnel and redeploy production.
# Only redeploys when the URL actually changes (minimizes churn).
set -euo pipefail

ORIGIN="${1:-}"
if [[ -z "$ORIGIN" ]]; then
  echo "Usage: $0 https://xxxx.trycloudflare.com" >&2
  exit 1
fi
ORIGIN="${ORIGIN%/}"
API_URL="${ORIGIN}/api"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-b5fb063c1e439dd0d0ce3ffb317ec52c}"
PROJECT="vettr"
CONFIG="${HOME}/Library/Preferences/.wrangler/config/default.toml"

TOKEN=$(python3 - <<'PY'
import tomllib, os
print(tomllib.load(open(os.path.expanduser("~/Library/Preferences/.wrangler/config/default.toml"), "rb"))["oauth_token"])
PY
)

python3 - <<PY
import json, urllib.request

ACCOUNT = "${ACCOUNT_ID}"
PROJECT = "${PROJECT}"
TOKEN = """${TOKEN}"""
API_URL = "${API_URL}"

def req(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    r = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.load(resp)

proj = req("GET", f"/pages/projects/{PROJECT}")["result"]
prod = ((proj.get("deployment_configs") or {}).get("production") or {}).get("env_vars") or {}
current = (prod.get("VITE_API_URL") or {}).get("value")
ext = (prod.get("VITE_EXTENSION_ID") or {}).get("value") or "fcabajkgnieehailpgdphcepimlkcnej"
print("current VITE_API_URL:", current)
if current == API_URL:
    print("Pages VITE_API_URL already up to date; skipping redeploy")
    raise SystemExit(0)

body = {
    "deployment_configs": {
        "production": {
            "env_vars": {
                "VITE_API_URL": {"type": "plain_text", "value": API_URL},
                "VITE_EXTENSION_ID": {"type": "plain_text", "value": ext},
            }
        },
        "preview": {
            "env_vars": {
                "VITE_API_URL": {"type": "plain_text", "value": API_URL},
            }
        },
    }
}
req("PATCH", f"/pages/projects/{PROJECT}", body)
print("updated VITE_API_URL ->", API_URL)

deps = req("GET", f"/pages/projects/{PROJECT}/deployments?env=production")["result"]
if not deps:
    raise SystemExit("No production deployments to retry")
dep_id = deps[0]["id"]
print("retrying deployment", dep_id)
retried = req("POST", f"/pages/projects/{PROJECT}/deployments/{dep_id}/retry", {})
print("new deployment", (retried.get("result") or {}).get("id"))
PY

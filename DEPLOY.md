# Vettr — Production Deployment Guide

## Stack

| Layer    | Service           | Cost  |
|----------|-------------------|-------|
| Frontend | Cloudflare Pages  | Free  |
| Backend  | Koyeb (Node.js)   | Free  |
| Database | Koyeb PostgreSQL  | Free  |

---

## Prerequisites

- GitHub repo pushed and up to date
- Stripe account (test keys for staging, live keys for launch)
- Email SMTP credentials (Gmail App Password, Resend, or similar)

---

## Frontend — Cloudflare Pages

1. Go to [cloudflare.com](https://cloudflare.com) → Workers & Pages → Create → Pages
2. Connect your GitHub repo
3. Build settings:
   - **Root directory:** `web`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Environment variables:
   - `VITE_API_URL` = your Koyeb backend URL **including** `/api` (e.g. `https://your-app.koyeb.app/api`)
5. Deploy — your app will be live at `https://your-project.pages.dev`

---

## Backend — Koyeb

1. Go to [koyeb.com](https://koyeb.com) → Databases → Create → PostgreSQL (Free)
2. Copy the `DATABASE_URL` connection string
3. Services → Create Service → GitHub → select this repo
4. Build settings:
   - **Root directory:** `backend` (Koyeb may label this "Work directory")
   - **Build command:** `npm install`
   - **Run command:** `npm start`
   - **Port:** `3001` — if not on the Build step, set it in a later step (Resources / Service configuration) or add env var `PORT=3001`.
5. Environment variables (see `backend/.env.example` for reference):
   - `NODE_ENV` = `production`
   - `DATABASE_URL` (from Koyeb PostgreSQL)
   - `JWT_SECRET` (generate with: `openssl rand -base64 32`)
   - `JWT_EXPIRES_IN` = `7d` (or your preferred expiry)
   - `WEB_APP_URL` = your Cloudflare Pages URL **with no trailing slash** (e.g. `https://your-project.pages.dev`) — required for CORS to match the browser’s Origin
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (for email notifications)
6. Deploy → wait for service to go live
7. Run migrations via Koyeb console: `npm run migrate`
8. Verify: `GET https://your-api.koyeb.app/health` → `{ "status": "ok" }`

---

## Koyeb CLI (optional)

Use the CLI to inspect services, view logs, and redeploy from the terminal.

**Install (macOS):**
```bash
brew install koyeb/tap/koyeb
```

**Login:** Create an API token at [Koyeb → Account → API Tokens](https://app.koyeb.com/account/api), then:
```bash
koyeb login --token YOUR_API_TOKEN
```
Config is saved to `~/.koyeb.yaml`.

**Useful commands:** (use `app-name/service-name`, e.g. `database/vettr`)
- `koyeb services list` — list services
- `koyeb services logs database/vettr` — stream logs (debug deploy errors)
- `koyeb services redeploy database/vettr` — trigger a new build and deploy

---

## CLI access for testing and troubleshooting

To let the agent (or any script) test and troubleshoot Cloudflare and Koyeb directly from the repo:

### Koyeb (already usable if you ran `koyeb login`)

- Commands run with the token in `~/.koyeb.yaml`. No extra setup.
- Example: `koyeb services list`, `koyeb services logs database/vettr`.

### Cloudflare (Wrangler)

1. **Install Wrangler** (one-time):
   ```bash
   npm install -g wrangler
   ```
2. **Create API token:** [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → Create Token → use "Edit Cloudflare Workers" or custom token with **Account** → **Cloudflare Pages** → **Edit**.
3. **Get Account ID:** Dashboard → any product (e.g. Workers & Pages) → right sidebar "Account ID".
4. **Create `.env.cli`** in the project root (copy from `.env.cli.example`), set:
   - `CLOUDFLARE_ACCOUNT_ID` = your account ID  
   - `CLOUDFLARE_API_TOKEN` = your token  
   (`.env.cli` is gitignored.)
5. **Use in terminal:** Before running Wrangler, load the env:
   ```bash
   source .env.cli
   wrangler pages project list
   wrangler pages deployment list --project-name=vettr
   ```
   To set or check env vars for the frontend, use the dashboard (Workers & Pages → vettr → Settings → Environment variables) or the [Pages API](https://developers.cloudflare.com/api/operations/pages-project-list-projects).

Once both are set up, the agent can run `koyeb` and `wrangler` (with `source .env.cli`) to inspect services, logs, and deployments and to troubleshoot issues like "Failed to fetch" (e.g. wrong `VITE_API_URL` or CORS).

---

## Post-Deploy

### Update Frontend → Backend URL

In Cloudflare Pages → Settings → Environment Variables:

- Set `VITE_API_URL` to your Koyeb backend URL **with** `/api` (e.g. `https://your-api.koyeb.app/api`)
- Trigger a new deployment (Vite bakes this into the build)

### Configure Stripe Webhook

1. Stripe Dashboard → Webhooks → Add Endpoint
2. URL: `https://your-api.koyeb.app/api/payments/webhook`
3. Copy the Webhook Signing Secret → set as `STRIPE_WEBHOOK_SECRET` in Koyeb

---

## Scaling Path

| Stage  | Monthly Cost | When to Upgrade                    |
|--------|--------------|------------------------------------|
| Free   | $0           | MVP / beta                         |
| Growth | ~$5–10/mo    | First revenue — e.g. Railway Hobby |
| Scale  | ~$40–65/mo   | Meaningful MRR — Vercel Pro + Neon |

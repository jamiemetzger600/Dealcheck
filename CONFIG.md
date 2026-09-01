# Server & environment configuration

Single reference for all environment variables and deployment config. Copy the relevant `.env.example` files to `.env` (or set in the platform dashboard) and fill in values.

---

## Backend (Node.js / Koyeb)

**Source:** [backend/.env.example](backend/.env.example)  
**Used by:** `backend/src` (Express, DB, Stripe, email, Airtable scraper)

| Variable | Required | Default / example | Notes |
|----------|----------|-------------------|--------|
| `NODE_ENV` | No | `development` | `production` on Koyeb |
| `PORT` | No | `3001` | Koyeb may set automatically |
| `DATABASE_URL` | **Yes** (prod) | `postgresql://user:pass@host:5432/vettr` | From Koyeb PostgreSQL or local |
| `JWT_SECRET` | **Yes** | — | Generate: `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiry |
| `WEB_APP_URL` | **Yes** (prod) | `http://localhost:5173` | Cloudflare Pages URL, no trailing slash (CORS) |
| `STRIPE_SECRET_KEY` | Yes (billing) | `sk_test_...` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Yes (webhooks) | `whsec_...` | From Stripe Webhooks → Add endpoint |
| `STRIPE_MONTHLY_PRICE_ID` | Yes (checkout) | `price_...` | Stripe Price ID for monthly plan |
| `STRIPE_YEARLY_PRICE_ID` | Yes (checkout) | `price_...` | Stripe Price ID for yearly plan |
| `SMTP_HOST` | No | `smtp.gmail.com` | Omit to disable email (notifications) |
| `SMTP_PORT` | No | `587` | |
| `SMTP_USER` | No | — | With SMTP_HOST for sending |
| `SMTP_PASS` | No | — | Gmail: [App Password](https://support.google.com/accounts/answer/185833) |
| `GOOGLE_CALENDAR_CLIENT_ID` | No | — | OAuth Web client ID. Enables Connect Google (Calendar + Gmail send). Enable **Gmail API** and **Google Calendar API** on the same Cloud project. |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | No | — | OAuth client secret. Redirect URI: `{API_BASE_URL}/api/crm/calendar/oauth/callback` |
| `AIRTABLE_SHARE_URL` | No | (hardcoded fallback) | Airtable shared view URL for scraper |
| `AIRTABLE_SCRAPE_CRON` | No | `0 4 * * *` | Cron expression; interpreted in `AIRTABLE_SCRAPE_CRON_TZ` |
| `AIRTABLE_SCRAPE_CRON_TZ` | No | `America/Los_Angeles` | IANA timezone for the cron schedule |
| `AIRTABLE_SCRAPE_ENABLED` | No | `true` | `false` to disable scraper |
| `AIRTABLE_SCRAPE_ON_STARTUP` | No | `true` | `false` to skip the scrape 5s after server boot (saves one full Airtable pull per cold start) |
| `SCRAPE_TRIGGER_SECRET` | **Yes** (prod + cron) | — | Protects `POST /api/airtable-deals/scrape`. Same value in GitHub secret `SCRAPE_TRIGGER_SECRET`. Generate: `openssl rand -base64 32` |
| `NODE_OPTIONS` | No | (via npm start) | Koyeb: `--max-old-space-size=768` if scrape OOMs on free tier |
| `MARKET_DEALS_PRUNE_ENABLED` | No | `true` | `false` to skip deactivating stale listings after each Airtable scrape |
| `MARKET_DEALS_MAX_AGE_MONTHS` | No | `6` | Listings with no newer activity than this are set `is_active = false` |

---

## Web (Vite / Cloudflare Pages)

**Source:** [web/.env.example](web/.env.example)  
**Used by:** `web/src` (Vite bakes `VITE_*` at build time)

| Variable | Required | Default / example | Notes |
|----------|----------|-------------------|--------|
| `VITE_API_URL` | **Yes** (prod) | — | Backend URL **including** `/api` (e.g. `https://your-app.koyeb.app/api`). Omit in dev to use Vite proxy. |
| `VITE_EXTENSION_ID` | **Yes** (prod, web→ext link) | — | Chrome extension ID so logged-in web users auto-link the extension. See [docs/CHROME_WEB_STORE.md](docs/CHROME_WEB_STORE.md). |

---

## CLI (agents / scripts)

**Source:** [.env.cli.example](.env.cli.example)  
**Used by:** Wrangler (Cloudflare Pages). Copy to `.env.cli` (gitignored).

| Variable | Required | Notes |
|----------|----------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | Yes (Wrangler) | Dashboard → right sidebar |
| `CLOUDFLARE_API_TOKEN` | Yes (Wrangler) | My Profile → API Tokens → “Edit Cloudflare Workers” |

Load before Wrangler: `source .env.cli` then `wrangler pages ...`. Koyeb CLI uses `~/.koyeb.yaml` (from `koyeb login`).

---

## Deployment

- **Backend:** Koyeb — set env in Service → Variables. See [DEPLOY.md](DEPLOY.md).
- **Frontend:** Cloudflare Pages — Settings → Environment variables; set `VITE_API_URL` and redeploy.
- **Database:** Koyeb PostgreSQL; use its `DATABASE_URL` in the backend service.

---

## Validation

The backend validates config at startup (`backend/src/config.js`): in production it exits if `DATABASE_URL`, `JWT_SECRET`, or `WEB_APP_URL` are missing; optional vars (Stripe, SMTP) are only logged as warnings.

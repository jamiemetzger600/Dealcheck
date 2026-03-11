# Cursor Deployment Prompt — Vettr Hosting Setup
# Paste this entire prompt into Cursor Chat and let it run.
# It will make only safe, additive changes — no logic or features will be modified.

---

## Context

I am preparing the **Vettr** app for production deployment with the following stack:

- **Frontend (React + Vite PWA):** Cloudflare Pages — builds from the `web/` directory
- **Backend (Node.js / Express):** Koyeb Free — runs from the `backend/` directory
- **Database:** Koyeb-hosted PostgreSQL (connection string provided as `DATABASE_URL` env var)

The codebase is already functionally complete. I do NOT want you to change any business logic, UI, routes, controllers, or database schema. Only make the specific configuration and documentation changes listed below.

---

## Task 1 — Create `web/.env.example`

Create the file `web/.env.example` with the following content exactly:

```
# Vettr Web App — Environment Variables
# Copy this file to .env and fill in values for local development.
# For production, set these as environment variables in Cloudflare Pages.

# URL of the deployed backend API (no trailing slash)
# Local dev:        http://localhost:3001
# Production:       https://your-koyeb-app.koyeb.app
VITE_API_URL=http://localhost:3001
```

---

## Task 2 — Create `backend/.env.example`

Create the file `backend/.env.example` with the following content exactly:

```
# Vettr Backend API — Environment Variables
# Copy this file to .env and fill in values for local development.
# For production, set these in the Koyeb environment variables dashboard.

# ── Server ──────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001

# ── Database ─────────────────────────────────────────────────────────────
# Local dev:    postgresql://postgres:password@localhost:5432/vettr
# Production:   provided by Koyeb PostgreSQL (copy from Koyeb DB dashboard)
DATABASE_URL=postgresql://postgres:password@localhost:5432/vettr

# ── Auth ─────────────────────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
JWT_SECRET=replace_with_a_strong_random_secret_at_least_32_chars

# ── CORS ─────────────────────────────────────────────────────────────────
# The URL of your deployed frontend (no trailing slash)
# Local dev:    http://localhost:3000
# Production:   https://your-app.pages.dev  (or your custom domain)
WEB_APP_URL=http://localhost:3000

# ── Stripe ────────────────────────────────────────────────────────────────
# Get these from https://dashboard.stripe.com/apikeys
# Use test keys (sk_test_...) during development, live keys (sk_live_...) in production
STRIPE_SECRET_KEY=sk_test_replace_with_your_key
STRIPE_WEBHOOK_SECRET=whsec_replace_with_your_webhook_signing_secret

# ── Email (Nodemailer) ───────────────────────────────────────────────────
# For Gmail: use an App Password (not your regular password)
# See: https://support.google.com/accounts/answer/185833
# Alternatives: Resend, Mailgun, SendGrid all offer free tiers
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Vettr <your-email@gmail.com>
```

---

## Task 3 — Create `web/public/_redirects`

Cloudflare Pages uses a `_redirects` file (placed in the `public/` folder, which Vite copies to `dist/`) to handle client-side routing for React single-page apps. Without this, direct URL access (e.g. `/login`, `/dashboard`) will return a 404.

Create the file `web/public/_redirects` with exactly this content (one line):

```
/* /index.html 200
```

> Note: Your existing `web/vercel.json` handles the same thing for Vercel. Keep `vercel.json` in place — it will be ignored by Cloudflare Pages. The `_redirects` file is only used by Cloudflare.

---

## Task 4 — Verify `.gitignore` files

Check that `.env` files are properly gitignored.

1. If a `.gitignore` exists at the project root, confirm it contains `.env` and `.env.local`. If not, add those lines.
2. If a `.gitignore` exists in `web/`, confirm it contains `.env` and `.env.local`. If not, add those lines.
3. If a `.gitignore` exists in `backend/`, confirm it contains `.env` and `.env.local`. If not, add those lines.

Do NOT create new `.gitignore` files — only add to existing ones if the lines are missing.

---

## Task 5 — Verify `backend/src/db/pool.js` SSL config

Open `backend/src/db/pool.js` and confirm the SSL block reads exactly:

```js
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
```

`rejectUnauthorized: false` is required because Koyeb (and most managed PostgreSQL hosts) use self-signed or intermediate certificates that would otherwise fail strict SSL verification. If the config already says this, make no changes. If it differs, update it to match.

---

## Task 6 — Add a `PORT` fallback note (read-only verification)

Open `backend/src/index.js` and confirm the PORT line reads:

```js
const PORT = process.env.PORT || 3001;
```

Koyeb injects a `PORT` environment variable at runtime — your app must listen on it. If the fallback is something other than 3001, that is fine. Make no changes unless `process.env.PORT` is not referenced at all (in which case, add it).

---

## Task 7 — Create a production deployment README

Create the file `DEPLOY.md` in the project root with the following content:

```markdown
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
   - `VITE_API_URL` = your Koyeb backend URL (set after backend is deployed)
5. Deploy — your app will be live at `https://your-project.pages.dev`

---

## Backend — Koyeb

1. Go to [koyeb.com](https://koyeb.com) → Databases → Create → PostgreSQL (Free)
2. Copy the `DATABASE_URL` connection string
3. Services → Create Service → GitHub → select this repo
4. Build settings:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Run command:** `npm start`
   - **Port:** `3001`
5. Environment variables (see `backend/.env.example` for all required keys):
   - `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`
   - `WEB_APP_URL` (your Cloudflare Pages URL)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`
6. Deploy → wait for service to go live
7. Run migrations via Koyeb console: `npm run migrate`
8. Verify: `GET https://your-api.koyeb.app/health` → `{ "status": "ok" }`

---

## Post-Deploy

### Update Frontend → Backend URL
In Cloudflare Pages → Settings → Environment Variables:
- Update `VITE_API_URL` to your Koyeb backend URL
- Trigger a new deployment (the variable is baked into the Vite build)

### Configure Stripe Webhook
1. Stripe Dashboard → Webhooks → Add Endpoint
2. URL: `https://your-api.koyeb.app/api/payments/webhook`
3. Copy the Webhook Signing Secret → update `STRIPE_WEBHOOK_SECRET` in Koyeb

---

## Scaling Path

| Stage | Monthly Cost | When to Upgrade |
|-------|-------------|-----------------|
| Free  | $0          | MVP / beta      |
| Growth | ~$5–10/mo  | First revenue — migrate backend to Railway Hobby |
| Scale | ~$40–65/mo  | Meaningful MRR — Vercel Pro + Neon Pro |
```

---

## What NOT to change

- Do not modify any `.jsx`, `.js` route/controller/service files
- Do not modify `vite.config.js`, `vercel.json`, `manifest.json`
- Do not modify `backend/src/db/migrate.js` or any schema files
- Do not install new npm packages
- Do not modify any test files

---

## Summary of files you should create or modify

| File | Action |
|------|--------|
| `web/.env.example` | Create |
| `backend/.env.example` | Create |
| `web/public/_redirects` | Create |
| `.gitignore` (root/web/backend) | Add `.env` lines if missing |
| `backend/src/db/pool.js` | Verify SSL — update only if wrong |
| `backend/src/index.js` | Verify PORT — update only if missing |
| `DEPLOY.md` | Create |

Please make these changes now and summarize what you created or modified.

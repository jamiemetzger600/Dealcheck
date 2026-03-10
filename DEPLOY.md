# Dealcheck — Production Deployment Guide

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
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Run command:** `npm start`
   - **Port:** `3001`
5. Environment variables (see `backend/.env.example` for reference):
   - `NODE_ENV` = `production`
   - `DATABASE_URL` (from Koyeb PostgreSQL)
   - `JWT_SECRET` (generate with: `openssl rand -base64 32`)
   - `JWT_EXPIRES_IN` = `7d` (or your preferred expiry)
   - `WEB_APP_URL` = your Cloudflare Pages URL (e.g. `https://your-project.pages.dev`)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (for email notifications)
6. Deploy → wait for service to go live
7. Run migrations via Koyeb console: `npm run migrate`
8. Verify: `GET https://your-api.koyeb.app/health` → `{ "status": "ok" }`

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

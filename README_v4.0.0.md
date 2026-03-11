# Vettr v4.0.0 - Mobile Web MVP

## Summary

Complete mobile web application with backend API, authentication, deal aggregator, saved deals pipeline, notifications, payments, and PWA support.

## What's New in v4.0.0

### 🌐 Mobile Web App (PWA)
- Responsive React app works on all devices
- Add to home screen on iOS (Safari) and Android (Chrome)
- Standalone mode (full-screen, app-like experience)
- Post-login greeting with buy-box match count
- Instant navigation to matching deals (reduces friction)

### 🔐 Backend API
- PostgreSQL database for user data
- JWT-based authentication
- User settings sync (buy box, preferences, custom sources)
- Saved deals with notes and pipeline tracking
- Subscription/entitlement management

### 🔔 Notifications
- **Instant**: Every 15 minutes (paid users)
- **Daily**: One digest at 9:00 AM
- **Weekly**: Monday digest at 9:00 AM
- Email notifications for deal matches
- User-configurable frequency

### 💳 Payments (Stripe)
- Monthly and yearly subscription plans
- Secure Stripe Checkout
- Webhook integration for subscription updates
- Customer Portal for managing subscriptions
- Entitlement checks for paid features

### 🧩 Shared Logic
- Buy box matching extracted to `shared/` module
- Used by extension, web app, and backend
- Consistent filtering across all platforms
- Ready for native iOS/Android apps

## Directory Structure

```
/Users/jamie/Dealcheck-main/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── controllers/  # Auth, users, deals, payments
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Email, notifications
│   │   ├── middleware/   # Auth middleware
│   │   ├── db/           # Database pool & migrations
│   │   └── index.js      # Express server
│   ├── package.json
│   └── README.md
│
├── web/                  # React PWA
│   ├── src/
│   │   ├── components/   # Navigation, DealAggregator, SavedDeals
│   │   ├── pages/        # Login, Register, Dashboard, Settings, Billing
│   │   ├── context/      # AuthContext
│   │   ├── utils/        # API client
│   │   └── styles/       # Global CSS
│   ├── public/
│   │   └── manifest.json # PWA manifest
│   ├── package.json
│   └── README.md
│
├── shared/               # Shared business logic
│   ├── buyBoxMatcher.js  # Deal filtering
│   ├── dealNormalizer.js # Data normalization
│   └── index.js
│
├── [extension files]     # Existing v3.x extension
├── version.js            # v4.0.0
├── manifest.json         # v4.0.0
└── TESTING_v4.0.0.md     # Testing guide
```

## Branch

All v4.0.0 work is on branch: `v4.0.0-mobile-web-mvp`

## Technologies

**Backend**:
- Node.js + Express
- PostgreSQL
- JWT authentication
- Stripe API
- node-cron (scheduled jobs)
- Nodemailer (email)

**Web App**:
- React 18
- Vite (build tool)
- React Router
- Vanilla CSS (mobile-first)
- PWA manifest

**Shared**:
- Pure JavaScript (ES modules)
- Used across extension, web, backend

## Getting Started

See `TESTING_v4.0.0.md` for complete setup and testing instructions.

Quick start:
```bash
# 1. Set up database
createdb vettr

# 2. Backend
cd backend
npm install
cp .env.example .env
# (edit .env)
npm run migrate
npm run dev

# 3. Web app (new terminal)
cd web
npm install
npm run dev

# 4. Open http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### User
- `GET /api/user/settings` - Get settings
- `PUT /api/user/settings` - Update settings
- `GET /api/user/entitlements` - Get subscription status

### Deals
- `GET /api/deals` - Get saved deals
- `POST /api/deals` - Save deal
- `PUT /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal

### Payments
- `POST /api/payments/create-checkout-session` - Start Stripe checkout
- `POST /api/payments/create-portal-session` - Manage subscription
- `POST /api/payments/webhook` - Stripe webhooks

## Deployment Checklist

### Backend
- [ ] Deploy to Railway/Render/Fly.io
- [ ] Set environment variables
- [ ] Run migrations
- [ ] Configure Stripe webhook endpoint
- [ ] Set up email service (SendGrid/Postmark)

### Web App
- [ ] Deploy to Vercel/Netlify
- [ ] Set VITE_API_URL to production backend
- [ ] Add icons (192×192, 512×512) to `/public/icons/`
- [ ] Configure custom domain
- [ ] Enable HTTPS (required for PWA)

### Testing
- [ ] Test on real iOS device (Safari)
- [ ] Test on real Android device (Chrome)
- [ ] Test "Add to Home Screen"
- [ ] Test Stripe payments (live mode)
- [ ] Test email notifications
- [ ] Test all user flows

## Future: Native Apps

The architecture is designed for native iOS/Android apps:
- Same backend API
- Same buy box matching logic (reuse or reimplement)
- Same data model
- Payment state managed by backend (can sync with App Store/Play Store)

## Support

- Backend: `backend/README.md`
- Web: `web/README.md`
- Shared: `shared/README.md`
- Testing: `TESTING_v4.0.0.md`
- Add to Home Screen: `web/docs/ADD_TO_HOME_SCREEN.md`

# Vettr Web App v4.0.0

Mobile-accessible PWA (Progressive Web App) for business acquisition deal analysis.

## Features

- **Deal Aggregator**: Browse and filter business listings with buy-box matching
- **My Deals**: Save and manage your deal pipeline
- **User Accounts**: Secure authentication with JWT tokens
- **Notifications**: Instant, daily, or weekly deal-matching alerts
- **Payments**: Stripe integration for subscriptions
- **PWA**: Add to home screen for app-like experience

## Setup

### Prerequisites

- Node.js 18+
- Backend API running (see `../backend/README.md`)

### Installation

```bash
cd web
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

App runs at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Output is in `dist/` folder - deploy to any static hosting (Vercel, Netlify, etc.)

## Architecture

- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **State**: React Context API
- **Styling**: Vanilla CSS (mobile-first, responsive)
- **API**: REST API calls to backend (JWT auth)
- **Shared Logic**: `../shared/` module for buy-box matching

## Key Pages

- `/login` - Sign in
- `/register` - Create account
- `/dashboard` - Deal Aggregator + My Deals (default view)
- `/settings` - Notification preferences
- `/billing` - Subscription management

## Post-Login Experience

On login or app open, users see:
1. **Greeting banner** with count of deals matching their buy box
2. **Deal Aggregator** pre-filtered to show only matching deals by default
3. Option to toggle "Show all deals" to see unfiltered results

This reduces friction and gets users to relevant deals immediately.

## PWA Setup

1. Add icon files to `public/icons/`:
   - `icon-192.png` (192×192)
   - `icon-512.png` (512×512)

2. Serve over HTTPS (required for PWA)

3. Users can "Add to Home Screen" in Safari (iOS) or Chrome (Android)

See `docs/ADD_TO_HOME_SCREEN.md` for user instructions.

## API Integration

All API calls use `src/utils/api.js`:

```javascript
import { authAPI, userAPI, dealsAPI, paymentsAPI } from './utils/api';

// Login
await authAPI.login(email, password);

// Get user settings (buy box, preferences, etc.)
const settings = await userAPI.getSettings();

// Save a deal
await dealsAPI.saveDeal(deal);

// Create Stripe checkout
const { url } = await paymentsAPI.createCheckoutSession('monthly');
```

## Development

```bash
# Dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

Recommended platforms:
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy --prod`
- **Cloudflare Pages**: Connect Git repo

Set environment variable: `VITE_API_URL=https://your-api-domain.com/api`

## Future: Native Apps

This web app is designed to share the same backend API and business logic (`../shared/`) with future native iOS/Android apps. The backend handles all user data, authentication, and subscriptions - native apps will just be new clients calling the same endpoints.

# Vettr Backend API

Backend server for Vettr mobile web and native apps (v4.0.0+).

## Features

- **Authentication**: JWT-based auth with email/password
- **User Settings**: Buy box, exclude keywords, preferences, custom sources
- **Saved Deals**: CRUD operations for user's saved deals
- **Payments**: Stripe integration for subscriptions
- **Notifications**: Deal-matching notifications (instant, daily, weekly)

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Set up PostgreSQL database

```bash
# Install PostgreSQL if not already installed
# macOS:
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb vettr
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your settings
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT tokens (generate with `openssl rand -base64 32`)
- `STRIPE_SECRET_KEY`: Stripe secret key (test mode for dev)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `WEB_APP_URL`: Frontend URL for CORS and redirects

### 4. Run migrations

```bash
npm run migrate
```

### 5. Start server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3001` by default.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (returns JWT token)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user (requires auth)

### User Settings

- `GET /api/user/settings` - Get user settings (buy box, preferences, etc.)
- `PUT /api/user/settings` - Update user settings
- `GET /api/user/entitlements` - Get subscription/entitlements

### Saved Deals

- `GET /api/deals` - Get all saved deals
- `POST /api/deals` - Save a new deal
- `PUT /api/deals/:id` - Update a saved deal
- `DELETE /api/deals/:id` - Delete a saved deal

### Payments

- `POST /api/payments/create-checkout-session` - Create Stripe Checkout session
- `POST /api/payments/create-portal-session` - Create Stripe Customer Portal session
- `POST /api/payments/webhook` - Stripe webhook endpoint (no auth)

## Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your secret key from the Dashboard
3. Create two products/prices:
   - Monthly subscription
   - Yearly subscription
4. Add price IDs to `.env`:
   ```
   STRIPE_MONTHLY_PRICE_ID=price_xxx
   STRIPE_YEARLY_PRICE_ID=price_yyy
   ```
5. Set up webhook endpoint in Stripe Dashboard:
   - URL: `https://yourdomain.com/api/payments/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
   - Copy webhook signing secret to `.env`

## Database Schema

- `users`: User accounts
- `user_settings`: User preferences, buy box, custom sources
- `saved_deals`: User's saved deals
- `subscriptions`: Stripe subscription state

## Development

```bash
# Run in dev mode with auto-reload
npm run dev

# Check database connection
psql $DATABASE_URL
```

## Deployment

Recommended platforms:
- **Railway**: One-click deploy with PostgreSQL
- **Render**: Free tier available
- **Fly.io**: Global edge deployment

Set environment variables in your platform's dashboard.

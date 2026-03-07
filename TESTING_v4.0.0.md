# Dealcheck v4.0.0 - Testing Guide

## Prerequisites

- PostgreSQL installed and running
- Node.js 18+ installed
- Chrome or Safari browser (for PWA testing)

## Step 1: Set Up Database

### Install PostgreSQL

**macOS (Homebrew):**
```bash
# Install PostgreSQL 15
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Wait a few seconds for it to start, then verify it's running
brew services list | grep postgresql
# Should show "started"
```

**If you don't have Homebrew:**
```bash
# Install Homebrew first
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install PostgreSQL
brew install postgresql@15
brew services start postgresql@15
```

### Create Database

```bash
# Create the dealcheck database
createdb dealcheck

# Verify connection
psql dealcheck
# (you should see the psql prompt: dealcheck=#)
# Type \q to exit
```

### Troubleshooting

**If `createdb` says "command not found":**
```bash
# Add PostgreSQL to your PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Try again
createdb dealcheck
```

**If you get "could not connect to server":**
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# If not started, start it
brew services start postgresql@15

# Wait 10 seconds, then try again
createdb dealcheck
```

## Step 2: Set Up Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and set:
# - DATABASE_URL=postgresql://YOUR_USER@localhost:5432/dealcheck
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - Leave STRIPE keys for now (test Stripe later)
# - Leave SMTP settings for now (test email later)

# Run migrations
npm run migrate

# You should see:
# ✅ create_users_table completed
# ✅ create_user_settings_table completed
# ✅ create_saved_deals_table completed
# ✅ create_subscriptions_table completed
# ✅ create_updated_at_trigger completed

# Start backend server
npm run dev

# You should see:
# 🚀 Dealcheck API server running on port 3001
# 📝 Environment: development
# 🌐 Web app URL: http://localhost:3000
# ✅ Database connected
# ✅ Notification scheduler initialized
```

Leave this terminal running.

## Step 3: Set Up Web App

Open a **new terminal**:

```bash
cd web

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# (default settings should work - API proxies through Vite)

# Start dev server
npm run dev

# You should see:
# VITE v5.x.x ready in XXX ms
# ➜ Local:   http://localhost:3000/
# ➜ Network: use --host to expose
```

## Step 4: Test User Registration & Authentication

1. Open http://localhost:3000 in your browser
2. You should be redirected to `/login`
3. Click **"Sign up"**
4. Register with:
   - Email: `test@example.com`
   - Password: `password123` (min 8 chars)
5. Click **"Sign Up"**
6. You should be redirected to `/dashboard`
7. You should see:
   - Navigation sidebar with your email
   - "Welcome back! Loading deals..." greeting banner
   - Deal Aggregator tab (active)
   - My Deals tab

**Backend check**: In the backend terminal, you should see:
```
✅ Saved 1 users
✅ Saved 1 user_settings
✅ Saved 1 subscriptions
```

## Step 5: Test Dashboard Navigation

1. Click **"My Deals"** tab
   - Should show "No saved deals yet" message
2. Click **"Deal Aggregator"** tab
   - Should return to aggregator view
3. Click **"Settings"** in sidebar
   - Should navigate to Settings page
   - See notification frequency options (Instant/Daily/Weekly)
4. Click **"Billing"** in sidebar
   - Should show current plan (Free)
   - See upgrade options
5. Click **"Logout"**
   - Should redirect to login page
6. Log back in with same credentials
   - Should successfully authenticate

## Step 6: Test Deal Aggregator (Simulated)

**Note**: The deal aggregator is set up to fetch from Opensheet API. For now, it will show empty results since we haven't configured a real sheet. Let's test the UI:

1. In the Deal Aggregator view:
   - Try typing in the search box (should work even with no deals)
   - Toggle "Show all deals" checkbox
   - Greeting banner should be visible

2. **Real deals are enabled by default**:
   - The web app now uses the same default Opensheet feed as the extension
   - Refresh the page and the Deal Aggregator should load live deals automatically
   - If the list is empty, try toggling **"Show all deals"** in case your current buy box filters everything out

## Step 7: Test Saving Deals (Manual)

Since we don't have real deals yet, let's test the API directly:

```bash
# In a new terminal, get your auth token:
# (Look in browser DevTools → Application → Local Storage → token)

# Test saving a deal:
curl -X POST http://localhost:3001/api/deals \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "dealId": "test-deal-1",
    "name": "Test Business",
    "askingPrice": 500000,
    "revenue": 1000000,
    "ebitda": 150000,
    "location": "San Francisco, CA",
    "industry": "SaaS"
  }'

# Should return: {"message":"Deal saved successfully"}
```

Now refresh the web app and click **"My Deals"** - you should see your test deal!

## Step 8: Test My Deals Functionality

1. Click on the deal in the sidebar
2. Should see deal details on the right
3. Try changing the **Status** dropdown (new → reviewing → contacted, etc.)
4. Add some **Notes** in the textarea
5. Click **"Update"** - should see success message
6. Refresh page - changes should persist
7. Click **"Delete"** - should see confirmation and deal removed

## Step 9: Test Settings

1. Go to **Settings**
2. Select different notification frequencies:
   - Daily (default)
   - Weekly
   - Instant (note: requires paid plan)
3. Click **"Save Settings"**
4. Should see "Settings saved successfully!"

**Backend check**: In database:
```bash
psql dealcheck -c "SELECT notification_frequency FROM user_settings;"
# Should show your selected frequency
```

## Step 10: Test Billing (Stripe - Optional)

To fully test Stripe:

1. Create Stripe test account at https://stripe.com
2. Get test API keys from Dashboard
3. Create two products (Monthly $29, Yearly $290)
4. Update `backend/.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_MONTHLY_PRICE_ID=price_...
   STRIPE_YEARLY_PRICE_ID=price_...
   ```
5. Restart backend: `npm run dev`
6. In web app, go to Billing
7. Click **"Upgrade to Monthly"**
8. Should redirect to Stripe Checkout (test mode)
9. Use test card: `4242 4242 4242 4242`, any future date, any CVC
10. Complete checkout
11. Should redirect back to dashboard
12. Go to Billing - should show "active" status

## Step 11: Test PWA (Mobile)

### On Desktop (Chrome/Edge):
1. Open DevTools (F12)
2. Click **Application** tab
3. Click **Manifest** - should show Dealcheck manifest
4. Click **Service Workers** - (optional, not yet implemented)

### On Mobile (Real Device):

**iOS (Safari)**:
1. Visit http://YOUR_LOCAL_IP:3000 on iPhone
2. Tap Share button → "Add to Home Screen"
3. Tap Add
4. Open from home screen - should open in standalone mode

**Android (Chrome)**:
1. Visit http://YOUR_LOCAL_IP:3000 on Android
2. Tap menu → "Add to Home screen" or "Install app"
3. Open from home screen - should open in standalone mode

**Note**: For PWA to work properly on mobile, you need HTTPS. For local testing, you can use:
- `ngrok http 3000` to get HTTPS tunnel
- Or deploy to a real domain

## Step 12: Test Notifications (Optional)

To test email notifications:

1. Update `backend/.env` with Gmail SMTP:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```
   (Generate app password: Google Account → Security → 2-Step Verification → App passwords)

2. Restart backend

3. Notifications run on schedule:
   - Daily: 9:00 AM every day
   - Weekly: 9:00 AM every Monday
   - Instant: Every 15 minutes (paid users only)

4. To test immediately, temporarily change the cron schedule in `backend/src/services/notificationScheduler.js`

## Step 13: Database Inspection

View your data:

```bash
# Connect to database
psql dealcheck

# View users
SELECT id, email, created_at FROM users;

# View user settings
SELECT user_id, notification_frequency, buy_box FROM user_settings;

# View saved deals
SELECT id, user_id, name, status FROM saved_deals;

# View subscriptions
SELECT user_id, status, plan FROM subscriptions;

# Exit
\q
```

## Common Issues & Solutions

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in .env
- Check port 3001 is not in use: `lsof -i :3001`

### Web app won't start
- Check Node version: `node --version` (need 18+)
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check port 3000 is not in use

### "Database error" messages
- Run migrations again: `npm run migrate`
- Check database exists: `psql -l | grep dealcheck`

### Can't save deals (401 Unauthorized)
- Check JWT_SECRET is set in backend/.env
- Log out and log in again to get fresh token
- Check token in browser localStorage

### PWA won't install
- Must use HTTPS (except localhost)
- manifest.json must be valid
- Icons must exist at specified paths

## Success Criteria

✅ User can register and log in
✅ Dashboard loads with navigation
✅ Deal Aggregator shows (empty or with deals)
✅ Can save deals to My Deals
✅ Can update deal status and notes
✅ Settings page works (notification frequency)
✅ Billing page shows plans (Stripe optional)
✅ PWA manifest is valid
✅ Mobile-responsive design works

## Next Steps

Once MVP is tested and working:

1. Configure real Opensheet URL or add custom sources
2. Set up production Stripe account with real prices
3. Set up email service (SendGrid, Postmark, etc.) for notifications
4. Deploy backend to Railway/Render/Fly.io
5. Deploy web app to Vercel/Netlify
6. Set up custom domain with HTTPS
7. Test PWA install on real mobile devices
8. Invite beta users!

## Getting Help

If you encounter issues:
1. Check backend terminal for error logs
2. Check browser DevTools Console for errors
3. Check database with `psql dealcheck`
4. Verify .env files are configured correctly
5. Ensure all dependencies are installed (`npm install`)

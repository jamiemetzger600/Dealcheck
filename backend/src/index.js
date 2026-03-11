import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import dealsRoutes from './routes/deals.js';
import paymentsRoutes from './routes/payments.js';
import airtableDealsRoutes from './routes/airtableDeals.js';
import './services/notificationScheduler.js'; // Start notification jobs
import './services/airtableScraper.js';
import { validateConfig } from './config.js';

dotenv.config();
validateConfig(); // Exits in production if required env vars missing (see CONFIG.md)

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// CORS: in development allow both Vite (5173) and legacy (3000) so it works regardless of .env
const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:5173';
const corsOrigin = process.env.NODE_ENV === 'production'
  ? webAppUrl
  : [webAppUrl, 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// Body parsing (except for Stripe webhooks)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '4.2.2' });
});

app.get('/api/default-deals-csv', async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      'https://docs.google.com/spreadsheets/d/1RKab4UHut6SvVjjCtSeCGL0xT__WTLNwsACFRmSXYyM/gviz/tq?tqx=out:csv&sheet=1',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(`Google Sheets CSV error (${response.status})`);
    }

    const csv = await response.text();
    res.type('text/csv').send(csv);
  } catch (error) {
    console.error('Default deals CSV fetch failed:', error.message);
    res.status(502).json({ error: 'Failed to fetch default deals feed' });
  } finally {
    clearTimeout(timeout);
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/airtable-deals', airtableDealsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Vettr API server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Web app URL: ${process.env.WEB_APP_URL || 'http://localhost:5173'}`);
});

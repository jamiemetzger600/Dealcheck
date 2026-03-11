/**
 * Server configuration validation. Load this at startup so missing required
 * env vars fail fast. See CONFIG.md (repo root) for full variable list.
 */

const isProduction = process.env.NODE_ENV === 'production';

const REQUIRED_IN_PRODUCTION = [
  { key: 'DATABASE_URL', hint: 'PostgreSQL connection string from Koyeb or local' },
  { key: 'JWT_SECRET', hint: 'Generate with: openssl rand -base64 32' },
  { key: 'WEB_APP_URL', hint: 'Cloudflare Pages URL (no trailing slash), for CORS' }
];

const OPTIONAL_BUT_RECOMMENDED = [
  { key: 'STRIPE_SECRET_KEY', hint: 'Required for billing' },
  { key: 'STRIPE_WEBHOOK_SECRET', hint: 'Required for Stripe webhooks' },
  { key: 'STRIPE_MONTHLY_PRICE_ID', hint: 'Stripe Price ID for monthly plan' },
  { key: 'STRIPE_YEARLY_PRICE_ID', hint: 'Stripe Price ID for yearly plan' },
  { key: 'SMTP_HOST', hint: 'Required for email notifications' }
];

function validateConfig() {
  const missing = [];
  if (isProduction) {
    for (const { key, hint } of REQUIRED_IN_PRODUCTION) {
      const value = process.env[key];
      if (!value || String(value).trim() === '') {
        missing.push({ key, hint });
      }
    }
    if (missing.length > 0) {
      console.error('Missing required environment variables (production):');
      missing.forEach(({ key, hint }) => console.error(`  - ${key}: ${hint}`));
      process.exit(1);
    }
  }

  for (const { key, hint } of OPTIONAL_BUT_RECOMMENDED) {
    const value = process.env[key];
    if (!value || String(value).trim() === '') {
      console.warn(`[config] Optional env not set: ${key} — ${hint}`);
    }
  }
}

export { validateConfig };

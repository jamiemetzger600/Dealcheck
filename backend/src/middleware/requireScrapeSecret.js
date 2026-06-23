/**
 * Protects POST /api/airtable-deals/scrape when SCRAPE_TRIGGER_SECRET is set.
 * Accepts X-Scrape-Secret header or Authorization: Bearer <secret>.
 * Used by GitHub Actions scheduled cron (see .github/workflows/airtable-scrape-cron.yml).
 */
const SCRAPE_TRIGGER_SECRET = process.env.SCRAPE_TRIGGER_SECRET?.trim() || '';

export function requireScrapeSecret(req, res, next) {
  if (!SCRAPE_TRIGGER_SECRET) {
    console.warn('[scrape] SCRAPE_TRIGGER_SECRET not set — POST /scrape is open');
    return next();
  }

  const headerSecret = req.headers['x-scrape-secret'];
  const bearer = req.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  const provided = (headerSecret || bearer || '').trim();

  if (provided !== SCRAPE_TRIGGER_SECRET) {
    console.warn('[scrape] Unauthorized scrape trigger attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

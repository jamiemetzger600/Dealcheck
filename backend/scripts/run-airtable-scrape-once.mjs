#!/usr/bin/env node
/**
 * One-off Airtable scrape (ops / catch-up). Does not register cron or startup hooks.
 *
 * Usage (production DB from Koyeb DATABASE_URL):
 *   SCRAPE_CLI_ONCE=1 NODE_ENV=production DATABASE_URL='postgres://...' \
 *     node --max-old-space-size=768 scripts/run-airtable-scrape-once.mjs
 */
process.env.SCRAPE_CLI_ONCE = '1';

import { scrapeAirtable } from '../src/services/airtableScraper.js';

console.log('[scrape-once] Starting Airtable scrape...');
scrapeAirtable()
  .then((result) => {
    console.log('[scrape-once] Done:', JSON.stringify(result));
    process.exit(0);
  })
  .catch((err) => {
    console.error('[scrape-once] Failed:', err.message);
    process.exit(1);
  });

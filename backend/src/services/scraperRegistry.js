import cron from 'node-cron';

/**
 * Lightweight scraper registry. Each source registers a scraper object with:
 *   { sourceKey: string, scrape: () => Promise<result>, getStatus: () => object }
 *
 * The registry manages cron scheduling and logging.
 * Import this and call register() from each scraper module.
 */

const scrapers = new Map();

export function register({ sourceKey, scrape, getStatus, cronExpr, enabled = true, cronTimezone }) {
  if (scrapers.has(sourceKey)) {
    console.warn(`Scraper "${sourceKey}" already registered, skipping duplicate`);
    return;
  }

  scrapers.set(sourceKey, { sourceKey, scrape, getStatus, cronExpr, cronTimezone, enabled });

  if (enabled && cronExpr) {
    const scheduleOpts = cronTimezone ? { timezone: cronTimezone } : undefined;
    cron.schedule(
      cronExpr,
      async () => {
        console.log(`🔄 [${sourceKey}] Scheduled scrape starting...`);
        try {
          await scrape();
        } catch {
          // Errors are logged inside each scraper's scrape() function
        }
      },
      scheduleOpts
    );
    const tzNote = cronTimezone ? `, TZ=${cronTimezone}` : '';
    console.log(`✅ Scraper "${sourceKey}" scheduled (cron: ${cronExpr}${tzNote})`);
  } else {
    console.log(`⏸️  Scraper "${sourceKey}" registered but ${enabled ? 'no cron set' : 'disabled'}`);
  }
}

export function getAll() {
  return Array.from(scrapers.values()).map(s => ({
    sourceKey: s.sourceKey,
    enabled: s.enabled,
    cronExpr: s.cronExpr,
    cronTimezone: s.cronTimezone,
    status: s.getStatus(),
  }));
}

export function get(sourceKey) {
  return scrapers.get(sourceKey) || null;
}

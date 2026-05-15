import pool from '../db/pool.js';

export const PRUNE_ENABLED =
  (process.env.MARKET_DEALS_PRUNE_ENABLED || 'true') === 'true';

const rawMonths = parseInt(process.env.MARKET_DEALS_MAX_AGE_MONTHS || '6', 10);
const MAX_AGE_MONTHS =
  Number.isFinite(rawMonths) && rawMonths > 0 ? rawMonths : 6;

let _lastRun = null;
let _lastResult = null;

/**
 * Deactivate market listings with no source activity newer than MAX_AGE_MONTHS.
 * Uses COALESCE(source_updated_at, source_added_at, first_seen_at, last_scraped_at).
 * Called automatically after each successful Airtable scrape (same job as the daily pull).
 */
export async function pruneStaleMarketDeals() {
  if (!PRUNE_ENABLED) {
    const skip = { skipped: true, reason: 'MARKET_DEALS_PRUNE_ENABLED=false' };
    _lastResult = skip;
    return skip;
  }

  const start = Date.now();
  try {
    const update = await pool.query(
      `UPDATE market_deals
       SET is_active = false
       WHERE is_active = true
         AND COALESCE(
               source_updated_at,
               source_added_at,
               first_seen_at,
               last_scraped_at
             ) < NOW() - ($1::int * INTERVAL '1 month')`,
      [MAX_AGE_MONTHS]
    );

    const deactivated = update.rowCount ?? 0;

    await pool.query(`
      UPDATE deal_sources
      SET deal_count = (
        SELECT COUNT(*)::int
        FROM market_deals md
        WHERE md.source = deal_sources.source_key AND md.is_active = true
      )
    `);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    _lastRun = new Date();
    _lastResult = {
      deactivated,
      max_age_months: MAX_AGE_MONTHS,
      elapsed_s: elapsed,
      ts: _lastRun.toISOString(),
    };
    console.log(
      `🧹 [market-deals prune] Deactivated ${deactivated} listings older than ${MAX_AGE_MONTHS} mo (${elapsed}s)`
    );
    return _lastResult;
  } catch (err) {
    console.error('🧹 [market-deals prune] Error:', err.message);
    _lastRun = new Date();
    _lastResult = { error: err.message, ts: _lastRun.toISOString() };
    throw err;
  }
}

export function getPruneStatus() {
  return {
    enabled: PRUNE_ENABLED,
    maxAgeMonths: MAX_AGE_MONTHS,
    runsAfterAirtableScrape: true,
    lastRun: _lastRun,
    lastResult: _lastResult,
  };
}

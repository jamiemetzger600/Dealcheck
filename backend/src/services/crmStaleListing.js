import pool from '../db/pool.js';
import { VISIBLE_DEALS_SQL } from '../lib/teamAcl.js';

/**
 * Deals whose saved financials differ from the live market_deals feed.
 */
export async function findStaleListings(userId) {
  const result = await pool.query(
    `SELECT sd.id, sd.name, sd.market_deal_id, sd.progress_stage,
            sd.asking_price, sd.ebitda, sd.revenue, sd.listing_snapshot_at,
            md.asking_price AS feed_asking,
            md.annual_profit AS feed_ebitda,
            md.annual_revenue AS feed_revenue,
            md.source_updated_at AS feed_updated_at
     FROM saved_deals sd
     INNER JOIN market_deals md ON md.id = sd.market_deal_id
     WHERE ${VISIBLE_DEALS_SQL}
       AND (
         (sd.asking_price IS NOT NULL AND md.asking_price IS NOT NULL AND sd.asking_price IS DISTINCT FROM md.asking_price)
         OR (sd.ebitda IS NOT NULL AND md.annual_profit IS NOT NULL AND sd.ebitda IS DISTINCT FROM md.annual_profit)
         OR (sd.revenue IS NOT NULL AND md.annual_revenue IS NOT NULL AND sd.revenue IS DISTINCT FROM md.annual_revenue)
       )
     ORDER BY md.source_updated_at DESC NULLS LAST`,
    [userId]
  );

  return result.rows.map((row) => ({
    savedDealId: row.id,
    name: row.name,
    progressStage: row.progress_stage,
    marketDealId: row.market_deal_id,
    changes: {
      askingPrice: row.asking_price !== row.feed_asking
        ? { saved: row.asking_price, feed: row.feed_asking }
        : null,
      ebitda: row.ebitda !== row.feed_ebitda
        ? { saved: row.ebitda, feed: row.feed_ebitda }
        : null,
      revenue: row.revenue !== row.feed_revenue
        ? { saved: row.revenue, feed: row.feed_revenue }
        : null
    },
    listingSnapshotAt: row.listing_snapshot_at,
    feedUpdatedAt: row.feed_updated_at
  }));
}

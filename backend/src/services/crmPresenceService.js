import pool from '../db/pool.js';
import { VISIBLE_DEALS_SQL } from '../lib/teamAcl.js';

const CLOSED_STAGE_SQL = `
  sd.progress_stage IS NULL
  OR (
    sd.progress_stage NOT ILIKE '%closed%'
    AND sd.progress_stage NOT ILIKE '%dead%'
    AND sd.progress_stage NOT ILIKE '%passed%'
    AND sd.progress_stage NOT ILIKE '%lost%'
  )
`;

/**
 * Deals with no CRM activity (and stale updated_at) for N days.
 * Excludes clearly closed/dead pipeline stages.
 */
export async function findDormantDeals(userId, { days = 14, limit = 20 } = {}) {
  const result = await pool.query(
    `SELECT sd.id AS saved_deal_id,
            sd.name AS deal_name,
            sd.progress_stage,
            COALESCE(la.last_at, sd.updated_at) AS last_activity_at,
            GREATEST(
              0,
              EXTRACT(DAY FROM NOW() - COALESCE(la.last_at, sd.updated_at))::int
            ) AS days_idle
     FROM saved_deals sd
     LEFT JOIN LATERAL (
       SELECT MAX(a.occurred_at) AS last_at
       FROM activities a
       WHERE a.saved_deal_id = sd.id
     ) la ON true
     WHERE ${VISIBLE_DEALS_SQL}
       AND (${CLOSED_STAGE_SQL})
       AND COALESCE(la.last_at, sd.updated_at) < NOW() - make_interval(days => $2)
     ORDER BY COALESCE(la.last_at, sd.updated_at) ASC
     LIMIT $3`,
    [userId, days, limit]
  );
  return result.rows;
}

/** Latest activity actor per deal (for kanban / presence). */
export async function getLastActivityByDealIds(savedDealIds) {
  if (!savedDealIds?.length) return {};
  const result = await pool.query(
    `SELECT DISTINCT ON (a.saved_deal_id)
       a.saved_deal_id,
       a.occurred_at,
       a.activity_type,
       u.email AS actor_email
     FROM activities a
     JOIN users u ON u.id = a.user_id
     WHERE a.saved_deal_id = ANY($1::int[])
     ORDER BY a.saved_deal_id, a.occurred_at DESC`,
    [savedDealIds]
  );
  const map = {};
  for (const row of result.rows) {
    map[row.saved_deal_id] = {
      at: row.occurred_at,
      type: row.activity_type,
      actorEmail: row.actor_email
    };
  }
  return map;
}

import pool from '../db/pool.js';

function adderUserId(row) {
  return Number(row.shared_by_user_id || row.user_id);
}

export async function markDealSeen(userId, savedDealId) {
  const uid = Number(userId);
  const did = Number(savedDealId);
  if (!uid || !did) return;
  await pool.query(
    `INSERT INTO saved_deal_views (user_id, saved_deal_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, saved_deal_id) DO NOTHING`,
    [uid, did]
  );
  console.log('[savedDealViews] marked seen', { userId: uid, savedDealId: did });
}

export async function markAllTeamDealsSeenForUser(userId, teamId) {
  const uid = Number(userId);
  const tid = Number(teamId);
  if (!uid || !tid) return;
  const result = await pool.query(
    `INSERT INTO saved_deal_views (user_id, saved_deal_id)
     SELECT $1, sd.id
     FROM saved_deals sd
     WHERE sd.team_id = $2
     ON CONFLICT (user_id, saved_deal_id) DO NOTHING`,
    [uid, tid]
  );
  console.log('[savedDealViews] backfill team for member', {
    userId: uid,
    teamId: tid,
    inserted: result.rowCount
  });
}

export async function attachUnseenFromTeam(userId, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const uid = Number(userId);
  const candidates = rows
    .filter((row) => row.team_id && adderUserId(row) !== uid)
    .map((row) => Number(row.id))
    .filter(Boolean);
  if (candidates.length === 0) {
    return rows.map((row) => ({ ...row, unseen_from_team: false }));
  }
  const seen = await pool.query(
    `SELECT saved_deal_id
     FROM saved_deal_views
     WHERE user_id = $1 AND saved_deal_id = ANY($2::int[])`,
    [uid, candidates]
  );
  const seenSet = new Set(seen.rows.map((r) => Number(r.saved_deal_id)));
  const unseenSet = new Set(candidates.filter((id) => !seenSet.has(id)));
  return rows.map((row) => ({
    ...row,
    unseen_from_team: unseenSet.has(Number(row.id))
  }));
}

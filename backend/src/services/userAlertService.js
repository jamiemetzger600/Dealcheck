import pool from '../db/pool.js';

/**
 * Durable in-app alerts (Talk mentions, assigns, etc.).
 * Cleared when the user opens the related deal Talk or marks read explicitly.
 */

export async function createUserAlert({
  userId,
  alertType,
  title,
  body = null,
  savedDealId = null,
  messageId = null,
  metadata = {}
}) {
  const result = await pool.query(
    `INSERT INTO user_alerts (
       user_id, alert_type, title, body, saved_deal_id, message_id, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, alert_type, title, body, saved_deal_id, message_id,
               metadata, read_at, created_at`,
    [
      userId,
      alertType,
      title,
      body,
      savedDealId,
      messageId,
      JSON.stringify(metadata || {})
    ]
  );
  console.log(
    `[userAlert] created id=${result.rows[0].id} type=${alertType} user=${userId} deal=${savedDealId}`
  );
  return result.rows[0];
}

export async function listUnreadAlerts(userId, { limit = 30 } = {}) {
  const result = await pool.query(
    `SELECT a.id, a.alert_type, a.title, a.body, a.saved_deal_id, a.message_id,
            a.metadata, a.created_at, sd.name AS deal_name
     FROM user_alerts a
     LEFT JOIN saved_deals sd ON sd.id = a.saved_deal_id
     WHERE a.user_id = $1 AND a.read_at IS NULL
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

export async function countUnreadAlerts(userId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS n FROM user_alerts
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return result.rows[0]?.n || 0;
}

export async function markAlertRead(userId, alertId) {
  const result = await pool.query(
    `UPDATE user_alerts
     SET read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL
     RETURNING id`,
    [alertId, userId]
  );
  return Boolean(result.rows[0]);
}

export async function markDealTalkAlertsRead(userId, savedDealId) {
  const result = await pool.query(
    `UPDATE user_alerts
     SET read_at = NOW()
     WHERE user_id = $1
       AND saved_deal_id = $2
       AND read_at IS NULL
       AND alert_type IN ('talk_mention', 'talk_assign')
     RETURNING id`,
    [userId, savedDealId]
  );
  if (result.rows.length) {
    console.log(
      `[userAlert] marked ${result.rows.length} talk alerts read user=${userId} deal=${savedDealId}`
    );
  }
  return result.rows.length;
}

export async function markAllAlertsRead(userId) {
  const result = await pool.query(
    `UPDATE user_alerts
     SET read_at = NOW()
     WHERE user_id = $1 AND read_at IS NULL
     RETURNING id`,
    [userId]
  );
  return result.rows.length;
}

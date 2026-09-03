import webpush from 'web-push';
import pool from '../db/pool.js';

let configured = false;

function vapidPublicKey() {
  return String(process.env.VAPID_PUBLIC_KEY || '').trim();
}

function vapidPrivateKey() {
  return String(process.env.VAPID_PRIVATE_KEY || '').trim();
}

function vapidSubject() {
  const mailto = String(process.env.VAPID_SUBJECT || process.env.SMTP_USER || '').trim();
  if (mailto.startsWith('mailto:') || mailto.startsWith('https://')) return mailto;
  if (mailto.includes('@')) return `mailto:${mailto}`;
  return 'mailto:hello@vettr.app';
}

export function isPushConfigured() {
  return Boolean(vapidPublicKey() && vapidPrivateKey());
}

export function getVapidPublicKey() {
  return vapidPublicKey();
}

function ensureConfigured() {
  if (configured) return isPushConfigured();
  if (!isPushConfigured()) {
    console.warn('[push] VAPID keys not set — desktop/PWA push disabled');
    return false;
  }
  webpush.setVapidDetails(vapidSubject(), vapidPublicKey(), vapidPrivateKey());
  configured = true;
  console.log('[push] VAPID configured');
  return true;
}

export async function savePushSubscription(userId, subscription, userAgent = '') {
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    const err = new Error('Invalid push subscription');
    err.status = 400;
    throw err;
  }

  const result = await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       user_agent = EXCLUDED.user_agent,
       updated_at = NOW()
     RETURNING id, user_id, endpoint, created_at`,
    [userId, endpoint, p256dh, auth, String(userAgent || '').slice(0, 400)]
  );
  console.log('[push] subscription saved', { userId, id: result.rows[0]?.id });
  return result.rows[0];
}

export async function deletePushSubscription(userId, endpoint) {
  if (endpoint) {
    const result = await pool.query(
      `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2 RETURNING id`,
      [userId, endpoint]
    );
    console.log('[push] subscription deleted', { userId, count: result.rowCount });
    return result.rowCount;
  }
  const result = await pool.query(
    `DELETE FROM push_subscriptions WHERE user_id = $1 RETURNING id`,
    [userId]
  );
  console.log('[push] all subscriptions deleted', { userId, count: result.rowCount });
  return result.rowCount;
}

export async function userHasPushSubscription(userId) {
  const result = await pool.query(
    `SELECT 1 FROM push_subscriptions WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0;
}

/**
 * Send a Web Push to all of a user's subscriptions.
 * payload: { title, body, url, tag }
 */
export async function sendPushToUser(userId, payload) {
  if (!ensureConfigured()) return { sent: 0, reason: 'not_configured' };

  const subs = await pool.query(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );
  if (!subs.rows.length) return { sent: 0, reason: 'no_subscription' };

  const body = JSON.stringify({
    title: String(payload.title || 'Vettr').slice(0, 120),
    body: String(payload.body || '').slice(0, 240),
    url: payload.url || '/dashboard',
    tag: payload.tag || 'vettr'
  });

  let sent = 0;
  for (const row of subs.rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        body,
        { TTL: 60 * 60, urgency: payload.urgency || 'normal' }
      );
      sent += 1;
    } catch (err) {
      const status = err?.statusCode;
      console.warn('[push] send failed', { userId, status, message: err.message });
      if (status === 404 || status === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [row.id]);
        console.log('[push] dropped stale subscription', { id: row.id, userId });
      }
    }
  }
  if (sent) console.log('[push] sent', { userId, sent, title: payload.title });
  return { sent };
}

ensureConfigured();


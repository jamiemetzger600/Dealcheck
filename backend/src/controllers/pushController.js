import {
  getVapidPublicKey,
  isPushConfigured,
  savePushSubscription,
  deletePushSubscription,
  sendPushToUser
} from '../services/pushService.js';
import { sendDigestNowForUser } from '../services/dailyDigestService.js';

export const getPushPublicKey = async (req, res) => {
  if (!isPushConfigured()) {
    return res.status(503).json({ error: 'Push notifications are not configured', configured: false });
  }
  res.json({ publicKey: getVapidPublicKey(), configured: true });
};

export const subscribePush = async (req, res) => {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({ error: 'Push notifications are not configured' });
    }
    const saved = await savePushSubscription(
      req.user.userId,
      req.body?.subscription || req.body,
      req.get('user-agent') || ''
    );
    res.json({ ok: true, id: saved.id });
  } catch (error) {
    console.error('[push] subscribe error', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Subscribe failed' });
  }
};

export const unsubscribePush = async (req, res) => {
  try {
    const endpoint = req.body?.endpoint || req.body?.subscription?.endpoint;
    const count = await deletePushSubscription(req.user.userId, endpoint);
    res.json({ ok: true, removed: count });
  } catch (error) {
    console.error('[push] unsubscribe error', error.message);
    res.status(500).json({ error: 'Unsubscribe failed' });
  }
};

export const postTestPush = async (req, res) => {
  try {
    const pushed = await sendPushToUser(req.user.userId, {
      title: 'Vettr test notification',
      body: 'Desktop and PWA alerts are working.',
      url: '/settings',
      tag: 'vettr-test'
    });
    res.json({ ok: true, pushed: pushed.sent, reason: pushed.reason || null });
  } catch (error) {
    console.error('[push] test error', error.message);
    res.status(500).json({ error: 'Test notification failed' });
  }
};

export const postSendDigestNow = async (req, res) => {
  try {
    const result = await sendDigestNowForUser(req.user.userId);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('[push] digest-now error', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Digest failed' });
  }
};

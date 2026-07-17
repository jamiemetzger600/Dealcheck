import {
  listUnreadAlerts,
  countUnreadAlerts,
  markAlertRead,
  markAllAlertsRead
} from '../services/userAlertService.js';

export const getUnreadAlerts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [alerts, unreadCount] = await Promise.all([
      listUnreadAlerts(userId),
      countUnreadAlerts(userId)
    ]);
    res.json({ alerts, unreadCount });
  } catch (error) {
    console.error('[alerts] getUnreadAlerts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchAlertRead = async (req, res) => {
  try {
    const alertId = Number(req.params.alertId);
    const ok = await markAlertRead(req.user.userId, alertId);
    if (!ok) return res.status(404).json({ error: 'Alert not found' });
    res.json({ read: true, id: alertId });
  } catch (error) {
    console.error('[alerts] patchAlertRead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postAlertsReadAll = async (req, res) => {
  try {
    const count = await markAllAlertsRead(req.user.userId);
    res.json({ read: count });
  } catch (error) {
    console.error('[alerts] postAlertsReadAll error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

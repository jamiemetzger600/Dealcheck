import { useEffect, useRef, useState } from 'react';
import { crmAPI } from '../../utils/api';

/**
 * Sticky in-app alerts for Talk @mentions / assigns.
 * Polls lightly so tagged users notice even when not on the CRM tab.
 */
export default function TalkAlertBanner({
  enabled = true,
  pollMs = 30000,
  onOpenAlert = null,
  onUnreadChange = null
}) {
  const [alerts, setAlerts] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const seenIdsRef = useRef(new Set());
  const onUnreadChangeRef = useRef(onUnreadChange);
  onUnreadChangeRef.current = onUnreadChange;

  const refresh = async ({ notifyBrowser } = {}) => {
    try {
      const data = await crmAPI.getAlerts();
      const next = data?.alerts || [];
      setAlerts(next);
      onUnreadChangeRef.current?.(data?.unreadCount ?? next.length);

      if (notifyBrowser && typeof Notification !== 'undefined') {
        for (const alert of next) {
          if (seenIdsRef.current.has(alert.id)) continue;
          seenIdsRef.current.add(alert.id);
          if (document.hidden && Notification.permission === 'granted') {
            try {
              new Notification(alert.title || 'Vettr Talk', {
                body: `${alert.deal_name || 'Deal'}: ${(alert.body || '').slice(0, 120)}`,
                tag: `vettr-alert-${alert.id}`
              });
            } catch (err) {
              console.warn('[TalkAlertBanner] browser notification failed', err);
            }
          }
        }
      } else {
        for (const alert of next) seenIdsRef.current.add(alert.id);
      }
    } catch (err) {
      console.warn('[TalkAlertBanner] poll failed', err.message);
    }
  };

  useEffect(() => {
    if (!enabled) return undefined;
    refresh({ notifyBrowser: false });
    const t = setInterval(() => refresh({ notifyBrowser: true }), pollMs);
    const onFocus = () => refresh({ notifyBrowser: false });
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, pollMs]);

  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      // Soft ask once per session after first alert appears
      if (alerts.length > 0) {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, [enabled, alerts.length]);

  const visible = alerts.filter((a) => !dismissedIds.has(a.id));
  if (!enabled || visible.length === 0) return null;

  const top = visible[0];
  const extra = visible.length - 1;

  const openTop = async () => {
    console.log('[TalkAlertBanner] open alert', top.id, 'deal', top.saved_deal_id);
    try {
      await crmAPI.markAlertRead(top.id);
    } catch (err) {
      console.warn('[TalkAlertBanner] mark read failed', err.message);
    }
    setDismissedIds((prev) => new Set(prev).add(top.id));
    onOpenAlert?.(top);
    refresh({ notifyBrowser: false });
  };

  const dismissTop = async () => {
    try {
      await crmAPI.markAlertRead(top.id);
    } catch (err) {
      console.warn('[TalkAlertBanner] dismiss failed', err.message);
    }
    setDismissedIds((prev) => new Set(prev).add(top.id));
    refresh({ notifyBrowser: false });
  };

  return (
    <div className="talk-alert-banner" role="status" aria-live="polite">
      <div className="talk-alert-banner__body">
        <strong className="talk-alert-banner__title">{top.title}</strong>
        <span className="talk-alert-banner__meta">
          {top.deal_name || 'Deal'}
          {extra > 0 ? ` · +${extra} more` : ''}
        </span>
        {top.body ? (
          <span className="talk-alert-banner__preview">{top.body}</span>
        ) : null}
      </div>
      <div className="talk-alert-banner__actions">
        <button type="button" className="btn-primary btn-secondary--sm" onClick={openTop}>
          {top.alert_type === 'task_completed' ? 'Open Tasks' : 'Open Talk'}
        </button>
        <button type="button" className="btn-secondary btn-secondary--sm" onClick={dismissTop}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

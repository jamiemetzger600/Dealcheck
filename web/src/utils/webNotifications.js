/**
 * Desktop Notification API + Web Push subscription for the installed PWA / browser.
 */

const VAPID_CACHE_KEY = 'vettr_vapid_public';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function notificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export async function getNotificationRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  try {
    return await navigator.serviceWorker.register('/push-sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });
  } catch (err) {
    console.warn('[webNotifications] SW register failed', err);
    return null;
  }
}

export async function showLocalNotification(title, { body, tag, url } = {}) {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const reg = await getNotificationRegistration();
    if (reg?.showNotification) {
      await reg.showNotification(title, {
        body: body || '',
        tag: tag || 'vettr',
        data: { url: url || '/dashboard' },
        icon: '/icons/icon-192.png'
      });
      return true;
    }
    new Notification(title, { body: body || '', tag: tag || 'vettr' });
    return true;
  } catch (err) {
    console.warn('[webNotifications] local notification failed', err);
    return false;
  }
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    console.log('[webNotifications] permission', result);
    return result;
  } catch (err) {
    console.warn('[webNotifications] permission request failed', err);
    return 'denied';
  }
}

async function fetchVapidPublicKey(userAPI) {
  const data = await userAPI.getPushPublicKey();
  const key = data?.publicKey;
  if (!key) throw new Error('Push is not configured on the server');
  try {
    sessionStorage.setItem(VAPID_CACHE_KEY, key);
  } catch {}
  return key;
}

export async function subscribeWebPush(userAPI) {
  if (!pushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: permission };
  }
  const reg = await getNotificationRegistration();
  if (!reg) return { ok: false, reason: 'no_sw' };

  const publicKey = await fetchVapidPublicKey(userAPI);
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }
  await userAPI.subscribePush(sub.toJSON());
  console.log('[webNotifications] subscribed');
  return { ok: true, subscription: sub.toJSON() };
}

export async function unsubscribeWebPush(userAPI) {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager?.getSubscription();
    const endpoint = sub?.endpoint;
    if (sub) await sub.unsubscribe();
    await userAPI.unsubscribePush(endpoint ? { endpoint } : {});
    console.log('[webNotifications] unsubscribed');
    return { ok: true };
  } catch (err) {
    console.warn('[webNotifications] unsubscribe failed', err);
    return { ok: false, reason: err.message };
  }
}

/** Re-subscribe if permission is already granted (endpoints rotate). */
export async function syncPushIfGranted(userAPI, enabled) {
  if (!enabled || !pushSupported()) return;
  if (Notification.permission !== 'granted') return;
  try {
    await subscribeWebPush(userAPI);
  } catch (err) {
    console.warn('[webNotifications] sync failed', err.message);
  }
}

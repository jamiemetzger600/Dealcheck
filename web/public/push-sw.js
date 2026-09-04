/* Push + notificationclick for Vettr PWA / desktop.
 * Loaded via Workbox importScripts in production, or registered directly in Vite dev.
 */
/* eslint-disable no-restricted-globals */

function notificationTargetUrl(data) {
  const path = data?.url || '/dashboard';
  const origin = self.location.origin;
  return path.startsWith('http') ? path : origin + (path.startsWith('/') ? path : `/${path}`);
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: 'Vettr', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Vettr';
  const actionTitle = data.actionTitle || 'Open';
  const options = {
    body: data.body || '',
    tag: data.tag || 'vettr',
    data: { url: data.url || '/dashboard' },
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'open', title: actionTitle },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  console.log('[push-sw] show', { title, url: options.data.url, tag: options.tag });
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const action = event.action || 'open';
  event.notification.close();
  if (action === 'dismiss') return;

  const target = notificationTargetUrl(event.notification.data);
  console.log('[push-sw] notificationclick', { action, target });

  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsArr) {
      if (!client.url.startsWith(self.location.origin) || !('focus' in client)) continue;
      try {
        client.postMessage({ type: 'VETTR_NOTIFICATION_CLICK', url: target });
      } catch (err) {
        console.warn('[push-sw] postMessage failed', err);
      }
      if (typeof client.navigate === 'function') {
        try {
          const navigated = await client.navigate(target);
          if (navigated && 'focus' in navigated) return navigated.focus();
        } catch (err) {
          console.warn('[push-sw] navigate failed', err);
        }
      }
      return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
    return undefined;
  })());
});

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING' && self.skipWaiting) {
    self.skipWaiting();
  }
});

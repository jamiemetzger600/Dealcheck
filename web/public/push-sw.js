/* Push + notificationclick for Vettr PWA / desktop.
 * Loaded via Workbox importScripts in production, or registered directly in Vite dev.
 */
/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: 'Vettr', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Vettr';
  const options = {
    body: data.body || '',
    tag: data.tag || 'vettr',
    data: { url: data.url || '/dashboard' },
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.url || '/dashboard';
  const origin = self.location.origin;
  const target = path.startsWith('http') ? path : origin + (path.startsWith('/') ? path : `/${path}`);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.startsWith(origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(target);
          }
          return undefined;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING' && self.skipWaiting) {
    self.skipWaiting();
  }
});

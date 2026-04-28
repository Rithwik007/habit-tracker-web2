// Service Worker for habit-tracker-web
// Currently handles notification click events
// Ready for future background push notification support

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Look for any open window with our app
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // If we got a URL in the notification data, open that
      const urlToOpen = event.notification.data?.url || '/';
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});

// Handle incoming background push notifications from the server
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/favicon.ico',
        tag: data.tag || 'default-push',
        data: data.data || { url: '/' },
        requireInteraction: false
      };
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (err) {
      console.error('Error parsing push data:', err);
    }
  }
});

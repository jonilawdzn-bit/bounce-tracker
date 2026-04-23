const CACHE_NAME = 'bounce-parking-v1';

// Install service worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'SCHEDULE_NOTIFICATION') {
    const { walkBackMs, endMs } = payload;

    // Schedule walk-back notification
    if (walkBackMs > 0) {
      setTimeout(() => {
        self.registration.showNotification('🚶 Time to Head Back!', {
          body: 'Start walking back to your car now.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'walk-back',
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
      }, walkBackMs);
    }

    // Schedule expired notification
    const expiredMs = endMs - Date.now();
    if (expiredMs > 0) {
      setTimeout(() => {
        self.registration.showNotification('⏰ Parking Meter Expired!', {
          body: 'Your parking meter has run out.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'expired',
          requireInteraction: true,
          vibrate: [300, 100, 300, 100, 300]
        });
      }, expiredMs);
    }
  }

  if (type === 'CANCEL_NOTIFICATIONS') {
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
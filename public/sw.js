const CACHE_NAME = 'bounce-parking-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'SCHEDULE_NOTIFICATION') {
    const { endMs } = payload;
    const now = Date.now();
    const totalMs = endMs - now;

    const headBackMs = totalMs - (10 * 60 * 1000);
    if (headBackMs > 0) {
      setTimeout(() => {
        self.registration.showNotification('🚶 Time to Head Back!', {
          body: 'Start walking back to your car now.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'walk-back',
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
      }, headBackMs);
    }

    const fiveMinMs = totalMs - (5 * 60 * 1000);
    if (fiveMinMs > 0) {
      setTimeout(() => {
        self.registration.showtification('⚠️ 5 Minutes Left!', {
          body: 'Your parkinger is almost up. Head back now!',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'five-min',
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
      }, fiveMinMs);
    }

    if (totalMs > 0) {
      setTimeout(() => {
        self.registration.showNotification('⏰ Parking Meter Expired!', {
          body: 'Your parking meter has run out.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'expired',
          requireInteraction: true,
          vibrate: [300, 100, 300, 100, 300]
        });
      }, totalMs);
    }
  }

  if (type === 'CANCEL_NOTIFICATIONS') {
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});

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

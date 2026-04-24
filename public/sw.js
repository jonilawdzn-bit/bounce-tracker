const CACHE_NAME = 'bounce-parking-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Store scheduled notification times
let scheduledTimers = [];

function clearAllTimers() {
  scheduledTimers.forEach(id => clearTimeout(id));
  scheduledTimers = [];
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'SCHEDULE_NOTIFICATION') {
    clearAllTimers();
    const { endMs } = payload;
    const now = Date.now();
    const totalMs = endMs - now;

    // Notification 1: 10 min before end
    const headBackMs = totalMs - (10 * 60 * 1000);
    if (headBackMs > 0) {
      const id = setTimeout(() => {
        self.registration.showNotification('🚶 Time to Head Back!', {
          body: 'Start walking back to your car now.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'walk-bac,
          requireInteraction: true,
          silent: false
        });
      }, headBackMs);
      scheduledTimers.push(id);
    }

    // Notification 2: 5 min before end
    const fiveMinMs = totalMs - (5 * 60 * 1000);
    if (fiveMinMs > 0) {
      const id = setTimeout(() => {
        self.registration.showNotification('⚠️ 5 Minutes Left!', {
          body: 'Your parking meter is almost up — hurry back!',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'five-min',
          requireInteraction: true,
          silent: false
        });
      }, fiveMinMs);
      scheduledTimers.push(id);
    }

    // Notification 3: at zero
    if (totalMs > 0) {
      const id = setTimeout(() => {
        self.registration.showNotification('⏰ Parking Meter Expired!', {
          body: 'Your parking meter has run out!',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'expired',
          requireInteraction: true,
          silent: false
        });
      }, totalMs);
      scheduledTimers.push(id);
    }
  }

  if (type === 'CANCEL_NOTIFICATIONS') {
    clearAllTimers();
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});

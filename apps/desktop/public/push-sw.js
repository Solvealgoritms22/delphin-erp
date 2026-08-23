self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.titulo || 'Dolphin ERP';
  const options = {
    body: payload.mensaje || 'Tienes una nueva notificación.',
    icon: 'favicon.png',
    data: payload.payload || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/admin/notifications'));
});

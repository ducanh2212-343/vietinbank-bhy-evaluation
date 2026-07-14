// Service worker cho Web Push — nhận thông báo đẩy từ send-reminders và mở đúng trang khi bấm.
// KHÔNG cache tài nguyên (tránh phục vụ bản build cũ) — chỉ phục vụ push notification.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || '343 Phát triển nhân sự';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/vietinbank-favicon.png',
      badge: '/vietinbank-favicon.png',
      // tag: gộp thông báo trùng chủ đề trong ngày (VD nhắc nộp phiếu) thay vì xếp chồng
      tag: data.tag || 'chieuthuc3-reminder',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

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
  const title = data.title || '343 Nội bộ';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/favicon.svg',
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
          // navigate() TỪ CHỐI khi cửa sổ không do service worker này điều khiển — tab
          // mở từ trước khi SW kịp nắm quyền. Trước 12/08 lỗi đó bị nuốt lặng lẽ: cửa sổ
          // vẫn được focus nhưng đứng nguyên trang cũ, nên người dùng bấm thông báo mà
          // như không bấm. Hỏng kiểu này khó tả lại vì tùy máy, tùy lần mở app.
          return client.navigate(url)
            .then((daMo) => (daMo || client).focus())
            .catch(() => self.clients.openWindow(url));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

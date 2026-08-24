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
  const title = data.title || 'BHY ONE';
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

/**
 * Chỉ cho phép đi tới đường dẫn CÙNG MIỀN với cổng BHY ONE.
 *
 * Vì sao phải lọc: `clients.openWindow()` KHÔNG bị giới hạn same-origin như
 * `client.navigate()`. Thân tin push là dữ liệu ngoài (bất cứ ai giành được
 * khoá gửi push, hoặc một bản ghi hàng đợi bị sửa, đều đặt được `data.url`),
 * nên một tin mang danh «BHY ONE» có thể bật thẳng trang lạ — cán bộ thấy
 * thông báo của cơ quan nên tin ngay, đó chính là chỗ mất mật khẩu.
 *
 * Không hợp lệ thì LÙI VỀ '/' chứ không bỏ luôn việc mở cửa sổ: bấm thông báo
 * mà không có gì xảy ra thì cán bộ tưởng ứng dụng hỏng và gọi hỗ trợ.
 */
function duongDanNoiBo(raw) {
  try {
    // base = origin của SW nên đường dẫn tương đối ('/ct2/viec/123') vẫn qua được.
    const u = new URL(raw || '/', self.location.origin);
    return u.origin === self.location.origin ? u.href : '/';
  } catch (_e) {
    // Chỉ chuỗi KHÔNG phân tích được thành URL mới rơi vào đây (vd 'https://[',
    // 'http://:80'). Riêng 'javascript:...' KHÔNG ném lỗi — nó phân tích được,
    // origin ra 'null' nên bị chặn ở dòng so sánh origin phía trên. Đừng bỏ
    // dòng so sánh đó vì tưởng catch này đã lo.
    return '/';
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = duongDanNoiBo(event.notification.data && event.notification.data.url);
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

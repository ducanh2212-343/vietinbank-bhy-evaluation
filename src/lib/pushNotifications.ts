// Web Push phía client: đăng ký service worker, xin quyền, subscribe với VAPID public key
// và lưu đăng ký thiết bị vào bảng push_subscriptions (RLS: mỗi người chỉ sửa của mình).
// Private key tương ứng nằm trong Supabase Vault — send-reminders dùng để ký khi gửi.
import { supabase } from '@/integrations/supabase/client';

// VAPID public key — KHÔNG phải bí mật (được nhúng vào trình duyệt theo chuẩn Web Push).
export const VAPID_PUBLIC_KEY =
  'BB5f9DtRA7ezR7W3vbUkFBHwLIQZ-Xv2sKBSQQo3dmAgouQaKiHk2JoXNTdt8qEIHh5N26DtlhigrQmvKgpWMR8';

export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

// Domain đã ngừng dùng cho push (08/2026: cổng chuyển sang bachungyenone.com).
// KHÔNG đưa workers.dev vào đây — đó là đường lui khẩn cấp, đường lui thì phải
// còn nhận được thông báo.
const DOMAIN_CU = ['chieuthuc3.com', 'www.chieuthuc3.com'];

/** Trang đang chạy trên domain cũ? (tách tham số để test được không cần window) */
export function laDomainCu(hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''): boolean {
  return DOMAIN_CU.includes(hostname);
}

/**
 * Tự dọn đăng ký push của CHÍNH THIẾT BỊ NÀY khi app chạy trên domain cũ.
 *
 * Vì sao: đăng ký push gắn theo origin. Cán bộ bật lại thông báo ở
 * bachungyenone.com thì máy chủ thấy HAI đăng ký của cùng một máy mà không có
 * cách nào biết chúng là một — mỗi tin bắn ra hai thông báo trùng nhau trên
 * màn hình khóa (sự cố sáng 21/08). Chỉ thiết bị mới biết endpoint cũ của
 * chính nó, nên việc dọn phải làm ở client: hủy đăng ký trình duyệt rồi tắt
 * dòng tương ứng trong DB (khớp endpoint — chính xác từng thiết bị, không đụng
 * máy khác của cùng người).
 */
export async function donDangKyDomainCu(): Promise<void> {
  try {
    if (!laDomainCu() || !isPushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    // Tắt trong DB ngay để đợt phát kế tiếp không gửi vào endpoint vừa hủy
    // (không chờ máy chủ tự phát hiện 410). RLS chỉ cho sửa dòng của mình.
    await (supabase as any)
      .from('push_subscriptions')
      .update({ is_active: false, loi_cuoi: 'thiết bị đã chuyển sang bachungyenone.com', loi_luc: new Date().toISOString() })
      .eq('endpoint', endpoint);
  } catch (_e) {
    // best-effort — máy chủ vẫn tự dọn qua mã 410 ở lần gửi sau
  }
}

/** iOS chỉ cho phép Web Push khi chạy như PWA (đã Thêm vào màn hình chính). */
export function isIosNeedingHomeScreen(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const standalone = (navigator as any).standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
  return isIos && !standalone;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

/** Trạng thái hiện tại: đã bật thông báo trên thiết bị này chưa. */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

/**
 * Bật thông báo cho thiết bị này: xin quyền → subscribe → lưu DB.
 * Trả về thông báo lỗi tiếng Việt nếu không thành công, null nếu OK.
 */
export async function enablePush(profileId: string): Promise<string | null> {
  if (laDomainCu()) {
    return 'Địa chỉ này đã chuyển về bachungyenone.com — vui lòng mở địa chỉ mới rồi bật thông báo tại đó.';
  }
  if (!isPushSupported()) return 'Trình duyệt này không hỗ trợ thông báo đẩy.';
  if (isIosNeedingHomeScreen()) {
    return 'Trên iPhone/iPad: hãy mở app từ biểu tượng đã Thêm vào màn hình chính rồi bật lại.';
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return 'Bạn chưa cho phép thông báo. Có thể bật lại trong cài đặt trình duyệt.';
  }
  const reg = await getRegistration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return 'Không lấy được thông tin đăng ký thiết bị.';
  }
  // Bảng mới chưa có trong types sinh tự động → cast any (regenerate types sẽ gỡ được)
  const { error } = await (supabase as any).from('push_subscriptions').upsert(
    {
      profile_id: profileId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 250),
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );
  if (error) return `Không lưu được đăng ký: ${error.message}`;
  return null;
}

/** Gọi khi app khởi động: nếu đã cấp quyền từ trước thì lặng lẽ làm mới đăng ký trong DB. */
export async function refreshPushSubscription(profileId: string): Promise<void> {
  try {
    if (!isPushSupported() || Notification.permission !== 'granted') return;
    if (isIosNeedingHomeScreen()) return;
    await enablePush(profileId);
  } catch (_e) {
    // im lặng — làm mới đăng ký là best-effort
  }
}

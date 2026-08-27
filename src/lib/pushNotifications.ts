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

// Mốc gắn domain mới vào Worker (sáng 20/08 giờ VN). Đăng ký sinh TRƯỚC mốc này
// chắc chắn thuộc thời chieuthuc3.com — dùng để giết đúng "người anh em song sinh"
// cũ của một thiết bị vừa đăng ký lại, không đụng đăng ký mới nào khác.
const MOC_CHUYEN_DOMAIN = '2026-08-20T03:00:00Z';

/**
 * Làm mới / phục hồi đăng ký khi app chạy trên DOMAIN CŨ.
 *
 * Bài học 21/08 — bản đầu tiên làm NGƯỢC LẠI (cứ mở domain cũ là tự gỡ đăng ký
 * của thiết bị): chỉ trong một giờ sáng, 19 thiết bị của cán bộ CHƯA HỀ chuyển
 * sang domain mới bị gỡ mất kênh nhắc việc. Mất thông báo trong im lặng nguy
 * hiểm hơn thông báo đúp rất nhiều, nên ở domain cũ tuyệt đối không chủ động
 * gỡ gì nữa. Việc chống đúp chuyển sang enablePush ở domain MỚI.
 *
 * Ở đây chỉ còn hai việc an toàn:
 *   1. Đăng ký đang sống → làm tươi updated_at. KHÔNG upsert: upsert dựng lại
 *      is_active=true và sẽ hồi sinh dòng đã bị tắt vì trùng — đường tái sinh
 *      tin đúp kín đáo nhất.
 *   2. Đã được cấp quyền mà không còn đăng ký trình duyệt → đây là thiết bị bị
 *      bản 21/08 dọn nhầm: lặng lẽ đăng ký lại để trả kênh nhắc việc cho họ.
 *      Chỉ phục hồi khi thiết bị này (profile + user_agent) không còn dòng sống
 *      nào khác — nếu còn nghĩa là họ đã sang domain mới, phục hồi là tạo đúp.
 */
export async function lamMoiTaiDomainCu(profileId: string): Promise<void> {
  try {
    if (!laDomainCu() || !isPushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await (supabase as any)
        .from('push_subscriptions')
        .update({ updated_at: new Date().toISOString() })
        .eq('endpoint', sub.endpoint)
        .eq('is_active', true);
      return;
    }
    if (Notification.permission !== 'granted' || isIosNeedingHomeScreen()) return;
    const { data: conSong } = await (supabase as any)
      .from('push_subscriptions')
      .select('id')
      .eq('profile_id', profileId)
      .eq('user_agent', navigator.userAgent.slice(0, 250))
      .eq('is_active', true)
      .limit(1);
    if (conSong && conSong.length > 0) return;
    await dangKyVaLuu(profileId);
  } catch (_e) {
    // best-effort — không được làm hỏng phiên làm việc vì chuyện đăng ký push
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
    return 'Cổng đã chuyển về bachungyenone.com — vui lòng mở địa chỉ mới rồi bật thông báo tại đó.';
  }
  if (!isPushSupported()) return 'Trình duyệt này không hỗ trợ thông báo đẩy.';
  if (isIosNeedingHomeScreen()) {
    return 'Trên iPhone/iPad: hãy mở app từ biểu tượng đã Thêm vào màn hình chính rồi bật lại.';
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return 'Bạn chưa cho phép thông báo. Có thể bật lại trong cài đặt trình duyệt.';
  }
  const loi = await dangKyVaLuu(profileId);
  if (loi) return loi;
  // Giết "người anh em song sinh" thời domain cũ của CHÍNH thiết bị này (khớp
  // profile + user_agent, chỉ dòng sinh trước mốc chuyển domain): đây là chỗ duy
  // nhất tin đúp ra đời, nên chặn tại đây thay vì đụng vào đăng ký của những
  // người chưa chuyển. Thiết bị khác của cùng người (user_agent khác) giữ nguyên.
  await (supabase as any)
    .from('push_subscriptions')
    .update({
      is_active: false,
      loi_cuoi: 'trùng thiết bị — đã đăng ký lại tại bachungyenone.com',
      loi_luc: new Date().toISOString(),
    })
    .eq('profile_id', profileId)
    .eq('user_agent', navigator.userAgent.slice(0, 250))
    .eq('is_active', true)
    .lt('created_at', MOC_CHUYEN_DOMAIN)
    .neq('endpoint', (await (await getRegistration()).pushManager.getSubscription())?.endpoint ?? '');
  return null;
}

/** Subscribe trình duyệt + lưu DB — phần chung của bật thủ công và phục hồi. */
async function dangKyVaLuu(profileId: string): Promise<string | null> {
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
    if (laDomainCu()) {
      await lamMoiTaiDomainCu(profileId);
      return;
    }
    if (!isPushSupported() || Notification.permission !== 'granted') return;
    if (isIosNeedingHomeScreen()) return;
    await enablePush(profileId);
  } catch (_e) {
    // im lặng — làm mới đăng ký là best-effort
  }
}

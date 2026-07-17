// Nguồn chung cho cơ chế tự đăng xuất khi không hoạt động (idle logout).
// Mốc "hoạt động cuối" lưu ở localStorage để nhiều tab dùng chung VÀ để phát hiện
// khoảng thời gian app bị đóng — không chỉ khi tab mở liên tục.
export const LAST_ACTIVITY_KEY = '343skill:last-activity';
export const IDLE_LIMIT_MS = 60 * 60 * 1000; // 60 phút

/** Ghi lại thời điểm hoạt động = bây giờ. */
export function markActivity(now: number = Date.now()) {
  try { localStorage.setItem(LAST_ACTIVITY_KEY, String(now)); } catch { /* localStorage bị chặn */ }
}

/** Xoá mốc hoạt động — gọi khi đăng xuất để lần đăng nhập sau bắt đầu sạch. */
export function clearActivity() {
  try { localStorage.removeItem(LAST_ACTIVITY_KEY); } catch { /* noop */ }
}

/**
 * Đã quá hạn không hoạt động chưa?
 * Trả về false khi CHƯA có mốc nào (phiên mới, không suy ra được đã vắng bao lâu).
 */
export function isIdleExpired(now: number = Date.now()): boolean {
  let raw: string | null = null;
  try { raw = localStorage.getItem(LAST_ACTIVITY_KEY); } catch { return false; }
  if (!raw) return false;
  const last = Number(raw);
  if (!Number.isFinite(last)) return false;
  return now - last >= IDLE_LIMIT_MS;
}

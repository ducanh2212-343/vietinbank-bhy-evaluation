// Thông báo lỗi thân thiện khi gọi Edge Function qua supabase.functions.invoke.
// Khi phiên đăng nhập hết hạn, gateway trả HTTP 401 và supabase-js chỉ báo chung chung
// "Edge Function returned a non-2xx status code". Nhận diện 401 để hướng dẫn người dùng
// đăng nhập lại thay vì hiện lỗi kỹ thuật khó hiểu.

export const SESSION_EXPIRED_MESSAGE =
  'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử lại.';

// supabase-js đính kèm Response gốc vào error.context; 401 = token hết hạn/không hợp lệ.
export function isSessionExpiredError(e: unknown): boolean {
  const status = (e as { context?: { status?: number } } | null | undefined)?.context?.status;
  return status === 401;
}

// Trả về câu thông báo phù hợp: hết phiên → hướng dẫn đăng nhập lại; còn lại → kèm prefix.
export function invokeErrorMessage(e: unknown, fallbackPrefix: string): string {
  if (isSessionExpiredError(e)) return SESSION_EXPIRED_MESSAGE;
  return `${fallbackPrefix}: ${e instanceof Error ? e.message : String(e)}`;
}

/**
 * Dịch lỗi của màn «Quản trị tài khoản khách» sang câu người quản trị làm được gì.
 *
 * Ca thật 18/08: màn hình đã lên bản mới nhưng edge function trên Supabase vẫn
 * là bản cũ (bắt buộc email) — người dùng chỉ thấy "Email không hợp lệ" trong
 * khi màn hình còn chẳng có ô email nào, không đoán nổi phải làm gì.
 */
export function dienGiaiLoiKhach(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/email/i.test(msg) && /hợp lệ|invalid/i.test(msg)) {
    return `${msg} — nhiều khả năng edge function «create-guest-user» trên máy chủ còn là bản cũ (bản cũ bắt buộc email). Cần deploy lại bản mới.`;
  }
  if (/allowed_screens/i.test(msg)) {
    return `${msg} — cơ sở dữ liệu chưa có cột «allowed_screens». Cần áp migration 20260927090000_man_hinh_mo_cho_khach.sql.`;
  }
  if (/Failed to send a request|fetch/i.test(msg)) {
    return `${msg} — không gọi được máy chủ. Kiểm tra kết nối mạng rồi thử lại.`;
  }
  return msg;
}

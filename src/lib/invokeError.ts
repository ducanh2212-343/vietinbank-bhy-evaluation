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

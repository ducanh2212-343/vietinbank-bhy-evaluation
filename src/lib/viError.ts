/**
 * Dịch thông báo lỗi kỹ thuật (Postgres/Supabase/mạng) sang tiếng Việt dễ hiểu
 * cho toast. Lỗi không nhận diện được thì giữ nguyên nội dung gốc kèm tiền tố.
 */
export function viErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err ?? '');
  const m = raw.toLowerCase();

  if (m.includes('row-level security'))
    return 'Bạn không có quyền ghi dữ liệu này (chính sách phân quyền). Nếu bạn đúng là người được giao duyệt phiếu, hãy báo quản trị viên kiểm tra phân quyền.';
  if (m.includes('permission denied'))
    return 'Bạn không có quyền thực hiện thao tác này.';
  if (m.includes('jwt') || m.includes('refresh token') || m.includes('invalid token'))
    return 'Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại.';
  if (m.includes('duplicate key'))
    return 'Dữ liệu bị trùng — bản ghi này đã tồn tại.';
  if (m.includes('foreign key'))
    return 'Dữ liệu tham chiếu không hợp lệ (bản ghi liên quan có thể đã bị xóa). Tải lại trang rồi thử lại.';
  if (m.includes('null value') || m.includes('not-null'))
    return 'Thiếu thông tin bắt buộc — kiểm tra lại các ô chưa điền.';
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed'))
    return 'Lỗi kết nối mạng — kiểm tra Internet rồi thử lại.';
  if (m.includes('timeout') || m.includes('timed out'))
    return 'Hệ thống phản hồi chậm — vui lòng thử lại.';
  if (m.includes('429') || m.includes('too many requests'))
    return 'Thao tác quá dồn dập — vui lòng đợi một lát rồi thử lại.';

  return raw ? `Lỗi hệ thống: ${raw}` : 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
}

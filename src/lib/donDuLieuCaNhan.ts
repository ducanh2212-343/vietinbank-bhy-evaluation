import { clearQuickNoteDraft } from './hanhVi';

/**
 * DỌN DẤU VẾT CÁ NHÂN TRÊN MÁY KHI ĐĂNG XUẤT.
 *
 * VÌ SAO CẦN: nhiều máy ở chi nhánh là máy DÙNG CHUNG. Trước đây signOut chỉ xoá đúng
 * một khoá (mốc hoạt động), nên người ngồi sau vẫn đọc được của người trước:
 *   · bản nháp ghi chú hành vi — chứa nhận xét về một đồng nghiệp CÓ TÊN,
 *   · bản phác chân dung năng lực do AI viết cho từng phiếu đánh giá,
 *   · toàn bộ tệp PDF kỷ yếu đã tải (ảnh tập thể, ghi chú nội bộ).
 * Token phiên thì supabase-js tự xoá, nhưng ba thứ trên nằm ngoài tầm nó.
 *
 * VÌ SAO KHÔNG XOÁ SẠCH localStorage: các khoá còn lại là tuỳ chọn giao diện
 * (sáng/tối, thư mục đang mở, đã xem mục phiên bản nào, âm thanh kỷ yếu) — xoá luôn
 * thì mỗi lần đăng nhập lại cán bộ phải chỉnh lại từ đầu, gây khó chịu mà không
 * được thêm chút an toàn nào. Chỉ nhắm đúng thứ mang dữ liệu con người.
 *
 * Mọi thao tác bọc try/catch riêng: chế độ riêng tư của trình duyệt chặn localStorage,
 * và một lỗi ở bước dọn TUYỆT ĐỐI không được làm hỏng việc đăng xuất.
 */

/** Tiền tố khoá cache chân dung năng lực AI (một khoá cho mỗi phiếu đánh giá). */
export const TIEN_TO_CHAN_DUNG_AI = 'ai-portrait-';

/** Tên kho IndexedDB chứa PDF kỷ yếu đã tải (giữ trùng với src/lib/ky-yeu/pdfCache.ts). */
export const TEN_DB_KY_YEU = 'bhyone-ky-yeu';

export function donDuLieuCaNhanTrenMay(): void {
  // 1) Bản nháp ghi chú hành vi về đồng nghiệp
  try {
    clearQuickNoteDraft();
  } catch { /* localStorage bị chặn */ }

  // 2) Mọi bản phác chân dung năng lực AI (số lượng thay đổi theo số phiếu đã mở)
  try {
    const canXoa: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const khoa = localStorage.key(i);
      if (khoa && khoa.startsWith(TIEN_TO_CHAN_DUNG_AI)) canXoa.push(khoa);
    }
    // Gom danh sách rồi mới xoá: xoá ngay trong vòng lặp làm chỉ số dồn lên và bỏ sót khoá.
    canXoa.forEach((khoa) => localStorage.removeItem(khoa));
  } catch { /* localStorage bị chặn */ }

  // 3) PDF kỷ yếu đã tải về máy
  try {
    indexedDB.deleteDatabase(TEN_DB_KY_YEU);
  } catch { /* trình duyệt chặn IndexedDB */ }
}

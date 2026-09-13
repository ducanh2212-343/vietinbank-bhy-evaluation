/**
 * TRAINING CENTER TOOLKIT — bộ công cụ trực quan gắn với từng đầu việc
 * (Giám đốc 13/09/2026: «như phần mềm tạo mindmap trực quan, có màu sắc…
 * học viên ấn nút dùng Training Center Toolkit sau đó chọn mindmap… thêm toolkit
 * mô hình 4 hộp (các trục có thể tuỳ chọn), thêm công cụ vẽ hình… dùng bút vẽ»).
 *
 * Ba công cụ, một bảng: mỗi bản vẽ là một dòng ttc_toolkit gắn với (đầu việc,
 * người). Dữ liệu là jsonb tự mô tả — mỗi công cụ có mô-đun riêng đọc/ghi khuôn
 * của mình, index này chỉ giữ phần chung để hộp thoại và hook không phải biết
 * ruột từng công cụ.
 */

export type ToolkitLoai = 'MINDMAP' | 'BON_HOP' | 'VE_TAY';

export const TOOLKIT_LOAI: Array<{ ma: ToolkitLoai; ten: string; moTa: string }> = [
  { ma: 'MINDMAP', ten: 'Sơ đồ tư duy', moTa: 'Ý chính ở giữa, nhánh toả ra hai bên, mỗi nhánh một màu. Gõ Tab để thêm ý con.' },
  { ma: 'BON_HOP', ten: 'Mô hình 4 hộp', moTa: 'Hai trục tự đặt tên, bốn ô, kéo từng thẻ việc vào đúng ô. Có sẵn mẫu Quan trọng – Khẩn cấp.' },
  { ma: 'VE_TAY', ten: 'Bảng vẽ tay', moTa: 'Vẽ tự do bằng bút cảm ứng hoặc chuột: sơ đồ, hình, ghi chú nhanh.' },
];

export interface TtcToolkit {
  id: string;
  dau_viec_id: string;
  nguoi: string;
  loai: ToolkitLoai;
  tieu_de: string;
  du_lieu: unknown;
  /** Đường dẫn ảnh PNG xem trước trong kho bhy-training, null khi chưa xuất */
  anh_xem_truoc: string | null;
  created_at: string;
  updated_at: string;
}

/** Trần 512 KB cho jsonb một bản vẽ — trùng ràng buộc máy chủ (f_ttc_toolkit_truoc_ghi) */
export const TOOLKIT_DU_LIEU_TOI_DA = 512 * 1024;

/** Kích thước jsonb sẽ ghi, tính bằng byte UTF-8 — để chặn từ phía client trước khi máy chủ từ chối */
export function kichThuocJson(x: unknown): number {
  return new TextEncoder().encode(JSON.stringify(x)).length;
}

/** id ngắn cho nút/thẻ/nét — không cần uuid, chỉ cần không trùng trong một bản vẽ */
export function idNgan(): string {
  return Math.random().toString(36).slice(2, 10);
}

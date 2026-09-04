// Đường nhập dữ liệu Sao bằng file Excel đã DỪNG HẲN (quyết định 04/09/2026).
//
// Lịch sử: đường này là `replaceAll` — XÓA SẠCH bảng star_records rồi ghi lại từ
// bản kết xuất Lark. Nó đã ba lần phá dữ liệu (21/08, 28/08, 03/09): mỗi lần đều
// làm đứt liên kết sổ sao ↔ phiếu (khóa ngoại `on delete set null`) và xóa luôn
// các bản sửa dữ liệu trước đó — lần 03/09 trả tên "PGD Ocean City" về lại
// "Phòng Yên Mỹ" cho 16 phiếu.
//
// Từ nay mọi phiếu chỉ vào bằng màn Ghi nhận Sao trên cổng, nơi số serial được
// chọn từ sổ và bị khóa trong cùng một giao dịch nên không thể trùng.
//
// KHÓA THẬT NẰM Ở TẦNG CSDL, không phải ở đây: migration
// `20260904120000_dung_han_duong_nhap_excel_sao` đã bỏ policy ALL của quản trị
// trên star_records, chỉ còn quyền đọc — mọi thao tác ghi đi qua RPC security
// definer. Cờ dưới đây chỉ để giao diện không mời người dùng vào cửa đã xây kín.
export const STAR_WRITE_LOCKED: boolean = true;

/** Câu giải thích hiển thị trên giao diện */
export const STAR_WRITE_LOCK_REASON =
  'Đường nhập dữ liệu Sao bằng file Excel đã dừng. Mọi phiếu ghi nhận nay đi qua '
  + 'màn «Ghi nhận Sao» trên cổng — số serial chọn từ sổ sao và được khóa ngay khi ghi.';

/** Câu báo khi có thao tác ghi bị chặn (dùng cho toast) */
export const STAR_WRITE_LOCK_TOAST =
  'Đường nhập/xóa phiếu Sao bằng Excel đã dừng — ghi nhận Sao trên cổng.';

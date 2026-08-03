// Khóa tạm thời đường ghi dữ liệu Sao Xứng Đáng trên cổng.
//
// Lý do khóa (08/2026): đợt rà soát dữ liệu phát hiện bảng star_records có phiếu
// nhập lặp và số serial bị dùng lại (xem docs/ra-soat-du-lieu-sao.md). Toàn bộ
// đường ghi hiện nay đi qua replaceAll — XÓA SẠCH bảng rồi ghi lại từ file Excel
// kết xuất tay. Chừng nào chưa chốt được bản dữ liệu gốc đã làm sạch, mỗi lần
// nhập đè lên là một lần chồng thêm sai số và xóa mất bản đang có để đối chiếu.
//
// Khóa này CHỈ chặn ghi/xóa. Toàn bộ phần xem, thống kê, xuất Excel đối soát vẫn
// chạy bình thường — đây là thứ Phòng TCTH đang cần để rà soát.
//
// Mở lại: đổi STAR_WRITE_LOCKED thành false. Không cần sửa chỗ nào khác.
// Kiểu khai báo là boolean (không để TS suy ra literal `true`), nếu không nhánh
// sau lệnh chặn trong useStarRecords sẽ bị coi là code không bao giờ chạy tới.
export const STAR_WRITE_LOCKED: boolean = true;

/** Câu giải thích hiển thị trên giao diện khi khóa đang bật. */
export const STAR_WRITE_LOCK_REASON =
  'Đang tạm khóa để rà soát dữ liệu. Chức năng nhập file và xóa phiếu sẽ mở lại sau khi chốt bản dữ liệu gốc đã làm sạch.';

/** Câu báo khi có thao tác ghi bị chặn (dùng cho toast). */
export const STAR_WRITE_LOCK_TOAST =
  'Chức năng nhập/xóa phiếu Sao đang tạm khóa để rà soát dữ liệu.';

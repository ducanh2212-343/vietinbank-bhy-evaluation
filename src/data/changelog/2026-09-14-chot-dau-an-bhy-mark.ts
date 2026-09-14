import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-14-chot-dau-an-bhy-mark',
  ngay: '2026-09-14',
  loai: 'tinh-nang',
  phanHe: 'chieu-thuc-2',
  tieuDe: 'Dấu ấn BHY Mark: Giám đốc chốt dấu ấn, PGĐ nộp STAR đầy đủ để kết kỳ',
  tomTat:
    'Trước đây khung STAR của dấu ấn là tùy chọn, cuối kỳ nhiều dấu ấn khép lại mà STAR còn '
    + 'trống. Nay Giám đốc bấm «Chốt dấu ấn» (từng dấu ấn hoặc cả kỳ của một PGĐ), PGĐ phải '
    + 'nộp đủ năm phần Bối cảnh, Nhiệm vụ, Hành động, Kết quả, Sản phẩm để lại rồi dấu ấn mới '
    + 'ẩn khỏi kỳ hiện hành, nhường chỗ cho kỳ mới dự kiến tới hạn 31/10/2026.',
  diemChinh: [
    'Giám đốc có nút «Chốt dấu ấn» trên từng dấu ấn và «Chốt cả kỳ» trên từng PGĐ; chốt nhầm thì «Rút lệnh chốt».',
    'Dấu ấn đã chốt hiện khung vàng, PGĐ thấy ngay nút «Nộp STAR để chốt»; nhịp tuần dừng lại, việc còn lại là viết STAR.',
    'Năm phần STAR bắt buộc, mỗi phần tối thiểu 50 ký tự, có đếm ký tự và báo đỏ phần còn thiếu; được «Lưu nháp» rồi quay lại.',
    'Nộp xong dấu ấn rời danh sách kỳ này, thẻ Kanban tự lưu trữ; mục gập «Dấu ấn đã chốt» vẫn xem lại được toàn bộ STAR.',
    'Thêm dấu ấn mới mặc định hạn 31/10/2026 cho kỳ kế tiếp.',
  ],
  duongDan: '/dau-an',
  danhCho: ['system_admin', 'tcth_admin', 'bgd', 'pgd'],
};

export default muc;

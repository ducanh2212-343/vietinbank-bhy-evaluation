import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-04-thong-bao-sao-va-sao-cua-thang',
  ngay: '2026-09-04',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Được tặng Sao là có thông báo ngay, kèm mốc quà còn thiếu mấy Sao',
  tomTat:
    'Trước đây cán bộ được tặng Sao mà không hay biết, phải tự mở bảng tổng hợp mới '
    + 'thấy. Nay có thông báo ngay khi được ghi nhận, cả chi nhánh đọc bản tin Sao '
    + 'cuối mỗi ngày làm việc, và trang chủ có bảng Sao của tháng.',
  diemChinh: [
    'Được tặng Sao là nhận thông báo ngay: ai tặng, vì việc gì, tổng Sao của bạn.',
    'Thông báo nói luôn còn mấy Sao nữa là chạm mốc quà kế tiếp và quà đó là gì.',
    'Cuối mỗi ngày làm việc, cả chi nhánh nhận một bản tin gộp danh sách người được tặng Sao hôm nay.',
    'Trang chủ có bảng «Sao của tháng» nằm gọn trong thẻ Sao sẵn có, không đẩy khối khác xuống.',
  ],
  duongDan: '/one/ghi-nhan/tong-hop',
  danhCho: ['system_admin', 'tcth_admin', 'bgd', 'pgd', 'manager', 'staff'],
};

export default muc;

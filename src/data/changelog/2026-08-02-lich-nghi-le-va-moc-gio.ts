import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-02-lich-nghi-le-va-moc-gio',
  ngay: '2026-08-02',
  loai: 'tinh-nang',
  phanHe: 'user-admin',
  tieuDe: 'Lịch nghỉ lễ Chi nhánh và mốc giờ nhịp gom về một chỗ',
  tomTat:
    'Mọi phép đếm ngày làm việc của hệ thống — tuổi thẻ Kanban, tuổi hồ sơ tín dụng, số ngày im lặng, '
    + 'giờ phát thông báo — đọc chung từ màn hình Cài đặt ngày giờ.',
  diemChinh: [
    'Khai báo ngày nghỉ lễ, ngày làm bù một lần, cả hệ thống đếm theo',
    'Đặt mốc giờ ghi nhịp buổi sáng và ngưỡng cảnh báo ngay trên màn hình',
    'Nhắc quản trị trước 10 ngày khi tới đợt nghỉ chưa khai báo',
  ],
  duongDan: '/lich-nghi-le',
  danhCho: ['system_admin', 'tcth_admin', 'bgd'],
  pr: 87,
};

export default muc;

import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-18-tai-khoan-khach-khong-can-email',
  ngay: '2026-08-18',
  loai: 'tinh-nang',
  phanHe: 'user-admin',
  tieuDe: 'Cấp tài khoản khách đối tác chỉ cần tên công ty, chọn màn hình từng khách',
  tomTat:
    'Không phải xin email của đối tác nữa: gõ tên công ty là hệ thống tự suy ra tên đăng nhập. '
    + 'Mỗi tài khoản khách được tick riêng những màn hình được vào.',
  diemChinh: [
    'Cấp tài khoản khách chỉ với tên công ty và hạn truy cập',
    'Tick riêng 9 màn hình mở cho từng khách — mở thêm cho một đối tác không còn là mở cho tất cả',
    'Cấp lại mật khẩu tạm ngay trên bảng danh sách',
    'Lỗi máy chủ nói thẳng ra việc phải làm thay vì báo «Email không hợp lệ»',
  ],
  duongDan: '/quan-tri-khach',
  danhCho: ['system_admin', 'tcth_admin', 'bgd'],
  pr: 126,
};

export default muc;

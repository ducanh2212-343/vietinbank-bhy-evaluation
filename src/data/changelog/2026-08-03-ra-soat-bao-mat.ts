import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-03-ra-soat-bao-mat',
  ngay: '2026-08-03',
  loai: 'sua-loi',
  phanHe: 'nen-tang',
  tieuDe: 'Rà soát bảo mật: vá leo thang quyền, chặn mã độc trong ô minh chứng',
  tomTat:
    'Đợt rà soát bảo mật toàn cổng: bịt đường một tài khoản thường tự nâng quyền quản trị, '
    + 'lọc nội dung dán vào ô minh chứng và bổ sung các lớp bảo vệ ở tầng máy chủ.',
  diemChinh: [
    'Không còn đường tự nâng quyền quản trị từ tài khoản thường',
    'Ô minh chứng lọc mã lạ dán vào',
    'Người chưa đăng nhập không ghi được gì vào hệ thống',
  ],
  pr: 91,
};

export default muc;

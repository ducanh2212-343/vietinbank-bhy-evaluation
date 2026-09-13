import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-11-o-kiem-bao-mat-tu-lay-ma-moi-khi-het-han',
  ngay: '2026-09-11',
  loai: 'sua-loi',
  phanHe: 'nen-tang',
  tieuDe: 'Hết «Xác minh thất bại» khi mở trang đăng nhập để lâu rồi mới bấm',
  tomTat:
    'Ô kiểm bảo mật ở trang đăng nhập cấp một mã chỉ dùng được trong 5 phút. '
    + 'Ai mở trang rồi đi việc khác, hoặc điện thoại nhảy giữa wifi và 5G, quay lại '
    + 'bấm là gặp «Xác minh thất bại» và không vào được dù mật khẩu đúng. '
    + 'Nay ô tự lấy mã mới, cán bộ không phải làm gì thêm.',
  diemChinh: [
    'Mã hết hạn thì ô tự xin mã mới trong khoảng một giây, không cần tải lại trang.',
    'Ô hỏng thật (mất mạng, sai cấu hình) vẫn mở nút Đăng nhập như trước, không khoá cửa ai.',
  ],
  duongDan: '/dang-nhap',
};

export default muc;

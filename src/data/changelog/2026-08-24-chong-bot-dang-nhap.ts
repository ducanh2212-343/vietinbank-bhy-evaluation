import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-24-chong-bot-dang-nhap',
  ngay: '2026-08-24',
  loai: 'tinh-nang',
  phanHe: 'nen-tang',
  tieuDe: 'Cửa đăng nhập có lớp chắn máy dò mật khẩu, cán bộ không phải làm thêm gì',
  tomTat:
    'Trang đăng nhập, quên mật khẩu và đổi mật khẩu nay có một lớp kiểm "không phải máy" chạy ngầm. '
    + 'Lớp này thay cho cách bắt chọn ô ảnh vốn vừa làm phiền người thật vừa đã bị máy giải được, '
    + 'nên hầu hết cán bộ chỉ thấy một dấu tích tự động rồi vào như thường.',
  diemChinh: [
    'Đăng nhập như mọi ngày: lớp kiểm chạy ngầm, không bắt chọn ô ảnh hay gõ chữ méo',
    'Máy tự động dò mật khẩu hàng loạt bị chặn ngay ở cửa, trước khi chạm tới tài khoản',
    'Gõ sai mật khẩu thì lớp kiểm tự làm mới — cứ nhập lại bình thường, không phải tải lại trang',
    'Ảnh đại diện chỉ nhận đúng tệp ảnh (JPG, PNG, WEBP, GIF, ảnh iPhone), tối đa 4MB',
    'Đăng xuất nay xoá luôn ghi chú nháp và tài liệu đã tải trên máy — an tâm khi dùng máy chung',
  ],
};

export default muc;

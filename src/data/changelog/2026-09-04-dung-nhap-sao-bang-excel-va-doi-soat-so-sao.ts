import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-04-dung-nhap-sao-bang-excel-va-doi-soat-so-sao',
  ngay: '2026-09-04',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Sao chỉ còn ghi nhận trên cổng; Phòng TCTH có nút đối soát sổ sao',
  tomTat:
    'Đường cập nhật sao bằng file Excel đã dừng. Cách làm cũ là xóa sạch bảng rồi '
    + 'ghi lại nên mỗi lần nhập là một lần mất liên kết giữa số serial và phiếu — '
    + 'đã xảy ra ba lần trong tháng 8. Nay mọi phiếu vào bằng màn Ghi nhận Sao, và '
    + 'Phòng TCTH có nút tự kiểm tra sổ sao khớp phiếu hay chưa.',
  diemChinh: [
    'Ghi nhận Sao chỉ còn một đường duy nhất: màn Ghi nhận Sao trên cổng.',
    'Số serial được khóa ngay khi ghi nên không thể trùng, và luôn gắn với đúng phiếu.',
    'Phòng TCTH có nút «Đối soát sổ sao với phiếu»: xem trước rồi mới nối lại.',
    'Gỡ phiếu ghi nhầm được cho mọi phiếu, số sao tự quay về nơi đang giữ.',
  ],
  duongDan: '/one/ghi-nhan/quan-ly',
  danhCho: ['system_admin', 'tcth_admin', 'bgd'],
};

export default muc;

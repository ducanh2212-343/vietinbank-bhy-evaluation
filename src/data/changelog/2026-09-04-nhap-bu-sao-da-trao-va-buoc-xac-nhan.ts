import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-04-nhap-bu-sao-da-trao-va-buoc-xac-nhan',
  ngay: '2026-09-04',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Nhập bù được sao đã trao, và phải xem lại phiếu trước khi ghi',
  tomTat:
    'Đường cập nhật sao bằng file Excel vừa dừng, nhưng chi nhánh vẫn phát sao thật '
    + 'ngoài đời — sáu phiếu đã trao mà cổng chưa có. Phòng TCTH nay nhập bù được '
    + 'những phiếu đó, và mọi phiếu ghi nhận đều đi qua một bảng xem lại trước khi '
    + 'chốt, để không ghi nhầm người hay nhầm số sao.',
  diemChinh: [
    'Phòng TCTH có thêm cách ghi «Nhập bù sao đã trao»: gõ số Sao trên phiếu giấy, chọn người đã tặng.',
    'Mỗi số gõ vào được soi ngay: số đã gắn phiếu khác, số hỏng hay số chưa khai báo đều báo đỏ tại chỗ.',
    'Mọi cách ghi nhận đều hiện bảng xem lại — người nhận, người tặng, ngày trao, số Sao — rồi mới ghi.',
    'Ngày trao không chọn được ngày ở tương lai; các trường bắt buộc có dấu sao đỏ.',
    'Phiếu chép lại từ mẫu cũ không bắt buộc vế «đem lại», vì mẫu Lark cũ không có ô này.',
  ],
  duongDan: '/one/ghi-nhan/tang-sao',
  danhCho: ['system_admin', 'tcth_admin', 'bgd', 'pgd', 'manager'],
};

export default muc;

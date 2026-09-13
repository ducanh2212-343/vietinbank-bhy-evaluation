import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-13-vcard-tach-qr-offline-va-mau-anh-in',
  ngay: '2026-09-13',
  loai: 'tinh-nang',
  phanHe: 'hr-343',
  tieuDe: 'Danh thiếp: tách QR offline và danh thiếp online, thêm bốn mẫu ảnh để in',
  tomTat:
    'Màn «Danh thiếp VCard của tôi» tách thành hai tab: «QR offline — quét là lưu» cho hội '
    + 'trường đông người, sóng yếu, khách có tuổi; «Danh thiếp online» cho khách cao cấp và '
    + 'khách nước ngoài. Tên trong mã offline nay gõ tự do, không còn ép tiền tố. Ảnh tải về '
    + 'có bốn mẫu: mã trần, mã có thương hiệu Chi nhánh, name card một mặt, biển để bàn — '
    + 'mẫu nào cũng vẽ mã đủ lớn để camera điện thoại quét được.',
  diemChinh: [
    'Hai tab tách hẳn, tab đầu là QR offline vì đó là thứ cán bộ dùng nhiều nhất khi đi huy động vốn đền bù.',
    'Tên hiện trong danh bạ khách gõ tự do; «VietinBank - Tên» chỉ là gợi ý một chạm, nút bỏ dấu vẫn giữ.',
    'Bốn mẫu ảnh: mã trần để dán tài liệu; mã có thương hiệu để gửi Zalo hoặc in A6; name card 90×51 mm có tên, chức danh, đơn vị, số; biển để bàn hoặc bảng tên đeo cổ khổ A6.',
    'Mỗi mẫu ghi rõ cỡ in tối thiểu; mã luôn vẽ nền trắng, không logo chèn giữa, mỗi ô đủ lớn để máy rẻ tiền vẫn quét được.',
    'Xem trước mẫu ngay khi đổi tên hay số; name card tự lấy chức danh và đơn vị từ danh thiếp online.',
  ],
  duongDan: '/vcard',
};

export default muc;

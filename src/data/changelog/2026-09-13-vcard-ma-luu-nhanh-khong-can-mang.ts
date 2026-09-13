import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-13-vcard-ma-luu-nhanh-khong-can-mang',
  ngay: '2026-09-13',
  loai: 'tinh-nang',
  phanHe: 'hr-343',
  tieuDe: 'Danh thiếp: mã lưu nhanh cho khách có tuổi — quét là lưu, không cần mạng',
  tomTat:
    'Mã QR mới chứa thẳng tên và số điện thoại: khách mở máy ảnh, chĩa vào mã là hiện '
    + '«Thêm liên hệ», không cần mạng, không cần cài gì — hợp hội trường đền bù đông người, '
    + 'sóng yếu. Tên trong danh bạ khách có dạng «VietinBank - Tên cán bộ». Cán bộ tự chọn '
    + 'tên có dấu hay không dấu và số điện thoại đưa vào mã, vì máy rẻ tiền của khách ở '
    + 'nhiều xã lưu tiếng Việt lỗi dấu.',
  diemChinh: [
    'Khối «Mã lưu nhanh» ngay dưới thẻ trên màn Danh thiếp VCard của tôi; sửa tên, chọn số là mã đổi theo ngay, lưu một lần dùng trên mọi máy.',
    'Nút «Bỏ dấu tiếng Việt» một chạm: «VietinBank - Tran Van Khai» — khách vẫn đọc ra tên, không bao giờ thành ô vuông trên máy cũ.',
    'Chọn số di động trên thẻ, số cơ quan hoặc nhập số khác; dạng số 0966… quen mắt với khách trong nước, bật dạng +84 khi dùng với khách nước ngoài.',
    '«Chế độ sự kiện»: mã kín màn hình nền trắng kèm tên chữ lớn và câu hướng dẫn khách, để chìa điện thoại ra giữa hội trường.',
    'Tải PNG để in bảng tên đeo cổ hoặc biển để bàn; màn hình báo mã thưa hay dày để biết in cỡ bao nhiêu.',
  ],
  duongDan: '/vcard',
};

export default muc;

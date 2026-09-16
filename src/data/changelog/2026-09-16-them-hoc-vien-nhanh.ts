import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-16-them-hoc-vien-nhanh',
  ngay: '2026-09-16',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Training Center: thêm cả lớp trong một phút — chọn nhiều, dán danh sách, mã lớp',
  tomTat:
    'Màn Quản trị chương trình thay ô chọn từng người bằng hộp thoại «Thêm nhiều người»: gõ tên '
    + 'không dấu, lọc theo phòng, tick cả phòng, hoặc dán thẳng danh sách từ Excel / Zalo và hệ thống '
    + 'khớp với danh bạ. Thêm cách thứ ba: Phòng Tổng hợp mở «mã lớp», cán bộ nội bộ nhập mã hoặc '
    + 'quét QR để xin vào, Phòng Tổng hợp duyệt một chạm hoặc bật «quét là vào». Khách đối tác không '
    + 'dùng được mã lớp.',
  diemChinh: [
    'Chọn từ danh bạ: ô tìm tên (không cần dấu), lọc theo phòng, tick từng người hoặc cả phòng, một nút thêm N người.',
    'Dán danh sách: mỗi dòng một tên, email hoặc mã cán bộ; hệ thống hiện trước ai khớp, ai trùng tên phải chọn tay, ai không có, ai đã trong lớp — rồi mới thêm.',
    'Mã lớp 6 ký tự (không có số 0 và 1) kèm QR và link; cán bộ vào Training Center → «Nhập mã để ghi danh». Mặc định chờ Phòng Tổng hợp duyệt; bật «quét là vào lớp ngay» khi muốn mở tự do.',
    'Chỉ tài khoản cán bộ nội bộ Bắc Hưng Yên ONE mới xin vào được — máy chủ chặn khách đối tác; người xin vào luôn là học viên, các vai khác vẫn do Phòng Tổng hợp xếp.',
    'Sửa lỗi có sẵn: cán bộ ngoài lớp trước đây có thể gọi được vài thao tác của Phòng Tổng hợp (cấp QR ngày, ghi hộ điểm danh); nay chặn đúng.',
  ],
  duongDan: '/one/training-center/quan-tri',
};

export default muc;

import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-07-tham-dinh-dinh-vi-truoc-khi-mo',
  ngay: '2026-09-07',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Điểm danh: mỗi lớp tự chọn QR hay định vị, định vị phải đo thử mới mở',
  tomTat:
    'Mỗi lần đào tạo tự chọn mở luồng nào. Lớp mới mặc định chỉ mở quét QR. Muốn mở thêm điểm danh bằng ' +
    'định vị thì phải ra phòng học đo thử ba lần ở ba chỗ ngồi khác nhau, cả ba lần đều phải nằm trong bán ' +
    'kính đã đặt; chưa đủ thì hệ thống từ chối mở. Sau mỗi lần đo, hệ thống nói luôn nên đặt bán kính bao ' +
    'nhiêu mét cho vừa với phòng học đó.',
  diemChinh: [
    'Lớp mới mặc định chỉ mở quét QR — định vị là thứ phải kiểm chứng trước khi dùng',
    'Nút «Thử tại chỗ này» đo khoảng cách và sai số máy báo, ghi lại kèm chỗ đứng, không tính là điểm danh',
    'Đủ ba lần đo đạt thì ô tích luồng định vị mới mở ra; thiếu thì hệ thống nói còn thiếu mấy lần',
    'Hệ thống đề xuất bán kính vừa với phòng học, bấm một nút là điền vào',
    'Danh sách chương trình hiện luôn từng lớp đang mở luồng nào, tiện rà trước khi nhân rộng',
  ],
  duongDan: '/one/training-center/quan-tri',
};

export default muc;

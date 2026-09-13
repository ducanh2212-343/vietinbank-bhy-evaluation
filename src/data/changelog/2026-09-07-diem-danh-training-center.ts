import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-07-diem-danh-training-center',
  ngay: '2026-09-07',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Training Center: điểm danh bằng định vị hoặc quét QR in theo ngày',
  tomTat:
    'Học viên điểm danh hai cách: mở cổng trên điện thoại rồi bấm nút cho phép định vị, hoặc quét tấm QR ' +
    'của đúng ngày hôm đó do Phòng Tổ chức Tổng hợp in ra và Phó Giám đốc mở trong phòng học. Mỗi ngày một ' +
    'mã QR riêng, hết ngày là không quét được nữa. Tấm QR tải về dạng ảnh hoặc bản in A5, có số ngày, tiêu ' +
    'đề buổi học và một câu về trí tuệ cảm xúc để mở đầu ngày.',
  diemChinh: [
    'Bấm một nút trên điện thoại là xong — máy chủ tự đo khoảng cách tới phòng học, đứng ngoài phạm vi thì báo còn bao nhiêu mét',
    'Mỗi ngày một tấm QR riêng: in trước, dán trong phòng hoặc để Phó Giám đốc mở đầu buổi',
    'Tấm QR tải về dạng ảnh PNG hoặc bản in A5, mang số ngày và một châm ngôn khác nhau mỗi ngày',
    'Phòng Tổng hợp đứng giữa phòng học bấm «Lấy toạ độ tại đây», chọn bán kính và ngưỡng tính muộn',
    'Bảng theo dõi từng ngày: ai có mặt, ai muộn mấy phút, ai vắng; quên điện thoại thì ghi hộ có lý do',
  ],
  duongDan: '/one/training-center',
};

export default muc;

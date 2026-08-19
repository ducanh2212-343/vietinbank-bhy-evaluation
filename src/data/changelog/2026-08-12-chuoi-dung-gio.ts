import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-12-chuoi-dung-gio',
  ngay: '2026-08-12',
  loai: 'tinh-nang',
  phanHe: 'chieu-thuc-2',
  tieuDe: 'Chuỗi đúng giờ và câu mở ngày cho tin nhắc buổi sáng',
  tomTat:
    'Ghi nhịp đúng giờ nhiều ngày liền thì có chuỗi, giữ được chuỗi thì hệ thống khen. '
    + 'Tin nhắc 07:30 mở đầu bằng một câu xoay vòng trong kho gần 80 câu nên không nhàm.',
  diemChinh: [
    'Huy hiệu chuỗi đúng giờ hiện ngay trong ứng dụng',
    'Tin khen khi chạm mốc chuỗi, mang dấu 🔥 chứ không đội mũ cảnh báo',
    'Câu mở ngày xoay vòng — có cả nhóm mượn lời bài hát',
  ],
  pr: 121,
};

export default muc;

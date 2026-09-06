import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-07-lo-trinh-10-ngay-theo-buoi-moi',
  ngay: '2026-09-07',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Lộ trình 10 ngày xếp lại theo giờ làm việc thật của Chi nhánh',
  tomTat:
    'Toàn bộ lịch mười ngày của chương trình Trưởng phòng KHDN được thay bằng bản nội dung mới nhất và ' +
    'xếp lại vào đúng khung giờ làm việc: buổi sáng 08:00–11:30, buổi chiều 13:30 và muộn nhất là 18:00. ' +
    'Trước đây có ngày bắt đầu từ 07:30 và có buổi kéo dài quá giờ nghỉ. Bốn buổi giao lưu pickleball ' +
    'vẫn giữ nguyên khung 18:00–19:30.',
  diemChinh: [
    'Sáng nào cũng bắt đầu 08:00 và kết thúc đúng 11:30, không còn buổi bắt đầu từ 07:30',
    'Chiều bắt đầu 13:30, ngày kết thúc muộn nhất là 17:45 — không buổi nào vượt 18:00',
    'Nội dung từng đầu việc viết lại rõ hơn: làm gì, nộp ở đâu, làm trên máy cơ quan hay laptop cá nhân',
    'Giữ nguyên lát cắt và câu hỏi tự soi của cả mười ngày',
    'Ba khối học viên tự làm buổi sáng được rút gọn cân đối để vừa khung 3 giờ 30 phút',
  ],
  duongDan: '/one/training-center/lo-trinh',
};

export default muc;

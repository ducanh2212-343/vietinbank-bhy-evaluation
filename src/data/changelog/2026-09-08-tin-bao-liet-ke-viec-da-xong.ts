import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-08-tin-bao-liet-ke-viec-da-xong',
  ngay: '2026-09-08',
  loai: 'sua-loi',
  phanHe: 'bhy-ways',
  tieuDe: 'Tích được đầu việc đã nộp tệp; tin báo liệt kê rõ việc nào đã xong',
  tomTat:
    'Đầu việc yêu cầu nộp tệp trước đây đã đính kèm rồi mà bấm ô tích vẫn báo còn thiếu tệp — nay tích ' +
    'được bình thường. Tin báo gửi cả lớp cũng đổi: thay vì chỉ nêu một đầu việc vừa tích, tin liệt kê ' +
    'từng đầu việc đã xong theo đúng thứ tự trong lộ trình.',
  diemChinh: [
    'Đã đính kèm tệp thì tích hoàn thành được ngay, không phải nộp lại lần nữa',
    'Chưa nộp gì thì vẫn bị chặn như cũ — cổng chặn không hề nới lỏng',
    'Tin báo ghi rõ danh sách đầu việc đã xong, đánh số theo thứ tự lộ trình',
    'Ngày nhiều việc thì tin nêu 8 việc đầu và ghi còn bao nhiêu việc nữa',
    'Xong hết đầu việc của ngày thì tin nói rõ đã xong toàn bộ',
  ],
  duongDan: '/one/training-center/lo-trinh',
};

export default muc;

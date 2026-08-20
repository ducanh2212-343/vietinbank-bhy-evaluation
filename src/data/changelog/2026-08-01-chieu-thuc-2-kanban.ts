import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-01-chieu-thuc-2-kanban',
  ngay: '2026-08-01',
  loai: 'lon',
  phanHe: 'chieu-thuc-2',
  tieuDe: 'Chiêu thức 2 — Kanban 5W2H + PDCA thay cho bảng Miro',
  tomTat:
    'Bàn làm việc của Chi nhánh chuyển từ Miro về hệ thống: mỗi đầu việc có duy nhất một người '
    + 'chịu trách nhiệm, 7 cột theo vòng PDCA, nhật ký ghi nhịp không sửa được sau khi ghi.',
  diemChinh: [
    'Ghi việc chỉ 3 trường (việc gì · ai làm · xong khi nào); 5W2H hỏi lúc bấm «Bắt đầu làm»',
    'Cổng chặn PDCA: có kế hoạch mới sang Đang làm, đủ 100% và có kiểm chứng mới sang Hoàn thành',
    'Nhật ký nhịp ghi thêm chứ không sửa đè — dòng thời gian của thẻ kể lại đủ câu chuyện',
    'Màn «Việc của tôi» và «Bảng của Phòng», có chế độ Toàn cảnh lọt một màn hình điện thoại',
    'Chấm giờ ghi nhịp buổi sáng ngay tại máy chủ, không phụ thuộc đồng hồ máy cá nhân',
  ],
  duongDan: '/one/chieu-thuc-2',
  pr: 84,
};

export default muc;

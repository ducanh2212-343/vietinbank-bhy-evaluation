import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-09-chuan-hinh-thuc-push',
  ngay: '2026-08-09',
  loai: 'tinh-nang',
  phanHe: 'nen-tang',
  tieuDe: 'Thông báo trên màn hình khóa đọc được trong một nháy mắt',
  tomTat:
    'Trước đây tên việc, tên người báo và nội dung dính thành một chuỗi nối bằng dấu chấm giữa. '
    + 'Nay tiêu đề mang con số quan trọng nhất, thân tin mỗi dòng một nhãn.',
  diemChinh: [
    'Tiêu đề dạng «<Tên người> — tiến độ 25%», không còn gãy dòng',
    'Thân tin tách dòng: «Việc:», «Hồ sơ:», «Nội dung:», «⚠️ Vướng:»',
    'Nhãn phân hệ [CT2] / [CT3] / [Dấu ấn] ngay trên tiêu đề — biết ngay tin thuộc mảng nào',
    'Chuông trong ứng dụng in đậm phần nhãn để mắt bắt được cấu trúc tin',
  ],
  pr: 116,
};

export default muc;

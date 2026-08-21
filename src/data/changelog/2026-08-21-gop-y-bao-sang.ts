import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-21-gop-y-bao-sang',
  ngay: '2026-08-21',
  loai: 'tinh-nang',
  phanHe: 'nen-tang',
  tieuDe: 'Bản tin sáng báo góp ý mới cho Phòng TCTH và Ban Giám đốc',
  tomTat:
    'Trước đây phải tự mở trang góp ý mới biết có ý kiến mới, nên có phiếu nằm nhiều ngày '
    + 'chưa ai xem. Nay mỗi sáng ngày làm việc, lúc 9h10, hệ thống gửi một tin gộp tất cả '
    + 'góp ý chưa báo — bấm vào là mở thẳng hòm tiếp nhận.',
  diemChinh: [
    'Một tin mỗi sáng, không phải mỗi góp ý một tin — không làm phiền giữa ngày',
    'Phát lúc 9h10 để cán bộ kịp nhập việc đầu giờ; ngày nghỉ thì để dành sang buổi làm việc kế tiếp',
    'Tin luôn ngắn: liệt kê 3 phiếu mới nhất, còn lại gộp thành «… và N phiếu khác»',
    'Vào chuông trong ứng dụng trước, push chỉ là một kênh phát — không bật push vẫn thấy',
  ],
  duongDan: '/gop-y-he-thong',
  danhCho: ['system_admin', 'tcth_admin', 'bgd'],
};

export default muc;

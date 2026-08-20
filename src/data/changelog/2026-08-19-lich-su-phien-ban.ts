import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-19-lich-su-phien-ban',
  ngay: '2026-08-19',
  loai: 'tinh-nang',
  phanHe: 'nen-tang',
  tieuDe: 'Mục «Có gì mới» — cán bộ tự biết hệ thống vừa lên tính năng gì',
  tomTat:
    'Từ nay mỗi lần hệ thống có thứ mới, cán bộ đọc được ngay tại mục «Có gì mới» trên Trang chủ: '
    + 'tính năng mới là gì, dùng để làm gì, bấm vào đâu để dùng thử. '
    + 'Trước đây lịch sử phiên bản nằm trong màn Cài đặt chỉ quản trị viên vào được, và đã đứng yên từ 05/07/2026.',
  diemChinh: [
    'Mục «Có gì mới» mở cho mọi cán bộ, lọc theo phân hệ và theo mức thay đổi',
    'Có tính năng mới thì hiện dấu chấm đỏ trên menu; lần đầu vào sau đợt cập nhật lớn có hộp giới thiệu ngắn',
    'Chỉ NÂNG CẤP LỚN và TÍNH NĂNG MỚI mới báo; sửa lỗi vẫn ghi vào lịch sử nhưng im lặng',
    'Cả đợt cập nhật gộp thành MỘT tin — không bắn một thông báo cho mỗi lần lập trình viên sửa xong việc',
    'Số phiên bản do hệ thống tự tính, mỗi lần cập nhật là một file riêng nên hai nhánh làm song song không giẫm lên nhau',
  ],
  duongDan: '/co-gi-moi',
};

export default muc;

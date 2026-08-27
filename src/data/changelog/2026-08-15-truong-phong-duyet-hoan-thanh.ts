import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-15-truong-phong-duyet-hoan-thanh',
  ngay: '2026-08-15',
  loai: 'tinh-nang',
  phanHe: 'chieu-thuc-2',
  tieuDe: 'Báo hoàn thành phải qua Trưởng phòng duyệt',
  tomTat:
    'Cán bộ bấm hoàn thành là gửi đề nghị chứ chưa phải xong: Trưởng phòng có màn hình duyệt riêng, '
    + 'duyệt hoặc trả lại kèm lý do.',
  diemChinh: [
    'Màn hình duyệt hoàn thành riêng cho Trưởng phòng',
    'Trả lại thẻ kèm lý do, cán bộ thấy ngay phải làm gì tiếp',
    'Việc đã đến lúc phải chạy thì vẫn phải báo cáo, dù thẻ còn ở cột «Chuẩn bị»',
  ],
  duongDan: '/one/chieu-thuc-2',
  pr: 123,
};

export default muc;

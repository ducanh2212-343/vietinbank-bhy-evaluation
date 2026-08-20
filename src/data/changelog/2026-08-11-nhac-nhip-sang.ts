import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-11-nhac-nhip-sang',
  ngay: '2026-08-11',
  loai: 'tinh-nang',
  phanHe: 'chieu-thuc-2',
  tieuDe: 'Nhắc nhịp sáng 07:30 gửi thẳng tới cán bộ, không qua trưởng phòng',
  tomTat:
    'Mỗi ngày làm việc lúc 07:30, cán bộ nào còn việc phải ghi nhịp sẽ nhận một tin nhắc kèm '
    + 'tên đúng những việc đó — thay vì trưởng phòng phải đi nhắc từng người.',
  diemChinh: [
    'Tin nhắc gọi tên tối đa 2–3 việc phải ghi nhịp hôm nay',
    'Chỉ chạy ngày làm việc, im lặng ngày nghỉ lễ và cuối tuần',
    'Bấm vào tin mở thẳng thẻ cần ghi, không phải tự đi tìm',
  ],
  duongDan: '/one/chieu-thuc-2',
  pr: 119,
};

export default muc;

import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-26-hien-ten-nguoi-ghi-nhip-tren-dong-thoi-gian',
  ngay: '2026-08-26',
  loai: 'sua-loi',
  phanHe: 'chieu-thuc-2',
  tieuDe: 'Dòng thời gian hiện đúng tên người ghi nhịp thay vì dấu gạch',
  tomTat:
    'Mở «Dòng thời gian & trao đổi» của một thẻ Dấu ấn BHY Mark hay thẻ Kanban, '
    + 'mỗi dòng báo cáo trước đây chỉ hiện dấu gạch «—» ở chỗ đáng lẽ là tên cán bộ. '
    + 'Nay mỗi dòng nói rõ ai ghi, nên đọc lại một tuần làm việc không phải đoán.',
  diemChinh: [
    'Dòng báo cáo hiện họ tên cán bộ đã ghi nhịp — trước đây luôn là «—».',
    'Áp cho cả bàn Dấu ấn BHY Mark và bàn Kanban đầu việc, cùng một luật.',
    'Dòng do hệ thống tự ghi vẫn để «Hệ thống» như cũ, không nhận nhầm tên ai.',
  ],
  duongDan: '/dau-an',
};

export default muc;

import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-12-bang-kanban-toan-chi-nhanh',
  ngay: '2026-08-12',
  loai: 'tinh-nang',
  phanHe: 'chieu-thuc-2',
  tieuDe: 'Bảng Kanban toàn Chi nhánh và bảng nhịp gộp hai bàn',
  tomTat:
    'Việc liên quan cả Chi nhánh nằm trên một bảng chung, hiện ở màn hình mọi Phòng. '
    + 'Bảng nhịp gộp mỗi cán bộ một dòng, tách rõ số liệu Việc phòng và hồ sơ tín dụng.',
  diemChinh: [
    'Một bảng dùng chung cho việc liên phòng, không phải chép sang từng bảng',
    'Bảng nhịp: một dòng mỗi cán bộ, số liệu tách theo hai bàn',
    'Chỉ gắn được thẻ vào bảng mình có quyền xem',
  ],
  duongDan: '/one/chieu-thuc-2',
  pr: 120,
};

export default muc;

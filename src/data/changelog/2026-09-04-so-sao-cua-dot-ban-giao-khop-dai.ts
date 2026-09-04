import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-04-so-sao-cua-dot-ban-giao-khop-dai',
  ngay: '2026-09-04',
  loai: 'sua-loi',
  phanHe: 'bhy-ways',
  tieuDe: 'Sửa số sao của đợt bàn giao hụt so với dải số đã giao',
  tomTat:
    'Phòng TCTH phát hiện đợt Quý III giao cho một cán bộ Phòng DVKH ghi dải 6 sao '
    + 'nhưng dòng chi tiết chỉ ra 5. Nguyên nhân: một ngôi sao trong dải đã được trao '
    + 'từ trước và ghi bù vào cổng, nên không được tính vào đợt. Nay sao đã trao vẫn '
    + 'thuộc đợt của người giao, và nếu còn lệch thì màn hiện ngay con số lệch.',
  diemChinh: [
    'Sao đã trao trước khi bàn giao nay vẫn được tính vào đúng đợt của người giao.',
    'Bốn ngôi sao đang bị tính thiếu đã được nối lại vào đợt (số 64, 65, 75, 287).',
    'Bảng các đợt bàn giao hiện nhãn «lệch N» khi số của đợt không khớp dải đã giao.',
    'Ghi sao bù cũng tự gắn vào đợt đang mở của người tặng, không để rơi ra ngoài.',
  ],
  duongDan: '/one/ghi-nhan/quan-ly',
  danhCho: ['system_admin', 'tcth_admin', 'bgd'],
};

export default muc;

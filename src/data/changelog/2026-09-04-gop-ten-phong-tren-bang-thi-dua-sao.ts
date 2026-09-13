import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-04-gop-ten-phong-tren-bang-thi-dua-sao',
  ngay: '2026-09-04',
  loai: 'sua-loi',
  phanHe: 'bhy-ways',
  tieuDe: 'Bảng thi đua Sao gộp đúng một dòng cho mỗi phòng, kể cả khi phòng đổi tên',
  tomTat:
    'Phòng Dịch vụ khách hàng đang hiện thành hai dòng trên bảng thi đua vì các phiếu '
    + 'ghi tên phòng theo nhiều cách khác nhau. Nay mọi cách viết của cùng một phòng — '
    + 'tên đầy đủ, tên rút gọn, hay tên trước khi đổi — đều về chung một dòng.',
  diemChinh: [
    'Mỗi phòng chỉ còn một dòng trên bảng thi đua, không tách đôi vì cách viết tên.',
    'Phòng đổi tên trong danh bạ thì phiếu cũ tự về tên mới, sao đã nhận không mất.',
    'Ô lọc theo phòng, bảng cá nhân và file kết xuất đều dùng chung một tên phòng.',
    'Phòng TCTH thấy được danh sách phiếu còn lưu tên cũ để dọn dữ liệu khi cần.',
  ],
  duongDan: '/one/ghi-nhan/tong-hop',
  danhCho: ['system_admin', 'tcth_admin', 'bgd', 'pgd', 'manager', 'staff'],
};

export default muc;

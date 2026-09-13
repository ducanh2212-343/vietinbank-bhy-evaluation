import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-04-ra-soat-giao-dien-sao-xung-dang',
  ngay: '2026-09-04',
  loai: 'sua-loi',
  phanHe: 'bhy-ways',
  tieuDe: 'Sửa ô nhập bị đen ở màn Ghi nhận Sao và làm ô tìm tên dễ dùng hơn',
  tomTat:
    'Cán bộ để máy ở chế độ nền tối thì ô tìm tên, ô «Vì đã» và ô «Đem lại» hiện '
    + 'thành khối đen, gõ chữ không nhìn thấy. Nay mọi ô nhập của cổng đều nền sáng. '
    + 'Ô tìm tên cũng được làm lại: bấm vào là thấy danh sách, chọn bằng bàn phím được.',
  diemChinh: [
    'Ô nhập không còn bị đen khi máy để nền tối — sửa cho toàn cổng, không riêng màn Sao.',
    'Bấm vào ô tìm tên là hiện luôn danh sách cán bộ bạn được chọn, khỏi phải đoán.',
    'Chọn tên bằng phím mũi tên và Enter; gõ không dấu vẫn ra đúng tên có dấu.',
    'Chữ nhỏ trên các bảng Sao được nới dòng cho dấu tiếng Việt không chạm nhau.',
    'Chữ ghi chú mờ đã đậm lên cho đủ chuẩn dễ đọc.',
  ],
  duongDan: '/one/ghi-nhan/tang-sao',
  danhCho: ['system_admin', 'tcth_admin', 'bgd', 'pgd', 'manager', 'staff'],
};

export default muc;

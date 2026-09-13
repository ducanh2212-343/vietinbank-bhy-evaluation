import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-13-mau-tin-sao-zalo-sua-duoc-co-bieu-tuong',
  ngay: '2026-09-13',
  loai: 'tinh-nang',
  phanHe: 'one-home',
  tieuDe: 'Tin Sao trên nhóm Zalo có biểu tượng từng đề mục, quản trị sửa được mẫu',
  tomTat:
    'Tin Sao đầu tiên lên nhóm cho thấy các dòng Người tặng, Vì đã, Kết quả nhìn giống nhau, '
    + 'khó lướt. Nay mỗi đề mục có biểu tượng riêng (🏅 người nhận · 🎁 người tặng · 💡 lý do · '
    + '✅ kết quả · 📈 tích lũy), và TCTH sửa được mẫu ngay trên trang Quản trị Zalo, xem trước tức thì.',
  diemChinh: [
    'Mẫu sao cá nhân và sao tập thể sửa riêng, mỗi dòng một đề mục, đổi chữ và biểu tượng tùy ý.',
    'Dòng nào phiếu không có dữ liệu (ví dụ không ghi Kết quả) tự bỏ, không để trống.',
    'Nút «Khôi phục mẫu mặc định» khi sửa hỏng.',
  ],
  duongDan: '/quan-tri-zalo',
  danhCho: ['tcth_admin', 'system_admin', 'bgd'],
};

export default muc;

import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-04-go-so-nhat-ky-phien-credit-360',
  ngay: '2026-09-04',
  loai: 'sua-loi',
  phanHe: 'bhy-ways',
  tieuDe: 'Trang Credit 360 gọn lại: bỏ sổ nhật ký phiên và nút tải văn bản',
  tomTat:
    'Sổ nhật ký phiên (form đăng ký, thống kê, bảng tra cứu) không ai dùng — phiên đăng ký với Người điều phối ' +
    'hoặc phòng TCTH và ghi biên bản giấy theo Mẫu biểu 01 — nên gỡ khỏi trang. Văn bản triển khai lưu tại ' +
    'TCTH, không đăng trên cổng.',
  diemChinh: [
    'Trang Credit 360 còn ba phần: giới thiệu, cách thức vận hành, biểu mẫu 01 và 02',
    'Bỏ hai nút «Làm ngay trên cổng» ở Bước 1 và Bước 4 vì không còn sổ để ghi',
    'Dữ liệu phiên đã nhập trước đây vẫn được giữ trên máy chủ, chưa xoá',
  ],
  duongDan: '/one/credit-360',
};

export default muc;

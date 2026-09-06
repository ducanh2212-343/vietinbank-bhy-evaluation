import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-07-lich-ngay-theo-buoi-gio-la-khuyen-nghi',
  ngay: '2026-09-07',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Lịch mỗi ngày gom thành buổi sáng và buổi chiều, giờ chỉ là khuyến nghị',
  tomTat:
    'Trước đây lịch một ngày chia thành năm mục theo loại việc và mỗi đầu việc in hai mốc giờ cứng, đọc ' +
    'giống một cái hẹn phải theo đúng phút. Nay lịch gom thành buổi sáng và buổi chiều; mỗi buổi ghi khung ' +
    'giờ khuyến nghị và tổng thời lượng, mỗi đầu việc ghi số phút nên dành thay vì mốc bắt đầu — kết thúc. ' +
    'Học viên tự sắp thứ tự trong buổi.',
  diemChinh: [
    'Mỗi ngày còn hai mục: Buổi sáng và Buổi chiều — bốn buổi pickleball tách riêng «Sau giờ làm việc»',
    'Đầu mỗi buổi ghi khung giờ khuyến nghị, số đầu việc và tổng thời lượng nên dành',
    'Mỗi đầu việc hiện số phút thay cho hai mốc giờ; loại việc chuyển thành nhãn nhỏ ngay trên dòng',
    'Không có gì bị đánh dấu trễ theo giờ — trạng thái vẫn tính theo ngày như trước',
    'Sửa lỗi giờ hiện thừa số giây («08:00:00») ở lịch Ban Giám đốc, màn Quản trị và trang chủ',
  ],
  duongDan: '/one/training-center/lo-trinh',
};

export default muc;

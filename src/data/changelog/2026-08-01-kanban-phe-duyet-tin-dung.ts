import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-01-kanban-phe-duyet-tin-dung',
  ngay: '2026-08-01',
  loai: 'tinh-nang',
  phanHe: 'chieu-thuc-2',
  tieuDe: 'Bàn Phê duyệt tín dụng (PDTD) cho phòng có cấp tín dụng',
  tomTat:
    'Tab riêng chỉ hiện với phòng có cấp tín dụng (KHDN, Bán lẻ, HTTD). Đơn vị theo dõi là '
    + 'hồ sơ tín dụng của một khách hàng, đi qua 7 cột theo đúng quy trình phê duyệt.',
  diemChinh: [
    'Số tiền là số thật nên cộng được tổng dư nợ đang trình',
    '«Đến hạn GHTD» là trường ngày — cảnh báo được khách sắp hết hạn mức mà chưa mở hồ sơ tái cấp',
    'Ngưỡng chờ riêng từng cấp trình: Lãnh đạo phòng 2 ngày · Lãnh đạo Chi nhánh 3 · Trụ sở chính 5',
    'Phân làn theo cán bộ, khóa kéo thả để hồ sơ không nhảy cột nhầm',
  ],
  duongDan: '/one/chieu-thuc-2?tab=tin-dung',
  pr: 85,
};

export default muc;

import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-10-fdi-hub-thong-ke-su-dung-theo-phong',
  ngay: '2026-09-10',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'FDI Hub có tab Thống kê sử dụng: phòng nào đang dùng, dùng phần nào',
  tomTat:
    'Lãnh đạo phòng, Phó Giám đốc, Ban Giám đốc và Phòng TCTH thấy thêm tab «Thống kê sử dụng» trong Bắc Hưng Yên ' +
    'FDI Hub: số lượt mở từng tab, số cán bộ và tỷ lệ phủ của từng phòng, ma trận phòng × tab, lọc theo 7 / 30 / 90 ' +
    'ngày. Các Phòng giao dịch được xếp thành nhóm riêng và phòng chưa mở cẩm nang được đánh dấu — để biết phòng nào ' +
    'đang tiếp cận khách hàng FDI mà chưa dùng công cụ. Thống kê chỉ theo phòng, không hiện tên từng cán bộ.',
  diemChinh: [
    'Bốn con số đầu tab: lượt mở, cán bộ đã dùng, phòng đã dùng, Phòng giao dịch đã dùng kèm tên phòng còn đứng ngoài',
    'Bảng Phòng giao dịch: cán bộ, người đã dùng, tỷ lệ phủ, lượt, tab hay dùng, lần mở gần nhất',
    'Ma trận phòng × tab tô đậm theo mức dùng để thấy phòng đang đọc phần nào của cẩm nang',
    'Cùng người mở lại một tab trong 10 phút chỉ tính một lượt; lượt gắn với phòng tại thời điểm mở',
  ],
  duongDan: '/one/fdi-hub?tab=thong-ke',
  danhCho: ['manager', 'pgd', 'bgd', 'tcth_admin', 'system_admin'],
};

export default muc;

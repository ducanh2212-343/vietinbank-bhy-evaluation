import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-07-phieu-giao-viec-bay-o',
  ngay: '2026-09-07',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Training Center: phiếu giao việc bảy ô, khoá chuẩn, nghiệm thu Đạt/Chưa đạt',
  tomTat:
    'Ba việc gối đầu trên Bảng việc chuyển sang phiếu giao việc bảy ô bằng tiếng Việt (VÌ SAO · VIỆC GÌ · AI LÀM · ' +
    'ĐẠT CHUẨN · HẠN NỘP · ĐIỂM KIỂM · MỨC GIAO), thay cho phiếu nhãn tiếng Anh. Phiếu tự chặn khi tên việc là một ' +
    'hành động thay vì sản phẩm, giao cho tập thể, chuẩn rỗng nghĩa hay thiếu điểm kiểm. Bấm «Giao việc» thì chuẩn ' +
    'khoá lại; muốn sửa phải ghi lý do và mọi lần sửa đều lưu lịch sử. Ban Giám đốc và Phòng Tổng hợp sửa được ' +
    'nội dung chương trình ngay trong chương trình.',
  diemChinh: [
    'Phiếu bảy ô một cột dọc, điền được trên điện thoại; hạn nộp có giờ, điểm kiểm tự gợi ý ở 60% quãng',
    'Giao việc thì khoá chuẩn; «Điều chỉnh chuẩn» bắt buộc lý do và có lịch sử để đối chiếu cuối kỳ',
    'Nghiệm thu chỉ hai kết quả Đạt / Chưa đạt, có đếm số lần và so mức giao đầu kỳ với cuối kỳ',
    'Thẻ ①②③ trên Kanban chỉ sang Đang làm khi đủ ô, sang Hoàn thành khi nghiệm thu Đạt',
    'Ban Giám đốc của chương trình sửa được ngày, đầu việc và thông tin chương trình như Phòng Tổng hợp',
  ],
  duongDan: '/one/training-center',
};

export default muc;

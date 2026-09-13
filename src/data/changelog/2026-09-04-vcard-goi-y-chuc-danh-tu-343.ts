import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-04-vcard-goi-y-chuc-danh-tu-343',
  ngay: '2026-09-04',
  loai: 'tinh-nang',
  phanHe: 'user-admin',
  tieuDe: 'Quản trị VCard: máy gợi ý sẵn đơn vị và chức danh khi tạo thẻ từ hồ sơ 343',
  tomTat:
    'Trước đây tạo hồ sơ danh thiếp từ hồ sơ nhân sự 343 vẫn phải tự chọn đơn vị '
    + 'và tự tìm chức danh đối ngoại tiếng Anh trong danh sách 13 mục. Nay máy đọc '
    + 'phòng và chức danh trong hồ sơ 343 rồi điền sẵn hai ô đó, người nhập chỉ cần '
    + 'xác nhận. Mọi lựa chọn hiện tiếng Việt kèm bản tiếng Anh sẽ in lên thẻ.',
  diemChinh: [
    'Chọn một cán bộ trong hồ sơ 343 là đơn vị và chức danh đối ngoại được điền sẵn; màn hình nói rõ đã suy ra từ phòng và chức danh nào.',
    'Danh sách hồ sơ 343 hiện luôn gợi ý của từng người, xem được trước khi bấm chọn.',
    'Chức danh nào chưa có luật suy ra thì để trống kèm lý do, không đoán bừa — sai chức danh trên thẻ rất khó thu hồi.',
    'Ô đơn vị và ô chức danh hiện tiếng Việt trước, tiếng Anh sau, nên không cần biết tiếng Anh vẫn chọn đúng.',
    'Khi cơ sở dữ liệu chưa bật phân hệ, màn hình nói thẳng cần làm gì thay vì báo lỗi kỹ thuật khó hiểu.',
  ],
  duongDan: '/quan-tri-vcard/can-bo',
};

export default muc;

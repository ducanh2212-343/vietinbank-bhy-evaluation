import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-02-danh-thiep-so-quan-tri',
  ngay: '2026-09-02',
  loai: 'tinh-nang',
  phanHe: 'user-admin',
  tieuDe: 'Bắc Hưng Yên VCard: từ điển chức danh, đơn vị và phát hành thẻ QR',
  tomTat:
    'Mỗi cán bộ có một danh thiếp số duy nhất, hiện đúng ngôn ngữ của khách '
    + '(Việt, Anh, Trung giản thể/phồn thể, Hàn, Nhật). Thẻ được GHÉP từ tên cán bộ '
    + 'với từ điển chức danh và từ điển đơn vị do Phòng TCTH quản lý — không ai tự '
    + 'gõ tên ngân hàng hay chức danh tiếng nước ngoài nữa, hết cảnh mỗi tấm name '
    + 'card một kiểu sai.',
  diemChinh: [
    'Từ điển đơn vị và từ điển chức danh 6 ngôn ngữ; sửa một dòng là mọi thẻ liên quan đổi theo.',
    'Chức danh nội bộ (theo quyết định bổ nhiệm) và chức danh đối ngoại (in trên thẻ) tách riêng; thẻ không bao giờ dùng chức danh nội bộ.',
    'Giám đốc hoặc Phòng TCTH duyệt chức danh vai trò thị trường (FDI Desk, Korea/Japan Desk) và chức danh đối ngoại riêng có thời hạn.',
    'Nhân sự thuê ngoài, cộng tác viên, thực tập sinh dùng mẫu thẻ riêng: không logo, không chức danh và email VietinBank.',
    'Phát hành / thu hồi thẻ một thao tác; xuất QR (PNG + SVG) và CSV cho nhà in. Thẻ thu hồi hiện trang «đã chuyển công tác» kèm liên hệ Chi nhánh.',
  ],
  duongDan: '/quan-tri-vcard',
  danhCho: ['system_admin', 'tcth_admin', 'bgd'],
};

export default muc;

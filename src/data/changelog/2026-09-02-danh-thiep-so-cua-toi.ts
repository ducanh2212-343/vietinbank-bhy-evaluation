import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-02-danh-thiep-so-cua-toi',
  ngay: '2026-09-02',
  loai: 'tinh-nang',
  phanHe: 'one-home',
  tieuDe: 'Bắc Hưng Yên VCard: khách quét QR là lưu được liên hệ đúng ngôn ngữ',
  tomTat:
    'Bắc Hưng Yên VCard (menu Trang chủ → Tính năng khác → «VCard — Danh thiếp của tôi») cho cán bộ xem thẻ của '
    + 'mình ở 6 ngôn ngữ, tải mã QR để in name card hoặc gắn chữ ký email, và tự '
    + 'cập nhật số di động, ảnh chân dung, kênh chat. Khách quét mã sẽ thấy thẻ '
    + 'đúng ngôn ngữ điện thoại của họ và bấm một nút là lưu vào danh bạ.',
  diemChinh: [
    'Mở màn là thấy ngay thẻ của mình ở 6 ngôn ngữ; chưa có hồ sơ thì bấm một nút để máy ghép bản nháp từ hồ sơ nhân sự 343.',
    'Thẻ tự chọn ngôn ngữ theo điện thoại khách; thiếu bản dịch thì hiện tiếng Anh, không dịch máy.',
    'Nút «Lưu vào danh bạ» tải tệp liên hệ mở thẳng trên iPhone và Android; khách Trung Quốc thấy tên Hán tự cùng tên tiếng Việt.',
    'Kênh chat trên thẻ: Zalo, LINE, WhatsApp mở thẳng; WeChat và KakaoTalk hiện ảnh QR cá nhân bạn tải lên.',
    'Muốn chức danh đối ngoại khác từ điển (kiêm nhiệm, dự án) thì gửi đề nghị ngay trên màn — Giám đốc hoặc Phòng TCTH duyệt; xem được lượt quét thẻ 30 ngày qua.',
  ],
  duongDan: '/vcard',
};

export default muc;

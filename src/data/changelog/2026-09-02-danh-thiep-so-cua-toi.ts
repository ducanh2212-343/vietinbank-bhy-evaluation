import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-02-danh-thiep-so-cua-toi',
  ngay: '2026-09-02',
  loai: 'tinh-nang',
  phanHe: 'hr-343',
  tieuDe: 'Danh thiếp số của tôi: khách quét QR là lưu được liên hệ đúng ngôn ngữ',
  tomTat:
    'Màn «Danh thiếp số của tôi» (Chiêu thức 3 → Cá nhân) cho cán bộ xem thẻ của '
    + 'mình ở 6 ngôn ngữ, tải mã QR để in name card hoặc gắn chữ ký email, và tự '
    + 'cập nhật số di động, ảnh chân dung, kênh chat. Khách quét mã sẽ thấy thẻ '
    + 'đúng ngôn ngữ điện thoại của họ và bấm một nút là lưu vào danh bạ.',
  diemChinh: [
    'Thẻ tự chọn ngôn ngữ theo điện thoại khách; thiếu bản dịch thì hiện tiếng Anh, không dịch máy.',
    'Nút «Lưu vào danh bạ» tải tệp liên hệ mở thẳng trên iPhone và Android; khách Trung Quốc thấy tên Hán tự cùng tên tiếng Việt.',
    'Kênh chat trên thẻ: Zalo, LINE, WhatsApp mở thẳng; WeChat và KakaoTalk hiện ảnh QR cá nhân bạn tải lên.',
    'Muốn chức danh đối ngoại khác từ điển (kiêm nhiệm, dự án) thì gửi đề nghị ngay trên màn — Giám đốc hoặc Phòng TCTH duyệt.',
    'Xem được số lượt quét thẻ 30 ngày qua theo ngôn ngữ.',
  ],
  duongDan: '/danh-thiep-cua-toi',
};

export default muc;

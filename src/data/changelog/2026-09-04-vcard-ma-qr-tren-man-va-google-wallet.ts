import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-04-vcard-ma-qr-tren-man-va-google-wallet',
  ngay: '2026-09-04',
  loai: 'tinh-nang',
  phanHe: 'hr-343',
  tieuDe: 'Danh thiếp: mã QR hiện sẵn để khách quét, ảnh QR WeChat tải kiểu nào cũng được',
  tomTat:
    'Bốn điểm vướng khi dùng thật đã được xử lý: mã QR nay hiện ngay trên màn '
    + 'thay vì phải tải tệp về mới xem được; ảnh mã QR WeChat và KakaoTalk chụp '
    + 'màn hình nguyên bản là tải lên được, máy tự tìm mã và cắt; sửa số điện '
    + 'thoại hay ảnh xong là thẻ đổi ngay; và có thêm nút thêm thẻ vào Google Wallet.',
  diemChinh: [
    'Mã QR hiện sẵn cạnh tấm thẻ, bấm «Phóng to cho khách quét» là chìa điện thoại ra cho khách quét ngay giữa buổi gặp.',
    'Ảnh mã QR WeChat / KakaoTalk: cứ tải ảnh chụp màn hình nguyên bản, máy tự tìm mã QR trong ảnh rồi cắt vuông; không dò được thì báo để bạn quét thử lại.',
    'Sửa số di động, ảnh chân dung hay tên nước ngoài xong, tấm thẻ trên màn đổi theo ngay lập tức.',
    'Nút «Thêm vào Google Wallet» trên thẻ và trên màn của bạn — hiện khi Chi nhánh đã đăng ký với Google.',
    'Ảnh mã QR đã tải hiện thu nhỏ ngay trong danh sách kênh chat để bạn tự kiểm tra.',
  ],
  duongDan: '/vcard',
};

export default muc;

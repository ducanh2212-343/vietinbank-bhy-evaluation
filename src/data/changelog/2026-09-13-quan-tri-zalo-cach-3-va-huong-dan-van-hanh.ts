import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-13-quan-tri-zalo-cach-3-va-huong-dan-van-hanh',
  ngay: '2026-09-13',
  loai: 'tinh-nang',
  phanHe: 'nen-tang',
  tieuDe: 'Quản trị Zalo: thêm cách lấy token dự phòng và hướng dẫn vận hành',
  tomTat:
    'Lấy token Zalo lần đầu hay lúc token chết từng phải nhờ kỹ thuật. Nay tab Kết nối '
    + 'có ba cách, ghi rõ nên thử cách nào trước, và một khối hướng dẫn thu gọn đủ để '
    + 'TCTH tự làm lại sau nhiều tháng không đụng tới.',
  diemChinh: [
    'Cách 3: bấm «Mở trang cấp quyền», Cho phép, rồi dán nguyên đường dẫn Zalo trả về — hệ thống tự tách mã, hiện mã che và OA để đối chiếu trước khi đổi.',
    'Lỗi Zalo được dịch sang tiếng Việt kèm cách khắc phục: mã hết hạn, Secret Key sai, callback không khớp (-14003), sai OA.',
    'Callback URL và App ID nằm trong cấu hình, sửa được trên trang; cảnh báo đỏ khi mở trang từ domain khác callback.',
    'Nhật ký ghi ai đổi/nạp token, lúc nào, kết quả — chỉ giữ 4 ký tự đầu của mã.',
  ],
  duongDan: '/quan-tri-zalo',
  danhCho: ['tcth_admin', 'system_admin', 'bgd'],
};

export default muc;

// Giữ lại chỗ người dùng đang muốn tới khi phiên đã hết hạn.
//
// VÌ SAO CẦN: thông báo đẩy mở thẳng vào đúng thẻ việc (/one/chieu-thuc-2?the=<id>),
// nhưng phiên nội bộ tự đăng xuất sau 60 phút không thao tác (IdleLogoutGuard). Nghĩa là
// phần lớn lần bấm push — sáng ra mở điện thoại, tin của đêm qua — đều rơi vào cảnh chưa
// đăng nhập. Trước 12/08 cửa đăng nhập không nhớ gì: đăng nhập xong đổ về cổng ONE, cán
// bộ phải tự đi tìm thẻ giữa bảy cột. Đúng cái việc mà thông báo sinh ra để khỏi phải làm,
// nên coi như tin đó mất tác dụng.
//
// Đích đến đi qua THANH ĐỊA CHỈ (?tiep=) chứ không qua bộ nhớ của router: bấm push mở cửa
// sổ mới hoàn toàn, và người dùng có thể tải lại trang đăng nhập giữa chừng — trạng thái
// trong bộ nhớ mất theo, còn tham số trên URL thì không.

/** Không biết đi đâu thì về cổng ONE — cửa vào chung của mọi vai trò. */
export const DICH_MAC_DINH = '/one';
const THAM_SO = 'tiep';

/** Ký tự điều khiển: xuống dòng, tab, và các mã dưới 0x20 cùng DEL. */
// eslint-disable-next-line no-control-regex
const KY_TU_DIEU_KHIEN = /[\u0000-\u001f\u007f]/;

/**
 * Chỉ nhận ĐƯỜNG DẪN NỘI BỘ. Một tham số chuyển hướng không kiểm tra là lỗ hổng kinh
 * điển: kẻ xấu gửi link /dang-nhap?tiep=https://trang-gia-mao... , cán bộ đăng nhập thật
 * rồi bị ném sang trang giả mạo mà vẫn tưởng đang ở trong hệ thống.
 */
function hopLe(duong: string): boolean {
  if (!duong.startsWith('/')) return false;
  // «//trang-khac.com» và «/\trang-khac.com» đều được trình duyệt hiểu là TÊN MIỀN KHÁC,
  // dù nhìn thì vẫn giống đường dẫn nội bộ.
  if (duong.startsWith('//') || duong.startsWith('/\\')) return false;
  // Ký tự điều khiển dùng để lách bộ lọc — trình duyệt lược bỏ chúng trước khi hiểu địa
  // chỉ, nên chuỗi kiểu «/<xuống dòng>https://…» có thể thoát ra ngoài.
  if (KY_TU_DIEU_KHIEN.test(duong)) return false;
  // Quay lại chính cửa đăng nhập thì thành vòng lặp
  if (duong === '/dang-nhap' || duong.startsWith('/dang-nhap?')) return false;
  return true;
}

/** Đường tới cửa đăng nhập, mang theo chỗ đang muốn tới. */
export function lienDangNhap(
  dich: { pathname: string; search?: string; hash?: string },
): string {
  const day = `${dich.pathname}${dich.search ?? ''}${dich.hash ?? ''}`;
  if (!hopLe(day)) return '/dang-nhap';
  return `/dang-nhap?${THAM_SO}=${encodeURIComponent(day)}`;
}

/** Đích sau khi đăng nhập xong — đọc từ query của trang đăng nhập. */
export function dichSauDangNhap(search: string): string {
  const day = new URLSearchParams(search).get(THAM_SO);
  return day && hopLe(day) ? day : DICH_MAC_DINH;
}

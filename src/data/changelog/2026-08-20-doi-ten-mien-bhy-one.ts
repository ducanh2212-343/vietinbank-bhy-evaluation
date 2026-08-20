import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-20-doi-ten-mien-bhy-one',
  ngay: '2026-08-20',
  loai: 'lon',
  phanHe: 'nen-tang',
  tieuDe: 'Cổng chuyển sang bachungyenone.com và thống nhất tên Bắc Hưng Yên ONE',
  tomTat:
    'Địa chỉ chính của cổng nay là bachungyenone.com; email hệ thống gửi từ noreply@bachungyenone.com '
    + 'và mang tên người gửi «BHY ONE» thay cho bốn cái tên cũ mỗi nơi một kiểu. '
    + 'Địa chỉ cũ chieuthuc3.com vẫn vào được trong giai đoạn chuyển tiếp, nên không ai bị mất đường vào.',
  diemChinh: [
    'Đổi dấu trang sang https://bachungyenone.com — lần đầu vào cần đăng nhập lại',
    'Ai đã cài biểu tượng ra màn hình điện thoại thì xoá biểu tượng cũ và cài lại từ địa chỉ mới',
    'Email hệ thống đổi người gửi thành «BHY ONE <noreply@bachungyenone.com>» — vài tuần đầu có thể rơi vào Spam, mở Spam bấm «Not spam» giúp',
    'Thông báo đã bật ở địa chỉ cũ vẫn chạy nguyên: không đổi khoá đăng ký, không đổi nhãn phân hệ [CT2]/[CT3]/[Dấu ấn]',
    'Tên đăng nhập của cán bộ KHÔNG đổi — email chỉ là định danh, không phải hòm thư nhận',
  ],
  duongDan: '/cai-dat',
};

export default muc;

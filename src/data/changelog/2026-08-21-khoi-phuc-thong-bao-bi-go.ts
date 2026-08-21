import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-21-khoi-phuc-thong-bao-bi-go',
  ngay: '2026-08-21',
  loai: 'sua-loi',
  phanHe: 'nen-tang',
  tieuDe: 'Khôi phục thông báo cho thiết bị lỡ bị tắt trong sáng 21/08',
  tomTat:
    'Bản chống thông báo đúp buổi sáng đã tắt nhầm thông báo của một số thiết bị vẫn đang dùng '
    + 'địa chỉ cũ chieuthuc3.com. Nay các thiết bị đó tự khôi phục ở lần mở cổng kế tiếp, '
    + 'và việc chống đúp chuyển sang thời điểm bật lại thông báo tại địa chỉ mới.',
  diemChinh: [
    'Thiết bị bị tắt nhầm trong sáng 21/08: chỉ cần mở cổng như bình thường là thông báo tự bật lại',
    'Ai đang dùng địa chỉ cũ: thông báo giữ nguyên, hệ thống không tự tắt gì nữa',
    'Bật lại thông báo tại bachungyenone.com: đăng ký cũ của đúng thiết bị đó tự tắt — không nhận tin đúp',
    'Địa chỉ cũ hiện lời mời chuyển sang địa chỉ mới thay cho nút bật thông báo',
  ],
};

export default muc;

import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-21-het-thong-bao-dup',
  ngay: '2026-08-21',
  loai: 'sua-loi',
  phanHe: 'nen-tang',
  tieuDe: 'Hết nhận thông báo đúp sau khi chuyển sang địa chỉ mới',
  tomTat:
    'Cán bộ đã bật thông báo ở địa chỉ cũ chieuthuc3.com rồi bật lại ở bachungyenone.com '
    + 'từng nhận mỗi tin hai lần trên màn hình khóa. Nay bật lại ở địa chỉ mới là hệ thống '
    + 'tự tắt đăng ký cũ của đúng thiết bị đó — mỗi tin chỉ hiện một lần.',
  diemChinh: [
    'Bật thông báo tại bachungyenone.com: đăng ký cũ của chính thiết bị tự tắt, không cần thao tác gì thêm',
    'Ai vẫn đang dùng địa chỉ cũ: thông báo giữ nguyên như trước, không bị ảnh hưởng',
    'Địa chỉ cũ hiện lời mời chuyển sang địa chỉ mới thay cho nút bật thông báo',
    'Thiết bị lỡ bị gỡ thông báo trong sáng 21/08: mở lại cổng là tự khôi phục, không cần bật lại',
  ],
};

export default muc;

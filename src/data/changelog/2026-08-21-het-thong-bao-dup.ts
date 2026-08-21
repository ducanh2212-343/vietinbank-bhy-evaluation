import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-08-21-het-thong-bao-dup',
  ngay: '2026-08-21',
  loai: 'sua-loi',
  phanHe: 'nen-tang',
  tieuDe: 'Hết nhận thông báo đúp sau khi chuyển sang địa chỉ mới',
  tomTat:
    'Cán bộ đã bật thông báo ở địa chỉ cũ chieuthuc3.com rồi bật lại ở bachungyenone.com '
    + 'từng nhận mỗi tin hai lần trên màn hình khóa. Nay thiết bị tự gỡ đăng ký cũ của chính nó, '
    + 'mỗi tin chỉ hiện một lần.',
  diemChinh: [
    'Mở cổng ở địa chỉ cũ: thiết bị tự gỡ đăng ký thông báo cũ, không cần thao tác gì',
    'Địa chỉ cũ không còn mời bật thông báo — bật ở địa chỉ mới bachungyenone.com',
    'Máy chưa từng bật lại ở địa chỉ mới vẫn nhận thông báo bình thường, không bị ảnh hưởng',
  ],
};

export default muc;

import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-03-so-ben-re-mo-y-tuong-va-thao-tac-tai-cho',
  ngay: '2026-09-03',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Sổ Bén rễ: bấm vào là đọc được ý tưởng và thu hồi, trả về ngay tại chỗ',
  tomTat:
    'Mỗi dòng trong Sổ Bén rễ nay mở ra được: nội dung ý tưởng, phiếu chấm của Phòng TCTH, '
    + 'ý kiến Giám đốc, phần cán bộ đã bổ sung — và dải nút đúng theo vai: Giám đốc thu hồi '
    + 'công nhận hay mở lại hồ sơ chưa đạt; Phòng TCTH rút, trả về, nuôi dưỡng, dừng. '
    + 'Không phải sang tab khác tìm lại đúng dòng đó nữa.',
  diemChinh: [
    'Bấm cả dòng để mở; có nút «Mở ở bảng tra cứu» để xem đủ bình luận, trao đổi.',
    'Hai quyết định dứt điểm «Công nhận» / «Chưa đạt» vẫn ở hàng chờ có đồng hồ 3 giây — sổ chỉ dẫn sang.',
    'Từ sổ hay từ thông báo mở sang bảng tra cứu thì bảng chỉ hiện đúng ý tưởng đó, có nút xem toàn bộ.',
  ],
  duongDan: '/one/y-tuong/van-hanh?viec=so_ben_re',
};

export default muc;

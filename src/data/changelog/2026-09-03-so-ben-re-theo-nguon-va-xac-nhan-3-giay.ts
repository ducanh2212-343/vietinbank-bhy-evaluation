import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-03-so-ben-re-theo-nguon-va-xac-nhan-3-giay',
  ngay: '2026-09-03',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Sổ Bén rễ theo nguồn công nhận; nút duyệt phải bấm hai nhịp cách 3 giây',
  tomTat:
    'Màn Vận hành có thêm mục «Sổ Bén rễ»: Giám đốc và Phòng TCTH nhìn một chỗ là biết ý '
    + 'tưởng nào lên Bén rễ do Giám đốc duyệt, ý tưởng nào do Trụ sở chính đồng ý, hồ sơ nào '
    + 'đang trả về hay đã bổ sung. Hai nút «Công nhận» và «Chưa đạt» nay bấm một nhịp mới mở '
    + 'nút xác nhận, nút đó khóa 3 giây rồi mới bấm được — đủ để đọc lại tên hồ sơ.',
  diemChinh: [
    'Ba ô tổng ngay đầu sổ: Giám đốc duyệt · Trụ sở chính đồng ý · tổng đã công nhận.',
    'Bộ lọc chín nhóm kèm số lượng, trong đó tách riêng «TCTH trả về» và «Giám đốc trả về».',
    'Mỗi hồ sơ ghi rõ ai quyết, ngày nào, mã SMP nếu có, tiền và KPI đã ghi nhận.',
    'Nút quyết định hai nhịp có đồng hồ — bấm liên tiếp hai lần không có tác dụng.',
  ],
  duongDan: '/one/y-tuong/van-hanh?viec=so_ben_re',
};

export default muc;

import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-03-ket-xuat-so-ghi-nhan-theo-nguon-cong-nhan',
  ngay: '2026-09-03',
  loai: 'tinh-nang',
  phanHe: 'bhy-ways',
  tieuDe: 'Kết xuất Excel sổ ghi nhận mọi cấp, tách Bén rễ do Giám đốc hay do TSC',
  tomTat:
    'Ở mục «Sổ Bén rễ» của màn Vận hành, Giám đốc và Phòng TCTH kết xuất được toàn bộ sổ '
    + 'ghi nhận từ Ươm mầm tới Lan tỏa ra Excel ba sheet: tổng hợp theo cấp và nguồn công '
    + 'nhận (Giám đốc Chi nhánh duyệt, Trụ sở chính đồng ý, cả hai), tổng hợp theo phòng, '
    + 'và chi tiết từng dòng với điểm phiếu, ý kiến, lý do trả về / kết luận.',
  diemChinh: [
    'Sheet «Tổng hợp theo nguồn»: số ý tưởng, số tính KPI và tổng tiền theo từng cấp × nguồn.',
    'Sheet «Theo phòng»: mỗi phòng có bao nhiêu ý tưởng từng cấp và tổng tiền.',
    'Sheet «Chi tiết»: 30 cột, có bộ lọc sẵn, gồm cả mã SMP, điểm TCTH/Giám đốc, lý do trả về, kết luận TCTH.',
  ],
  duongDan: '/one/y-tuong/van-hanh?viec=so_ben_re',
};

export default muc;

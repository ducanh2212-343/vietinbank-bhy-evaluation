import { Flame, Target, UsersRound, type LucideIcon } from 'lucide-react';

/**
 * BỘ 3 CHIÊU THỨC — ba phương thức vận hành cốt lõi của Chi nhánh.
 *
 * Một nguồn dữ liệu cho cả dải giới thiệu trên Trang chủ lẫn menu. Chiêu thức 2
 * và 3 có công cụ riêng nên có `duongDan`; Chiêu thức 1 là nếp sinh hoạt hằng
 * ngày, không có màn hình riêng — để trống thay vì dựng nút dẫn đi đâu cả.
 */

export interface ChieuThuc {
  so: 1 | 2 | 3;
  ten: string;
  dinhVi: string;
  moTa: string;
  icon: LucideIcon;
  accent: string;
  /** Trang giới thiệu / công cụ của chiêu thức */
  duongDan?: string;
  nhanNut?: string;
  /** Nơi làm việc thật, khi khác với trang giới thiệu */
  duongDanLamViec?: string;
  nhanNutLamViec?: string;
}

export const BO_3_CHIEU_THUC: ChieuThuc[] = [
  {
    so: 1,
    ten: 'Năng Lượng Ngày Mới',
    dinhVi: 'Nếp sinh hoạt hằng ngày',
    moTa:
      'Họp đầu ngày 3–5 phút: định hướng tuần, điểm nhanh khách hàng đến hạn, ghi nhận kết quả hôm ' +
      'trước, kết thúc bằng khẩu hiệu chung. Giữ nhịp và giữ lửa cho cả phòng ngay từ sáng.',
    icon: Flame,
    accent: '#E11D48',
  },
  {
    so: 2,
    ten: 'Lập Kế Hoạch — Hành Động',
    dinhVi: 'SWOT → TOWS → 5W2H → PDCA',
    moTa:
      'Từ đánh giá nội tại đến hành động cụ thể, có người chịu trách nhiệm và con số đo được. Kế ' +
      'hoạch của mọi phòng nằm trên một bảng chung, báo nhịp hằng tuần.',
    icon: Target,
    accent: '#0057B8',
    duongDan: '/one/chieu-thuc-2',
    nhanNut: 'Xem kế hoạch hành động',
  },
  {
    so: 3,
    ten: 'Phát Triển Nhân Sự',
    dinhVi: 'Bắc Hưng Yên 3806',
    moTa:
      'Bộ 38 kỹ năng lõi và 06 nhóm thái độ với 4 cấp độ — ngôn ngữ phát triển cán bộ thống nhất ' +
      'toàn Chi nhánh, neo vào phiếu đánh giá và lộ trình phát triển cá nhân.',
    icon: UsersRound,
    accent: '#7C3AED',
    duongDan: '/one/bhy-3806',
    nhanNut: 'Tìm hiểu khung 3806',
    duongDanLamViec: '/tong-quan',
    nhanNutLamViec: 'Vào phân hệ Phát triển nhân sự',
  },
];

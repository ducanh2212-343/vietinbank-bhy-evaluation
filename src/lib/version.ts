/**
 * Phiên bản ứng dụng — LỚP TƯƠNG THÍCH.
 *
 * Lịch sử phiên bản đã chuyển sang `src/lib/lichSuPhienBan.ts` (mỗi lần cập
 * nhật một file trong `src/data/changelog/`, số phiên bản do hệ thống tự tính).
 * File này chỉ còn giữ hai thứ:
 *   1. Các hằng số phiên bản, gọi lại từ nguồn mới — để chỗ nào đang dùng tên cũ
 *      thì vẫn chạy.
 *   2. `APP_FEATURES` — danh mục TÍNH NĂNG CHÍNH (hệ thống làm được gì, ở thì
 *      hiện tại), khác hẳn lịch sử phiên bản (hệ thống vừa có thêm gì, theo thời
 *      gian). Hai thứ này trả lời hai câu hỏi khác nhau nên để riêng.
 *
 * KHÔNG thêm mục lịch sử vào đây nữa — xem `src/lib/lichSuPhienBan.ts`.
 */
import {
  LICH_SU_PHIEN_BAN, PHIEN_BAN_HIEN_TAI, NGAY_PHIEN_BAN, LOAI_PHIEN_BAN,
} from './lichSuPhienBan';

export type { LoaiThayDoi as VersionType, MucPhienBan as VersionEntry } from './lichSuPhienBan';

export const APP_VERSION = PHIEN_BAN_HIEN_TAI;
export const APP_VERSION_DATE = NGAY_PHIEN_BAN;
export const APP_VERSION_TYPE = LOAI_PHIEN_BAN;
export const VERSION_HISTORY = LICH_SU_PHIEN_BAN;

/** Nhóm tính năng chính — hiển thị ở trang Cài đặt để người dùng nắm được hệ thống làm được gì. */
export interface FeatureGroup {
  title: string;
  desc: string;
}

export const APP_FEATURES: FeatureGroup[] = [
  {
    title: 'Cổng Bắc Hưng Yên ONE',
    desc: 'Một cửa vào sau đăng nhập: việc của tôi, tin tức nội bộ, bản sắc 20 năm, Kho Dữ Liệu và các thương hiệu Bắc Hưng Yên Ways.',
  },
  {
    title: 'Chiêu thức 2 — Kanban 5W2H + PDCA',
    desc: 'Bàn đầu việc của phòng và bàn Phê duyệt tín dụng: một người chịu trách nhiệm, cổng chặn PDCA, ghi nhịp hằng ngày, nhắc nhịp sáng 07:30.',
  },
  {
    title: 'Chiêu thức 3 — Phát triển nhân sự',
    desc: '38 kỹ năng (4 nhóm, 4 cấp độ) và 6 nhóm thái độ, quy trình duyệt 3 cấp, kế hoạch phát triển 70/20/10 kèm Kanban hành động.',
  },
  {
    title: 'BHY Ideas & Hội đồng đầu mối',
    desc: 'Gửi ý tưởng, Hội đồng chấm theo bộ câu hỏi Phụ lục 06, sổ ghi nhận thưởng lũy kế và KPI Đổi mới sáng tạo.',
  },
  {
    title: 'Trợ lý AI',
    desc: 'Chân dung năng lực tổng thể, gợi ý kế hoạch hành động 70/20/10, gợi ý khóa học Trường ĐT VietinBank; admin bật/tắt và định mức chi phí từng tác vụ.',
  },
  {
    title: 'Quản trị đội ngũ & tài khoản khách',
    desc: 'Tạo tài khoản đơn lẻ/hàng loạt, phân quyền, cấp tài khoản khách đối tác có hạn và chọn màn hình mở cho từng khách.',
  },
  {
    title: 'Thông báo & biểu mẫu',
    desc: 'Chuông trong ứng dụng và thông báo đẩy theo chuẩn hình thức chung; biểu mẫu BM01/02/03 theo kỳ, xuất phiếu ra file Word.',
  },
];

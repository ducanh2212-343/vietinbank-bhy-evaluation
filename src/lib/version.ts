/**
 * Quy ước phiên bản X.Y.Z (Semantic Versioning)
 * - X (Major): thay đổi lớn — thêm module mới, đổi diện rộng, thay đổi cấu trúc dữ liệu.
 * - Y (Minor): thêm tính năng, cải tiến UX/UI một khu vực.
 * - Z (Patch): sửa lỗi, tinh chỉnh giao diện/nội dung.
 *
 * Khi cập nhật: bump APP_VERSION, cập nhật ngày, thêm 1 entry vào ĐẦU VERSION_HISTORY.
 */

export type VersionType = 'major' | 'minor' | 'patch';

export interface VersionEntry {
  version: string;
  date: string; // dd/mm/yyyy
  type: VersionType;
  summary: string;
}

/** Nhóm tính năng chính — hiển thị ở trang Cài đặt để người dùng nắm được hệ thống làm được gì. */
export interface FeatureGroup {
  title: string;
  desc: string;
}

export const APP_FEATURES: FeatureGroup[] = [
  {
    title: 'Tự đánh giá năng lực',
    desc: '38 kỹ năng (4 nhóm, 4 cấp độ) và 6 nhóm thái độ; nhập minh chứng, chọn điểm cần cải thiện.',
  },
  {
    title: 'Quy trình duyệt 3 cấp',
    desc: 'Cán bộ tự đánh giá → Trưởng phòng rà soát → PGĐ phê duyệt; hỗ trợ trả lại và nộp lại.',
  },
  {
    title: 'Kế hoạch phát triển (IDP)',
    desc: 'Tối đa 3 kỹ năng trọng tâm theo mô hình 70/20/10, kèm bảng Kanban theo dõi hành động.',
  },
  {
    title: 'Trợ lý AI',
    desc: 'Chân dung năng lực tổng thể, gợi ý kế hoạch hành động 70/20/10, gợi ý khóa học Trường ĐT VietinBank; admin bật/tắt từng tác vụ.',
  },
  {
    title: 'Quản trị đội ngũ',
    desc: 'Tạo tài khoản đơn lẻ/hàng loạt, phân quyền, phân nhóm sao, báo cáo tổng hợp theo phạm vi.',
  },
  {
    title: 'Biểu mẫu & xuất Word',
    desc: 'Biểu mẫu BM01/02/03 theo kỳ và xuất phiếu đánh giá ra file Word.',
  },
];

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '3.1.1',
    date: '05/07/2026',
    type: 'patch',
    summary: 'Mục D tự điền level hiện tại từ mục B hoặc từ phiếu đánh giá gần nhất — cán bộ không phải tự nhập lại level, tránh sai lệch.',
  },
  {
    version: '3.1.0',
    date: '04/07/2026',
    type: 'minor',
    summary: 'Thêm nút "Gợi ý kế hoạch hành động" 70/20/10 bằng AI cho từng skill ưu tiên; nút AI tự ẩn khi quản trị viên tắt tác vụ tại Quản trị AI.',
  },
  {
    version: '3.0.0',
    date: '04/07/2026',
    type: 'major',
    summary: 'Bộ nhận diện "Cây ký ức 20 năm": bảng màu, huy hiệu, banner; menu tinh gọn theo thực tế sử dụng; giao diện đa nền tảng laptop/iPad/điện thoại.',
  },
  {
    version: '2.4.0',
    date: '04/07/2026',
    type: 'minor',
    summary: 'Trợ lý AI gắn linh vật: tư vấn kỹ năng, chân dung năng lực, gợi ý khóa học; lưu chân dung dùng chung, giới hạn lượt & ẩn thông tin cá nhân khi gọi AI.',
  },
  {
    version: '2.3.0',
    date: '04/07/2026',
    type: 'minor',
    summary: 'Quản trị AI chủ động: chọn nhà cung cấp (Gemini/OpenAI/Lovable/tùy chỉnh), tự nhập API key và chọn model theo chi phí.',
  },
  {
    version: '2.2.0',
    date: '03/07/2026',
    type: 'minor',
    summary: 'Tạo tài khoản cán bộ đơn lẻ & hàng loạt (bắt buộc phòng ban/vị trí); chuẩn hóa luồng duyệt và trạng thái phiếu.',
  },
  {
    version: '2.1.0',
    date: '03/07/2026',
    type: 'patch',
    summary: 'Sửa checklist thái độ: minh chứng chỉ bắt buộc với nhóm "Nổi bật/Cần cải thiện"; đồng bộ dữ liệu thái độ giữa cán bộ và trưởng phòng.',
  },
  {
    version: '2.0.0',
    date: '24/05/2026',
    type: 'major',
    summary: 'Áp dụng quy ước version X.Y.Z, cải tiến biểu mẫu đánh giá và trải nghiệm trên điện thoại.',
  },
  {
    version: '1.0.0',
    date: '01/04/2026',
    type: 'major',
    summary: 'Phiên bản đầu tiên: 38 kỹ năng, 6 nhóm thái độ, kế hoạch phát triển IDP, hồ sơ cá nhân.',
  },
];

export const APP_VERSION = VERSION_HISTORY[0].version;
export const APP_VERSION_DATE = VERSION_HISTORY[0].date;
export const APP_VERSION_TYPE = VERSION_HISTORY[0].type;

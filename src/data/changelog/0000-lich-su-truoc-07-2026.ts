/**
 * LƯU TRỮ — lịch sử phiên bản trước 07/2026, thời còn là app "343 Phát triển
 * nhân sự" thuần (chưa có cổng BHY ONE).
 *
 * Đây là file DUY NHẤT chứa nhiều mục: các mục này mang số phiên bản đã từng
 * hiện cho cán bộ xem nên phải giữ nguyên bằng `phienBanCoDinh`, và chúng sẽ
 * không bao giờ được sửa nữa. Mục MỚI luôn là một file riêng — xem
 * `src/lib/lichSuPhienBan.ts` để biết vì sao.
 */
import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu[] = [
  {
    ma: '2026-04-01-phien-ban-dau-tien',
    ngay: '2026-04-01',
    loai: 'lon',
    phanHe: 'hr-343',
    phienBanCoDinh: '1.0.0',
    tieuDe: 'Phiên bản đầu tiên: tự đánh giá 38 kỹ năng trên hệ thống',
    tomTat:
      'Đưa khung năng lực của Chi nhánh lên hệ thống thay cho bản Word gửi qua email: '
      + '38 kỹ năng theo 4 cấp độ, 6 nhóm thái độ, kế hoạch phát triển cá nhân và hồ sơ cán bộ.',
    diemChinh: [
      'Tự chấm 38 kỹ năng theo 4 cấp độ, có mô tả từng cấp để chọn cho đúng',
      'Sáu nhóm thái độ – hành vi kèm ô ghi minh chứng',
      'Kế hoạch phát triển cá nhân (IDP) và hồ sơ năng lực của từng người',
    ],
  },
  {
    ma: '2026-05-24-quy-uoc-phien-ban',
    ngay: '2026-05-24',
    loai: 'lon',
    phanHe: 'hr-343',
    phienBanCoDinh: '2.0.0',
    tieuDe: 'Chuẩn hóa biểu mẫu đánh giá và trải nghiệm trên điện thoại',
    tomTat:
      'Áp quy ước số phiên bản X.Y.Z, sửa lại biểu mẫu đánh giá theo góp ý đợt đầu '
      + 'và làm lại giao diện cho vừa màn hình điện thoại.',
    diemChinh: [
      'Biểu mẫu đánh giá gọn lại theo góp ý sau kỳ dùng thử',
      'Nhập trên điện thoại không còn vỡ khung, cuộn ngang',
    ],
  },
  {
    ma: '2026-07-03-a-checklist-thai-do',
    ngay: '2026-07-03',
    loai: 'sua-loi',
    phanHe: 'hr-343',
    phienBanCoDinh: '2.1.0',
    tieuDe: 'Minh chứng thái độ chỉ bắt buộc với nhóm Nổi bật / Cần cải thiện',
    tomTat:
      'Trước đây nhóm thái độ nào cũng đòi minh chứng nên cán bộ phải viết cho đủ sáu ô. '
      + 'Nay chỉ nhóm được chấm "Nổi bật" hoặc "Cần cải thiện" mới phải nêu minh chứng.',
    diemChinh: [
      'Bớt 4 ô minh chứng bắt buộc trong mục thái độ',
      'Dữ liệu thái độ giữa phiếu cán bộ và phiếu trưởng phòng khớp nhau',
    ],
  },
  {
    ma: '2026-07-03-b-tao-tai-khoan',
    ngay: '2026-07-03',
    loai: 'tinh-nang',
    phanHe: 'user-admin',
    phienBanCoDinh: '2.2.0',
    tieuDe: 'Tạo tài khoản cán bộ đơn lẻ và hàng loạt',
    tomTat:
      'Phòng Tổ chức Tổng hợp tự cấp tài khoản cho cán bộ mới ngay trên hệ thống, '
      + 'một người một lần hoặc cả danh sách theo phòng.',
    diemChinh: [
      'Tạo từng tài khoản hoặc nhập cả danh sách theo phòng',
      'Bắt buộc chọn phòng ban và vị trí khi tạo — hết tài khoản "trôi nổi"',
      'Chuẩn hóa luồng duyệt và trạng thái phiếu đánh giá',
    ],
    danhCho: ['system_admin', 'tcth_admin', 'bgd'],
  },
  {
    ma: '2026-07-04-a-quan-tri-ai',
    ngay: '2026-07-04',
    loai: 'tinh-nang',
    phanHe: 'hr-343',
    phienBanCoDinh: '2.3.0',
    tieuDe: 'Quản trị viên tự chọn nhà cung cấp AI và mô hình theo chi phí',
    tomTat:
      'Màn hình Quản trị AI cho phép chọn Gemini / OpenAI / Lovable / gateway tùy chỉnh, '
      + 'tự nhập khóa và chọn mô hình theo mức chi phí.',
    diemChinh: [
      'Đổi nhà cung cấp AI không cần phát hành bản mới',
      'Chọn mô hình theo chi phí từng tác vụ',
    ],
    danhCho: ['system_admin', 'tcth_admin', 'bgd'],
  },
  {
    ma: '2026-07-04-b-tro-ly-ai',
    ngay: '2026-07-04',
    loai: 'tinh-nang',
    phanHe: 'hr-343',
    phienBanCoDinh: '2.4.0',
    tieuDe: 'Trợ lý AI: chân dung năng lực, tư vấn kỹ năng, gợi ý khóa học',
    tomTat:
      'Trợ lý AI gắn linh vật đọc phiếu của chính mình để dựng chân dung năng lực tổng thể '
      + 'và gợi ý khóa học của Trường Đào tạo VietinBank.',
    diemChinh: [
      'Chân dung năng lực tổng thể lưu lại dùng chung, không phải hỏi lại mỗi lần',
      'Gợi ý khóa học theo kỹ năng còn thiếu',
      'Ẩn thông tin cá nhân khi gọi AI và giới hạn số lượt mỗi người',
    ],
  },
  {
    ma: '2026-07-04-c-cay-ky-uc-nhan-dien',
    ngay: '2026-07-04',
    loai: 'lon',
    phanHe: 'nen-tang',
    phienBanCoDinh: '3.0.0',
    tieuDe: 'Bộ nhận diện "Cây ký ức 20 năm" cho toàn hệ thống',
    tomTat:
      'Đổi bảng màu, huy hiệu và banner theo bộ nhận diện 20 năm Chi nhánh; '
      + 'menu tinh gọn lại theo những mục thực sự được dùng.',
    diemChinh: [
      'Bảng màu, huy hiệu, banner theo bộ nhận diện 20 năm',
      'Menu bỏ bớt mục không ai dùng',
      'Giao diện chạy đủ trên laptop, iPad và điện thoại',
    ],
  },
  {
    ma: '2026-07-04-d-goi-y-ke-hoach-70-20-10',
    ngay: '2026-07-04',
    loai: 'tinh-nang',
    phanHe: 'hr-343',
    phienBanCoDinh: '3.1.0',
    tieuDe: 'Nút "Gợi ý kế hoạch hành động" 70/20/10 cho từng kỹ năng ưu tiên',
    tomTat:
      'Với mỗi kỹ năng chọn làm trọng tâm, AI đề xuất sẵn một kế hoạch theo mô hình 70/20/10 '
      + 'để cán bộ sửa lại thành của mình thay vì ngồi trước ô trống.',
    diemChinh: [
      'Gợi ý kế hoạch 70/20/10 cho từng kỹ năng ưu tiên',
      'Nút AI tự ẩn khi quản trị viên tắt tác vụ tại màn Quản trị AI',
    ],
  },
  {
    ma: '2026-07-05-tu-dien-level-hien-tai',
    ngay: '2026-07-05',
    loai: 'sua-loi',
    phanHe: 'hr-343',
    phienBanCoDinh: '3.1.1',
    tieuDe: 'Mục D tự điền cấp độ hiện tại, không phải nhập lại',
    tomTat:
      'Cấp độ hiện tại ở mục D được lấy sẵn từ mục B hoặc từ phiếu đánh giá gần nhất, '
      + 'tránh cảnh cùng một kỹ năng mà hai chỗ ghi hai cấp độ khác nhau.',
    diemChinh: [
      'Cấp độ hiện tại tự điền từ mục B hoặc phiếu gần nhất',
      'Hết lệch số liệu giữa mục B và mục D',
    ],
  },
];

export default muc;

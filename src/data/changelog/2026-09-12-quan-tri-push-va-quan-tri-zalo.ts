import type { MucLichSu } from '@/lib/lichSuPhienBan';

const muc: MucLichSu = {
  ma: '2026-09-12-quan-tri-push-va-quan-tri-zalo',
  ngay: '2026-09-12',
  loai: 'tinh-nang',
  phanHe: 'nen-tang',
  tieuDe: 'Khu Hệ thống có thêm «Quản trị Push» và «Quản trị Zalo»',
  tomTat:
    'Trước đây muốn biết cổng đã phát bao nhiêu thông báo, ai bật push hay loại tin nào '
    + 'chiếm nhiều nhất thì phải hỏi kỹ thuật tra tay. Nay TCTH và Ban Giám đốc xem thẳng '
    + 'trên cổng, và kênh Zalo OA của chi nhánh có một chỗ quản lý riêng: token, nhóm nhận tin, '
    + 'gói cước và nhật ký gửi.',
  diemChinh: [
    'Quản trị Push: số cán bộ bật push theo phòng, số tin theo loại và theo ngày, tỷ lệ mở đọc, lịch phát tự động — chỉ con số, không có nội dung tin.',
    'Quản trị Zalo: nạp Secret Key, đổi mã ủy quyền lấy token, theo dõi lịch gia hạn 6 tiếng/lần, chọn nhóm GMF, gửi tin thử.',
    'Đối chiếu số tin đã gửi qua Zalo với hạn mức và phí gói cước, tính phí bình quân mỗi tin, nhắc trước khi gói hết hạn.',
    'Công tắc «Đẩy tin Sao Xứng Đáng vào nhóm Zalo» để bật khi mẫu tin được duyệt.',
  ],
  duongDan: '/quan-tri-zalo',
  danhCho: ['tcth_admin', 'system_admin', 'bgd'],
};

export default muc;

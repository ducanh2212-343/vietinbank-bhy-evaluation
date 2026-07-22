-- Bộ tip khởi tạo — admin chỉnh sửa/thêm bớt tại /quan-ly-meo-tinh-nang.
-- Chỉ seed khi bảng còn trống để chạy lại migration không nhân bản dữ liệu.

INSERT INTO public.feature_tips (title, content, cta_url, cta_label, target_roles, display_mode, priority)
SELECT * FROM (VALUES
  (
    'Chiến dịch học tập tập thể',
    'Cả phòng cùng nâng một kỹ năng lên mức mục tiêu trong một mùa chiến dịch. Tiến trình tính theo **thành tựu tập thể** — không xếp hạng cá nhân. Vào xem phòng bạn đang tham gia chiến dịch nào nhé!',
    '/chien-dich-hoc-tap', 'Xem chiến dịch',
    '{}'::app_role[], 'modal', 100
  ),
  (
    'Bộ sưu tập huy hiệu năng lực',
    'Mỗi lần phiếu đánh giá được duyệt với level cao hơn, bạn mở khoá một huy hiệu mới trong hồ sơ cá nhân. Ghé xem bộ sưu tập của mình và mục tiêu bậc kế tiếp.',
    '/ho-so-ca-nhan', 'Xem huy hiệu',
    '{}'::app_role[], 'banner', 40
  ),
  (
    'Hành động phát triển (Kanban cá nhân)',
    'Tự tạo thẻ việc cần làm để nâng kỹ năng — kéo thả theo tiến độ, hoàn thành thì quản lý xác nhận. Cách đơn giản để biến kế hoạch phát triển thành việc làm hằng tuần.',
    '/hanh-dong-phat-trien', 'Mở Kanban',
    '{employee}'::app_role[], 'banner', 30
  ),
  (
    'Bật thông báo trên điện thoại',
    'Bật thông báo đẩy để nhận nhắc nộp phiếu, thẻ Kanban chờ xác nhận... ngay trên điện thoại — không sợ trôi email. Trên iPhone: thêm app vào màn hình chính trước rồi bật.',
    '/tong-quan', 'Bật ngay',
    '{employee}'::app_role[], 'banner', 20
  ),
  (
    'Theo dõi & duyệt phiếu đánh giá',
    'Màn hình tổng hợp phiếu của cả phòng theo trạng thái: chưa nộp, chờ rà soát, chờ phê duyệt. Xử lý phiếu tồn ngay tại một nơi thay vì mở từng hồ sơ.',
    '/danh-gia-can-bo', 'Mở màn hình duyệt',
    '{manager,pgd}'::app_role[], 'banner', 50
  ),
  (
    'Báo cáo nộp biểu mẫu thời gian thực',
    'Xem tỷ lệ nộp phiếu của phòng/khối theo thời gian thực, ai nộp muộn, ai chưa nộp — số liệu cập nhật liên tục trong kỳ đánh giá.',
    '/bao-cao-nop-bieu-mau', 'Xem báo cáo',
    '{manager,pgd}'::app_role[], 'banner', 40
  ),
  (
    'Quản lý kỳ đánh giá & hạn nộp',
    'Mở/đóng kỳ đánh giá, đặt hạn nộp chính thức (submission deadline) — hạn này điều khiển toàn bộ nhắc việc tự động qua email và push.',
    '/quan-ly-ky-danh-gia', 'Quản lý kỳ',
    '{bgd,tcth_admin,system_admin}'::app_role[], 'banner', 50
  ),
  (
    'Bản tin quý AI cho từng cán bộ',
    'Hệ thống tự soạn bản tin quý cá nhân hoá bằng AI: kết quả kỳ đánh giá, điểm sáng và gợi ý phát triển cho từng cán bộ. Admin duyệt trước khi gửi.',
    '/ban-tin-quy', 'Mở bản tin quý',
    '{bgd,tcth_admin,system_admin}'::app_role[], 'banner', 40
  )
) AS seed(title, content, cta_url, cta_label, target_roles, display_mode, priority)
WHERE NOT EXISTS (SELECT 1 FROM public.feature_tips);

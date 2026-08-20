-- ─────────────────────────────────────────────────────────────────────────────
-- PUSH: GHI LẠI LỖI GỬI THAY VÌ NUỐT LẶNG LẼ
--
-- Giám đốc báo (07/08/2026): iPhone và iPad không nhận được push, dù đăng ký
-- iPhone vẫn `is_active = true` từ 19/07 và mọi tin đều được đóng dấu «đã gửi».
--
-- Truy ra điểm mù trong `notify-ct2`: vòng gửi chỉ xử lý hai nhánh —
--     if (res.status === 404 || res.status === 410) → tắt đăng ký
--     else if (res.ok) → đếm là đã gửi
-- Mọi mã lỗi KHÁC (400 payload sai, 403 VAPID không hợp lệ, 413 quá dài,
-- 429 quá tần suất…) rơi vào khoảng trống: không tắt đăng ký, không đếm,
-- không ghi log. Kết quả là bảng điều khiển báo «máy còn sống», hàng đợi báo
-- «đã gửi», còn màn hình khóa thì im lặng — không có chỗ nào để truy.
--
-- Hai cột này cho phép phân biệt ba trạng thái mà trước đây gộp làm một:
--   · is_active = false            → endpoint đã chết, đã tắt đúng luật
--   · is_active, loi_cuoi IS NULL  → lần gửi gần nhất THÀNH CÔNG
--   · is_active, loi_cuoi có giá trị → máy đang TỪ CHỐI, còn nguyên lý do
--
-- Hàm notify-ct2 xoá `loi_cuoi` ngay khi máy nhận lại được, để một lần trục
-- trặc không đeo bám mãi rồi bị đọc nhầm là hỏng.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS loi_cuoi text,
  ADD COLUMN IF NOT EXISTS loi_luc timestamptz;

COMMENT ON COLUMN public.push_subscriptions.loi_cuoi IS
  'Nguyên văn lỗi lần gửi gần nhất (mã trạng thái + thân phản hồi). NULL = lần gửi gần nhất thành công.';
COMMENT ON COLUMN public.push_subscriptions.loi_luc IS
  'Thời điểm ghi lỗi gần nhất. Đăng ký còn is_active mà có loi_cuoi = máy đang từ chối nhận, cần xem lại.';

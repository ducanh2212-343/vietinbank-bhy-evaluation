-- Gia cố bảo mật & toàn vẹn dữ liệu (đợt rà soát trước triển khai chính thức)
-- 1) Thu hồi quyền gọi trực tiếp các hàm SECURITY DEFINER nhạy cảm từ REST API.
-- 2) Cố định search_path cho nhóm hàm hàng đợi email (fix cảnh báo function_search_path_mutable).
-- 3) Ràng buộc DUY NHẤT 1 phiếu / cán bộ / kỳ đánh giá.
--
-- Lưu ý: hàm mới tạo mặc định có EXECUTE cho PUBLIC → phải REVOKE cả PUBLIC,
-- không chỉ anon/authenticated, rồi cấp lại có kiểm soát.

-- ============================================================
-- 1. Hàm hàng đợi EMAIL: chỉ edge function (service_role) được gọi.
--    Các hàm dùng lời gọi pgmq.* schema-qualified nên cố định search_path là an toàn.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = pg_catalog, pg_temp;

-- ============================================================
-- 2. Hàm Kanban SECURITY DEFINER: người CHƯA đăng nhập (anon) không được gọi.
--    5 hàm client gọi hợp lệ → cấp lại cho authenticated.
--    kanban_upsert_card chỉ chạy nội bộ trong trigger (dưới quyền definer) → không cấp cho ai.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.move_kanban_card(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_kanban_progress(uuid, integer, text, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_kanban_completion(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_kanban_completion(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.return_kanban_card(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.kanban_upsert_card(text, uuid, text, uuid, text, uuid, integer, text, date) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.move_kanban_card(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_kanban_progress(uuid, integer, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_kanban_completion(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_kanban_completion(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_kanban_card(uuid, text) TO authenticated;

-- ============================================================
-- 2b. Các hàm TRIGGER: chỉ chạy trong ngữ cảnh trigger (dưới quyền chủ bảng),
--     không nơi nào gọi .rpc() trực tiếp → thu hồi hoàn toàn khỏi API.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.check_status_transition() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kanban_archive_on_source_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kanban_cards_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_self_update_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_form_reviewer_on_profile_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_kanban_ai_action() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_kanban_attitude_action() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_kanban_carryover() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_kanban_skill_action() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_manager_role_from_position() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3. Chống sinh phiếu trùng cho cùng cán bộ trong cùng kỳ đánh giá.
--    (Đã kiểm tra tại thời điểm rà soát: không có cặp (employee_id, cycle_id) trùng.)
-- ============================================================
ALTER TABLE public.form_submissions
  ADD CONSTRAINT form_submissions_employee_cycle_unique UNIQUE (employee_id, cycle_id);

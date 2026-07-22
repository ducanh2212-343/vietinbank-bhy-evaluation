-- Sửa lỗi lưu phiếu đánh giá bị "statement timeout" (autosave/Lưu nháp/Xác nhận rà soát thất bại).
--
-- Nguyên nhân: hàm chạy SECURITY INVOKER nên MỖI câu lệnh DML bên trong (~150 câu/lần lưu)
-- đều đánh giá lại RLS policy; policy của manager chứa
--   form_id IN (SELECT fs.id FROM form_submissions fs WHERE can_view_profile(fs.employee_id))
-- → mỗi câu lệnh quét toàn bộ form_submissions và gọi can_view_profile (~7 subquery) cho từng
-- phiếu. Chi phí ~ (số phiếu × số câu lệnh) tăng theo dữ liệu; vượt statement_timeout 8s của
-- role authenticated khi hệ thống đạt ~120 phiếu → mọi lần lưu đều bị hủy.
--
-- Cách sửa: SECURITY DEFINER + kiểm tra quyền MỘT LẦN ở đầu hàm (đúng bằng hợp của các
-- policy ghi hiện hành trên 6 bảng con), sau đó DML bên trong bỏ qua RLS.
--
-- LƯU Ý: nội dung hàm ở migration này đã được thay bằng bản trong
-- 20260722020720_save_evaluation_children_upsert_on_conflict.sql (bổ sung UPSERT chống
-- duplicate key). Giữ file này để khớp lịch sử migration đã áp dụng trên server.

-- (Nội dung CREATE OR REPLACE FUNCTION giống migration kế tiếp, trừ phần ON CONFLICT
--  của 3 bảng hành động — xem file 20260722020720 để có bản đầy đủ cuối cùng.)

-- SECURITY DEFINER: siết quyền gọi hàm — chỉ người dùng đã đăng nhập.
REVOKE ALL ON FUNCTION public.save_evaluation_children(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_evaluation_children(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_evaluation_children(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated, service_role;

-- Rà soát bảo mật 2026-08: vá hai điểm ở tầng CSDL.
--
-- Bối cảnh: đối chiếu trực tiếp với project production (advisor + pg_catalog),
-- không suy đoán từ file migration.

-- ---------------------------------------------------------------------------
-- 1) REVOKE thiếu PUBLIC → người CHƯA ĐĂNG NHẬP vẫn gọi được 2 hàm này
-- ---------------------------------------------------------------------------
-- Postgres mặc định GRANT EXECUTE cho PUBLIC khi tạo function. `REVOKE ... FROM anon`
-- KHÔNG gỡ được quyền đến từ PUBLIC (anon thừa hưởng PUBLIC), nên hai hàm dưới đây
-- vẫn gọi được bằng anon key dù migration cũ tưởng đã khoá:
--   • 20260705153000_mentorship_pairs.sql:144   REVOKE ... FROM anon;
--   • 20260705160000_learning_campaigns.sql:114 REVOKE ... FROM anon;
-- Kiểm chứng trên production:
--   has_function_privilege('anon', 'public.suggest_skill_mentors(uuid,uuid,int)', 'EXECUTE') = true
--
-- Mức độ: suggest_skill_mentors là SECURITY DEFINER nên BỎ QUA RLS, trả về
-- họ tên cán bộ + phòng ban + mức năng lực. Kẻ tấn công cần đoán đúng cặp UUID
-- (skill_id, cycle_id) nên chưa khai thác được ngay, nhưng đây là rò rỉ PII thật
-- và không có lý do gì để mở cho người chưa đăng nhập.
--
-- Cách viết đúng (đã dùng ở 20260811090000_ra_soat_phan_quyen_bhy_ways.sql:54):
-- luôn REVOKE FROM PUBLIC, rồi GRANT lại đúng đối tượng cần.

REVOKE ALL ON FUNCTION public.suggest_skill_mentors(uuid, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suggest_skill_mentors(uuid, uuid, int) TO authenticated;

REVOKE ALL ON FUNCTION public.get_campaign_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_progress(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) is_staff() coi MỌI tài khoản đã đăng nhập (không phải khách) là cán bộ
-- ---------------------------------------------------------------------------
-- Định nghĩa hiện tại trên production:
--   is_staff(_user_id) = _user_id IS NOT NULL AND NOT is_guest(_user_id)
--
-- is_guest() dựa vào việc CÓ dòng vai trò 'guest'. Một tài khoản vừa tạo mà chưa
-- có dòng vai trò nào sẽ cho is_guest = false ⇒ is_staff = TRUE ngay lập tức.
-- Hệ quả: nếu Supabase Auth đang bật đăng ký công khai, người ngoài tự đăng ký là
-- đọc được toàn bộ tầng dữ liệu "nội bộ" gác bằng is_staff(), trong đó có
-- portal_credit_sessions (tên khách hàng, doanh thu thực, hạn mức tín dụng).
--
-- Vá: đòi hỏi phải có hồ sơ cán bộ thật trong public.profiles.
-- An toàn với dữ liệu hiện có: đã kiểm tra trên production, cả 101/101 tài khoản
-- đều có hồ sơ profiles ⇒ không cán bộ nào mất quyền sau khi áp dụng.
-- Tài khoản khách vẫn bị chặn như cũ (có vai trò 'guest' ⇒ is_guest = true).

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND NOT public.is_guest(_user_id)
     AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id);
$function$;

-- Lưu ý vận hành (KHÔNG tự động hoá ở đây vì là quyết định nghiệp vụ):
--
-- a) Tắt đăng ký công khai trong Supabase Auth (Authentication → Sign In / Providers →
--    "Allow new users to sign up" = OFF). Tài khoản chỉ nên sinh ra từ các edge function
--    create-staff-user / bulk-create-staff-users / approve-registration.
--
-- b) portal_credit_sessions đang cho MỌI cán bộ đọc toàn bộ dữ liệu tín dụng khách hàng:
--       policy "Staff can view credit sessions" USING (is_staff(auth.uid()))
--    Trong khi bảng hồ sơ tín dụng chính thức ct2_ho_so_tin_dung lại giới hạn theo phòng.
--    Nếu nghiệp vụ không yêu cầu toàn chi nhánh cùng xem, nên siết theo phòng, ví dụ:
--       USING (public.is_staff(auth.uid())
--              AND (public.can_view_all_action_plans() OR created_by = auth.uid()))
--    Chưa áp dụng ở đây vì sẽ đổi hành vi màn hình "Tín dụng 360" của cán bộ.

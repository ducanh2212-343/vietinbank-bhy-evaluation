-- system_admin PHẢI BAO TRÙM mọi quyền (27/07/2026)
--
-- user_roles có UNIQUE(user_id) → mỗi tài khoản chỉ mang MỘT quyền. Khi hợp nhất tài
-- khoản quản trị riêng vào tài khoản Giám đốc (bgd → system_admin), phát hiện 13 policy
-- chỉ liệt kê 'bgd'/'tcth_admin' mà QUÊN 'system_admin' — lỗ hổng thiết kế sẵn có:
-- quyền cao nhất lại không ghi được nội dung phiếu đánh giá (skill_assessments,
-- form_skill_actions, form_attitude_*, ai_actions, kpi_items, behavior_notes…).
--
-- Bản vá chỉ MỞ RỘNG (thêm OR system_admin), không thu hẹp quyền của ai.
DO $$
DECLARE r record; v_cond text := 'public.has_role(auth.uid(), ''system_admin''::app_role)';
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (coalesce(qual,'') || coalesce(with_check,'')) LIKE '%''bgd''%'
       AND (coalesce(qual,'') || coalesce(with_check,'')) NOT LIKE '%system_admin%'
  LOOP
    IF r.qual IS NOT NULL AND r.with_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s OR %s) WITH CHECK (%s OR %s)',
                     r.policyname, r.schemaname, r.tablename, r.qual, v_cond, r.with_check, v_cond);
    ELSIF r.qual IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s OR %s)',
                     r.policyname, r.schemaname, r.tablename, r.qual, v_cond);
    ELSIF r.with_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s OR %s)',
                     r.policyname, r.schemaname, r.tablename, r.with_check, v_cond);
    END IF;
  END LOOP;
END $$;

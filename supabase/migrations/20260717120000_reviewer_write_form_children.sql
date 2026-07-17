-- Sửa lỗi "new row violates row-level security policy for table skill_assessments"
-- khi Trưởng phòng/BGĐ duyệt phiếu.
--
-- Nguyên nhân: các bảng con của phiếu (skill_assessments, form_skill_*, ...) chỉ cho
-- GHI với: chính chủ phiếu, system_admin, hoặc manager/pgd cùng phạm vi phòng.
-- Người duyệt được giao (form_submissions.reviewer_id) chỉ được XEM; người có role
-- bgd/tcth_admin (Trưởng phòng TCTH, Ban Giám đốc) không ghi được dù đã sửa được
-- chính form_submissions. Hệ quả: bấm "Lưu nháp" trên trang duyệt là dính lỗi RLS.
--
-- Khắc phục: thêm policy ghi cho (a) người duyệt được giao của đúng phiếu đó,
-- (b) role bgd/tcth_admin — đồng bộ với quyền đã có trên form_submissions.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'skill_assessments','form_skill_priorities','form_skill_actions',
    'form_attitude_priorities','form_attitude_actions','form_ai_actions_v2',
    'form_previous_action_reviews','kpi_items','recognition_items',
    'reflection_answers','development_actions','ai_actions'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Reviewers and HR admins manage %1$s" ON public.%1$I', t);
    EXECUTE format($f$
      CREATE POLICY "Reviewers and HR admins manage %1$s"
        ON public.%1$I FOR ALL TO authenticated
        USING (
          public.has_role(auth.uid(), 'bgd'::app_role)
          OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
          OR form_id IN (
            SELECT fs.id FROM public.form_submissions fs
            WHERE fs.reviewer_id = public.get_my_profile_id()
          )
        )
        WITH CHECK (
          public.has_role(auth.uid(), 'bgd'::app_role)
          OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
          OR form_id IN (
            SELECT fs.id FROM public.form_submissions fs
            WHERE fs.reviewer_id = public.get_my_profile_id()
          )
        )
    $f$, t);
  END LOOP;
END $$;

-- admin_evaluations (xếp loại + nhận xét của Trưởng phòng): manager/pgd trong phạm vi
-- và người duyệt được giao hiện chỉ được SELECT — insert/update từ trang duyệt bị RLS
-- chặn im lặng (code cũ không kiểm tra lỗi). Bổ sung quyền ghi tương ứng.
DROP POLICY IF EXISTS "Scope managers manage admin_evaluations" ON public.admin_evaluations;
CREATE POLICY "Scope managers manage admin_evaluations"
  ON public.admin_evaluations FOR ALL TO authenticated
  USING (
    (
      (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
      AND public.can_view_profile(employee_id)
    )
    OR employee_id IN (
      SELECT fs.employee_id FROM public.form_submissions fs
      WHERE fs.reviewer_id = public.get_my_profile_id()
    )
  )
  WITH CHECK (
    (
      (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
      AND public.can_view_profile(employee_id)
    )
    OR employee_id IN (
      SELECT fs.employee_id FROM public.form_submissions fs
      WHERE fs.reviewer_id = public.get_my_profile_id()
    )
  );

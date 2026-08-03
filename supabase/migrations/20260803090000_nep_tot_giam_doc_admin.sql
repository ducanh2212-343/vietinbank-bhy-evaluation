-- ============================================================================
-- NẾP TỐT — Giám đốc chi nhánh dùng tài khoản admin vẫn ghi nhận được
--
-- Bối cảnh: hệ thống chỉ cho MỖI USER MỘT ROLE (user_roles UNIQUE(user_id)).
-- Tài khoản Giám đốc chi nhánh thực tế mang role 'system_admin' (kiêm quản trị
-- cổng ONE) nên không thể gán thêm 'bgd' → bị chặn ghi Nếp Tốt dù là người
-- đứng đầu chi nhánh. Đổi role sẽ mất quyền quản trị nội dung — không chấp nhận.
--
-- Giải pháp: nhận diện "thành viên Ban Giám đốc" qua CHỨC DANH trên hồ sơ
-- (position bắt đầu bằng 'Giám đốc' — cùng họ pattern title-matching hệ thống
-- đang dùng trong sync_manager_role_from_position). Hàm is_branch_director()
-- được cộng thêm vào các nhánh 'bgd' của Nếp Tốt:
--   - can_observe_profile(): thấy toàn chi nhánh như role bgd
--   - policy INSERT: được ghi nhận (kèm can_record_profile như mọi người)
-- Các quyền khác của module không đổi.
-- Rollback: supabase/rollbacks/20260803090000_nep_tot_giam_doc_admin_down.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_branch_director()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND COALESCE(me."position", '') ILIKE 'Giám đốc%'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_branch_director() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_branch_director() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_observe_profile(_target uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles t
    JOIN public.profiles me ON me.user_id = auth.uid()
    WHERE t.id = _target
      AND me.id <> t.id
      AND (
        public.has_role(auth.uid(), 'bgd')
        OR public.is_branch_director()
        OR t.manager_id = me.id
        OR t.pgd_id = me.id
        OR t.director_id = me.id
        OR EXISTS (
          SELECT 1 FROM public.departments d
          WHERE d.id = t.department_id AND d.manager_id = me.id
        )
        OR (public.has_role(auth.uid(), 'pgd')
            AND t.department_id = ANY (public.get_my_pgd_scope_dept_ids()))
        OR EXISTS (
          SELECT 1 FROM public.management_scopes ms
          WHERE ms.grantee_profile_id = me.id
            AND ms.is_active
            AND ms.valid_from <= current_date
            AND (ms.valid_to IS NULL OR ms.valid_to >= current_date)
            AND (
              (ms.scope_type = 'ca_nhan' AND ms.staff_profile_id = t.id)
              OR (ms.scope_type = 'phong' AND ms.department_id = t.department_id)
            )
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Observers insert behavior notes in scope" ON public.behavior_notes;
CREATE POLICY "Observers insert behavior notes in scope" ON public.behavior_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    observer_id = public.get_my_profile_id()
    AND (
      public.has_role(auth.uid(), 'manager')
      OR public.has_role(auth.uid(), 'pgd')
      OR public.has_role(auth.uid(), 'bgd')
      OR public.is_branch_director()
    )
    AND public.can_record_profile(employee_id)
  );

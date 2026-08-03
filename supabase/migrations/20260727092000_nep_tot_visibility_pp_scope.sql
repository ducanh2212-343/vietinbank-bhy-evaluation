-- ============================================================================
-- NẾP TỐT — Điều chỉnh Bước 1 theo nghiệm thu (delta, an toàn dù migration
-- 20260727090000 đã áp hay chưa):
--   1) Cột behavior_notes.visibility: 'quan_ly' (mặc định — TP và cấp trên của
--      cán bộ nhìn được bản đã xác nhận) | 'rieng_tu' (chỉ người ghi thấy —
--      dùng khi PP ghi nhận mà chưa muốn cấp trên nắm).
--   2) Tách quyền GHI ↔ XEM: hàm mới can_record_profile() = can_observe_profile()
--      + nhánh "manager cùng phòng ghi nhận cấp cán bộ (position không bắt đầu
--      Trưởng/Phó)". Phó phòng nhờ đó ghi được mọi cán bộ trong phòng KHÔNG cần
--      phân công; nhưng quyền XEM bản ghi của người khác vẫn dùng
--      can_observe_profile() chặt như cũ → PP chỉ xem bản mình tạo
--      (muốn rộng hơn: cấp management_scopes purpose 'nep_tot_xem').
--   3) Admin chi nhánh (tcth_admin/system_admin) ĐƯỢC đọc bản ghi đã xác nhận
--      loại 'quan_ly' (quyết định nghiệm thu — admin là người chi nhánh; đảo
--      lại ghi chú "admin không đọc" trong migration 20260727090000).
--      Bản nháp và bản 'rieng_tu' vẫn chỉ người tạo thấy.
--   4) Audit metadata ghi thêm visibility.
--
-- Rollback: supabase/rollbacks/20260727092000_nep_tot_visibility_pp_scope_down.sql
-- ============================================================================

-- 1) Cột visibility
ALTER TABLE public.behavior_notes
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'quan_ly'
  CHECK (visibility IN ('quan_ly', 'rieng_tu'));

-- 2) Quyền GHI: can_record_profile = can_observe_profile + manager cùng phòng
--    ghi cấp cán bộ (title-matching 'Trưởng%'/'Phó%' — cùng pattern hệ thống
--    đang dùng trong sync_manager_role_from_position / reportingLine.ts)
CREATE OR REPLACE FUNCTION public.can_record_profile(_target uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_observe_profile(_target)
    OR EXISTS (
      SELECT 1
      FROM public.profiles t
      JOIN public.profiles me ON me.user_id = auth.uid()
      WHERE t.id = _target
        AND me.id <> t.id
        AND public.has_role(auth.uid(), 'manager')
        AND t.department_id IS NOT NULL
        AND t.department_id = me.department_id
        AND COALESCE(t.position, '') NOT ILIKE 'Trưởng%'
        AND COALESCE(t.position, '') NOT ILIKE 'Phó%'
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_record_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_record_profile(uuid) TO authenticated;

-- Picker Ghi nhanh liệt kê theo quyền GHI
CREATE OR REPLACE FUNCTION public.get_observable_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  employee_code text,
  department_id uuid,
  department_name text,
  position_title text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.employee_code, p.department_id, d.name, p.position
  FROM public.profiles p
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE p.status = 'active'
    AND public.can_record_profile(p.id)
  ORDER BY d.name NULLS LAST, p.full_name;
$$;

-- 3) Policy INSERT dùng quyền GHI mới
DROP POLICY IF EXISTS "Observers insert behavior notes in scope" ON public.behavior_notes;
CREATE POLICY "Observers insert behavior notes in scope" ON public.behavior_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    observer_id = public.get_my_profile_id()
    AND (
      public.has_role(auth.uid(), 'manager')
      OR public.has_role(auth.uid(), 'pgd')
      OR public.has_role(auth.uid(), 'bgd')
    )
    AND public.can_record_profile(employee_id)
  );

-- Policy XEM của chuỗi quản lý: thêm điều kiện visibility
DROP POLICY IF EXISTS "Scope leaders view confirmed notes" ON public.behavior_notes;
CREATE POLICY "Scope leaders view confirmed notes" ON public.behavior_notes
  FOR SELECT TO authenticated
  USING (
    status = 'da_xac_nhan'
    AND visibility = 'quan_ly'
    AND public.can_observe_profile(employee_id)
  );

-- Admin chi nhánh đọc bản đã xác nhận loại 'quan_ly'
DROP POLICY IF EXISTS "Branch admins view confirmed notes" ON public.behavior_notes;
CREATE POLICY "Branch admins view confirmed notes" ON public.behavior_notes
  FOR SELECT TO authenticated
  USING (
    status = 'da_xac_nhan'
    AND visibility = 'quan_ly'
    AND (
      public.has_role(auth.uid(), 'tcth_admin')
      OR public.has_role(auth.uid(), 'system_admin')
    )
  );

-- 4) Audit metadata thêm visibility
CREATE OR REPLACE FUNCTION public.log_nep_tot_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_TABLE_NAME = 'behavior_notes' THEN
    IF TG_OP = 'UPDATE' THEN
      v_old := jsonb_build_object(
        'status', OLD.status, 'behavior_type', OLD.behavior_type,
        'shared_with_employee', OLD.shared_with_employee,
        'visibility', OLD.visibility);
    END IF;
    v_new := jsonb_build_object(
      'status', NEW.status, 'behavior_type', NEW.behavior_type,
      'shared_with_employee', NEW.shared_with_employee,
      'visibility', NEW.visibility,
      'employee_id', NEW.employee_id, 'observer_id', NEW.observer_id);
  ELSE
    IF TG_OP = 'UPDATE' THEN v_old := to_jsonb(OLD); END IF;
    v_new := to_jsonb(NEW);
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (auth.uid(), TG_TABLE_NAME || ':' || lower(TG_OP), TG_TABLE_NAME, NEW.id, v_old, v_new);
  RETURN NEW;
END; $$;

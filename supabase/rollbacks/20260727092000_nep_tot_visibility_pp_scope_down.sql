-- Rollback cho 20260727092000_nep_tot_visibility_pp_scope.sql
-- Đưa RLS/hàm về trạng thái của 20260727090000 (PP không tự ghi cả phòng,
-- không có visibility, admin không đọc).

DROP POLICY IF EXISTS "Branch admins view confirmed notes" ON public.behavior_notes;

DROP POLICY IF EXISTS "Scope leaders view confirmed notes" ON public.behavior_notes;
CREATE POLICY "Scope leaders view confirmed notes" ON public.behavior_notes
  FOR SELECT TO authenticated
  USING (status = 'da_xac_nhan' AND public.can_observe_profile(employee_id));

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
    AND public.can_observe_profile(employee_id)
  );

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
    AND public.can_observe_profile(p.id)
  ORDER BY d.name NULLS LAST, p.full_name;
$$;

DROP FUNCTION IF EXISTS public.can_record_profile(uuid);

ALTER TABLE public.behavior_notes DROP COLUMN IF EXISTS visibility;

-- log_nep_tot_audit: bản cũ không có visibility trong metadata
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
        'shared_with_employee', OLD.shared_with_employee);
    END IF;
    v_new := jsonb_build_object(
      'status', NEW.status, 'behavior_type', NEW.behavior_type,
      'shared_with_employee', NEW.shared_with_employee,
      'employee_id', NEW.employee_id, 'observer_id', NEW.observer_id);
  ELSE
    IF TG_OP = 'UPDATE' THEN v_old := to_jsonb(OLD); END IF;
    v_new := to_jsonb(NEW);
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (auth.uid(), TG_TABLE_NAME || ':' || lower(TG_OP), TG_TABLE_NAME, NEW.id, v_old, v_new);
  RETURN NEW;
END; $$;

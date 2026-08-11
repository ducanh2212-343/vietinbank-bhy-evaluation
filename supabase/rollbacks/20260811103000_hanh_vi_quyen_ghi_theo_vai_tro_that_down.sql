-- Rollback cho 20260811103000_hanh_vi_quyen_ghi_theo_vai_tro_that.sql
-- Trả policy INSERT và can_record_profile về bản 20260803090000.

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
        AND COALESCE(t."position", '') NOT ILIKE 'Trưởng%'
        AND COALESCE(t."position", '') NOT ILIKE 'Phó%'
    );
$$;

DROP FUNCTION IF EXISTS public.can_record_behavior();
DROP FUNCTION IF EXISTS public.is_leader_position();

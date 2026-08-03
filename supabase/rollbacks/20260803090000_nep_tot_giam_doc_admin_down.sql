-- Rollback cho 20260803090000_nep_tot_giam_doc_admin.sql

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

-- Khôi phục can_observe_profile bản 20260727090000 (không còn nhánh is_branch_director)
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

DROP FUNCTION IF EXISTS public.is_branch_director();

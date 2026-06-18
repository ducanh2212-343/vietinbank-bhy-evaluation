
-- 1. Helper: list of department_ids that current pgd user oversees
CREATE OR REPLACE FUNCTION public.get_my_pgd_scope_dept_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT p.department_id), '{}'::uuid[])
  FROM public.profiles p
  WHERE p.pgd_id = public.get_my_profile_id()
    AND p.department_id IS NOT NULL
$$;

-- 2. Helper: can current user view/manage a given target profile
CREATE OR REPLACE FUNCTION public.can_view_profile(_target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles tp
    WHERE tp.id = _target_profile_id
      AND (
        -- self
        tp.user_id = auth.uid()
        -- admins
        OR public.has_role(auth.uid(), 'system_admin'::app_role)
        OR public.has_role(auth.uid(), 'bgd'::app_role)
        OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
        -- manager same department
        OR (
          public.has_role(auth.uid(), 'manager'::app_role)
          AND tp.department_id = public.get_my_department_id()
        )
        -- pgd: target in any dept of pgd scope
        OR (
          public.has_role(auth.uid(), 'pgd'::app_role)
          AND tp.department_id = ANY (public.get_my_pgd_scope_dept_ids())
        )
      )
  )
$$;

-- 3. profiles: PGD select within scope
DROP POLICY IF EXISTS "PGD can view scope profiles" ON public.profiles;
CREATE POLICY "PGD can view scope profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'pgd'::app_role)
    AND department_id = ANY (public.get_my_pgd_scope_dept_ids())
  );

-- 4. profiles: manager/pgd update within scope (non-role columns; role table is separate)
DROP POLICY IF EXISTS "Managers can update scope profiles" ON public.profiles;
CREATE POLICY "Managers can update scope profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) AND department_id = public.get_my_department_id())
    OR (public.has_role(auth.uid(), 'pgd'::app_role) AND department_id = ANY (public.get_my_pgd_scope_dept_ids()))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) AND department_id = public.get_my_department_id())
    OR (public.has_role(auth.uid(), 'pgd'::app_role) AND department_id = ANY (public.get_my_pgd_scope_dept_ids()))
  );

-- 5. form_submissions: managers/pgd in scope can view & update
DROP POLICY IF EXISTS "Scope managers can view submissions" ON public.form_submissions;
CREATE POLICY "Scope managers can view submissions"
  ON public.form_submissions FOR SELECT
  TO authenticated
  USING (public.can_view_profile(employee_id));

DROP POLICY IF EXISTS "Scope managers can update submissions" ON public.form_submissions;
CREATE POLICY "Scope managers can update submissions"
  ON public.form_submissions FOR UPDATE
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND public.can_view_profile(employee_id)
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND public.can_view_profile(employee_id)
  );

-- 6. admin_evaluations: scope managers can view (admin already has ALL)
DROP POLICY IF EXISTS "Scope managers view admin_evaluations" ON public.admin_evaluations;
CREATE POLICY "Scope managers view admin_evaluations"
  ON public.admin_evaluations FOR SELECT
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND public.can_view_profile(employee_id)
  );

DROP POLICY IF EXISTS "Self view admin_evaluations" ON public.admin_evaluations;
CREATE POLICY "Self view admin_evaluations"
  ON public.admin_evaluations FOR SELECT
  TO authenticated
  USING (employee_id = public.get_my_profile_id());

-- 7. admin_comments: scope managers + self view
DROP POLICY IF EXISTS "Scope managers view admin_comments" ON public.admin_comments;
CREATE POLICY "Scope managers view admin_comments"
  ON public.admin_comments FOR SELECT
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND public.can_view_profile(employee_id)
  );

DROP POLICY IF EXISTS "Self view admin_comments" ON public.admin_comments;
CREATE POLICY "Self view admin_comments"
  ON public.admin_comments FOR SELECT
  TO authenticated
  USING (employee_id = public.get_my_profile_id());

-- 8. Child form tables: scope managers can view & update
-- Generic helper inline via can_view_profile against form_submissions.employee_id

-- skill_assessments
DROP POLICY IF EXISTS "Scope managers manage skill_assessments" ON public.skill_assessments;
CREATE POLICY "Scope managers manage skill_assessments"
  ON public.skill_assessments FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

-- form_skill_priorities
DROP POLICY IF EXISTS "Scope managers manage form_skill_priorities" ON public.form_skill_priorities;
CREATE POLICY "Scope managers manage form_skill_priorities"
  ON public.form_skill_priorities FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

-- form_skill_actions
DROP POLICY IF EXISTS "Scope managers manage form_skill_actions" ON public.form_skill_actions;
CREATE POLICY "Scope managers manage form_skill_actions"
  ON public.form_skill_actions FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

-- form_attitude_priorities
DROP POLICY IF EXISTS "Scope managers manage form_attitude_priorities" ON public.form_attitude_priorities;
CREATE POLICY "Scope managers manage form_attitude_priorities"
  ON public.form_attitude_priorities FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

-- form_attitude_actions
DROP POLICY IF EXISTS "Scope managers manage form_attitude_actions" ON public.form_attitude_actions;
CREATE POLICY "Scope managers manage form_attitude_actions"
  ON public.form_attitude_actions FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

-- form_ai_actions_v2
DROP POLICY IF EXISTS "Scope managers manage form_ai_actions_v2" ON public.form_ai_actions_v2;
CREATE POLICY "Scope managers manage form_ai_actions_v2"
  ON public.form_ai_actions_v2 FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

-- form_previous_action_reviews
DROP POLICY IF EXISTS "Scope managers manage form_previous_action_reviews" ON public.form_previous_action_reviews;
CREATE POLICY "Scope managers manage form_previous_action_reviews"
  ON public.form_previous_action_reviews FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

-- kpi_items, recognition_items, reflection_answers, development_actions, ai_actions
DROP POLICY IF EXISTS "Scope managers manage kpi_items" ON public.kpi_items;
CREATE POLICY "Scope managers manage kpi_items"
  ON public.kpi_items FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

DROP POLICY IF EXISTS "Scope managers manage recognition_items" ON public.recognition_items;
CREATE POLICY "Scope managers manage recognition_items"
  ON public.recognition_items FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

DROP POLICY IF EXISTS "Scope managers manage reflection_answers" ON public.reflection_answers;
CREATE POLICY "Scope managers manage reflection_answers"
  ON public.reflection_answers FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

DROP POLICY IF EXISTS "Scope managers manage development_actions" ON public.development_actions;
CREATE POLICY "Scope managers manage development_actions"
  ON public.development_actions FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

DROP POLICY IF EXISTS "Scope managers manage ai_actions" ON public.ai_actions;
CREATE POLICY "Scope managers manage ai_actions"
  ON public.ai_actions FOR ALL
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
    AND form_id IN (SELECT id FROM public.form_submissions fs WHERE public.can_view_profile(fs.employee_id))
  );

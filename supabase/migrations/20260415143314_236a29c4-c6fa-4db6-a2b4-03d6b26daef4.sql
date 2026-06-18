
-- 1. form_skill_priorities: max 3 per form
CREATE TABLE public.form_skill_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill_catalog(id),
  current_level integer,
  target_level integer,
  gap_level integer GENERATED ALWAYS AS (CASE WHEN target_level IS NOT NULL AND current_level IS NOT NULL THEN target_level - current_level ELSE NULL END) STORED,
  priority_order integer NOT NULL DEFAULT 1,
  reason_text text,
  source_type text NOT NULL DEFAULT 'core_skill',
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(form_id, skill_id)
);

ALTER TABLE public.form_skill_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own skill priorities" ON public.form_skill_priorities FOR ALL TO authenticated
  USING (form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = get_my_profile_id()));

CREATE POLICY "Admins can manage all skill priorities" ON public.form_skill_priorities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin'));

CREATE TRIGGER update_form_skill_priorities_updated_at BEFORE UPDATE ON public.form_skill_priorities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. form_skill_actions
CREATE TABLE public.form_skill_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  skill_priority_id uuid NOT NULL REFERENCES public.form_skill_priorities(id) ON DELETE CASCADE,
  row_no integer NOT NULL DEFAULT 1,
  action_type text NOT NULL DEFAULT '70',
  action_text text NOT NULL,
  expected_result text,
  deadline date,
  requested_support text,
  evidence_expected text,
  status text NOT NULL DEFAULT 'planned',
  actual_result text,
  manager_review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_skill_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own skill actions" ON public.form_skill_actions FOR ALL TO authenticated
  USING (form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = get_my_profile_id()));

CREATE POLICY "Admins can manage all skill actions" ON public.form_skill_actions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin'));

CREATE TRIGGER update_form_skill_actions_updated_at BEFORE UPDATE ON public.form_skill_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. form_attitude_priorities: max 6 per form
CREATE TABLE public.form_attitude_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  attitude_dimension_id integer NOT NULL,
  attitude_name text NOT NULL,
  current_status text,
  desired_status text,
  issue_summary text,
  improvement_goal text,
  priority_order integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(form_id, attitude_dimension_id)
);

ALTER TABLE public.form_attitude_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own attitude priorities" ON public.form_attitude_priorities FOR ALL TO authenticated
  USING (form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = get_my_profile_id()));

CREATE POLICY "Admins can manage all attitude priorities" ON public.form_attitude_priorities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin'));

CREATE TRIGGER update_form_attitude_priorities_updated_at BEFORE UPDATE ON public.form_attitude_priorities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. form_attitude_actions
CREATE TABLE public.form_attitude_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  attitude_priority_id uuid NOT NULL REFERENCES public.form_attitude_priorities(id) ON DELETE CASCADE,
  row_no integer NOT NULL DEFAULT 1,
  action_text text NOT NULL,
  expected_evidence text,
  deadline date,
  requested_support text,
  status text NOT NULL DEFAULT 'planned',
  actual_result text,
  manager_review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_attitude_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own attitude actions" ON public.form_attitude_actions FOR ALL TO authenticated
  USING (form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = get_my_profile_id()));

CREATE POLICY "Admins can manage all attitude actions" ON public.form_attitude_actions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin'));

CREATE TRIGGER update_form_attitude_actions_updated_at BEFORE UPDATE ON public.form_attitude_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. form_ai_actions_v2 (separate from legacy ai_actions)
CREATE TABLE public.form_ai_actions_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  linked_skill_priority_id uuid REFERENCES public.form_skill_priorities(id) ON DELETE SET NULL,
  linked_attitude_priority_id uuid REFERENCES public.form_attitude_priorities(id) ON DELETE SET NULL,
  row_no integer NOT NULL DEFAULT 1,
  ai_action_text text NOT NULL,
  expected_result text,
  deadline date,
  requested_support text,
  evidence_expected text,
  status text NOT NULL DEFAULT 'planned',
  actual_result text,
  manager_review text,
  unlinked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_ai_actions_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ai actions v2" ON public.form_ai_actions_v2 FOR ALL TO authenticated
  USING (form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = get_my_profile_id()));

CREATE POLICY "Admins can manage all ai actions v2" ON public.form_ai_actions_v2 FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin'));

CREATE TRIGGER update_form_ai_actions_v2_updated_at BEFORE UPDATE ON public.form_ai_actions_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

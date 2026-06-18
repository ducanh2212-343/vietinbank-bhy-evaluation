CREATE TABLE public.form_previous_action_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  source_form_id uuid NOT NULL,
  source_action_id uuid,
  source_action_type text NOT NULL CHECK (source_action_type IN ('skill','attitude','ai')),
  is_extra boolean NOT NULL DEFAULT false,
  action_text text,
  expected_result text,
  actual_result text,
  status text NOT NULL DEFAULT 'planned',
  evidence text,
  employee_note text,
  manager_note text,
  row_no integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fpar_form ON public.form_previous_action_reviews(form_id);
CREATE INDEX idx_fpar_source ON public.form_previous_action_reviews(source_action_id);

ALTER TABLE public.form_previous_action_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage previous action reviews"
ON public.form_previous_action_reviews FOR ALL TO authenticated
USING (has_role(auth.uid(),'system_admin'::app_role) OR has_role(auth.uid(),'bgd'::app_role) OR has_role(auth.uid(),'tcth_admin'::app_role));

CREATE POLICY "Users manage own previous action reviews"
ON public.form_previous_action_reviews FOR ALL TO authenticated
USING (form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = get_my_profile_id()));

CREATE POLICY "Reviewers view assigned previous action reviews"
ON public.form_previous_action_reviews FOR SELECT TO authenticated
USING (form_id IN (SELECT id FROM public.form_submissions WHERE reviewer_id = get_my_profile_id()));

CREATE POLICY "Reviewers update assigned previous action reviews"
ON public.form_previous_action_reviews FOR UPDATE TO authenticated
USING (form_id IN (SELECT id FROM public.form_submissions WHERE reviewer_id = get_my_profile_id()));

CREATE TRIGGER trg_fpar_updated_at
BEFORE UPDATE ON public.form_previous_action_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add reviewer SELECT policies to all form child tables
-- Reviewers can read data for forms where they are the assigned reviewer

CREATE POLICY "Reviewers can view assigned kpi items"
ON public.kpi_items FOR SELECT TO authenticated
USING (form_id IN (
  SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id()
));

CREATE POLICY "Reviewers can view assigned skill assessments"
ON public.skill_assessments FOR SELECT TO authenticated
USING (form_id IN (
  SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id()
));

CREATE POLICY "Reviewers can view assigned dev actions"
ON public.development_actions FOR SELECT TO authenticated
USING (form_id IN (
  SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id()
));

CREATE POLICY "Reviewers can view assigned reflections"
ON public.reflection_answers FOR SELECT TO authenticated
USING (form_id IN (
  SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id()
));

CREATE POLICY "Reviewers can view assigned recognition items"
ON public.recognition_items FOR SELECT TO authenticated
USING (form_id IN (
  SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id()
));

CREATE POLICY "Reviewers can view assigned skill priorities"
ON public.form_skill_priorities FOR SELECT TO authenticated
USING (form_id IN (
  SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id()
));

CREATE POLICY "Reviewers can view assigned skill actions"
ON public.form_skill_actions FOR SELECT TO authenticated
USING (form_id IN (
  SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id()
));

CREATE POLICY "Reviewers can view assigned attitude priorities"
ON public.form_attitude_priorities FOR SELECT TO authenticated
USING (form_id IN (
  SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id()
));

CREATE POLICY "Reviewers can view assigned attitude actions"
ON public.form_attitude_actions FOR SELECT TO authenticated
USING (form_id IN (
  SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id()
));

CREATE POLICY "Reviewers can view assigned ai actions v2"
ON public.form_ai_actions_v2 FOR SELECT TO authenticated
USING (form_id IN (
  SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id()
));

CREATE POLICY "Reviewers can view assigned ai actions"
ON public.ai_actions FOR SELECT TO authenticated
USING (form_id IN (
  SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id()
));

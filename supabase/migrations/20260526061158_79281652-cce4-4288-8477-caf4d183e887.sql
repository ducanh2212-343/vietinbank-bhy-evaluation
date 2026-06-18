DROP POLICY IF EXISTS "Users can update own draft submissions" ON public.form_submissions;

CREATE POLICY "Users can update own draft submissions"
  ON public.form_submissions
  FOR UPDATE
  TO authenticated
  USING (
    employee_id = public.get_my_profile_id()
    AND status = 'draft'
  )
  WITH CHECK (
    employee_id = public.get_my_profile_id()
    AND status IN ('draft', 'submitted')
  );
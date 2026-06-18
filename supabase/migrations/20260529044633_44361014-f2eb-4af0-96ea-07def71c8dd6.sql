
DROP POLICY IF EXISTS "Users can update own draft submissions" ON public.form_submissions;
CREATE POLICY "Users can update own draft submissions"
ON public.form_submissions
FOR UPDATE
TO authenticated
USING (
  (employee_id = get_my_profile_id())
  AND (status = ANY (ARRAY['draft'::evaluation_status, 'returned'::evaluation_status]))
)
WITH CHECK (
  (employee_id = get_my_profile_id())
  AND (status = ANY (ARRAY['draft'::evaluation_status, 'submitted'::evaluation_status, 'returned'::evaluation_status]))
);

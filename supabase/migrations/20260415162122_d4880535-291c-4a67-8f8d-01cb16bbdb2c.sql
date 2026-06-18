
-- Allow anon users to view departments (for registration form)
CREATE POLICY "Anon can view departments"
ON public.departments
FOR SELECT
TO anon
USING (true);

-- Allow anon users to view positions (for registration form)
CREATE POLICY "Anon can view positions"
ON public.positions
FOR SELECT
TO anon
USING (true);

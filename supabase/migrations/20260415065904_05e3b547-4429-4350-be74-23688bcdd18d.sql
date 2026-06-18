-- Create a security definer function to get current user's department_id
CREATE OR REPLACE FUNCTION public.get_my_department_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Managers can view department profiles" ON public.profiles;

-- Recreate using the safe function
CREATE POLICY "Managers can view department profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  department_id = get_my_department_id()
  AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'pgd'))
);
-- Lãnh đạo (trưởng phòng) Phòng Tổ chức Tổng hợp được xem toàn chi nhánh
-- trong Báo cáo nộp biểu mẫu (profiles + form_submissions ở mức SELECT).
-- BGĐ / TCTH admin / system admin vốn đã có quyền xem toàn bộ qua policy admin.

CREATE OR REPLACE FUNCTION public.is_tcth_leader(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'manager'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.departments d ON d.id = p.department_id
      WHERE p.user_id = _user_id
        AND lower(d.name) LIKE '%tổ chức%'
    );
$$;

DROP POLICY IF EXISTS "TCTH leader can view all profiles" ON public.profiles;
CREATE POLICY "TCTH leader can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_tcth_leader(auth.uid()));

DROP POLICY IF EXISTS "TCTH leader can view all submissions" ON public.form_submissions;
CREATE POLICY "TCTH leader can view all submissions"
  ON public.form_submissions FOR SELECT
  USING (public.is_tcth_leader(auth.uid()));

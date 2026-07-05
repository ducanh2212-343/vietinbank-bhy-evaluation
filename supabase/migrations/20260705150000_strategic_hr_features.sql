-- Nhóm tính năng quản trị năng lực chiến lược (Bản đồ rủi ro, Con đường sự nghiệp,
-- Mô phỏng điều chuyển): TCTH leader cần đọc được skill_assessments toàn chi nhánh
-- (đồng bộ với 20260704130000 đã mở profiles + form_submissions).
-- BGĐ / TCTH admin / system admin vốn đã đọc được qua policy admin sẵn có.

DROP POLICY IF EXISTS "TCTH leader can view all skill assessments" ON public.skill_assessments;
CREATE POLICY "TCTH leader can view all skill assessments"
  ON public.skill_assessments FOR SELECT
  USING (public.is_tcth_leader(auth.uid()));

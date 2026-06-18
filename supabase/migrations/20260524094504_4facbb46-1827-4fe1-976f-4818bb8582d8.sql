
-- Bảng khóa học Trường ĐT VietinBank
CREATE TABLE public.vtb_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code integer NOT NULL UNIQUE,
  name text NOT NULL,
  objective text,
  content text,
  duration_days numeric,
  format text,
  competency_type text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vtb_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view vtb_courses" ON public.vtb_courses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage vtb_courses" ON public.vtb_courses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'))
  WITH CHECK (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'));
CREATE TRIGGER trg_vtb_courses_updated BEFORE UPDATE ON public.vtb_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bảng map khóa học ↔ nhóm vị trí (theo Excel)
CREATE TABLE public.vtb_course_position_groups (
  course_id uuid NOT NULL REFERENCES public.vtb_courses(id) ON DELETE CASCADE,
  position_group text NOT NULL,
  PRIMARY KEY (course_id, position_group)
);
CREATE INDEX idx_vtb_cpg_group ON public.vtb_course_position_groups(position_group);
ALTER TABLE public.vtb_course_position_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view vtb_cpg" ON public.vtb_course_position_groups
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage vtb_cpg" ON public.vtb_course_position_groups
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'))
  WITH CHECK (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'));

-- Bảng map vị trí trong hệ thống ↔ nhóm vị trí trong Excel
CREATE TABLE public.position_to_vtb_group (
  position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  vtb_position_group text NOT NULL,
  PRIMARY KEY (position_id, vtb_position_group)
);
ALTER TABLE public.position_to_vtb_group ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view pos_to_vtb" ON public.position_to_vtb_group
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pos_to_vtb" ON public.position_to_vtb_group
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'))
  WITH CHECK (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'));

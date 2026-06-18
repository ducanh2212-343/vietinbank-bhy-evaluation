
-- 1) Mở rộng vtb_courses
ALTER TABLE public.vtb_courses
  ALTER COLUMN code TYPE TEXT USING code::TEXT,
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS internal_note TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- 2) Bảng liên kết khóa học - skill
CREATE TABLE IF NOT EXISTS public.vtb_course_skills (
  course_id UUID NOT NULL REFERENCES public.vtb_courses(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  target_level_min INTEGER NOT NULL DEFAULT 1 CHECK (target_level_min BETWEEN 1 AND 4),
  relevance TEXT NOT NULL DEFAULT 'medium' CHECK (relevance IN ('high','medium','low')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_vtb_cs_skill ON public.vtb_course_skills(skill_id);

ALTER TABLE public.vtb_course_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view vtb_course_skills" ON public.vtb_course_skills;
CREATE POLICY "Authenticated can view vtb_course_skills"
  ON public.vtb_course_skills FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage vtb_course_skills" ON public.vtb_course_skills;
CREATE POLICY "Admins can manage vtb_course_skills"
  ON public.vtb_course_skills FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'system_admin'::app_role) OR has_role(auth.uid(), 'bgd'::app_role) OR has_role(auth.uid(), 'tcth_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR has_role(auth.uid(), 'bgd'::app_role) OR has_role(auth.uid(), 'tcth_admin'::app_role));

-- 3) Đánh dấu các khóa đã import từ excel
UPDATE public.vtb_courses SET source = 'excel' WHERE source = 'manual';

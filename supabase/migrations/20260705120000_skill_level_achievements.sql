-- Lịch sử đạt level skill — nền cho khoảnh khắc "mở khoá" (reveal modal)
-- và vinh danh sau này. Mỗi dòng = lần ĐẦU TIÊN một cán bộ đạt tới level đó
-- của một skill (unique profile × skill × level). celebrated_at NULL nghĩa là
-- cán bộ chưa xem modal chúc mừng.
CREATE TABLE public.skill_level_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  level_no INTEGER NOT NULL CHECK (level_no BETWEEN 1 AND 4),
  form_id UUID REFERENCES public.form_submissions(id) ON DELETE SET NULL,
  cycle_id UUID,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  celebrated_at TIMESTAMPTZ,
  UNIQUE (profile_id, skill_id, level_no)
);

CREATE INDEX idx_skill_achievements_profile ON public.skill_level_achievements(profile_id);

ALTER TABLE public.skill_level_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON public.skill_level_achievements FOR SELECT TO authenticated
  USING (
    profile_id = public.get_my_profile_id()
    OR has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
    OR has_role(auth.uid(), 'bgd'::app_role)
  );

-- Cán bộ chỉ được đánh dấu "đã xem chúc mừng" trên thành tích của mình
CREATE POLICY "Users can celebrate own achievements"
  ON public.skill_level_achievements FOR UPDATE TO authenticated
  USING (profile_id = public.get_my_profile_id());

-- Ghi thành tích tự động khi phiếu chuyển sang trạng thái đã duyệt:
-- so level hiệu lực (manager ?? self) với phiếu đã duyệt gần nhất trước đó;
-- level tăng → 1 dòng thành tích. INSERT do SECURITY DEFINER nên không cần
-- policy INSERT cho người dùng (chống tự ghi thành tích).
CREATE OR REPLACE FUNCTION public.record_skill_level_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  prev_form_id UUID;
BEGIN
  IF NEW.status::text IN ('reviewed','approved','closed')
     AND (TG_OP = 'INSERT' OR OLD.status::text NOT IN ('reviewed','approved','closed')) THEN

    SELECT fs.id INTO prev_form_id
    FROM public.form_submissions fs
    WHERE fs.employee_id = NEW.employee_id
      AND fs.id <> NEW.id
      AND fs.status::text IN ('reviewed','approved','closed')
    ORDER BY COALESCE(fs.reviewed_at, fs.updated_at) DESC
    LIMIT 1;

    INSERT INTO public.skill_level_achievements (profile_id, skill_id, level_no, form_id, cycle_id)
    SELECT NEW.employee_id,
           sa.skill_id,
           COALESCE(sa.manager_assessed_level, sa.self_assessed_level),
           NEW.id,
           NEW.cycle_id
    FROM public.skill_assessments sa
    WHERE sa.form_id = NEW.id
      AND COALESCE(sa.manager_assessed_level, sa.self_assessed_level, 0)
          > COALESCE((
              SELECT COALESCE(psa.manager_assessed_level, psa.self_assessed_level, 0)
              FROM public.skill_assessments psa
              WHERE psa.form_id = prev_form_id AND psa.skill_id = sa.skill_id
            ), 0)
    ON CONFLICT (profile_id, skill_id, level_no) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_skill_level_achievements
  AFTER INSERT OR UPDATE OF status ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.record_skill_level_achievements();

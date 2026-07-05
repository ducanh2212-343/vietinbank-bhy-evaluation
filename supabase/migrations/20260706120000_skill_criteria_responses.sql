-- Câu trả lời bộ tiêu chí xác định level (wizard trong mục B).
-- Mỗi dòng = 1 tiêu chí được cán bộ trả lời trong 1 phiếu:
--   answer: 1 = Đạt, 0.5 = Một phần, 0 = Chưa
-- Đây là "vết" để quản lý xem breakdown thay vì chỉ thấy con số level.
CREATE TABLE public.skill_criteria_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.skill_level_criteria(id) ON DELETE CASCADE,
  answer NUMERIC NOT NULL CHECK (answer IN (0, 0.5, 1)),
  evidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (form_id, criterion_id)
);

CREATE INDEX idx_skill_criteria_responses_form ON public.skill_criteria_responses(form_id, skill_id);

ALTER TABLE public.skill_criteria_responses ENABLE ROW LEVEL SECURITY;

-- Cán bộ quản lý câu trả lời trên phiếu của chính mình (pattern skill_assessments)
CREATE POLICY "Users can manage own criteria responses"
  ON public.skill_criteria_responses FOR ALL TO authenticated
  USING (
    form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = public.get_my_profile_id())
  );

-- Quản lý được xem breakdown của phiếu mình phụ trách
CREATE POLICY "Reviewers can view assigned criteria responses"
  ON public.skill_criteria_responses FOR SELECT TO authenticated
  USING (
    form_id IN (SELECT id FROM public.form_submissions WHERE reviewer_id = public.get_my_profile_id())
  );

CREATE POLICY "Admins can manage all criteria responses"
  ON public.skill_criteria_responses FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
    OR has_role(auth.uid(), 'bgd'::app_role)
  );

CREATE TRIGGER update_skill_criteria_responses_updated_at
  BEFORE UPDATE ON public.skill_criteria_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

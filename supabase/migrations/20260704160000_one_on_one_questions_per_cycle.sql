-- Câu hỏi trao đổi 1-1 quản trị theo từng kỳ đánh giá.
-- Kỳ chưa có bộ câu hỏi riêng thì ứng dụng dùng bộ mặc định.
-- Câu trả lời trong form_submissions.one_on_one_answers gắn theo question_key
-- nên sửa nội dung/sắp xếp không làm mất câu trả lời đã nhập.

CREATE TABLE IF NOT EXISTS public.one_on_one_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.evaluation_cycles(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  question_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, question_key)
);

CREATE INDEX IF NOT EXISTS idx_one_on_one_questions_cycle ON public.one_on_one_questions(cycle_id, sort_order);

CREATE TRIGGER update_one_on_one_questions_updated_at
  BEFORE UPDATE ON public.one_on_one_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.one_on_one_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view 1-1 questions"
  ON public.one_on_one_questions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage 1-1 questions"
  ON public.one_on_one_questions FOR ALL
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
    OR has_role(auth.uid(), 'bgd'::app_role)
  );

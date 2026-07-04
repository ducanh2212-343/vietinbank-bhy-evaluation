-- Kỳ đánh giá Quý III/2026 + mốc thời gian nộp biểu mẫu & cơ chế trừ điểm KPI khi nộp chậm

-- 1. Mốc thời gian nộp và điểm trừ KPI thiết đặt theo từng kỳ
ALTER TABLE public.evaluation_cycles
  ADD COLUMN IF NOT EXISTS submission_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS late_penalty_points numeric(5,2) NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.evaluation_cycles.submission_deadline IS 'Mốc thời gian nộp biểu mẫu của kỳ; nộp sau mốc này bị tính chậm và trừ điểm KPI. NULL = mặc định 23:59 ngày end_date.';
COMMENT ON COLUMN public.evaluation_cycles.late_penalty_points IS 'Số điểm KPI bị trừ khi nộp chậm trong kỳ này (mỗi kỳ chậm trừ một lần).';

-- 2. Ghi nhận thời điểm nộp lần đầu (không bị ghi đè khi biểu mẫu bị trả về và nộp lại)
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS first_submitted_at timestamptz;

COMMENT ON COLUMN public.form_submissions.first_submitted_at IS 'Thời điểm cán bộ nộp biểu mẫu lần đầu trong kỳ — căn cứ tính đúng hạn/chậm KPI.';

UPDATE public.form_submissions
SET first_submitted_at = submitted_at
WHERE first_submitted_at IS NULL AND submitted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.capture_first_submitted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL AND NEW.first_submitted_at IS NULL THEN
    NEW.first_submitted_at := NEW.submitted_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_first_submitted_at ON public.form_submissions;
CREATE TRIGGER trg_capture_first_submitted_at
  BEFORE INSERT OR UPDATE ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_first_submitted_at();

-- 3. Khởi tạo kỳ đánh giá Quý III/2026 (idempotent)
INSERT INTO public.evaluation_cycles (name, description, start_date, end_date, cycle_type, status)
SELECT 'Quý III/2026',
       'Đánh giá Quý III/2026: rà soát kế hoạch hành động Quý II/2026 và xây dựng kế hoạch phát triển Quý IV/2026',
       DATE '2026-07-01', DATE '2026-09-30', 'quarterly', 'in_progress'
WHERE NOT EXISTS (SELECT 1 FROM public.evaluation_cycles WHERE name = 'Quý III/2026');

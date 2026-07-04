-- Lưu đủ 3 mốc thời gian của biểu mẫu (CB đẩy lên → lãnh đạo duyệt → PGĐ duyệt).
-- Thời gian nộp cuối cùng để tính KPI = thời điểm Phó giám đốc duyệt (first_approved_at).

ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS first_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_approved_at timestamptz;

COMMENT ON COLUMN public.form_submissions.first_reviewed_at IS 'Thời điểm lãnh đạo (TP/người đánh giá) duyệt lần đầu (chuyển trạng thái reviewed).';
COMMENT ON COLUMN public.form_submissions.first_approved_at IS 'Thời điểm Phó giám đốc phê duyệt lần đầu (chuyển trạng thái approved) — mốc nộp cuối cùng để tính KPI.';

-- Backfill từ dữ liệu hiện có
UPDATE public.form_submissions
SET first_reviewed_at = reviewed_at
WHERE first_reviewed_at IS NULL AND reviewed_at IS NOT NULL;

UPDATE public.form_submissions
SET first_approved_at = COALESCE(pgd_reviewed_at, reviewed_at, updated_at)
WHERE first_approved_at IS NULL AND status IN ('approved', 'closed');

-- Trigger gộp: ghi nhận cả 3 mốc lần đầu, không bị ghi đè khi trả về/nộp lại/duyệt lại
CREATE OR REPLACE FUNCTION public.capture_submission_milestones()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL AND NEW.first_submitted_at IS NULL THEN
    NEW.first_submitted_at := NEW.submitted_at;
  END IF;
  IF NEW.status IN ('reviewed', 'approved', 'closed') AND NEW.first_reviewed_at IS NULL THEN
    NEW.first_reviewed_at := COALESCE(NEW.reviewed_at, now());
  END IF;
  IF NEW.status IN ('approved', 'closed') AND NEW.first_approved_at IS NULL THEN
    NEW.first_approved_at := COALESCE(NEW.pgd_reviewed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_first_submitted_at ON public.form_submissions;
DROP FUNCTION IF EXISTS public.capture_first_submitted_at();

DROP TRIGGER IF EXISTS trg_capture_submission_milestones ON public.form_submissions;
CREATE TRIGGER trg_capture_submission_milestones
  BEFORE INSERT OR UPDATE ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_submission_milestones();

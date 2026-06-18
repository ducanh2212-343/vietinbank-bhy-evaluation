ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS returned_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_reason text,
  ADD COLUMN IF NOT EXISTS return_target text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS needs_manager_review_update boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.form_submissions.return_target IS 'employee = trả về CB, manager = PGĐ trả về TP';
COMMENT ON COLUMN public.form_submissions.needs_manager_review_update IS 'true khi CB nộp lại sau khi bị trả, TP cần cập nhật đánh giá';

ALTER TABLE public.staff_star_classifications
  ADD COLUMN IF NOT EXISTS override_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS override_reason text;

CREATE OR REPLACE FUNCTION public.check_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF (OLD.status = 'draft' AND NEW.status = 'submitted') THEN RETURN NEW; END IF;
  IF (OLD.status = 'submitted' AND NEW.status IN ('reviewed', 'returned')) THEN RETURN NEW; END IF;
  IF (OLD.status = 'reviewed' AND NEW.status IN ('approved', 'submitted')) THEN RETURN NEW; END IF;
  IF (OLD.status = 'returned' AND NEW.status IN ('draft', 'submitted')) THEN RETURN NEW; END IF;
  IF (OLD.status = 'approved' AND NEW.status = 'closed') THEN RETURN NEW; END IF;
  IF has_role(auth.uid(), 'system_admin') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Chuyển trạng thái không hợp lệ: % → %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_status_transition ON public.form_submissions;
CREATE TRIGGER trg_check_status_transition
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.check_status_transition();
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS pgd_comment text,
  ADD COLUMN IF NOT EXISTS pgd_review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pgd_reviewed_at timestamptz;
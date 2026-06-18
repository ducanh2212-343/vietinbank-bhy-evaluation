ALTER TABLE public.form_submissions
ADD COLUMN IF NOT EXISTS one_on_one_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS one_on_one_answers jsonb NOT NULL DEFAULT '{}'::jsonb;
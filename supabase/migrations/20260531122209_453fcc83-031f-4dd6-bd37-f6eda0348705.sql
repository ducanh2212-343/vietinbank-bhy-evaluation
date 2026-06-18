ALTER TABLE public.staff_star_classifications
  ADD COLUMN IF NOT EXISTS override_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS override_reason text;
ALTER TABLE public.skill_catalog
  ADD COLUMN IF NOT EXISTS upskill_l0_l1 text,
  ADD COLUMN IF NOT EXISTS upskill_l1_l2 text,
  ADD COLUMN IF NOT EXISTS upskill_l2_l3 text,
  ADD COLUMN IF NOT EXISTS upskill_l3_l4 text;
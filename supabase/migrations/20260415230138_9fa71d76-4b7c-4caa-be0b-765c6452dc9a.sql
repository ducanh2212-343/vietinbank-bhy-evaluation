
-- Add self/manager assessment columns to skill_assessments
ALTER TABLE public.skill_assessments 
  ADD COLUMN IF NOT EXISTS self_assessed_level integer,
  ADD COLUMN IF NOT EXISTS manager_assessed_level integer,
  ADD COLUMN IF NOT EXISTS employee_comment text;

-- Add self/manager status and evidence/comments to form_attitude_priorities
ALTER TABLE public.form_attitude_priorities
  ADD COLUMN IF NOT EXISTS self_status text,
  ADD COLUMN IF NOT EXISTS manager_status text,
  ADD COLUMN IF NOT EXISTS evidence text,
  ADD COLUMN IF NOT EXISTS employee_comment text,
  ADD COLUMN IF NOT EXISTS manager_comment text;

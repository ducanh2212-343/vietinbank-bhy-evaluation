
-- Enums
DO $$ BEGIN
  CREATE TYPE public.star_group AS ENUM ('sao_mai','sao_khue','sao_bang','sao_hom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.star_evaluator_level AS ENUM ('manager','pgd','director');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.star_approval_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.staff_star_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.evaluation_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  form_id uuid REFERENCES public.form_submissions(id) ON DELETE SET NULL,
  star_group public.star_group,
  reason_text text,
  direction_text text,
  evaluator_id uuid REFERENCES public.profiles(id),
  evaluator_level public.star_evaluator_level NOT NULL DEFAULT 'manager',
  approver_id uuid REFERENCES public.profiles(id),
  approval_status public.star_approval_status NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  visible_to_employee boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_ssc_employee ON public.staff_star_classifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_ssc_cycle ON public.staff_star_classifications(cycle_id);
CREATE INDEX IF NOT EXISTS idx_ssc_evaluator ON public.staff_star_classifications(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_ssc_approver ON public.staff_star_classifications(approver_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_star_classifications TO authenticated;
GRANT ALL ON public.staff_star_classifications TO service_role;

ALTER TABLE public.staff_star_classifications ENABLE ROW LEVEL SECURITY;

-- Employee can see own only when approved + visible
CREATE POLICY "Employee view own star when allowed"
ON public.staff_star_classifications FOR SELECT TO authenticated
USING (
  employee_id = public.get_my_profile_id()
  AND approval_status = 'approved'
  AND visible_to_employee = true
);

-- Evaluator manage own assignments
CREATE POLICY "Evaluator manage star"
ON public.staff_star_classifications FOR ALL TO authenticated
USING (evaluator_id = public.get_my_profile_id())
WITH CHECK (evaluator_id = public.get_my_profile_id() AND employee_id <> public.get_my_profile_id());

-- Approver manage assigned
CREATE POLICY "Approver manage star"
ON public.staff_star_classifications FOR ALL TO authenticated
USING (approver_id = public.get_my_profile_id())
WITH CHECK (approver_id = public.get_my_profile_id() AND employee_id <> public.get_my_profile_id());

-- Scope managers (manager / pgd) full access within scope
CREATE POLICY "Scope managers manage star"
ON public.staff_star_classifications FOR ALL TO authenticated
USING (
  (public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'pgd'::app_role))
  AND public.can_view_profile(employee_id)
  AND employee_id <> public.get_my_profile_id()
)
WITH CHECK (
  (public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'pgd'::app_role))
  AND public.can_view_profile(employee_id)
  AND employee_id <> public.get_my_profile_id()
);

-- Admins full
CREATE POLICY "Admins manage star"
ON public.staff_star_classifications FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'system_admin'::app_role)
  OR public.has_role(auth.uid(),'bgd'::app_role)
  OR public.has_role(auth.uid(),'tcth_admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(),'system_admin'::app_role)
  OR public.has_role(auth.uid(),'bgd'::app_role)
  OR public.has_role(auth.uid(),'tcth_admin'::app_role)
);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_ssc_updated_at ON public.staff_star_classifications;
CREATE TRIGGER trg_ssc_updated_at BEFORE UPDATE ON public.staff_star_classifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Overall review JSON columns on form_submissions
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS manager_overall_review jsonb,
  ADD COLUMN IF NOT EXISTS pgd_overall_review jsonb,
  ADD COLUMN IF NOT EXISTS director_overall_review jsonb;

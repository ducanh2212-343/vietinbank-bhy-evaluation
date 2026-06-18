
ALTER TABLE public.skill_assessments
  ADD COLUMN IF NOT EXISTS self_l0 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manager_l0 boolean NOT NULL DEFAULT false;

ALTER TABLE public.form_attitude_actions
  ADD COLUMN IF NOT EXISTS foundation_pillar text;

CREATE TABLE IF NOT EXISTS public.attitude_dimensions_catalog (
  id integer PRIMARY KEY,
  name text NOT NULL,
  failing_behaviors text,
  expected_behaviors text,
  self_improvement text,
  manager_action text,
  progress_evidence text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attitude_dimensions_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view attitude dimensions" ON public.attitude_dimensions_catalog;
CREATE POLICY "Authenticated can view attitude dimensions"
  ON public.attitude_dimensions_catalog FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage attitude dimensions" ON public.attitude_dimensions_catalog;
CREATE POLICY "Admins can manage attitude dimensions"
  ON public.attitude_dimensions_catalog FOR ALL TO authenticated
  USING (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'))
  WITH CHECK (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'));

DROP TRIGGER IF EXISTS attitude_dimensions_catalog_updated ON public.attitude_dimensions_catalog;
CREATE TRIGGER attitude_dimensions_catalog_updated
  BEFORE UPDATE ON public.attitude_dimensions_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

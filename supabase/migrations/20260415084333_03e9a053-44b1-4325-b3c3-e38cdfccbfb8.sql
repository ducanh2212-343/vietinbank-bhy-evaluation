
-- positions table
CREATE TABLE public.positions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view positions" ON public.positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage positions" ON public.positions FOR ALL TO authenticated USING (has_role(auth.uid(), 'system_admin'::app_role) OR has_role(auth.uid(), 'tcth_admin'::app_role) OR has_role(auth.uid(), 'bgd'::app_role));

-- position_core_skills table
CREATE TABLE public.position_core_skills (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  minimum_level integer NOT NULL DEFAULT 1,
  advanced_level integer NOT NULL DEFAULT 3,
  weight numeric DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(position_id, skill_id)
);
ALTER TABLE public.position_core_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view position skills" ON public.position_core_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage position skills" ON public.position_core_skills FOR ALL TO authenticated USING (has_role(auth.uid(), 'system_admin'::app_role) OR has_role(auth.uid(), 'tcth_admin'::app_role) OR has_role(auth.uid(), 'bgd'::app_role));

-- Add position_id to profiles for linking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;

-- Triggers for updated_at
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_position_core_skills_updated_at BEFORE UPDATE ON public.position_core_skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

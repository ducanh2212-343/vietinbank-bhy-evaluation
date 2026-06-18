
-- 1. Add note column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS note text;

-- 2. Create admin_evaluations table
CREATE TABLE public.admin_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.evaluation_cycles(id),
  classification public.staff_classification,
  priority_skill_ids uuid[] DEFAULT '{}',
  current_levels integer[] DEFAULT '{}',
  target_levels integer[] DEFAULT '{}',
  development_plan text,
  completion_status text NOT NULL DEFAULT 'not_started',
  remark text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, cycle_id)
);

ALTER TABLE public.admin_evaluations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_admin_evaluations_updated_at
BEFORE UPDATE ON public.admin_evaluations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_admin_evaluations_employee ON public.admin_evaluations(employee_id);
CREATE INDEX idx_admin_evaluations_cycle ON public.admin_evaluations(cycle_id);

-- 3. Create admin_comments table
CREATE TABLE public.admin_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  comment_type text DEFAULT 'general',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_admin_comments_employee ON public.admin_comments(employee_id);

-- 4. RLS for new tables
CREATE POLICY "BGD TCTH SysAdmin manage evaluations" ON public.admin_evaluations
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'system_admin'));

CREATE POLICY "BGD TCTH SysAdmin manage comments" ON public.admin_comments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'system_admin'));

-- 5. Update existing RLS to include bgd

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin'));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'bgd'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin'));

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments" ON public.departments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'bgd'));

DROP POLICY IF EXISTS "Admins can manage cycles" ON public.evaluation_cycles;
CREATE POLICY "Admins can manage cycles" ON public.evaluation_cycles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'bgd'));

DROP POLICY IF EXISTS "Admins can manage all submissions" ON public.form_submissions;
CREATE POLICY "Admins can manage all submissions" ON public.form_submissions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin'));

DROP POLICY IF EXISTS "Admins can view all submissions" ON public.form_submissions;
CREATE POLICY "Admins can view all submissions" ON public.form_submissions
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'bgd'));

DROP POLICY IF EXISTS "Admins can manage skills" ON public.skill_catalog;
CREATE POLICY "Admins can manage skills" ON public.skill_catalog
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'bgd'));

DROP POLICY IF EXISTS "Admins can manage staff groups" ON public.staff_groups;
CREATE POLICY "Admins can manage staff groups" ON public.staff_groups
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'bgd'));

DROP POLICY IF EXISTS "Admins can manage reports" ON public.form04_reports;
CREATE POLICY "Admins can manage reports" ON public.form04_reports
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'bgd'));

DROP POLICY IF EXISTS "Managers and admins can view reports" ON public.form04_reports;
CREATE POLICY "Managers and admins can view reports" ON public.form04_reports
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'pgd'));

DROP POLICY IF EXISTS "Admins can manage classifications" ON public.form04_staff_classifications;
CREATE POLICY "Admins can manage classifications" ON public.form04_staff_classifications
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'bgd'));

DROP POLICY IF EXISTS "Managers and admins can view classifications" ON public.form04_staff_classifications;
CREATE POLICY "Managers and admins can view classifications" ON public.form04_staff_classifications
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'pgd'));

DROP POLICY IF EXISTS "Admins can manage training proposals" ON public.training_proposals;
CREATE POLICY "Admins can manage training proposals" ON public.training_proposals
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'tcth_admin') OR has_role(auth.uid(), 'bgd'));

DROP POLICY IF EXISTS "Admins can manage attachments" ON public.attachments;
CREATE POLICY "Admins can manage attachments" ON public.attachments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin'));

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'bgd') OR has_role(auth.uid(), 'tcth_admin'));

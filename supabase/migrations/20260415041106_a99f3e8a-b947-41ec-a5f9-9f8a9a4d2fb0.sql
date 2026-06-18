
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('employee', 'manager', 'pgd', 'tcth_admin', 'system_admin');

-- Create evaluation status enum
CREATE TYPE public.evaluation_status AS ENUM ('draft', 'in_progress', 'submitted', 'reviewed', 'approved', 'closed');

-- Create classification enum (4-quadrant matrix)
CREATE TYPE public.staff_classification AS ENUM ('sao_mai', 'sao_khue', 'sao_bang', 'sao_hom');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- 1. departments
-- ============================================================
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.departments(id),
  manager_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  employee_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  department_id UUID REFERENCES public.departments(id),
  manager_id UUID REFERENCES public.profiles(id),
  pgd_id UUID REFERENCES public.profiles(id),
  avatar_url TEXT,
  join_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add FK from departments.manager_id to profiles
ALTER TABLE public.departments ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES public.profiles(id);

-- ============================================================
-- 3. user_roles (separate table for roles)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get current user's profile id
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- ============================================================
-- 4. evaluation_cycles
-- ============================================================
CREATE TABLE public.evaluation_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  cycle_type TEXT NOT NULL DEFAULT 'quarterly',
  status evaluation_status NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluation_cycles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_evaluation_cycles_updated_at BEFORE UPDATE ON public.evaluation_cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. skill_catalog
-- ============================================================
CREATE TABLE public.skill_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  skill_group TEXT NOT NULL,
  description TEXT,
  level1_description TEXT,
  level2_description TEXT,
  level3_description TEXT,
  level4_description TEXT,
  icon_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.skill_catalog ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_skill_catalog_updated_at BEFORE UPDATE ON public.skill_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. staff_groups
-- ============================================================
CREATE TABLE public.staff_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  core_skill_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_groups ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_staff_groups_updated_at BEFORE UPDATE ON public.staff_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. form_submissions
-- ============================================================
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.evaluation_cycles(id),
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  reviewer_id UUID REFERENCES public.profiles(id),
  status evaluation_status NOT NULL DEFAULT 'draft',
  overall_score NUMERIC(5,2),
  manager_comment TEXT,
  employee_comment TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON public.form_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_form_submissions_employee ON public.form_submissions(employee_id);
CREATE INDEX idx_form_submissions_cycle ON public.form_submissions(cycle_id);

-- ============================================================
-- 8. kpi_items
-- ============================================================
CREATE TABLE public.kpi_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 0,
  target_value TEXT,
  actual_value TEXT,
  score NUMERIC(5,2),
  evidence TEXT,
  manager_note TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kpi_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_kpi_items_updated_at BEFORE UPDATE ON public.kpi_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 9. recognition_items
-- ============================================================
CREATE TABLE public.recognition_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  recognition_type TEXT,
  date_achieved DATE,
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recognition_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_recognition_items_updated_at BEFORE UPDATE ON public.recognition_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 10. reflection_answers
-- ============================================================
CREATE TABLE public.reflection_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reflection_answers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_reflection_answers_updated_at BEFORE UPDATE ON public.reflection_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 11. skill_assessments
-- ============================================================
CREATE TABLE public.skill_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_catalog(id),
  is_core BOOLEAN NOT NULL DEFAULT true,
  required_level INT,
  current_level INT,
  gap INT GENERATED ALWAYS AS (COALESCE(required_level, 0) - COALESCE(current_level, 0)) STORED,
  evidence TEXT,
  manager_note TEXT,
  is_idp_selected BOOLEAN NOT NULL DEFAULT false,
  idp_target_level INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_skill_assessments_updated_at BEFORE UPDATE ON public.skill_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_skill_assessments_form ON public.skill_assessments(form_id);

-- ============================================================
-- 12. development_actions
-- ============================================================
CREATE TABLE public.development_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  skill_assessment_id UUID REFERENCES public.skill_assessments(id),
  action_type TEXT NOT NULL DEFAULT '70',
  action_description TEXT NOT NULL,
  target_outcome TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'planned',
  progress_note TEXT,
  supporter TEXT,
  evidence TEXT,
  pdca_checkpoint TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.development_actions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_development_actions_updated_at BEFORE UPDATE ON public.development_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 13. ai_actions
-- ============================================================
CREATE TABLE public.ai_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  skill_assessment_id UUID REFERENCES public.skill_assessments(id),
  suggestion TEXT NOT NULL,
  action_type TEXT,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_ai_actions_updated_at BEFORE UPDATE ON public.ai_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 14. form04_reports
-- ============================================================
CREATE TABLE public.form04_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.evaluation_cycles(id),
  department_id UUID REFERENCES public.departments(id),
  report_name TEXT NOT NULL,
  total_employees INT NOT NULL DEFAULT 0,
  summary JSONB DEFAULT '{}',
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.form04_reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_form04_reports_updated_at BEFORE UPDATE ON public.form04_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 15. form04_staff_classifications
-- ============================================================
CREATE TABLE public.form04_staff_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.form04_reports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  classification staff_classification NOT NULL,
  performance_score NUMERIC(5,2),
  skill_score NUMERIC(5,2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.form04_staff_classifications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_form04_staff_classifications_updated_at BEFORE UPDATE ON public.form04_staff_classifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 16. training_proposals
-- ============================================================
CREATE TABLE public.training_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  development_action_id UUID REFERENCES public.development_actions(id),
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  training_name TEXT NOT NULL,
  provider TEXT,
  estimated_cost NUMERIC(15,2),
  proposed_date DATE,
  status TEXT NOT NULL DEFAULT 'proposed',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_proposals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_training_proposals_updated_at BEFORE UPDATE ON public.training_proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 17. attachments
-- ============================================================
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_attachments_entity ON public.attachments(entity_type, entity_id);

-- ============================================================
-- 18. audit_logs
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- departments: readable by all authenticated, manageable by admins
CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin') OR public.has_role(auth.uid(), 'tcth_admin'));

-- profiles: users see own, managers see department, admins see all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Managers can view department profiles" ON public.profiles FOR SELECT TO authenticated USING (
  department_id IN (SELECT department_id FROM public.profiles WHERE user_id = auth.uid())
  AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'pgd'))
);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'system_admin') OR public.has_role(auth.uid(), 'tcth_admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- user_roles: viewable by self, manageable by admins
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- evaluation_cycles: readable by all authenticated, manageable by admins
CREATE POLICY "Authenticated can view cycles" ON public.evaluation_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage cycles" ON public.evaluation_cycles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin') OR public.has_role(auth.uid(), 'tcth_admin'));

-- skill_catalog: readable by all authenticated, manageable by admins
CREATE POLICY "Authenticated can view skills" ON public.skill_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage skills" ON public.skill_catalog FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin') OR public.has_role(auth.uid(), 'tcth_admin'));

-- staff_groups: readable by all authenticated, manageable by admins
CREATE POLICY "Authenticated can view staff groups" ON public.staff_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage staff groups" ON public.staff_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin') OR public.has_role(auth.uid(), 'tcth_admin'));

-- form_submissions: users see own, managers see reviewable, admins see all
CREATE POLICY "Users can view own submissions" ON public.form_submissions FOR SELECT TO authenticated USING (employee_id = public.get_my_profile_id());
CREATE POLICY "Reviewers can view assigned submissions" ON public.form_submissions FOR SELECT TO authenticated USING (reviewer_id = public.get_my_profile_id());
CREATE POLICY "Admins can view all submissions" ON public.form_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'system_admin') OR public.has_role(auth.uid(), 'tcth_admin'));
CREATE POLICY "Users can create own submissions" ON public.form_submissions FOR INSERT TO authenticated WITH CHECK (employee_id = public.get_my_profile_id());
CREATE POLICY "Users can update own draft submissions" ON public.form_submissions FOR UPDATE TO authenticated USING (employee_id = public.get_my_profile_id() AND status = 'draft');
CREATE POLICY "Reviewers can update assigned submissions" ON public.form_submissions FOR UPDATE TO authenticated USING (reviewer_id = public.get_my_profile_id());
CREATE POLICY "Admins can manage all submissions" ON public.form_submissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- Child tables of form_submissions: access follows parent
-- kpi_items
CREATE POLICY "Users can manage own kpi items" ON public.kpi_items FOR ALL TO authenticated USING (
  form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = public.get_my_profile_id())
);
CREATE POLICY "Admins can manage all kpi items" ON public.kpi_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- recognition_items
CREATE POLICY "Users can manage own recognition items" ON public.recognition_items FOR ALL TO authenticated USING (
  form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = public.get_my_profile_id())
);
CREATE POLICY "Admins can manage all recognition items" ON public.recognition_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- reflection_answers
CREATE POLICY "Users can manage own reflections" ON public.reflection_answers FOR ALL TO authenticated USING (
  form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = public.get_my_profile_id())
);
CREATE POLICY "Admins can manage all reflections" ON public.reflection_answers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- skill_assessments
CREATE POLICY "Users can manage own skill assessments" ON public.skill_assessments FOR ALL TO authenticated USING (
  form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = public.get_my_profile_id())
);
CREATE POLICY "Admins can manage all skill assessments" ON public.skill_assessments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- development_actions
CREATE POLICY "Users can manage own dev actions" ON public.development_actions FOR ALL TO authenticated USING (
  form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = public.get_my_profile_id())
);
CREATE POLICY "Admins can manage all dev actions" ON public.development_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- ai_actions
CREATE POLICY "Users can manage own ai actions" ON public.ai_actions FOR ALL TO authenticated USING (
  form_id IN (SELECT id FROM public.form_submissions WHERE employee_id = public.get_my_profile_id())
);
CREATE POLICY "Admins can manage all ai actions" ON public.ai_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- form04_reports: admins and managers
CREATE POLICY "Managers and admins can view reports" ON public.form04_reports FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'system_admin') OR public.has_role(auth.uid(), 'tcth_admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'pgd')
);
CREATE POLICY "Admins can manage reports" ON public.form04_reports FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin') OR public.has_role(auth.uid(), 'tcth_admin'));

-- form04_staff_classifications
CREATE POLICY "Managers and admins can view classifications" ON public.form04_staff_classifications FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'system_admin') OR public.has_role(auth.uid(), 'tcth_admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'pgd')
);
CREATE POLICY "Admins can manage classifications" ON public.form04_staff_classifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin') OR public.has_role(auth.uid(), 'tcth_admin'));

-- training_proposals
CREATE POLICY "Users can view own training proposals" ON public.training_proposals FOR SELECT TO authenticated USING (employee_id = public.get_my_profile_id());
CREATE POLICY "Admins can manage training proposals" ON public.training_proposals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin') OR public.has_role(auth.uid(), 'tcth_admin'));
CREATE POLICY "Users can create own training proposals" ON public.training_proposals FOR INSERT TO authenticated WITH CHECK (employee_id = public.get_my_profile_id());

-- attachments
CREATE POLICY "Authenticated can view attachments" ON public.attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can upload attachments" ON public.attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Admins can manage attachments" ON public.attachments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- audit_logs: insert-only for authenticated, viewable by admins
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

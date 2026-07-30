-- Đợt 6 BHY one: nhật ký đăng ký phiên thảo luận Credit 360
-- (port từ Firestore bhy_credit_sessions).

CREATE TABLE public.portal_credit_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  session_date DATE,
  department_name TEXT,
  customer_name TEXT,
  business_field TEXT,
  actual_revenue TEXT,
  credit_limit NUMERIC,
  underwriter TEXT,
  dept_leader TEXT,
  custom_values JSONB,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  creator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_credit_sessions_date ON public.portal_credit_sessions (session_date DESC);

ALTER TABLE public.portal_credit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view credit sessions"
  ON public.portal_credit_sessions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert own credit sessions"
  ON public.portal_credit_sessions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_staff(auth.uid()));

CREATE POLICY "Owners can update own credit sessions"
  ON public.portal_credit_sessions FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can manage credit sessions"
  ON public.portal_credit_sessions FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

CREATE TRIGGER update_portal_credit_sessions_updated_at
  BEFORE UPDATE ON public.portal_credit_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

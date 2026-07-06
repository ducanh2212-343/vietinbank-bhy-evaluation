-- Chiến dịch học tập tập thể theo mùa: cả phòng / nhóm cán bộ cùng nâng một kỹ năng
-- lên mức tối thiểu trong một khoảng thời gian. Tiến trình là THÀNH TỰU TẬP THỂ
-- (% thành viên đạt mục tiêu) — không xếp hạng cá nhân.

CREATE TABLE IF NOT EXISTS public.learning_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  skill_id uuid NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  target_level int NOT NULL CHECK (target_level BETWEEN 1 AND 4),
  cycle_id uuid REFERENCES public.evaluation_cycles(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- Đối tượng tham gia: theo phòng ban và/hoặc đích danh cán bộ
CREATE TABLE IF NOT EXISTS public.learning_campaign_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.learning_campaigns(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (department_id IS NOT NULL OR profile_id IS NOT NULL),
  UNIQUE NULLS NOT DISTINCT (campaign_id, department_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign ON public.learning_campaign_targets (campaign_id);

ALTER TABLE public.learning_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_campaign_targets ENABLE ROW LEVEL SECURITY;

-- Mọi người đăng nhập đều xem được chiến dịch (tính chất phong trào chung)
DROP POLICY IF EXISTS "Authenticated can view campaigns" ON public.learning_campaigns;
CREATE POLICY "Authenticated can view campaigns"
  ON public.learning_campaigns FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view campaign targets" ON public.learning_campaign_targets;
CREATE POLICY "Authenticated can view campaign targets"
  ON public.learning_campaign_targets FOR SELECT TO authenticated USING (true);

-- Chỉ BGĐ / TCTH admin / system admin quản trị chiến dịch
DROP POLICY IF EXISTS "Admins manage campaigns" ON public.learning_campaigns;
CREATE POLICY "Admins manage campaigns"
  ON public.learning_campaigns FOR ALL
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
    OR public.has_role(auth.uid(), 'bgd'::app_role)
  );

DROP POLICY IF EXISTS "Admins manage campaign targets" ON public.learning_campaign_targets;
CREATE POLICY "Admins manage campaign targets"
  ON public.learning_campaign_targets FOR ALL
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
    OR public.has_role(auth.uid(), 'bgd'::app_role)
  );

-- Tiến trình tập thể của chiến dịch: tổng thành viên & số người đã đạt mục tiêu.
-- SECURITY DEFINER: nhân viên thường chỉ thấy con số tổng hợp, không thấy level từng người.
CREATE OR REPLACE FUNCTION public.get_campaign_progress(_campaign_id uuid)
RETURNS TABLE (total_members int, achieved int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH camp AS (
    SELECT id, skill_id, target_level, cycle_id FROM public.learning_campaigns WHERE id = _campaign_id
  ),
  cyc AS (
    SELECT COALESCE(
      (SELECT cycle_id FROM camp),
      (SELECT ec.id FROM public.evaluation_cycles ec
        WHERE ec.cycle_type = 'quarterly' ORDER BY ec.start_date DESC LIMIT 1)
    ) AS id
  ),
  members AS (
    SELECT DISTINCT p.id
    FROM public.profiles p
    JOIN public.learning_campaign_targets t ON t.campaign_id = _campaign_id
      AND (t.profile_id = p.id OR (t.department_id IS NOT NULL AND t.department_id = p.department_id))
    WHERE p.status = 'active'
  ),
  latest_forms AS (
    SELECT DISTINCT ON (fs.employee_id) fs.employee_id, fs.id
    FROM public.form_submissions fs, cyc
    WHERE fs.cycle_id = cyc.id
    ORDER BY fs.employee_id, fs.updated_at DESC
  ),
  lv AS (
    SELECT lf.employee_id,
      CASE
        WHEN sa.manager_l0 THEN 0
        WHEN sa.manager_assessed_level IS NOT NULL THEN sa.manager_assessed_level
        WHEN sa.self_l0 THEN 0
        ELSE sa.self_assessed_level
      END AS lvl
    FROM latest_forms lf
    JOIN camp c ON true
    JOIN public.skill_assessments sa ON sa.form_id = lf.id AND sa.skill_id = c.skill_id
  )
  SELECT
    (SELECT count(*) FROM members)::int,
    (SELECT count(*) FROM members m JOIN lv ON lv.employee_id = m.id JOIN camp c ON true
      WHERE lv.lvl IS NOT NULL AND lv.lvl >= c.target_level)::int;
$$;

REVOKE ALL ON FUNCTION public.get_campaign_progress(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_progress(uuid) TO authenticated;

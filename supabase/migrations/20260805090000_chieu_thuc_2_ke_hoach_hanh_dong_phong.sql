-- ============================================================================
-- Chiêu thức 2 — Kế hoạch hành động cấp Phòng (5W2H + PDCA)
--
-- KHÁC với kanban_cards: kanban_cards là hành động phát triển năng lực của TỪNG
-- CÁN BỘ, sinh ra từ phiếu tự đánh giá. Bảng dưới đây là kế hoạch hành động của
-- CẢ PHÒNG theo Chiêu thức 2 (SWOT → TOWS → 5W2H), do lãnh đạo Phòng lập và cả
-- phòng cùng theo dõi nhịp PDCA.
--
-- Phạm vi xem (chốt với Chi nhánh):
--   · Cán bộ / lãnh đạo Phòng   → kế hoạch của phòng mình
--   · Phó Giám đốc              → các phòng mình phụ trách
--   · Giám đốc / BGĐ / TCTH     → toàn chi nhánh
--   · Chiến dịch chung liên phòng → mọi phòng được thêm vào đều xem được
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Kế hoạch hành động
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES public.evaluation_cycles(id) ON DELETE SET NULL,
  -- Phòng chủ trì. Với chiến dịch chung, đây là phòng khởi tạo.
  owner_department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,

  -- Bộ 5W2H
  title text NOT NULL,                 -- What  — làm gì
  why text,                            -- Why   — vì sao phải làm
  where_place text,                    -- Where — làm ở đâu / địa bàn nào
  who_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Who — đầu mối
  how text,                            -- How   — cách làm
  how_much text,                       -- How much — nguồn lực / chỉ tiêu định lượng
  start_date date,                     -- When  — bắt đầu
  due_date date,                       -- When  — hạn hoàn thành

  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done')),
  progress_percent integer NOT NULL DEFAULT 0
    CHECK (progress_percent >= 0 AND progress_percent <= 100),
  -- Nhịp PDCA: Plan → Do → Check → Act
  pdca_stage text NOT NULL DEFAULT 'plan' CHECK (pdca_stage IN ('plan','do','check','act')),

  -- Chiến dịch chung liên phòng: lãnh đạo Phòng trở lên khởi tạo rồi thêm phòng khác
  is_campaign boolean NOT NULL DEFAULT false,

  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_progress_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_plans_dept_cycle
  ON public.action_plans(owner_department_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_due ON public.action_plans(due_date);
CREATE INDEX IF NOT EXISTS idx_action_plans_status ON public.action_plans(status);

-- ---------------------------------------------------------------------------
-- 2) Phòng tham gia chiến dịch chung
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.action_plan_departments (
  action_plan_id uuid NOT NULL REFERENCES public.action_plans(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (action_plan_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_action_plan_departments_dept
  ON public.action_plan_departments(department_id);

-- ---------------------------------------------------------------------------
-- 3) Nhật ký PDCA — mỗi lần cập nhật tiến độ là một dòng, không ghi đè
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.action_plan_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_plan_id uuid NOT NULL REFERENCES public.action_plans(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  pdca_stage text NOT NULL CHECK (pdca_stage IN ('plan','do','check','act')),
  progress_percent integer CHECK (progress_percent >= 0 AND progress_percent <= 100),
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_plan_updates_plan
  ON public.action_plan_updates(action_plan_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4) Hàm phạm vi — dùng lại đúng bộ helper sẵn có của hệ thống
-- ---------------------------------------------------------------------------

-- Toàn chi nhánh: Giám đốc/BGĐ, TCTH admin, System admin, lãnh đạo Phòng TCTH
CREATE OR REPLACE FUNCTION public.can_view_all_action_plans()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'bgd'::app_role)
      OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
      OR public.has_role(auth.uid(), 'system_admin'::app_role)
      OR public.is_tcth_leader(auth.uid())
$$;

-- Phòng nằm trong tầm nhìn của tôi: phòng mình, hoặc phòng tôi phụ trách (PGĐ)
CREATE OR REPLACE FUNCTION public.is_my_scope_department(_dept uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _dept IS NOT NULL
     AND (
       _dept = public.get_my_department_id()
       OR _dept = ANY(public.get_my_pgd_scope_dept_ids())
     )
$$;

-- Được xem kế hoạch này không
CREATE OR REPLACE FUNCTION public.can_view_action_plan(_plan_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff()
     AND EXISTS (
       SELECT 1 FROM public.action_plans ap
       WHERE ap.id = _plan_id
         AND (
           public.can_view_all_action_plans()
           OR public.is_my_scope_department(ap.owner_department_id)
           -- Phòng được thêm vào chiến dịch chung
           OR EXISTS (
             SELECT 1 FROM public.action_plan_departments d
             WHERE d.action_plan_id = ap.id
               AND public.is_my_scope_department(d.department_id)
           )
         )
     )
$$;

-- Được sửa kế hoạch của phòng này không: lãnh đạo Phòng đó, PGĐ phụ trách, hoặc admin
CREATE OR REPLACE FUNCTION public.can_edit_action_plan_for_dept(_dept uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_view_all_action_plans()
      OR public.is_dept_manager(_dept)
      OR (_dept = ANY(public.get_my_pgd_scope_dept_ids()))
$$;

REVOKE ALL ON FUNCTION public.can_view_all_action_plans() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_my_scope_department(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_action_plan(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_action_plan_for_dept(uuid) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- 5) RLS
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_plan_departments TO authenticated;
GRANT SELECT, INSERT ON public.action_plan_updates TO authenticated;
GRANT ALL ON public.action_plans, public.action_plan_departments, public.action_plan_updates TO service_role;

ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plan_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plan_updates ENABLE ROW LEVEL SECURITY;

-- Khách đối tác (guest) KHÔNG có cửa nào vào đây: mọi policy đều đi qua is_staff()
DROP POLICY IF EXISTS "Xem ke hoach hanh dong trong pham vi" ON public.action_plans;
CREATE POLICY "Xem ke hoach hanh dong trong pham vi"
  ON public.action_plans FOR SELECT TO authenticated
  USING (public.can_view_action_plan(id));

DROP POLICY IF EXISTS "Lanh dao phong tao ke hoach" ON public.action_plans;
CREATE POLICY "Lanh dao phong tao ke hoach"
  ON public.action_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND public.can_edit_action_plan_for_dept(owner_department_id));

DROP POLICY IF EXISTS "Lanh dao phong sua ke hoach" ON public.action_plans;
CREATE POLICY "Lanh dao phong sua ke hoach"
  ON public.action_plans FOR UPDATE TO authenticated
  USING (public.can_edit_action_plan_for_dept(owner_department_id))
  WITH CHECK (public.can_edit_action_plan_for_dept(owner_department_id));

DROP POLICY IF EXISTS "Lanh dao phong xoa ke hoach" ON public.action_plans;
CREATE POLICY "Lanh dao phong xoa ke hoach"
  ON public.action_plans FOR DELETE TO authenticated
  USING (public.can_edit_action_plan_for_dept(owner_department_id));

-- Danh sách phòng tham gia chiến dịch: xem theo quyền của chính kế hoạch
DROP POLICY IF EXISTS "Xem phong tham gia chien dich" ON public.action_plan_departments;
CREATE POLICY "Xem phong tham gia chien dich"
  ON public.action_plan_departments FOR SELECT TO authenticated
  USING (public.can_view_action_plan(action_plan_id));

-- Chỉ người sửa được kế hoạch mới thêm/bớt phòng tham gia
DROP POLICY IF EXISTS "Them phong vao chien dich" ON public.action_plan_departments;
CREATE POLICY "Them phong vao chien dich"
  ON public.action_plan_departments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff() AND EXISTS (
      SELECT 1 FROM public.action_plans ap
      WHERE ap.id = action_plan_id
        AND public.can_edit_action_plan_for_dept(ap.owner_department_id)
    )
  );

DROP POLICY IF EXISTS "Bot phong khoi chien dich" ON public.action_plan_departments;
CREATE POLICY "Bot phong khoi chien dich"
  ON public.action_plan_departments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.action_plans ap
      WHERE ap.id = action_plan_id
        AND public.can_edit_action_plan_for_dept(ap.owner_department_id)
    )
  );

-- Nhật ký PDCA: ai xem được kế hoạch thì đọc được nhật ký.
-- Ghi thì mọi cán bộ trong phạm vi đều ghi được — đây là chỗ cả phòng cùng vào
-- báo nhịp, không phải đặc quyền của lãnh đạo. Không cho sửa/xóa để nhật ký là
-- bằng chứng PDCA trung thực.
DROP POLICY IF EXISTS "Xem nhat ky pdca" ON public.action_plan_updates;
CREATE POLICY "Xem nhat ky pdca"
  ON public.action_plan_updates FOR SELECT TO authenticated
  USING (public.can_view_action_plan(action_plan_id));

DROP POLICY IF EXISTS "Ghi nhat ky pdca" ON public.action_plan_updates;
CREATE POLICY "Ghi nhat ky pdca"
  ON public.action_plan_updates FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff()
    AND profile_id = public.get_my_profile_id()
    AND public.can_view_action_plan(action_plan_id)
  );

-- ---------------------------------------------------------------------------
-- 6) Cập nhật nhịp: ghi nhật ký thì tự đẩy tiến độ + mốc cập nhật của kế hoạch
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.action_plan_sync_progress()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.action_plans
     SET progress_percent = COALESCE(NEW.progress_percent, progress_percent),
         pdca_stage = NEW.pdca_stage,
         last_progress_at = NEW.created_at,
         status = CASE
                    WHEN COALESCE(NEW.progress_percent, progress_percent) >= 100 THEN 'done'
                    WHEN COALESCE(NEW.progress_percent, progress_percent) > 0 THEN 'doing'
                    ELSE status
                  END,
         updated_at = now()
   WHERE id = NEW.action_plan_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_action_plan_sync_progress ON public.action_plan_updates;
CREATE TRIGGER trg_action_plan_sync_progress
  AFTER INSERT ON public.action_plan_updates
  FOR EACH ROW EXECUTE FUNCTION public.action_plan_sync_progress();

DROP TRIGGER IF EXISTS trg_action_plans_updated_at ON public.action_plans;
CREATE TRIGGER trg_action_plans_updated_at
  BEFORE UPDATE ON public.action_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.action_plans IS
  'Chiêu thức 2 — kế hoạch hành động cấp Phòng theo 5W2H, theo dõi nhịp PDCA. Khác kanban_cards (hành động phát triển năng lực của từng cán bộ).';

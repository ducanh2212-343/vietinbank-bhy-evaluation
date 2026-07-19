-- ============================================================================
-- NẾP TỐT — Bước 1: Ghi nhanh + Nhật ký hành vi
-- Phân hệ quản trị & phát triển hành vi cán bộ "Bắc Hưng Yên Nếp Tốt".
--
-- Gồm:
--   1) management_scopes  — phân công phạm vi (Phó phòng theo cán bộ, PGĐ theo
--      phòng, ủy quyền có thời hạn). Bước đầu CHỈ dùng cho Nếp Tốt, không đụng
--      RLS của các bảng đánh giá hiện có.
--   2) behavior_notes     — mẩu nhớ / bản ghi hành vi. Dữ liệu nhạy cảm:
--      tcth_admin/system_admin KHÔNG có policy đọc (khác thông lệ bảng cũ,
--      quyết định có chủ đích — xem plan Nếp Tốt).
--   3) can_observe_profile() — scope hợp nhất chuỗi quản lý hiện có
--      (manager_id/pgd_id/director_id/departments.manager_id) + management_scopes.
--   4) get_observable_profiles() — danh sách cán bộ cho picker Ghi nhanh.
--   5) Audit qua audit_logs: CHỈ metadata (trạng thái/loại/cờ chia sẻ),
--      KHÔNG chứa nội dung hành vi — vì audit_logs đọc được bởi system_admin.
--   6) Seed ai_prompts mode 'behavior_structuring' (template đầy đủ để bản
--      ai-advisor đang deploy render được ngay; fallback trong code là dự phòng).
--
-- Rollback: supabase/rollbacks/20260727090000_nep_tot_step1_behavior_notes_down.sql
-- ============================================================================

-- 1) Phân công phạm vi quản lý & ủy quyền có thời hạn
CREATE TABLE IF NOT EXISTS public.management_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grantee_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('phong', 'ca_nhan')),
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  staff_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  purpose text NOT NULL DEFAULT 'nep_tot_ghi' CHECK (purpose IN ('nep_tot_ghi', 'nep_tot_xem')),
  valid_from date NOT NULL DEFAULT current_date,
  valid_to date,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope_type = 'phong' AND department_id IS NOT NULL AND staff_profile_id IS NULL)
    OR (scope_type = 'ca_nhan' AND staff_profile_id IS NOT NULL AND department_id IS NULL)
  ),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_management_scopes_grantee
  ON public.management_scopes (grantee_profile_id) WHERE is_active;

CREATE TRIGGER update_management_scopes_updated_at
  BEFORE UPDATE ON public.management_scopes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Bản ghi hành vi
CREATE TABLE IF NOT EXISTS public.behavior_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  observer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw_text text NOT NULL,
  behavior_type text NOT NULL CHECK (behavior_type IN ('tich_cuc', 'can_cai_thien')),
  status text NOT NULL DEFAULT 'nhap' CHECK (status IN ('nhap', 'da_xac_nhan', 'luu_tru')),
  -- Bản cấu trúc (điền ở bước hoàn thiện, AI chỉ gợi ý — người ghi xác nhận)
  situation text,
  behavior text,
  impact text,
  skill_ids uuid[] NOT NULL DEFAULT '{}',
  attitude_dimension_ids integer[] NOT NULL DEFAULT '{}',
  impact_level text CHECK (impact_level IS NULL OR impact_level IN ('thap', 'vua', 'cao')),
  is_repeated boolean,
  ai_draft jsonb,
  shared_with_employee boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Không tự ghi nhận hành vi của chính mình
  CHECK (observer_id <> employee_id)
);

CREATE INDEX IF NOT EXISTS idx_behavior_notes_employee ON public.behavior_notes (employee_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_notes_observer ON public.behavior_notes (observer_id, status);

CREATE TRIGGER update_behavior_notes_updated_at
  BEFORE UPDATE ON public.behavior_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mốc xác nhận + chỉ bản đã xác nhận mới được chia sẻ cho cán bộ
CREATE OR REPLACE FUNCTION public.behavior_notes_before_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'da_xac_nhan' AND (TG_OP = 'INSERT' OR OLD.status <> 'da_xac_nhan') THEN
    NEW.confirmed_at := now();
  END IF;
  IF NEW.status <> 'da_xac_nhan' THEN
    NEW.shared_with_employee := false;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER behavior_notes_before_write
  BEFORE INSERT OR UPDATE ON public.behavior_notes
  FOR EACH ROW EXECUTE FUNCTION public.behavior_notes_before_write();

-- 3) Scope: ai được quan sát/ghi nhận cán bộ nào
--    Hợp của: (a) BGĐ (Giám đốc) toàn chi nhánh; (b) chuỗi quản lý trực tiếp
--    trên profiles; (c) Trưởng phòng đứng đầu phòng (departments.manager_id);
--    (d) PGĐ theo khối (suy từ pgd_id — cùng nguồn với các scope hiện có);
--    (e) phân công/ủy quyền còn hiệu lực trong management_scopes.
--    Phó phòng KHÔNG mặc định thấy cả phòng — chỉ theo (b) hoặc (e) [quyết định
--    "PP scope chặt" trong plan]. tcth_admin/system_admin không nằm trong hàm này.
CREATE OR REPLACE FUNCTION public.can_observe_profile(_target uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles t
    JOIN public.profiles me ON me.user_id = auth.uid()
    WHERE t.id = _target
      AND me.id <> t.id
      AND (
        public.has_role(auth.uid(), 'bgd')
        OR t.manager_id = me.id
        OR t.pgd_id = me.id
        OR t.director_id = me.id
        OR EXISTS (
          SELECT 1 FROM public.departments d
          WHERE d.id = t.department_id AND d.manager_id = me.id
        )
        OR (public.has_role(auth.uid(), 'pgd')
            AND t.department_id = ANY (public.get_my_pgd_scope_dept_ids()))
        OR EXISTS (
          SELECT 1 FROM public.management_scopes ms
          WHERE ms.grantee_profile_id = me.id
            AND ms.is_active
            AND ms.valid_from <= current_date
            AND (ms.valid_to IS NULL OR ms.valid_to >= current_date)
            AND (
              (ms.scope_type = 'ca_nhan' AND ms.staff_profile_id = t.id)
              OR (ms.scope_type = 'phong' AND ms.department_id = t.department_id)
            )
        )
      )
  );
$$;

-- 4) Danh sách cán bộ trong phạm vi ghi nhận (cho picker Ghi nhanh)
CREATE OR REPLACE FUNCTION public.get_observable_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  employee_code text,
  department_id uuid,
  department_name text,
  position_title text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.employee_code, p.department_id, d.name, p.position
  FROM public.profiles p
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE p.status = 'active'
    AND public.can_observe_profile(p.id)
  ORDER BY d.name NULLS LAST, p.full_name;
$$;

-- Vệ sinh quyền EXECUTE như 20260704180000: không cho anon/PUBLIC
REVOKE EXECUTE ON FUNCTION public.can_observe_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_observable_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_observe_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_observable_profiles() TO authenticated;

-- 5) RLS
ALTER TABLE public.management_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;

-- management_scopes: người liên quan tự xem; GĐ (bgd) + admin quản lý
CREATE POLICY "Involved users can view management scopes" ON public.management_scopes
  FOR SELECT TO authenticated
  USING (
    grantee_profile_id = public.get_my_profile_id()
    OR granted_by = public.get_my_profile_id()
    OR public.has_role(auth.uid(), 'bgd')
    OR public.has_role(auth.uid(), 'tcth_admin')
    OR public.has_role(auth.uid(), 'system_admin')
  );

CREATE POLICY "Admins manage management scopes" ON public.management_scopes
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'bgd')
    OR public.has_role(auth.uid(), 'tcth_admin')
    OR public.has_role(auth.uid(), 'system_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'bgd')
    OR public.has_role(auth.uid(), 'tcth_admin')
    OR public.has_role(auth.uid(), 'system_admin')
  );

-- behavior_notes: KHÔNG có policy cho tcth_admin/system_admin (chủ đích).
-- Người tạo: toàn quyền xem/sửa bản ghi của mình. Không có policy DELETE —
-- không xóa cứng, chỉ chuyển trạng thái 'luu_tru'.
CREATE POLICY "Observers view own behavior notes" ON public.behavior_notes
  FOR SELECT TO authenticated
  USING (observer_id = public.get_my_profile_id());

CREATE POLICY "Observers insert behavior notes in scope" ON public.behavior_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    observer_id = public.get_my_profile_id()
    AND (
      public.has_role(auth.uid(), 'manager')
      OR public.has_role(auth.uid(), 'pgd')
      OR public.has_role(auth.uid(), 'bgd')
    )
    AND public.can_observe_profile(employee_id)
  );

CREATE POLICY "Observers update own behavior notes" ON public.behavior_notes
  FOR UPDATE TO authenticated
  USING (observer_id = public.get_my_profile_id())
  WITH CHECK (observer_id = public.get_my_profile_id());

-- Lãnh đạo trong scope xem bản ghi ĐÃ XÁC NHẬN của cán bộ mình phụ trách
-- (bản nháp là mẩu nhớ riêng của người tạo)
CREATE POLICY "Scope leaders view confirmed notes" ON public.behavior_notes
  FOR SELECT TO authenticated
  USING (status = 'da_xac_nhan' AND public.can_observe_profile(employee_id));

-- Cán bộ chỉ xem bản đã xác nhận VÀ được chia sẻ về chính mình
CREATE POLICY "Employees view own shared notes" ON public.behavior_notes
  FOR SELECT TO authenticated
  USING (
    employee_id = public.get_my_profile_id()
    AND shared_with_employee
    AND status = 'da_xac_nhan'
  );

-- 6) Audit: chỉ metadata, không nội dung (audit_logs đọc được bởi system_admin)
CREATE OR REPLACE FUNCTION public.log_nep_tot_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_TABLE_NAME = 'behavior_notes' THEN
    IF TG_OP = 'UPDATE' THEN
      v_old := jsonb_build_object(
        'status', OLD.status, 'behavior_type', OLD.behavior_type,
        'shared_with_employee', OLD.shared_with_employee);
    END IF;
    v_new := jsonb_build_object(
      'status', NEW.status, 'behavior_type', NEW.behavior_type,
      'shared_with_employee', NEW.shared_with_employee,
      'employee_id', NEW.employee_id, 'observer_id', NEW.observer_id);
  ELSE
    IF TG_OP = 'UPDATE' THEN v_old := to_jsonb(OLD); END IF;
    v_new := to_jsonb(NEW);
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (auth.uid(), TG_TABLE_NAME || ':' || lower(TG_OP), TG_TABLE_NAME, NEW.id, v_old, v_new);
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.log_nep_tot_audit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER audit_behavior_notes
  AFTER INSERT OR UPDATE ON public.behavior_notes
  FOR EACH ROW EXECUTE FUNCTION public.log_nep_tot_audit();

CREATE TRIGGER audit_management_scopes
  AFTER INSERT OR UPDATE ON public.management_scopes
  FOR EACH ROW EXECUTE FUNCTION public.log_nep_tot_audit();

-- 7) Seed prompt AI cho mode cấu trúc hóa mẩu nhớ (admin chỉnh được ở /quan-tri-ai)
INSERT INTO public.ai_prompts (mode, description, content, is_active) VALUES (
  'behavior_structuring',
  'Nếp Tốt: viết lại mẩu nhớ hành vi theo cấu trúc Tình huống/Hành vi/Tác động + gợi ý skill & nhóm thái độ. Biến: {raw_text}, {behavior_type_label}, {occurred_at}, {position_title}, {department_name}, {skills_catalog}, {attitudes_catalog}. Trả về JSON thuần.',
  $tpl$Bạn giúp một lãnh đạo ngân hàng hoàn thiện MẨU NHỚ về hành vi của một cán bộ thành bản ghi có cấu trúc. Chỉ dựa trên nội dung mẩu nhớ — KHÔNG bịa thêm sự kiện, KHÔNG kết luận về tính cách, KHÔNG dùng các từ "thái độ kém", "thiếu trách nhiệm", "năng lực yếu", "không phù hợp". Viết theo logic: bằng chứng quan sát được → mô tả trung tính.

MẨU NHỚ (loại: {behavior_type_label}, thời điểm: {occurred_at}):
{raw_text}

Bối cảnh cán bộ: vị trí {position_title}, đơn vị {department_name}.

DANH MỤC SKILL (chọn tối đa 3 mã phù hợp nhất):
{skills_catalog}

DANH MỤC 6 NHÓM THÁI ĐỘ (chọn tối đa 2 id phù hợp nhất):
{attitudes_catalog}

Trả về DUY NHẤT một object JSON hợp lệ (không markdown, không giải thích ngoài JSON):
{"situation":"bối cảnh/tình huống, 1-2 câu","behavior":"hành vi quan sát được, mô tả trung tính","impact":"tác động hoặc kết quả (nếu mẩu nhớ có nêu; không có thì chuỗi rỗng)","skill_codes":["SKxx"],"attitude_ids":[1],"impact_level":"thap|vua|cao","is_repeated_hint":"câu nhận xét ngắn: mẩu nhớ có dấu hiệu hành vi lặp lại không, hay chưa đủ dữ liệu","rewrite":"bản viết lại hoàn chỉnh 2-3 câu, giọng khách quan"}$tpl$,
  true
)
ON CONFLICT (mode) DO NOTHING;

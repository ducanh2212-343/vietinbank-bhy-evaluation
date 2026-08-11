-- ============================================================================
-- NHẬT KÝ HÀNH VI — Quyền GHI bám "lãnh đạo thật", không bám role đăng nhập
--
-- Bối cảnh: user_roles UNIQUE(user_id) → mỗi tài khoản chỉ MỘT role. Lãnh đạo
-- Phòng Tổ chức Tổng hợp phải mang role 'tcth_admin' để làm quản trị nhân sự,
-- nên mất role 'manager' và bị chặn ghi nhận hành vi chính cán bộ phòng mình
-- (Trưởng phòng TCTH đang quản 8 cán bộ; Phó phòng TCTH cũng vậy). Giám đốc
-- chi nhánh đã được vá riêng ở 20260803090000 — nay tổng quát hóa thay vì vá
-- lẻ từng người.
--
-- Cách xác định lãnh đạo (khớp lối title-matching sẵn có trong
-- sync_manager_role_from_position và can_record_profile):
--   is_leader_position(): chức danh mở đầu bằng Giám đốc/Trưởng/Phó
--   can_record_behavior(): role manager|pgd|bgd, HOẶC chức danh lãnh đạo,
--     HOẶC là trưởng phòng trong bảng departments, HOẶC có cán bộ khai mình là
--     manager/pgd/director, HOẶC đang được cấp management_scopes hiệu lực.
--
-- Phạm vi từng cán bộ KHÔNG nới: policy vẫn AND can_record_profile(employee_id)
-- nên mỗi người chỉ ghi được đúng cán bộ thuộc phạm vi của mình. Nhánh "lãnh
-- đạo cùng phòng ghi cấp cán bộ" trong can_record_profile trước đây đòi role
-- 'manager' — nay nhận cả chức danh lãnh đạo, để Phó phòng TCTH ghi được cán
-- bộ phòng mình.
-- Rollback: supabase/rollbacks/20260811103000_hanh_vi_quyen_ghi_theo_vai_tro_that_down.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_leader_position()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.user_id = auth.uid()
      AND (COALESCE(me."position", '') ILIKE 'Giám đốc%'
        OR COALESCE(me."position", '') ILIKE 'Trưởng%'
        OR COALESCE(me."position", '') ILIKE 'Phó%')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_leader_position() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_leader_position() TO authenticated;

-- Cổng "có phải người ghi nhận hay không". Phạm vi từng cán bộ do
-- can_record_profile() quyết định, hàm này chỉ chặn người không quản ai.
CREATE OR REPLACE FUNCTION public.can_record_behavior()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'pgd')
    OR public.has_role(auth.uid(), 'bgd')
    OR public.is_leader_position()
    OR EXISTS (
      SELECT 1 FROM public.departments d
      JOIN public.profiles me ON me.user_id = auth.uid()
      WHERE d.manager_id = me.id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles t
      JOIN public.profiles me ON me.user_id = auth.uid()
      WHERE t.manager_id = me.id OR t.pgd_id = me.id OR t.director_id = me.id
    )
    OR EXISTS (
      SELECT 1 FROM public.management_scopes ms
      JOIN public.profiles me ON me.user_id = auth.uid()
      WHERE ms.grantee_profile_id = me.id
        AND ms.is_active
        AND ms.valid_from <= current_date
        AND (ms.valid_to IS NULL OR ms.valid_to >= current_date)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_record_behavior() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_record_behavior() TO authenticated;

-- Nhánh cùng phòng: nhận cả chức danh lãnh đạo, không chỉ role 'manager'
CREATE OR REPLACE FUNCTION public.can_record_profile(_target uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_observe_profile(_target)
    OR EXISTS (
      SELECT 1
      FROM public.profiles t
      JOIN public.profiles me ON me.user_id = auth.uid()
      WHERE t.id = _target
        AND me.id <> t.id
        AND (public.has_role(auth.uid(), 'manager') OR public.is_leader_position())
        AND t.department_id IS NOT NULL
        AND t.department_id = me.department_id
        AND COALESCE(t."position", '') NOT ILIKE 'Trưởng%'
        AND COALESCE(t."position", '') NOT ILIKE 'Phó%'
    );
$$;

DROP POLICY IF EXISTS "Observers insert behavior notes in scope" ON public.behavior_notes;
CREATE POLICY "Observers insert behavior notes in scope" ON public.behavior_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    observer_id = public.get_my_profile_id()
    AND public.can_record_behavior()
    AND public.can_record_profile(employee_id)
  );

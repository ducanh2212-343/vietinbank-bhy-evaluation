-- Gợi ý kèm cặp nội bộ (mentor matching) cho phần "20%" của IDP 70/20/10:
-- - Bảng mentorship_pairs ghi nhận cặp mentor–mentee theo kỳ + kỹ năng
-- - Trigger giới hạn mỗi mentor kèm tối đa 2 người / kỳ
-- - RPC suggest_skill_mentors: gợi ý người đạt L3+ ở kỹ năng cần up
--   (SECURITY DEFINER: nhân viên thường không đọc được skill_assessments của người khác,
--    RPC chỉ trả về thông tin tối thiểu: tên, phòng, level, số mentee đang kèm)

CREATE TABLE IF NOT EXISTS public.mentorship_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.evaluation_cycles(id) ON DELETE CASCADE,
  mentor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentee_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, mentor_profile_id, mentee_profile_id, skill_id),
  CHECK (mentor_profile_id <> mentee_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_mentorship_pairs_mentor ON public.mentorship_pairs (mentor_profile_id, cycle_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_mentorship_pairs_mentee ON public.mentorship_pairs (mentee_profile_id, cycle_id);

ALTER TABLE public.mentorship_pairs ENABLE ROW LEVEL SECURITY;

-- Xem: chính mentee, chính mentor, hoặc người quản lý trong phạm vi (manager/pgd/admin)
DROP POLICY IF EXISTS "View own or scoped mentorship pairs" ON public.mentorship_pairs;
CREATE POLICY "View own or scoped mentorship pairs"
  ON public.mentorship_pairs FOR SELECT
  USING (
    mentee_profile_id = public.get_my_profile_id()
    OR mentor_profile_id = public.get_my_profile_id()
    OR public.can_view_profile(mentee_profile_id)
  );

-- Tạo: mentee tự đăng ký, hoặc quản lý trong phạm vi tạo giúp
DROP POLICY IF EXISTS "Create mentorship for self or scope" ON public.mentorship_pairs;
CREATE POLICY "Create mentorship for self or scope"
  ON public.mentorship_pairs FOR INSERT
  WITH CHECK (
    mentee_profile_id = public.get_my_profile_id()
    OR public.can_view_profile(mentee_profile_id)
  );

-- Cập nhật trạng thái: mentee, mentor hoặc quản lý trong phạm vi
DROP POLICY IF EXISTS "Update mentorship for self or scope" ON public.mentorship_pairs;
CREATE POLICY "Update mentorship for self or scope"
  ON public.mentorship_pairs FOR UPDATE
  USING (
    mentee_profile_id = public.get_my_profile_id()
    OR mentor_profile_id = public.get_my_profile_id()
    OR public.can_view_profile(mentee_profile_id)
  );

-- Mỗi mentor kèm tối đa 2 mentee đang hoạt động trong một kỳ
CREATE OR REPLACE FUNCTION public.enforce_mentor_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND (
    SELECT count(*)
    FROM public.mentorship_pairs mp
    WHERE mp.mentor_profile_id = NEW.mentor_profile_id
      AND mp.cycle_id = NEW.cycle_id
      AND mp.status = 'active'
      AND mp.id <> NEW.id
  ) >= 2 THEN
    RAISE EXCEPTION 'Người kèm cặp này đã nhận đủ 2 cán bộ trong kỳ — hãy chọn người khác'
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_mentor_capacity ON public.mentorship_pairs;
CREATE TRIGGER trg_enforce_mentor_capacity
  BEFORE INSERT OR UPDATE ON public.mentorship_pairs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_mentor_capacity();

-- Gợi ý mentor cho một kỹ năng trong một kỳ: người active đạt level >= _min_level
-- (mặc định L3), kèm số mentee đang kèm để client hiển thị chỗ trống.
CREATE OR REPLACE FUNCTION public.suggest_skill_mentors(
  _skill_id uuid,
  _cycle_id uuid,
  _min_level int DEFAULT 3
)
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  department_id uuid,
  department_name text,
  skill_level int,
  active_mentees int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_forms AS (
    SELECT DISTINCT ON (fs.employee_id) fs.employee_id, fs.id
    FROM public.form_submissions fs
    WHERE fs.cycle_id = _cycle_id
    ORDER BY fs.employee_id, fs.updated_at DESC
  ),
  levels AS (
    SELECT lf.employee_id,
      CASE
        WHEN sa.manager_l0 THEN 0
        WHEN sa.manager_assessed_level IS NOT NULL THEN sa.manager_assessed_level
        WHEN sa.self_l0 THEN 0
        ELSE sa.self_assessed_level
      END AS lvl
    FROM latest_forms lf
    JOIN public.skill_assessments sa ON sa.form_id = lf.id AND sa.skill_id = _skill_id
  )
  SELECT
    p.id,
    p.full_name,
    p.department_id,
    d.name,
    l.lvl,
    (
      SELECT count(*)::int
      FROM public.mentorship_pairs mp
      WHERE mp.mentor_profile_id = p.id
        AND mp.cycle_id = _cycle_id
        AND mp.status = 'active'
    )
  FROM levels l
  JOIN public.profiles p ON p.id = l.employee_id AND p.status = 'active'
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE l.lvl IS NOT NULL
    AND l.lvl >= _min_level
    AND p.user_id IS DISTINCT FROM auth.uid()
  ORDER BY l.lvl DESC, p.full_name;
$$;

REVOKE ALL ON FUNCTION public.suggest_skill_mentors(uuid, uuid, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.suggest_skill_mentors(uuid, uuid, int) TO authenticated;

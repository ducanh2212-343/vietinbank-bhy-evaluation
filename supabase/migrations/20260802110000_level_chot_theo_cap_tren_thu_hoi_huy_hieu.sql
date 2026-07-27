-- LEVEL CHỐT = MỨC CẤP TRÊN; HUY HIỆU TỰ THU HỒI KHI CẤP TRÊN HẠ MỨC
--
-- Hai lỗi trong trigger record_skill_level_achievements:
--
-- 1. COALESCE(manager_assessed_level, self_assessed_level) hiểu SAI mức L0.
--    Level 0 ("Chưa hình thành") được lưu bằng CỜ manager_l0 = true và cột số để
--    NULL (xem buildSkillRow trong src/lib/evaluationPersistence.ts). COALESCE do
--    đó tưởng "cấp trên chưa chấm" và rơi về mức TỰ đánh giá — cấp trên chấm L0
--    mà cán bộ vẫn nhận huy hiệu L1. Phát hiện ở 5 phiếu Phòng KHDN: TP Đỗ Việt
--    Anh đã chấm ĐỦ, chấm L0 cho SK09/SK10/SK12/SK16, nhưng huy hiệu ghi L1.
--
-- 2. Bảng skill_level_achievements chỉ ghi thêm, không bao giờ rút. Cấp trên hạ
--    mức thì huy hiệu cũ vẫn còn (Hoàng Trung Tuấn SK02: huy hiệu L2 ghi 24/07,
--    phiếu sửa xuống L1 ngày 26/07 nhưng huy hiệu giữ nguyên).
--
-- Quy tắc chốt thống nhất toàn hệ thống (khớp effectiveLevel trong
-- src/lib/skillInsights.ts và ReportsPage): cấp trên là tiếng nói cuối cùng,
-- cờ l0 = mức 0 chứ KHÔNG phải "chưa chấm".

-- ── 1. Hàm mức chốt dùng chung ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.effective_skill_level(
  p_self        integer,
  p_self_l0     boolean,
  p_manager     integer,
  p_manager_l0  boolean
) RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN COALESCE(p_manager_l0, false) THEN 0
    WHEN p_manager IS NOT NULL         THEN p_manager
    WHEN COALESCE(p_self_l0, false)    THEN 0
    ELSE p_self
  END;
$$;

COMMENT ON FUNCTION public.effective_skill_level IS
  'Mức CHỐT của một skill: cấp trên thắng tự đánh giá; cờ l0 = mức 0. NULL = chưa ai chấm.';

-- ── 2. Trigger chốt level khi phiếu được rà soát/phê duyệt ────────────────────
CREATE OR REPLACE FUNCTION public.record_skill_level_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prev_form_id UUID;
BEGIN
  IF NEW.status::text IN ('reviewed','approved','closed')
     AND (TG_OP = 'INSERT' OR OLD.status::text NOT IN ('reviewed','approved','closed')) THEN

    SELECT fs.id INTO prev_form_id
    FROM public.form_submissions fs
    WHERE fs.employee_id = NEW.employee_id
      AND fs.id <> NEW.id
      AND fs.status::text IN ('reviewed','approved','closed')
    ORDER BY COALESCE(fs.reviewed_at, fs.updated_at) DESC
    LIMIT 1;

    -- 2a. Ghi huy hiệu khi mức chốt CAO HƠN kỳ trước (mức 0 không có huy hiệu)
    INSERT INTO public.skill_level_achievements (profile_id, skill_id, level_no, form_id, cycle_id)
    SELECT NEW.employee_id, sa.skill_id, lvl.v, NEW.id, NEW.cycle_id
    FROM public.skill_assessments sa
    CROSS JOIN LATERAL (
      SELECT public.effective_skill_level(
               sa.self_assessed_level, sa.self_l0, sa.manager_assessed_level, sa.manager_l0) AS v
    ) lvl
    WHERE sa.form_id = NEW.id
      AND lvl.v > 0
      AND lvl.v > COALESCE((
            SELECT public.effective_skill_level(
                     psa.self_assessed_level, psa.self_l0, psa.manager_assessed_level, psa.manager_l0)
            FROM public.skill_assessments psa
            WHERE psa.form_id = prev_form_id AND psa.skill_id = sa.skill_id
          ), 0)
    ON CONFLICT (profile_id, skill_id, level_no) DO NOTHING;

    -- 2b. THU HỒI huy hiệu cao hơn mức chốt — cấp trên hạ mức thì huy hiệu rút theo
    DELETE FROM public.skill_level_achievements a
    USING public.skill_assessments sa
    WHERE sa.form_id     = NEW.id
      AND a.profile_id   = NEW.employee_id
      AND a.skill_id     = sa.skill_id
      AND a.level_no > public.effective_skill_level(
                         sa.self_assessed_level, sa.self_l0, sa.manager_assessed_level, sa.manager_l0);
  END IF;
  RETURN NEW;
END;
$function$;

-- ── 3. Sửa mức trên phiếu ĐÃ duyệt cũng phải rút huy hiệu ─────────────────────
-- Trigger ở mục 2 chỉ chạy khi phiếu CHUYỂN trạng thái. Ca Hoàng Trung Tuấn là
-- sửa mức sau khi phiếu đã approved nên không trigger nào chạy.
CREATE OR REPLACE FUNCTION public.reconcile_achievements_on_level_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_employee UUID;
  v_level    integer;
  v_latest   UUID;
BEGIN
  SELECT fs.employee_id INTO v_employee
  FROM public.form_submissions fs
  WHERE fs.id = NEW.form_id AND fs.status::text IN ('reviewed','approved','closed');
  IF v_employee IS NULL THEN RETURN NEW; END IF;

  -- Chỉ phiếu MỚI NHẤT có chấm skill này mới được quyền chốt lại — sửa phiếu cũ
  -- không được phép rút huy hiệu đã đạt ở kỳ sau.
  SELECT fs.id INTO v_latest
  FROM public.form_submissions fs
  JOIN public.skill_assessments sa2 ON sa2.form_id = fs.id AND sa2.skill_id = NEW.skill_id
  WHERE fs.employee_id = v_employee
    AND fs.status::text IN ('reviewed','approved','closed')
  ORDER BY COALESCE(fs.reviewed_at, fs.updated_at) DESC
  LIMIT 1;
  IF v_latest IS DISTINCT FROM NEW.form_id THEN RETURN NEW; END IF;

  v_level := public.effective_skill_level(
               NEW.self_assessed_level, NEW.self_l0, NEW.manager_assessed_level, NEW.manager_l0);
  IF v_level IS NULL THEN RETURN NEW; END IF;

  DELETE FROM public.skill_level_achievements a
   WHERE a.profile_id = v_employee
     AND a.skill_id   = NEW.skill_id
     AND a.level_no   > v_level;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_reconcile_achievements_on_level_change ON public.skill_assessments;
CREATE TRIGGER trg_reconcile_achievements_on_level_change
AFTER UPDATE ON public.skill_assessments
FOR EACH ROW
WHEN (
  OLD.manager_assessed_level IS DISTINCT FROM NEW.manager_assessed_level
  OR OLD.manager_l0          IS DISTINCT FROM NEW.manager_l0
  OR OLD.self_assessed_level IS DISTINCT FROM NEW.self_assessed_level
  OR OLD.self_l0             IS DISTINCT FROM NEW.self_l0
)
EXECUTE FUNCTION public.reconcile_achievements_on_level_change();

-- ── 4. Áp cho dữ liệu CŨ: rút huy hiệu cao hơn mức chốt hiện hành ─────────────
-- Căn cứ: phiếu đã rà soát/duyệt GẦN NHẤT có chấm skill đó. Skill chưa ai chấm
-- (chốt NULL) thì giữ nguyên huy hiệu — không suy đoán.
WITH latest AS (
  SELECT DISTINCT ON (fs.employee_id, sa.skill_id)
         fs.employee_id AS profile_id,
         sa.skill_id,
         public.effective_skill_level(
           sa.self_assessed_level, sa.self_l0, sa.manager_assessed_level, sa.manager_l0) AS chot
  FROM public.skill_assessments sa
  JOIN public.form_submissions fs ON fs.id = sa.form_id
  WHERE fs.status::text IN ('reviewed','approved','closed')
  ORDER BY fs.employee_id, sa.skill_id, COALESCE(fs.reviewed_at, fs.updated_at) DESC
)
DELETE FROM public.skill_level_achievements a
USING latest l
WHERE a.profile_id = l.profile_id
  AND a.skill_id   = l.skill_id
  AND l.chot IS NOT NULL
  AND a.level_no > l.chot;

-- PHIẾU TỰ SOI: NGƯỜI KHÔNG CÓ CẤP TRÊN THÌ TỰ ĐÁNH GIÁ LÀ MỨC CHỐT
--
-- Nguyên tắc (Giám đốc chốt 27/07): phiếu của Giám đốc chi nhánh là phiếu TỰ SOI —
-- không cần người chấm, TỰ ĐÁNH GIÁ CHÍNH LÀ MỨC CHỐT, tự nộp và tự phê duyệt.
--
-- Trước đây nguyên tắc này tồn tại ngầm ở BA nơi, mỗi nơi so khớp CHUỖI chức danh
-- theo một danh sách khác nhau:
--   1. SelfAssessmentPage : pos_name chứa 'giám đốc chi nhánh' HOẶC (chứa 'giám đốc'
--                           và không chứa 'phó') và không có cấp trên
--   2. CycleManagementPage: position khớp đúng 'giám đốc' / 'giám đốc chi nhánh'
--   3. guard_open_cycle_requires_reporting_line: như (2)
--
-- Hai rủi ro cho các kỳ sau:
--   • Đổi tên chức danh (vd 'Giám đốc Chi nhánh Bắc Hưng Yên') là (2)(3) hết miễn trừ
--     → KHÔNG mở được kỳ mới, còn (1) vẫn cho tự duyệt → ba nơi hiểu khác nhau.
--   • Nhánh 'giám đốc chi nhánh' ở (1) cho tự phê duyệt KỂ CẢ KHI có cấp trên —
--     người có cấp trên vẫn tự duyệt được phiếu của mình, bỏ qua đánh giá.
--
-- Chốt lại bằng MỘT cờ tường minh + ràng buộc: tự soi ⇔ không có cấp trên nào.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS self_review_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.self_review_only IS
  'Phiếu TỰ SOI: người này không có cấp trên trong tuyến báo cáo (Giám đốc chi nhánh). '
  'Tự đánh giá LÀ mức chốt của skill; tự nộp và tự phê duyệt; được miễn trừ khỏi luật '
  '"phải gán người đánh giá trước khi mở kỳ". Chỉ đặt true khi manager_id/pgd_id/'
  'director_id đều trống — ràng buộc chk_self_review_no_supervisor.';

-- Ràng buộc chống lạm dụng: đánh dấu tự soi cho người CÓ cấp trên là mở đường tự
-- duyệt phiếu của chính mình, bỏ qua đánh giá của cấp trên.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_self_review_no_supervisor;
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_self_review_no_supervisor
  CHECK (
    NOT self_review_only
    OR (manager_id IS NULL AND pgd_id IS NULL AND director_id IS NULL)
  );

-- Backfill: đúng những người đang được miễn trừ theo luật CŨ (chức danh Giám đốc,
-- không có cấp trên nào). Hiện tại là 1 hồ sơ — Giám đốc chi nhánh.
UPDATE public.profiles
   SET self_review_only = true
 WHERE status = 'active'
   AND manager_id IS NULL AND pgd_id IS NULL AND director_id IS NULL
   AND lower(btrim(position)) IN ('giám đốc', 'giám đốc chi nhánh');

-- Chốt chặn mở kỳ đọc CỜ thay vì chuỗi chức danh. Người không có cấp trên mà CHƯA
-- được đánh dấu tự soi thì vẫn chặn — đó chính là mục đích của chốt chặn này.
CREATE OR REPLACE FUNCTION public.guard_open_cycle_requires_reporting_line()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_missing text;
  v_count integer;
BEGIN
  IF NEW.status <> 'in_progress' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'in_progress' THEN RETURN NEW; END IF;

  SELECT count(*), string_agg(x.full_name, ', ' ORDER BY x.full_name)
    INTO v_count, v_missing
    FROM (
      SELECT p.full_name
        FROM public.profiles p
       WHERE p.status = 'active'
         AND p.manager_id IS NULL
         AND p.pgd_id IS NULL
         AND p.director_id IS NULL
         AND NOT p.self_review_only
       LIMIT 20
    ) x;

  IF COALESCE(v_count, 0) > 0 THEN
    RAISE EXCEPTION 'Chưa mở được kỳ: còn % cán bộ chưa gán người đánh giá (%). Vào "Phân công người đánh giá" gán Quản lý trực tiếp / PGĐ phụ trách rồi mở kỳ lại. Nếu là lãnh đạo cao nhất không có cấp trên, đánh dấu hồ sơ đó là phiếu tự soi (self_review_only).',
      v_count, v_missing;
  END IF;

  RETURN NEW;
END; $function$;

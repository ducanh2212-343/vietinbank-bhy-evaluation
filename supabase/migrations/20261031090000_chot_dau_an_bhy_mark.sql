-- ============================================================================
-- CHỐT DẤU ẤN BẮC HƯNG YÊN MARK — kết kỳ theo lệnh Giám đốc (09/2026)
--
-- Cách cũ: dấu ấn chỉ có active → confirmed/archived, khung STAR là tùy chọn nên
-- cuối kỳ nhiều dấu ấn kết thúc mà STAR trống, hành trình xuất ra Word rỗng ruột.
-- Cách mới, hai bước:
--   1. Giám đốc bấm «Chốt dấu ấn»  → status = 'cho_chot' (chờ PGĐ nộp STAR).
--      Thẻ Kanban vẫn giữ để PGĐ đọc lại mạch tuần khi viết STAR.
--   2. PGĐ nộp STAR ĐẦY ĐỦ (4 phần + sản phẩm để lại, mỗi phần tối thiểu 50 ký
--      tự) → status = 'da_chot'. Dấu ấn ẩn khỏi danh sách kỳ hiện hành, thẻ
--      Kanban tự lưu trữ, sẵn sàng cho kỳ mới (dự kiến kỳ tới hạn 31/10/2026).
-- Mức 50 ký tự phải trùng với SO_KY_TU_TOI_THIEU_STAR ở src/pages/LeadershipMarksPage.tsx.
-- ============================================================================

ALTER TABLE public.leadership_marks
  DROP CONSTRAINT IF EXISTS leadership_marks_status_check;
ALTER TABLE public.leadership_marks
  ADD CONSTRAINT leadership_marks_status_check
  CHECK (status IN ('draft','active','confirmed','archived','cho_chot','da_chot'));

ALTER TABLE public.leadership_marks
  ADD COLUMN IF NOT EXISTS chot_yeu_cau_luc timestamptz,
  ADD COLUMN IF NOT EXISTS chot_yeu_cau_boi uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chot_luc timestamptz;

COMMENT ON COLUMN public.leadership_marks.chot_yeu_cau_luc IS 'Lúc Giám đốc bấm «Chốt dấu ấn» — từ đây PGĐ phải nộp STAR đầy đủ';
COMMENT ON COLUMN public.leadership_marks.chot_luc IS 'Lúc PGĐ nộp STAR đầy đủ, dấu ấn rời kỳ hiện hành';

-- STAR "đủ để chốt": cả bốn phần S-T-A-R và sản phẩm để lại đều có nội dung thật
CREATE OR REPLACE FUNCTION public.dau_an_star_du_de_chot(m public.leadership_marks)
RETURNS boolean LANGUAGE sql IMMUTABLE
AS $$
  SELECT length(btrim(COALESCE(m.star_situation, ''))) >= 50
     AND length(btrim(COALESCE(m.star_task, '')))      >= 50
     AND length(btrim(COALESCE(m.star_action, '')))    >= 50
     AND length(btrim(COALESCE(m.star_result, '')))    >= 50
     AND length(btrim(COALESCE(m.deliverable, '')))    >= 50
$$;

-- Guard chủ dấu ấn: vẫn chỉ được sửa STAR/sản phẩm, NGOẠI LỆ duy nhất là tự chuyển
-- cho_chot → da_chot khi STAR đã đủ (đây chính là bước «nộp STAR để chốt»).
CREATE OR REPLACE FUNCTION public.guard_leadership_mark_owner_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_nop_star boolean;
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(),'system_admin'::app_role)
     OR public.has_role(auth.uid(),'bgd'::app_role)
     OR public.has_role(auth.uid(),'tcth_admin'::app_role) THEN
    RETURN NEW;
  END IF;
  v_nop_star := OLD.status = 'cho_chot' AND NEW.status = 'da_chot';
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.cycle_id IS DISTINCT FROM OLD.cycle_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.role_focus IS DISTINCT FROM OLD.role_focus
     OR NEW.leadership_competency_id IS DISTINCT FROM OLD.leadership_competency_id
     OR NEW.core_value_id IS DISTINCT FROM OLD.core_value_id
     OR (NEW.status IS DISTINCT FROM OLD.status AND NOT v_nop_star)
     OR NEW.deadline IS DISTINCT FROM OLD.deadline
     OR NEW.sort_order IS DISTINCT FROM OLD.sort_order
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.chot_yeu_cau_luc IS DISTINCT FROM OLD.chot_yeu_cau_luc
     OR NEW.chot_yeu_cau_boi IS DISTINCT FROM OLD.chot_yeu_cau_boi THEN
    RAISE EXCEPTION 'Chỉ Ban Giám đốc/TCTH được sửa khung dấu ấn — PGĐ chỉ cập nhật STAR và sản phẩm để lại';
  END IF;
  RETURN NEW;
END; $$;

-- Luật chốt, áp cho MỌI người (kể cả admin sửa tay): sang da_chot bắt buộc STAR đủ;
-- tự đóng mốc thời gian để giao diện không phải nhớ gửi kèm.
CREATE OR REPLACE FUNCTION public.kiem_tra_chot_dau_an()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'cho_chot' AND OLD.status IS DISTINCT FROM 'cho_chot' THEN
    NEW.chot_yeu_cau_luc := COALESCE(NEW.chot_yeu_cau_luc, now());
    NEW.chot_yeu_cau_boi := COALESCE(NEW.chot_yeu_cau_boi, public.get_my_profile_id());
    NEW.chot_luc := NULL;
  END IF;
  IF NEW.status = 'da_chot' AND OLD.status IS DISTINCT FROM 'da_chot' THEN
    IF NOT public.dau_an_star_du_de_chot(NEW) THEN
      RAISE EXCEPTION 'Chưa thể chốt: cần điền đầy đủ Bối cảnh, Nhiệm vụ, Hành động, Kết quả và Sản phẩm để lại (mỗi phần tối thiểu 50 ký tự)';
    END IF;
    NEW.chot_luc := COALESCE(NEW.chot_luc, now());
  END IF;
  -- Giám đốc rút lệnh chốt (về active) thì xóa mốc để lần chốt sau tính lại
  IF NEW.status = 'active' AND OLD.status IN ('cho_chot','da_chot') THEN
    NEW.chot_yeu_cau_luc := NULL;
    NEW.chot_yeu_cau_boi := NULL;
    NEW.chot_luc := NULL;
  END IF;
  RETURN NEW;
END; $$;

-- Tên bắt đầu bằng «k» để chạy SAU guard_… (Postgres gọi trigger cùng thời điểm
-- theo thứ tự chữ cái): guard chặn người không có quyền trước, luật chốt kiểm sau.
DROP TRIGGER IF EXISTS kiem_tra_chot_dau_an ON public.leadership_marks;
CREATE TRIGGER kiem_tra_chot_dau_an
  BEFORE UPDATE OF status ON public.leadership_marks
  FOR EACH ROW EXECUTE FUNCTION public.kiem_tra_chot_dau_an();

-- Đồng bộ Kanban: cho_chot giữ thẻ (PGĐ còn đọc lại mạch tuần để viết STAR);
-- da_chot lưu trữ thẻ như archived để bảng Kanban cá nhân sạch cho kỳ mới.
CREATE OR REPLACE FUNCTION public.sync_kanban_leadership_mark()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_skill uuid;
BEGIN
  IF NEW.status IN ('active','confirmed','cho_chot') THEN
    SELECT skill_id INTO v_skill
      FROM public.leadership_mark_skills
     WHERE mark_id = NEW.id
     ORDER BY sort_order, skill_id
     LIMIT 1;
    PERFORM public.kanban_upsert_card(
      'leadership_marks', NEW.id, 'manager_assigned',
      NULL, NEW.title, v_skill, NULL, NULL, NEW.deadline
    );
  ELSIF NEW.status IN ('archived','da_chot') THEN
    UPDATE public.kanban_cards
       SET is_active = false,
           archived_at = now(),
           archived_reason = COALESCE(archived_reason,
             CASE WHEN NEW.status = 'da_chot' THEN 'mark_chot' ELSE 'mark_archived' END),
           updated_at = now()
     WHERE source_table = 'leadership_marks'
       AND source_action_id = NEW.id
       AND is_active = true;
  END IF;
  RETURN NEW;
END; $$;

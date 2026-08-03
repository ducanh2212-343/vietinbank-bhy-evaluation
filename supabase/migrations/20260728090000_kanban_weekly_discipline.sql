-- KỶ LUẬT CẬP NHẬT TUẦN CHO KANBAN KẾ HOẠCH HÀNH ĐỘNG QUÝ (rà soát 25/07/2026)
--
-- Phát hiện trên production:
--   * 12 thẻ dấu ấn + 3 thẻ cá nhân đã có cập nhật tiến độ (có thẻ đạt 75%) nhưng vẫn
--     nằm cột 'todo' — vì auto-chuyển 'todo'→'doing' chỉ được cài ở trang /dau-an,
--     trong khi cán bộ bấm "Cập nhật" từ Kanban cá nhân hoặc Tổng quan.
--   * kanban_card_logs cho phép authenticated INSERT trực tiếp → có thể tự chế log
--     'progress_update' để thoát cảnh báo "Chưa cập nhật tuần này" mà không qua RPC.
--   * Xác nhận hoàn thành thẻ dấu ấn bởi người KHÔNG thuộc BGĐ/TCTH sẽ bị
--     guard_leadership_mark_owner_update chặn (trigger đồng bộ mark chạy dưới
--     auth.uid() của người xác nhận) → hủy cả giao dịch xác nhận.
--   * Giới hạn 2 skill/dấu ấn chỉ áp dụng khi INSERT, không áp dụng khi UPDATE mark_id.

-- ============================================================================
-- 1) update_kanban_progress: cập nhật đầu tiên tự kéo thẻ 'todo' → 'doing'
--    (đúng với mọi lối vào: Kanban cá nhân, Tổng quan, /dau-an)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_kanban_progress(
  _card_id uuid,
  _progress_percent integer,
  _progress_note text,
  _current_result text DEFAULT NULL,
  _blocker_note text DEFAULT NULL,
  _next_step text DEFAULT NULL,
  _support_needed text DEFAULT NULL,
  _evidence_text text DEFAULT NULL,
  _evidence_url text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE c public.kanban_cards%ROWTYPE; v_my uuid;
BEGIN
  v_my := public.get_my_profile_id();
  SELECT * INTO c FROM public.kanban_cards WHERE id = _card_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Card không tồn tại'; END IF;
  IF c.profile_id <> v_my AND NOT public.has_role(auth.uid(),'system_admin'::app_role) THEN
    RAISE EXCEPTION 'Không có quyền cập nhật card này';
  END IF;
  IF _progress_percent < 0 OR _progress_percent > 100 THEN RAISE EXCEPTION 'progress_percent 0-100'; END IF;

  -- Có cập nhật nghĩa là đã bắt đầu: thẻ 'Phải làm' tự chuyển 'Đang làm'
  IF c.kanban_status = 'todo' THEN
    UPDATE public.kanban_cards
       SET kanban_status = 'doing',
           started_at = COALESCE(started_at, now()),
           updated_at = now()
     WHERE id = _card_id;
    INSERT INTO public.kanban_card_logs(card_id, profile_id, log_type, old_status, new_status, created_by)
    VALUES (_card_id, c.profile_id, 'status_change', 'todo', 'doing', auth.uid());
  END IF;

  UPDATE public.kanban_cards
    SET progress_percent = _progress_percent,
        last_progress_at = now(),
        next_update_due_at = now() + interval '7 days',
        updated_at = now()
    WHERE id = _card_id;

  INSERT INTO public.kanban_card_logs(card_id, profile_id, log_type, progress_percent, progress_note, current_result, blocker_note, next_step, support_needed, evidence_text, evidence_url, created_by)
  VALUES (_card_id, c.profile_id, 'progress_update', _progress_percent, _progress_note, _current_result, _blocker_note, _next_step, _support_needed, _evidence_text, _evidence_url, auth.uid());
END; $$;

-- ============================================================================
-- 2) Log chỉ được sinh qua RPC SECURITY DEFINER — chặn client tự chế
--    'progress_update' để thoát báo đỏ tuần
-- ============================================================================
REVOKE INSERT ON public.kanban_card_logs FROM authenticated;
DROP POLICY IF EXISTS "Insert logs of viewable cards" ON public.kanban_card_logs;
-- Dọn nốt grant thừa: anon không có việc gì với log; TRUNCATE không bị RLS chặn
-- nên tuyệt đối không để ở client role. authenticated chỉ còn SELECT (qua RLS).
REVOKE ALL ON public.kanban_card_logs FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.kanban_card_logs FROM authenticated;

-- ============================================================================
-- 3) Đồng bộ card→mark khi xác nhận hoàn thành chạy dưới cờ phiên riêng để
--    guard khung dấu ấn không chặn người xác nhận ngoài BGĐ/TCTH
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_leadership_mark_on_card_confirm()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.completion_status = 'confirmed'
     AND NEW.leadership_mark_id IS NOT NULL
     AND OLD.completion_status IS DISTINCT FROM 'confirmed' THEN
    PERFORM set_config('app.dau_an_sync', '1', true);  -- true = chỉ trong transaction
    UPDATE public.leadership_marks
       SET status = 'confirmed'
     WHERE id = NEW.leadership_mark_id
       AND status = 'active';
    PERFORM set_config('app.dau_an_sync', '', true);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.guard_leadership_mark_owner_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Ngữ cảnh service_role/migration, đồng bộ hệ thống (cờ phiên) hoặc admin: cho qua
  IF auth.uid() IS NULL
     OR current_setting('app.dau_an_sync', true) = '1'
     OR public.has_role(auth.uid(),'system_admin'::app_role)
     OR public.has_role(auth.uid(),'bgd'::app_role)
     OR public.has_role(auth.uid(),'tcth_admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.cycle_id IS DISTINCT FROM OLD.cycle_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.role_focus IS DISTINCT FROM OLD.role_focus
     OR NEW.leadership_competency_id IS DISTINCT FROM OLD.leadership_competency_id
     OR NEW.core_value_id IS DISTINCT FROM OLD.core_value_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.deadline IS DISTINCT FROM OLD.deadline
     OR NEW.sort_order IS DISTINCT FROM OLD.sort_order
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Chỉ Ban Giám đốc/TCTH được sửa khung dấu ấn — PGĐ chỉ cập nhật STAR và sản phẩm để lại';
  END IF;
  RETURN NEW;
END; $$;

-- ============================================================================
-- 4) Giới hạn 2 skill/dấu ấn: áp dụng cả khi UPDATE chuyển mark_id
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_leadership_mark_skill_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  -- UPDATE không đổi mark thì không thể vượt giới hạn
  IF TG_OP = 'UPDATE' AND NEW.mark_id = OLD.mark_id THEN RETURN NEW; END IF;
  IF (SELECT count(*) FROM public.leadership_mark_skills WHERE mark_id = NEW.mark_id) >= 2 THEN
    RAISE EXCEPTION 'Mỗi dấu ấn gắn tối đa 2 Skill';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS leadership_mark_skills_limit ON public.leadership_mark_skills;
CREATE TRIGGER leadership_mark_skills_limit
  BEFORE INSERT OR UPDATE ON public.leadership_mark_skills
  FOR EACH ROW EXECUTE FUNCTION public.check_leadership_mark_skill_limit();

-- ============================================================================
-- 5) Backfill: thẻ 'todo' đã có cập nhật tiến độ → 'doing' (started_at = lần
--    cập nhật đầu tiên), ghi log chuyển trạng thái để dòng thời gian đầy đủ
-- ============================================================================
WITH stuck AS (
  SELECT c.id, c.profile_id,
         (SELECT min(l.created_at) FROM public.kanban_card_logs l
           WHERE l.card_id = c.id AND l.log_type = 'progress_update') AS first_update
  FROM public.kanban_cards c
  WHERE c.is_active
    AND c.kanban_status = 'todo'
    AND EXISTS (SELECT 1 FROM public.kanban_card_logs l
                 WHERE l.card_id = c.id AND l.log_type = 'progress_update')
), moved AS (
  UPDATE public.kanban_cards c
     SET kanban_status = 'doing',
         started_at = COALESCE(c.started_at, s.first_update),
         updated_at = now()
    FROM stuck s
   WHERE c.id = s.id
  RETURNING c.id, c.profile_id
)
INSERT INTO public.kanban_card_logs(card_id, profile_id, log_type, old_status, new_status)
SELECT id, profile_id, 'status_change', 'todo', 'doing' FROM moved;

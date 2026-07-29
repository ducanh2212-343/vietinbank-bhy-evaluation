-- ============================================================================
-- NẾP TỐT — Trạng thái phản hồi của lãnh đạo trên từng hành động
-- Mục tiêu: lãnh đạo tác động NGAY (khen ngợi / trao đổi góp ý) thay vì chờ
-- cuối kỳ. Phản hồi là việc đã làm ngoài đời — tách biệt với cờ chia sẻ
-- (cho cán bộ xem bản ghi trong app).
--   - 'chua_phan_hoi' (mặc định)
--   - 'da_khen_ngoi'  (dùng cho hành động tích cực)
--   - 'da_trao_doi'   (dùng cho hành động cần cải thiện)
-- Rollback: supabase/rollbacks/20260727093000_nep_tot_feedback_status_down.sql
-- ============================================================================

ALTER TABLE public.behavior_notes
  ADD COLUMN IF NOT EXISTS feedback_status text NOT NULL DEFAULT 'chua_phan_hoi'
    CHECK (feedback_status IN ('chua_phan_hoi', 'da_khen_ngoi', 'da_trao_doi')),
  ADD COLUMN IF NOT EXISTS feedback_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedback_note text;

-- Mốc thời gian phản hồi tự cập nhật theo trạng thái
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
  IF NEW.feedback_status = 'chua_phan_hoi' THEN
    NEW.feedback_at := NULL;
  ELSIF TG_OP = 'INSERT' OR OLD.feedback_status IS DISTINCT FROM NEW.feedback_status THEN
    NEW.feedback_at := now();
  END IF;
  RETURN NEW;
END; $$;

-- Audit metadata ghi thêm feedback_status
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
        'shared_with_employee', OLD.shared_with_employee,
        'visibility', OLD.visibility, 'feedback_status', OLD.feedback_status);
    END IF;
    v_new := jsonb_build_object(
      'status', NEW.status, 'behavior_type', NEW.behavior_type,
      'shared_with_employee', NEW.shared_with_employee,
      'visibility', NEW.visibility, 'feedback_status', NEW.feedback_status,
      'employee_id', NEW.employee_id, 'observer_id', NEW.observer_id);
  ELSE
    IF TG_OP = 'UPDATE' THEN v_old := to_jsonb(OLD); END IF;
    v_new := to_jsonb(NEW);
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (auth.uid(), TG_TABLE_NAME || ':' || lower(TG_OP), TG_TABLE_NAME, NEW.id, v_old, v_new);
  RETURN NEW;
END; $$;

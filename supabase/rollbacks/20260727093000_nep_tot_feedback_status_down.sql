-- Rollback cho 20260727093000_nep_tot_feedback_status.sql

ALTER TABLE public.behavior_notes
  DROP COLUMN IF EXISTS feedback_status,
  DROP COLUMN IF EXISTS feedback_at,
  DROP COLUMN IF EXISTS feedback_note;

-- Khôi phục trigger/audit về bản 20260727092000
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
        'visibility', OLD.visibility);
    END IF;
    v_new := jsonb_build_object(
      'status', NEW.status, 'behavior_type', NEW.behavior_type,
      'shared_with_employee', NEW.shared_with_employee,
      'visibility', NEW.visibility,
      'employee_id', NEW.employee_id, 'observer_id', NEW.observer_id);
  ELSE
    IF TG_OP = 'UPDATE' THEN v_old := to_jsonb(OLD); END IF;
    v_new := to_jsonb(NEW);
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (auth.uid(), TG_TABLE_NAME || ':' || lower(TG_OP), TG_TABLE_NAME, NEW.id, v_old, v_new);
  RETURN NEW;
END; $$;

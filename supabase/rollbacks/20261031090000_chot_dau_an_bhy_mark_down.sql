-- Gỡ 20261031090000: bỏ hai trạng thái chốt, trả guard + đồng bộ Kanban về bản 20260716.
-- Dấu ấn đang cho_chot/da_chot phải về trạng thái cũ trước khi siết CHECK.
UPDATE public.leadership_marks SET status = 'active'   WHERE status = 'cho_chot';
UPDATE public.leadership_marks SET status = 'archived' WHERE status = 'da_chot';

DROP TRIGGER IF EXISTS kiem_tra_chot_dau_an ON public.leadership_marks;
DROP FUNCTION IF EXISTS public.kiem_tra_chot_dau_an();
DROP FUNCTION IF EXISTS public.dau_an_star_du_de_chot(public.leadership_marks);

ALTER TABLE public.leadership_marks
  DROP COLUMN IF EXISTS chot_yeu_cau_luc,
  DROP COLUMN IF EXISTS chot_yeu_cau_boi,
  DROP COLUMN IF EXISTS chot_luc;

ALTER TABLE public.leadership_marks DROP CONSTRAINT IF EXISTS leadership_marks_status_check;
ALTER TABLE public.leadership_marks
  ADD CONSTRAINT leadership_marks_status_check
  CHECK (status IN ('draft','active','confirmed','archived'));

CREATE OR REPLACE FUNCTION public.guard_leadership_mark_owner_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
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

CREATE OR REPLACE FUNCTION public.sync_kanban_leadership_mark()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_skill uuid;
BEGIN
  IF NEW.status IN ('active','confirmed') THEN
    SELECT skill_id INTO v_skill
      FROM public.leadership_mark_skills
     WHERE mark_id = NEW.id
     ORDER BY sort_order, skill_id
     LIMIT 1;
    PERFORM public.kanban_upsert_card(
      'leadership_marks', NEW.id, 'manager_assigned',
      NULL, NEW.title, v_skill, NULL, NULL, NEW.deadline
    );
  ELSIF NEW.status = 'archived' THEN
    UPDATE public.kanban_cards
       SET is_active = false,
           archived_at = now(),
           archived_reason = COALESCE(archived_reason, 'mark_archived'),
           updated_at = now()
     WHERE source_table = 'leadership_marks'
       AND source_action_id = NEW.id
       AND is_active = true;
  END IF;
  RETURN NEW;
END; $$;

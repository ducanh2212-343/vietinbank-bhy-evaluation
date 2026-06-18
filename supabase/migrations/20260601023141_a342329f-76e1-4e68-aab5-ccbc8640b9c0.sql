
-- ============================================
-- Kanban phát triển cá nhân
-- ============================================

CREATE TABLE public.kanban_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  form_id uuid NOT NULL,
  cycle_id uuid,
  source_type text NOT NULL CHECK (source_type IN ('skill_upskill','attitude_improvement','ai_application','manager_assigned','carry_over')),
  source_table text NOT NULL,
  source_action_id uuid,
  title text NOT NULL,
  skill_id uuid,
  attitude_dimension_id integer,
  learning_mode text,
  deadline date,
  kanban_status text NOT NULL DEFAULT 'todo' CHECK (kanban_status IN ('todo','doing','done')),
  completion_status text NOT NULL DEFAULT 'none' CHECK (completion_status IN ('none','waiting_manager_confirmation','confirmed','returned')),
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  started_at timestamptz,
  completed_at timestamptz,
  last_progress_at timestamptz,
  next_update_due_at timestamptz,
  manager_confirmed_by uuid,
  manager_confirmed_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  archived_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_table, source_action_id)
);

CREATE INDEX idx_kanban_cards_profile_cycle ON public.kanban_cards(profile_id, cycle_id);
CREATE INDEX idx_kanban_cards_status ON public.kanban_cards(kanban_status);
CREATE INDEX idx_kanban_cards_deadline ON public.kanban_cards(deadline);
CREATE INDEX idx_kanban_cards_last_progress ON public.kanban_cards(last_progress_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_cards TO authenticated;
GRANT ALL ON public.kanban_cards TO service_role;

ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Self view own kanban cards" ON public.kanban_cards
  FOR SELECT TO authenticated
  USING (profile_id = public.get_my_profile_id());

CREATE POLICY "Scope reviewers view kanban cards" ON public.kanban_cards
  FOR SELECT TO authenticated
  USING (public.can_view_profile(profile_id));

CREATE POLICY "Admins manage kanban cards" ON public.kanban_cards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role));

CREATE TRIGGER kanban_cards_updated_at
  BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Guard: prevent owners from modifying sensitive columns
CREATE OR REPLACE FUNCTION public.kanban_cards_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'system_admin'::app_role)
     OR public.has_role(auth.uid(), 'bgd'::app_role)
     OR public.has_role(auth.uid(), 'tcth_admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.form_id IS DISTINCT FROM OLD.form_id
     OR NEW.cycle_id IS DISTINCT FROM OLD.cycle_id
     OR NEW.source_type IS DISTINCT FROM OLD.source_type
     OR NEW.source_table IS DISTINCT FROM OLD.source_table
     OR NEW.source_action_id IS DISTINCT FROM OLD.source_action_id
     OR NEW.manager_confirmed_by IS DISTINCT FROM OLD.manager_confirmed_by
     OR NEW.manager_confirmed_at IS DISTINCT FROM OLD.manager_confirmed_at THEN
    RAISE EXCEPTION 'Không được sửa các trường hệ thống của kanban_cards';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER kanban_cards_guard_tr
  BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.kanban_cards_guard();

-- ============================================
-- Timeline logs
-- ============================================
CREATE TABLE public.kanban_card_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  log_type text NOT NULL CHECK (log_type IN ('created','progress_update','status_change','evidence_added','completion_requested','manager_confirmed','manager_returned','deadline_changed','carry_over')),
  old_status text,
  new_status text,
  progress_percent integer,
  progress_note text,
  current_result text,
  blocker_note text,
  next_step text,
  support_needed text,
  evidence_text text,
  evidence_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kanban_logs_card_time ON public.kanban_card_logs(card_id, created_at DESC);

GRANT SELECT, INSERT ON public.kanban_card_logs TO authenticated;
GRANT ALL ON public.kanban_card_logs TO service_role;

ALTER TABLE public.kanban_card_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View logs of viewable cards" ON public.kanban_card_logs
  FOR SELECT TO authenticated
  USING (card_id IN (SELECT id FROM public.kanban_cards WHERE profile_id = public.get_my_profile_id() OR public.can_view_profile(profile_id)));

CREATE POLICY "Insert logs of viewable cards" ON public.kanban_card_logs
  FOR INSERT TO authenticated
  WITH CHECK (card_id IN (SELECT id FROM public.kanban_cards WHERE profile_id = public.get_my_profile_id() OR public.can_view_profile(profile_id)));

CREATE POLICY "Admins manage logs" ON public.kanban_card_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role));

-- ============================================
-- Helper: upsert a card from source action
-- ============================================
CREATE OR REPLACE FUNCTION public.kanban_upsert_card(
  _source_table text,
  _source_action_id uuid,
  _source_type text,
  _form_id uuid,
  _title text,
  _skill_id uuid,
  _attitude_dimension_id integer,
  _learning_mode text,
  _deadline date
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid;
  v_cycle uuid;
  v_card_id uuid;
BEGIN
  SELECT employee_id, cycle_id INTO v_profile, v_cycle
    FROM public.form_submissions WHERE id = _form_id;
  IF v_profile IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.kanban_cards(
    profile_id, form_id, cycle_id, source_type, source_table, source_action_id,
    title, skill_id, attitude_dimension_id, learning_mode, deadline, is_active
  ) VALUES (
    v_profile, _form_id, v_cycle, _source_type, _source_table, _source_action_id,
    COALESCE(NULLIF(_title,''),'(Chưa đặt tên)'), _skill_id, _attitude_dimension_id, _learning_mode, _deadline, true
  )
  ON CONFLICT (source_table, source_action_id) DO UPDATE SET
    title = EXCLUDED.title,
    skill_id = EXCLUDED.skill_id,
    attitude_dimension_id = EXCLUDED.attitude_dimension_id,
    learning_mode = EXCLUDED.learning_mode,
    deadline = EXCLUDED.deadline,
    is_active = true,
    archived_at = NULL,
    archived_reason = NULL,
    updated_at = now()
  RETURNING id INTO v_card_id;

  -- Log creation (only on first insert)
  INSERT INTO public.kanban_card_logs(card_id, profile_id, log_type, new_status, created_by)
  SELECT v_card_id, v_profile, 'created', 'todo', auth.uid()
  WHERE NOT EXISTS (SELECT 1 FROM public.kanban_card_logs WHERE card_id = v_card_id AND log_type = 'created');

  RETURN v_card_id;
END;
$$;

-- ============================================
-- Sync triggers on the 4 source tables
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_kanban_skill_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_skill_id uuid;
BEGIN
  SELECT skill_id INTO v_skill_id FROM public.form_skill_priorities WHERE id = NEW.skill_priority_id;
  PERFORM public.kanban_upsert_card(
    'form_skill_actions', NEW.id, 'skill_upskill',
    NEW.form_id, NEW.action_text, v_skill_id, NULL, NEW.action_type, NEW.deadline
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER sync_kanban_skill_action_tr
  AFTER INSERT OR UPDATE ON public.form_skill_actions
  FOR EACH ROW EXECUTE FUNCTION public.sync_kanban_skill_action();

CREATE OR REPLACE FUNCTION public.sync_kanban_attitude_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dim integer;
BEGIN
  SELECT attitude_dimension_id INTO v_dim FROM public.form_attitude_priorities WHERE id = NEW.attitude_priority_id;
  PERFORM public.kanban_upsert_card(
    'form_attitude_actions', NEW.id, 'attitude_improvement',
    NEW.form_id, NEW.action_text, NULL, v_dim, NULL, NEW.deadline
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER sync_kanban_attitude_action_tr
  AFTER INSERT OR UPDATE ON public.form_attitude_actions
  FOR EACH ROW EXECUTE FUNCTION public.sync_kanban_attitude_action();

CREATE OR REPLACE FUNCTION public.sync_kanban_ai_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_skill uuid; v_dim integer;
BEGIN
  IF NEW.linked_skill_priority_id IS NOT NULL THEN
    SELECT skill_id INTO v_skill FROM public.form_skill_priorities WHERE id = NEW.linked_skill_priority_id;
  END IF;
  IF NEW.linked_attitude_priority_id IS NOT NULL THEN
    SELECT attitude_dimension_id INTO v_dim FROM public.form_attitude_priorities WHERE id = NEW.linked_attitude_priority_id;
  END IF;
  PERFORM public.kanban_upsert_card(
    'form_ai_actions_v2', NEW.id, 'ai_application',
    NEW.form_id, NEW.ai_action_text, v_skill, v_dim, NULL, NEW.deadline
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER sync_kanban_ai_action_tr
  AFTER INSERT OR UPDATE ON public.form_ai_actions_v2
  FOR EACH ROW EXECUTE FUNCTION public.sync_kanban_ai_action();

-- Carry-over: only when is_extra = true
CREATE OR REPLACE FUNCTION public.sync_kanban_carryover()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_extra IS NOT TRUE THEN RETURN NEW; END IF;
  PERFORM public.kanban_upsert_card(
    'form_previous_action_reviews', NEW.id, 'carry_over',
    NEW.form_id, NEW.action_text, NULL, NULL, NULL, NULL
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER sync_kanban_carryover_tr
  AFTER INSERT OR UPDATE ON public.form_previous_action_reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_kanban_carryover();

-- ============================================
-- RPCs (atomic state transitions + logging)
-- ============================================
CREATE OR REPLACE FUNCTION public.update_kanban_progress(
  _card_id uuid,
  _progress_percent integer,
  _progress_note text,
  _current_result text DEFAULT NULL,
  _blocker_note text DEFAULT NULL,
  _next_step text DEFAULT NULL,
  _support_needed text DEFAULT NULL,
  _evidence_text text DEFAULT NULL,
  _evidence_url text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_profile uuid; v_my uuid;
BEGIN
  v_my := public.get_my_profile_id();
  SELECT profile_id INTO v_profile FROM public.kanban_cards WHERE id = _card_id;
  IF v_profile IS NULL THEN RAISE EXCEPTION 'Card không tồn tại'; END IF;
  IF v_profile <> v_my AND NOT public.has_role(auth.uid(),'system_admin'::app_role) THEN
    RAISE EXCEPTION 'Không có quyền cập nhật card này';
  END IF;
  IF _progress_percent < 0 OR _progress_percent > 100 THEN RAISE EXCEPTION 'progress_percent 0-100'; END IF;

  UPDATE public.kanban_cards
    SET progress_percent = _progress_percent,
        last_progress_at = now(),
        next_update_due_at = now() + interval '7 days',
        updated_at = now()
    WHERE id = _card_id;

  INSERT INTO public.kanban_card_logs(card_id, profile_id, log_type, progress_percent, progress_note, current_result, blocker_note, next_step, support_needed, evidence_text, evidence_url, created_by)
  VALUES (_card_id, v_profile, 'progress_update', _progress_percent, _progress_note, _current_result, _blocker_note, _next_step, _support_needed, _evidence_text, _evidence_url, auth.uid());
END; $$;

CREATE OR REPLACE FUNCTION public.move_kanban_card(_card_id uuid, _new_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.kanban_cards%ROWTYPE; v_my uuid;
BEGIN
  v_my := public.get_my_profile_id();
  SELECT * INTO c FROM public.kanban_cards WHERE id = _card_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Card không tồn tại'; END IF;
  IF c.profile_id <> v_my AND NOT public.has_role(auth.uid(),'system_admin'::app_role) THEN
    RAISE EXCEPTION 'Không có quyền';
  END IF;
  IF _new_status NOT IN ('todo','doing','done') THEN RAISE EXCEPTION 'Trạng thái không hợp lệ'; END IF;
  -- Block direct move to done without dialog (use request_kanban_completion instead)
  IF _new_status = 'done' AND c.kanban_status <> 'done' THEN
    RAISE EXCEPTION 'Vui lòng dùng "Gửi xác nhận hoàn thành"';
  END IF;
  -- Block move back from confirmed
  IF c.kanban_status = 'done' AND c.completion_status = 'confirmed' AND _new_status <> 'done' THEN
    RAISE EXCEPTION 'Card đã được quản lý xác nhận, không thể chuyển';
  END IF;

  UPDATE public.kanban_cards
    SET kanban_status = _new_status,
        started_at = COALESCE(started_at, CASE WHEN _new_status = 'doing' THEN now() ELSE NULL END),
        completion_status = CASE WHEN _new_status = 'doing' AND completion_status IN ('waiting_manager_confirmation','returned') THEN 'none' ELSE completion_status END,
        updated_at = now()
    WHERE id = _card_id;

  INSERT INTO public.kanban_card_logs(card_id, profile_id, log_type, old_status, new_status, created_by)
  VALUES (_card_id, c.profile_id, 'status_change', c.kanban_status, _new_status, auth.uid());
END; $$;

CREATE OR REPLACE FUNCTION public.request_kanban_completion(
  _card_id uuid, _current_result text, _evidence_text text, _evidence_url text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.kanban_cards%ROWTYPE; v_my uuid;
BEGIN
  v_my := public.get_my_profile_id();
  SELECT * INTO c FROM public.kanban_cards WHERE id = _card_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Card không tồn tại'; END IF;
  IF c.profile_id <> v_my THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  IF COALESCE(_current_result,'') = '' OR COALESCE(_evidence_text,'') = '' THEN
    RAISE EXCEPTION 'Phải nhập kết quả và bằng chứng';
  END IF;

  UPDATE public.kanban_cards
    SET kanban_status = 'done',
        completion_status = 'waiting_manager_confirmation',
        progress_percent = 100,
        completed_at = now(),
        last_progress_at = now(),
        updated_at = now()
    WHERE id = _card_id;

  INSERT INTO public.kanban_card_logs(card_id, profile_id, log_type, old_status, new_status, current_result, evidence_text, evidence_url, created_by)
  VALUES (_card_id, c.profile_id, 'completion_requested', c.kanban_status, 'done', _current_result, _evidence_text, _evidence_url, auth.uid());
END; $$;

CREATE OR REPLACE FUNCTION public.confirm_kanban_completion(_card_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.kanban_cards%ROWTYPE; v_my uuid;
BEGIN
  v_my := public.get_my_profile_id();
  SELECT * INTO c FROM public.kanban_cards WHERE id = _card_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Card không tồn tại'; END IF;
  IF NOT public.can_view_profile(c.profile_id) OR c.profile_id = v_my THEN
    -- reviewer must be different person & must have scope
    IF c.profile_id = v_my THEN RAISE EXCEPTION 'Không thể tự xác nhận'; END IF;
    RAISE EXCEPTION 'Không có quyền xác nhận';
  END IF;

  UPDATE public.kanban_cards
    SET completion_status = 'confirmed',
        manager_confirmed_by = v_my,
        manager_confirmed_at = now(),
        updated_at = now()
    WHERE id = _card_id;

  INSERT INTO public.kanban_card_logs(card_id, profile_id, log_type, current_result, created_by)
  VALUES (_card_id, c.profile_id, 'manager_confirmed', _note, auth.uid());
END; $$;

CREATE OR REPLACE FUNCTION public.return_kanban_card(_card_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.kanban_cards%ROWTYPE; v_my uuid;
BEGIN
  v_my := public.get_my_profile_id();
  SELECT * INTO c FROM public.kanban_cards WHERE id = _card_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Card không tồn tại'; END IF;
  IF c.profile_id = v_my OR NOT public.can_view_profile(c.profile_id) THEN
    RAISE EXCEPTION 'Không có quyền';
  END IF;
  IF COALESCE(_reason,'') = '' THEN RAISE EXCEPTION 'Phải nhập lý do'; END IF;

  UPDATE public.kanban_cards
    SET kanban_status = 'doing',
        completion_status = 'returned',
        updated_at = now()
    WHERE id = _card_id;

  INSERT INTO public.kanban_card_logs(card_id, profile_id, log_type, old_status, new_status, blocker_note, created_by)
  VALUES (_card_id, c.profile_id, 'manager_returned', 'done', 'doing', _reason, auth.uid());
END; $$;

-- ============================================
-- Backfill existing actions
-- ============================================
INSERT INTO public.kanban_cards(profile_id, form_id, cycle_id, source_type, source_table, source_action_id, title, skill_id, learning_mode, deadline)
SELECT fs.employee_id, a.form_id, fs.cycle_id, 'skill_upskill', 'form_skill_actions', a.id,
       COALESCE(NULLIF(a.action_text,''),'(Chưa đặt tên)'),
       sp.skill_id, a.action_type, a.deadline
FROM public.form_skill_actions a
JOIN public.form_submissions fs ON fs.id = a.form_id
LEFT JOIN public.form_skill_priorities sp ON sp.id = a.skill_priority_id
ON CONFLICT (source_table, source_action_id) DO NOTHING;

INSERT INTO public.kanban_cards(profile_id, form_id, cycle_id, source_type, source_table, source_action_id, title, attitude_dimension_id, deadline)
SELECT fs.employee_id, a.form_id, fs.cycle_id, 'attitude_improvement', 'form_attitude_actions', a.id,
       COALESCE(NULLIF(a.action_text,''),'(Chưa đặt tên)'),
       ap.attitude_dimension_id, a.deadline
FROM public.form_attitude_actions a
JOIN public.form_submissions fs ON fs.id = a.form_id
LEFT JOIN public.form_attitude_priorities ap ON ap.id = a.attitude_priority_id
ON CONFLICT (source_table, source_action_id) DO NOTHING;

INSERT INTO public.kanban_cards(profile_id, form_id, cycle_id, source_type, source_table, source_action_id, title, skill_id, attitude_dimension_id, deadline)
SELECT fs.employee_id, a.form_id, fs.cycle_id, 'ai_application', 'form_ai_actions_v2', a.id,
       COALESCE(NULLIF(a.ai_action_text,''),'(Chưa đặt tên)'),
       sp.skill_id, ap.attitude_dimension_id, a.deadline
FROM public.form_ai_actions_v2 a
JOIN public.form_submissions fs ON fs.id = a.form_id
LEFT JOIN public.form_skill_priorities sp ON sp.id = a.linked_skill_priority_id
LEFT JOIN public.form_attitude_priorities ap ON ap.id = a.linked_attitude_priority_id
ON CONFLICT (source_table, source_action_id) DO NOTHING;

INSERT INTO public.kanban_cards(profile_id, form_id, cycle_id, source_type, source_table, source_action_id, title)
SELECT fs.employee_id, a.form_id, fs.cycle_id, 'carry_over', 'form_previous_action_reviews', a.id,
       COALESCE(NULLIF(a.action_text,''),'(Chưa đặt tên)')
FROM public.form_previous_action_reviews a
JOIN public.form_submissions fs ON fs.id = a.form_id
WHERE a.is_extra = true
ON CONFLICT (source_table, source_action_id) DO NOTHING;

-- Created log for all backfilled cards
INSERT INTO public.kanban_card_logs(card_id, profile_id, log_type, new_status)
SELECT k.id, k.profile_id, 'created', 'todo' FROM public.kanban_cards k
WHERE NOT EXISTS (SELECT 1 FROM public.kanban_card_logs l WHERE l.card_id = k.id AND l.log_type = 'created');

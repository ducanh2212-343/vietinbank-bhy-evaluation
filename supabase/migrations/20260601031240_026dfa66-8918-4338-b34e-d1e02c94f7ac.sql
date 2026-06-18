
-- =========================================================
-- KANBAN: chống trùng & vòng đời (cleanup + lifecycle + upsert)
-- =========================================================

-- 1) Sửa kanban_upsert_card: không tạo card mới cho action rỗng/placeholder.
CREATE OR REPLACE FUNCTION public.kanban_upsert_card(
  _source_table text, _source_action_id uuid, _source_type text,
  _form_id uuid, _title text, _skill_id uuid,
  _attitude_dimension_id integer, _learning_mode text, _deadline date
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_profile uuid;
  v_cycle uuid;
  v_card_id uuid;
  v_norm text;
  v_is_placeholder boolean;
BEGIN
  SELECT employee_id, cycle_id INTO v_profile, v_cycle
    FROM public.form_submissions WHERE id = _form_id;
  IF v_profile IS NULL THEN RETURN NULL; END IF;

  v_norm := lower(btrim(COALESCE(_title,'')));
  v_is_placeholder := (v_norm = '' OR v_norm = ANY (ARRAY[
    'chưa nhập','chưa đặt tên','(chưa đặt tên)',
    'chưa có nội dung','chưa có nội dung hành động'
  ]));

  -- Nếu placeholder: chỉ update card hiện có (nếu có), KHÔNG insert mới.
  IF v_is_placeholder THEN
    UPDATE public.kanban_cards
       SET skill_id = _skill_id,
           attitude_dimension_id = _attitude_dimension_id,
           learning_mode = _learning_mode,
           deadline = _deadline,
           updated_at = now()
     WHERE source_table = _source_table
       AND source_action_id = _source_action_id
     RETURNING id INTO v_card_id;
    RETURN v_card_id;
  END IF;

  INSERT INTO public.kanban_cards(
    profile_id, form_id, cycle_id, source_type, source_table, source_action_id,
    title, skill_id, attitude_dimension_id, learning_mode, deadline, is_active
  ) VALUES (
    v_profile, _form_id, v_cycle, _source_type, _source_table, _source_action_id,
    _title, _skill_id, _attitude_dimension_id, _learning_mode, _deadline, true
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

  INSERT INTO public.kanban_card_logs(card_id, profile_id, log_type, new_status, created_by)
  SELECT v_card_id, v_profile, 'created', 'todo', auth.uid()
  WHERE NOT EXISTS (SELECT 1 FROM public.kanban_card_logs WHERE card_id = v_card_id AND log_type = 'created');

  RETURN v_card_id;
END; $$;

-- 2) Trigger archive khi xoá action gốc
CREATE OR REPLACE FUNCTION public.kanban_archive_on_source_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.kanban_cards
     SET is_active = false,
         archived_at = now(),
         archived_reason = COALESCE(archived_reason, 'source_deleted'),
         updated_at = now()
   WHERE source_table = TG_ARGV[0]
     AND source_action_id = OLD.id
     AND is_active = true;
  RETURN OLD;
END; $$;

DROP TRIGGER IF EXISTS archive_kanban_on_skill_action_delete ON public.form_skill_actions;
CREATE TRIGGER archive_kanban_on_skill_action_delete
AFTER DELETE ON public.form_skill_actions
FOR EACH ROW EXECUTE FUNCTION public.kanban_archive_on_source_delete('form_skill_actions');

DROP TRIGGER IF EXISTS archive_kanban_on_attitude_action_delete ON public.form_attitude_actions;
CREATE TRIGGER archive_kanban_on_attitude_action_delete
AFTER DELETE ON public.form_attitude_actions
FOR EACH ROW EXECUTE FUNCTION public.kanban_archive_on_source_delete('form_attitude_actions');

DROP TRIGGER IF EXISTS archive_kanban_on_ai_action_delete ON public.form_ai_actions_v2;
CREATE TRIGGER archive_kanban_on_ai_action_delete
AFTER DELETE ON public.form_ai_actions_v2
FOR EACH ROW EXECUTE FUNCTION public.kanban_archive_on_source_delete('form_ai_actions_v2');

DROP TRIGGER IF EXISTS archive_kanban_on_prev_action_delete ON public.form_previous_action_reviews;
CREATE TRIGGER archive_kanban_on_prev_action_delete
AFTER DELETE ON public.form_previous_action_reviews
FOR EACH ROW EXECUTE FUNCTION public.kanban_archive_on_source_delete('form_previous_action_reviews');

-- 3) ONE-TIME CLEANUP: merge logs về winner rồi xoá action gốc thua.
DO $$
DECLARE
  r record;
  v_winner_card uuid;
  v_loser_card uuid;
  v_merged int := 0;
  v_deleted int := 0;
  v_placeholder_archived int := 0;
  v_orphan_archived int := 0;
BEGIN
  -- 3a) form_skill_actions dups (cùng form + skill_priority + normalized text)
  FOR r IN
    WITH norm AS (
      SELECT a.id, a.form_id, a.skill_priority_id,
             lower(btrim(a.action_text)) AS n,
             a.created_at,
             k.id AS card_id,
             CASE k.kanban_status WHEN 'done' THEN 3 WHEN 'doing' THEN 2 WHEN 'todo' THEN 1 ELSE 0 END AS st,
             COALESCE(k.progress_percent,0) AS prog,
             (SELECT count(*) FROM public.kanban_card_logs l WHERE l.card_id = k.id) AS lc
        FROM public.form_skill_actions a
        LEFT JOIN public.kanban_cards k
          ON k.source_table='form_skill_actions' AND k.source_action_id=a.id
       WHERE COALESCE(btrim(a.action_text),'') <> ''
         AND lower(btrim(a.action_text)) NOT IN
             ('chưa nhập','chưa đặt tên','(chưa đặt tên)','chưa có nội dung','chưa có nội dung hành động')
    ),
    ranked AS (
      SELECT *,
        row_number() OVER (PARTITION BY form_id, skill_priority_id, n
                           ORDER BY st DESC, prog DESC, lc DESC, created_at ASC) AS rn,
        first_value(card_id) OVER (PARTITION BY form_id, skill_priority_id, n
                                   ORDER BY st DESC, prog DESC, lc DESC, created_at ASC) AS winner_card
      FROM norm
    )
    SELECT id, card_id AS loser_card, winner_card
      FROM ranked
     WHERE rn > 1
  LOOP
    v_winner_card := r.winner_card; v_loser_card := r.loser_card;
    IF v_loser_card IS NOT NULL AND v_winner_card IS NOT NULL AND v_loser_card <> v_winner_card THEN
      UPDATE public.kanban_card_logs SET card_id = v_winner_card WHERE card_id = v_loser_card;
      v_merged := v_merged + 1;
    END IF;
    DELETE FROM public.form_skill_actions WHERE id = r.id;
    v_deleted := v_deleted + 1;
  END LOOP;

  -- 3b) form_attitude_actions dups
  FOR r IN
    WITH norm AS (
      SELECT a.id, a.form_id, a.attitude_priority_id,
             lower(btrim(a.action_text)) AS n,
             a.created_at,
             k.id AS card_id,
             CASE k.kanban_status WHEN 'done' THEN 3 WHEN 'doing' THEN 2 WHEN 'todo' THEN 1 ELSE 0 END AS st,
             COALESCE(k.progress_percent,0) AS prog,
             (SELECT count(*) FROM public.kanban_card_logs l WHERE l.card_id = k.id) AS lc
        FROM public.form_attitude_actions a
        LEFT JOIN public.kanban_cards k
          ON k.source_table='form_attitude_actions' AND k.source_action_id=a.id
       WHERE COALESCE(btrim(a.action_text),'') <> ''
         AND lower(btrim(a.action_text)) NOT IN
             ('chưa nhập','chưa đặt tên','(chưa đặt tên)','chưa có nội dung','chưa có nội dung hành động')
    ),
    ranked AS (
      SELECT *,
        row_number() OVER (PARTITION BY form_id, attitude_priority_id, n
                           ORDER BY st DESC, prog DESC, lc DESC, created_at ASC) AS rn,
        first_value(card_id) OVER (PARTITION BY form_id, attitude_priority_id, n
                                   ORDER BY st DESC, prog DESC, lc DESC, created_at ASC) AS winner_card
      FROM norm
    )
    SELECT id, card_id AS loser_card, winner_card
      FROM ranked
     WHERE rn > 1
  LOOP
    v_winner_card := r.winner_card; v_loser_card := r.loser_card;
    IF v_loser_card IS NOT NULL AND v_winner_card IS NOT NULL AND v_loser_card <> v_winner_card THEN
      UPDATE public.kanban_card_logs SET card_id = v_winner_card WHERE card_id = v_loser_card;
      v_merged := v_merged + 1;
    END IF;
    DELETE FROM public.form_attitude_actions WHERE id = r.id;
    v_deleted := v_deleted + 1;
  END LOOP;

  -- 3c) form_ai_actions_v2 dups
  FOR r IN
    WITH norm AS (
      SELECT a.id, a.form_id,
             lower(btrim(a.ai_action_text)) AS n,
             a.created_at,
             k.id AS card_id,
             CASE k.kanban_status WHEN 'done' THEN 3 WHEN 'doing' THEN 2 WHEN 'todo' THEN 1 ELSE 0 END AS st,
             COALESCE(k.progress_percent,0) AS prog,
             (SELECT count(*) FROM public.kanban_card_logs l WHERE l.card_id = k.id) AS lc
        FROM public.form_ai_actions_v2 a
        LEFT JOIN public.kanban_cards k
          ON k.source_table='form_ai_actions_v2' AND k.source_action_id=a.id
       WHERE COALESCE(btrim(a.ai_action_text),'') <> ''
         AND lower(btrim(a.ai_action_text)) NOT IN
             ('chưa nhập','chưa đặt tên','(chưa đặt tên)','chưa có nội dung','chưa có nội dung hành động')
    ),
    ranked AS (
      SELECT *,
        row_number() OVER (PARTITION BY form_id, n
                           ORDER BY st DESC, prog DESC, lc DESC, created_at ASC) AS rn,
        first_value(card_id) OVER (PARTITION BY form_id, n
                                   ORDER BY st DESC, prog DESC, lc DESC, created_at ASC) AS winner_card
      FROM norm
    )
    SELECT id, card_id AS loser_card, winner_card
      FROM ranked
     WHERE rn > 1
  LOOP
    v_winner_card := r.winner_card; v_loser_card := r.loser_card;
    IF v_loser_card IS NOT NULL AND v_winner_card IS NOT NULL AND v_loser_card <> v_winner_card THEN
      UPDATE public.kanban_card_logs SET card_id = v_winner_card WHERE card_id = v_loser_card;
      v_merged := v_merged + 1;
    END IF;
    DELETE FROM public.form_ai_actions_v2 WHERE id = r.id;
    v_deleted := v_deleted + 1;
  END LOOP;

  -- 3d) Archive card placeholder khi cùng nhóm đã có card thật
  WITH grp AS (
    SELECT id, profile_id, form_id, source_type, skill_id, attitude_dimension_id, title
      FROM public.kanban_cards
     WHERE is_active = true
  ),
  has_real AS (
    SELECT profile_id, form_id, source_type, skill_id, attitude_dimension_id
      FROM grp
     WHERE COALESCE(btrim(title),'') <> ''
       AND lower(btrim(title)) NOT IN
           ('chưa nhập','chưa đặt tên','(chưa đặt tên)','chưa có nội dung','chưa có nội dung hành động')
     GROUP BY 1,2,3,4,5
  ),
  placeholders AS (
    SELECT g.id
      FROM grp g
      JOIN has_real h
        ON h.profile_id = g.profile_id
       AND h.form_id    = g.form_id
       AND h.source_type = g.source_type
       AND h.skill_id IS NOT DISTINCT FROM g.skill_id
       AND h.attitude_dimension_id IS NOT DISTINCT FROM g.attitude_dimension_id
     WHERE COALESCE(btrim(g.title),'') = ''
        OR lower(btrim(g.title)) IN
           ('chưa nhập','chưa đặt tên','(chưa đặt tên)','chưa có nội dung','chưa có nội dung hành động')
  )
  UPDATE public.kanban_cards
     SET is_active=false, archived_at=now(),
         archived_reason=COALESCE(archived_reason,'placeholder_replaced'),
         updated_at=now()
   WHERE id IN (SELECT id FROM placeholders);
  GET DIAGNOSTICS v_placeholder_archived = ROW_COUNT;

  -- 3e) Archive card mồ côi (action gốc đã không còn)
  UPDATE public.kanban_cards k
     SET is_active=false, archived_at=now(),
         archived_reason=COALESCE(archived_reason,'orphan'),
         updated_at=now()
   WHERE is_active = true
     AND source_action_id IS NOT NULL
     AND (
       (source_table='form_skill_actions'         AND NOT EXISTS (SELECT 1 FROM public.form_skill_actions x         WHERE x.id=k.source_action_id))
    OR (source_table='form_attitude_actions'      AND NOT EXISTS (SELECT 1 FROM public.form_attitude_actions x      WHERE x.id=k.source_action_id))
    OR (source_table='form_ai_actions_v2'         AND NOT EXISTS (SELECT 1 FROM public.form_ai_actions_v2 x         WHERE x.id=k.source_action_id))
    OR (source_table='form_previous_action_reviews' AND NOT EXISTS (SELECT 1 FROM public.form_previous_action_reviews x WHERE x.id=k.source_action_id))
     );
  GET DIAGNOSTICS v_orphan_archived = ROW_COUNT;

  RAISE NOTICE 'Kanban cleanup: merged_log_groups=%, deleted_source_rows=%, placeholders_archived=%, orphans_archived=%',
    v_merged, v_deleted, v_placeholder_archived, v_orphan_archived;
END $$;

-- 4) Unique partial index chống trùng action gốc (bỏ qua placeholder)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_skill_action_per_priority
  ON public.form_skill_actions (form_id, skill_priority_id, lower(btrim(action_text)))
  WHERE COALESCE(btrim(action_text),'') <> ''
    AND lower(btrim(action_text)) NOT IN
        ('chưa nhập','chưa đặt tên','(chưa đặt tên)','chưa có nội dung','chưa có nội dung hành động');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_attitude_action_per_priority
  ON public.form_attitude_actions (form_id, attitude_priority_id, lower(btrim(action_text)))
  WHERE COALESCE(btrim(action_text),'') <> ''
    AND lower(btrim(action_text)) NOT IN
        ('chưa nhập','chưa đặt tên','(chưa đặt tên)','chưa có nội dung','chưa có nội dung hành động');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ai_action_per_form
  ON public.form_ai_actions_v2 (form_id, lower(btrim(ai_action_text)))
  WHERE COALESCE(btrim(ai_action_text),'') <> ''
    AND lower(btrim(ai_action_text)) NOT IN
        ('chưa nhập','chưa đặt tên','(chưa đặt tên)','chưa có nội dung','chưa có nội dung hành động');

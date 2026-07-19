-- ============================================================================
-- BHY QUIZZI — (1) Thời gian riêng cho TỪNG câu hỏi + (2) Checklist EQ
-- "cam kết tự làm, không dùng phao"
--
-- (1) quiz_questions/quiz_campaign_questions thêm time_seconds (NULL = dùng
--     mặc định per_question_seconds của quiz/chiến dịch). Budget chấm điểm và
--     payload `seconds` tính THEO TỪNG CÂU — câu khó cho nhiều giờ hơn.
-- (2) Trước khi bắt đầu lượt làm, cán bộ tick checklist cam kết danh dự
--     (không mở tài liệu/"phao", không nhờ làm hộ, sai không bị phạt...).
--     Không phải giám sát kỹ thuật — là cam kết chủ động (consistency
--     principle): tự cam kết rồi thì tự giác tuân thủ, TỰ LÀM THÌ NHỚ LÂU HƠN.
--     Server ép ở RPC start (không chỉ UI); dấu thời điểm lưu trên attempt.
-- ============================================================================

-- (1) Thời gian riêng từng câu
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS time_seconds integer
  CHECK (time_seconds IS NULL OR time_seconds BETWEEN 10 AND 300);

ALTER TABLE public.quiz_campaign_questions
  ADD COLUMN IF NOT EXISTS time_seconds integer
  CHECK (time_seconds IS NULL OR time_seconds BETWEEN 10 AND 300);

-- (2) Cam kết EQ
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS require_pledge boolean NOT NULL DEFAULT true;
ALTER TABLE public.quiz_campaigns
  ADD COLUMN IF NOT EXISTS require_pledge boolean NOT NULL DEFAULT true;
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS pledge_accepted_at timestamptz;
ALTER TABLE public.quiz_campaign_attempts
  ADD COLUMN IF NOT EXISTS pledge_accepted_at timestamptz;

-- Danh mục mục cam kết (admin chỉnh sửa được nội dung)
CREATE TABLE IF NOT EXISTS public.quiz_pledge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.quiz_pledge_items (code, label, sort_order) VALUES
  ('PL_NO_PHAO',      'Tôi tự làm bài bằng hiểu biết của mình, KHÔNG mở tài liệu/công văn ("phao") trong lúc làm', 1),
  ('PL_NO_PROXY',     'Tôi không nhờ ai làm hộ và không làm hộ ai', 2),
  ('PL_OK_WRONG',     'Tôi hiểu làm sai không bị phạt — câu sai chính là chỗ tôi cần học lại', 3),
  ('PL_READ_EXPLAIN', 'Tôi sẽ đọc phần giải thích sau mỗi câu để nhớ lâu hơn', 4)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.quiz_pledge_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quiz_pledge_items FROM anon;

CREATE POLICY "Authenticated read pledge items" ON public.quiz_pledge_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage pledge items" ON public.quiz_pledge_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role));

-- ============================================================================
-- QUIZ PHÒNG — đổi chữ ký start (thêm _pledge_accepted) + giờ theo từng câu
-- ============================================================================
DROP FUNCTION IF EXISTS public.quiz_start_attempt(uuid);

CREATE FUNCTION public.quiz_start_attempt(_quiz_id uuid, _pledge_accepted boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_quiz record;
  v_attempt record;
  v_first uuid;
  v_total integer;
  v_q record;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy hồ sơ cán bộ của tài khoản này';
  END IF;

  PERFORM public.quiz_expire_stale_attempts();

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = _quiz_id;
  IF v_quiz.id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy quiz';
  END IF;
  IF v_quiz.status <> 'published' THEN
    RAISE EXCEPTION 'Quiz đã gỡ xuất bản';
  END IF;
  IF v_quiz.department_id IS DISTINCT FROM public.get_my_department_id() THEN
    RAISE EXCEPTION 'Quiz này thuộc phòng khác';
  END IF;
  IF v_quiz.created_by = v_me THEN
    RAISE EXCEPTION 'Bạn là người soạn quiz này — mời đồng đội cùng phòng vào làm nhé!';
  END IF;
  IF v_quiz.week_start <> public.quiz_week_start(now()) THEN
    RAISE EXCEPTION 'Quiz thuộc tuần trước — chỉ làm xếp hạng được trong tuần phát hành';
  END IF;

  SELECT count(*)::integer INTO v_total FROM public.quiz_questions WHERE quiz_id = _quiz_id;
  IF v_total = 0 THEN
    RAISE EXCEPTION 'Quiz chưa có câu hỏi nào';
  END IF;

  -- Đang có lượt dở dang → tiếp tục (không bắt cam kết lại)
  SELECT * INTO v_attempt FROM public.quiz_attempts
   WHERE quiz_id = _quiz_id AND profile_id = v_me;
  IF v_attempt.id IS NOT NULL THEN
    IF v_attempt.status = 'completed' THEN
      RAISE EXCEPTION 'Bạn đã hoàn thành quiz này rồi';
    ELSIF v_attempt.status = 'expired' THEN
      RAISE EXCEPTION 'Lượt làm trước đã hết hạn (quá 30 phút)';
    END IF;
    UPDATE public.quiz_attempts
       SET current_question_served_at = now()
     WHERE id = v_attempt.id;
    SELECT id, statement, options, time_seconds INTO v_q
      FROM public.quiz_questions WHERE id = v_attempt.current_question_id;
    RETURN jsonb_build_object(
      'attempt_id', v_attempt.id,
      'resumed', true,
      'question', jsonb_build_object('id', v_q.id, 'statement', v_q.statement, 'options', v_q.options),
      'index', (SELECT count(*)::integer + 1 FROM public.quiz_attempt_answers WHERE attempt_id = v_attempt.id),
      'total', v_total,
      'seconds', COALESCE(v_q.time_seconds, v_quiz.per_question_seconds)
    );
  END IF;

  -- Cam kết EQ: server ép, không chỉ UI
  IF v_quiz.require_pledge AND NOT COALESCE(_pledge_accepted, false) THEN
    RAISE EXCEPTION 'Cần xác nhận cam kết tự làm bài trước khi bắt đầu';
  END IF;

  v_first := public.quiz_next_question(_quiz_id, NULL);

  INSERT INTO public.quiz_attempts
    (quiz_id, profile_id, current_question_id, current_question_served_at, total_questions, pledge_accepted_at)
  VALUES (_quiz_id, v_me, v_first, now(), v_total,
          CASE WHEN COALESCE(_pledge_accepted, false) THEN now() END)
  RETURNING * INTO v_attempt;

  SELECT id, statement, options, time_seconds INTO v_q FROM public.quiz_questions WHERE id = v_first;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt.id,
    'resumed', false,
    'question', jsonb_build_object('id', v_q.id, 'statement', v_q.statement, 'options', v_q.options),
    'index', 1,
    'total', v_total,
    'seconds', COALESCE(v_q.time_seconds, v_quiz.per_question_seconds)
  );
END; $$;

-- Budget câu hiện tại + seconds câu kế tiếp: theo từng câu
CREATE OR REPLACE FUNCTION public.quiz_answer_question(_attempt_id uuid, _selected_index integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_attempt record;
  v_quiz record;
  v_q record;
  v_budget_ms integer;
  v_elapsed_ms integer;
  v_timed_out boolean;
  v_is_correct boolean;
  v_points integer := 0;
  v_next uuid;
  v_next_q record;
  v_answered integer;
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = _attempt_id;
  IF v_attempt.id IS NULL OR v_attempt.profile_id <> v_me THEN
    RAISE EXCEPTION 'Không tìm thấy lượt làm của bạn';
  END IF;
  IF v_attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Lượt làm đã kết thúc';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;
  SELECT * INTO v_q FROM public.quiz_questions WHERE id = v_attempt.current_question_id;
  IF v_q.id IS NULL THEN
    RAISE EXCEPTION 'Lượt làm không còn câu hỏi hiện hành';
  END IF;

  v_budget_ms := COALESCE(v_q.time_seconds, v_quiz.per_question_seconds) * 1000;
  -- Đồng hồ server + 3s dung sai mạng; quá 2× budget coi như hết giờ
  v_elapsed_ms := LEAST(
    GREATEST(0, (EXTRACT(EPOCH FROM (now() - v_attempt.current_question_served_at)) * 1000)::integer - 3000),
    v_budget_ms * 2
  );
  v_timed_out := v_elapsed_ms >= v_budget_ms * 2
                 OR _selected_index IS NULL
                 OR _selected_index < 0
                 OR _selected_index >= jsonb_array_length(v_q.options);

  v_is_correct := NOT v_timed_out AND _selected_index = v_q.correct_index;
  IF v_is_correct THEN
    v_points := 100 + round(50.0 * GREATEST(0, v_budget_ms - v_elapsed_ms) / v_budget_ms)::integer;
  END IF;

  INSERT INTO public.quiz_attempt_answers (attempt_id, question_id, selected_index, is_correct, elapsed_ms, points)
  VALUES (_attempt_id, v_q.id,
          CASE WHEN v_timed_out THEN NULL ELSE _selected_index END,
          v_is_correct, LEAST(v_elapsed_ms, v_budget_ms * 2), v_points);

  v_next := public.quiz_next_question(v_attempt.quiz_id, v_q.id);
  SELECT count(*)::integer INTO v_answered FROM public.quiz_attempt_answers WHERE attempt_id = _attempt_id;

  IF v_next IS NULL THEN
    -- Câu cuối → chốt sổ
    UPDATE public.quiz_attempts a
       SET status = 'completed',
           completed_at = now(),
           current_question_id = NULL,
           current_question_served_at = NULL,
           correct_count = s.c, total_time_ms = s.t, score = s.p
      FROM (
        SELECT count(*) FILTER (WHERE is_correct)::integer AS c,
               COALESCE(sum(elapsed_ms),0)::integer AS t,
               COALESCE(sum(points),0)::integer AS p
        FROM public.quiz_attempt_answers WHERE attempt_id = _attempt_id
      ) s
     WHERE a.id = _attempt_id;

    PERFORM public.quiz_process_completion(_attempt_id);

    SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = _attempt_id;
    RETURN jsonb_build_object(
      'is_correct', v_is_correct,
      'timed_out', v_timed_out,
      'correct_index', v_q.correct_index,
      'explanation', v_q.explanation,
      'points', v_points,
      'done', true,
      'summary', jsonb_build_object(
        'score', v_attempt.score,
        'correct_count', v_attempt.correct_count,
        'total_questions', v_attempt.total_questions,
        'total_time_ms', v_attempt.total_time_ms,
        'new_badges', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('code', c.code, 'name', c.name, 'description', c.description))
          FROM public.quiz_badge_awards_pending_view() c
        ), '[]'::jsonb)
      )
    );
  END IF;

  UPDATE public.quiz_attempts
     SET current_question_id = v_next, current_question_served_at = now()
   WHERE id = _attempt_id;

  SELECT id, statement, options, time_seconds INTO v_next_q FROM public.quiz_questions WHERE id = v_next;

  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'timed_out', v_timed_out,
    'correct_index', v_q.correct_index,
    'explanation', v_q.explanation,
    'points', v_points,
    'done', false,
    'next', jsonb_build_object(
      'question', jsonb_build_object('id', v_next_q.id, 'statement', v_next_q.statement, 'options', v_next_q.options),
      'index', v_answered + 1,
      'total', v_attempt.total_questions,
      'seconds', COALESCE(v_next_q.time_seconds, v_quiz.per_question_seconds)
    )
  );
END; $$;

-- ============================================================================
-- CHIẾN DỊCH — serve/answer theo giờ từng câu + start có cam kết
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_campaign_serve(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_a record;
  v_c record;
  v_qid uuid;
  v_q record;
  v_perm integer[];
  v_displayed jsonb;
BEGIN
  SELECT * INTO v_a FROM public.quiz_campaign_attempts WHERE id = _attempt_id;
  SELECT * INTO v_c FROM public.quiz_campaigns WHERE id = v_a.campaign_id;
  v_qid := v_a.question_ids[v_a.current_pos];
  SELECT * INTO v_q FROM public.quiz_campaign_questions WHERE id = v_qid;
  v_perm := ARRAY(SELECT (e.v)::integer FROM jsonb_array_elements_text(v_a.option_orders -> v_qid::text) AS e(v));
  SELECT jsonb_agg(v_q.options -> p ORDER BY ord) INTO v_displayed
    FROM unnest(v_perm) WITH ORDINALITY AS t(p, ord);
  RETURN jsonb_build_object(
    'attempt_id', v_a.id,
    'question', jsonb_build_object('id', v_q.id, 'statement', v_q.statement, 'options', v_displayed),
    'index', v_a.current_pos,
    'total', v_a.total_questions,
    'seconds', COALESCE(v_q.time_seconds, v_c.per_question_seconds)
  );
END; $$;

DROP FUNCTION IF EXISTS public.quiz_campaign_start_attempt(uuid);

CREATE FUNCTION public.quiz_campaign_start_attempt(_campaign_id uuid, _pledge_accepted boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_c record;
  v_a record;
  v_bank integer;
  v_pool integer;
  v_qids uuid[];
  v_orders jsonb := '{}'::jsonb;
  v_qid uuid;
  v_n integer;
  v_perm integer[];
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy hồ sơ cán bộ của tài khoản này';
  END IF;

  SELECT * INTO v_c FROM public.quiz_campaigns WHERE id = _campaign_id;
  IF v_c.id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy chiến dịch';
  END IF;
  IF NOT public.quiz_campaign_is_open(_campaign_id) THEN
    RAISE EXCEPTION 'Chiến dịch chưa mở hoặc đã kết thúc';
  END IF;
  IF v_c.created_by = v_me THEN
    RAISE EXCEPTION 'Bạn là người soạn chiến dịch này — hãy theo dõi kết quả nhé!';
  END IF;

  -- Lượt cũ: hoàn thành → chặn; dở dang → tiếp tục (không bắt cam kết lại)
  SELECT * INTO v_a FROM public.quiz_campaign_attempts
   WHERE campaign_id = _campaign_id AND profile_id = v_me;
  IF v_a.id IS NOT NULL THEN
    IF v_a.status = 'completed' THEN
      RAISE EXCEPTION 'Bạn đã hoàn thành chiến dịch này rồi';
    ELSIF v_a.status = 'expired' THEN
      RAISE EXCEPTION 'Lượt làm trước đã hết hạn (quá 30 phút)';
    END IF;
    UPDATE public.quiz_campaign_attempts SET current_served_at = now() WHERE id = v_a.id;
    RETURN public.quiz_campaign_serve(v_a.id) || jsonb_build_object('resumed', true);
  END IF;

  -- Cam kết EQ: server ép, không chỉ UI
  IF v_c.require_pledge AND NOT COALESCE(_pledge_accepted, false) THEN
    RAISE EXCEPTION 'Cần xác nhận cam kết tự làm bài trước khi bắt đầu';
  END IF;

  SELECT count(*)::integer INTO v_bank
    FROM public.quiz_campaign_questions WHERE campaign_id = _campaign_id;
  IF v_bank = 0 THEN
    RAISE EXCEPTION 'Chiến dịch chưa có câu hỏi nào';
  END IF;
  v_pool := LEAST(COALESCE(v_c.question_pool_size, v_bank), v_bank);

  -- Bốc đề: chọn ngẫu nhiên v_pool câu, thứ tự ngẫu nhiên — mỗi người một đề
  SELECT array_agg(id) INTO v_qids FROM (
    SELECT id FROM public.quiz_campaign_questions
    WHERE campaign_id = _campaign_id
    ORDER BY random()
    LIMIT v_pool
  ) t;

  -- Đảo thứ tự đáp án theo từng người (hoặc giữ nguyên nếu tắt shuffle)
  FOREACH v_qid IN ARRAY v_qids LOOP
    SELECT jsonb_array_length(options) INTO v_n
      FROM public.quiz_campaign_questions WHERE id = v_qid;
    IF v_c.shuffle_options THEN
      SELECT array_agg(i ORDER BY random()) INTO v_perm
        FROM generate_series(0, v_n - 1) AS i;
    ELSE
      SELECT array_agg(i ORDER BY i) INTO v_perm
        FROM generate_series(0, v_n - 1) AS i;
    END IF;
    v_orders := v_orders || jsonb_build_object(v_qid::text, to_jsonb(v_perm));
  END LOOP;

  INSERT INTO public.quiz_campaign_attempts
    (campaign_id, profile_id, question_ids, option_orders, current_pos, current_served_at, total_questions, pledge_accepted_at)
  VALUES (_campaign_id, v_me, v_qids, v_orders, 1, now(), v_pool,
          CASE WHEN COALESCE(_pledge_accepted, false) THEN now() END)
  RETURNING * INTO v_a;

  RETURN public.quiz_campaign_serve(v_a.id) || jsonb_build_object('resumed', false);
END; $$;

-- Budget chiến dịch theo giờ từng câu
CREATE OR REPLACE FUNCTION public.quiz_campaign_answer(_attempt_id uuid, _selected_index integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_a record;
  v_c record;
  v_qid uuid;
  v_q record;
  v_perm integer[];
  v_budget_ms integer;
  v_elapsed_ms integer;
  v_timed_out boolean;
  v_orig integer;                -- chỉ số GỐC người này đã chọn
  v_correct_display integer;     -- vị trí HIỂN THỊ của đáp án đúng (cho feedback)
  v_is_correct boolean;
  v_points integer := 0;
BEGIN
  SELECT * INTO v_a FROM public.quiz_campaign_attempts WHERE id = _attempt_id;
  IF v_a.id IS NULL OR v_a.profile_id <> v_me THEN
    RAISE EXCEPTION 'Không tìm thấy lượt làm của bạn';
  END IF;
  IF v_a.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Lượt làm đã kết thúc';
  END IF;

  SELECT * INTO v_c FROM public.quiz_campaigns WHERE id = v_a.campaign_id;
  v_qid := v_a.question_ids[v_a.current_pos];
  SELECT * INTO v_q FROM public.quiz_campaign_questions WHERE id = v_qid;
  v_perm := ARRAY(SELECT (e.v)::integer FROM jsonb_array_elements_text(v_a.option_orders -> v_qid::text) AS e(v));

  v_budget_ms := COALESCE(v_q.time_seconds, v_c.per_question_seconds) * 1000;
  v_elapsed_ms := LEAST(
    GREATEST(0, (EXTRACT(EPOCH FROM (now() - v_a.current_served_at)) * 1000)::integer - 3000),
    v_budget_ms * 2
  );
  v_timed_out := v_elapsed_ms >= v_budget_ms * 2
                 OR _selected_index IS NULL
                 OR _selected_index < 0
                 OR _selected_index >= array_length(v_perm, 1);

  v_orig := CASE WHEN v_timed_out THEN NULL ELSE v_perm[_selected_index + 1] END;
  v_correct_display := array_position(v_perm, v_q.correct_index) - 1;
  v_is_correct := NOT v_timed_out AND v_orig = v_q.correct_index;
  IF v_is_correct THEN
    v_points := 100 + round(50.0 * GREATEST(0, v_budget_ms - v_elapsed_ms) / v_budget_ms)::integer;
  END IF;

  INSERT INTO public.quiz_campaign_answers (attempt_id, question_id, selected_index, is_correct, elapsed_ms, points)
  VALUES (_attempt_id, v_qid, v_orig, v_is_correct, LEAST(v_elapsed_ms, v_budget_ms * 2), v_points);

  IF v_a.current_pos >= v_a.total_questions THEN
    UPDATE public.quiz_campaign_attempts a
       SET status = 'completed', completed_at = now(),
           current_served_at = NULL,
           correct_count = s.c, total_time_ms = s.t, score = s.p
      FROM (
        SELECT count(*) FILTER (WHERE is_correct)::integer AS c,
               COALESCE(sum(elapsed_ms),0)::integer AS t,
               COALESCE(sum(points),0)::integer AS p
        FROM public.quiz_campaign_answers WHERE attempt_id = _attempt_id
      ) s
     WHERE a.id = _attempt_id;

    PERFORM public.quiz_campaign_process_completion(_attempt_id);

    SELECT * INTO v_a FROM public.quiz_campaign_attempts WHERE id = _attempt_id;
    RETURN jsonb_build_object(
      'is_correct', v_is_correct,
      'timed_out', v_timed_out,
      'correct_index', v_correct_display,
      'explanation', v_q.explanation,
      'points', v_points,
      'done', true,
      'summary', jsonb_build_object(
        'score', v_a.score,
        'correct_count', v_a.correct_count,
        'total_questions', v_a.total_questions,
        'total_time_ms', v_a.total_time_ms,
        'new_badges', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('code', c.code, 'name', c.name, 'description', c.description))
          FROM public.quiz_badge_awards_pending_view() c
        ), '[]'::jsonb)
      )
    );
  END IF;

  UPDATE public.quiz_campaign_attempts
     SET current_pos = current_pos + 1, current_served_at = now()
   WHERE id = _attempt_id;

  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'timed_out', v_timed_out,
    'correct_index', v_correct_display,
    'explanation', v_q.explanation,
    'points', v_points,
    'done', false,
    'next', public.quiz_campaign_serve(_attempt_id)
  );
END; $$;

-- ============================================================================
-- Grants cho chữ ký mới (DROP đã xoá grant cũ)
-- ============================================================================
REVOKE ALL ON FUNCTION public.quiz_start_attempt(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_campaign_start_attempt(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quiz_start_attempt(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_campaign_start_attempt(uuid, boolean) TO authenticated;

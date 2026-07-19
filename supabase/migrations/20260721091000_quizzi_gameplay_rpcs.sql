-- ============================================================================
-- BHY QUIZZI — RPC gameplay (server cầm trịch toàn bộ)
-- Chống gian lận: đáp án không rời server trước khi trả lời; server phát câu
-- theo thứ tự cố định; thời gian đo bằng đồng hồ server; điểm chấm và lưu ở
-- server; 1 lượt/người/quiz; tác giả không làm quiz của mình.
-- Công thức điểm (mirror hiển thị ở src/lib/quizzi.ts — SQL là chuẩn):
--   đúng = 100 + round(50 × max(0, budget_ms − elapsed_ms) / budget_ms); sai/hết giờ = 0.
-- ============================================================================

-- Hook mở rộng sau khi hoàn thành lượt làm. Phase huy hiệu / chuỗi tuần sẽ
-- CREATE OR REPLACE hàm này (kiểu tiến hoá của kanban_upsert_card).
CREATE OR REPLACE FUNCTION public.quiz_process_completion(_attempt_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- P1: chưa có xử lý sau hoàn thành (huy hiệu ở P2, chuỗi tuần ở P3)
  NULL;
END; $$;

-- Câu hỏi kế tiếp của một quiz sau câu _after (NULL = câu đầu tiên)
CREATE OR REPLACE FUNCTION public.quiz_next_question(_quiz_id uuid, _after uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH ordered AS (
    SELECT id, row_number() OVER (ORDER BY sort_order, created_at, id) AS rn
    FROM public.quiz_questions WHERE quiz_id = _quiz_id
  )
  SELECT o.id FROM ordered o
  WHERE o.rn > COALESCE((SELECT rn FROM ordered WHERE id = _after), 0)
  ORDER BY o.rn LIMIT 1
$$;

-- Dọn lượt làm treo (>30 phút không kết thúc) — gọi lazily khi bắt đầu lượt
-- mới và từ cron hằng ngày.
CREATE OR REPLACE FUNCTION public.quiz_expire_stale_attempts()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.quiz_attempts
     SET status = 'expired', completed_at = now()
   WHERE status = 'in_progress'
     AND started_at < now() - interval '30 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

-- ============================================================================
-- Bắt đầu lượt làm — trả về câu hỏi đầu tiên (không kèm đáp án)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_start_attempt(_quiz_id uuid)
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

  -- Đang có lượt dở dang → tiếp tục từ câu hiện tại (reset đồng hồ câu đó)
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
    SELECT id, statement, options INTO v_q
      FROM public.quiz_questions WHERE id = v_attempt.current_question_id;
    RETURN jsonb_build_object(
      'attempt_id', v_attempt.id,
      'resumed', true,
      'question', jsonb_build_object('id', v_q.id, 'statement', v_q.statement, 'options', v_q.options),
      'index', (SELECT count(*)::integer + 1 FROM public.quiz_attempt_answers WHERE attempt_id = v_attempt.id),
      'total', v_total,
      'seconds', v_quiz.per_question_seconds
    );
  END IF;

  v_first := public.quiz_next_question(_quiz_id, NULL);

  INSERT INTO public.quiz_attempts (quiz_id, profile_id, current_question_id, current_question_served_at, total_questions)
  VALUES (_quiz_id, v_me, v_first, now(), v_total)
  RETURNING * INTO v_attempt;

  SELECT id, statement, options INTO v_q FROM public.quiz_questions WHERE id = v_first;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt.id,
    'resumed', false,
    'question', jsonb_build_object('id', v_q.id, 'statement', v_q.statement, 'options', v_q.options),
    'index', 1,
    'total', v_total,
    'seconds', v_quiz.per_question_seconds
  );
END; $$;

-- ============================================================================
-- Trả lời câu server đang trỏ — nhận feedback tức thì + câu kế tiếp / tổng kết
-- ============================================================================
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

  v_budget_ms := v_quiz.per_question_seconds * 1000;
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

  SELECT id, statement, options INTO v_next_q FROM public.quiz_questions WHERE id = v_next;

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
      'seconds', v_quiz.per_question_seconds
    )
  );
END; $$;

-- Huy hiệu mới chưa xem của tôi (P2 sẽ thay bằng bản đọc quiz_badge_awards;
-- P1 trả rỗng để quiz_answer_question dùng được ngay).
CREATE OR REPLACE FUNCTION public.quiz_badge_awards_pending_view()
RETURNS TABLE (code text, name text, description text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT NULL::text, NULL::text, NULL::text WHERE false
$$;

-- ============================================================================
-- Xem lại bài làm của mình (đường duy nhất người làm bài thấy đáp án)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_get_attempt_review(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_attempt record;
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = _attempt_id;
  IF v_attempt.id IS NULL OR v_attempt.profile_id <> v_me THEN
    RAISE EXCEPTION 'Không tìm thấy lượt làm của bạn';
  END IF;
  IF v_attempt.status <> 'completed' THEN
    RAISE EXCEPTION 'Chỉ xem lại được sau khi hoàn thành';
  END IF;

  RETURN jsonb_build_object(
    'score', v_attempt.score,
    'correct_count', v_attempt.correct_count,
    'total_questions', v_attempt.total_questions,
    'total_time_ms', v_attempt.total_time_ms,
    'questions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'statement', q.statement,
        'options', q.options,
        'correct_index', q.correct_index,
        'explanation', q.explanation,
        'selected_index', a.selected_index,
        'is_correct', a.is_correct,
        'elapsed_ms', a.elapsed_ms,
        'points', a.points
      ) ORDER BY q.sort_order, q.created_at, q.id)
      FROM public.quiz_attempt_answers a
      JOIN public.quiz_questions q ON q.id = a.question_id
      WHERE a.attempt_id = _attempt_id
    ), '[]'::jsonb)
  );
END; $$;

-- ============================================================================
-- Xếp hạng TRONG PHÒNG của một quiz (score DESC, thời gian ASC)
-- Chỉ thành viên phòng / trưởng phòng / admin xem được.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_get_ranking(_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_quiz record;
BEGIN
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = _quiz_id;
  IF v_quiz.id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy quiz';
  END IF;
  IF NOT (
    v_quiz.department_id = public.get_my_department_id()
    OR public.is_dept_manager(v_quiz.department_id)
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  ) THEN
    RAISE EXCEPTION 'Xếp hạng quiz chỉ hiển thị trong nội bộ phòng';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'profile_id', x.profile_id,
      'full_name', x.full_name,
      'score', x.score,
      'correct_count', x.correct_count,
      'total_questions', x.total_questions,
      'total_time_ms', x.total_time_ms,
      'completed_at', x.completed_at
    ) ORDER BY x.score DESC, x.total_time_ms ASC, x.completed_at ASC)
    FROM (
      SELECT a.profile_id, p.full_name, a.score, a.correct_count,
             a.total_questions, a.total_time_ms, a.completed_at
      FROM public.quiz_attempts a
      JOIN public.profiles p ON p.id = a.profile_id
      WHERE a.quiz_id = _quiz_id AND a.status = 'completed'
    ) x
  ), '[]'::jsonb);
END; $$;

-- ============================================================================
-- Grants
-- ============================================================================
-- Mặc định Postgres cấp EXECUTE cho PUBLIC trên function mới → thu hồi hết rồi
-- cấp lại đúng đối tượng. Hàm nội bộ/cron KHÔNG cấp cho authenticated.
REVOKE ALL ON FUNCTION public.quiz_week_start(timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_dept_manager(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_start_attempt(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_answer_question(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_get_attempt_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_get_ranking(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_next_question(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quiz_process_completion(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quiz_expire_stale_attempts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_expire_stale_attempts() TO service_role;

GRANT EXECUTE ON FUNCTION public.quiz_week_start(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dept_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_start_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_answer_question(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_get_attempt_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_get_ranking(uuid) TO authenticated;

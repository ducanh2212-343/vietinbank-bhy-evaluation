-- ============================================================================
-- BHY QUIZZI — RPC chiến dịch toàn chi nhánh
-- Chống làm bài hộ: đề bốc ngẫu nhiên theo người (question_pool_size), đảo thứ
-- tự câu + thứ tự ĐÁP ÁN theo người (shuffle_options). Client chỉ thấy phương
-- án theo thứ tự HIỂN THỊ của riêng mình; server lưu chỉ số GỐC để thống kê.
-- ============================================================================

-- Chiến dịch đang mở cửa làm bài? (ngày theo giờ VN)
CREATE OR REPLACE FUNCTION public.quiz_campaign_is_open(_campaign_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quiz_campaigns c
    WHERE c.id = _campaign_id
      AND c.status = 'approved'
      AND (c.start_date IS NULL OR (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= c.start_date)
      AND (c.end_date IS NULL OR (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= c.end_date)
  )
$$;

-- Payload câu hỏi hiện hành của một lượt (đáp án đã đảo theo option_orders,
-- KHÔNG kèm chỉ số đúng)
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
    'seconds', v_c.per_question_seconds
  );
END; $$;

-- ============================================================================
-- Bắt đầu / tiếp tục lượt làm chiến dịch — sinh ĐỀ RIÊNG cho từng người
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_campaign_start_attempt(_campaign_id uuid)
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

  -- Lượt cũ: hoàn thành → chặn; dở dang → tiếp tục
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
    (campaign_id, profile_id, question_ids, option_orders, current_pos, current_served_at, total_questions)
  VALUES (_campaign_id, v_me, v_qids, v_orders, 1, now(), v_pool)
  RETURNING * INTO v_a;

  RETURN public.quiz_campaign_serve(v_a.id) || jsonb_build_object('resumed', false);
END; $$;

-- ============================================================================
-- Trả lời câu hiện hành (chỉ số THEO THỨ TỰ HIỂN THỊ của người này)
-- ============================================================================
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

  v_budget_ms := v_c.per_question_seconds * 1000;
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
-- Xem lại bài của mình (theo thứ tự hiển thị RIÊNG của người này)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_campaign_get_review(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_a record;
BEGIN
  SELECT * INTO v_a FROM public.quiz_campaign_attempts WHERE id = _attempt_id;
  IF v_a.id IS NULL OR v_a.profile_id <> v_me THEN
    RAISE EXCEPTION 'Không tìm thấy lượt làm của bạn';
  END IF;
  IF v_a.status <> 'completed' THEN
    RAISE EXCEPTION 'Chỉ xem lại được sau khi hoàn thành';
  END IF;

  RETURN jsonb_build_object(
    'score', v_a.score,
    'correct_count', v_a.correct_count,
    'total_questions', v_a.total_questions,
    'total_time_ms', v_a.total_time_ms,
    'questions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'statement', q.statement,
        'options', (
          SELECT jsonb_agg(q.options -> p ORDER BY ord)
          FROM unnest(ARRAY(
            SELECT (e.v)::integer
            FROM jsonb_array_elements_text(v_a.option_orders -> q.id::text) AS e(v)
          )) WITH ORDINALITY AS t(p, ord)
        ),
        'correct_index', (
          SELECT array_position(ARRAY(
            SELECT (e.v)::integer
            FROM jsonb_array_elements_text(v_a.option_orders -> q.id::text) AS e(v)
          ), q.correct_index) - 1
        ),
        'selected_index', (
          CASE WHEN ans.selected_index IS NULL THEN NULL
          ELSE (
            SELECT array_position(ARRAY(
              SELECT (e.v)::integer
              FROM jsonb_array_elements_text(v_a.option_orders -> q.id::text) AS e(v)
            ), ans.selected_index) - 1
          ) END
        ),
        'explanation', q.explanation,
        'is_correct', ans.is_correct,
        'elapsed_ms', ans.elapsed_ms,
        'points', ans.points
      ) ORDER BY pos.ord)
      FROM unnest(v_a.question_ids) WITH ORDINALITY AS pos(qid, ord)
      JOIN public.quiz_campaign_questions q ON q.id = pos.qid
      JOIN public.quiz_campaign_answers ans ON ans.attempt_id = v_a.id AND ans.question_id = q.id
    ), '[]'::jsonb)
  );
END; $$;

-- ============================================================================
-- Tổng hợp kết quả kiểu Wooclap/Mentimeter
-- • question_stats (câu nào sai nhiều nhất, phân bố phương án GỐC): thấy khi
--   đã hoàn thành bài HOẶC là người tổ chức (creator/trưởng phòng khởi tạo/
--   BGĐ/admin) — tránh lộ đề cho người chưa làm.
-- • participants (danh sách tên + điểm): CHỈ người tổ chức và CHỈ KHI chiến
--   dịch không bật ẩn danh. Ẩn danh = không ai thấy tên, kể cả người tổ chức.
-- • departments: tỷ lệ tham gia theo phòng (luôn hiển thị — số liệu tập thể).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_campaign_get_results(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_c record;
  v_is_organizer boolean;
  v_my record;
  v_completed_me boolean;
  v_result jsonb;
BEGIN
  SELECT * INTO v_c FROM public.quiz_campaigns WHERE id = _campaign_id;
  IF v_c.id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy chiến dịch';
  END IF;
  IF v_c.status NOT IN ('approved','closed') THEN
    RAISE EXCEPTION 'Chiến dịch chưa chạy nên chưa có kết quả';
  END IF;

  v_is_organizer := v_c.created_by = v_me
    OR public.is_dept_manager(v_c.department_id)
    OR public.has_role(auth.uid(),'bgd'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'system_admin'::app_role);

  SELECT * INTO v_my FROM public.quiz_campaign_attempts
   WHERE campaign_id = _campaign_id AND profile_id = v_me AND status = 'completed';
  v_completed_me := v_my.id IS NOT NULL;

  v_result := jsonb_build_object(
    'campaign', jsonb_build_object(
      'id', v_c.id, 'title', v_c.title, 'status', v_c.status,
      'anonymous_results', v_c.anonymous_results,
      'question_pool_size', v_c.question_pool_size,
      'shuffle_options', v_c.shuffle_options,
      'is_organizer', v_is_organizer
    ),
    'my_result', CASE WHEN v_completed_me THEN jsonb_build_object(
      'score', v_my.score, 'correct_count', v_my.correct_count,
      'total_questions', v_my.total_questions, 'total_time_ms', v_my.total_time_ms,
      'attempt_id', v_my.id
    ) ELSE NULL END,
    'totals', (
      SELECT jsonb_build_object(
        'completed', count(*) FILTER (WHERE a.status = 'completed'),
        'in_progress', count(*) FILTER (WHERE a.status = 'in_progress'),
        'avg_score', COALESCE(round(avg(a.score) FILTER (WHERE a.status = 'completed')), 0),
        'avg_correct_pct', COALESCE(round(
          100.0 * avg(a.correct_count::numeric / NULLIF(a.total_questions,0))
          FILTER (WHERE a.status = 'completed')), 0)
      )
      FROM public.quiz_campaign_attempts a WHERE a.campaign_id = _campaign_id
    ),
    'departments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', d.name,
        'members', m.member_count,
        'completed', m.completed_count,
        'pct', CASE WHEN m.member_count > 0
          THEN round(100.0 * m.completed_count / m.member_count)::integer ELSE 0 END
      ) ORDER BY d.name)
      FROM public.departments d
      CROSS JOIN LATERAL (
        SELECT
          (SELECT count(*)::integer FROM public.profiles p
            WHERE p.department_id = d.id AND p.status = 'active') AS member_count,
          (SELECT count(*)::integer FROM public.quiz_campaign_attempts a
            JOIN public.profiles p ON p.id = a.profile_id
            WHERE a.campaign_id = _campaign_id AND a.status = 'completed'
              AND p.department_id = d.id) AS completed_count
      ) m
      WHERE d.is_active IS DISTINCT FROM false
    ), '[]'::jsonb)
  );

  -- Thống kê từng câu (chỉ số GỐC — phân bố phương án ổn định dù mỗi người
  -- thấy thứ tự khác nhau)
  IF v_completed_me OR v_is_organizer THEN
    v_result := v_result || jsonb_build_object('question_stats', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'question_id', q.id,
        'statement', q.statement,
        'options', q.options,
        'correct_index', q.correct_index,
        'explanation', q.explanation,
        'answered', s.answered,
        'correct', s.correct,
        'wrong', s.answered - s.correct - s.timeouts,
        'timeouts', s.timeouts,
        'pct_correct', CASE WHEN s.answered > 0
          THEN round(100.0 * s.correct / s.answered)::integer ELSE 0 END,
        'distribution', s.distribution
      ) ORDER BY CASE WHEN s.answered > 0 THEN 100.0 * s.correct / s.answered ELSE 100 END ASC,
                 q.sort_order)
      FROM public.quiz_campaign_questions q
      CROSS JOIN LATERAL (
        SELECT
          count(ans.id)::integer AS answered,
          count(*) FILTER (WHERE ans.is_correct)::integer AS correct,
          count(*) FILTER (WHERE ans.selected_index IS NULL)::integer AS timeouts,
          COALESCE((
            SELECT jsonb_agg(cnt ORDER BY idx)
            FROM (
              SELECT gs.idx,
                     (SELECT count(*)::integer FROM public.quiz_campaign_answers a2
                       JOIN public.quiz_campaign_attempts at2 ON at2.id = a2.attempt_id
                      WHERE a2.question_id = q.id AND a2.selected_index = gs.idx
                        AND at2.status = 'completed') AS cnt
              FROM generate_series(0, jsonb_array_length(q.options) - 1) AS gs(idx)
            ) dist
          ), '[]'::jsonb) AS distribution
        FROM public.quiz_campaign_answers ans
        JOIN public.quiz_campaign_attempts att ON att.id = ans.attempt_id
        WHERE ans.question_id = q.id AND att.status = 'completed'
      ) s
      WHERE q.campaign_id = _campaign_id
    ), '[]'::jsonb));
  END IF;

  -- Danh sách người làm: người tổ chức + KHÔNG ẩn danh
  IF v_is_organizer AND NOT v_c.anonymous_results THEN
    v_result := v_result || jsonb_build_object('participants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'full_name', p.full_name,
        'department', d.name,
        'score', a.score,
        'correct_count', a.correct_count,
        'total_questions', a.total_questions,
        'total_time_ms', a.total_time_ms,
        'completed_at', a.completed_at
      ) ORDER BY a.score DESC, a.total_time_ms ASC)
      FROM public.quiz_campaign_attempts a
      JOIN public.profiles p ON p.id = a.profile_id
      LEFT JOIN public.departments d ON d.id = p.department_id
      WHERE a.campaign_id = _campaign_id AND a.status = 'completed'
    ), '[]'::jsonb));
  END IF;

  RETURN v_result;
END; $$;

-- ============================================================================
-- Huy hiệu dùng chung cho quiz phòng + chiến dịch
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_completed_total(_profile uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (SELECT count(*)::integer FROM public.quiz_attempts
           WHERE profile_id = _profile AND status = 'completed')
       + (SELECT count(*)::integer FROM public.quiz_campaign_attempts
           WHERE profile_id = _profile AND status = 'completed')
$$;

-- Lõi chấm huy hiệu sau một lượt hoàn thành (quiz phòng hoặc chiến dịch)
CREATE OR REPLACE FUNCTION public.quiz_apply_completion_badges(
  _profile uuid, _ref_quiz uuid, _correct integer, _total integer,
  _time_ms integer, _budget_total_ms integer
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_completed integer;
  v_streak integer;
  v_unused_freezes integer;
BEGIN
  PERFORM public.quiz_award_badge(_profile, 'QZ_FIRST', _ref_quiz);

  IF _total >= 5 THEN
    IF _correct * 100 >= _total * 90 THEN
      PERFORM public.quiz_award_badge(_profile, 'QZ_SHARP', _ref_quiz);
    END IF;
    IF _correct = _total THEN
      PERFORM public.quiz_award_badge(_profile, 'QZ_PERFECT', _ref_quiz);
    END IF;
    IF _correct * 100 >= _total * 90 AND _time_ms * 2 <= _budget_total_ms THEN
      PERFORM public.quiz_award_badge(_profile, 'QZ_FLASH', _ref_quiz);
    END IF;
  END IF;

  v_completed := public.quiz_completed_total(_profile);
  IF v_completed >= 10 THEN PERFORM public.quiz_award_badge(_profile, 'QZ_PART_10', _ref_quiz); END IF;
  IF v_completed >= 25 THEN PERFORM public.quiz_award_badge(_profile, 'QZ_PART_25', _ref_quiz); END IF;
  IF v_completed >= 50 THEN PERFORM public.quiz_award_badge(_profile, 'QZ_PART_50', _ref_quiz); END IF;

  v_streak := public.quiz_current_streak(_profile);
  IF v_streak >= 4  THEN PERFORM public.quiz_award_badge(_profile, 'QZ_STREAK_4',  _ref_quiz); END IF;
  IF v_streak >= 12 THEN PERFORM public.quiz_award_badge(_profile, 'QZ_STREAK_12', _ref_quiz); END IF;
  IF v_streak >= 26 THEN PERFORM public.quiz_award_badge(_profile, 'QZ_STREAK_26', _ref_quiz); END IF;

  IF v_streak >= 4 AND v_streak % 4 = 0 THEN
    SELECT count(*)::integer INTO v_unused_freezes
      FROM public.quiz_streak_freezes
     WHERE profile_id = _profile AND used_week_start IS NULL;
    IF v_unused_freezes < 2 THEN
      INSERT INTO public.quiz_streak_freezes (profile_id, earned_reason)
      VALUES (_profile, 'streak_milestone:' || v_streak || ':' || public.quiz_week_start(now()))
      ON CONFLICT (profile_id, earned_reason) DO NOTHING;
    END IF;
  END IF;
END; $$;

-- Quiz phòng: chuyển sang lõi chung (giữ nguyên hành vi, thêm đếm chiến dịch
-- vào huy hiệu Bền bỉ)
CREATE OR REPLACE FUNCTION public.quiz_process_completion(_attempt_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_a record;
  v_quiz record;
BEGIN
  SELECT * INTO v_a FROM public.quiz_attempts WHERE id = _attempt_id AND status = 'completed';
  IF v_a.id IS NULL THEN RETURN; END IF;
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_a.quiz_id;
  PERFORM public.quiz_apply_completion_badges(
    v_a.profile_id, v_a.quiz_id, v_a.correct_count, v_a.total_questions,
    v_a.total_time_ms, v_quiz.per_question_seconds * 1000 * v_a.total_questions
  );
END; $$;

-- Chiến dịch: cùng lõi (không gắn quiz_id — huy hiệu tham chiếu NULL)
CREATE OR REPLACE FUNCTION public.quiz_campaign_process_completion(_attempt_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_a record;
  v_c record;
BEGIN
  SELECT * INTO v_a FROM public.quiz_campaign_attempts WHERE id = _attempt_id AND status = 'completed';
  IF v_a.id IS NULL THEN RETURN; END IF;
  SELECT * INTO v_c FROM public.quiz_campaigns WHERE id = v_a.campaign_id;
  PERFORM public.quiz_apply_completion_badges(
    v_a.profile_id, NULL, v_a.correct_count, v_a.total_questions,
    v_a.total_time_ms, v_c.per_question_seconds * 1000 * v_a.total_questions
  );
END; $$;

-- Chuỗi tuần: hoàn thành CHIẾN DỊCH cũng giữ nhịp học (cùng làm/soạn quiz phòng)
CREATE OR REPLACE FUNCTION public.quiz_profile_week_active(_profile uuid, _week date)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.profile_id = _profile AND a.status = 'completed'
      AND public.quiz_week_start(a.completed_at) = _week
  ) OR EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.created_by = _profile AND q.status = 'published' AND q.week_start = _week
  ) OR EXISTS (
    SELECT 1 FROM public.quiz_campaign_attempts ca
    WHERE ca.profile_id = _profile AND ca.status = 'completed'
      AND public.quiz_week_start(ca.completed_at) = _week
  ) OR EXISTS (
    SELECT 1 FROM public.quiz_streak_freezes f
    WHERE f.profile_id = _profile AND f.used_week_start = _week
  )
$$;

-- Dọn lượt treo: gồm cả lượt chiến dịch
CREATE OR REPLACE FUNCTION public.quiz_expire_stale_attempts()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer; v_count2 integer;
BEGIN
  UPDATE public.quiz_attempts
     SET status = 'expired', completed_at = now()
   WHERE status = 'in_progress'
     AND started_at < now() - interval '30 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.quiz_campaign_attempts
     SET status = 'expired', completed_at = now()
   WHERE status = 'in_progress'
     AND started_at < now() - interval '30 minutes';
  GET DIAGNOSTICS v_count2 = ROW_COUNT;
  RETURN v_count + v_count2;
END; $$;

-- ============================================================================
-- Grants (thu hồi PUBLIC mặc định; hàm nội bộ không cấp cho authenticated)
-- ============================================================================
REVOKE ALL ON FUNCTION public.quiz_campaign_is_open(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_campaign_serve(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quiz_campaign_start_attempt(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_campaign_answer(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_campaign_get_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_campaign_get_results(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_completed_total(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quiz_apply_completion_badges(uuid, uuid, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quiz_campaign_process_completion(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.quiz_campaign_is_open(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_campaign_start_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_campaign_answer(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_campaign_get_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_campaign_get_results(uuid) TO authenticated;

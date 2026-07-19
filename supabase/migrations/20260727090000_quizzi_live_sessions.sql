-- ============================================================================
-- BHY QUIZZI — PHIÊN LIVE TẠI CUỘC HỌP (kiểu Wayground/Quizizz)
-- Quiz tạo trước; tại cuộc họp chủ trì bấm "Mở Quizzi" → sảnh chờ hiện người
-- tham gia join vào (ẩn danh thì tự sinh biệt danh) → "Bắt đầu" → cả phòng
-- cùng làm (self-paced, engine sẵn có) → kết thúc hiện Top (điểm = số câu
-- đúng 100đ/câu + bonus tốc độ ≤50đ/câu, đồng điểm xếp theo tổng thời gian).
-- scope 'department' = họp phòng; 'branch' = giao ban tuần chi nhánh (cán bộ
-- chủ chốt mọi phòng join được — thành phần dự họp tự xác định).
-- Client cập nhật bằng polling 2s qua quiz_live_get_state (không cần Realtime).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quiz_live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  host_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'department' CHECK (scope IN ('department','branch')),
  anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','running','finished','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- Mỗi quiz chỉ 1 phiên đang sống (sảnh chờ hoặc đang chạy)
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_live_sessions_active
  ON public.quiz_live_sessions(quiz_id) WHERE status IN ('lobby','running');

CREATE TABLE IF NOT EXISTS public.quiz_live_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.quiz_live_sessions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  pledge_accepted_at timestamptz,
  attempt_id uuid REFERENCES public.quiz_attempts(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, profile_id),
  UNIQUE (session_id, nickname)
);

CREATE INDEX IF NOT EXISTS idx_quiz_live_participants_session
  ON public.quiz_live_participants(session_id);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.quiz_live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_live_participants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quiz_live_sessions, public.quiz_live_participants FROM anon;

-- Phiên: thấy khi giao ban chi nhánh (branch), quiz phòng mình, mình là host,
-- hoặc admin. Không chứa bí mật; mọi GHI qua RPC (không có policy ghi).
CREATE POLICY "View discoverable live sessions" ON public.quiz_live_sessions
  FOR SELECT TO authenticated
  USING (
    scope = 'branch'
    OR host_profile_id = public.get_my_profile_id()
    OR quiz_id IN (
      SELECT q.id FROM public.quizzes q
      WHERE q.department_id = public.get_my_department_id()
         OR public.is_dept_manager(q.department_id)
    )
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

-- ⚠️ Participants KHÔNG cho client SELECT (chống lộ mapping tên↔biệt danh khi
-- ẩn danh) — chỉ system_admin kỹ thuật; mọi đọc qua quiz_live_get_state.
CREATE POLICY "System admin reads live participants" ON public.quiz_live_participants
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'system_admin'::app_role));

-- ============================================================================
-- Mở phiên — tác giả quiz / trưởng phòng / admin+BGĐ
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_live_open(_quiz_id uuid, _scope text DEFAULT 'department', _anonymous boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_quiz record;
  v_existing record;
  v_session record;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy hồ sơ cán bộ của tài khoản này';
  END IF;
  IF _scope NOT IN ('department','branch') THEN
    RAISE EXCEPTION 'Phạm vi phiên không hợp lệ';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = _quiz_id;
  IF v_quiz.id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy quiz';
  END IF;
  IF v_quiz.status <> 'published' THEN
    RAISE EXCEPTION 'Quiz đã gỡ xuất bản';
  END IF;
  IF v_quiz.week_start <> public.quiz_week_start(now()) THEN
    RAISE EXCEPTION 'Chỉ mở phiên live cho quiz của tuần hiện tại';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id = _quiz_id) THEN
    RAISE EXCEPTION 'Quiz chưa có câu hỏi nào';
  END IF;
  IF NOT (
    v_quiz.created_by = v_me
    OR public.is_dept_manager(v_quiz.department_id)
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  ) THEN
    RAISE EXCEPTION 'Chỉ người soạn quiz hoặc lãnh đạo phòng mở được phiên live';
  END IF;

  -- Đã có phiên sống → trả lại phiên đó (idempotent cho host bấm lại)
  SELECT * INTO v_existing FROM public.quiz_live_sessions
   WHERE quiz_id = _quiz_id AND status IN ('lobby','running');
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('session_id', v_existing.id, 'status', v_existing.status, 'existing', true);
  END IF;

  INSERT INTO public.quiz_live_sessions (quiz_id, host_profile_id, scope, anonymous)
  VALUES (_quiz_id, v_me, _scope, _anonymous)
  RETURNING * INTO v_session;

  RETURN jsonb_build_object('session_id', v_session.id, 'status', v_session.status, 'existing', false);
END; $$;

-- ============================================================================
-- Tham gia phiên — sinh biệt danh khi ẩn danh
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_live_join(_session_id uuid, _pledge_accepted boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_s record;
  v_quiz record;
  v_p record;
  v_name text;
  v_nick text;
  v_animals text[] := ARRAY['Đại Bàng','Sư Tử','Báo Gấm','Cáo','Sóc','Ong Thợ','Cú Mèo','Hải Âu','Chim Ưng','Ngựa Chiến','Gấu Trúc','Cá Heo'];
  v_adjs text[] := ARRAY['Thần Tốc','Tinh Anh','Bền Bỉ','Sắc Bén','Điềm Tĩnh','Nhanh Nhẹn','Kiên Cường','Thông Thái','Rực Rỡ','Quyết Đoán'];
  v_try integer := 0;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy hồ sơ cán bộ của tài khoản này';
  END IF;

  SELECT * INTO v_s FROM public.quiz_live_sessions WHERE id = _session_id;
  IF v_s.id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy phiên Quizzi';
  END IF;
  IF v_s.status NOT IN ('lobby','running') THEN
    RAISE EXCEPTION 'Phiên đã kết thúc';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_s.quiz_id;
  IF v_s.scope = 'department'
     AND v_quiz.department_id IS DISTINCT FROM public.get_my_department_id() THEN
    RAISE EXCEPTION 'Phiên này dành cho cuộc họp của phòng khác';
  END IF;
  IF v_quiz.created_by = v_me THEN
    RAISE EXCEPTION 'Bạn là người soạn quiz này — hãy điều hành phiên nhé!';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.quiz_id = v_s.quiz_id AND a.profile_id = v_me AND a.status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Bạn đã hoàn thành quiz này trong tuần — vào xem bảng kết quả nhé';
  END IF;

  -- Đã join → trả lại (idempotent)
  SELECT * INTO v_p FROM public.quiz_live_participants
   WHERE session_id = _session_id AND profile_id = v_me;
  IF v_p.id IS NOT NULL THEN
    RETURN jsonb_build_object('participant_id', v_p.id, 'nickname', v_p.nickname, 'status', v_s.status);
  END IF;

  IF v_quiz.require_pledge AND NOT COALESCE(_pledge_accepted, false) THEN
    RAISE EXCEPTION 'Cần xác nhận cam kết tự làm bài trước khi vào sảnh';
  END IF;

  IF v_s.anonymous THEN
    LOOP
      v_try := v_try + 1;
      v_nick := v_animals[1 + floor(random() * array_length(v_animals,1))::integer]
                || ' ' ||
                v_adjs[1 + floor(random() * array_length(v_adjs,1))::integer];
      IF v_try > 20 THEN
        v_nick := v_nick || ' ' || (100 + floor(random() * 900))::integer;
      END IF;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.quiz_live_participants
        WHERE session_id = _session_id AND nickname = v_nick
      );
    END LOOP;
  ELSE
    SELECT full_name INTO v_name FROM public.profiles WHERE id = v_me;
    v_nick := v_name;
    -- Trùng tên thật (2 người cùng tên) → thêm hậu tố
    IF EXISTS (SELECT 1 FROM public.quiz_live_participants
               WHERE session_id = _session_id AND nickname = v_nick) THEN
      v_nick := v_nick || ' (' || (1 + floor(random() * 99))::integer || ')';
    END IF;
  END IF;

  INSERT INTO public.quiz_live_participants (session_id, profile_id, nickname, pledge_accepted_at)
  VALUES (_session_id, v_me, v_nick,
          CASE WHEN COALESCE(_pledge_accepted, false) THEN now() END)
  RETURNING * INTO v_p;

  RETURN jsonb_build_object('participant_id', v_p.id, 'nickname', v_p.nickname, 'status', v_s.status);
END; $$;

-- ============================================================================
-- Chủ trì chuyển trạng thái phiên
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_live_set_status(_session_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_s record;
BEGIN
  SELECT * INTO v_s FROM public.quiz_live_sessions WHERE id = _session_id;
  IF v_s.id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy phiên Quizzi';
  END IF;
  IF NOT (
    v_s.host_profile_id = v_me
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  ) THEN
    RAISE EXCEPTION 'Chỉ người chủ trì điều khiển được phiên';
  END IF;

  IF v_s.status = 'lobby' AND _status = 'running' THEN
    UPDATE public.quiz_live_sessions SET status = 'running', started_at = now() WHERE id = _session_id;
  ELSIF v_s.status = 'running' AND _status = 'finished' THEN
    UPDATE public.quiz_live_sessions SET status = 'finished', finished_at = now() WHERE id = _session_id;
  ELSIF v_s.status = 'lobby' AND _status = 'cancelled' THEN
    UPDATE public.quiz_live_sessions SET status = 'cancelled', finished_at = now() WHERE id = _session_id;
  ELSE
    RAISE EXCEPTION 'Chuyển trạng thái không hợp lệ (% → %)', v_s.status, _status;
  END IF;

  RETURN jsonb_build_object('session_id', _session_id, 'status', _status);
END; $$;

-- ============================================================================
-- Người chơi bắt đầu/tiếp tục lượt làm trong phiên live
-- Tư cách participant thay cho check phòng/tuần (phiên branch xuyên phòng);
-- payload CÙNG SHAPE quiz_start_attempt → engine dùng lại nguyên vẹn, trả lời
-- bằng quiz_answer_question hiện có.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_live_start_my_attempt(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_s record;
  v_quiz record;
  v_p record;
  v_attempt record;
  v_first uuid;
  v_total integer;
  v_q record;
BEGIN
  SELECT * INTO v_s FROM public.quiz_live_sessions WHERE id = _session_id;
  IF v_s.id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy phiên Quizzi';
  END IF;
  IF v_s.status <> 'running' THEN
    RAISE EXCEPTION 'Phiên chưa bắt đầu — chờ người chủ trì nhé';
  END IF;
  SELECT * INTO v_p FROM public.quiz_live_participants
   WHERE session_id = _session_id AND profile_id = v_me;
  IF v_p.id IS NULL THEN
    RAISE EXCEPTION 'Bạn chưa vào sảnh phiên này';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_s.quiz_id;
  SELECT count(*)::integer INTO v_total FROM public.quiz_questions WHERE quiz_id = v_quiz.id;

  SELECT * INTO v_attempt FROM public.quiz_attempts
   WHERE quiz_id = v_quiz.id AND profile_id = v_me;
  IF v_attempt.id IS NOT NULL THEN
    IF v_attempt.status = 'completed' THEN
      RAISE EXCEPTION 'Bạn đã hoàn thành quiz này rồi';
    ELSIF v_attempt.status = 'expired' THEN
      RAISE EXCEPTION 'Lượt làm trước đã hết hạn (quá 30 phút)';
    END IF;
    UPDATE public.quiz_attempts SET current_question_served_at = now() WHERE id = v_attempt.id;
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

  v_first := public.quiz_next_question(v_quiz.id, NULL);

  INSERT INTO public.quiz_attempts
    (quiz_id, profile_id, current_question_id, current_question_served_at, total_questions, pledge_accepted_at)
  VALUES (v_quiz.id, v_me, v_first, now(), v_total, v_p.pledge_accepted_at)
  RETURNING * INTO v_attempt;

  UPDATE public.quiz_live_participants SET attempt_id = v_attempt.id WHERE id = v_p.id;

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

-- ============================================================================
-- Trạng thái phiên cho sảnh chờ / màn điều hành / leaderboard (poll 2s)
-- Chỉ trả BIỆT DANH — không lộ tên thật khi ẩn danh.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_live_get_state(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_s record;
  v_quiz record;
  v_my record;
BEGIN
  SELECT * INTO v_s FROM public.quiz_live_sessions WHERE id = _session_id;
  IF v_s.id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy phiên Quizzi';
  END IF;
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_s.quiz_id;

  -- Quyền xem: host, admin/BGĐ, phiên branch, hoặc quiz phòng mình
  IF NOT (
    v_s.host_profile_id = v_me
    OR v_s.scope = 'branch'
    OR v_quiz.department_id = public.get_my_department_id()
    OR public.is_dept_manager(v_quiz.department_id)
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  ) THEN
    RAISE EXCEPTION 'Bạn không có quyền xem phiên này';
  END IF;

  SELECT * INTO v_my FROM public.quiz_live_participants
   WHERE session_id = _session_id AND profile_id = v_me;

  RETURN jsonb_build_object(
    'session', jsonb_build_object(
      'id', v_s.id,
      'status', v_s.status,
      'scope', v_s.scope,
      'anonymous', v_s.anonymous,
      'quiz_id', v_quiz.id,
      'quiz_title', v_quiz.title,
      'total_questions', (SELECT count(*)::integer FROM public.quiz_questions WHERE quiz_id = v_quiz.id),
      'host_name', (SELECT full_name FROM public.profiles WHERE id = v_s.host_profile_id),
      'is_host', v_s.host_profile_id = v_me,
      'started_at', v_s.started_at,
      'finished_at', v_s.finished_at
    ),
    'me', CASE WHEN v_my.id IS NOT NULL THEN jsonb_build_object(
      'participant_id', v_my.id,
      'nickname', v_my.nickname,
      'attempt_id', v_my.attempt_id
    ) ELSE NULL END,
    'participants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'nickname', x.nickname,
        'is_me', x.profile_id = v_me,
        'joined_at', x.joined_at,
        'answered', x.answered,
        'total', x.total_questions,
        'completed', x.completed,
        'score', x.score,
        'total_time_ms', x.total_time_ms
      ) ORDER BY x.completed DESC, x.score DESC, x.total_time_ms ASC, x.joined_at ASC)
      FROM (
        SELECT p.nickname, p.profile_id, p.joined_at,
               COALESCE(a.total_questions, 0) AS total_questions,
               COALESCE((SELECT count(*)::integer FROM public.quiz_attempt_answers aa
                          WHERE aa.attempt_id = a.id), 0) AS answered,
               COALESCE(a.status = 'completed', false) AS completed,
               COALESCE(a.score, 0) AS score,
               COALESCE(a.total_time_ms, 0) AS total_time_ms
        FROM public.quiz_live_participants p
        LEFT JOIN public.quiz_attempts a ON a.id = p.attempt_id
        WHERE p.session_id = _session_id
      ) x
    ), '[]'::jsonb)
  );
END; $$;

-- ============================================================================
-- quiz_get_ranking — tôn trọng ẩn danh: quiz từng có phiên live ẩn danh thì
-- bảng xếp hạng tuần thay tên thật bằng biệt danh (người làm async → 'Ẩn danh')
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_get_ranking(_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_quiz record;
  v_anonymous boolean;
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

  SELECT EXISTS (
    SELECT 1 FROM public.quiz_live_sessions s
    WHERE s.quiz_id = _quiz_id AND s.anonymous AND s.status IN ('running','finished')
  ) INTO v_anonymous;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'profile_id', CASE WHEN v_anonymous THEN NULL ELSE x.profile_id END,
      'full_name', CASE
        WHEN NOT v_anonymous THEN x.full_name
        ELSE COALESCE(x.nickname, 'Ẩn danh')
      END,
      'is_me', x.profile_id = v_me,
      'score', x.score,
      'correct_count', x.correct_count,
      'total_questions', x.total_questions,
      'total_time_ms', x.total_time_ms,
      'completed_at', x.completed_at
    ) ORDER BY x.score DESC, x.total_time_ms ASC, x.completed_at ASC)
    FROM (
      SELECT a.profile_id, p.full_name, a.score, a.correct_count,
             a.total_questions, a.total_time_ms, a.completed_at,
             (SELECT lp.nickname FROM public.quiz_live_participants lp
               JOIN public.quiz_live_sessions ls ON ls.id = lp.session_id
              WHERE ls.quiz_id = _quiz_id AND ls.anonymous AND lp.profile_id = a.profile_id
              ORDER BY lp.joined_at DESC LIMIT 1) AS nickname
      FROM public.quiz_attempts a
      JOIN public.profiles p ON p.id = a.profile_id
      WHERE a.quiz_id = _quiz_id AND a.status = 'completed'
    ) x
  ), '[]'::jsonb);
END; $$;

-- ============================================================================
-- Grants
-- ============================================================================
REVOKE ALL ON FUNCTION public.quiz_live_open(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_live_join(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_live_set_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_live_start_my_attempt(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_live_get_state(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.quiz_live_open(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_live_join(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_live_set_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_live_start_my_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_live_get_state(uuid) TO authenticated;

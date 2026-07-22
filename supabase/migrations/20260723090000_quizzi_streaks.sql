-- ============================================================================
-- BHY QUIZZI — Chuỗi tuần (streak) cá nhân + phòng, "đóng băng chuỗi" không phạt
-- Chuỗi tính toán khi đọc (computed-on-read — quy mô chi nhánh nhỏ);
-- chỉ freeze là trạng thái được lưu (kho vật phẩm).
-- Một tuần của cá nhân tính là "có hoạt động" khi:
--   (a) hoàn thành ≥1 lượt quiz trong tuần đó, HOẶC
--   (b) soạn ≥1 quiz phát hành tuần đó (tác giả bị chặn làm quiz của mình), HOẶC
--   (c) tuần được phủ bởi 1 lượt đóng băng.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quiz_streak_freezes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  earned_reason text NOT NULL DEFAULT 'streak_milestone',
  used_week_start date,               -- NULL = chưa dùng
  UNIQUE (profile_id, used_week_start),
  UNIQUE (profile_id, earned_reason)  -- idempotent: 1 freeze / mốc chuỗi
);

CREATE INDEX IF NOT EXISTS idx_quiz_streak_freezes_profile ON public.quiz_streak_freezes(profile_id);

ALTER TABLE public.quiz_streak_freezes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quiz_streak_freezes FROM anon;

CREATE POLICY "View own streak freezes" ON public.quiz_streak_freezes
  FOR SELECT TO authenticated
  USING (
    profile_id = public.get_my_profile_id()
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );
-- Không có policy ghi cho người dùng — cấp/dùng freeze qua SECURITY DEFINER.

-- ============================================================================
-- Tuần "có hoạt động" của một cán bộ
-- ============================================================================
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
    SELECT 1 FROM public.quiz_streak_freezes f
    WHERE f.profile_id = _profile AND f.used_week_start = _week
  )
$$;

-- Chuỗi hiện tại của một cán bộ (nội bộ — dùng cho cả RPC đọc lẫn chấm badge)
CREATE OR REPLACE FUNCTION public.quiz_current_streak(_profile uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_week date := public.quiz_week_start(now());
  v_streak integer := 0;
BEGIN
  -- Tuần hiện tại chưa làm thì chuỗi chưa gãy — đếm từ tuần trước
  IF NOT public.quiz_profile_week_active(_profile, v_week) THEN
    v_week := v_week - 7;
  END IF;
  WHILE public.quiz_profile_week_active(_profile, v_week) LOOP
    v_streak := v_streak + 1;
    v_week := v_week - 7;
  END LOOP;
  RETURN v_streak;
END; $$;

-- ============================================================================
-- Chuỗi của tôi
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_get_my_streak()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_current integer;
  v_longest integer;
  v_freezes integer;
  v_this_week boolean;
BEGIN
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('current_streak',0,'longest_streak',0,'freezes_available',0,'this_week_done',false);
  END IF;

  v_current := public.quiz_current_streak(v_me);
  v_this_week := public.quiz_profile_week_active(v_me, public.quiz_week_start(now()));
  SELECT count(*)::integer INTO v_freezes
    FROM public.quiz_streak_freezes WHERE profile_id = v_me AND used_week_start IS NULL;

  -- Chuỗi dài nhất: gom "đảo" các tuần hoạt động liên tiếp (bước 7 ngày)
  SELECT COALESCE(max(len), 0)::integer INTO v_longest
  FROM (
    SELECT count(*)::integer AS len
    FROM (
      SELECT wk, wk - (row_number() OVER (ORDER BY wk))::integer * 7 AS grp
      FROM (
        SELECT DISTINCT public.quiz_week_start(a.completed_at) AS wk
          FROM public.quiz_attempts a
         WHERE a.profile_id = v_me AND a.status = 'completed'
        UNION
        SELECT DISTINCT q.week_start FROM public.quizzes q
         WHERE q.created_by = v_me AND q.status = 'published'
        UNION
        SELECT f.used_week_start FROM public.quiz_streak_freezes f
         WHERE f.profile_id = v_me AND f.used_week_start IS NOT NULL
      ) weeks
    ) marked
    GROUP BY grp
  ) islands;

  RETURN jsonb_build_object(
    'current_streak', v_current,
    'longest_streak', GREATEST(v_longest, v_current),
    'freezes_available', v_freezes,
    'this_week_done', v_this_week
  );
END; $$;

-- ============================================================================
-- Chuỗi tuần của các phòng (tuần liên tiếp phát hành ≥1 quiz)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_get_department_streaks()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_dept record;
  v_week date;
  v_streak integer;
  v_this_week boolean;
BEGIN
  FOR v_dept IN
    SELECT d.id, d.code, d.name FROM public.departments d
    WHERE d.is_active IS DISTINCT FROM false
    ORDER BY d.name
  LOOP
    v_week := public.quiz_week_start(now());
    v_this_week := EXISTS (SELECT 1 FROM public.quizzes q
      WHERE q.department_id = v_dept.id AND q.status = 'published' AND q.week_start = v_week);
    IF NOT v_this_week THEN v_week := v_week - 7; END IF;
    v_streak := 0;
    WHILE EXISTS (SELECT 1 FROM public.quizzes q
      WHERE q.department_id = v_dept.id AND q.status = 'published' AND q.week_start = v_week)
    LOOP
      v_streak := v_streak + 1;
      v_week := v_week - 7;
    END LOOP;
    v_result := v_result || jsonb_build_object(
      'department_id', v_dept.id,
      'code', v_dept.code,
      'name', v_dept.name,
      'streak', v_streak,
      'this_week_published', v_this_week
    );
  END LOOP;
  RETURN v_result;
END; $$;

-- ============================================================================
-- Tổng quan toàn chi nhánh — CHỈ số liệu tổng hợp cấp phòng
-- (đúng nguyên tắc gamification: không xếp hạng cá nhân liên phòng)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_get_branch_overview(_week_start date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_week date := COALESCE(_week_start, public.quiz_week_start(now()));
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'department_id', d.id,
      'code', d.code,
      'name', d.name,
      'quizzes_published', s.quiz_count,
      'members', s.member_count,
      'participants', s.participant_count,
      'participation_pct', CASE WHEN s.member_count > 0
        THEN round(100.0 * s.participant_count / s.member_count)::integer ELSE 0 END,
      'avg_score', COALESCE(s.avg_score, 0)
    ) ORDER BY d.name)
    FROM public.departments d
    CROSS JOIN LATERAL (
      SELECT
        (SELECT count(*)::integer FROM public.quizzes q
          WHERE q.department_id = d.id AND q.status = 'published' AND q.week_start = v_week) AS quiz_count,
        (SELECT count(*)::integer FROM public.profiles p
          WHERE p.department_id = d.id AND p.status = 'active') AS member_count,
        (SELECT count(DISTINCT a.profile_id)::integer
          FROM public.quiz_attempts a
          JOIN public.quizzes q ON q.id = a.quiz_id
          WHERE q.department_id = d.id AND a.status = 'completed'
            AND public.quiz_week_start(a.completed_at) = v_week) AS participant_count,
        (SELECT round(avg(a.score))::integer
          FROM public.quiz_attempts a
          JOIN public.quizzes q ON q.id = a.quiz_id
          WHERE q.department_id = d.id AND a.status = 'completed'
            AND public.quiz_week_start(a.completed_at) = v_week) AS avg_score
    ) s
    WHERE d.is_active IS DISTINCT FROM false
  ), '[]'::jsonb);
END; $$;

-- ============================================================================
-- Đóng băng chuỗi tự động (cron thứ Hai): ai có freeze chưa dùng, tuần trước
-- lỡ nhịp nhưng tuần trước nữa vẫn còn chuỗi → tự áp 1 freeze vào tuần lỡ.
-- Mô hình "cuối kỳ" của Duolingo — người dùng không phải bấm gì, không bị phạt.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_apply_streak_freezes()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_last_week date := public.quiz_week_start(now()) - 7;
  v_applied integer := 0;
  v_row record;
BEGIN
  FOR v_row IN
    SELECT DISTINCT f.profile_id
    FROM public.quiz_streak_freezes f
    WHERE f.used_week_start IS NULL
  LOOP
    IF NOT public.quiz_profile_week_active(v_row.profile_id, v_last_week)
       AND public.quiz_profile_week_active(v_row.profile_id, v_last_week - 7) THEN
      UPDATE public.quiz_streak_freezes
         SET used_week_start = v_last_week
       WHERE id = (
         SELECT id FROM public.quiz_streak_freezes
         WHERE profile_id = v_row.profile_id AND used_week_start IS NULL
         ORDER BY earned_at LIMIT 1
       );
      v_applied := v_applied + 1;
    END IF;
  END LOOP;
  RETURN v_applied;
END; $$;

-- ============================================================================
-- quiz_process_completion — bản P3: thêm huy hiệu chuỗi + cấp freeze theo mốc
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_process_completion(_attempt_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_a record;
  v_quiz record;
  v_budget_total_ms integer;
  v_completed integer;
  v_streak integer;
  v_unused_freezes integer;
BEGIN
  SELECT * INTO v_a FROM public.quiz_attempts WHERE id = _attempt_id AND status = 'completed';
  IF v_a.id IS NULL THEN RETURN; END IF;
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_a.quiz_id;

  PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_FIRST', v_a.quiz_id);

  IF v_a.total_questions >= 5 THEN
    IF v_a.correct_count * 100 >= v_a.total_questions * 90 THEN
      PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_SHARP', v_a.quiz_id);
    END IF;
    IF v_a.correct_count = v_a.total_questions THEN
      PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_PERFECT', v_a.quiz_id);
    END IF;
    v_budget_total_ms := v_quiz.per_question_seconds * 1000 * v_a.total_questions;
    IF v_a.correct_count * 100 >= v_a.total_questions * 90
       AND v_a.total_time_ms * 2 <= v_budget_total_ms THEN
      PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_FLASH', v_a.quiz_id);
    END IF;
  END IF;

  SELECT count(*)::integer INTO v_completed
  FROM public.quiz_attempts WHERE profile_id = v_a.profile_id AND status = 'completed';
  IF v_completed >= 10 THEN PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_PART_10', v_a.quiz_id); END IF;
  IF v_completed >= 25 THEN PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_PART_25', v_a.quiz_id); END IF;
  IF v_completed >= 50 THEN PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_PART_50', v_a.quiz_id); END IF;

  -- Chuỗi tuần: badge mốc + cấp freeze mỗi mốc 4 tuần (giữ tối đa 2 freeze)
  v_streak := public.quiz_current_streak(v_a.profile_id);
  IF v_streak >= 4  THEN PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_STREAK_4',  v_a.quiz_id); END IF;
  IF v_streak >= 12 THEN PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_STREAK_12', v_a.quiz_id); END IF;
  IF v_streak >= 26 THEN PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_STREAK_26', v_a.quiz_id); END IF;

  IF v_streak >= 4 AND v_streak % 4 = 0 THEN
    SELECT count(*)::integer INTO v_unused_freezes
      FROM public.quiz_streak_freezes
     WHERE profile_id = v_a.profile_id AND used_week_start IS NULL;
    IF v_unused_freezes < 2 THEN
      INSERT INTO public.quiz_streak_freezes (profile_id, earned_reason)
      VALUES (v_a.profile_id, 'streak_milestone:' || v_streak || ':' || public.quiz_week_start(now()))
      ON CONFLICT (profile_id, earned_reason) DO NOTHING;
    END IF;
  END IF;
END; $$;

-- Thu hồi cả PUBLIC (mặc định Postgres cấp EXECUTE cho PUBLIC trên function mới)
REVOKE ALL ON FUNCTION public.quiz_profile_week_active(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quiz_current_streak(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quiz_get_my_streak() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_get_department_streaks() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_get_branch_overview(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quiz_apply_streak_freezes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_apply_streak_freezes() TO service_role;

GRANT EXECUTE ON FUNCTION public.quiz_get_my_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_get_department_streaks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_get_branch_overview(date) TO authenticated;

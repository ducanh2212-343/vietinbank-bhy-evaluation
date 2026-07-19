-- ============================================================================
-- BHY QUIZZI — Huy hiệu phụ (supplementary badges)
-- Khác với huy hiệu level skill (skill_level_achievements): huy hiệu Quizzi ghi
-- nhận hành vi học tập (chính xác cao, nhanh, bền bỉ, chuỗi tuần, soạn quiz).
-- Server tự cấp qua quiz_process_completion — người dùng KHÔNG tự phong.
-- Không quy đổi ra tiền/điểm thi đua.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quiz_badge_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  -- Tham chiếu hiển thị; logic chấm thật nằm trong quiz_process_completion
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_badge_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.quiz_badge_catalog(id) ON DELETE CASCADE,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE SET NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  celebrated_at timestamptz,        -- NULL = chưa xem modal chúc mừng
  UNIQUE (profile_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_badge_awards_profile ON public.quiz_badge_awards(profile_id);

ALTER TABLE public.quiz_badge_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_badge_awards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quiz_badge_catalog, public.quiz_badge_awards FROM anon;

CREATE POLICY "Authenticated read badge catalog" ON public.quiz_badge_catalog
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage badge catalog" ON public.quiz_badge_catalog
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role));

CREATE POLICY "View own quiz badges" ON public.quiz_badge_awards
  FOR SELECT TO authenticated
  USING (
    profile_id = public.get_my_profile_id()
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

-- Chỉ được đánh dấu "đã xem chúc mừng" trên huy hiệu của mình
CREATE POLICY "Celebrate own quiz badges" ON public.quiz_badge_awards
  FOR UPDATE TO authenticated
  USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());

-- INSERT chỉ qua SECURITY DEFINER — không có policy INSERT cho người dùng.

-- ============================================================================
-- Seed 12 huy hiệu (idempotent)
-- ============================================================================
INSERT INTO public.quiz_badge_catalog (code, name, description, criteria, sort_order) VALUES
  ('QZ_FIRST',     'Phát pháo đầu tiên',   'Hoàn thành quiz đầu tiên của bạn',                                          '{"type":"first_completion"}', 1),
  ('QZ_SHARP',     'Thiện xạ',             'Đạt từ 90% câu đúng trong một quiz có ít nhất 5 câu',                       '{"type":"accuracy","min_pct":90,"min_questions":5}', 2),
  ('QZ_PERFECT',   'Không tì vết',         'Trả lời đúng 100% một quiz có ít nhất 5 câu',                               '{"type":"accuracy","min_pct":100,"min_questions":5}', 3),
  ('QZ_FLASH',     'Tia chớp',             'Đạt từ 90% câu đúng và hoàn thành trong nửa thời gian cho phép',            '{"type":"speed","min_pct":90,"max_time_ratio":0.5}', 4),
  ('QZ_PART_10',   'Bền bỉ Đồng',          'Hoàn thành 10 quiz',                                                        '{"type":"participation","count":10}', 5),
  ('QZ_PART_25',   'Bền bỉ Bạc',           'Hoàn thành 25 quiz',                                                        '{"type":"participation","count":25}', 6),
  ('QZ_PART_50',   'Bền bỉ Vàng',          'Hoàn thành 50 quiz',                                                        '{"type":"participation","count":50}', 7),
  ('QZ_STREAK_4',  'Ngọn lửa 4 tuần',      'Giữ chuỗi học tập 4 tuần liên tiếp',                                        '{"type":"streak","weeks":4}', 8),
  ('QZ_STREAK_12', 'Ngọn lửa 12 tuần',     'Giữ chuỗi học tập 12 tuần liên tiếp',                                       '{"type":"streak","weeks":12}', 9),
  ('QZ_STREAK_26', 'Nửa năm rực cháy',     'Giữ chuỗi học tập 26 tuần liên tiếp',                                       '{"type":"streak","weeks":26}', 10),
  ('QZ_AUTHOR_1',  'Người gieo hạt',       'Soạn quiz đầu tiên cho phòng',                                              '{"type":"author","count":1}', 11),
  ('QZ_AUTHOR_10', 'Người ươm vườn',       'Soạn 10 quiz cho phòng',                                                    '{"type":"author","count":10}', 12)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- Cấp huy hiệu idempotent
-- ============================================================================
CREATE OR REPLACE FUNCTION public.quiz_award_badge(_profile uuid, _code text, _quiz uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.quiz_badge_awards (profile_id, badge_id, quiz_id)
  SELECT _profile, c.id, _quiz
  FROM public.quiz_badge_catalog c
  WHERE c.code = _code AND c.is_active
  ON CONFLICT (profile_id, badge_id) DO NOTHING;
END; $$;

-- ============================================================================
-- quiz_process_completion — bản P2: chấm huy hiệu chính xác / tốc độ / bền bỉ
-- (P3 thay tiếp để cộng huy hiệu chuỗi tuần + cấp freeze)
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
BEGIN
  SELECT * INTO v_a FROM public.quiz_attempts WHERE id = _attempt_id AND status = 'completed';
  IF v_a.id IS NULL THEN RETURN; END IF;
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_a.quiz_id;

  -- Hoàn thành lần đầu
  PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_FIRST', v_a.quiz_id);

  -- Chính xác cao (quiz đủ dày ≥5 câu để tránh farm quiz 2 câu)
  IF v_a.total_questions >= 5 THEN
    IF v_a.correct_count * 100 >= v_a.total_questions * 90 THEN
      PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_SHARP', v_a.quiz_id);
    END IF;
    IF v_a.correct_count = v_a.total_questions THEN
      PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_PERFECT', v_a.quiz_id);
    END IF;
    -- Nhanh + chính xác: ≥90% đúng và tổng thời gian ≤ 50% tổng budget
    v_budget_total_ms := v_quiz.per_question_seconds * 1000 * v_a.total_questions;
    IF v_a.correct_count * 100 >= v_a.total_questions * 90
       AND v_a.total_time_ms * 2 <= v_budget_total_ms THEN
      PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_FLASH', v_a.quiz_id);
    END IF;
  END IF;

  -- Bền bỉ
  SELECT count(*)::integer INTO v_completed
  FROM public.quiz_attempts WHERE profile_id = v_a.profile_id AND status = 'completed';
  IF v_completed >= 10 THEN PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_PART_10', v_a.quiz_id); END IF;
  IF v_completed >= 25 THEN PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_PART_25', v_a.quiz_id); END IF;
  IF v_completed >= 50 THEN PERFORM public.quiz_award_badge(v_a.profile_id, 'QZ_PART_50', v_a.quiz_id); END IF;
END; $$;

-- Huy hiệu soạn quiz — chấm ngay khi phát hành quiz
CREATE OR REPLACE FUNCTION public.quiz_process_authoring()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)::integer INTO v_count
  FROM public.quizzes WHERE created_by = NEW.created_by;
  IF v_count >= 1 THEN PERFORM public.quiz_award_badge(NEW.created_by, 'QZ_AUTHOR_1', NEW.id); END IF;
  IF v_count >= 10 THEN PERFORM public.quiz_award_badge(NEW.created_by, 'QZ_AUTHOR_10', NEW.id); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER quiz_process_authoring
  AFTER INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.quiz_process_authoring();

-- Bản thật của "huy hiệu mới cho màn kết thúc": huy hiệu chưa xem của tôi
CREATE OR REPLACE FUNCTION public.quiz_badge_awards_pending_view()
RETURNS TABLE (code text, name text, description text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.code, c.name, c.description
  FROM public.quiz_badge_awards a
  JOIN public.quiz_badge_catalog c ON c.id = a.badge_id
  WHERE a.profile_id = public.get_my_profile_id()
    AND a.celebrated_at IS NULL
  ORDER BY c.sort_order
$$;

-- Chống tự phong huy hiệu: thu hồi cả PUBLIC (mặc định Postgres cấp EXECUTE cho PUBLIC)
REVOKE ALL ON FUNCTION public.quiz_award_badge(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quiz_badge_awards_pending_view() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quiz_badge_awards_pending_view() TO authenticated;

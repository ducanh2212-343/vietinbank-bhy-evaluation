-- ============================================================================
-- BẮC HƯNG YÊN QUIZZI — nền tảng học tập bằng quiz theo tuần của từng phòng
-- Mỗi phòng mỗi tuần triển khai ≥1 quiz (theo công văn / chủ điểm / skill).
-- Bất kỳ thành viên phòng nào cũng tạo được quiz — phát hành ngay, không duyệt.
-- Điểm/huy hiệu Quizzi KHÔNG quy đổi ra tiền hay điểm thi đua (xem
-- docs/nghien-cuu-bhy-quizzi.md và docs/nghien-cuu-gamification-muc-anh-skill.md).
-- ============================================================================

-- Tuần Quizzi: ISO week, thứ Hai bắt đầu, tính theo giờ Việt Nam.
-- STABLE (không IMMUTABLE) vì đổi múi giờ — do đó week_start KHÔNG thể là
-- generated column; nó được ép bằng trigger BEFORE INSERT bên dưới.
CREATE OR REPLACE FUNCTION public.quiz_week_start(_ts timestamptz DEFAULT now())
RETURNS date
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT date_trunc('week', _ts AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
$$;

-- Trưởng phòng của một phòng? SECURITY DEFINER để policy không tự truy vấn
-- departments (tránh đệ quy RLS — cùng lý do tồn tại get_my_department_id).
CREATE OR REPLACE FUNCTION public.is_dept_manager(_dept uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.departments d
    WHERE d.id = _dept AND d.manager_id = public.get_my_profile_id()
  )
$$;

-- ============================================================================
-- 1) Quiz của phòng
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  -- Nguồn tự do: số công văn / chủ điểm ("CV 1234/TGĐ-NHCT9 v/v ...", "Chủ điểm KYC")
  source_ref text,
  skill_id uuid REFERENCES public.skill_catalog(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','unpublished')),
  week_start date NOT NULL,
  per_question_seconds integer NOT NULL DEFAULT 30 CHECK (per_question_seconds BETWEEN 10 AND 120),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_dept_week ON public.quizzes(department_id, week_start);

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ép week_start + created_by từ server — client không tự chọn tuần/tác giả.
-- Ngữ cảnh service_role/migration (auth.uid() NULL) giữ nguyên giá trị được chèn.
CREATE OR REPLACE FUNCTION public.quiz_set_insert_defaults()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.week_start := public.quiz_week_start(now());
    NEW.created_by := public.get_my_profile_id();
  ELSE
    NEW.week_start := COALESCE(NEW.week_start, public.quiz_week_start(now()));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER quiz_set_insert_defaults
  BEFORE INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.quiz_set_insert_defaults();

-- ============================================================================
-- 2) Câu hỏi trắc nghiệm
-- ⚠️ BẢO MẬT ĐÁP ÁN: người LÀM BÀI không bao giờ được SELECT bảng này —
-- câu hỏi được phát qua RPC quiz_start_attempt / quiz_answer_question (không kèm
-- correct_index). TUYỆT ĐỐI không thêm policy SELECT cho thành viên phòng.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  statement text NOT NULL,
  options jsonb NOT NULL,
  correct_index integer NOT NULL CHECK (correct_index >= 0),
  explanation text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    jsonb_typeof(options) = 'array'
    AND jsonb_array_length(options) BETWEEN 2 AND 6
    AND correct_index < jsonb_array_length(options)
  )
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, sort_order);

-- Quiz đã có người làm thì câu hỏi bất biến — sửa đáp án sau khi có lượt làm
-- sẽ phá tính công bằng của bảng xếp hạng.
CREATE OR REPLACE FUNCTION public.guard_quiz_questions_frozen()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_quiz uuid := COALESCE(NEW.quiz_id, OLD.quiz_id);
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD); -- service_role/migration: cho qua
  END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.quiz_id = v_quiz) THEN
    RAISE EXCEPTION 'Quiz đã có người làm — không sửa được câu hỏi. Hãy gỡ xuất bản và tạo quiz mới.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER guard_quiz_questions_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON public.quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.guard_quiz_questions_frozen();

-- ============================================================================
-- 3) Lượt làm bài — 1 lượt chính thức / người / quiz
-- Mọi ghi chép đi qua RPC SECURITY DEFINER (không có policy INSERT/UPDATE):
-- server phát câu hỏi theo thứ tự, đo giờ bằng đồng hồ server, tự chấm điểm.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','expired')),
  current_question_id uuid REFERENCES public.quiz_questions(id) ON DELETE SET NULL,
  current_question_served_at timestamptz,
  correct_count integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  total_time_ms integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (quiz_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_profile ON public.quiz_attempts(profile_id, started_at);

CREATE TABLE IF NOT EXISTS public.quiz_attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_index integer,             -- NULL = hết giờ / bỏ qua
  is_correct boolean NOT NULL DEFAULT false,
  elapsed_ms integer NOT NULL,
  points integer NOT NULL DEFAULT 0,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_attempt ON public.quiz_attempt_answers(attempt_id);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempt_answers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.quizzes, public.quiz_questions,
             public.quiz_attempts, public.quiz_attempt_answers FROM anon;

-- quizzes: thành viên phòng xem quiz phòng mình; trưởng phòng + admin xem/quản lý
CREATE POLICY "Dept members view own dept quizzes" ON public.quizzes
  FOR SELECT TO authenticated
  USING (
    department_id = public.get_my_department_id()
    OR public.is_dept_manager(department_id)
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

-- Bất kỳ thành viên phòng nào cũng tạo được quiz cho phòng mình (phát hành ngay)
CREATE POLICY "Dept members create quizzes for own dept" ON public.quizzes
  FOR INSERT TO authenticated
  WITH CHECK (department_id = public.get_my_department_id());

CREATE POLICY "Author or dept manager update quizzes" ON public.quizzes
  FOR UPDATE TO authenticated
  USING (
    created_by = public.get_my_profile_id()
    OR public.is_dept_manager(department_id)
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

CREATE POLICY "Author or dept manager delete quizzes" ON public.quizzes
  FOR DELETE TO authenticated
  USING (
    created_by = public.get_my_profile_id()
    OR public.is_dept_manager(department_id)
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

-- quiz_questions: CHỈ tác giả + trưởng phòng + admin (giấu đáp án với người làm bài)
CREATE POLICY "Quiz author and managers read questions" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (
    quiz_id IN (
      SELECT q.id FROM public.quizzes q
      WHERE q.created_by = public.get_my_profile_id()
         OR public.is_dept_manager(q.department_id)
    )
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

CREATE POLICY "Quiz author and managers write questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (
    quiz_id IN (
      SELECT q.id FROM public.quizzes q
      WHERE q.created_by = public.get_my_profile_id()
         OR public.is_dept_manager(q.department_id)
    )
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  )
  WITH CHECK (
    quiz_id IN (
      SELECT q.id FROM public.quizzes q
      WHERE q.created_by = public.get_my_profile_id()
         OR public.is_dept_manager(q.department_id)
    )
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

-- quiz_attempts: xem của mình + trưởng phòng + admin. KHÔNG có policy ghi —
-- mọi ghi qua RPC SECURITY DEFINER (chống tự chấm điểm).
CREATE POLICY "View own or managed attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (
    profile_id = public.get_my_profile_id()
    OR quiz_id IN (SELECT q.id FROM public.quizzes q WHERE public.is_dept_manager(q.department_id))
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

CREATE POLICY "View own attempt answers" ON public.quiz_attempt_answers
  FOR SELECT TO authenticated
  USING (
    attempt_id IN (
      SELECT a.id FROM public.quiz_attempts a
      WHERE a.profile_id = public.get_my_profile_id()
    )
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

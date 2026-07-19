-- ============================================================================
-- BHY QUIZZI — CHIẾN DỊCH QUIZ TOÀN CHI NHÁNH
-- Khác quiz phòng (nội bộ, phát hành ngay), chiến dịch:
--   • Toàn chi nhánh cùng làm.
--   • Chỉ các phòng nghiệp vụ tại trụ sở khởi tạo (DVKH, KHDN, Bán lẻ,
--     Hỗ trợ tín dụng, TCTH — danh mục cấu hình quiz_campaign_initiator_depts).
--   • BẮT BUỘC Ban Giám đốc phê duyệt trước khi chạy (draft → pending →
--     approved/rejected → closed).
--   • Chống làm bài hộ: mỗi người một bộ câu hỏi ngẫu nhiên từ ngân hàng câu
--     hỏi (question_pool_size — tùy chọn) + đảo thứ tự câu và thứ tự ĐÁP ÁN
--     theo từng người (shuffle_options).
--   • Tổng hợp kết quả kiểu Wooclap/Mentimeter: thống kê từng câu (tỷ lệ sai,
--     phân bố phương án) — RPC quiz_campaign_get_results.
--   • Tùy chọn ẨN DANH (anonymous_results) do người khởi tạo chọn: không ai
--     (kể cả người khởi tạo) thấy tên người làm — chỉ số liệu tổng hợp.
-- ============================================================================

-- Danh mục phòng được khởi tạo chiến dịch (admin quản lý)
CREATE TABLE IF NOT EXISTS public.quiz_campaign_initiator_depts (
  department_id uuid PRIMARY KEY REFERENCES public.departments(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed theo tên phòng hiện có (idempotent — phòng đổi tên thì admin bổ sung tay)
INSERT INTO public.quiz_campaign_initiator_depts (department_id, note)
SELECT d.id, 'Seed 07/2026 — phòng nghiệp vụ trụ sở chi nhánh'
FROM public.departments d
WHERE d.is_active IS DISTINCT FROM false
  AND (
    d.name ILIKE '%dịch vụ khách hàng%'
    OR d.name ILIKE '%khách hàng doanh nghiệp%'
    OR d.name ILIKE '%KHDN%'
    OR d.name ILIKE '%bán lẻ%'
    OR d.name ILIKE '%hỗ trợ tín dụng%'
    OR d.name ILIKE '%tổ chức%'
  )
ON CONFLICT (department_id) DO NOTHING;

-- ============================================================================
-- Chiến dịch
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE, -- phòng khởi tạo
  title text NOT NULL,
  description text,
  source_ref text,                       -- công văn / chủ điểm (text tự do)
  skill_id uuid REFERENCES public.skill_catalog(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','approved','rejected','closed')),
  -- Chống làm bài hộ
  question_pool_size integer CHECK (question_pool_size IS NULL OR question_pool_size >= 3),
    -- NULL = mọi người làm toàn bộ câu hỏi (vẫn đảo thứ tự câu);
    -- có giá trị = mỗi người bốc ngẫu nhiên N câu từ ngân hàng câu hỏi
  shuffle_options boolean NOT NULL DEFAULT true,   -- đảo thứ tự đáp án theo từng người
  anonymous_results boolean NOT NULL DEFAULT false, -- ẩn danh người làm trong mọi kết quả
  per_question_seconds integer NOT NULL DEFAULT 30 CHECK (per_question_seconds BETWEEN 10 AND 120),
  start_date date,                       -- NULL = mở ngay khi được duyệt
  end_date date,                         -- NULL = mở tới khi đóng tay
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submitted_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_quiz_campaigns_status ON public.quiz_campaigns(status);

CREATE TRIGGER update_quiz_campaigns_updated_at
  BEFORE UPDATE ON public.quiz_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ép trường an toàn khi tạo: người tạo = mình, phòng = phòng mình, luôn là nháp
CREATE OR REPLACE FUNCTION public.quiz_campaign_set_insert_defaults()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := public.get_my_profile_id();
    NEW.department_id := public.get_my_department_id();
    NEW.status := 'draft';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.submitted_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER quiz_campaign_set_insert_defaults
  BEFORE INSERT ON public.quiz_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.quiz_campaign_set_insert_defaults();

-- Quy tắc chuyển trạng thái:
--   • BGĐ (bgd) + system_admin: toàn quyền; duyệt thì hệ thống tự đóng dấu
--     approved_by/approved_at; từ chối phải có lý do.
--   • Người khởi tạo / trưởng phòng khởi tạo: draft→pending (gửi duyệt),
--     pending→draft (rút về), approved→closed (đóng sớm). KHÔNG tự duyệt.
--   • Sau khi rời draft, cấu hình cốt lõi (pool/shuffle/ẩn danh/giờ) khoá với
--     người thường — tránh đổi luật chơi sau khi đã gửi duyệt.
CREATE OR REPLACE FUNCTION public.guard_quiz_campaign_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_approver boolean;
BEGIN
  v_is_approver := auth.uid() IS NULL
    OR public.has_role(auth.uid(),'bgd'::app_role)
    OR public.has_role(auth.uid(),'system_admin'::app_role);

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NOT v_is_approver THEN
      RAISE EXCEPTION 'Chỉ Ban Giám đốc phê duyệt được chiến dịch quiz';
    END IF;
    NEW.approved_by := COALESCE(public.get_my_profile_id(), NEW.approved_by);
    NEW.approved_at := now();
  END IF;

  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    IF NOT v_is_approver THEN
      RAISE EXCEPTION 'Chỉ Ban Giám đốc từ chối được chiến dịch quiz';
    END IF;
    IF COALESCE(btrim(NEW.rejected_reason), '') = '' THEN
      RAISE EXCEPTION 'Từ chối chiến dịch cần ghi rõ lý do';
    END IF;
  END IF;

  IF NOT v_is_approver THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (
         (OLD.status = 'draft'    AND NEW.status = 'pending') OR
         (OLD.status = 'pending'  AND NEW.status = 'draft') OR
         (OLD.status = 'approved' AND NEW.status = 'closed')
       ) THEN
      RAISE EXCEPTION 'Chuyển trạng thái không hợp lệ — chiến dịch phải được Ban Giám đốc phê duyệt';
    END IF;
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.department_id IS DISTINCT FROM OLD.department_id THEN
      RAISE EXCEPTION 'Không được sửa thông tin phê duyệt/khởi tạo';
    END IF;
    IF OLD.status NOT IN ('draft')
       AND (NEW.question_pool_size IS DISTINCT FROM OLD.question_pool_size
         OR NEW.shuffle_options IS DISTINCT FROM OLD.shuffle_options
         OR NEW.anonymous_results IS DISTINCT FROM OLD.anonymous_results
         OR NEW.per_question_seconds IS DISTINCT FROM OLD.per_question_seconds) THEN
      RAISE EXCEPTION 'Cấu hình chiến dịch đã khoá sau khi gửi duyệt — rút về nháp để sửa';
    END IF;
  END IF;

  IF NEW.status = 'pending' AND OLD.status = 'draft' THEN
    NEW.submitted_at := now();
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER guard_quiz_campaign_update
  BEFORE UPDATE ON public.quiz_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.guard_quiz_campaign_update();

-- Người thường chỉ xoá được nháp/bị từ chối chưa ai làm
CREATE OR REPLACE FUNCTION public.guard_quiz_campaign_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(),'bgd'::app_role)
     OR public.has_role(auth.uid(),'system_admin'::app_role) THEN
    RETURN OLD;
  END IF;
  IF OLD.status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION 'Chỉ xoá được chiến dịch ở trạng thái nháp hoặc bị từ chối';
  END IF;
  RETURN OLD;
END; $$;

CREATE TRIGGER guard_quiz_campaign_delete
  BEFORE DELETE ON public.quiz_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.guard_quiz_campaign_delete();

-- ============================================================================
-- Ngân hàng câu hỏi chiến dịch
-- ⚠️ BẢO MẬT ĐÁP ÁN: người làm bài KHÔNG SELECT được bảng này — câu hỏi phát
-- qua RPC (không kèm correct_index). Không thêm policy SELECT rộng hơn.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_campaign_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.quiz_campaigns(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_quiz_campaign_questions_campaign
  ON public.quiz_campaign_questions(campaign_id, sort_order);

-- Câu hỏi khoá khi chiến dịch đã duyệt/đóng hoặc đã có người làm
CREATE OR REPLACE FUNCTION public.guard_campaign_questions_frozen()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign uuid := COALESCE(NEW.campaign_id, OLD.campaign_id);
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  SELECT status INTO v_status FROM public.quiz_campaigns WHERE id = v_campaign;
  IF v_status NOT IN ('draft','pending')
     OR EXISTS (SELECT 1 FROM public.quiz_campaign_attempts a WHERE a.campaign_id = v_campaign) THEN
    RAISE EXCEPTION 'Chiến dịch đã duyệt hoặc đã có người làm — không sửa được câu hỏi';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

-- ============================================================================
-- Lượt làm chiến dịch — mỗi người một đề riêng
-- question_ids: thứ tự câu của RIÊNG người này (đã bốc ngẫu nhiên/đảo).
-- option_orders: {question_id: [chỉ số gốc theo thứ tự HIỂN THỊ]} — đảo đáp án.
-- Ghi chép chỉ qua RPC SECURITY DEFINER (không có policy ghi).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_campaign_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.quiz_campaigns(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','expired')),
  question_ids uuid[] NOT NULL,
  option_orders jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_pos integer NOT NULL DEFAULT 1,
  current_served_at timestamptz,
  correct_count integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  total_time_ms integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (campaign_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_campaign_attempts_profile
  ON public.quiz_campaign_attempts(profile_id, started_at);

CREATE TRIGGER guard_campaign_questions_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON public.quiz_campaign_questions
  FOR EACH ROW EXECUTE FUNCTION public.guard_campaign_questions_frozen();

CREATE TABLE IF NOT EXISTS public.quiz_campaign_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_campaign_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_campaign_questions(id) ON DELETE CASCADE,
  selected_index integer,              -- CHỈ SỐ GỐC của phương án (NULL = hết giờ)
  is_correct boolean NOT NULL DEFAULT false,
  elapsed_ms integer NOT NULL,
  points integer NOT NULL DEFAULT 0,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_campaign_answers_attempt
  ON public.quiz_campaign_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_campaign_answers_question
  ON public.quiz_campaign_answers(question_id);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.quiz_campaign_initiator_depts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_campaign_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_campaign_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_campaign_answers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.quiz_campaign_initiator_depts, public.quiz_campaigns,
             public.quiz_campaign_questions, public.quiz_campaign_attempts,
             public.quiz_campaign_answers FROM anon;

CREATE POLICY "Authenticated read initiator depts" ON public.quiz_campaign_initiator_depts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage initiator depts" ON public.quiz_campaign_initiator_depts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role));

-- Chiến dịch: đã duyệt/đóng thì cả chi nhánh thấy; nháp/chờ duyệt chỉ phòng
-- khởi tạo + BGĐ/admin thấy
CREATE POLICY "View campaigns" ON public.quiz_campaigns
  FOR SELECT TO authenticated
  USING (
    status IN ('approved','closed')
    OR created_by = public.get_my_profile_id()
    OR department_id = public.get_my_department_id()
    OR public.is_dept_manager(department_id)
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

-- Chỉ thành viên phòng trong danh mục khởi tạo mới tạo được
CREATE POLICY "Initiator dept members create campaigns" ON public.quiz_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    department_id = public.get_my_department_id()
    AND department_id IN (SELECT department_id FROM public.quiz_campaign_initiator_depts)
  );

CREATE POLICY "Creator or managers update campaigns" ON public.quiz_campaigns
  FOR UPDATE TO authenticated
  USING (
    created_by = public.get_my_profile_id()
    OR public.is_dept_manager(department_id)
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

CREATE POLICY "Creator or managers delete campaigns" ON public.quiz_campaigns
  FOR DELETE TO authenticated
  USING (
    created_by = public.get_my_profile_id()
    OR public.is_dept_manager(department_id)
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

-- Câu hỏi: CHỈ người khởi tạo + trưởng phòng khởi tạo + BGĐ/admin đọc/ghi
CREATE POLICY "Campaign organizers read questions" ON public.quiz_campaign_questions
  FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM public.quiz_campaigns c
      WHERE c.created_by = public.get_my_profile_id()
         OR public.is_dept_manager(c.department_id)
    )
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

CREATE POLICY "Campaign organizers write questions" ON public.quiz_campaign_questions
  FOR ALL TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM public.quiz_campaigns c
      WHERE c.created_by = public.get_my_profile_id()
         OR public.is_dept_manager(c.department_id)
    )
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  )
  WITH CHECK (
    campaign_id IN (
      SELECT c.id FROM public.quiz_campaigns c
      WHERE c.created_by = public.get_my_profile_id()
         OR public.is_dept_manager(c.department_id)
    )
    OR public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'bgd'::app_role)
  );

-- Lượt làm: chỉ xem của MÌNH (+ system_admin kỹ thuật). Người khởi tạo KHÔNG
-- SELECT trực tiếp — kết quả đi qua RPC để tôn trọng tùy chọn ẩn danh.
CREATE POLICY "View own campaign attempts" ON public.quiz_campaign_attempts
  FOR SELECT TO authenticated
  USING (
    profile_id = public.get_my_profile_id()
    OR public.has_role(auth.uid(),'system_admin'::app_role)
  );

CREATE POLICY "View own campaign answers" ON public.quiz_campaign_answers
  FOR SELECT TO authenticated
  USING (
    attempt_id IN (
      SELECT a.id FROM public.quiz_campaign_attempts a
      WHERE a.profile_id = public.get_my_profile_id()
    )
    OR public.has_role(auth.uid(),'system_admin'::app_role)
  );

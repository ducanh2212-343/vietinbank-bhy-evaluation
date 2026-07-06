-- =====================================================================
-- ĐÁNH GIÁ NĂNG LỰC THỰC THI ĐẦU MỐI CHI NHÁNH (Hội đồng đánh giá)
-- Căn cứ: Cơ chế đánh giá Hội đồng đối với công tác đầu mối +
--         Phụ lục 1C (danh mục nhiệm vụ đầu mối) + Mẫu phiếu đánh giá.
-- Mô hình:
--   council_rounds            : kỳ đánh giá (Quý II/III/IV 2026)
--   council_members           : thành viên Hội đồng (BGĐ, Trưởng/Phó phụ trách phòng, đầu mối KPI)
--   council_subjects          : cán bộ đầu mối được đánh giá theo kỳ (có thể chưa có tài khoản)
--   council_criteria          : bộ câu hỏi/tiêu chí định hướng theo kỳ (chỉnh sửa được)
--   council_evaluations       : phiếu đánh giá của từng thành viên cho từng đầu mối
--   council_evaluation_scores : điểm chấm 0-10 theo từng tiêu chí
-- Trọng số xử lý ở tầng ứng dụng (src/lib/council.ts):
--   Đầu mối cấp PGĐ : GĐCN 20% | PGĐ còn lại 15% | thành viên khác 65%
--   Đầu mối cấp TP  : GĐCN 20% | PGĐ phụ trách 10% | PGĐ còn lại 15% | thành viên khác 55%
-- =====================================================================

-- 1. Kỳ đánh giá của Hội đồng
CREATE TABLE public.council_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Thành viên Hội đồng đánh giá (nhóm quyết định trọng số phiếu)
CREATE TABLE public.council_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_group text NOT NULL DEFAULT 'thanh_vien'
    CHECK (member_group IN ('giam_doc', 'pho_giam_doc', 'thanh_vien')),
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Cán bộ đầu mối được đánh giá theo kỳ
-- profile_id có thể NULL: đầu mối chưa có tài khoản trên hệ thống vẫn được đánh giá.
CREATE TABLE public.council_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.council_rounds(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  position text,
  subject_level text NOT NULL DEFAULT 'truong_phong'
    CHECK (subject_level IN ('pgd', 'truong_phong')),
  supervisor_pgd_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- PGĐ phụ trách (trọng số 10% với đầu mối cấp TP)
  task_summary text,   -- nhiệm vụ trọng tâm đầu mối (Phụ lục 1C)
  measurement text,    -- phương thức đánh giá/đo lường/cam kết
  sort_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, full_name)
);
CREATE INDEX idx_council_subjects_round ON public.council_subjects (round_id, sort_order);

-- 4. Bộ câu hỏi/tiêu chí định hướng theo kỳ (admin chỉnh sửa được)
-- criterion_key ổn định để điểm đã chấm không mất khi sửa nội dung/đổi thứ tự.
CREATE TABLE public.council_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.council_rounds(id) ON DELETE CASCADE,
  criterion_key text NOT NULL,
  section text NOT NULL DEFAULT 'nang_luc' CHECK (section IN ('nang_luc', 'hieu_qua')),
  title text NOT NULL,
  description text,
  anchor_10 text,  -- chuẩn hành vi tham chiếu Mức 10đ
  anchor_8 text,
  anchor_6 text,
  anchor_3 text,
  anchor_0 text,
  sort_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, criterion_key)
);
CREATE INDEX idx_council_criteria_round ON public.council_criteria (round_id, sort_order);

-- 5. Phiếu đánh giá của thành viên Hội đồng
CREATE TABLE public.council_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.council_rounds(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.council_subjects(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  strengths text,    -- ưu điểm nổi bật
  weaknesses text,   -- mặt hạn chế, khuyết điểm
  suggestions text,  -- ý kiến đóng góp, đề xuất phát triển cán bộ
  evidence text,     -- minh chứng ghi nhận
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, evaluator_id)
);
CREATE INDEX idx_council_evaluations_round ON public.council_evaluations (round_id);
CREATE INDEX idx_council_evaluations_evaluator ON public.council_evaluations (evaluator_id);

-- 6. Điểm chấm theo từng tiêu chí (thang 0-10)
CREATE TABLE public.council_evaluation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.council_evaluations(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.council_criteria(id) ON DELETE CASCADE,
  score numeric(4,2) NOT NULL CHECK (score >= 0 AND score <= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, criterion_id)
);
CREATE INDEX idx_council_scores_evaluation ON public.council_evaluation_scores (evaluation_id);

-- updated_at triggers
CREATE TRIGGER update_council_rounds_updated_at BEFORE UPDATE ON public.council_rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_council_members_updated_at BEFORE UPDATE ON public.council_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_council_subjects_updated_at BEFORE UPDATE ON public.council_subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_council_criteria_updated_at BEFORE UPDATE ON public.council_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_council_evaluations_updated_at BEFORE UPDATE ON public.council_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_council_evaluation_scores_updated_at BEFORE UPDATE ON public.council_evaluation_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: người đăng nhập có phải thành viên Hội đồng đang hoạt động
CREATE OR REPLACE FUNCTION public.is_council_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.council_members cm
    WHERE cm.profile_id = public.get_my_profile_id() AND cm.is_active
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_council_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_council_member() TO authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE public.council_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_evaluation_scores ENABLE ROW LEVEL SECURITY;

-- Danh mục: mọi người đăng nhập đọc được; admin quản trị
CREATE POLICY "council_rounds_select" ON public.council_rounds
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "council_rounds_admin" ON public.council_rounds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role));

CREATE POLICY "council_members_select" ON public.council_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "council_members_admin" ON public.council_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role));

CREATE POLICY "council_subjects_select" ON public.council_subjects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "council_subjects_admin" ON public.council_subjects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role));

CREATE POLICY "council_criteria_select" ON public.council_criteria
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "council_criteria_admin" ON public.council_criteria
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role));

-- Phiếu đánh giá: thành viên chỉ thao tác trên phiếu của chính mình,
-- trong kỳ đang mở, và không tự đánh giá bản thân.
CREATE POLICY "council_evaluations_select_own" ON public.council_evaluations
  FOR SELECT TO authenticated
  USING (
    evaluator_id = public.get_my_profile_id()
    OR public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role)
  );

CREATE POLICY "council_evaluations_insert_own" ON public.council_evaluations
  FOR INSERT TO authenticated
  WITH CHECK (
    evaluator_id = public.get_my_profile_id()
    AND public.is_council_member()
    AND EXISTS (SELECT 1 FROM public.council_rounds r WHERE r.id = round_id AND r.status = 'open')
    AND EXISTS (
      SELECT 1 FROM public.council_subjects s
      WHERE s.id = subject_id AND s.round_id = council_evaluations.round_id AND s.is_active
        AND (s.profile_id IS NULL OR s.profile_id <> public.get_my_profile_id())
    )
  );

CREATE POLICY "council_evaluations_update_own" ON public.council_evaluations
  FOR UPDATE TO authenticated
  USING (
    evaluator_id = public.get_my_profile_id()
    AND EXISTS (SELECT 1 FROM public.council_rounds r WHERE r.id = round_id AND r.status = 'open')
  )
  WITH CHECK (evaluator_id = public.get_my_profile_id());

CREATE POLICY "council_evaluations_delete" ON public.council_evaluations
  FOR DELETE TO authenticated
  USING (
    (evaluator_id = public.get_my_profile_id() AND status = 'draft')
    OR public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  );

-- Điểm chấm: đi theo phiếu của chính mình; ghi chỉ khi kỳ đang mở
CREATE POLICY "council_scores_select" ON public.council_evaluation_scores
  FOR SELECT TO authenticated
  USING (
    evaluation_id IN (SELECT id FROM public.council_evaluations WHERE evaluator_id = public.get_my_profile_id())
    OR public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role) OR public.has_role(auth.uid(), 'bgd'::app_role)
  );

CREATE POLICY "council_scores_write_own" ON public.council_evaluation_scores
  FOR ALL TO authenticated
  USING (
    evaluation_id IN (SELECT id FROM public.council_evaluations WHERE evaluator_id = public.get_my_profile_id())
  )
  WITH CHECK (
    evaluation_id IN (
      SELECT e.id FROM public.council_evaluations e
      JOIN public.council_rounds r ON r.id = e.round_id
      WHERE e.evaluator_id = public.get_my_profile_id() AND r.status = 'open'
    )
  );

-- =====================================================================
-- RPC báo cáo tổng hợp ẩn danh (SECURITY DEFINER — vượt RLS có kiểm soát)
-- Chỉ admin (BGĐ/TCTH/System) hoặc chính cán bộ được đánh giá xem được.
-- Người đánh giá được ẩn danh bằng mã ổn định sinh từ id phiếu.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_council_subject_report(p_subject_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.get_my_profile_id();
  v_is_admin boolean := public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
    OR public.has_role(auth.uid(), 'bgd'::app_role);
  v_subject record;
  v_evaluations jsonb;
  v_total_members integer;
  v_submitted integer;
BEGIN
  SELECT s.id, s.round_id, s.profile_id, s.full_name, s.position, s.subject_level,
         s.supervisor_pgd_id, s.task_summary, s.measurement,
         r.name AS round_name, r.status AS round_status
    INTO v_subject
  FROM public.council_subjects s
  JOIN public.council_rounds r ON r.id = s.round_id
  WHERE s.id = p_subject_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy cán bộ đầu mối';
  END IF;

  IF NOT v_is_admin AND (v_subject.profile_id IS NULL OR v_subject.profile_id <> v_profile) THEN
    RAISE EXCEPTION 'Bạn không có quyền xem báo cáo này';
  END IF;

  SELECT count(*) INTO v_total_members
  FROM public.council_members cm
  WHERE cm.is_active
    AND (v_subject.profile_id IS NULL OR cm.profile_id <> v_subject.profile_id);

  SELECT count(*) INTO v_submitted
  FROM public.council_evaluations e
  WHERE e.subject_id = p_subject_id AND e.status = 'submitted';

  SELECT COALESCE(jsonb_agg(row_data ORDER BY group_rank, anon_code), '[]'::jsonb)
    INTO v_evaluations
  FROM (
    SELECT
      CASE COALESCE(cm.member_group, 'thanh_vien')
        WHEN 'giam_doc' THEN 1
        WHEN 'pho_giam_doc' THEN CASE WHEN e.evaluator_id = v_subject.supervisor_pgd_id THEN 2 ELSE 3 END
        ELSE 4
      END AS group_rank,
      ('#' || lpad(((('x' || substr(md5(e.id::text), 1, 6))::bit(24)::int) % 1000)::text, 3, '0')) AS anon_code,
      jsonb_build_object(
        'anon_code', ('#' || lpad(((('x' || substr(md5(e.id::text), 1, 6))::bit(24)::int) % 1000)::text, 3, '0')),
        'member_group', COALESCE(cm.member_group, 'thanh_vien'),
        'is_supervisor', (e.evaluator_id = v_subject.supervisor_pgd_id),
        'scores', COALESCE(
          (SELECT jsonb_object_agg(cs.criterion_id::text, cs.score)
           FROM public.council_evaluation_scores cs WHERE cs.evaluation_id = e.id),
          '{}'::jsonb
        ),
        'strengths', e.strengths,
        'weaknesses', e.weaknesses,
        'suggestions', e.suggestions,
        'evidence', e.evidence
      ) AS row_data
    FROM public.council_evaluations e
    LEFT JOIN public.council_members cm ON cm.profile_id = e.evaluator_id
    WHERE e.subject_id = p_subject_id AND e.status = 'submitted'
  ) t;

  RETURN jsonb_build_object(
    'subject', jsonb_build_object(
      'id', v_subject.id,
      'round_id', v_subject.round_id,
      'round_name', v_subject.round_name,
      'round_status', v_subject.round_status,
      'full_name', v_subject.full_name,
      'position', v_subject.position,
      'subject_level', v_subject.subject_level,
      'task_summary', v_subject.task_summary,
      'measurement', v_subject.measurement
    ),
    'total_members', v_total_members,
    'submitted_count', v_submitted,
    'evaluations', v_evaluations
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_council_subject_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_council_subject_report(uuid) TO authenticated;

-- =====================================================================
-- SEED: 3 kỳ đánh giá Quý II/III/IV 2026
-- =====================================================================
INSERT INTO public.council_rounds (name, description, start_date, end_date, status) VALUES
  ('Quý II/2026', 'Kỳ đánh giá năng lực thực thi công tác đầu mối Quý II/2026', '2026-04-01', '2026-06-30', 'open'),
  ('Quý III/2026', 'Kỳ đánh giá năng lực thực thi công tác đầu mối Quý III/2026', '2026-07-01', '2026-09-30', 'draft'),
  ('Quý IV/2026', 'Kỳ đánh giá năng lực thực thi công tác đầu mối Quý IV/2026', '2026-10-01', '2026-12-31', 'draft')
ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- SEED: thành viên Hội đồng từ hồ sơ hiện có
--  - Giám đốc Chi nhánh -> nhóm giam_doc (trọng số 20%)
--  - Các Phó giám đốc   -> nhóm pho_giam_doc (10%/15% theo vai trò phụ trách)
--  - Trưởng phòng + đầu mối KPI Nguyễn Thị Phượng -> nhóm thanh_vien
-- Cán bộ chưa có tài khoản (VD PTP Bán lẻ, PTP DVKH) admin bổ sung sau
-- tại trang Quản trị Hội đồng.
-- =====================================================================
INSERT INTO public.council_members (profile_id, member_group, note)
SELECT p.id, 'giam_doc', 'Giám đốc Chi nhánh'
FROM public.profiles p
WHERE p.status = 'active' AND p.position ILIKE 'giám đốc%' AND p.full_name NOT ILIKE 'test%'
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO public.council_members (profile_id, member_group, note)
SELECT p.id, 'pho_giam_doc', 'Phó Giám đốc Chi nhánh'
FROM public.profiles p
WHERE p.status = 'active' AND p.position ILIKE 'phó giám đốc%' AND p.full_name NOT ILIKE 'test%'
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO public.council_members (profile_id, member_group, note)
SELECT p.id, 'thanh_vien',
  CASE WHEN p.full_name = 'Nguyễn Thị Phượng' THEN 'Đầu mối KPI Chi nhánh' ELSE 'Trưởng/Phó phụ trách phòng' END
FROM public.profiles p
WHERE p.status = 'active' AND p.full_name NOT ILIKE 'test%'
  AND (p.position ILIKE 'trưởng phòng%' OR p.full_name = 'Nguyễn Thị Phượng')
ON CONFLICT (profile_id) DO NOTHING;

-- =====================================================================
-- SEED: 6 cán bộ đầu mối (Phụ lục 1C) cho cả 3 kỳ.
-- profile_id/supervisor_pgd_id tự liên kết theo họ tên nếu đã có tài khoản.
-- =====================================================================
INSERT INTO public.council_subjects
  (round_id, profile_id, full_name, position, subject_level, supervisor_pgd_id, task_summary, measurement, sort_order)
SELECT
  r.id,
  (SELECT p.id FROM public.profiles p WHERE p.full_name = v.full_name AND p.status = 'active' ORDER BY p.created_at LIMIT 1),
  v.full_name, v.pos, v.lvl,
  (SELECT p.id FROM public.profiles p WHERE p.full_name = v.supervisor AND p.status = 'active' ORDER BY p.created_at LIMIT 1),
  v.task, v.meas, v.ord
FROM public.council_rounds r
CROSS JOIN (VALUES
  ('Nguyễn Thị Thùy Linh', 'Phó Giám đốc', 'pgd', NULL,
   'Triển khai các hoạt động nâng cao hiệu quả công tác KHBL tại CN (bao gồm cả kỹ năng bán hàng, các quy định về quà tặng KH bán lẻ gắn với lợi ích, hành trình khách hàng, kế hoạch chi phí của Chi nhánh, Ứng dụng công nghệ số, sử dụng dữ liệu để ra quyết định…); Thúc đẩy công tác HĐV toàn Chi nhánh.',
   'Lập báo cáo các hành động đã triển khai, hiệu quả đem lại. Hội đồng họp và đánh giá.', 1),
  ('Nguyễn Đức Thái Hoàng', 'Phó Giám đốc', 'pgd', NULL,
   'Triển khai các hoạt động nâng cao hiệu quả công tác KHDN tại CN (bao gồm cả kỹ năng bán hàng, các quy định về quà tặng KHDN gắn với lợi ích, hành trình khách hàng, kế hoạch chi phí của Chi nhánh, Ứng dụng công nghệ số, sử dụng dữ liệu để ra quyết định).',
   'Lập báo cáo các hành động đã triển khai, hiệu quả đem lại. Hội đồng họp và đánh giá.', 2),
  ('Phạm Minh Hải', 'Phó Giám đốc', 'pgd', NULL,
   'Triển khai các hoạt động nâng cao kỹ năng bán hàng, khả năng bán hàng, hiệu quả bán hàng của Giao dịch viên; Ứng dụng công nghệ số, sử dụng dữ liệu để ra quyết định.',
   'Lập báo cáo các hành động đã triển khai, hiệu quả đem lại. Hội đồng họp và đánh giá.', 3),
  ('Mai Hải Quân', 'Phó Trưởng phòng Bán lẻ', 'truong_phong', 'Nguyễn Thị Thùy Linh',
   'Triển khai các hoạt động nâng cao hiệu quả công tác KHBL tại CN (bao gồm cả kỹ năng bán hàng, các quy định về quà tặng KH bán lẻ gắn với lợi ích, hành trình khách hàng, kế hoạch chi phí của Chi nhánh, Ứng dụng công nghệ số, sử dụng dữ liệu để ra quyết định…); Thúc đẩy công tác HĐV toàn Chi nhánh.',
   'Số lượng các giải pháp chủ động đề xuất/hoạt động thúc đẩy kinh doanh KHBL của CN. Cán bộ lập Báo cáo tự đánh giá kết quả, Hội đồng họp đánh giá.', 4),
  ('Đỗ Việt Anh', 'Trưởng phòng KHDN', 'truong_phong', 'Nguyễn Đức Thái Hoàng',
   'Triển khai các hoạt động nâng cao hiệu quả công tác KHDN tại CN (bao gồm cả kỹ năng bán hàng, các quy định về quà tặng KHDN gắn với lợi ích, hành trình khách hàng, kế hoạch chi phí của Chi nhánh, Ứng dụng công nghệ số, sử dụng dữ liệu để ra quyết định).',
   'Lập báo cáo các hành động đã triển khai, hiệu quả đem lại. Hội đồng họp và đánh giá cuối năm.', 5),
  ('Nguyễn Thị Huyền', 'Phó Trưởng phòng DVKH', 'truong_phong', 'Phạm Minh Hải',
   'Triển khai các hoạt động nâng cao kỹ năng bán hàng, khả năng bán hàng, hiệu quả bán hàng của Giao dịch viên; Ứng dụng công nghệ số, sử dụng dữ liệu để ra quyết định; Thúc đẩy công tác phát triển KH chi lương toàn Chi nhánh.',
   'Lập báo cáo các hành động đã triển khai, hiệu quả đem lại. Hội đồng họp và đánh giá cuối năm.', 6)
) AS v(full_name, pos, lvl, supervisor, task, meas, ord)
WHERE r.name IN ('Quý II/2026', 'Quý III/2026', 'Quý IV/2026')
ON CONFLICT (round_id, full_name) DO NOTHING;

-- =====================================================================
-- SEED: bộ câu hỏi định hướng 10 tiêu chí (Mẫu phiếu đánh giá Hội đồng)
-- Phần I  – Năng lực triển khai công tác đầu mối (tiêu chí 1-5, 50 điểm)
-- Phần II – Hiệu quả công tác đầu mối (tiêu chí 6-10, 50 điểm)
-- =====================================================================
INSERT INTO public.council_criteria
  (round_id, criterion_key, section, title, description, anchor_10, anchor_8, anchor_6, anchor_3, anchor_0, sort_order)
SELECT r.id, v.key, v.section, v.title, v.descr, v.a10, v.a8, v.a6, v.a3, v.a0, v.ord
FROM public.council_rounds r
CROSS JOIN (VALUES
  ('tc1', 'nang_luc', 'Chủ động đề xuất và dẫn dắt triển khai',
   'Chủ động đưa ra giải pháp mới, dẫn dắt các phòng ban, đơn vị triển khai thực hiện nhiệm vụ đầu mối.',
   'Chủ động nhận diện vấn đề/cơ hội trước yêu cầu; đề xuất giải pháp có căn cứ dữ liệu; xây dựng lộ trình rõ ràng; tạo đồng thuận cao và dẫn dắt triển khai hiệu quả.',
   'Chủ động đề xuất sáng kiến khi phát sinh yêu cầu; giải pháp phù hợp; triển khai đúng kế hoạch; được các bên liên quan ủng hộ.',
   'Có đề xuất cải tiến nhưng chưa thường xuyên; chủ yếu triển khai theo chỉ đạo; mức độ dẫn dắt còn hạn chế.',
   'Ít đề xuất; thường chờ hướng dẫn; triển khai bị động và phụ thuộc nhiều vào cấp trên.',
   'Không đề xuất giải pháp; không tạo được thay đổi hoặc không tham gia dẫn dắt.', 1),
  ('tc2', 'nang_luc', 'Khả năng điều hành và tổ chức thực hiện',
   'Tổ chức công việc một cách khoa học; phân công và giao việc rõ ràng, theo dõi và đôn đốc sát sao quá trình thực hiện.',
   'Lập kế hoạch chi tiết, phân công rõ trách nhiệm, kiểm soát tiến độ thường xuyên, xử lý vướng mắc kịp thời, hoàn thành vượt tiến độ.',
   'Điều hành hiệu quả; phân công tương đối rõ; kiểm soát tiến độ tốt; hoàn thành đúng hạn.',
   'Tổ chức triển khai đáp ứng yêu cầu cơ bản nhưng theo dõi chưa thường xuyên; cần nhắc việc.',
   'Điều hành thiếu kiểm soát; phân công chưa rõ; tiến độ chậm hoặc phải điều chỉnh nhiều lần.',
   'Không tổ chức được hoạt động; tiến độ kéo dài hoặc không hoàn thành.', 2),
  ('tc3', 'nang_luc', 'Điều phối và phối hợp liên phòng',
   'Khả năng kết nối, điều phối và thúc đẩy sự hợp tác tích cực giữa các phòng ban liên quan trong chi nhánh.',
   'Thiết lập cơ chế phối hợp hiệu quả; duy trì trao đổi thường xuyên; xử lý xung đột nhanh; các đơn vị phối hợp tích cực.',
   'Phối hợp tốt với đa số đơn vị; giải quyết được hầu hết vướng mắc phát sinh.',
   'Có phối hợp nhưng chưa đồng đều; còn phụ thuộc vào hỗ trợ của lãnh đạo.',
   'Phối hợp hạn chế; phản hồi chậm; còn phát sinh bất đồng kéo dài.',
   'Không tạo được sự phối hợp; công việc bị đình trệ do thiếu kết nối.', 3),
  ('tc4', 'nang_luc', 'Khả năng giải quyết vấn đề',
   'Nhận diện vấn đề nhanh nhạy, đưa ra giải pháp xử lý triệt để các vướng mắc phát sinh trong thẩm quyền.',
   'Nhanh chóng xác định nguyên nhân gốc; đưa ra phương án khả thi; xử lý triệt để; hạn chế tái diễn rủi ro.',
   'Giải quyết tốt phần lớn vấn đề; lựa chọn giải pháp phù hợp; ít phát sinh hệ quả.',
   'Giải quyết được các vấn đề thông thường nhưng còn chậm với tình huống phức tạp.',
   'Xử lý bị động; giải pháp thiếu hiệu quả; vấn đề tái diễn nhiều lần.',
   'Không xác định được nguyên nhân hoặc không xử lý được vấn đề.', 4),
  ('tc5', 'nang_luc', 'Tạo động lực và phát triển đội ngũ',
   'Truyền cảm hứng, tạo tinh thần đồng lòng tích cực; phát hiện và phát triển năng lực của đội ngũ kế cận.',
   'Truyền cảm hứng, khuyến khích tham gia; xây dựng đội ngũ kế cận; tạo môi trường tích cực và chủ động học hỏi.',
   'Tạo được sự đồng thuận; khuyến khích phối hợp; duy trì tinh thần làm việc tích cực.',
   'Có tác động tích cực nhưng chưa rõ nét; mức độ tham gia của đội ngũ chưa cao.',
   'Khả năng tạo động lực hạn chế; nhân sự tham gia mang tính đối phó.',
   'Không tạo được sự gắn kết hoặc ảnh hưởng tích cực.', 5),
  ('tc6', 'hieu_qua', 'Nhận diện vấn đề và cơ hội cải thiện',
   'Khả năng phân tích thực trạng, sử dụng dữ liệu, xác định đúng nguyên nhân gốc và trọng tâm cần cải thiện.',
   'Phân tích đầy đủ bằng số liệu; xác định đúng nguyên nhân gốc; chỉ rõ cơ hội cải thiện và ưu tiên hành động.',
   'Phân tích tương đối đầy đủ; xác định được phần lớn nguyên nhân và cơ hội cải thiện.',
   'Có phân tích nhưng còn thiên về hiện tượng; chưa làm rõ nguyên nhân cốt lõi.',
   'Đánh giá sơ sài; thiếu dữ liệu; chưa xác định đúng trọng tâm.',
   'Không phân tích hoặc nhận diện sai vấn đề.', 6),
  ('tc7', 'hieu_qua', 'Xây dựng giải pháp và kế hoạch triển khai',
   'Xây dựng giải pháp/kế hoạch hành động triển khai rõ ràng, khả thi, mục tiêu cụ thể và xác định được các chủ thể 5W2H.',
   'Kế hoạch đầy đủ theo 5W2H; mục tiêu định lượng rõ; nguồn lực, tiến độ và trách nhiệm xác định cụ thể.',
   'Có kế hoạch khả thi; mục tiêu rõ; phân công tương đối đầy đủ.',
   'Có kế hoạch nhưng thiếu một số nội dung như thời hạn, nguồn lực hoặc chỉ tiêu.',
   'Kế hoạch sơ sài; mục tiêu chưa rõ; khó triển khai thực tế.',
   'Không xây dựng kế hoạch hoặc kế hoạch không sử dụng được.', 7),
  ('tc8', 'hieu_qua', 'Theo dõi, kiểm soát và cải tiến',
   'Theo dõi tiến độ thường xuyên bằng dữ liệu, áp dụng báo cáo, PDCA và điều chỉnh, cải tiến giải pháp kịp thời.',
   'Theo dõi thường xuyên bằng dữ liệu; đánh giá định kỳ; áp dụng PDCA; điều chỉnh giải pháp kịp thời.',
   'Theo dõi đầy đủ; có báo cáo tiến độ và điều chỉnh khi cần thiết.',
   'Có theo dõi nhưng chưa liên tục; hoạt động cải tiến còn chậm.',
   'Theo dõi hình thức; thiếu dữ liệu; ít hành động cải tiến.',
   'Không theo dõi tiến độ hoặc không có hoạt động cải tiến.', 8),
  ('tc9', 'hieu_qua', 'Hiệu quả mang lại',
   'Đánh giá kết quả thực tế đối với chỉ tiêu kinh doanh, vận hành, khách hàng hoặc chất lượng dịch vụ.',
   'Tạo chuyển biến rõ rệt; đạt hoặc vượt mục tiêu; có kết quả định lượng và được ghi nhận rộng rãi.',
   'Đạt các mục tiêu chính; mang lại kết quả tích cực và ổn định.',
   'Có cải thiện nhưng chưa rõ nét; tác động còn hạn chế.',
   'Hiệu quả thấp; kết quả chưa đáp ứng kỳ vọng.',
   'Không tạo được kết quả hoặc không chứng minh được hiệu quả.', 9),
  ('tc10', 'hieu_qua', 'Chuẩn hóa, đổi mới và lan tỏa',
   'Chuẩn hóa quy trình, ứng dụng AI/chuyển đổi số, khả năng nhân rộng và duy trì, lan tỏa kết quả tốt.',
   'Chuẩn hóa thành quy trình/công cụ; ứng dụng AI hoặc chuyển đổi số; nhân rộng thành công trên phạm vi đơn vị.',
   'Có chuẩn hóa và áp dụng hiệu quả; được các đơn vị khác tham khảo sử dụng.',
   'Có cải tiến nhưng phạm vi áp dụng hẹp; chưa duy trì bền vững.',
   'Hiệu quả ngắn hạn; chưa chuẩn hóa hoặc khó nhân rộng.',
   'Không có hoạt động cải tiến hoặc đổi mới.', 10)
) AS v(key, section, title, descr, a10, a8, a6, a3, a0, ord)
WHERE r.name IN ('Quý II/2026', 'Quý III/2026', 'Quý IV/2026')
ON CONFLICT (round_id, criterion_key) DO NOTHING;

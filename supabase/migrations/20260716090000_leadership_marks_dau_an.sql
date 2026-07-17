-- ============================================================================
-- DẤU ẤN BẮC HƯNG YÊN MARK
-- Khung dấu ấn Ban Giám đốc giao PGĐ (T7–T8/2026): danh mục năng lực lãnh đạo,
-- 5 giá trị cốt lõi, bảng dấu ấn + skill kèm theo, và đồng bộ sang Kanban qua
-- source_type='manager_assigned' (đã có trong CHECK nhưng chưa có nguồn nào dùng).
-- Thiết kế: docs/nghien-cuu-dau-an-bac-hung-yen-mark.md
-- ============================================================================

-- 1) Danh mục năng lực lãnh đạo (số hóa tối thiểu từ Sổ tay Khung năng lực 10/2025)
CREATE TABLE IF NOT EXISTS public.leadership_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) 5 giá trị cốt lõi (nguồn chuẩn cho nghiệp vụ; frontend pre-auth dùng hằng số mirror)
CREATE TABLE IF NOT EXISTS public.core_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Dấu ấn
CREATE TABLE IF NOT EXISTS public.leadership_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.evaluation_cycles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  role_focus text,
  leadership_competency_id uuid REFERENCES public.leadership_competencies(id),
  core_value_id uuid REFERENCES public.core_values(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','confirmed','archived')),
  star_situation text,
  star_task text,
  star_action text,
  star_result text,
  deliverable text,
  deadline date,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, cycle_id, title)
);

CREATE TRIGGER update_leadership_marks_updated_at
  BEFORE UPDATE ON public.leadership_marks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Skill của dấu ấn (tối đa 2/dấu ấn — khung quy định)
CREATE TABLE IF NOT EXISTS public.leadership_mark_skills (
  mark_id uuid NOT NULL REFERENCES public.leadership_marks(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill_catalog(id),
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (mark_id, skill_id)
);

CREATE OR REPLACE FUNCTION public.check_leadership_mark_skill_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF (SELECT count(*) FROM public.leadership_mark_skills WHERE mark_id = NEW.mark_id) >= 2 THEN
    RAISE EXCEPTION 'Mỗi dấu ấn gắn tối đa 2 Skill';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER leadership_mark_skills_limit
  BEFORE INSERT ON public.leadership_mark_skills
  FOR EACH ROW EXECUTE FUNCTION public.check_leadership_mark_skill_limit();

-- 5) Nối Kanban: thẻ dấu ấn không sinh từ phiếu nên form_id phải nullable
ALTER TABLE public.kanban_cards ALTER COLUMN form_id DROP NOT NULL;
ALTER TABLE public.kanban_cards
  ADD COLUMN IF NOT EXISTS leadership_mark_id uuid REFERENCES public.leadership_marks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_leadership_mark ON public.kanban_cards(leadership_mark_id)
  WHERE leadership_mark_id IS NOT NULL;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.leadership_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadership_mark_skills ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.leadership_competencies, public.core_values,
             public.leadership_marks, public.leadership_mark_skills FROM anon;

-- Danh mục: mọi người đăng nhập đọc được; admin quản lý
CREATE POLICY "Authenticated read competencies" ON public.leadership_competencies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage competencies" ON public.leadership_competencies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role));

CREATE POLICY "Authenticated read core values" ON public.core_values
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage core values" ON public.core_values
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role));

-- Dấu ấn: chủ dấu ấn + người trong phạm vi xem; admin quản lý; chủ chỉ sửa STAR/deliverable
CREATE POLICY "View own or scoped leadership marks" ON public.leadership_marks
  FOR SELECT TO authenticated
  USING (profile_id = public.get_my_profile_id() OR public.can_view_profile(profile_id));
CREATE POLICY "Admins manage leadership marks" ON public.leadership_marks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role));
CREATE POLICY "Owner update own leadership mark" ON public.leadership_marks
  FOR UPDATE TO authenticated
  USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());

-- Guard: chủ dấu ấn (không phải admin) chỉ được sửa STAR + sản phẩm để lại
CREATE OR REPLACE FUNCTION public.guard_leadership_mark_owner_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Ngữ cảnh service_role/migration (không có auth.uid()) hoặc admin: cho qua
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(),'system_admin'::app_role)
     OR public.has_role(auth.uid(),'bgd'::app_role)
     OR public.has_role(auth.uid(),'tcth_admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.cycle_id IS DISTINCT FROM OLD.cycle_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.role_focus IS DISTINCT FROM OLD.role_focus
     OR NEW.leadership_competency_id IS DISTINCT FROM OLD.leadership_competency_id
     OR NEW.core_value_id IS DISTINCT FROM OLD.core_value_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.deadline IS DISTINCT FROM OLD.deadline
     OR NEW.sort_order IS DISTINCT FROM OLD.sort_order
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Chỉ Ban Giám đốc/TCTH được sửa khung dấu ấn — PGĐ chỉ cập nhật STAR và sản phẩm để lại';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER guard_leadership_mark_owner_update
  BEFORE UPDATE ON public.leadership_marks
  FOR EACH ROW EXECUTE FUNCTION public.guard_leadership_mark_owner_update();

-- Skill của dấu ấn: đọc theo quyền xem dấu ấn; admin quản lý
CREATE POLICY "View skills of viewable marks" ON public.leadership_mark_skills
  FOR SELECT TO authenticated
  USING (mark_id IN (
    SELECT id FROM public.leadership_marks
    WHERE profile_id = public.get_my_profile_id() OR public.can_view_profile(profile_id)
  ));
CREATE POLICY "Admins manage mark skills" ON public.leadership_mark_skills
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role));

-- ============================================================================
-- kanban_upsert_card: thêm nhánh nguồn leadership_marks (không có form)
-- ============================================================================
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
  v_mark uuid;
  v_card_id uuid;
  v_norm text;
  v_is_placeholder boolean;
BEGIN
  IF _source_table = 'leadership_marks' THEN
    -- Dấu ấn: profile/cycle lấy trực tiếp từ bảng nguồn, không qua form_submissions
    SELECT profile_id, cycle_id, id INTO v_profile, v_cycle, v_mark
      FROM public.leadership_marks WHERE id = _source_action_id;
  ELSE
    SELECT employee_id, cycle_id INTO v_profile, v_cycle
      FROM public.form_submissions WHERE id = _form_id;
  END IF;
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
    title, skill_id, attitude_dimension_id, learning_mode, deadline,
    leadership_mark_id, is_active
  ) VALUES (
    v_profile, _form_id, v_cycle, _source_type, _source_table, _source_action_id,
    _title, _skill_id, _attitude_dimension_id, _learning_mode, _deadline,
    v_mark, true
  )
  ON CONFLICT (source_table, source_action_id) DO UPDATE SET
    title = EXCLUDED.title,
    skill_id = EXCLUDED.skill_id,
    attitude_dimension_id = EXCLUDED.attitude_dimension_id,
    learning_mode = EXCLUDED.learning_mode,
    deadline = EXCLUDED.deadline,
    leadership_mark_id = EXCLUDED.leadership_mark_id,
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

-- ============================================================================
-- Đồng bộ dấu ấn → thẻ Kanban
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_kanban_leadership_mark()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_skill uuid;
BEGIN
  IF NEW.status IN ('active','confirmed') THEN
    SELECT skill_id INTO v_skill
      FROM public.leadership_mark_skills
     WHERE mark_id = NEW.id
     ORDER BY sort_order, skill_id
     LIMIT 1;
    PERFORM public.kanban_upsert_card(
      'leadership_marks', NEW.id, 'manager_assigned',
      NULL, NEW.title, v_skill, NULL, NULL, NEW.deadline
    );
  ELSIF NEW.status = 'archived' THEN
    UPDATE public.kanban_cards
       SET is_active = false,
           archived_at = now(),
           archived_reason = COALESCE(archived_reason, 'mark_archived'),
           updated_at = now()
     WHERE source_table = 'leadership_marks'
       AND source_action_id = NEW.id
       AND is_active = true;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER sync_kanban_on_leadership_mark
  AFTER INSERT OR UPDATE OF title, deadline, status ON public.leadership_marks
  FOR EACH ROW EXECUTE FUNCTION public.sync_kanban_leadership_mark();

-- Đổi skill của dấu ấn → cập nhật skill chính trên thẻ
CREATE OR REPLACE FUNCTION public.sync_kanban_leadership_mark_skill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_mark_id uuid := COALESCE(NEW.mark_id, OLD.mark_id);
  v_skill uuid;
BEGIN
  SELECT skill_id INTO v_skill
    FROM public.leadership_mark_skills
   WHERE mark_id = v_mark_id
   ORDER BY sort_order, skill_id
   LIMIT 1;
  UPDATE public.kanban_cards
     SET skill_id = v_skill, updated_at = now()
   WHERE source_table = 'leadership_marks' AND source_action_id = v_mark_id;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER sync_kanban_on_leadership_mark_skill
  AFTER INSERT OR UPDATE OR DELETE ON public.leadership_mark_skills
  FOR EACH ROW EXECUTE FUNCTION public.sync_kanban_leadership_mark_skill();

-- Xóa dấu ấn → archive thẻ (tái dùng hàm sẵn có)
CREATE TRIGGER archive_kanban_on_leadership_mark_delete
  BEFORE DELETE ON public.leadership_marks
  FOR EACH ROW EXECUTE FUNCTION public.kanban_archive_on_source_delete('leadership_marks');

-- ============================================================================
-- SEED — danh mục + khung 12 dấu ấn T7–T8/2026 (idempotent)
-- ============================================================================
INSERT INTO public.leadership_competencies (code, name, sort_order) VALUES
  ('LC01','Tầm nhìn chiến lược',1),
  ('LC02','Chuyển đổi số',2),
  ('LC03','Cân bằng rủi ro và phát triển',3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.core_values (code, name, sort_order) VALUES
  ('CV01','Chính trực',1),
  ('CV02','Trí tuệ',2),
  ('CV03','Tận tâm',3),
  ('CV04','Thấu cảm',4),
  ('CV05','Thích ứng',5)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  v_cycle uuid;
  v_gd uuid;
  v_hoang uuid; v_linh uuid; v_hai uuid;
  lc_chien_luoc uuid; lc_so uuid; lc_rui_ro uuid;
  cv_chinh_truc uuid; cv_tri_tue uuid; cv_tan_tam uuid; cv_thau_cam uuid; cv_thich_ung uuid;
  v_deadline date := DATE '2026-08-31';
  v_mark uuid;
BEGIN
  SELECT id INTO v_cycle FROM public.evaluation_cycles WHERE name = 'Quý II/2026';
  SELECT id INTO v_gd    FROM public.profiles WHERE full_name = 'Trần Đức Anh' LIMIT 1;
  SELECT id INTO v_hoang FROM public.profiles WHERE full_name = 'Nguyễn Đức Thái Hoàng' LIMIT 1;
  SELECT id INTO v_linh  FROM public.profiles WHERE full_name = 'Nguyễn Thị Thùy Linh' LIMIT 1;
  SELECT id INTO v_hai   FROM public.profiles WHERE full_name = 'Phạm Minh Hải' LIMIT 1;
  IF v_hoang IS NULL OR v_linh IS NULL OR v_hai IS NULL THEN
    RAISE NOTICE 'Không tìm đủ 3 PGĐ theo tên — bỏ qua seed dấu ấn';
    RETURN;
  END IF;

  SELECT id INTO lc_chien_luoc FROM public.leadership_competencies WHERE code='LC01';
  SELECT id INTO lc_so         FROM public.leadership_competencies WHERE code='LC02';
  SELECT id INTO lc_rui_ro     FROM public.leadership_competencies WHERE code='LC03';
  SELECT id INTO cv_chinh_truc FROM public.core_values WHERE code='CV01';
  SELECT id INTO cv_tri_tue    FROM public.core_values WHERE code='CV02';
  SELECT id INTO cv_tan_tam    FROM public.core_values WHERE code='CV03';
  SELECT id INTO cv_thau_cam   FROM public.core_values WHERE code='CV04';
  SELECT id INTO cv_thich_ung  FROM public.core_values WHERE code='CV05';

  -- Helper nội tuyến: chèn 1 dấu ấn + tối đa 2 skill (theo code SKxx)
  -- (PL/pgSQL không có hàm cục bộ — dùng khối lặp qua bảng tạm)
  CREATE TEMP TABLE IF NOT EXISTS _seed_marks (
    profile_id uuid, role_focus text, sort_order int, title text,
    competency uuid, core_value uuid, description text, sk1 text, sk2 text
  ) ON COMMIT DROP;
  DELETE FROM _seed_marks;

  INSERT INTO _seed_marks VALUES
  -- ── Nguyễn Đức Thái Hoàng ──────────────────────────────────────────────
  (v_hoang, 'FDI - KHDN - quản trị rủi ro tín dụng và xử lý nợ', 1,
   'Công cụ hỗ trợ giao tiếp toàn diện với khách hàng FDI', lc_so, cv_thau_cam,
   'Xây dựng, thử nghiệm và chia sẻ bộ công cụ hỗ trợ cán bộ giao tiếp, khai thác nhu cầu, chăm sóc và phát triển khách hàng FDI; có nội dung chuẩn bị trước cuộc gặp, trao đổi đa ngôn ngữ/AI, theo dõi sau gặp và phản hồi từ cán bộ sử dụng.',
   'SK16','SK07'),
  (v_hoang, 'FDI - KHDN - quản trị rủi ro tín dụng và xử lý nợ', 2,
   'Phương thức phân luồng xử lý nợ Mỹ Hương', lc_rui_ro, cv_tan_tam,
   'Tổ chức thực hiện phương thức ứng xử tín dụng đã có: tự thu, bám sát khách hàng, xác định hình thái vốn vay và nguồn thu, triển khai giải pháp bảo đảm thu hồi nợ; đồng thời bám sát hồ sơ bảo hiểm, giám định và tiến độ đền bù thiệt hại vụ cháy.',
   'SK21','SK33'),
  (v_hoang, 'FDI - KHDN - quản trị rủi ro tín dụng và xử lý nợ', 3,
   'Đầu mối Khối KHDN tại Chi nhánh', lc_chien_luoc, cv_tri_tue,
   'Tiếp nhận, phân tích và chuyển hóa các định hướng, chương trình, chiến dịch của Khối KHDN thành kế hoạch triển khai tại Chi nhánh; xác định rõ mục tiêu, đơn vị thực hiện, tiến độ, kết quả và các điểm nghẽn cần xử lý.',
   'SK35','SK38'),
  (v_hoang, 'FDI - KHDN - quản trị rủi ro tín dụng và xử lý nợ', 4,
   'Huy động vốn (KHDN + PGD Văn Lâm)', lc_chien_luoc, cv_tan_tam,
   'Tổ chức huy động vốn trên hai phạm vi phụ trách: lĩnh vực KHDN và PGD Văn Lâm. Phân tích danh mục KHDN/FDI, khách hàng hiện hữu và tiềm năng trên địa bàn; xác định nguồn tiền, tiền gửi đến hạn, dòng tiền thanh toán/CASA, giao đầu mối và theo dõi kết quả theo từng khách hàng, từng đơn vị.',
   'SK04','SK27'),
  -- ── Nguyễn Thị Thùy Linh ───────────────────────────────────────────────
  (v_linh, 'Đầu mối Bán lẻ - kiểm tra toàn diện - marketing online', 1,
   'Điều hành tiếp đoàn kiểm tra toàn diện của Phòng KTKSNB TSC', lc_rui_ro, cv_chinh_truc,
   'Tổ chức đầu mối tiếp đoàn kiểm tra định kỳ toàn diện; phân công và kiểm soát hồ sơ cung cấp, điều phối giải trình, theo dõi vấn đề phát sinh, xây dựng kế hoạch khắc phục và giám sát thực hiện sau kiểm tra.',
   'SK34','SK38'),
  (v_linh, 'Đầu mối Bán lẻ - kiểm tra toàn diện - marketing online', 2,
   'Marketing online và chỉ đạo Tổ truyền thông', lc_so, cv_thau_cam,
   'Chỉ đạo Tổ truyền thông xây dựng định hướng truyền thông số toàn Chi nhánh theo mô hình Official Page + hệ thống Fan Page cá nhân; xác định khách hàng mục tiêu, trụ cột nội dung, quy chuẩn thương hiệu/bảo mật, lịch nội dung và cơ chế kiểm duyệt. Trong tháng 7-8, lựa chọn nhóm cán bộ thí điểm, yêu cầu mỗi người lập Fan Page mang tên cá nhân, chuẩn bị ngân hàng nội dung ban đầu và đăng nội dung hàng ngày để hình thành thói quen Digital Creator.',
   'SK07','SK38'),
  (v_linh, 'Đầu mối Bán lẻ - kiểm tra toàn diện - marketing online', 3,
   'Đầu mối Khối Bán lẻ tại Chi nhánh', lc_chien_luoc, cv_thich_ung,
   'Tiếp nhận và chuyển hóa các định hướng, sản phẩm, chương trình, chiến dịch của Khối Bán lẻ thành kế hoạch của Chi nhánh; điều phối các phòng/PGD, theo dõi tiến độ, kết quả và xử lý các điểm nghẽn trong triển khai.',
   'SK35','SK38'),
  (v_linh, 'Đầu mối Bán lẻ - kiểm tra toàn diện - marketing online', 4,
   'Huy động vốn (Bán lẻ + PGD Khoái Châu)', lc_chien_luoc, cv_thau_cam,
   'Tổ chức huy động vốn trên hai phạm vi phụ trách: lĩnh vực Bán lẻ và PGD Khoái Châu. Phân nhóm khách hàng hiện hữu, tiền gửi đến hạn và khách hàng tiềm năng; giao danh sách, kế hoạch chăm sóc, theo dõi tỷ lệ giữ chân, số dư tăng thêm, CASA và kết quả của từng đầu mối, từng đơn vị.',
   'SK08','SK27'),
  -- ── Phạm Minh Hải ──────────────────────────────────────────────────────
  (v_hai, 'Chuyển đổi PGD Ocean City - chất lượng dịch vụ - hệ sinh thái số Ocean City/Ecopark', 1,
   'Chuyển tên, di chuyển PGD Yên Mỹ sang Ocean City', lc_chien_luoc, cv_thau_cam,
   'Tổ chức triển khai các hành động kinh doanh liên quan đến đổi địa điểm PGD Yên Mỹ sang địa điểm mới tại Vinhomes Ocean Park 2; bảo đảm hoạt động liên tục, truyền thông và làm việc trực tiếp với khách hàng, giữ chân khách hàng cũ, đồng thời xây dựng kế hoạch khai thác địa bàn và phát triển khách hàng mới.',
   'SK35','SK08'),
  (v_hai, 'Chuyển đổi PGD Ocean City - chất lượng dịch vụ - hệ sinh thái số Ocean City/Ecopark', 2,
   'Thí điểm Digital Creator Ocean City và Ecopark', lc_so, cv_tri_tue,
   'Triển khai thí điểm mô hình Digital Creator tại Ocean City và Ecopark theo định hướng Bắc Hưng Yên Sharing: lựa chọn cán bộ, lập Fan Page mang tên cá nhân, thống nhất 5 nhóm nội dung (chuyên môn, câu chuyện khách hàng, hoạt động Chi nhánh, kiến thức hữu ích, giá trị sống), chuẩn bị ngân hàng nội dung ban đầu và đăng hàng ngày.',
   'SK07','SK26'),
  (v_hai, 'Chuyển đổi PGD Ocean City - chất lượng dịch vụ - hệ sinh thái số Ocean City/Ecopark', 3,
   'Đầu mối chất lượng dịch vụ của Chi nhánh', lc_chien_luoc, cv_thau_cam,
   'Tiếp nhận và tổ chức triển khai các tiêu chuẩn, chương trình và yêu cầu về chất lượng dịch vụ trong toàn Chi nhánh; theo dõi chỉ số, nhận diện điểm nghẽn, điều phối khắc phục và tạo chuyển biến đồng đều tại các đơn vị.',
   'SK25','SK18'),
  (v_hai, 'Chuyển đổi PGD Ocean City - chất lượng dịch vụ - hệ sinh thái số Ocean City/Ecopark', 4,
   'Huy động vốn (DVKH + PGD Văn Giang, Ân Thi, Yên Mỹ)', lc_chien_luoc, cv_tan_tam,
   'Tổ chức hoạt động huy động vốn tại Phòng DVKH và các PGD Văn Giang, Ân Thi, Yên Mỹ; xây dựng danh sách nguồn vốn trọng điểm, khách hàng đến hạn và hệ sinh thái địa bàn; giao mục tiêu, theo dõi kết quả từng đơn vị, gắn chất lượng dịch vụ, chăm sóc và quan hệ khách hàng với số dư, CASA, tỷ lệ giữ chân và khách hàng mới. Khai thác các KH Ban quản lý dự án số 1, Ban quản lý dự án Mỹ Hào mà Phòng DVKH đang quản lý.',
   'SK08','SK31');

  DECLARE r record;
  BEGIN
    FOR r IN SELECT * FROM _seed_marks LOOP
      INSERT INTO public.leadership_marks (
        profile_id, cycle_id, title, description, role_focus,
        leadership_competency_id, core_value_id, status, deadline, sort_order, created_by
      ) VALUES (
        r.profile_id, v_cycle, r.title, r.description, r.role_focus,
        r.competency, r.core_value, 'active', v_deadline, r.sort_order, v_gd
      )
      ON CONFLICT (profile_id, cycle_id, title) DO NOTHING
      RETURNING id INTO v_mark;

      IF v_mark IS NOT NULL THEN
        INSERT INTO public.leadership_mark_skills (mark_id, skill_id, sort_order)
        SELECT v_mark, sc.id, 1 FROM public.skill_catalog sc WHERE sc.code = r.sk1
        ON CONFLICT DO NOTHING;
        IF r.sk2 IS NOT NULL THEN
          INSERT INTO public.leadership_mark_skills (mark_id, skill_id, sort_order)
          SELECT v_mark, sc.id, 2 FROM public.skill_catalog sc WHERE sc.code = r.sk2
          ON CONFLICT DO NOTHING;
        END IF;
        -- Thẻ Kanban nhận skill chính qua trigger trên leadership_mark_skills
      END IF;
    END LOOP;
  END;
END $$;

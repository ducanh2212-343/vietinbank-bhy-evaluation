-- ============================================================================
-- BHY Ideas — SỔ GHI NHẬN CẤP ĐỘ, tách bạch KPI và TIỀN THƯỞNG
--
-- Chỉ đạo 08/2026:
--   "KPI phải đo lường chuẩn" — ghi nhận cấp độ phải ĐÚNG HẠN MỨC, phòng nào
--   vượt trần thì Trưởng phòng phải LỰA CHỌN ý tưởng nào được ghi nhận.
--   "Tiền thưởng thì có thể khuyến khích" — mọi ý tưởng Ươm mầm tự đề xuất
--   trước 16/08/2026 vẫn được thưởng tiền để khuyến khích phong trào, kể cả
--   khi không nằm trong hạn mức ghi nhận.
--
-- Vì vậy mỗi dòng sổ mang HAI trục độc lập:
--   ghi_nhan_kpi  → có tính vào KPI Đổi mới sáng tạo hay không (chịu hạn mức)
--   muc_thuong    → số tiền thực chi (0 = ghi nhận suông hoặc không chi)
-- Hai trục này KHÔNG suy ra nhau. Một ý tưởng có thể được thưởng mà không
-- được ghi nhận KPI (hồi tố trước 16/08), hoặc ghi nhận KPI mà chưa chi tiền
-- (hết ngân sách — quy chế cho chuyển kỳ sau).
--
-- Hạn mức ghi nhận Ươm mầm: 02 ý tưởng/tuần/phòng (mục 5 quy chế Ideas),
-- đếm theo TUẦN ĐƯỢC PHÒNG CHỌN chứ không theo ngày gửi phiếu — cán bộ vẫn
-- gửi ý tưởng không giới hạn.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Chỉ báo NHÂN VIÊN KHOÁN GỌN trong hồ sơ nhân sự
--    Nhóm này (VD nhân viên khoán gọn Phòng KHDN, nhân viên dịch vụ khách
--    hàng) KHÔNG tính khi đo KPI: không giao chỉ tiêu cá nhân, và không nằm
--    trong mẫu số "số lượng cán bộ của Phòng" khi tính chỉ tiêu Bén rễ của
--    Trưởng/Phó phòng theo Thẻ điểm KPI 25/06/2026.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS khoan_gon BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.khoan_gon IS
  'Nhân viên khoán gọn — KHÔNG tính vào KPI: không giao chỉ tiêu cá nhân và không đếm vào mẫu số số cán bộ của Phòng khi tính chỉ tiêu KPI của lãnh đạo.';

-- Số cán bộ tính KPI của một phòng (theo tên phòng trong hệ Ideas).
-- Dùng làm mẫu số chỉ tiêu Bén rễ của Trưởng/Phó phòng.
CREATE OR REPLACE FUNCTION public.bhy_ideas_so_cb_tinh_kpi(_phong_ideas text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.profiles p
  JOIN public.departments d ON d.id = p.department_id
  WHERE p.status = 'active'
    AND NOT p.khoan_gon
    AND d.name = public.bhy_phong_ideas_sang_ho_so(_phong_ideas)
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_so_cb_tinh_kpi(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_so_cb_tinh_kpi(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Trưởng phòng của một phòng (theo hệ tên Ideas) — người có quyền chọn
--    ý tưởng Ươm mầm trong hạn mức tuần của phòng mình.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_la_truong_phong(_phong_ideas text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.user_id = auth.uid()
      AND p.status = 'active'
      AND d.name = public.bhy_phong_ideas_sang_ho_so(_phong_ideas)
      AND (public.has_role(auth.uid(), 'manager'::app_role)
           OR public.has_role(auth.uid(), 'pgd'::app_role))
  )
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_la_truong_phong(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_la_truong_phong(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Sổ ghi nhận cấp độ & thưởng
-- ---------------------------------------------------------------------------
CREATE TABLE public.portal_idea_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.portal_ideas(id) ON DELETE CASCADE,
  cap_do TEXT NOT NULL CHECK (cap_do IN ('Ươm mầm', 'Bén rễ', 'Vươn cành', 'Lan tỏa')),

  -- Trục KPI: có tính vào chỉ tiêu Đổi mới sáng tạo hay không
  ghi_nhan_kpi BOOLEAN NOT NULL DEFAULT true,
  -- Phòng tại thời điểm ghi nhận — chốt lại vì ý tưởng có thể bị chuyển phòng
  phong TEXT NOT NULL,
  -- Tuần được phòng chọn (thứ Hai đầu tuần) — khóa đếm hạn mức của Ươm mầm
  tuan_chon DATE,

  -- AI DUYỆT — hai cờ ĐỘC LẬP, có thể cùng bật.
  -- Cùng một ý tưởng luôn được nhập ở CẢ HAI nơi: cán bộ đề xuất trên SMP thì
  -- cũng nhập vào BHY One. Việc công nhận có thể đến từ Chi nhánh duyệt, từ
  -- Trụ sở chính duyệt, hoặc cả hai — nên không mô hình bằng một trường loại
  -- trừ. Khóa UNIQUE(idea_id, cap_do) bảo đảm dù duyệt ở mấy nơi thì mỗi cấp
  -- vẫn chỉ ghi nhận MỘT lần và chỉ trả tiền MỘT lần.
  duyet_cn BOOLEAN NOT NULL DEFAULT false,   -- Chi nhánh duyệt (TP chọn / GĐ phê duyệt)
  duyet_tsc BOOLEAN NOT NULL DEFAULT false,  -- TSC duyệt trên SMP ("Đồng ý"/"Đồng ý một phần")

  -- Trục TIỀN: 0 = ghi nhận suông / chưa chi (chuyển kỳ sau)
  muc_thuong INTEGER NOT NULL DEFAULT 0 CHECK (muc_thuong >= 0),
  ly_do_thuong TEXT NOT NULL DEFAULT 'trong_han_muc'
    CHECK (ly_do_thuong IN ('trong_han_muc', 'hoi_to_khuyen_khich', 'khong_chi', 'chuyen_ky_sau')),

  -- Vươn cành / Lan tỏa gắn với đợt chấm Hội đồng nào
  round_id UUID REFERENCES public.portal_idea_council_rounds(id) ON DELETE SET NULL,

  nguoi_ghi_nhan UUID DEFAULT auth.uid(),
  ghi_nhan_luc TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nguoi_duyet UUID,
  duyet_luc TIMESTAMP WITH TIME ZONE,
  ghi_chu TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Mỗi ý tưởng chỉ ghi nhận MỘT lần cho MỘT cấp — nền của phép thưởng lũy kế
  UNIQUE (idea_id, cap_do),
  -- Ươm mầm do CHI NHÁNH duyệt bắt buộc có tuần để đếm hạn mức
  CONSTRAINT uom_mam_phai_co_tuan
    CHECK (cap_do <> 'Ươm mầm' OR NOT duyet_cn OR tuan_chon IS NOT NULL),
  -- Đã ghi nhận thì phải có ít nhất một nơi duyệt
  CONSTRAINT phai_co_noi_duyet
    CHECK (NOT ghi_nhan_kpi OR duyet_cn OR duyet_tsc)
);

CREATE INDEX idx_pia_idea ON public.portal_idea_awards (idea_id);
CREATE INDEX idx_pia_han_muc ON public.portal_idea_awards (phong, tuan_chon)
  WHERE cap_do = 'Ươm mầm' AND ghi_nhan_kpi AND duyet_cn;

ALTER TABLE public.portal_idea_awards ENABLE ROW LEVEL SECURITY;

-- Cán bộ xem được sổ (biết ý tưởng mình đạt cấp nào, được thưởng bao nhiêu)
CREATE POLICY "Staff can view idea awards"
  ON public.portal_idea_awards FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Trưởng phòng ghi nhận Ươm mầm cho phòng MÌNH; admin ghi nhận mọi cấp
CREATE POLICY "Heads record uom mam for own department"
  ON public.portal_idea_awards FOR INSERT TO authenticated
  WITH CHECK (
    public.is_content_admin(auth.uid())
    OR (cap_do = 'Ươm mầm' AND public.bhy_ideas_la_truong_phong(phong))
  );

CREATE POLICY "Heads revoke own uom mam"
  ON public.portal_idea_awards FOR DELETE TO authenticated
  USING (
    public.is_content_admin(auth.uid())
    OR (cap_do = 'Ươm mầm' AND public.bhy_ideas_la_truong_phong(phong))
  );

CREATE POLICY "Content admins manage idea awards"
  ON public.portal_idea_awards FOR UPDATE TO authenticated
  USING (public.is_content_admin(auth.uid()))
  WITH CHECK (public.is_content_admin(auth.uid()));

CREATE TRIGGER update_portal_idea_awards_updated_at
  BEFORE UPDATE ON public.portal_idea_awards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4) Gác HẠN MỨC ghi nhận Ươm mầm: 02 ý tưởng/tuần/phòng.
--    Chỉ đếm dòng ghi_nhan_kpi = true VÀ duyet_cn = true — hạn mức là suất
--    của CHI NHÁNH. Dòng thưởng hồi tố (chưa ghi nhận) và dòng chỉ do TSC
--    duyệt trên SMP đều không chiếm suất của phòng.
--    Admin cũng bị chặn: hạn mức là để KPI đo lường chuẩn, không nới tay được.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_pia_gac_han_muc_uom_mam()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_dem integer;
BEGIN
  IF NEW.cap_do <> 'Ươm mầm' OR NOT NEW.ghi_nhan_kpi OR NOT NEW.duyet_cn THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_dem
  FROM public.portal_idea_awards a
  WHERE a.cap_do = 'Ươm mầm'
    AND a.ghi_nhan_kpi
    AND a.duyet_cn
    AND a.phong = NEW.phong
    AND a.tuan_chon = NEW.tuan_chon
    AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_dem >= 2 THEN
    RAISE EXCEPTION 'Phòng % đã dùng hết hạn mức 02 ý tưởng Ươm mầm của tuần % — bỏ chọn một ý tưởng khác trước khi chọn ý tưởng này',
      NEW.phong, to_char(NEW.tuan_chon, 'DD/MM/YYYY');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pia_gac_han_muc_uom_mam
  BEFORE INSERT OR UPDATE ON public.portal_idea_awards
  FOR EACH ROW EXECUTE FUNCTION public.f_pia_gac_han_muc_uom_mam();

-- ---------------------------------------------------------------------------
-- 5) RPC cho Trưởng phòng chọn / bỏ chọn ý tưởng Ươm mầm.
--
--    MỐC HỒI TỐ 16/08/2026 (chỉ đạo 08/2026): ý tưởng gửi TRƯỚC mốc này được
--    thưởng tiền để khuyến khích phong trào dù có được chọn vào hạn mức hay
--    không. Sau mốc, chỉ ý tưởng trong hạn mức mới có tiền.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_chon_uom_mam(_idea_id uuid, _tuan_chon date)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_thuong integer;
  v_ly_do text;
BEGIN
  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  IF NOT (public.is_content_admin(auth.uid())
          OR public.bhy_ideas_la_truong_phong(v_idea.department_name)) THEN
    RAISE EXCEPTION 'Chỉ Trưởng phòng của phòng đề xuất (hoặc Phòng TCTH) được chọn ý tưởng Ươm mầm';
  END IF;

  -- Trong hạn mức → được thưởng theo đơn giá Ươm mầm
  v_thuong := 100000;
  v_ly_do := 'trong_han_muc';

  INSERT INTO public.portal_idea_awards
    (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, phong, tuan_chon, muc_thuong, ly_do_thuong)
  VALUES
    (_idea_id, 'Ươm mầm', true, true, v_idea.department_name,
     date_trunc('week', _tuan_chon)::date, v_thuong, v_ly_do)
  ON CONFLICT (idea_id, cap_do) DO UPDATE
    SET ghi_nhan_kpi = true,
        duyet_cn = true,
        tuan_chon = date_trunc('week', _tuan_chon)::date,
        muc_thuong = GREATEST(public.portal_idea_awards.muc_thuong, v_thuong),
        ly_do_thuong = v_ly_do,
        nguoi_ghi_nhan = auth.uid(),
        ghi_nhan_luc = now();

  RETURN jsonb_build_object('ok', true, 'muc_thuong', v_thuong, 'ly_do', v_ly_do);
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_chon_uom_mam(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_chon_uom_mam(uuid, date) TO authenticated, service_role;

-- Bỏ chọn: gỡ ghi nhận KPI. Ý tưởng gửi TRƯỚC 16/08/2026 vẫn giữ tiền thưởng
-- khuyến khích (chuyển sang lý do 'hoi_to_khuyen_khich'); sau mốc thì mất tiền
-- vì suất được nhường cho ý tưởng khác.
CREATE OR REPLACE FUNCTION public.bhy_ideas_bo_chon_uom_mam(_idea_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_truoc_moc boolean;
BEGIN
  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  IF NOT (public.is_content_admin(auth.uid())
          OR public.bhy_ideas_la_truong_phong(v_idea.department_name)) THEN
    RAISE EXCEPTION 'Chỉ Trưởng phòng của phòng đề xuất (hoặc Phòng TCTH) được bỏ chọn';
  END IF;

  -- So theo GIỜ VIỆT NAM để biên ngày khớp với client (created_at là timestamptz,
  -- so thẳng với ::date sẽ lấy nửa đêm UTC — lệch 7 tiếng)
  v_truoc_moc := (v_idea.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') < '2026-08-16'::timestamp;

  IF v_truoc_moc THEN
    UPDATE public.portal_idea_awards
    SET duyet_cn = false,
        -- TSC đã duyệt thì ghi nhận vẫn còn hiệu lực, không gỡ theo
        ghi_nhan_kpi = duyet_tsc,
        muc_thuong = 100000,
        ly_do_thuong = 'hoi_to_khuyen_khich',
        nguoi_ghi_nhan = auth.uid(),
        ghi_nhan_luc = now()
    WHERE idea_id = _idea_id AND cap_do = 'Ươm mầm';
  ELSE
    -- Sau mốc hồi tố: gỡ hẳn suất của CN; nếu TSC đã duyệt thì giữ lại dòng
    UPDATE public.portal_idea_awards
    SET duyet_cn = false, ghi_nhan_kpi = duyet_tsc,
        muc_thuong = CASE WHEN duyet_tsc THEN muc_thuong ELSE 0 END,
        ly_do_thuong = CASE WHEN duyet_tsc THEN ly_do_thuong ELSE 'khong_chi' END
    WHERE idea_id = _idea_id AND cap_do = 'Ươm mầm';

    DELETE FROM public.portal_idea_awards
    WHERE idea_id = _idea_id AND cap_do = 'Ươm mầm'
      AND NOT duyet_cn AND NOT duyet_tsc;
  END IF;

  RETURN jsonb_build_object('ok', true, 'giu_thuong_hoi_to', v_truoc_moc);
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_bo_chon_uom_mam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_bo_chon_uom_mam(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) THEO DÕI SMP (web Trụ sở chính).
--
--    Quy chế mục 4 phân luồng ý tưởng trên SMP; điều kiện cấp Bén rễ ghi rõ:
--    "Ý tưởng có khả năng thử nghiệm tại Chi nhánh HOẶC những đề xuất/ý tưởng
--    được TSC phê duyệt 'Đồng ý/Đồng ý một phần'". Nên khi SMP đã ghi nhận thì
--    theo quy định ý tưởng cũng được ghi nhận — không phụ thuộc hạn mức tuần
--    của Chi nhánh (chỉ đạo 08/2026).
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_ideas
  ADD COLUMN IF NOT EXISTS smp_ma TEXT,
  ADD COLUMN IF NOT EXISTS smp_trang_thai TEXT NOT NULL DEFAULT 'chua_gui'
    CHECK (smp_trang_thai IN ('chua_gui', 'da_gui', 'dong_y', 'dong_y_mot_phan', 'khong_dong_y')),
  ADD COLUMN IF NOT EXISTS smp_cap_nhat_luc TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.portal_ideas.smp_trang_thai IS
  'Kết quả trên SMP (web TSC). dong_y / dong_y_mot_phan = TSC đã phê duyệt → đủ điều kiện ghi nhận cấp Bén rễ theo quy chế, không chiếm hạn mức tuần của Chi nhánh.';

-- Cột SMP là số liệu quản trị: chỉ Admin TCTH/System được đặt (đi qua trigger
-- chặn cột quản trị đã có của portal_ideas là chưa đủ vì cột mới) → RPC riêng.
CREATE OR REPLACE FUNCTION public.bhy_ideas_cap_nhat_smp(
  _idea_id uuid, _smp_ma text, _smp_trang_thai text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_ghi_nhan boolean := false;
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng TCTH / Quản trị hệ thống được cập nhật kết quả SMP';
  END IF;
  IF _smp_trang_thai NOT IN ('chua_gui','da_gui','dong_y','dong_y_mot_phan','khong_dong_y') THEN
    RAISE EXCEPTION 'Trạng thái SMP không hợp lệ: %', _smp_trang_thai;
  END IF;

  UPDATE public.portal_ideas
  SET smp_ma = nullif(btrim(coalesce(_smp_ma, '')), ''),
      smp_trang_thai = _smp_trang_thai,
      smp_cap_nhat_luc = now()
  WHERE id = _idea_id
  RETURNING * INTO v_idea;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  -- TSC phê duyệt "Đồng ý"/"Đồng ý một phần" → ghi nhận Bén rễ theo quy chế.
  -- Nguồn 'smp_tsc' nên KHÔNG chiếm suất hạn mức tuần của phòng.
  IF _smp_trang_thai IN ('dong_y', 'dong_y_mot_phan') THEN
    INSERT INTO public.portal_idea_awards
      (idea_id, cap_do, ghi_nhan_kpi, duyet_tsc, phong, muc_thuong, ly_do_thuong, ghi_chu)
    VALUES
      (_idea_id, 'Bén rễ', true, true, v_idea.department_name, 300000, 'trong_han_muc',
       'TSC phê duyệt trên SMP: ' || _smp_trang_thai)
    -- Chi nhánh đã duyệt trước đó thì GIỮ NGUYÊN duyet_cn — ghi nhận và tiền
    -- vẫn chỉ một lần nhờ khóa UNIQUE(idea_id, cap_do)
    ON CONFLICT (idea_id, cap_do) DO UPDATE
      SET ghi_nhan_kpi = true,
          duyet_tsc = true,
          ghi_chu = 'TSC phê duyệt trên SMP: ' || _smp_trang_thai;
    v_ghi_nhan := true;
  END IF;

  RETURN jsonb_build_object('ok', true, 'ghi_nhan_ben_re', v_ghi_nhan);
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_cap_nhat_smp(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_cap_nhat_smp(uuid, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) NẠP DỮ LIỆU CŨ — ý tưởng gửi trước 16/08/2026.
--
--    Tiền: mọi ý tưởng đều được thưởng Ươm mầm để khuyến khích phong trào
--          (chỉ đạo 08/2026), kể cả phần vượt hạn mức.
--    KPI:  KHÔNG tự chọn hộ ý tưởng nào (chỉ đạo 08/2026) — mọi dòng nạp vào
--          đều ghi_nhan_kpi = false. Trưởng phòng vào màn "Chọn ý tưởng Ươm
--          mầm" tự quyết định ý tưởng nào xứng đáng tính KPI trong hạn mức.
-- ---------------------------------------------------------------------------
INSERT INTO public.portal_idea_awards
  (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, phong, tuan_chon, muc_thuong, ly_do_thuong, ghi_chu)
SELECT
  i.id, 'Ươm mầm', false, false, i.department_name,
  date_trunc('week', i.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  100000, 'hoi_to_khuyen_khich',
  'Nạp dữ liệu trước 16/08/2026 — thưởng khuyến khích toàn bộ; ghi nhận KPI chờ Trưởng phòng chọn'
FROM public.portal_ideas i
WHERE (i.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') < '2026-08-16'::timestamp
ON CONFLICT (idea_id, cap_do) DO NOTHING;

-- Ý tưởng đang ở cấp Bén rễ trở lên: ghi nhận dòng Bén rễ (không có hạn mức
-- tuần nên ghi nhận KPI được ngay; đây là cấp đã qua sàng lọc của TCTH/Giám đốc)
INSERT INTO public.portal_idea_awards
  (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, phong, muc_thuong, ly_do_thuong, ghi_chu)
SELECT i.id, 'Bén rễ', true, true, i.department_name, 300000, 'trong_han_muc',
       'Nạp từ cấp độ phát triển hiện có trước 16/08/2026'
FROM public.portal_ideas i
WHERE i.development_level IN ('Bén rễ', 'Vươn cành', 'Lan tỏa')
ON CONFLICT (idea_id, cap_do) DO NOTHING;

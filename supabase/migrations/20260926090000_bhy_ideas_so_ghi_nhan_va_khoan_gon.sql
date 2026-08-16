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
--
-- AI CHỐT CẤP ĐỘ (chỉ đạo 08/2026, bổ sung): cơ chế lúc ban hành chưa tính tới
-- ràng buộc KPI, nên phân quyền chốt cấp độ được gom về một mối:
--   Ươm mầm    → Phòng TCTH TẠM GIỮ quyền, chốt với Trưởng phòng rồi chọn.
--                Để dạng CÔNG TẮC (bhy_ideas_cau_hinh.ai_chon_uom_mam): sau này
--                muốn trả quyền về Trưởng phòng thì đổi cấu hình, không phải sửa
--                mã nguồn hay chạy migration.
--   Bén rễ     → TCTH trình, Giám đốc phê duyệt. Trình LIÊN TỤC, không gom theo
--                tháng — ý tưởng chín lúc nào trình lúc đó.
--   Vươn cành,
--   Lan tỏa    → chỉ TCTH được đề xuất, đưa ra Hội đồng BHY Ideas chấm điểm
--                (giữ nguyên như migration 20260924).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) CẤU HÌNH VẬN HÀNH — đúng MỘT dòng (cùng nếp ct2_cau_hinh_thoi_gian)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bhy_ideas_cau_hinh (
  -- Khóa chính hằng số: bảng này chỉ được phép có đúng MỘT dòng
  id boolean PRIMARY KEY DEFAULT true CHECK (id),

  -- Ai được chốt ý tưởng Ươm mầm vào hạn mức tuần của phòng.
  -- 'tcth'         : Phòng TCTH chốt với Trưởng phòng rồi chọn (đang áp dụng)
  -- 'truong_phong' : trả quyền về Trưởng phòng từng phòng
  ai_chon_uom_mam TEXT NOT NULL DEFAULT 'tcth'
    CHECK (ai_chon_uom_mam IN ('tcth', 'truong_phong')),

  -- Trần ghi nhận Ươm mầm mỗi tuần mỗi phòng (mục 5 quy chế = 02).
  -- Để cấu hình được vì đây là con số của quy chế, không phải của mã nguồn.
  tran_uom_mam_moi_tuan INT NOT NULL DEFAULT 2
    CHECK (tran_uom_mam_moi_tuan BETWEEN 1 AND 20),

  nguoi_sua UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bhy_ideas_cau_hinh IS
  'Đúng MỘT dòng. Công tắc vận hành BHY Ideas: ai chốt Ươm mầm và trần ghi nhận mỗi tuần — đổi bằng cấu hình, không phải bằng migration.';

INSERT INTO public.bhy_ideas_cau_hinh (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.bhy_ideas_cau_hinh ENABLE ROW LEVEL SECURITY;

-- Cả chi nhánh đọc được: giao diện cần biết ai đang giữ quyền để hiện đúng màn
DROP POLICY IF EXISTS "Staff can view bhy ideas cau hinh" ON public.bhy_ideas_cau_hinh;
CREATE POLICY "Staff can view bhy ideas cau hinh"
  ON public.bhy_ideas_cau_hinh FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Content admins update bhy ideas cau hinh" ON public.bhy_ideas_cau_hinh;
CREATE POLICY "Content admins update bhy ideas cau hinh"
  ON public.bhy_ideas_cau_hinh FOR UPDATE TO authenticated
  USING (public.is_content_admin(auth.uid()))
  WITH CHECK (public.is_content_admin(auth.uid()));

-- Đọc cấu hình có mặc định an toàn: bảng lỡ rỗng thì vẫn chạy đúng quy chế
CREATE OR REPLACE FUNCTION public.bhy_ideas_cau_hinh()
RETURNS public.bhy_ideas_cau_hinh
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT c FROM public.bhy_ideas_cau_hinh c LIMIT 1),
    ROW(true, 'tcth', 2, NULL, now())::public.bhy_ideas_cau_hinh
  )
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_cau_hinh() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_cau_hinh() TO authenticated, service_role;

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
-- 2) Trưởng phòng của một phòng (theo hệ tên Ideas).
--
--    Hàm này GIỮ LẠI nhưng hiện KHÔNG có hiệu lực: cấu hình đang đặt
--    ai_chon_uom_mam = 'tcth' nên chỉ Phòng TCTH chốt Ươm mầm. Bật công tắc về
--    'truong_phong' là hàm có hiệu lực trở lại, không phải viết lại quyền.
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

-- Cổng quyền chốt Ươm mầm — đọc công tắc cấu hình. Mọi policy và RPC liên quan
-- gọi ĐÚNG hàm này, nên đổi quyền chỉ cần đổi một dòng cấu hình.
CREATE OR REPLACE FUNCTION public.bhy_ideas_duoc_chon_uom_mam(_phong_ideas text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_content_admin(auth.uid())
      OR ((public.bhy_ideas_cau_hinh()).ai_chon_uom_mam = 'truong_phong'
          AND public.bhy_ideas_la_truong_phong(_phong_ideas))
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_duoc_chon_uom_mam(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_duoc_chon_uom_mam(text) TO authenticated, service_role;

-- Giám đốc chi nhánh — người phê duyệt Bén rễ theo quy chế.
-- Nhận diện hai đường vì hệ chỉ cho mỗi user MỘT role: role 'bgd', hoặc chức
-- danh trên hồ sơ bắt đầu bằng 'Giám đốc' (tài khoản Giám đốc đang mang role
-- system_admin — xem migration 20260803090000). Admin TCTH KHÔNG nằm trong
-- nhóm này: TCTH trình, Giám đốc duyệt, hai vai tách bạch.
CREATE OR REPLACE FUNCTION public.bhy_ideas_la_giam_doc()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'bgd'::app_role)
      OR public.is_branch_director()
      OR public.has_role(auth.uid(), 'system_admin'::app_role)
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_la_giam_doc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_la_giam_doc() TO authenticated, service_role;

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

  -- Trạng thái của dòng sổ. Cấp Bén rễ theo quy chế phải qua Giám đốc phê
  -- duyệt: TCTH trình → 'cho_gd_duyet' (chưa tính KPI, chưa chi tiền) →
  -- Giám đốc quyết → 'da_ghi_nhan' hoặc 'tu_choi'.
  -- Ươm mầm không qua Giám đốc nên vào thẳng 'da_ghi_nhan'.
  trang_thai TEXT NOT NULL DEFAULT 'da_ghi_nhan'
    CHECK (trang_thai IN ('cho_gd_duyet', 'da_ghi_nhan', 'tu_choi')),

  -- Dấu vết TCTH đã CHỐT VỚI TRƯỞNG PHÒNG trước khi đưa vào hạn mức.
  -- Quyền chốt Ươm mầm nằm ở TCTH nhưng người hiểu ý tưởng là Trưởng phòng —
  -- ghi lại để sau này đối chiếu, không phải hỏi lại nhau qua tin nhắn.
  chot_voi_tp BOOLEAN NOT NULL DEFAULT false,
  chot_voi_tp_luc TIMESTAMP WITH TIME ZONE,
  chot_voi_tp_ghi_chu TEXT,

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
    CHECK (NOT ghi_nhan_kpi OR duyet_cn OR duyet_tsc),
  -- Chờ Giám đốc duyệt hoặc đã bị từ chối thì TUYỆT ĐỐI chưa tính vào KPI —
  -- KPI phải đo đúng, không được cộng trước phần chưa có người quyết
  CONSTRAINT chua_duyet_thi_chua_tinh_kpi
    CHECK (trang_thai = 'da_ghi_nhan' OR NOT ghi_nhan_kpi)
);

CREATE INDEX idx_pia_idea ON public.portal_idea_awards (idea_id);
CREATE INDEX idx_pia_han_muc ON public.portal_idea_awards (phong, tuan_chon)
  WHERE cap_do = 'Ươm mầm' AND ghi_nhan_kpi AND duyet_cn;
-- Hàng chờ của Giám đốc: đọc theo thứ tự trình, luồng liên tục nên phải nhanh
CREATE INDEX idx_pia_cho_gd_duyet ON public.portal_idea_awards (ghi_nhan_luc)
  WHERE trang_thai = 'cho_gd_duyet';

ALTER TABLE public.portal_idea_awards ENABLE ROW LEVEL SECURITY;

-- Cán bộ xem được sổ (biết ý tưởng mình đạt cấp nào, được thưởng bao nhiêu)
CREATE POLICY "Staff can view idea awards"
  ON public.portal_idea_awards FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Ghi nhận Ươm mầm: theo công tắc cấu hình (hiện là TCTH); admin ghi mọi cấp
CREATE POLICY "Heads record uom mam for own department"
  ON public.portal_idea_awards FOR INSERT TO authenticated
  WITH CHECK (
    public.is_content_admin(auth.uid())
    OR (cap_do = 'Ươm mầm' AND public.bhy_ideas_duoc_chon_uom_mam(phong))
  );

CREATE POLICY "Heads revoke own uom mam"
  ON public.portal_idea_awards FOR DELETE TO authenticated
  USING (
    public.is_content_admin(auth.uid())
    OR (cap_do = 'Ươm mầm' AND public.bhy_ideas_duoc_chon_uom_mam(phong))
  );

CREATE POLICY "Content admins manage idea awards"
  ON public.portal_idea_awards FOR UPDATE TO authenticated
  USING (public.is_content_admin(auth.uid()))
  WITH CHECK (public.is_content_admin(auth.uid()));

-- Giám đốc phê duyệt Bén rễ qua RPC bhy_ideas_gd_duyet_ben_re (SECURITY
-- DEFINER) nên KHÔNG mở policy UPDATE cho vai này: mọi thay đổi của Giám đốc
-- đi qua đúng một cửa, có ghi nguoi_duyet/duyet_luc, không sửa cột khác được.

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
  v_tran integer;
BEGIN
  IF NEW.cap_do <> 'Ươm mầm' OR NOT NEW.ghi_nhan_kpi OR NOT NEW.duyet_cn THEN
    RETURN NEW;
  END IF;

  v_tran := (public.bhy_ideas_cau_hinh()).tran_uom_mam_moi_tuan;

  SELECT count(*) INTO v_dem
  FROM public.portal_idea_awards a
  WHERE a.cap_do = 'Ươm mầm'
    AND a.ghi_nhan_kpi
    AND a.duyet_cn
    AND a.phong = NEW.phong
    AND a.tuan_chon = NEW.tuan_chon
    AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_dem >= v_tran THEN
    RAISE EXCEPTION 'Phòng % đã dùng hết hạn mức % ý tưởng Ươm mầm của tuần % — bỏ chọn một ý tưởng khác trước khi chọn ý tưởng này',
      NEW.phong, to_char(v_tran, 'FM00'), to_char(NEW.tuan_chon, 'DD/MM/YYYY');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pia_gac_han_muc_uom_mam
  BEFORE INSERT OR UPDATE ON public.portal_idea_awards
  FOR EACH ROW EXECUTE FUNCTION public.f_pia_gac_han_muc_uom_mam();

-- ---------------------------------------------------------------------------
-- 5) RPC chọn / bỏ chọn ý tưởng Ươm mầm vào hạn mức tuần.
--
--    Quyền theo công tắc bhy_ideas_cau_hinh.ai_chon_uom_mam — hiện là 'tcth':
--    Phòng TCTH chốt với Trưởng phòng rồi chọn, ghi lại dấu vết đã chốt
--    (_chot_voi_tp, _ghi_chu) để đối chiếu về sau.
--
--    MỐC HỒI TỐ 16/08/2026 (chỉ đạo 08/2026): ý tưởng gửi TRƯỚC mốc này được
--    thưởng tiền để khuyến khích phong trào dù có được chọn vào hạn mức hay
--    không. Sau mốc, chỉ ý tưởng trong hạn mức mới có tiền.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_chon_uom_mam(
  _idea_id uuid,
  _tuan_chon date,
  _chot_voi_tp boolean DEFAULT false,
  _ghi_chu text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_thuong integer;
  v_ly_do text;
  v_chot_luc timestamptz;
BEGIN
  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  IF NOT public.bhy_ideas_duoc_chon_uom_mam(v_idea.department_name) THEN
    RAISE EXCEPTION 'Quyền chốt ý tưởng Ươm mầm đang thuộc %',
      CASE (public.bhy_ideas_cau_hinh()).ai_chon_uom_mam
        WHEN 'tcth' THEN 'Phòng Tổ chức tổng hợp'
        ELSE 'Trưởng phòng của phòng đề xuất'
      END;
  END IF;

  -- Trong hạn mức → được thưởng theo đơn giá Ươm mầm
  v_thuong := 100000;
  v_ly_do := 'trong_han_muc';
  v_chot_luc := CASE WHEN _chot_voi_tp THEN now() ELSE NULL END;

  INSERT INTO public.portal_idea_awards
    (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, phong, tuan_chon, muc_thuong, ly_do_thuong,
     trang_thai, chot_voi_tp, chot_voi_tp_luc, chot_voi_tp_ghi_chu)
  VALUES
    (_idea_id, 'Ươm mầm', true, true, v_idea.department_name,
     date_trunc('week', _tuan_chon)::date, v_thuong, v_ly_do,
     'da_ghi_nhan', _chot_voi_tp, v_chot_luc, nullif(btrim(coalesce(_ghi_chu, '')), ''))
  ON CONFLICT (idea_id, cap_do) DO UPDATE
    SET ghi_nhan_kpi = true,
        duyet_cn = true,
        trang_thai = 'da_ghi_nhan',
        tuan_chon = date_trunc('week', _tuan_chon)::date,
        muc_thuong = GREATEST(public.portal_idea_awards.muc_thuong, v_thuong),
        ly_do_thuong = v_ly_do,
        -- Đã chốt với Trưởng phòng rồi thì lần chọn sau không xóa dấu vết đó
        chot_voi_tp = public.portal_idea_awards.chot_voi_tp OR _chot_voi_tp,
        chot_voi_tp_luc = COALESCE(public.portal_idea_awards.chot_voi_tp_luc, v_chot_luc),
        chot_voi_tp_ghi_chu = COALESCE(
          nullif(btrim(coalesce(_ghi_chu, '')), ''), public.portal_idea_awards.chot_voi_tp_ghi_chu),
        nguoi_ghi_nhan = auth.uid(),
        ghi_nhan_luc = now();

  RETURN jsonb_build_object('ok', true, 'muc_thuong', v_thuong, 'ly_do', v_ly_do);
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_chon_uom_mam(uuid, date, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_chon_uom_mam(uuid, date, boolean, text) TO authenticated, service_role;

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

  IF NOT public.bhy_ideas_duoc_chon_uom_mam(v_idea.department_name) THEN
    RAISE EXCEPTION 'Quyền chốt ý tưởng Ươm mầm đang thuộc %',
      CASE (public.bhy_ideas_cau_hinh()).ai_chon_uom_mam
        WHEN 'tcth' THEN 'Phòng Tổ chức tổng hợp'
        ELSE 'Trưởng phòng của phòng đề xuất'
      END;
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
-- 5b) THƯỞNG LŨY KẾ — áp cho MỌI cấp, MỌI trường hợp (chỉ đạo 08/2026).
--
--     Khi một ý tưởng được công nhận lên cấp X, các cấp thấp hơn mà ý tưởng
--     CHƯA từng được trả tiền sẽ được trả bù. Ý tưởng vượt cấp không thiệt,
--     ý tưởng đi tuần tự không được trả trùng (khóa UNIQUE(idea_id, cap_do)).
--
--     Dòng bù chỉ mang TIỀN: ghi_nhan_kpi = false, duyet_cn = false. Hai trục
--     tách bạch — tiền thì khuyến khích được, KPI thì phải đúng hạn mức.
--     Bản SQL này là bản có hiệu lực; src/lib/ideaRewards.ts (thuongLuyKe) là
--     bản dựng số liệu để hiện lên màn hình, hai bên dùng chung đơn giá.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_thuong_luy_ke(_idea_id uuid, _cap_moi text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap text[] := ARRAY['Ươm mầm', 'Bén rễ', 'Vươn cành', 'Lan tỏa'];
  v_don_gia integer[] := ARRAY[100000, 300000, 1000000, 2000000];
  v_dich integer;
  v_i integer;
  v_n integer;
  v_phong text;
  v_tong integer := 0;
  v_ghi_chu text;
BEGIN
  v_dich := array_position(v_cap, _cap_moi);
  IF v_dich IS NULL THEN
    RETURN 0;
  END IF;

  SELECT department_name INTO v_phong FROM public.portal_ideas WHERE id = _idea_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_ghi_chu := 'Thưởng lũy kế khi công nhận cấp ' || _cap_moi;

  FOR v_i IN 1 .. v_dich - 1 LOOP
    INSERT INTO public.portal_idea_awards
      (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, duyet_tsc, phong,
       muc_thuong, ly_do_thuong, ghi_chu)
    VALUES
      (_idea_id, v_cap[v_i], false, false, false, v_phong,
       v_don_gia[v_i], 'trong_han_muc', v_ghi_chu)
    ON CONFLICT (idea_id, cap_do) DO UPDATE
      SET muc_thuong = v_don_gia[v_i],
          ly_do_thuong = 'trong_han_muc',
          ghi_chu = v_ghi_chu
      -- Chỉ trả bù cấp CHƯA có tiền — không bao giờ trả trùng
      WHERE public.portal_idea_awards.muc_thuong = 0;

    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN
      v_tong := v_tong + v_don_gia[v_i];
    END IF;
  END LOOP;

  RETURN v_tong;
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_thuong_luy_ke(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_thuong_luy_ke(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 5c) LUỒNG BÉN RỄ — TCTH trình LIÊN TỤC, Giám đốc phê duyệt.
--
--     Quy chế: cấp Bén rễ do Giám đốc chi nhánh quyết định. Trình liên tục
--     (chỉ đạo 08/2026) — ý tưởng chín lúc nào trình lúc đó, không gom theo
--     tháng, để không giữ ý tưởng nằm chờ hết kỳ.
--
--     Cấp Bén rễ KHÔNG có hạn mức tuần: hạn mức 02/tuần/phòng chỉ đặt ở Ươm
--     mầm (mục 5 quy chế). Nhưng dòng sổ vẫn phải qua trạng thái 'cho_gd_duyet'
--     để KPI không cộng phần chưa có người quyết.
-- ---------------------------------------------------------------------------

-- Trigger chặn cột quản trị của portal_ideas (migration 20260811090000) chỉ cho
-- admin nội dung đổi development_level. Giám đốc duyệt Bén rễ qua RPC dưới đây
-- là việc đúng thẩm quyền nhưng tài khoản có thể mang role 'bgd' (không phải
-- admin nội dung) → mở đúng một khe: cờ phiên bhy.ideas_ghi_so do RPC tự đặt,
-- phạm vi giao dịch. Máy khách không gọi được set_config qua PostgREST (hàm
-- nằm ở pg_catalog, không thuộc schema public) nên không lách được đường này.
CREATE OR REPLACE FUNCTION public.f_portal_ideas_chan_cot_quan_tri()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.is_content_admin(auth.uid())
     OR current_setting('bhy.ideas_ghi_so', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.development_level := 'Ươm mầm';
    NEW.council_proposal := false;
    NEW.seed_likes := 0;
    NEW.seed_unlikes := 0;
    NEW.legacy_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.development_level IS DISTINCT FROM OLD.development_level
     OR NEW.council_proposal IS DISTINCT FROM OLD.council_proposal
     OR NEW.seed_likes IS DISTINCT FROM OLD.seed_likes
     OR NEW.seed_unlikes IS DISTINCT FROM OLD.seed_unlikes
     OR NEW.legacy_id IS DISTINCT FROM OLD.legacy_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cấp độ phát triển, đề xuất Hội đồng và số liệu gốc chỉ quản trị viên cập nhật được';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.f_portal_ideas_chan_cot_quan_tri() FROM PUBLIC, anon, authenticated;

-- TCTH trình một ý tưởng lên Giám đốc xin công nhận Bén rễ
CREATE OR REPLACE FUNCTION public.bhy_ideas_trinh_ben_re(_idea_id uuid, _ghi_chu text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_da_ghi_nhan boolean;
  v_n integer;
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổ chức tổng hợp trình Giám đốc công nhận cấp Bén rễ';
  END IF;

  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.portal_idea_awards
    WHERE idea_id = _idea_id AND cap_do = 'Bén rễ' AND trang_thai = 'da_ghi_nhan'
  ) INTO v_da_ghi_nhan;

  IF v_da_ghi_nhan THEN
    RETURN jsonb_build_object('ok', true, 'da_ghi_nhan', true, 'trinh_moi', false);
  END IF;

  INSERT INTO public.portal_idea_awards
    (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, duyet_tsc, phong,
     muc_thuong, ly_do_thuong, trang_thai, ghi_chu)
  VALUES
    (_idea_id, 'Bén rễ', false, false, false, v_idea.department_name,
     0, 'khong_chi', 'cho_gd_duyet', nullif(btrim(coalesce(_ghi_chu, '')), ''))
  ON CONFLICT (idea_id, cap_do) DO UPDATE
    SET trang_thai = 'cho_gd_duyet',
        ghi_chu = COALESCE(
          nullif(btrim(coalesce(_ghi_chu, '')), ''), public.portal_idea_awards.ghi_chu),
        nguoi_ghi_nhan = auth.uid(),
        -- Trình lại hồ sơ ĐANG chờ thì giữ nguyên mốc trình đầu tiên: số ngày
        -- chờ là thước đo để đôn đốc, bấm lại nút không được xóa nó đi
        ghi_nhan_luc = CASE
          WHEN public.portal_idea_awards.trang_thai = 'cho_gd_duyet'
            THEN public.portal_idea_awards.ghi_nhan_luc
          ELSE now()
        END,
        nguoi_duyet = NULL,
        duyet_luc = NULL
    WHERE public.portal_idea_awards.trang_thai <> 'da_ghi_nhan';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'da_ghi_nhan', false, 'trinh_moi', v_n > 0);
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_trinh_ben_re(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_trinh_ben_re(uuid, text) TO authenticated, service_role;

-- Giám đốc duyệt / từ chối một ý tưởng đang chờ
CREATE OR REPLACE FUNCTION public.bhy_ideas_gd_duyet_ben_re(
  _idea_id uuid, _dong_y boolean, _ghi_chu text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award public.portal_idea_awards%ROWTYPE;
  v_don_gia integer := 300000;
  v_luy_ke integer := 0;
BEGIN
  IF NOT public.bhy_ideas_la_giam_doc() THEN
    RAISE EXCEPTION 'Chỉ Giám đốc chi nhánh phê duyệt cấp Bén rễ';
  END IF;

  SELECT * INTO v_award
  FROM public.portal_idea_awards
  WHERE idea_id = _idea_id AND cap_do = 'Bén rễ';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ý tưởng này chưa được Phòng TCTH trình xin công nhận Bén rễ';
  END IF;
  IF v_award.trang_thai <> 'cho_gd_duyet' THEN
    RAISE EXCEPTION 'Ý tưởng không còn ở trạng thái chờ duyệt (hiện: %)', v_award.trang_thai;
  END IF;

  IF _dong_y THEN
    UPDATE public.portal_idea_awards
    SET trang_thai = 'da_ghi_nhan',
        ghi_nhan_kpi = true,
        duyet_cn = true,
        muc_thuong = GREATEST(muc_thuong, v_don_gia),
        ly_do_thuong = 'trong_han_muc',
        nguoi_duyet = auth.uid(),
        duyet_luc = now(),
        ghi_chu = COALESCE(nullif(btrim(coalesce(_ghi_chu, '')), ''), ghi_chu)
    WHERE id = v_award.id;

    -- Trả bù các cấp thấp hơn chưa từng có tiền
    v_luy_ke := public.bhy_ideas_thuong_luy_ke(_idea_id, 'Bén rễ');

    -- Đồng bộ cấp độ hiển thị của ý tưởng (chỉ nâng, không hạ)
    PERFORM set_config('bhy.ideas_ghi_so', 'on', true);
    UPDATE public.portal_ideas
    SET development_level = 'Bén rễ'
    WHERE id = _idea_id AND development_level = 'Ươm mầm';
    PERFORM set_config('bhy.ideas_ghi_so', 'off', true);
  ELSE
    UPDATE public.portal_idea_awards
    SET trang_thai = 'tu_choi',
        ghi_nhan_kpi = false,
        duyet_cn = false,
        muc_thuong = 0,
        ly_do_thuong = 'khong_chi',
        nguoi_duyet = auth.uid(),
        duyet_luc = now(),
        ghi_chu = COALESCE(nullif(btrim(coalesce(_ghi_chu, '')), ''), ghi_chu)
    WHERE id = v_award.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'dong_y', _dong_y,
    'muc_thuong', CASE WHEN _dong_y THEN v_don_gia ELSE 0 END,
    'thuong_luy_ke', v_luy_ke
  );
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_gd_duyet_ben_re(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_gd_duyet_ben_re(uuid, boolean, text) TO authenticated, service_role;

-- Hàng chờ của Giám đốc — đọc một phát đủ thông tin để quyết, khỏi ghép ở máy
-- khách. Ai cũng gọi được nhưng chỉ trả dữ liệu công khai của ý tưởng.
CREATE OR REPLACE FUNCTION public.bhy_ideas_viec_cua_giam_doc()
RETURNS TABLE (
  idea_id uuid,
  title text,
  proposer text,
  expected_benefits text,
  phong text,
  created_at timestamptz,
  trinh_luc timestamptz,
  nguoi_trinh text,
  ghi_chu text,
  so_ngay_cho integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.title, i.proposer, i.expected_benefits, a.phong, i.created_at,
    a.ghi_nhan_luc,
    (SELECT p.full_name FROM public.profiles p WHERE p.user_id = a.nguoi_ghi_nhan LIMIT 1),
    a.ghi_chu,
    GREATEST(0, EXTRACT(DAY FROM (now() - a.ghi_nhan_luc))::int)
  FROM public.portal_idea_awards a
  JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE a.trang_thai = 'cho_gd_duyet'
    AND a.cap_do = 'Bén rễ'
    AND public.is_staff(auth.uid())
  ORDER BY a.ghi_nhan_luc
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_viec_cua_giam_doc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_viec_cua_giam_doc() TO authenticated, service_role;

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
      (idea_id, cap_do, ghi_nhan_kpi, duyet_tsc, phong, muc_thuong, ly_do_thuong,
       trang_thai, ghi_chu)
    VALUES
      (_idea_id, 'Bén rễ', true, true, v_idea.department_name, 300000, 'trong_han_muc',
       'da_ghi_nhan', 'TSC phê duyệt trên SMP: ' || _smp_trang_thai)
    -- Chi nhánh đã duyệt trước đó thì GIỮ NGUYÊN duyet_cn — ghi nhận và tiền
    -- vẫn chỉ một lần nhờ khóa UNIQUE(idea_id, cap_do).
    -- TSC phê duyệt là đủ điều kiện ghi nhận theo quy chế nên dòng đang chờ
    -- Giám đốc duyệt cũng chốt luôn, không bắt trình lại.
    ON CONFLICT (idea_id, cap_do) DO UPDATE
      SET ghi_nhan_kpi = true,
          duyet_tsc = true,
          trang_thai = 'da_ghi_nhan',
          muc_thuong = GREATEST(public.portal_idea_awards.muc_thuong, 300000),
          ly_do_thuong = 'trong_han_muc',
          ghi_chu = 'TSC phê duyệt trên SMP: ' || _smp_trang_thai;

    -- Cùng nguyên tắc lũy kế với đường Giám đốc duyệt
    PERFORM public.bhy_ideas_thuong_luy_ke(_idea_id, 'Bén rễ');

    UPDATE public.portal_ideas
    SET development_level = 'Bén rễ'
    WHERE id = _idea_id AND development_level = 'Ươm mầm';

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
--          đều ghi_nhan_kpi = false. Phòng TCTH vào màn "Chọn ý tưởng Ươm mầm",
--          chốt với từng Trưởng phòng rồi mới đánh dấu ý tưởng nào tính KPI
--          trong hạn mức tuần.
-- ---------------------------------------------------------------------------
INSERT INTO public.portal_idea_awards
  (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, phong, tuan_chon, muc_thuong, ly_do_thuong, ghi_chu)
SELECT
  i.id, 'Ươm mầm', false, false, i.department_name,
  date_trunc('week', i.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  100000, 'hoi_to_khuyen_khich',
  'Nạp dữ liệu trước 16/08/2026 — thưởng khuyến khích toàn bộ; ghi nhận KPI chờ TCTH chốt với Trưởng phòng'
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

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
  -- Ươm mầm bắt buộc có tuần chọn để đếm hạn mức
  CONSTRAINT uom_mam_phai_co_tuan
    CHECK (cap_do <> 'Ươm mầm' OR tuan_chon IS NOT NULL)
);

CREATE INDEX idx_pia_idea ON public.portal_idea_awards (idea_id);
CREATE INDEX idx_pia_han_muc ON public.portal_idea_awards (phong, tuan_chon)
  WHERE cap_do = 'Ươm mầm' AND ghi_nhan_kpi;

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
--    Chỉ đếm dòng có ghi_nhan_kpi = true — dòng thưởng hồi tố (không ghi nhận)
--    không chiếm suất. Admin cũng bị chặn: hạn mức là để KPI đo lường chuẩn,
--    không phải thứ nới tay được.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_pia_gac_han_muc_uom_mam()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_dem integer;
BEGIN
  IF NEW.cap_do <> 'Ươm mầm' OR NOT NEW.ghi_nhan_kpi THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_dem
  FROM public.portal_idea_awards a
  WHERE a.cap_do = 'Ươm mầm'
    AND a.ghi_nhan_kpi
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
    (idea_id, cap_do, ghi_nhan_kpi, phong, tuan_chon, muc_thuong, ly_do_thuong)
  VALUES
    (_idea_id, 'Ươm mầm', true, v_idea.department_name,
     date_trunc('week', _tuan_chon)::date, v_thuong, v_ly_do)
  ON CONFLICT (idea_id, cap_do) DO UPDATE
    SET ghi_nhan_kpi = true,
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
    SET ghi_nhan_kpi = false,
        muc_thuong = 100000,
        ly_do_thuong = 'hoi_to_khuyen_khich',
        nguoi_ghi_nhan = auth.uid(),
        ghi_nhan_luc = now()
    WHERE idea_id = _idea_id AND cap_do = 'Ươm mầm';
  ELSE
    DELETE FROM public.portal_idea_awards
    WHERE idea_id = _idea_id AND cap_do = 'Ươm mầm';
  END IF;

  RETURN jsonb_build_object('ok', true, 'giu_thuong_hoi_to', v_truoc_moc);
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_bo_chon_uom_mam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_bo_chon_uom_mam(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) NẠP DỮ LIỆU CŨ — ý tưởng gửi trước 16/08/2026.
--
--    Tiền: mọi ý tưởng đều được thưởng Ươm mầm để khuyến khích phong trào
--          (chỉ đạo 08/2026), kể cả phần vượt hạn mức.
--    KPI:  chỉ 02 ý tưởng/tuần/phòng được ghi nhận — chọn theo thứ tự gửi
--          sớm nhất trong tuần làm mặc định; Trưởng phòng đổi lại được ở màn
--          "Chọn ý tưởng Ươm mầm".
-- ---------------------------------------------------------------------------
INSERT INTO public.portal_idea_awards
  (idea_id, cap_do, ghi_nhan_kpi, phong, tuan_chon, muc_thuong, ly_do_thuong, ghi_chu)
SELECT
  x.id, 'Ươm mầm', x.thu_tu <= 2, x.department_name, x.tuan, 100000,
  CASE WHEN x.thu_tu <= 2 THEN 'trong_han_muc' ELSE 'hoi_to_khuyen_khich' END,
  'Nạp từ dữ liệu trước 16/08/2026 — thưởng khuyến khích toàn bộ, ghi nhận KPI theo hạn mức'
FROM (
  SELECT i.id, i.department_name,
         date_trunc('week', i.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS tuan,
         row_number() OVER (
           PARTITION BY i.department_name,
                        date_trunc('week', i.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
           ORDER BY i.created_at
         ) AS thu_tu
  FROM public.portal_ideas i
  WHERE (i.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') < '2026-08-16'::timestamp
) x
ON CONFLICT (idea_id, cap_do) DO NOTHING;

-- Ý tưởng đang ở cấp Bén rễ: ghi nhận thêm dòng Bén rễ (không có hạn mức tuần)
INSERT INTO public.portal_idea_awards
  (idea_id, cap_do, ghi_nhan_kpi, phong, muc_thuong, ly_do_thuong, ghi_chu)
SELECT i.id, 'Bén rễ', true, i.department_name, 300000, 'trong_han_muc',
       'Nạp từ cấp độ phát triển hiện có trước 16/08/2026'
FROM public.portal_ideas i
WHERE i.development_level IN ('Bén rễ', 'Vươn cành', 'Lan tỏa')
ON CONFLICT (idea_id, cap_do) DO NOTHING;

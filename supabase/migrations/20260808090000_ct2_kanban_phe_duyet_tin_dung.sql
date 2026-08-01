-- ============================================================================
-- CHIÊU THỨC 2 — Kanban PHÊ DUYỆT TÍN DỤNG (PDTD) cho các Phòng có cấp tín dụng
--
-- Đây là bàn Kanban THỨ HAI, chỉ bật cho phòng nào thật sự cấp tín dụng (KHDN,
-- Bán lẻ, HTTD, các PGD). Đơn vị theo dõi là HỒ SƠ TÍN DỤNG của một khách hàng
-- cụ thể, KHÔNG phải "đầu việc" chung — nên tách bảng riêng thay vì nhét thêm
-- cột vào ct2_dau_viec.
--
-- ---------------------------------------------------------------------------
-- CĂN CỨ: đọc board Miro PDTD đang chạy của Phòng KHDN (47 hồ sơ, 19 đang
-- chạy) theo đúng trình tự quy chế phan-tich-kanban §B1. Sáu lỗi dữ liệu thật
-- quan sát được, mỗi lỗi dẫn tới một quyết định thiết kế ở đây:
--
--  1. SỐ TIỀN nằm trong Tags dạng chữ: "160 ty", "180 ty", "30  tỷ", "250",
--     "31". Hệ quả: không cộng được tổng dư nợ đang trình, không sắp xếp theo
--     quy mô, không lọc "hồ sơ trên 100 tỷ".
--     → Ở đây `so_tien` là NUMERIC, đơn vị TRIỆU ĐỒNG. Nhập bằng ô số.
--
--  2. NGÀY cũng nằm trong Tags ("31/07/2026", "15/04/2026") dù bảng ĐÃ CÓ hai
--     cột ngày. Dữ liệu ngày nằm rải ba chỗ → không lọc được chỗ nào cho đủ.
--     → Mỗi loại ngày một cột date riêng, có ý nghĩa rõ ràng.
--
--  3. "Đến hạn GHTD 2 tháng tới" bị để thành MỘT TRẠNG THÁI trong cùng cột
--     Status với 6 bước quy trình. Hệ quả: 4 hồ sơ nằm đó không ai biết đang ở
--     bước nào, mà tiến trình cũng bị nhiễu thêm một cột không phải tiến trình.
--     → Tách hẳn: `ngay_den_han_ghtd` là một TRƯỜNG NGÀY. Hồ sơ sắp đến hạn
--       hiện ở dải cảnh báo riêng, vẫn giữ nguyên bước thật của nó.
--
--  4. HAI cột người ("Assignee" và "Assigned To") cùng gán người → đúng lỗi
--     B3.3 "nhiều người ngang vai thì không ai thực sự chịu trách nhiệm".
--     → Một cột `can_bo` duy nhất. Người theo dõi là vai trò khác, tên khác.
--
--  5. TÊN HỒ SƠ trộn tên khách hàng với loại việc: "Onsen Hội Vân" (chỉ tên KH)
--     cạnh "Tăng GHTD Công ty Thành Đạt" (việc + KH). Không nhóm được theo
--     khách hàng, không đếm được mỗi loại hồ sơ bao nhiêu.
--     → Tách `khach_hang` và `loai_ho_so` thành hai trường.
--
--  6. Nhãn trùng nghĩa khác chính tả: "Tái Cấp"/"Tai cap"/"tái cấp";
--     "15 tỷ"/"15 ty"; Priority vừa "High" vừa "H"; Category có 3 lựa chọn rỗng.
--     → Mọi phân loại đều là danh mục đóng có CHECK, không cho gõ tay.
--
-- Ngoài ra: nhiều hồ sơ đang trình mà KHÔNG có ngày nào (kể cả hồ sơ 160 tỷ
-- đang trình LĐ Chi nhánh). Ở đây `han_xu_ly` là NOT NULL — không có hạn thì
-- không biết đúng hẹn hay không, đó là toàn bộ lý do tồn tại của bàn Kanban.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Phòng nào được bật bàn PDTD
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct2_phong_pdtd (
  phong uuid PRIMARY KEY REFERENCES public.departments(id) ON DELETE CASCADE,
  bat boolean NOT NULL DEFAULT true,
  ghi_chu text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bật sẵn cho các phòng có cấp tín dụng (TCTH bật/tắt thêm sau)
INSERT INTO public.ct2_phong_pdtd (phong, ghi_chu)
SELECT d.id, 'Bật sẵn theo nghiệp vụ cấp tín dụng'
  FROM public.departments d
 WHERE d.code IN ('KHDN','BL','HTTD')
ON CONFLICT (phong) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ct2_phong_co_pdtd(_phong uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ct2_phong_pdtd p WHERE p.phong = _phong AND p.bat
  )
$$;
REVOKE ALL ON FUNCTION public.ct2_phong_co_pdtd(uuid) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- 2) Hồ sơ tín dụng
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.ct2_ma_hs_seq;

CREATE TABLE IF NOT EXISTS public.ct2_ho_so_tin_dung (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phong uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  ma_hs text UNIQUE,                       -- KHDN-TD-2608-012 (trigger tự sinh)

  -- Tách bạch KHÁCH HÀNG với LOẠI VIỆC (lỗi 5)
  khach_hang text NOT NULL CHECK (char_length(trim(khach_hang)) >= 3),
  loai_ho_so text NOT NULL CHECK (loai_ho_so IN (
    'CAP_MOI',        -- Cấp mới giới hạn tín dụng
    'TAI_CAP',        -- Tái cấp GHTD
    'DIEU_CHINH',     -- Điều chỉnh giới hạn / kỳ hạn
    'CO_CAU_NO',      -- Cơ cấu nợ
    'DU_AN',          -- Cho vay dự án / trung dài hạn
    'GIAI_NGAN'       -- Hoàn thiện hồ sơ giải ngân
  )),

  -- SỐ THẬT, không phải nhãn chữ (lỗi 1). Đơn vị: TRIỆU ĐỒNG.
  so_tien numeric(14,0) NOT NULL CHECK (so_tien > 0),
  ky_han text NOT NULL DEFAULT 'NGAN_HAN' CHECK (ky_han IN ('NGAN_HAN','TRUNG_DAI_HAN')),

  -- Cấp có thẩm quyền phê duyệt — quyết định hồ sơ phải đi tới bước nào
  cap_phe_duyet text NOT NULL CHECK (cap_phe_duyet IN ('PHONG','CHI_NHANH','TSC')),

  trang_thai text NOT NULL DEFAULT 'THU_THAP' CHECK (trang_thai IN (
    'THU_THAP',        -- (1) Thu thập hồ sơ
    'TRINH_LDP',       -- (2) Trình Lãnh đạo Phòng
    'TRINH_LDCN',      -- (3) Trình Lãnh đạo Chi nhánh
    'TRINH_TSC',       -- (4) Trình cấp PDTD Trụ sở chính
    'HOAN_THIEN_GN',   -- (5) Hoàn thiện hồ sơ giải ngân
    'HOAN_THANH',      -- (6) Hoàn thành
    'TU_CHOI'          -- Từ chối / dừng cấp
  )),

  -- DUY NHẤT 01 cán bộ tín dụng chịu trách nhiệm (lỗi 4)
  can_bo uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  lanh_dao_theo_doi uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Mỗi loại ngày một cột riêng, có nghĩa rõ ràng (lỗi 2)
  ngay_nhan date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  han_xu_ly date NOT NULL,
  -- Hạn mức hiện tại đến hạn ngày nào — TRƯỜNG NGÀY, không phải cột Kanban (lỗi 3)
  ngay_den_han_ghtd date,
  ngay_hoan_thanh date,

  -- Bước trình là CHỜ NGƯỜI KHÁC: đồng hồ trách nhiệm chuyển sang người giữ
  nguoi_dang_giu uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  giu_tu timestamptz,
  nhip_gan_nhat timestamptz,

  ly_do_tu_choi text,
  ghi_chu text,
  nguoi_tao uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ct2_hs_han_hop_le CHECK (han_xu_ly >= ngay_nhan)
);

-- ---------------------------------------------------------------------------
-- 3) Nhật ký hồ sơ — append-only, cùng triết lý với nhịp PDCA
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct2_nhip_ho_so (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ho_so_id uuid NOT NULL REFERENCES public.ct2_ho_so_tin_dung(id) ON DELETE CASCADE,
  nguoi_ghi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buoc text NOT NULL,                    -- trạng thái tại thời điểm ghi
  noi_dung text NOT NULL CHECK (char_length(noi_dung) >= 10),
  vuong_mac text,
  ghi_luc timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4) Trigger nghiệp vụ
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.f_ct2_hs_truoc_tao()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2hi$
DECLARE ma_phong text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NOT public.ct2_phong_co_pdtd(NEW.phong) THEN
    RAISE EXCEPTION 'Phòng này chưa bật bàn Phê duyệt tín dụng. Liên hệ Phòng TCTH để bật.';
  END IF;
  -- Cán bộ tín dụng tự mở hồ sơ của mình; lãnh đạo mở cho cả phòng
  IF NOT public.ct2_sua_duoc_phong(NEW.phong)
     AND NOT (NEW.can_bo = public.get_my_profile_id()
              AND NEW.phong = public.get_my_department_id()) THEN
    RAISE EXCEPTION 'Anh/chị chỉ mở được hồ sơ do chính mình phụ trách, trong phòng mình';
  END IF;

  IF NEW.ma_hs IS NULL THEN
    SELECT d.code INTO ma_phong FROM public.departments d WHERE d.id = NEW.phong;
    NEW.ma_hs := COALESCE(ma_phong, 'CN') || '-TD-'
      || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-'
      || lpad(nextval('public.ct2_ma_hs_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END $ct2hi$;

DROP TRIGGER IF EXISTS trg_ct2_hs_truoc_tao ON public.ct2_ho_so_tin_dung;
CREATE TRIGGER trg_ct2_hs_truoc_tao
  BEFORE INSERT ON public.ct2_ho_so_tin_dung
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_hs_truoc_tao();

-- Chuyển bước: giữ đúng thứ tự quy trình, không nhảy cóc qua cấp phê duyệt
CREATE OR REPLACE FUNCTION public.f_ct2_hs_truoc_sua()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2hu$
DECLARE
  la_lanh_dao boolean := public.ct2_sua_duoc_phong(OLD.phong);
  la_can_bo boolean := (public.get_my_profile_id() = OLD.can_bo);
BEGIN
  IF auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NOT la_lanh_dao AND NOT la_can_bo THEN
    RAISE EXCEPTION 'Anh/chị không có quyền sửa hồ sơ này';
  END IF;

  -- Số tiền và cấp phê duyệt là dữ liệu có rủi ro tài chính: chỉ lãnh đạo đổi,
  -- và mọi lần đổi đều ghi vết.
  IF NOT la_lanh_dao AND (
       NEW.so_tien IS DISTINCT FROM OLD.so_tien
    OR NEW.cap_phe_duyet IS DISTINCT FROM OLD.cap_phe_duyet
    OR NEW.can_bo IS DISTINCT FROM OLD.can_bo
    OR NEW.khach_hang IS DISTINCT FROM OLD.khach_hang) THEN
    RAISE EXCEPTION 'Đổi khách hàng, số tiền, cấp phê duyệt hay cán bộ phụ trách cần lãnh đạo Phòng';
  END IF;

  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    -- Hồ sơ thuộc thẩm quyền Chi nhánh thì không đi tiếp lên TSC
    IF NEW.trang_thai = 'TRINH_TSC' AND NEW.cap_phe_duyet <> 'TSC' THEN
      RAISE EXCEPTION 'Hồ sơ này thuộc thẩm quyền % — không trình lên cấp PDTD Trụ sở chính', OLD.cap_phe_duyet;
    END IF;

    -- Hoàn thành phải đi qua bước hoàn thiện hồ sơ giải ngân
    IF NEW.trang_thai = 'HOAN_THANH' AND OLD.trang_thai NOT IN ('HOAN_THIEN_GN','HOAN_THANH') THEN
      RAISE EXCEPTION 'Chưa qua bước «Hoàn thiện hồ sơ giải ngân» — không thể chốt Hoàn thành';
    END IF;

    IF NEW.trang_thai = 'TU_CHOI' THEN
      IF NOT la_lanh_dao THEN
        RAISE EXCEPTION 'Chỉ lãnh đạo Phòng được chuyển hồ sơ sang Từ chối/Dừng';
      END IF;
      IF COALESCE(char_length(trim(NEW.ly_do_tu_choi)), 0) < 20 THEN
        RAISE EXCEPTION 'Từ chối/dừng hồ sơ phải ghi rõ lý do (tối thiểu 20 ký tự)';
      END IF;
    END IF;

    -- Ba bước TRÌNH là chờ người khác quyết → phải chỉ rõ ai đang giữ hồ sơ.
    -- Đây chính là "cột nguy hiểm nhất" trong quy chế Miro §A5.
    IF NEW.trang_thai IN ('TRINH_LDP','TRINH_LDCN','TRINH_TSC') THEN
      IF NEW.nguoi_dang_giu IS NULL AND NEW.trang_thai <> 'TRINH_TSC' THEN
        RAISE EXCEPTION 'Trình cấp trên phải chọn người đang giữ hồ sơ — để đồng hồ chờ tính đúng người';
      END IF;
      NEW.giu_tu := COALESCE(NEW.giu_tu, now());
    ELSE
      NEW.nguoi_dang_giu := NULL;
      NEW.giu_tu := NULL;
    END IF;

    IF NEW.trang_thai = 'HOAN_THANH' THEN
      NEW.ngay_hoan_thanh := COALESCE(NEW.ngay_hoan_thanh, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
    END IF;

    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'trang_thai', OLD.trang_thai, NEW.trang_thai, public.get_my_profile_id());
  END IF;

  IF NEW.so_tien IS DISTINCT FROM OLD.so_tien THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'so_tien', OLD.so_tien::text, NEW.so_tien::text, public.get_my_profile_id());
  END IF;
  IF NEW.han_xu_ly IS DISTINCT FROM OLD.han_xu_ly THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'han_xu_ly', OLD.han_xu_ly::text, NEW.han_xu_ly::text, public.get_my_profile_id());
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $ct2hu$;

DROP TRIGGER IF EXISTS trg_ct2_hs_truoc_sua ON public.ct2_ho_so_tin_dung;
CREATE TRIGGER trg_ct2_hs_truoc_sua
  BEFORE UPDATE ON public.ct2_ho_so_tin_dung
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_hs_truoc_sua();

CREATE OR REPLACE FUNCTION public.f_ct2_hs_sau_ghi_nhip()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2hn$
BEGIN
  UPDATE public.ct2_ho_so_tin_dung
     SET nhip_gan_nhat = NEW.ghi_luc, updated_at = now()
   WHERE id = NEW.ho_so_id;
  RETURN NEW;
END $ct2hn$;

DROP TRIGGER IF EXISTS trg_ct2_hs_sau_ghi_nhip ON public.ct2_nhip_ho_so;
CREATE TRIGGER trg_ct2_hs_sau_ghi_nhip
  AFTER INSERT ON public.ct2_nhip_ho_so
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_hs_sau_ghi_nhip();

REVOKE ALL ON FUNCTION public.f_ct2_hs_truoc_tao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.f_ct2_hs_truoc_sua() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.f_ct2_hs_sau_ghi_nhip() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Index
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ct2_hs_phong_trang_thai
  ON public.ct2_ho_so_tin_dung(phong, trang_thai);
CREATE INDEX IF NOT EXISTS idx_ct2_hs_can_bo
  ON public.ct2_ho_so_tin_dung(can_bo)
  WHERE trang_thai NOT IN ('HOAN_THANH','TU_CHOI');
CREATE INDEX IF NOT EXISTS idx_ct2_hs_den_han_ghtd
  ON public.ct2_ho_so_tin_dung(ngay_den_han_ghtd)
  WHERE ngay_den_han_ghtd IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ct2_hs_khach_hang
  ON public.ct2_ho_so_tin_dung(phong, khach_hang);
CREATE INDEX IF NOT EXISTS idx_ct2_nhip_hs
  ON public.ct2_nhip_ho_so(ho_so_id, ghi_luc DESC);

-- ---------------------------------------------------------------------------
-- 6) RPC — số liệu điều hành mà bản Miro không tính được
-- ---------------------------------------------------------------------------

-- Tổng dư nợ đang trình theo từng bước: chỉ làm được vì so_tien là SỐ THẬT
CREATE OR REPLACE FUNCTION public.ct2_pdtd_tong_hop(_phong uuid)
RETURNS TABLE (
  trang_thai text, so_ho_so bigint, tong_tien numeric, so_qua_han bigint
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT h.trang_thai,
         count(*) AS so_ho_so,
         sum(h.so_tien) AS tong_tien,
         count(*) FILTER (
           WHERE h.han_xu_ly < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
         ) AS so_qua_han
    FROM public.ct2_ho_so_tin_dung h
   WHERE h.phong = _phong
     AND h.trang_thai NOT IN ('HOAN_THANH','TU_CHOI')
   GROUP BY h.trang_thai
$$;

-- Hồ sơ có hạn mức sắp đến hạn mà CHƯA có hồ sơ tái cấp nào đang chạy cho cùng
-- khách hàng — đây là cảnh báo đường ống, bản Miro không phát hiện được vì
-- "đến hạn GHTD" bị để lẫn thành một cột trạng thái.
CREATE OR REPLACE FUNCTION public.ct2_pdtd_sap_den_han(_phong uuid, _so_ngay int DEFAULT 60)
RETURNS TABLE (
  id uuid, ma_hs text, khach_hang text, so_tien numeric,
  ngay_den_han_ghtd date, con_lai int, da_co_ho_so_moi boolean
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT h.id, h.ma_hs, h.khach_hang, h.so_tien, h.ngay_den_han_ghtd,
         (h.ngay_den_han_ghtd - (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int AS con_lai,
         EXISTS (
           SELECT 1 FROM public.ct2_ho_so_tin_dung m
            WHERE m.phong = h.phong
              AND m.khach_hang = h.khach_hang
              AND m.id <> h.id
              AND m.loai_ho_so IN ('TAI_CAP','DIEU_CHINH')
              AND m.trang_thai NOT IN ('HOAN_THANH','TU_CHOI')
         ) AS da_co_ho_so_moi
    FROM public.ct2_ho_so_tin_dung h
   WHERE h.phong = _phong
     AND h.ngay_den_han_ghtd IS NOT NULL
     AND h.ngay_den_han_ghtd <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + _so_ngay
     AND h.trang_thai <> 'TU_CHOI'
   ORDER BY h.ngay_den_han_ghtd
$$;

REVOKE ALL ON FUNCTION public.ct2_pdtd_tong_hop(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ct2_pdtd_sap_den_han(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_pdtd_tong_hop(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_pdtd_sap_den_han(uuid, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) RLS — hồ sơ tín dụng là dữ liệu khách hàng, siết chặt hơn đầu việc thường
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.ct2_phong_pdtd TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ct2_ho_so_tin_dung TO authenticated;
GRANT SELECT, INSERT ON public.ct2_nhip_ho_so TO authenticated;
GRANT ALL ON public.ct2_phong_pdtd, public.ct2_ho_so_tin_dung, public.ct2_nhip_ho_so TO service_role;
GRANT USAGE ON SEQUENCE public.ct2_ma_hs_seq TO authenticated;

ALTER TABLE public.ct2_phong_pdtd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_ho_so_tin_dung ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_nhip_ho_so ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ct2 xem phong pdtd" ON public.ct2_phong_pdtd FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- KHÁC bàn đầu việc: hồ sơ tín dụng KHÔNG mở cho phòng khác đọc, kể cả khi có
-- tham gia chiến dịch chung. Chỉ phòng sở hữu, PGĐ phụ trách và BGĐ/TCTH.
CREATE POLICY "ct2 xem ho so tin dung" ON public.ct2_ho_so_tin_dung FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    AND (
      public.can_view_all_action_plans()
      OR public.is_my_scope_department(phong)
    )
  );
CREATE POLICY "ct2 tao ho so tin dung" ON public.ct2_ho_so_tin_dung FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid())
    AND public.ct2_phong_co_pdtd(phong)
    AND (
      public.ct2_sua_duoc_phong(phong)
      OR (can_bo = public.get_my_profile_id() AND phong = public.get_my_department_id())
    )
  );
CREATE POLICY "ct2 sua ho so tin dung" ON public.ct2_ho_so_tin_dung FOR UPDATE TO authenticated
  USING (public.ct2_sua_duoc_phong(phong) OR can_bo = public.get_my_profile_id())
  WITH CHECK (public.ct2_sua_duoc_phong(phong) OR can_bo = public.get_my_profile_id());

CREATE POLICY "ct2 xem nhip ho so" ON public.ct2_nhip_ho_so FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ct2_ho_so_tin_dung h
    WHERE h.id = ho_so_id
      AND (public.can_view_all_action_plans() OR public.is_my_scope_department(h.phong))
  ));
CREATE POLICY "ct2 ghi nhip ho so" ON public.ct2_nhip_ho_so FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid())
    AND nguoi_ghi = public.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.ct2_ho_so_tin_dung h
      WHERE h.id = ho_so_id
        AND (h.can_bo = public.get_my_profile_id()
             OR h.nguoi_dang_giu = public.get_my_profile_id()
             OR public.ct2_sua_duoc_phong(h.phong))
    )
  );

COMMENT ON TABLE public.ct2_ho_so_tin_dung IS
  'Kanban Phê duyệt tín dụng — đơn vị theo dõi là HỒ SƠ của một khách hàng. Chỉ bật cho phòng có trong ct2_phong_pdtd. Số tiền là numeric (triệu đồng) để cộng/lọc được; "đến hạn GHTD" là trường ngày, không phải cột trạng thái.';
COMMENT ON COLUMN public.ct2_ho_so_tin_dung.so_tien IS 'Đơn vị: TRIỆU ĐỒNG. Là số thật để cộng tổng dư nợ đang trình và lọc theo quy mô.';

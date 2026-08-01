-- ============================================================================
-- CHIÊU THỨC 2 — Kế hoạch hành động: Kanban 5W2H + PDCA (đặc tả v1.0 01/08/2026)
--
-- Thay thế bảng action_plans (bản tối giản 3 cột) bằng mô hình đầy đủ theo đặc
-- tả Khu 3: đầu việc 5W2H có DUY NHẤT 1 người chịu trách nhiệm, nhật ký PDCA
-- append-only, 7 cột trạng thái có cổng chặn chuyển (C trước Hoàn thành, A
-- trước Đã đóng), nhịp sáng 8h00/8h30, cơ chế "Đề xuất việc" cho cán bộ.
-- action_plans cũ GIỮ NGUYÊN dữ liệu (không xóa) — chỉ ngừng dùng trên UI.
--
-- Ánh xạ vai trò đặc tả → vai trò hiện có của hệ thống:
--   CAN_BO          → role employee
--   PHO/TRUONG_PHONG→ role manager (Trưởng phòng chính danh = departments.manager_id)
--   BAN_GIAM_DOC    → role bgd (Giám đốc/PGĐ chung) + pgd (PGĐ phụ trách phòng)
--   TCTH_QUANTRI    → tcth_admin / system_admin / is_tcth_leader()
--
-- Tầng "KẾ HOẠCH HÀNH ĐỘNG (phòng × kỳ)" trong đặc tả = cặp (phong, cycle_id)
-- trên chính đầu việc — kỳ dùng chung evaluation_cycles, không cần bảng riêng.
--
-- HIỆU NĂNG 150 người cùng vào khung 7h50–8h30: mọi màn hình nóng đi qua đúng
-- 1 RPC/1 query có index riêng (xem mục 8); ghi nhịp là 1 INSERT + 2 trigger
-- nhỏ; RLS chỉ gọi các hàm STABLE đã cache trong statement.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Helper quyền — dùng lại bộ hàm sẵn có
-- ---------------------------------------------------------------------------

-- Lãnh đạo (Trưởng/Phó) của phòng _dept: role manager thuộc phòng đó, hoặc
-- Trưởng phòng chính danh trên departments.manager_id
CREATE OR REPLACE FUNCTION public.ct2_la_lanh_dao_phong(_dept uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_dept_manager(_dept)
      OR (
        public.has_role(auth.uid(), 'manager'::app_role)
        AND _dept = public.get_my_department_id()
      )
$$;

-- Quản trị toàn Chi nhánh (BGĐ, TCTH) — tái dùng hàm của action_plans
-- (can_view_all_action_plans = bgd | tcth_admin | system_admin | is_tcth_leader)

-- Được XEM đầu việc: toàn CN · phòng trong tầm nhìn (phòng mình / PGĐ phụ trách)
-- · phòng mình nằm trong danh sách phòng tham gia liên phòng
CREATE OR REPLACE FUNCTION public.ct2_xem_duoc_dau_viec(_phong uuid, _cac_phong uuid[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff()
     AND (
       public.can_view_all_action_plans()
       OR public.is_my_scope_department(_phong)
       OR public.get_my_department_id() = ANY(COALESCE(_cac_phong, '{}'))
       OR EXISTS (
         SELECT 1 FROM unnest(COALESCE(_cac_phong, '{}')) p
         WHERE p = ANY(public.get_my_pgd_scope_dept_ids())
       )
     )
$$;

-- Được SỬA/khởi tạo đầu việc của phòng: lãnh đạo phòng, PGĐ phụ trách, quản trị
CREATE OR REPLACE FUNCTION public.ct2_sua_duoc_phong(_phong uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_view_all_action_plans()
      OR public.ct2_la_lanh_dao_phong(_phong)
      OR (_phong = ANY(public.get_my_pgd_scope_dept_ids()))
$$;

REVOKE ALL ON FUNCTION public.ct2_la_lanh_dao_phong(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ct2_xem_duoc_dau_viec(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ct2_sua_duoc_phong(uuid) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- 1) Chiến dịch (mục tiêu lớn, có thể liên phòng)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct2_chien_dich (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ten text NOT NULL CHECK (char_length(ten) >= 10),
  muc_tieu text,
  ngay_bat_dau date NOT NULL,
  ngay_ket_thuc date NOT NULL CHECK (ngay_ket_thuc >= ngay_bat_dau),
  phong_chu_tri uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  cac_phong_tham_gia uuid[] NOT NULL DEFAULT '{}',
  nguoi_tao uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trang_thai text NOT NULL DEFAULT 'DANG_CHAY' CHECK (trang_thai IN ('DANG_CHAY','DA_DONG')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2) Đầu việc (thẻ Kanban) — 5W2H, duy nhất 01 người chịu trách nhiệm
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.ct2_ma_seq;

CREATE TABLE IF NOT EXISTS public.ct2_dau_viec (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES public.evaluation_cycles(id) ON DELETE SET NULL,
  chien_dich_id uuid REFERENCES public.ct2_chien_dich(id) ON DELETE SET NULL,
  ma_hien_thi text UNIQUE,                              -- KHDN-2609-012 (trigger tự sinh)

  -- What / Why / Who / When / Where / How / How much
  tieu_de text NOT NULL CHECK (char_length(tieu_de) >= 10),
  ket_qua_dau_ra text NOT NULL CHECK (char_length(ket_qua_dau_ra) >= 5),
  muc_tieu_lien_ket text NOT NULL,
  cach_lam text NOT NULL CHECK (char_length(cach_lam) >= 30),
  chi_tieu_dinh_luong numeric,
  don_vi text,
  nguon_luc_du_kien text,
  nguoi_chiu_trach_nhiem uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  nguoi_phoi_hop uuid[] NOT NULL DEFAULT '{}',
  lanh_dao_theo_doi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  phong uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  pham_vi text NOT NULL DEFAULT 'PHONG' CHECK (pham_vi IN ('PHONG','PGD','CHI_NHANH')),

  loai_dau_viec text NOT NULL DEFAULT 'TIEN_TRINH'
    CHECK (loai_dau_viec IN ('TIEN_TRINH','THUONG_TRUC')),
  lien_phong boolean NOT NULL DEFAULT false,
  cac_phong_tham_gia uuid[] NOT NULL DEFAULT '{}',
  muc_uu_tien text NOT NULL DEFAULT 'THUONG'
    CHECK (muc_uu_tien IN ('THUONG','UU_TIEN','TRONG_DIEM_BGD')),

  trang_thai text NOT NULL DEFAULT 'CHUAN_BI'
    CHECK (trang_thai IN ('CHUAN_BI','DANG_LAM','CHO_PHOI_HOP','CHO_DUYET',
                          'HOAN_THANH','DA_DONG','DUNG_HUY')),
  phan_tram int NOT NULL DEFAULT 0 CHECK (phan_tram BETWEEN 0 AND 100),
  co_tinh_trang text NOT NULL DEFAULT 'XANH' CHECK (co_tinh_trang IN ('XANH','VANG','DO')),

  ngay_bat_dau date NOT NULL,
  han_hoan_thanh date NOT NULL,
  han_goc date,                                          -- hạn ban đầu, đo việc lùi hạn
  ly_do_dung_huy text,

  -- Khi ở CHO_DUYET / CHO_PHOI_HOP: đồng hồ trách nhiệm chuyển sang người giữ
  nguoi_dang_giu uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  giu_tu timestamptz,
  nhip_gan_nhat timestamptz,

  nguoi_tao uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ct2_han_hop_le CHECK (han_hoan_thanh >= ngay_bat_dau)
);

-- ---------------------------------------------------------------------------
-- 3) Đề xuất việc của cán bộ (chỉ tiêu đề + lý do; KHÔNG hiện trên Kanban
--    cho tới khi lãnh đạo bổ sung đủ 5W2H và duyệt thành đầu việc thật)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct2_de_xuat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phong uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  tieu_de text NOT NULL CHECK (char_length(tieu_de) >= 10),
  ly_do text NOT NULL CHECK (char_length(ly_do) >= 10),
  nguoi_de_xuat uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trang_thai text NOT NULL DEFAULT 'CHO_DUYET'
    CHECK (trang_thai IN ('CHO_DUYET','DA_DUYET','TU_CHOI')),
  dau_viec_id uuid REFERENCES public.ct2_dau_viec(id) ON DELETE SET NULL,
  xu_ly_boi uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  xu_ly_luc timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4) Nhật ký nhịp PDCA — CHỈ THÊM, KHÔNG SỬA, KHÔNG XÓA
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct2_nhip_pdca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dau_viec_id uuid NOT NULL REFERENCES public.ct2_dau_viec(id) ON DELETE CASCADE,
  nguoi_ghi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nhan_pdca char(1) NOT NULL CHECK (nhan_pdca IN ('P','D','C','A')),
  noi_dung text NOT NULL CHECK (char_length(noi_dung) >= 15),
  vuong_mac text,                        -- bắt buộc khi cờ VANG/DO (trigger)
  hanh_dong_hom_nay text,                -- bắt buộc khi cờ VANG/DO (trigger)
  co_tinh_trang text NOT NULL CHECK (co_tinh_trang IN ('XANH','VANG','DO')),
  phan_tram int NOT NULL CHECK (phan_tram BETWEEN 0 AND 100),
  ghi_luc timestamptz NOT NULL DEFAULT now(),
  -- DUNG_GIO trước 8h00 (lãnh đạo: 8h30) · MUON 8h00–8h30 · MAT_NHIP sau đó
  -- KHONG_TINH: thẻ THƯỜNG TRỰC hoặc thẻ đang ở cột không đòi nhịp
  dung_nhip text NOT NULL DEFAULT 'KHONG_TINH'
    CHECK (dung_nhip IN ('DUNG_GIO','MUON','MAT_NHIP','KHONG_TINH'))
);

-- ---------------------------------------------------------------------------
-- 5) Bình luận trên thẻ / kênh Phòng / kênh Chiến dịch + cảm xúc
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct2_binh_luan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pham_vi text NOT NULL CHECK (pham_vi IN ('DAU_VIEC','PHONG','CHIEN_DICH')),
  doi_tuong_id uuid NOT NULL,
  cha_id uuid REFERENCES public.ct2_binh_luan(id) ON DELETE CASCADE,
  nguoi_gui uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  noi_dung text NOT NULL CHECK (char_length(noi_dung) >= 1),
  nhac_ten uuid[] NOT NULL DEFAULT '{}',
  can_tra_loi boolean NOT NULL DEFAULT false,
  da_tra_loi_luc timestamptz,
  ghim boolean NOT NULL DEFAULT false,
  thu_hoi boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ct2_cam_xuc (
  binh_luan_id uuid NOT NULL REFERENCES public.ct2_binh_luan(id) ON DELETE CASCADE,
  nguoi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bieu_tuong text NOT NULL,
  PRIMARY KEY (binh_luan_id, nguoi, bieu_tuong)
);

-- ---------------------------------------------------------------------------
-- 6) Ảnh chụp nhịp hằng ngày (chốt sổ 8h00/8h30) + hàng đợi thông báo + vết
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct2_anh_chup_nhip (
  ngay date NOT NULL,
  nguoi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phong uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  so_viec_phai_ghi int NOT NULL,
  so_viec_da_ghi_truoc_8h int NOT NULL DEFAULT 0,
  so_viec_ghi_8h_8h30 int NOT NULL DEFAULT 0,
  ket_qua text NOT NULL CHECK (ket_qua IN ('DUNG_GIO','MUON','MAT_NHIP','MIEN')),
  ly_do_mien text,
  PRIMARY KEY (ngay, nguoi)
);

CREATE TABLE IF NOT EXISTS public.ct2_thong_bao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_su_kien text NOT NULL,              -- N1..N17
  nguoi_nhan uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dau_viec_id uuid REFERENCES public.ct2_dau_viec(id) ON DELETE CASCADE,
  tieu_de text NOT NULL,
  noi_dung text NOT NULL,
  muc text NOT NULL DEFAULT 'NHE' CHECK (muc IN ('NHE','VANG','DO','CHAN')),
  kenh text[] NOT NULL DEFAULT '{bell}',
  gui_luc timestamptz,
  doc_luc timestamptz,
  xu_ly_luc timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ct2_nhat_ky_thay_doi (
  id bigserial PRIMARY KEY,
  bang text NOT NULL,
  ban_ghi_id uuid NOT NULL,
  truong text NOT NULL,
  gia_tri_cu text,
  gia_tri_moi text,
  nguoi_thuc_hien uuid,
  ly_do text,
  thoi_diem timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7) Trigger nghiệp vụ — ràng buộc cài ở TẦNG DATABASE, không chỉ giao diện
-- ---------------------------------------------------------------------------

-- 7.1 Khởi tạo đầu việc: sinh mã hiển thị, giữ hạn gốc, chặn liên phòng sai
-- thẩm quyền, chặn cán bộ thường tự tạo (phải đi đường "Đề xuất việc"),
-- mức TRONG_DIEM_BGD chỉ BGĐ đặt được.
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_tao_dau_viec()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ma_phong text;
BEGIN
  -- Ngữ cảnh hệ thống (service_role / cron nhập liệu) — bỏ qua kiểm quyền người dùng
  IF auth.uid() IS NULL THEN
    NEW.han_goc := COALESCE(NEW.han_goc, NEW.han_hoan_thanh);
    RETURN NEW;
  END IF;
  IF NOT public.ct2_sua_duoc_phong(NEW.phong) THEN
    RAISE EXCEPTION 'Chỉ lãnh đạo Phòng trở lên được khởi tạo đầu việc. Cán bộ dùng «Đề xuất việc» gửi lãnh đạo Phòng duyệt.';
  END IF;
  IF NEW.lien_phong AND NOT (
    public.can_view_all_action_plans() OR public.ct2_la_lanh_dao_phong(NEW.phong)
    OR NEW.phong = ANY(public.get_my_pgd_scope_dept_ids())
  ) THEN
    RAISE EXCEPTION 'Chỉ Phó Phòng trở lên được khởi tạo đầu việc liên phòng';
  END IF;
  IF NEW.muc_uu_tien = 'TRONG_DIEM_BGD' AND NOT (
    public.has_role(auth.uid(), 'bgd'::app_role)
    OR public.has_role(auth.uid(), 'system_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Mức «Trọng điểm BGĐ» chỉ Ban Giám đốc đặt được';
  END IF;
  IF NEW.chien_dich_id IS NOT NULL THEN
    -- Chặn hạn vượt mốc kết thúc chiến dịch (đặc tả 2.3)
    PERFORM 1 FROM public.ct2_chien_dich c
     WHERE c.id = NEW.chien_dich_id AND c.ngay_ket_thuc >= NEW.han_hoan_thanh;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Hạn hoàn thành vượt mốc kết thúc của chiến dịch';
    END IF;
  END IF;

  NEW.han_goc := COALESCE(NEW.han_goc, NEW.han_hoan_thanh);
  IF NEW.ma_hien_thi IS NULL THEN
    SELECT d.code INTO ma_phong FROM public.departments d WHERE d.id = NEW.phong;
    NEW.ma_hien_thi := COALESCE(ma_phong, 'CT2') || '-'
      || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-'
      || lpad(nextval('public.ct2_ma_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ct2_truoc_tao_dau_viec ON public.ct2_dau_viec;
CREATE TRIGGER trg_ct2_truoc_tao_dau_viec
  BEFORE INSERT ON public.ct2_dau_viec
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_truoc_tao_dau_viec();

-- 7.2 Cổng chuyển trạng thái + giới hạn phạm vi sửa của người phụ trách
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_sua_dau_viec()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  la_lanh_dao boolean := public.ct2_sua_duoc_phong(OLD.phong);
  la_chu_the boolean := (public.get_my_profile_id() = OLD.nguoi_chiu_trach_nhiem);
  -- Người phối hợp ghi nhịp → trigger nhịp đồng bộ %/cờ về thẻ, phải được qua
  la_phoi_hop boolean := (public.get_my_profile_id() = ANY(OLD.nguoi_phoi_hop));
BEGIN
  -- Ngữ cảnh hệ thống (service_role / cron cập nhật cờ quá hạn) — cho qua
  IF auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Người phụ trách/phối hợp (không phải lãnh đạo) chỉ được đụng vào nhóm trường
  -- vận hành: trạng thái, %, cờ, người giữ. Mọi trường 5W2H/hạn/ưu tiên giữ nguyên.
  IF NOT la_lanh_dao THEN
    IF NOT la_chu_the AND NOT la_phoi_hop THEN
      RAISE EXCEPTION 'Anh/chị không có quyền sửa đầu việc này';
    END IF;
    IF NEW.tieu_de IS DISTINCT FROM OLD.tieu_de
      OR NEW.ket_qua_dau_ra IS DISTINCT FROM OLD.ket_qua_dau_ra
      OR NEW.muc_tieu_lien_ket IS DISTINCT FROM OLD.muc_tieu_lien_ket
      OR NEW.cach_lam IS DISTINCT FROM OLD.cach_lam
      OR NEW.chi_tieu_dinh_luong IS DISTINCT FROM OLD.chi_tieu_dinh_luong
      OR NEW.nguoi_chiu_trach_nhiem IS DISTINCT FROM OLD.nguoi_chiu_trach_nhiem
      OR NEW.lanh_dao_theo_doi IS DISTINCT FROM OLD.lanh_dao_theo_doi
      OR NEW.phong IS DISTINCT FROM OLD.phong
      OR NEW.han_hoan_thanh IS DISTINCT FROM OLD.han_hoan_thanh
      OR NEW.ngay_bat_dau IS DISTINCT FROM OLD.ngay_bat_dau
      OR NEW.muc_uu_tien IS DISTINCT FROM OLD.muc_uu_tien
      OR NEW.loai_dau_viec IS DISTINCT FROM OLD.loai_dau_viec
      OR NEW.lien_phong IS DISTINCT FROM OLD.lien_phong THEN
      RAISE EXCEPTION 'Cán bộ phụ trách chỉ cập nhật được trạng thái/tiến độ. Sửa nội dung 5W2H hay hạn cần lãnh đạo Phòng.';
    END IF;
  END IF;

  IF NEW.muc_uu_tien = 'TRONG_DIEM_BGD' AND OLD.muc_uu_tien <> 'TRONG_DIEM_BGD'
     AND NOT (public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'system_admin'::app_role)) THEN
    RAISE EXCEPTION 'Mức «Trọng điểm BGĐ» chỉ Ban Giám đốc đặt được';
  END IF;

  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    -- Loại THƯỜNG TRỰC không đi qua luồng Kanban tiến trình
    IF NEW.loai_dau_viec = 'THUONG_TRUC'
       AND NEW.trang_thai IN ('CHO_PHOI_HOP','CHO_DUYET','HOAN_THANH') THEN
      RAISE EXCEPTION 'Việc THƯỜNG TRỰC không đi qua luồng Kanban tiến trình — chỉ Chuẩn bị, Đang làm hoặc Đã đóng';
    END IF;

    -- P trước khi Đang làm (khép vòng từ đầu)
    IF NEW.trang_thai = 'DANG_LAM' AND OLD.trang_thai = 'CHUAN_BI'
       AND NEW.loai_dau_viec = 'TIEN_TRINH'
       AND NOT EXISTS (SELECT 1 FROM public.ct2_nhip_pdca n
                       WHERE n.dau_viec_id = NEW.id AND n.nhan_pdca = 'P') THEN
      RAISE EXCEPTION 'Chưa có dòng Plan (P) trong nhật ký — ghi cách làm/mốc trước khi chuyển sang Đang làm';
    END IF;

    -- C + 100%% trước khi Hoàn thành
    IF NEW.trang_thai = 'HOAN_THANH' THEN
      IF NEW.phan_tram <> 100 THEN
        RAISE EXCEPTION 'Chưa đạt 100%% — không thể chuyển sang Hoàn thành';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.ct2_nhip_pdca n
                     WHERE n.dau_viec_id = NEW.id AND n.nhan_pdca = 'C') THEN
        RAISE EXCEPTION 'Thiếu bước Check (C) trong nhật ký PDCA — đối chiếu kết quả với chỉ tiêu trước khi Hoàn thành';
      END IF;
    END IF;

    -- A trước khi Đã đóng; chỉ lãnh đạo đóng
    IF NEW.trang_thai = 'DA_DONG' THEN
      IF NOT la_lanh_dao THEN
        RAISE EXCEPTION 'Chỉ Trưởng/Phó phòng được chốt «Đã đóng»';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.ct2_nhip_pdca n
                     WHERE n.dau_viec_id = NEW.id AND n.nhan_pdca = 'A') THEN
        RAISE EXCEPTION 'Thiếu bước Act (A) — chưa ghi bài học rút ra trước khi đóng đầu việc';
      END IF;
    END IF;

    -- Dừng/Hủy phải có lý do ≥ 30 ký tự và do lãnh đạo quyết
    IF NEW.trang_thai = 'DUNG_HUY' THEN
      IF NOT la_lanh_dao THEN
        RAISE EXCEPTION 'Chỉ Trưởng/Phó phòng được Dừng/Hủy đầu việc';
      END IF;
      IF COALESCE(char_length(NEW.ly_do_dung_huy), 0) < 30 THEN
        RAISE EXCEPTION 'Dừng/Hủy phải ghi rõ lý do (tối thiểu 30 ký tự)';
      END IF;
    END IF;

    -- Vào cột chờ: phải chỉ rõ ai đang giữ việc — đồng hồ trách nhiệm đổi chủ
    IF NEW.trang_thai IN ('CHO_PHOI_HOP','CHO_DUYET') THEN
      IF NEW.nguoi_dang_giu IS NULL THEN
        RAISE EXCEPTION 'Vào cột chờ phải chọn người đang giữ việc (người duyệt / đầu mối phối hợp)';
      END IF;
      NEW.giu_tu := COALESCE(NEW.giu_tu, now());
    ELSE
      NEW.nguoi_dang_giu := NULL;
      NEW.giu_tu := NULL;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ct2_truoc_sua_dau_viec ON public.ct2_dau_viec;
CREATE TRIGGER trg_ct2_truoc_sua_dau_viec
  BEFORE UPDATE ON public.ct2_dau_viec
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_truoc_sua_dau_viec();

-- 7.3 Vết thay đổi các trường nhạy cảm (kiểm soát nội bộ)
CREATE OR REPLACE FUNCTION public.f_ct2_ghi_vet_dau_viec()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.han_hoan_thanh IS DISTINCT FROM OLD.han_hoan_thanh THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_dau_viec', NEW.id, 'han_hoan_thanh', OLD.han_hoan_thanh::text, NEW.han_hoan_thanh::text, public.get_my_profile_id());
  END IF;
  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_dau_viec', NEW.id, 'trang_thai', OLD.trang_thai, NEW.trang_thai, public.get_my_profile_id());
  END IF;
  IF NEW.nguoi_chiu_trach_nhiem IS DISTINCT FROM OLD.nguoi_chiu_trach_nhiem THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_dau_viec', NEW.id, 'nguoi_chiu_trach_nhiem', OLD.nguoi_chiu_trach_nhiem::text, NEW.nguoi_chiu_trach_nhiem::text, public.get_my_profile_id());
  END IF;
  IF NEW.muc_uu_tien IS DISTINCT FROM OLD.muc_uu_tien THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_dau_viec', NEW.id, 'muc_uu_tien', OLD.muc_uu_tien, NEW.muc_uu_tien, public.get_my_profile_id());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ct2_ghi_vet_dau_viec ON public.ct2_dau_viec;
CREATE TRIGGER trg_ct2_ghi_vet_dau_viec
  AFTER UPDATE ON public.ct2_dau_viec
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_ghi_vet_dau_viec();

-- 7.4 Nhịp PDCA: chấm giờ, bắt tách "vướng gì/hôm nay làm gì", chống copy-paste
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_ghi_nhip()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dv record;
  gio_vn time;
  hom_qua text;
BEGIN
  SELECT loai_dau_viec, trang_thai, phong INTO dv
    FROM public.ct2_dau_viec WHERE id = NEW.dau_viec_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đầu việc không tồn tại';
  END IF;

  -- Cờ vàng/đỏ: bắt buộc tách «Đang vướng vì…» và «Hôm nay tôi làm…»
  IF NEW.co_tinh_trang IN ('VANG','DO') THEN
    IF COALESCE(char_length(trim(NEW.vuong_mac)), 0) < 5
       OR COALESCE(char_length(trim(NEW.hanh_dong_hom_nay)), 0) < 5 THEN
      RAISE EXCEPTION 'Cờ vàng/đỏ cần ghi rõ cả hai ô: «Đang vướng vì…» và «Hôm nay tôi làm…»';
    END IF;
  END IF;

  -- Chống "điền cho có": từ chối câu nhịp trùng khớp 100%% với dòng gần nhất
  SELECT n.noi_dung INTO hom_qua
    FROM public.ct2_nhip_pdca n
   WHERE n.dau_viec_id = NEW.dau_viec_id
   ORDER BY n.ghi_luc DESC LIMIT 1;
  IF hom_qua IS NOT NULL AND trim(hom_qua) = trim(NEW.noi_dung) THEN
    RAISE EXCEPTION 'Nội dung giống hệt lần trước — hôm nay có gì khác không?';
  END IF;

  -- Chấm giờ theo giờ Việt Nam. Chỉ chấm với việc TIẾN TRÌNH đang thực chạy;
  -- thẻ ở cột chờ/chuẩn bị/đã xong và loại THƯỜNG TRỰC → KHONG_TINH (không vào
  -- mẫu số — nguyên tắc "chỉ đòi nhịp với việc thực sự đang chạy").
  IF dv.loai_dau_viec = 'TIEN_TRINH' AND dv.trang_thai = 'DANG_LAM' THEN
    gio_vn := (NEW.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;
    IF gio_vn < time '08:00' THEN
      NEW.dung_nhip := 'DUNG_GIO';
    ELSIF gio_vn < time '08:30' THEN
      -- Khung 8h00–8h30 là khung của lãnh đạo Phòng: lãnh đạo ghi vẫn ĐÚNG GIỜ,
      -- cán bộ ghi tính là MUỘN (ân hạn, không phải mất nhịp)
      NEW.dung_nhip := CASE WHEN public.ct2_la_lanh_dao_phong(dv.phong)
                            THEN 'DUNG_GIO' ELSE 'MUON' END;
    ELSE
      NEW.dung_nhip := 'MAT_NHIP';
    END IF;
  ELSE
    NEW.dung_nhip := 'KHONG_TINH';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ct2_truoc_ghi_nhip ON public.ct2_nhip_pdca;
CREATE TRIGGER trg_ct2_truoc_ghi_nhip
  BEFORE INSERT ON public.ct2_nhip_pdca
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_truoc_ghi_nhip();

-- Ghi nhịp xong → tự đẩy %/cờ/mốc nhịp của thẻ (cán bộ không phải sửa 2 nơi)
CREATE OR REPLACE FUNCTION public.f_ct2_sau_ghi_nhip()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ct2_dau_viec
     SET phan_tram = NEW.phan_tram,
         co_tinh_trang = NEW.co_tinh_trang,
         nhip_gan_nhat = NEW.ghi_luc,
         updated_at = now()
   WHERE id = NEW.dau_viec_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ct2_sau_ghi_nhip ON public.ct2_nhip_pdca;
CREATE TRIGGER trg_ct2_sau_ghi_nhip
  AFTER INSERT ON public.ct2_nhip_pdca
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_sau_ghi_nhip();

-- 7.5 Bình luận: sau 15 phút không sửa nội dung, chỉ được đánh dấu thu hồi
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_sua_binh_luan()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.noi_dung IS DISTINCT FROM OLD.noi_dung THEN
    IF OLD.nguoi_gui <> public.get_my_profile_id() THEN
      RAISE EXCEPTION 'Chỉ người viết được sửa bình luận của mình';
    END IF;
    IF OLD.created_at < now() - interval '15 minutes' THEN
      RAISE EXCEPTION 'Quá 15 phút — không sửa được nội dung, chỉ có thể đánh dấu thu hồi (vẫn lưu vết)';
    END IF;
  END IF;
  IF NEW.thu_hoi AND NOT OLD.thu_hoi AND OLD.nguoi_gui <> public.get_my_profile_id() THEN
    RAISE EXCEPTION 'Chỉ người viết được thu hồi bình luận của mình';
  END IF;
  -- Ghim (dùng cho «Chỉ đạo của BGĐ»): chỉ lãnh đạo trong phạm vi
  IF NEW.ghim IS DISTINCT FROM OLD.ghim THEN
    IF OLD.pham_vi = 'DAU_VIEC' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.ct2_dau_viec d
        WHERE d.id = OLD.doi_tuong_id AND public.ct2_sua_duoc_phong(d.phong)
      ) THEN
        RAISE EXCEPTION 'Chỉ lãnh đạo trong phạm vi được ghim/bỏ ghim bình luận';
      END IF;
    ELSIF NOT public.can_view_all_action_plans() THEN
      RAISE EXCEPTION 'Chỉ lãnh đạo trong phạm vi được ghim/bỏ ghim bình luận';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ct2_truoc_sua_binh_luan ON public.ct2_binh_luan;
CREATE TRIGGER trg_ct2_truoc_sua_binh_luan
  BEFORE UPDATE ON public.ct2_binh_luan
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_truoc_sua_binh_luan();

-- ---------------------------------------------------------------------------
-- 8) Index phục vụ 150 người cùng vào khung 7h50–8h30
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ct2_dv_phong_trang_thai
  ON public.ct2_dau_viec(phong, trang_thai);
CREATE INDEX IF NOT EXISTS idx_ct2_dv_nguoi_active
  ON public.ct2_dau_viec(nguoi_chiu_trach_nhiem)
  WHERE trang_thai IN ('CHUAN_BI','DANG_LAM','CHO_PHOI_HOP','CHO_DUYET');
CREATE INDEX IF NOT EXISTS idx_ct2_dv_chien_dich ON public.ct2_dau_viec(chien_dich_id);
CREATE INDEX IF NOT EXISTS idx_ct2_dv_han
  ON public.ct2_dau_viec(han_hoan_thanh)
  WHERE trang_thai IN ('CHUAN_BI','DANG_LAM','CHO_PHOI_HOP','CHO_DUYET');
CREATE INDEX IF NOT EXISTS idx_ct2_dv_phong_tham_gia
  ON public.ct2_dau_viec USING gin(cac_phong_tham_gia);
CREATE INDEX IF NOT EXISTS idx_ct2_nhip_dv ON public.ct2_nhip_pdca(dau_viec_id, ghi_luc DESC);
CREATE INDEX IF NOT EXISTS idx_ct2_nhip_nguoi ON public.ct2_nhip_pdca(nguoi_ghi, ghi_luc DESC);
CREATE INDEX IF NOT EXISTS idx_ct2_bl_doi_tuong
  ON public.ct2_binh_luan(pham_vi, doi_tuong_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ct2_tb_nguoi_nhan
  ON public.ct2_thong_bao(nguoi_nhan, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ct2_de_xuat_phong
  ON public.ct2_de_xuat(phong, trang_thai);

-- ---------------------------------------------------------------------------
-- 9) RPC gộp chuyến — mỗi màn hình nóng đúng 1 vòng gọi
-- ---------------------------------------------------------------------------

-- M1 «Việc của tôi»: thẻ tôi phụ trách còn chạy + đã ghi nhịp hôm nay chưa.
-- SECURITY INVOKER: RLS của bảng vẫn là hàng rào thật.
CREATE OR REPLACE FUNCTION public.ct2_viec_cua_toi()
RETURNS TABLE (
  id uuid, ma_hien_thi text, tieu_de text, trang_thai text, phan_tram int,
  co_tinh_trang text, han_hoan_thanh date, muc_uu_tien text, loai_dau_viec text,
  lien_phong boolean, phong uuid, nhip_gan_nhat timestamptz,
  da_ghi_nhip_hom_nay boolean
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT d.id, d.ma_hien_thi, d.tieu_de, d.trang_thai, d.phan_tram,
         d.co_tinh_trang, d.han_hoan_thanh, d.muc_uu_tien, d.loai_dau_viec,
         d.lien_phong, d.phong, d.nhip_gan_nhat,
         (d.nhip_gan_nhat IS NOT NULL
          AND (d.nhip_gan_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
              = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AS da_ghi_nhip_hom_nay
    FROM public.ct2_dau_viec d
   WHERE d.nguoi_chiu_trach_nhiem = public.get_my_profile_id()
     AND d.trang_thai IN ('CHUAN_BI','DANG_LAM','CHO_PHOI_HOP','CHO_DUYET')
   ORDER BY CASE d.co_tinh_trang WHEN 'DO' THEN 0 WHEN 'VANG' THEN 1 ELSE 2 END,
            d.han_hoan_thanh
$$;

-- M2 «Bảng nhịp theo người» của một phòng: mỗi người mấy thẻ đang chạy,
-- hôm nay ghi được bao nhiêu, kết quả nhịp tốt nhất trong ngày.
CREATE OR REPLACE FUNCTION public.ct2_nhip_phong_hom_nay(_phong uuid)
RETURNS TABLE (
  profile_id uuid, full_name text, so_viec_dang_chay bigint,
  so_viec_da_ghi bigint, ket_qua text
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH viec AS (
    SELECT d.id, d.nguoi_chiu_trach_nhiem
      FROM public.ct2_dau_viec d
     WHERE d.phong = _phong
       AND d.loai_dau_viec = 'TIEN_TRINH'
       AND d.trang_thai = 'DANG_LAM'
  ), nhip AS (
    SELECT n.dau_viec_id, min(CASE n.dung_nhip WHEN 'DUNG_GIO' THEN 0 WHEN 'MUON' THEN 1 ELSE 2 END) AS tot_nhat
      FROM public.ct2_nhip_pdca n
     WHERE n.dau_viec_id IN (SELECT id FROM viec)
       AND (n.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
     GROUP BY n.dau_viec_id
  )
  SELECT p.id, p.full_name,
         count(v.id) AS so_viec_dang_chay,
         count(nh.dau_viec_id) AS so_viec_da_ghi,
         CASE
           WHEN count(v.id) = 0 THEN 'KHONG_CO_VIEC'
           WHEN count(nh.dau_viec_id) = count(v.id) AND max(COALESCE(nh.tot_nhat, 2)) = 0 THEN 'DUNG_GIO'
           WHEN count(nh.dau_viec_id) = count(v.id) THEN 'MUON'
           ELSE 'CHUA_DU'
         END AS ket_qua
    FROM viec v
    JOIN public.profiles p ON p.id = v.nguoi_chiu_trach_nhiem
    LEFT JOIN nhip nh ON nh.dau_viec_id = v.id
   GROUP BY p.id, p.full_name
   ORDER BY p.full_name
$$;

REVOKE ALL ON FUNCTION public.ct2_viec_cua_toi() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ct2_nhip_phong_hom_nay(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_viec_cua_toi() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_nhip_phong_hom_nay(uuid) TO authenticated;

-- Chốt sổ nhịp 8h00 (chạy bằng pg_cron/Edge Function với service_role — xem
-- ghi chú cuối file). Ghi ảnh chụp bất biến vào ct2_anh_chup_nhip.
CREATE OR REPLACE FUNCTION public.ct2_chot_so_nhip(_ngay date DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE so_dong int;
BEGIN
  -- Chỉ service_role hoặc quản trị chạy tay
  IF auth.uid() IS NOT NULL AND NOT (
    public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Chỉ TCTH/quản trị hệ thống được chốt sổ nhịp';
  END IF;

  INSERT INTO public.ct2_anh_chup_nhip
    (ngay, nguoi, phong, so_viec_phai_ghi, so_viec_da_ghi_truoc_8h, so_viec_ghi_8h_8h30, ket_qua)
  SELECT _ngay, d.nguoi_chiu_trach_nhiem, d.phong,
         count(*) AS phai_ghi,
         count(*) FILTER (WHERE n.dung_nhip = 'DUNG_GIO') AS truoc_8h,
         count(*) FILTER (WHERE n.dung_nhip = 'MUON') AS muon,
         CASE
           WHEN count(*) = count(*) FILTER (WHERE n.dung_nhip = 'DUNG_GIO') THEN 'DUNG_GIO'
           WHEN count(*) = count(*) FILTER (WHERE n.dung_nhip IN ('DUNG_GIO','MUON')) THEN 'MUON'
           ELSE 'MAT_NHIP'
         END
    FROM public.ct2_dau_viec d
    LEFT JOIN LATERAL (
      SELECT nn.dung_nhip FROM public.ct2_nhip_pdca nn
       WHERE nn.dau_viec_id = d.id
         AND (nn.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = _ngay
       ORDER BY CASE nn.dung_nhip WHEN 'DUNG_GIO' THEN 0 WHEN 'MUON' THEN 1 ELSE 2 END
       LIMIT 1
    ) n ON true
   WHERE d.loai_dau_viec = 'TIEN_TRINH' AND d.trang_thai = 'DANG_LAM'
   GROUP BY d.nguoi_chiu_trach_nhiem, d.phong
  ON CONFLICT (ngay, nguoi) DO UPDATE
    SET so_viec_phai_ghi = EXCLUDED.so_viec_phai_ghi,
        so_viec_da_ghi_truoc_8h = EXCLUDED.so_viec_da_ghi_truoc_8h,
        so_viec_ghi_8h_8h30 = EXCLUDED.so_viec_ghi_8h_8h30,
        ket_qua = EXCLUDED.ket_qua;
  GET DIAGNOSTICS so_dong = ROW_COUNT;
  RETURN so_dong;
END $$;

REVOKE ALL ON FUNCTION public.ct2_chot_so_nhip(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_chot_so_nhip(date) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 10) RLS — lọc TẠI MÁY CHỦ, guest không có cửa nào (mọi policy qua is_staff)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.ct2_chien_dich TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ct2_dau_viec TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ct2_de_xuat TO authenticated;
GRANT SELECT, INSERT ON public.ct2_nhip_pdca TO authenticated;   -- append-only
GRANT SELECT, INSERT, UPDATE ON public.ct2_binh_luan TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.ct2_cam_xuc TO authenticated;
GRANT SELECT ON public.ct2_anh_chup_nhip TO authenticated;
GRANT SELECT, UPDATE ON public.ct2_thong_bao TO authenticated;
GRANT SELECT ON public.ct2_nhat_ky_thay_doi TO authenticated;
GRANT ALL ON public.ct2_chien_dich, public.ct2_dau_viec, public.ct2_de_xuat,
             public.ct2_nhip_pdca, public.ct2_binh_luan, public.ct2_cam_xuc,
             public.ct2_anh_chup_nhip, public.ct2_thong_bao,
             public.ct2_nhat_ky_thay_doi TO service_role;
GRANT USAGE ON SEQUENCE public.ct2_ma_seq, public.ct2_nhat_ky_thay_doi_id_seq TO authenticated;

ALTER TABLE public.ct2_chien_dich ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_dau_viec ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_de_xuat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_nhip_pdca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_binh_luan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_cam_xuc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_anh_chup_nhip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_thong_bao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_nhat_ky_thay_doi ENABLE ROW LEVEL SECURITY;

-- Chiến dịch
CREATE POLICY "ct2 xem chien dich" ON public.ct2_chien_dich FOR SELECT TO authenticated
  USING (public.ct2_xem_duoc_dau_viec(phong_chu_tri, cac_phong_tham_gia));
CREATE POLICY "ct2 tao chien dich" ON public.ct2_chien_dich FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND public.ct2_sua_duoc_phong(phong_chu_tri));
CREATE POLICY "ct2 sua chien dich" ON public.ct2_chien_dich FOR UPDATE TO authenticated
  USING (public.ct2_sua_duoc_phong(phong_chu_tri))
  WITH CHECK (public.ct2_sua_duoc_phong(phong_chu_tri));

-- Đầu việc: cán bộ đọc toàn bộ tiến độ Phòng mình (minh bạch ngang hàng);
-- ghi mở cho lãnh đạo trong phạm vi + chính người phụ trách (trigger 7.2 giới
-- hạn cột được sửa). Không có DELETE — bỏ việc đi đường DUNG_HUY có lý do.
CREATE POLICY "ct2 xem dau viec" ON public.ct2_dau_viec FOR SELECT TO authenticated
  USING (public.ct2_xem_duoc_dau_viec(phong, cac_phong_tham_gia));
CREATE POLICY "ct2 tao dau viec" ON public.ct2_dau_viec FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND public.ct2_sua_duoc_phong(phong));
CREATE POLICY "ct2 sua dau viec" ON public.ct2_dau_viec FOR UPDATE TO authenticated
  USING (
    public.ct2_sua_duoc_phong(phong)
    OR nguoi_chiu_trach_nhiem = public.get_my_profile_id()
  )
  WITH CHECK (
    public.ct2_sua_duoc_phong(phong)
    OR nguoi_chiu_trach_nhiem = public.get_my_profile_id()
  );

-- Đề xuất việc: cán bộ tạo cho phòng mình; phòng đọc chung; lãnh đạo xử lý
CREATE POLICY "ct2 xem de xuat" ON public.ct2_de_xuat FOR SELECT TO authenticated
  USING (public.ct2_xem_duoc_dau_viec(phong, '{}'));
CREATE POLICY "ct2 tao de xuat" ON public.ct2_de_xuat FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff()
    AND nguoi_de_xuat = public.get_my_profile_id()
    AND phong = public.get_my_department_id()
  );
CREATE POLICY "ct2 xu ly de xuat" ON public.ct2_de_xuat FOR UPDATE TO authenticated
  USING (public.ct2_sua_duoc_phong(phong))
  WITH CHECK (public.ct2_sua_duoc_phong(phong));

-- Nhịp PDCA: đọc theo quyền xem thẻ; ghi = chính mình, trên thẻ trong phạm vi.
-- KHÔNG có policy UPDATE/DELETE — bằng chứng trung thực, sai thì ghi dòng mới.
CREATE POLICY "ct2 xem nhip" ON public.ct2_nhip_pdca FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ct2_dau_viec d
    WHERE d.id = dau_viec_id
      AND public.ct2_xem_duoc_dau_viec(d.phong, d.cac_phong_tham_gia)
  ));
CREATE POLICY "ct2 ghi nhip" ON public.ct2_nhip_pdca FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff()
    AND nguoi_ghi = public.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.ct2_dau_viec d
      WHERE d.id = dau_viec_id
        AND (
          d.nguoi_chiu_trach_nhiem = public.get_my_profile_id()
          OR public.get_my_profile_id() = ANY(d.nguoi_phoi_hop)
          OR public.ct2_sua_duoc_phong(d.phong)
        )
    )
  );

-- Bình luận: đọc/viết trong phạm vi nhìn thấy đối tượng
CREATE POLICY "ct2 xem binh luan" ON public.ct2_binh_luan FOR SELECT TO authenticated
  USING (
    (pham_vi = 'DAU_VIEC' AND EXISTS (
      SELECT 1 FROM public.ct2_dau_viec d WHERE d.id = doi_tuong_id
        AND public.ct2_xem_duoc_dau_viec(d.phong, d.cac_phong_tham_gia)))
    OR (pham_vi = 'PHONG' AND public.ct2_xem_duoc_dau_viec(doi_tuong_id, '{}'))
    OR (pham_vi = 'CHIEN_DICH' AND EXISTS (
      SELECT 1 FROM public.ct2_chien_dich c WHERE c.id = doi_tuong_id
        AND public.ct2_xem_duoc_dau_viec(c.phong_chu_tri, c.cac_phong_tham_gia)))
  );
CREATE POLICY "ct2 viet binh luan" ON public.ct2_binh_luan FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff()
    AND nguoi_gui = public.get_my_profile_id()
    AND (
      (pham_vi = 'DAU_VIEC' AND EXISTS (
        SELECT 1 FROM public.ct2_dau_viec d WHERE d.id = doi_tuong_id
          AND public.ct2_xem_duoc_dau_viec(d.phong, d.cac_phong_tham_gia)))
      OR (pham_vi = 'PHONG' AND public.ct2_xem_duoc_dau_viec(doi_tuong_id, '{}'))
      OR (pham_vi = 'CHIEN_DICH' AND EXISTS (
        SELECT 1 FROM public.ct2_chien_dich c WHERE c.id = doi_tuong_id
          AND public.ct2_xem_duoc_dau_viec(c.phong_chu_tri, c.cac_phong_tham_gia)))
    )
  );
-- UPDATE giới hạn trong đúng phạm vi nhìn thấy; chi tiết (15 phút, thu hồi,
-- ghim) chặn tiếp ở trigger 7.5
CREATE POLICY "ct2 sua binh luan" ON public.ct2_binh_luan FOR UPDATE TO authenticated
  USING (
    (pham_vi = 'DAU_VIEC' AND EXISTS (
      SELECT 1 FROM public.ct2_dau_viec d WHERE d.id = doi_tuong_id
        AND public.ct2_xem_duoc_dau_viec(d.phong, d.cac_phong_tham_gia)))
    OR (pham_vi = 'PHONG' AND public.ct2_xem_duoc_dau_viec(doi_tuong_id, '{}'))
    OR (pham_vi = 'CHIEN_DICH' AND EXISTS (
      SELECT 1 FROM public.ct2_chien_dich c WHERE c.id = doi_tuong_id
        AND public.ct2_xem_duoc_dau_viec(c.phong_chu_tri, c.cac_phong_tham_gia)))
  )
  WITH CHECK (public.is_staff());

CREATE POLICY "ct2 xem cam xuc" ON public.ct2_cam_xuc FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ct2_binh_luan b WHERE b.id = binh_luan_id));
CREATE POLICY "ct2 tha cam xuc" ON public.ct2_cam_xuc FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND nguoi = public.get_my_profile_id());
CREATE POLICY "ct2 bo cam xuc" ON public.ct2_cam_xuc FOR DELETE TO authenticated
  USING (nguoi = public.get_my_profile_id());

-- Ảnh chụp nhịp: mình xem của mình; lãnh đạo/PGĐ xem phòng trong phạm vi; QT xem hết
CREATE POLICY "ct2 xem anh chup nhip" ON public.ct2_anh_chup_nhip FOR SELECT TO authenticated
  USING (
    nguoi = public.get_my_profile_id()
    OR public.can_view_all_action_plans()
    OR public.ct2_sua_duoc_phong(phong)
  );

-- Thông báo: của ai người ấy đọc/đánh dấu
CREATE POLICY "ct2 xem thong bao" ON public.ct2_thong_bao FOR SELECT TO authenticated
  USING (nguoi_nhan = public.get_my_profile_id());
CREATE POLICY "ct2 danh dau thong bao" ON public.ct2_thong_bao FOR UPDATE TO authenticated
  USING (nguoi_nhan = public.get_my_profile_id())
  WITH CHECK (nguoi_nhan = public.get_my_profile_id());

-- Vết thay đổi: chỉ quản trị đọc
CREATE POLICY "ct2 xem vet thay doi" ON public.ct2_nhat_ky_thay_doi FOR SELECT TO authenticated
  USING (public.can_view_all_action_plans());

COMMENT ON TABLE public.ct2_dau_viec IS
  'Chiêu thức 2 v2 — đầu việc Kanban 5W2H, 7 cột trạng thái, PDCA đến từng thẻ. Thay bản action_plans tối giản.';
COMMENT ON TABLE public.ct2_nhip_pdca IS
  'Nhật ký nhịp PDCA append-only — không UPDATE/DELETE ở mọi vai trò (bằng chứng trung thực).';

-- ============================================================================
-- GHI CHÚ VẬN HÀNH (GĐ2 — tác vụ định giờ, làm sau khi GĐ1 chạy thử):
--   · 08:00 VN (01:00 UTC):  select public.ct2_chot_so_nhip();
--   · Web Push N1–N17 đi qua edge function riêng đọc ct2_thong_bao (mẫu đã có:
--     notify-kanban-update / send-reminders). Trần 3 thông báo nhắc/người/ngày
--     và gộp theo người xử lý ở tầng edge function khi phát.
-- ============================================================================

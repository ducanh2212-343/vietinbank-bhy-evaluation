-- ============================================================================
-- BẮC HƯNG YÊN TRAINING CENTER — cấu phần đào tạo và rèn luyện của cổng ONE
-- Đặc tả 1.0 ngày 06/09/2026 · Giai đoạn 1: chạy được cho chương trình đang có
-- (10 ngày Trưởng phòng KHDN Bản 4.0, 07–18/09/2026).
--
-- Nguyên tắc dữ liệu (đặc tả Mục II, IV):
--   · Vai lấy từ BẢNG THÀNH VIÊN chương trình, không từ vai trò đăng nhập chung.
--     Vai trò chung không tách được: Giám đốc mang system_admin, PGĐ phụ trách
--     chỉ là một trong ba PGĐ, Phòng TCTH có nhiều tcth_admin nhưng chỉ một người
--     quản trị chương trình.
--   · Phần tự suy ngẫm và phiếu tự soi của học viên nằm ở vùng dữ liệu mà ngay
--     cả quản trị cũng KHÔNG đọc được nội dung — chỉ thấy đã điền hay chưa. Đây
--     là ràng buộc ở tầng dữ liệu (RLS), không phải ở giao diện.
--   · Ba việc gối đầu KHÔNG đẻ thẻ việc riêng: thẻ thật nằm ở Chiêu thức 2
--     (ct2_dau_viec) để cán bộ được giao ghi nhịp bằng đúng công cụ Phòng đang
--     dùng; bảng ttc_viec_goi_dau chỉ giữ phần thuộc về chương trình (WHY, tiêu
--     chuẩn, mốc kiểm tra, nghiệm thu) và trỏ sang thẻ đó.
--   · Thông báo đi qua đúng hàng đợi ct2_thong_bao (nguồn duy nhất của cổng),
--     chỉ ở BỐN mốc — không bắn theo từng ô tích.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Bảng
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ttc_chuong_trinh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ten text NOT NULL CHECK (char_length(ten) >= 5),
  mo_ta text,
  ngay_bd date NOT NULL,
  ngay_kt date NOT NULL,
  trang_thai text NOT NULL DEFAULT 'CHUAN_BI'
    CHECK (trang_thai IN ('CHUAN_BI','DANG_CHAY','KET_THUC')),
  -- Danh mục: Training Center là TRUNG TÂM nhiều chương trình cho bốn nhóm đối
  -- tượng (đặc tả Mục I) — chương trình 10 ngày chỉ là một mục trong đó.
  nhom_doi_tuong text NOT NULL DEFAULT 'QUY_HOACH'
    CHECK (nhom_doi_tuong IN ('CAN_BO_MOI','NANG_CAP_CHUYEN_MON','QUY_HOACH','QUAN_LY_DUONG_NHIEM')),
  loai text,                       -- «10 ngày», «Hội nhập 30 ngày», «Chuyên đề», «Duy trì 30–60–90»
  khoi_nang_luc text,              -- tầng của Cây trưởng thành mà chương trình nhắm tới
  -- Chương trình MẪU: Phòng TCTH nhân bản ra chương trình mới (ttc_nhan_ban_chuong_trinh)
  la_mau boolean NOT NULL DEFAULT false,
  -- Ghi nhận có mặt (giai đoạn 3): toạ độ cổng chi nhánh do BGĐ đặt; số hiện
  -- tại là tạm tính, phải đứng tại cổng lấy toạ độ thật trước khi bật.
  vi_do double precision,
  kinh_do double precision,
  ban_kinh_m int NOT NULL DEFAULT 250 CHECK (ban_kinh_m BETWEEN 50 AND 2000),
  nguoi_tao uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ttc_ct_ngay_hop_le CHECK (ngay_kt >= ngay_bd)
);

CREATE TABLE IF NOT EXISTS public.ttc_thanh_vien (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chuong_trinh_id uuid NOT NULL REFERENCES public.ttc_chuong_trinh(id) ON DELETE CASCADE,
  nguoi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vai text NOT NULL CHECK (vai IN ('hoc_vien','huong_dan','bgd','quan_tri')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chuong_trinh_id, nguoi)
);
CREATE INDEX IF NOT EXISTS ttc_thanh_vien_nguoi_idx ON public.ttc_thanh_vien(nguoi);

CREATE TABLE IF NOT EXISTS public.ttc_ngay (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chuong_trinh_id uuid NOT NULL REFERENCES public.ttc_chuong_trinh(id) ON DELETE CASCADE,
  so_thu_tu int NOT NULL CHECK (so_thu_tu >= 1),
  ngay date NOT NULL,
  tieu_de text NOT NULL,
  khoi text,
  van_ban text,
  nhiem_vu_van_ban text,
  chuan_bi text,
  -- Khung chia sẻ và tự suy ngẫm 1.0: mỗi ngày một lát cắt của Cây trưởng thành
  lat_cat text,
  cau_hoi_tu_soi text,
  UNIQUE (chuong_trinh_id, so_thu_tu)
);

CREATE TABLE IF NOT EXISTS public.ttc_dau_viec (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay_id uuid NOT NULL REFERENCES public.ttc_ngay(id) ON DELETE CASCADE,
  phan text NOT NULL CHECK (phan IN ('KHOI_DONG','VAN_BAN','THUC_HANH','TRINH_BAY','TU_SUY_NGAM')),
  thu_tu int NOT NULL DEFAULT 0,
  gio_bat_dau time NOT NULL,
  gio_ket_thuc time NOT NULL,
  ten text NOT NULL CHECK (char_length(ten) >= 5),
  dau_ra text,
  nguoi_phu_trach text NOT NULL DEFAULT 'HOC_VIEN'
    CHECK (nguoi_phu_trach IN ('HOC_VIEN','GD','PGD','GD_PGD','TCTH','TO_CHAM','CAN_BO')),
  thiet_bi text NOT NULL DEFAULT 'KHONG' CHECK (thiet_bi IN ('MAY_CO_QUAN','LAPTOP','GIAY','KHONG')),
  noi_nop text NOT NULL DEFAULT 'KHONG' CHECK (noi_nop IN ('EMAIL','TRAINING_CENTER','TCTH','KHONG')),
  trong_tam boolean NOT NULL DEFAULT false,
  CONSTRAINT ttc_dv_gio_hop_le CHECK (gio_ket_thuc > gio_bat_dau)
);
CREATE INDEX IF NOT EXISTS ttc_dau_viec_ngay_idx ON public.ttc_dau_viec(ngay_id, gio_bat_dau);

CREATE TABLE IF NOT EXISTS public.ttc_tien_do (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dau_viec_id uuid NOT NULL REFERENCES public.ttc_dau_viec(id) ON DELETE CASCADE,
  nguoi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hoan_thanh boolean NOT NULL DEFAULT false,
  thoi_diem timestamptz,
  ghi_chu text,
  file_url text,
  UNIQUE (dau_viec_id, nguoi)
);

CREATE TABLE IF NOT EXISTS public.ttc_diem_bloom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay_id uuid NOT NULL REFERENCES public.ttc_ngay(id) ON DELETE CASCADE,
  hoc_vien uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nguoi_cham uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Barem Mục VI.1: 10 · 15 · 20 · 20 · 20 · 15 = 100; trừ hình thức tối đa 5
  b1 int NOT NULL DEFAULT 0 CHECK (b1 BETWEEN 0 AND 10),
  b2 int NOT NULL DEFAULT 0 CHECK (b2 BETWEEN 0 AND 15),
  b3 int NOT NULL DEFAULT 0 CHECK (b3 BETWEEN 0 AND 20),
  b4 int NOT NULL DEFAULT 0 CHECK (b4 BETWEEN 0 AND 20),
  b5 int NOT NULL DEFAULT 0 CHECK (b5 BETWEEN 0 AND 20),
  b6 int NOT NULL DEFAULT 0 CHECK (b6 BETWEEN 0 AND 15),
  tru_hinh_thuc int NOT NULL DEFAULT 0 CHECK (tru_hinh_thuc BETWEEN 0 AND 5),
  tong int GENERATED ALWAYS AS (GREATEST(0, b1 + b2 + b3 + b4 + b5 + b6 - tru_hinh_thuc)) STORED,
  nhan_xet text,
  -- Học viên chỉ nhìn thấy điểm sau khi Ban Giám đốc công bố
  cong_bo boolean NOT NULL DEFAULT false,
  cham_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ngay_id, hoc_vien, nguoi_cham)
);

-- Phiếu tự soi 08 tiêu chí — CHỈ chính học viên đọc/ghi. muc[i] ∈ 1..5 hoặc NULL.
CREATE TABLE IF NOT EXISTS public.ttc_tu_soi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chuong_trinh_id uuid NOT NULL REFERENCES public.ttc_chuong_trinh(id) ON DELETE CASCADE,
  nguoi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dot int NOT NULL CHECK (dot IN (1, 2)),
  muc int[] NOT NULL DEFAULT ARRAY[NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL]::int[]
    CHECK (cardinality(muc) = 8),
  vi_du text[] NOT NULL DEFAULT ARRAY[NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL]::text[]
    CHECK (cardinality(vi_du) = 8),
  dung_lai text,
  bat_dau text,
  tiep_tuc text,
  cam_ket text,
  cap_nhat_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chuong_trinh_id, nguoi, dot)
);

-- Tự suy ngẫm mỗi ngày — CHỈ chính học viên đọc/ghi
CREATE TABLE IF NOT EXISTS public.ttc_suy_ngam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay_id uuid NOT NULL REFERENCES public.ttc_ngay(id) ON DELETE CASCADE,
  nguoi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  noi_dung text NOT NULL,
  muc_tu_cham int CHECK (muc_tu_cham BETWEEN 1 AND 5),
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ngay_id, nguoi)
);

-- Ba việc gối đầu — «3 việc lựa chọn với cán bộ»
CREATE TABLE IF NOT EXISTS public.ttc_viec_goi_dau (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chuong_trinh_id uuid NOT NULL REFERENCES public.ttc_chuong_trinh(id) ON DELETE CASCADE,
  hoc_vien uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  so int NOT NULL CHECK (so BETWEEN 1 AND 3),
  ten text NOT NULL CHECK (char_length(ten) >= 5),
  muc_dich text,                 -- WHY
  dau_ra text,                   -- WHAT
  can_bo uuid REFERENCES public.profiles(id) ON DELETE SET NULL,   -- OWNER
  tieu_chuan text,               -- STANDARD
  han date,                      -- DEADLINE
  moc_kiem_tra date,             -- CHECKPOINT
  -- Thẻ việc thật trên Chiêu thức 2 — cán bộ được giao ghi nhịp ở đó
  dau_viec_id uuid REFERENCES public.ct2_dau_viec(id) ON DELETE SET NULL,
  ket_qua text,
  nghiem_thu text,
  nguoi_nghiem_thu uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nghiem_thu_luc timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chuong_trinh_id, hoc_vien, so)
);

-- ---------------------------------------------------------------------------
-- 2) Helper quyền — SECURITY DEFINER để policy trên ttc_thanh_vien không đệ quy
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ttc_vai(_ct uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT vai FROM public.ttc_thanh_vien
   WHERE chuong_trinh_id = _ct AND nguoi = public.get_my_profile_id()
   LIMIT 1
$$;

-- Thành viên chương trình. system_admin đi kèm để bảo trì kỹ thuật (tạo chương
-- trình, thêm người đầu tiên) — KHÔNG mở cho bgd/tcth_admin theo vai trò chung.
CREATE OR REPLACE FUNCTION public.ttc_la_thanh_vien(_ct uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff(auth.uid())
     AND (public.ttc_vai(_ct) IS NOT NULL
          OR public.has_role(auth.uid(), 'system_admin'::app_role))
$$;

CREATE OR REPLACE FUNCTION public.ttc_la_quan_tri(_ct uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff(auth.uid())
     AND (public.ttc_vai(_ct) = 'quan_tri'
          OR public.has_role(auth.uid(), 'system_admin'::app_role))
$$;

CREATE OR REPLACE FUNCTION public.ttc_la_nguoi_cham(_ct uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.ttc_vai(_ct) IN ('huong_dan', 'bgd')
$$;

CREATE OR REPLACE FUNCTION public.ttc_la_bgd(_ct uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.ttc_vai(_ct) = 'bgd'
$$;

-- Chương trình của một ngày — dùng trong policy của các bảng con
CREATE OR REPLACE FUNCTION public.ttc_ct_cua_ngay(_ngay uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT chuong_trinh_id FROM public.ttc_ngay WHERE id = _ngay
$$;

CREATE OR REPLACE FUNCTION public.ttc_ct_cua_dau_viec(_dv uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.chuong_trinh_id FROM public.ttc_dau_viec d
   JOIN public.ttc_ngay n ON n.id = d.ngay_id
   WHERE d.id = _dv
$$;

REVOKE ALL ON FUNCTION public.ttc_vai(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ttc_la_thanh_vien(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ttc_la_quan_tri(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ttc_la_nguoi_cham(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ttc_la_bgd(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ttc_ct_cua_ngay(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ttc_ct_cua_dau_viec(uuid) FROM PUBLIC, anon;
-- Policy chạy hàm dưới quyền người gọi (authenticated) — ghi rõ GRANT thay vì
-- trông vào default privileges của Supabase, để chạy thử ở Postgres trần vẫn đúng.
GRANT EXECUTE ON FUNCTION public.ttc_vai(uuid), public.ttc_la_thanh_vien(uuid),
  public.ttc_la_quan_tri(uuid), public.ttc_la_nguoi_cham(uuid), public.ttc_la_bgd(uuid),
  public.ttc_ct_cua_ngay(uuid), public.ttc_ct_cua_dau_viec(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) RLS — hàng rào thật. Khách đối tác (guest) không thấy gì.
-- ---------------------------------------------------------------------------

ALTER TABLE public.ttc_chuong_trinh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttc_thanh_vien   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttc_ngay         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttc_dau_viec     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttc_tien_do      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttc_diem_bloom   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttc_tu_soi       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttc_suy_ngam     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttc_viec_goi_dau ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ttc_chuong_trinh, public.ttc_thanh_vien, public.ttc_ngay,
  public.ttc_dau_viec, public.ttc_tien_do, public.ttc_diem_bloom, public.ttc_tu_soi,
  public.ttc_suy_ngam, public.ttc_viec_goi_dau FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ttc_chuong_trinh, public.ttc_thanh_vien,
  public.ttc_ngay, public.ttc_dau_viec, public.ttc_tien_do, public.ttc_diem_bloom,
  public.ttc_tu_soi, public.ttc_suy_ngam, public.ttc_viec_goi_dau TO authenticated;

-- Chương trình: thành viên đọc; tạo mới do system_admin/tcth_admin (giai đoạn 2
-- sẽ mở màn quản trị cho Phòng TCTH tự tạo); sửa do quản trị chương trình.
-- DANH MỤC chương trình mở cho mọi cán bộ (tên, nhóm, ngày, trạng thái) — cán bộ
-- nào cũng sẽ có lúc đứng trong một chương trình, phải thấy trước có gì. Lịch,
-- đầu việc, thành viên, tiến độ vẫn gác theo thành viên ở các bảng con.
CREATE POLICY "ttc xem danh muc chuong trinh" ON public.ttc_chuong_trinh FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "ttc tao chuong trinh" ON public.ttc_chuong_trinh FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid())
    AND (public.has_role(auth.uid(), 'system_admin'::app_role)
         OR public.has_role(auth.uid(), 'tcth_admin'::app_role)));
CREATE POLICY "ttc sua chuong trinh" ON public.ttc_chuong_trinh FOR UPDATE TO authenticated
  USING (public.ttc_la_quan_tri(id)) WITH CHECK (public.ttc_la_quan_tri(id));

-- Người tạo chương trình tự thành quản trị của chính nó — không có dòng này thì
-- TCTH tạo xong không thêm được thành viên nào (policy thêm thành viên đòi quan_tri).
CREATE OR REPLACE FUNCTION public.f_ttc_sau_tao_chuong_trinh()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toi uuid := public.get_my_profile_id();
BEGIN
  IF NEW.nguoi_tao IS NULL AND toi IS NOT NULL THEN
    UPDATE public.ttc_chuong_trinh SET nguoi_tao = toi WHERE id = NEW.id;
  END IF;
  IF toi IS NOT NULL THEN
    INSERT INTO public.ttc_thanh_vien (chuong_trinh_id, nguoi, vai) VALUES (NEW.id, toi, 'quan_tri')
    ON CONFLICT (chuong_trinh_id, nguoi) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ttc_sau_tao_chuong_trinh ON public.ttc_chuong_trinh;
CREATE TRIGGER ttc_sau_tao_chuong_trinh AFTER INSERT ON public.ttc_chuong_trinh
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_sau_tao_chuong_trinh();

-- Thành viên: ai trong chương trình thấy danh sách (để hiện tên người hướng dẫn,
-- học viên); thêm/bớt do quản trị chương trình.
CREATE POLICY "ttc xem thanh vien" ON public.ttc_thanh_vien FOR SELECT TO authenticated
  USING (public.ttc_la_thanh_vien(chuong_trinh_id));
CREATE POLICY "ttc them thanh vien" ON public.ttc_thanh_vien FOR INSERT TO authenticated
  WITH CHECK (public.ttc_la_quan_tri(chuong_trinh_id));
CREATE POLICY "ttc sua thanh vien" ON public.ttc_thanh_vien FOR UPDATE TO authenticated
  USING (public.ttc_la_quan_tri(chuong_trinh_id)) WITH CHECK (public.ttc_la_quan_tri(chuong_trinh_id));
CREATE POLICY "ttc xoa thanh vien" ON public.ttc_thanh_vien FOR DELETE TO authenticated
  USING (public.ttc_la_quan_tri(chuong_trinh_id));

-- Ngày và đầu việc: thành viên đọc, quản trị ghi
CREATE POLICY "ttc xem ngay" ON public.ttc_ngay FOR SELECT TO authenticated
  USING (public.ttc_la_thanh_vien(chuong_trinh_id));
CREATE POLICY "ttc ghi ngay" ON public.ttc_ngay FOR ALL TO authenticated
  USING (public.ttc_la_quan_tri(chuong_trinh_id)) WITH CHECK (public.ttc_la_quan_tri(chuong_trinh_id));

CREATE POLICY "ttc xem dau viec" ON public.ttc_dau_viec FOR SELECT TO authenticated
  USING (public.ttc_la_thanh_vien(public.ttc_ct_cua_ngay(ngay_id)));
CREATE POLICY "ttc ghi dau viec" ON public.ttc_dau_viec FOR ALL TO authenticated
  USING (public.ttc_la_quan_tri(public.ttc_ct_cua_ngay(ngay_id)))
  WITH CHECK (public.ttc_la_quan_tri(public.ttc_ct_cua_ngay(ngay_id)));

-- Tiến độ: chỉ chính học viên tích; cả chương trình nhìn thấy (BGĐ theo dõi
-- thời gian thực, TCTH điều phối lịch) — nội dung tự suy ngẫm KHÔNG nằm ở đây.
CREATE POLICY "ttc xem tien do" ON public.ttc_tien_do FOR SELECT TO authenticated
  USING (public.ttc_la_thanh_vien(public.ttc_ct_cua_dau_viec(dau_viec_id)));
CREATE POLICY "ttc tich tien do" ON public.ttc_tien_do FOR INSERT TO authenticated
  WITH CHECK (nguoi = public.get_my_profile_id()
    AND public.ttc_vai(public.ttc_ct_cua_dau_viec(dau_viec_id)) = 'hoc_vien');
CREATE POLICY "ttc sua tien do" ON public.ttc_tien_do FOR UPDATE TO authenticated
  USING (nguoi = public.get_my_profile_id())
  WITH CHECK (nguoi = public.get_my_profile_id());

-- Điểm Bloom: người hướng dẫn và BGĐ chấm (mỗi người một phiếu); học viên chỉ
-- đọc phiếu của mình SAU KHI công bố; quản trị đọc để tổng hợp, không chấm.
CREATE POLICY "ttc xem diem" ON public.ttc_diem_bloom FOR SELECT TO authenticated
  USING (
    public.ttc_vai(public.ttc_ct_cua_ngay(ngay_id)) IN ('huong_dan', 'bgd', 'quan_tri')
    OR public.has_role(auth.uid(), 'system_admin'::app_role)
    OR (hoc_vien = public.get_my_profile_id() AND cong_bo)
  );
CREATE POLICY "ttc cham diem" ON public.ttc_diem_bloom FOR INSERT TO authenticated
  WITH CHECK (nguoi_cham = public.get_my_profile_id()
    AND public.ttc_la_nguoi_cham(public.ttc_ct_cua_ngay(ngay_id)));
CREATE POLICY "ttc sua diem" ON public.ttc_diem_bloom FOR UPDATE TO authenticated
  USING (nguoi_cham = public.get_my_profile_id() OR public.ttc_la_bgd(public.ttc_ct_cua_ngay(ngay_id)))
  WITH CHECK (nguoi_cham = public.get_my_profile_id() OR public.ttc_la_bgd(public.ttc_ct_cua_ngay(ngay_id)));

-- Tự soi và tự suy ngẫm: CHỈ CHÍNH HỌC VIÊN. Không có policy nào khác — kể cả
-- system_admin đọc thẳng bảng cũng không thấy dòng nào. Vai khác chỉ biết
-- «đã điền hay chưa» qua hai hàm ttc_trang_thai_tu_soi / ttc_trang_thai_suy_ngam.
CREATE POLICY "ttc tu soi cua toi" ON public.ttc_tu_soi FOR ALL TO authenticated
  USING (nguoi = public.get_my_profile_id())
  WITH CHECK (nguoi = public.get_my_profile_id()
    AND public.ttc_vai(chuong_trinh_id) = 'hoc_vien');

CREATE POLICY "ttc suy ngam cua toi" ON public.ttc_suy_ngam FOR ALL TO authenticated
  USING (nguoi = public.get_my_profile_id())
  WITH CHECK (nguoi = public.get_my_profile_id()
    AND public.ttc_vai(public.ttc_ct_cua_ngay(ngay_id)) = 'hoc_vien');

-- Việc gối đầu: học viên lập; BGĐ nghiệm thu (trigger giới hạn cột); cả chương
-- trình đọc để xuất báo cáo kết quả chỉ đạo và kèm cặp.
CREATE POLICY "ttc xem goi dau" ON public.ttc_viec_goi_dau FOR SELECT TO authenticated
  USING (public.ttc_la_thanh_vien(chuong_trinh_id));
CREATE POLICY "ttc lap goi dau" ON public.ttc_viec_goi_dau FOR INSERT TO authenticated
  WITH CHECK (hoc_vien = public.get_my_profile_id() AND public.ttc_vai(chuong_trinh_id) = 'hoc_vien');
CREATE POLICY "ttc sua goi dau" ON public.ttc_viec_goi_dau FOR UPDATE TO authenticated
  USING (hoc_vien = public.get_my_profile_id() OR public.ttc_la_bgd(chuong_trinh_id))
  WITH CHECK (hoc_vien = public.get_my_profile_id() OR public.ttc_la_bgd(chuong_trinh_id));

-- BGĐ chỉ được đụng vào ô nghiệm thu; học viên không được tự nghiệm thu.
CREATE OR REPLACE FUNCTION public.f_ttc_goi_dau_truoc_sua()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toi uuid := public.get_my_profile_id();
  la_bgd boolean := public.ttc_la_bgd(NEW.chuong_trinh_id);
  doi_nghiem_thu boolean :=
    NEW.nghiem_thu IS DISTINCT FROM OLD.nghiem_thu
    OR NEW.nguoi_nghiem_thu IS DISTINCT FROM OLD.nguoi_nghiem_thu
    OR NEW.nghiem_thu_luc IS DISTINCT FROM OLD.nghiem_thu_luc;
  doi_noi_dung boolean :=
    NEW.ten IS DISTINCT FROM OLD.ten OR NEW.muc_dich IS DISTINCT FROM OLD.muc_dich
    OR NEW.dau_ra IS DISTINCT FROM OLD.dau_ra OR NEW.can_bo IS DISTINCT FROM OLD.can_bo
    OR NEW.tieu_chuan IS DISTINCT FROM OLD.tieu_chuan OR NEW.han IS DISTINCT FROM OLD.han
    OR NEW.moc_kiem_tra IS DISTINCT FROM OLD.moc_kiem_tra
    OR NEW.dau_viec_id IS DISTINCT FROM OLD.dau_viec_id OR NEW.ket_qua IS DISTINCT FROM OLD.ket_qua;
BEGIN
  IF doi_nghiem_thu AND NOT la_bgd THEN
    RAISE EXCEPTION 'Chỉ Ban Giám đốc mới nghiệm thu được việc gối đầu';
  END IF;
  IF doi_noi_dung AND NEW.hoc_vien <> toi THEN
    RAISE EXCEPTION 'Chỉ học viên mới sửa được nội dung việc gối đầu của mình';
  END IF;
  IF doi_nghiem_thu THEN
    NEW.nguoi_nghiem_thu := toi;
    NEW.nghiem_thu_luc := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ttc_goi_dau_truoc_sua ON public.ttc_viec_goi_dau;
CREATE TRIGGER ttc_goi_dau_truoc_sua BEFORE UPDATE ON public.ttc_viec_goi_dau
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_goi_dau_truoc_sua();

-- ---------------------------------------------------------------------------
-- 4) Hàm đọc «đã điền hay chưa» — vai khác nhìn cờ, không nhìn nội dung
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ttc_trang_thai_tu_soi(_ct uuid)
RETURNS TABLE (nguoi uuid, dot int, so_tieu_chi_da_cham int, cap_nhat_luc timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.nguoi, t.dot,
         (SELECT count(*)::int FROM unnest(t.muc) m WHERE m IS NOT NULL),
         t.cap_nhat_luc
    FROM public.ttc_tu_soi t
   WHERE t.chuong_trinh_id = _ct AND public.ttc_la_thanh_vien(_ct)
$$;

CREATE OR REPLACE FUNCTION public.ttc_trang_thai_suy_ngam(_ct uuid)
RETURNS TABLE (ngay_id uuid, nguoi uuid, thoi_diem timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.ngay_id, s.nguoi, s.thoi_diem
    FROM public.ttc_suy_ngam s
    JOIN public.ttc_ngay n ON n.id = s.ngay_id
   WHERE n.chuong_trinh_id = _ct AND public.ttc_la_thanh_vien(_ct)
$$;

REVOKE ALL ON FUNCTION public.ttc_trang_thai_tu_soi(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ttc_trang_thai_suy_ngam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_trang_thai_tu_soi(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ttc_trang_thai_suy_ngam(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4b) Nhân bản chương trình — TCTH tạo chương trình mới từ chương trình mẫu
--
-- «Chương trình 10 ngày như bản đang chạy, điều chỉnh theo vị trí quy hoạch»
-- (đặc tả Mục I): sao chép ngày và đầu việc, dời lịch theo ngày bắt đầu mới,
-- giữ đúng khoảng cách giữa các ngày (kể cả cuối tuần). Không sao chép thành
-- viên, tiến độ, điểm — chương trình mới bắt đầu sạch, người gọi là quản trị.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ttc_nhan_ban_chuong_trinh(_nguon uuid, _ten text, _ngay_bd date)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  goc public.ttc_chuong_trinh;
  moi uuid;
  lech int;
  r record;
  ngay_moi uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role)
          OR public.has_role(auth.uid(), 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổng hợp mới nhân bản được chương trình';
  END IF;
  SELECT * INTO goc FROM public.ttc_chuong_trinh WHERE id = _nguon;
  IF goc.id IS NULL THEN RAISE EXCEPTION 'Không thấy chương trình nguồn'; END IF;
  lech := _ngay_bd - goc.ngay_bd;

  INSERT INTO public.ttc_chuong_trinh
    (ten, mo_ta, ngay_bd, ngay_kt, trang_thai, nhom_doi_tuong, loai, khoi_nang_luc, la_mau,
     vi_do, kinh_do, ban_kinh_m, nguoi_tao)
  VALUES (_ten, goc.mo_ta, _ngay_bd, goc.ngay_kt + lech, 'CHUAN_BI', goc.nhom_doi_tuong, goc.loai,
          goc.khoi_nang_luc, false, goc.vi_do, goc.kinh_do, goc.ban_kinh_m, public.get_my_profile_id())
  RETURNING id INTO moi;

  FOR r IN SELECT * FROM public.ttc_ngay WHERE chuong_trinh_id = _nguon ORDER BY so_thu_tu LOOP
    INSERT INTO public.ttc_ngay
      (chuong_trinh_id, so_thu_tu, ngay, tieu_de, khoi, van_ban, nhiem_vu_van_ban, chuan_bi, lat_cat, cau_hoi_tu_soi)
    VALUES (moi, r.so_thu_tu, r.ngay + lech, r.tieu_de, r.khoi, r.van_ban, r.nhiem_vu_van_ban, r.chuan_bi, r.lat_cat, r.cau_hoi_tu_soi)
    RETURNING id INTO ngay_moi;
    INSERT INTO public.ttc_dau_viec
      (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
    SELECT ngay_moi, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam
      FROM public.ttc_dau_viec WHERE ngay_id = r.id;
  END LOOP;
  RETURN moi;
END $$;

REVOKE ALL ON FUNCTION public.ttc_nhan_ban_chuong_trinh(uuid, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_nhan_ban_chuong_trinh(uuid, text, date) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Kanban hàng ngày của học viên — đọc thẻ THẬT từ Chiêu thức 2
--
-- Vì sao qua RPC chứ không select thẳng: RLS của ct2_dau_viec mở theo phòng /
-- PGĐ phụ trách / quản trị toàn CN. Người hướng dẫn và BGĐ vốn đã thấy, nhưng
-- một chương trình sau này (VD cán bộ mới ở phòng khác, người kèm cặp ở phòng
-- khác) thì không. Hàm gác bằng bảng thành viên chương trình, trả đúng những
-- thẻ thuộc về học viên: thẻ do học viên chịu trách nhiệm + ba thẻ gối đầu đã
-- liên kết (người chịu trách nhiệm là cán bộ được giao).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ttc_kanban_hoc_vien(_ct uuid, _hoc_vien uuid)
RETURNS SETOF public.ct2_dau_viec
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.*
    FROM public.ct2_dau_viec d
   WHERE public.ttc_la_thanh_vien(_ct)
     AND EXISTS (SELECT 1 FROM public.ttc_thanh_vien tv
                  WHERE tv.chuong_trinh_id = _ct AND tv.nguoi = _hoc_vien AND tv.vai = 'hoc_vien')
     AND (
       d.nguoi_chiu_trach_nhiem = _hoc_vien
       OR d.id IN (SELECT g.dau_viec_id FROM public.ttc_viec_goi_dau g
                    WHERE g.chuong_trinh_id = _ct AND g.hoc_vien = _hoc_vien AND g.dau_viec_id IS NOT NULL)
     )
     AND (
       d.trang_thai IN ('CHUAN_BI','DANG_LAM','CHO_PHOI_HOP','CHO_DUYET')
       OR (d.trang_thai IN ('HOAN_THANH','DA_DONG') AND d.updated_at >= now() - interval '14 days')
     )
   ORDER BY d.han_hoan_thanh NULLS LAST, d.created_at
$$;

REVOKE ALL ON FUNCTION public.ttc_kanban_hoc_vien(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_kanban_hoc_vien(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) BỐN mốc thông báo (đặc tả Mục V) — đi qua ct2_dat_thong_bao để hưởng luật
--    im lặng ngoài giờ, kênh chuông + push, và một chỗ đánh dấu đã đọc.
--
-- Đây là ràng buộc thiết kế: KHÔNG bắn theo từng ô tích. Cho phép bật thông báo
-- theo từng ô tích thì người nhận sẽ tắt hết trong ba ngày.
-- ---------------------------------------------------------------------------

-- Gửi cho mọi thành viên mang một trong các vai — trả về có tin nào phát ngay không
CREATE OR REPLACE FUNCTION public.ttc_bao_cho_vai(
  _ct uuid, _vai text[], _ma text, _tieu_de text, _noi_dung text, _muc text DEFAULT 'NHE')
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  phat_ngay boolean := false;
BEGIN
  FOR r IN SELECT nguoi FROM public.ttc_thanh_vien WHERE chuong_trinh_id = _ct AND vai = ANY(_vai) LOOP
    -- Cùng một tin (cùng người nhận, cùng tiêu đề, cùng thân) trong 24 giờ chỉ
    -- sinh MỘT lần. Lý do có thật khi chạy thử: học viên tích 9 ô của một ngày
    -- bằng một lệnh ghi nhiều dòng thì trigger từng dòng thấy cả 9 dòng đã đủ và
    -- bắn 9 tin giống hệt nhau; cron chạy lặp cũng vậy. Chặn ở đây thì mọi mốc
    -- đều được che, không phải nhớ chặn ở từng trigger.
    IF EXISTS (
      SELECT 1 FROM public.ct2_thong_bao t
       WHERE t.ma_su_kien = _ma AND t.nguoi_nhan = r.nguoi
         AND t.tieu_de = _tieu_de AND t.noi_dung = _noi_dung
         AND t.created_at > now() - interval '1 day'
    ) THEN CONTINUE; END IF;
    IF public.ct2_dat_thong_bao(_ma, r.nguoi, _tieu_de, _noi_dung, _muc, NULL, NULL) THEN
      phat_ngay := true;
    END IF;
  END LOOP;
  RETURN phat_ngay;
END $$;

REVOKE ALL ON FUNCTION public.ttc_bao_cho_vai(uuid, text[], text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Mốc 1: học viên tích đủ toàn bộ đầu việc trong ngày → Giám đốc và PGĐ
CREATE OR REPLACE FUNCTION public.f_ttc_sau_tich_tien_do()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ngay public.ttc_ngay;
  v_tong int;
  v_xong int;
  v_ten text;
BEGIN
  IF NOT NEW.hoan_thanh THEN RETURN NEW; END IF;
  -- Đổi từ chưa → đã tích mới xét; sửa ghi chú của ô đã tích thì không
  IF TG_OP = 'UPDATE' AND OLD.hoan_thanh THEN RETURN NEW; END IF;

  SELECT n.* INTO v_ngay FROM public.ttc_ngay n
    JOIN public.ttc_dau_viec d ON d.ngay_id = n.id WHERE d.id = NEW.dau_viec_id;
  SELECT count(*) INTO v_tong FROM public.ttc_dau_viec WHERE ngay_id = v_ngay.id;
  SELECT count(*) INTO v_xong FROM public.ttc_tien_do t
    JOIN public.ttc_dau_viec d ON d.id = t.dau_viec_id
   WHERE d.ngay_id = v_ngay.id AND t.nguoi = NEW.nguoi AND t.hoan_thanh;
  IF v_tong = 0 OR v_xong < v_tong THEN RETURN NEW; END IF;

  SELECT full_name INTO v_ten FROM public.profiles WHERE id = NEW.nguoi;
  -- Chuẩn hình thức push 09/08: tiêu đề ngắn mang con số, thân tin mỗi dòng một nhãn
  IF public.ttc_bao_cho_vai(
       v_ngay.chuong_trinh_id, ARRAY['bgd','huong_dan'], 'TTC_DU_NGAY',
       format('Ngày %s: đủ %s/%s đầu việc', v_ngay.so_thu_tu, v_xong, v_tong),
       format(E'Học viên: %s\nNgày: %s · %s\nNội dung: Đã hoàn thành đủ %s đầu việc. Sẵn sàng để đánh giá.',
              COALESCE(v_ten, 'Học viên'), v_ngay.so_thu_tu, v_ngay.tieu_de, v_tong),
       'NHE')
  THEN
    PERFORM public.ct2_kich_hoat_phat_push();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ttc_sau_tich_tien_do ON public.ttc_tien_do;
CREATE TRIGGER ttc_sau_tich_tien_do AFTER INSERT OR UPDATE OF hoan_thanh ON public.ttc_tien_do
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_sau_tich_tien_do();

-- Mốc 4: một thang Bloom dưới 60% điểm tối đa → Giám đốc
CREATE OR REPLACE FUNCTION public.f_ttc_sau_cham_bloom()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ngay public.ttc_ngay;
  v_ten text;
  thang text[] := ARRAY[]::text[];
BEGIN
  IF NEW.b1 < 10 * 0.6 THEN thang := thang || format('Nhớ %s/10', NEW.b1); END IF;
  IF NEW.b2 < 15 * 0.6 THEN thang := thang || format('Hiểu %s/15', NEW.b2); END IF;
  IF NEW.b3 < 20 * 0.6 THEN thang := thang || format('Vận dụng %s/20', NEW.b3); END IF;
  IF NEW.b4 < 20 * 0.6 THEN thang := thang || format('Phân tích %s/20', NEW.b4); END IF;
  IF NEW.b5 < 20 * 0.6 THEN thang := thang || format('Đánh giá %s/20', NEW.b5); END IF;
  IF NEW.b6 < 15 * 0.6 THEN thang := thang || format('Sáng tạo %s/15', NEW.b6); END IF;
  IF cardinality(thang) = 0 THEN RETURN NEW; END IF;
  -- Sửa phiếu mà bộ thang yếu không đổi thì không báo lại
  IF TG_OP = 'UPDATE' AND (NEW.b1, NEW.b2, NEW.b3, NEW.b4, NEW.b5, NEW.b6)
       = (OLD.b1, OLD.b2, OLD.b3, OLD.b4, OLD.b5, OLD.b6) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_ngay FROM public.ttc_ngay WHERE id = NEW.ngay_id;
  SELECT full_name INTO v_ten FROM public.profiles WHERE id = NEW.hoc_vien;
  IF public.ttc_bao_cho_vai(
       v_ngay.chuong_trinh_id, ARRAY['bgd'], 'TTC_CUNG_CO',
       format('Ngày %s: %s cấu phần cần củng cố', v_ngay.so_thu_tu, cardinality(thang)),
       format(E'Học viên: %s\nNgày: %s · %s\nCấu phần: %s\nNội dung: Nên đưa vào bản đồ năng lực ngay.',
              COALESCE(v_ten, 'Học viên'), v_ngay.so_thu_tu, v_ngay.tieu_de, array_to_string(thang, ' · ')),
       'VANG')
  THEN
    PERFORM public.ct2_kich_hoat_phat_push();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ttc_sau_cham_bloom ON public.ttc_diem_bloom;
CREATE TRIGGER ttc_sau_cham_bloom AFTER INSERT OR UPDATE ON public.ttc_diem_bloom
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_sau_cham_bloom();

-- Mốc 2: 15:10 hằng ngày, 20 phút trước phiên trình bày → GĐ, PGĐ và học viên.
-- Chỉ ngày nào có đầu việc «Trình bày» bắt đầu trong khung 15:10–16:10 mới nhắc
-- (ngày 1 và ngày 10 không có phiên 15:30).
CREATE OR REPLACE FUNCTION public.ttc_nhac_sap_trinh_bay()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  so_gui int := 0;
  hom_nay date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF NOT public.ct2_la_ngay_lam_viec() THEN RETURN 0; END IF;
  FOR r IN
    -- Một ngày có thể có hai đầu việc «Trình bày» trong khung (trình bày 15:30
    -- và phản hồi 16:00) — chỉ nhắc MỘT lần theo giờ sớm nhất
    SELECT n.chuong_trinh_id, n.so_thu_tu, n.tieu_de, min(d.gio_bat_dau) AS gio_bat_dau
      FROM public.ttc_ngay n
      JOIN public.ttc_chuong_trinh c ON c.id = n.chuong_trinh_id AND c.trang_thai <> 'KET_THUC'
      JOIN public.ttc_dau_viec d ON d.ngay_id = n.id
     WHERE n.ngay = hom_nay AND d.phan = 'TRINH_BAY'
       AND d.gio_bat_dau BETWEEN time '15:10' AND time '16:10'
     GROUP BY n.chuong_trinh_id, n.so_thu_tu, n.tieu_de
  LOOP
    IF public.ttc_bao_cho_vai(
         r.chuong_trinh_id, ARRAY['bgd','huong_dan','hoc_vien'], 'TTC_SAP_TRINH_BAY',
         format('Ngày %s: 20 phút nữa tới phiên trình bày', r.so_thu_tu),
         format(E'Ngày: %s · %s\nGiờ: %s\nNội dung: 20 phút nữa tới phiên trình bày 30 phút với Ban Giám đốc.',
                r.so_thu_tu, r.tieu_de, to_char(r.gio_bat_dau, 'HH24:MI')),
         'NHE')
    THEN
      so_gui := so_gui + 1;
    END IF;
  END LOOP;
  IF so_gui > 0 THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN so_gui;
END $$;

-- Mốc 3: 17:00 mà học viên chưa hoàn thành đủ đầu việc → Giám đốc và PGĐ
CREATE OR REPLACE FUNCTION public.ttc_nhac_con_viec()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  so_gui int := 0;
  hom_nay date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF NOT public.ct2_la_ngay_lam_viec() THEN RETURN 0; END IF;
  FOR r IN
    SELECT n.chuong_trinh_id, n.so_thu_tu, n.tieu_de, tv.nguoi, p.full_name,
           (SELECT count(*) FROM public.ttc_dau_viec d WHERE d.ngay_id = n.id) AS tong,
           (SELECT count(*) FROM public.ttc_dau_viec d
              JOIN public.ttc_tien_do t ON t.dau_viec_id = d.id AND t.nguoi = tv.nguoi AND t.hoan_thanh
             WHERE d.ngay_id = n.id) AS xong
      FROM public.ttc_ngay n
      JOIN public.ttc_chuong_trinh c ON c.id = n.chuong_trinh_id AND c.trang_thai <> 'KET_THUC'
      JOIN public.ttc_thanh_vien tv ON tv.chuong_trinh_id = n.chuong_trinh_id AND tv.vai = 'hoc_vien'
      JOIN public.profiles p ON p.id = tv.nguoi
     WHERE n.ngay = hom_nay
  LOOP
    IF r.tong > 0 AND r.xong < r.tong THEN
      IF public.ttc_bao_cho_vai(
           r.chuong_trinh_id, ARRAY['bgd','huong_dan'], 'TTC_CON_VIEC',
           format('Ngày %s: còn %s đầu việc chưa hoàn thành', r.so_thu_tu, r.tong - r.xong),
           format(E'Học viên: %s\nNgày: %s · %s\nNội dung: Đến 17:00 còn %s/%s đầu việc chưa hoàn thành.',
                  r.full_name, r.so_thu_tu, r.tieu_de, r.tong - r.xong, r.tong),
           'VANG')
      THEN
        so_gui := so_gui + 1;
      END IF;
    END IF;
  END LOOP;
  IF so_gui > 0 THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN so_gui;
END $$;

REVOKE ALL ON FUNCTION public.ttc_nhac_sap_trinh_bay() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ttc_nhac_con_viec() FROM PUBLIC, anon, authenticated;

-- Lịch: 08:10 UTC = 15:10 VN · 10:00 UTC = 17:00 VN, thứ 2 → thứ 6. Hàm tự bỏ
-- qua ngày nghỉ theo lịch nghỉ lễ và tự im lặng khi không có chương trình chạy.
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('ttc-nhac-sap-trinh-bay')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ttc-nhac-sap-trinh-bay');
    PERFORM cron.unschedule('ttc-nhac-con-viec')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ttc-nhac-con-viec');
    PERFORM cron.schedule('ttc-nhac-sap-trinh-bay', '10 8 * * 1-5', $job$ SELECT public.ttc_nhac_sap_trinh_bay(); $job$);
    PERFORM cron.schedule('ttc-nhac-con-viec', '0 10 * * 1-5', $job$ SELECT public.ttc_nhac_con_viec(); $job$);
  END IF;
END $cron$;

-- ---------------------------------------------------------------------------
-- 7) SEED — Chương trình 10 ngày Trưởng phòng KHDN Bản 4.0 (07–18/09/2026)
--
-- Nội dung lấy từ «Tài liệu điều hành của Giám đốc» Bản 4.0 và «Khung chia sẻ
-- và tự suy ngẫm» 1.0. Thành viên gán theo họ tên trong profiles (cùng cách với
-- leadership_marks_dau_an): tên nào chưa có hồ sơ thì bỏ qua, Phòng TCTH thêm
-- tay sau. Chỉ nạp khi chưa có chương trình cùng tên — chạy lại không nhân đôi.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ttc_seed_tam_viec(
  _ct uuid, _so int, _phan text, _bd text, _kt text, _ten text, _dau_ra text,
  _ai text, _thiet_bi text, _noi_nop text, _trong_tam boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_ngay uuid;
  v_tt int;
BEGIN
  SELECT id INTO v_ngay FROM public.ttc_ngay WHERE chuong_trinh_id = _ct AND so_thu_tu = _so;
  SELECT COALESCE(max(thu_tu), 0) + 1 INTO v_tt FROM public.ttc_dau_viec WHERE ngay_id = v_ngay;
  INSERT INTO public.ttc_dau_viec
    (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam)
  VALUES (v_ngay, _phan, v_tt, _bd::time, _kt::time, _ten, _dau_ra, _ai, _thiet_bi, _noi_nop, _trong_tam);
END $$;

-- Khung ngày chuẩn (ngày 2–9): sáng theo khung, chiều là chuyên đề riêng, rồi
-- tự suy ngẫm → trình bày → phản hồi → triển khai + PDCA
CREATE OR REPLACE FUNCTION public.ttc_seed_tam_sang_chuan(_ct uuid, _so int, _stt_phieu int)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.ttc_seed_tam_viec(_ct, _so, 'KHOI_DONG', '07:30', '07:50',
    'VietinType 20 phút theo bài dựng sẵn của phần mềm. Ghi tốc độ, độ chính xác, nhóm lỗi phím.',
    'Log VietinType trong ngày', 'TCTH', 'MAY_CO_QUAN', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(_ct, _so, 'VAN_BAN', '07:50', '09:20',
    'Đọc văn bản của ngày theo 3 lượt: quét cấu trúc → đọc sâu đánh dấu thay đổi/điều kiện/rủi ro → đóng văn bản kể lại.',
    format('Phiếu văn bản 1 trang số %s (Phụ lục 1) — NGAY%s_PHIEUVANBAN', _stt_phieu, lpad(_so::text, 2, '0')),
    'HOC_VIEN', 'MAY_CO_QUAN', 'EMAIL');
  PERFORM public.ttc_seed_tam_viec(_ct, _so, 'VAN_BAN', '09:20', '10:20',
    'Lập phiếu 06 thang Bloom cho chính văn bản đó (Phụ lục 2).',
    format('Phiếu Bloom 6 thang số %s — NGAY%s_PHIEUBLOOM', _stt_phieu, lpad(_so::text, 2, '0')),
    'HOC_VIEN', 'MAY_CO_QUAN', 'EMAIL');
  PERFORM public.ttc_seed_tam_viec(_ct, _so, 'VAN_BAN', '10:20', '11:30',
    'Làm slide PowerPoint 5–7 trang trên máy tính cơ quan. KHÔNG dùng AI. Mỗi slide thể hiện một thang Bloom, ghi nhãn thang ở góc slide.',
    format('File .pptx số %s đặt tên theo quy tắc — NGAY%s_SLIDE', _stt_phieu, lpad(_so::text, 2, '0')),
    'HOC_VIEN', 'MAY_CO_QUAN', 'EMAIL', true);
END $$;

CREATE OR REPLACE FUNCTION public.ttc_seed_tam_chieu_chuan(
  _ct uuid, _so int, _phan_hoi_them text DEFAULT NULL, _ai_phan_hoi text DEFAULT 'GD_PGD',
  _trien_khai text DEFAULT NULL, _dau_ra_trien_khai text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.ttc_seed_tam_viec(_ct, _so, 'TU_SUY_NGAM', '15:05', '15:25',
    'Phiên tự suy ngẫm 20 phút: viết tay 10 phút → tự chấm mức trên thang 5 mức 3 phút → nói ra 5 phút. Không tranh luận, không phản hồi.',
    '3 dòng viết tay, nhập vào ô Tự suy ngẫm của ngày', 'HOC_VIEN', 'GIAY', 'TRAINING_CENTER');
  PERFORM public.ttc_seed_tam_viec(_ct, _so, 'TRINH_BAY', '15:30', '16:00',
    'Trình bày 30 phút với Giám đốc và/hoặc PGĐ phụ trách: 12 phút trình bày, 15 phút hỏi đáp, 3 phút chốt.',
    'Phiếu chấm Bloom (Phụ lục 3) do Ban Giám đốc ghi', 'GD_PGD', 'LAPTOP', 'KHONG', true);
  PERFORM public.ttc_seed_tam_viec(_ct, _so, 'TRINH_BAY', '16:00', '16:30',
    'Phản hồi theo cấu trúc: sự việc – ảnh hưởng – kỳ vọng – hỗ trợ – cam kết.'
      || COALESCE(' ' || _phan_hoi_them, ''),
    'Biên bản phản hồi ngắn', _ai_phan_hoi, 'KHONG', 'KHONG');
  PERFORM public.ttc_seed_tam_viec(_ct, _so, 'THUC_HANH', '16:30', '17:00',
    COALESCE(_trien_khai, 'Thiết kế cách triển khai văn bản đó tại Phòng KHDN: ai đọc, ai làm gì, checklist, bộ 10 câu Quizizz, mốc kiểm tra. Chốt PDCA cuối ngày.'),
    COALESCE(_dau_ra_trien_khai, 'Phiếu triển khai văn bản + bộ Quizizz + phiếu PDCA'),
    'HOC_VIEN', 'LAPTOP', 'TRAINING_CENTER');
END $$;

DO $seed$
DECLARE
  v_ct uuid;
  v_gd uuid; v_pgd uuid; v_hv uuid; v_qt uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.ttc_chuong_trinh WHERE ten = 'Chương trình 10 ngày Trưởng phòng KHDN — Bản 4.0') THEN
    RETURN;
  END IF;

  INSERT INTO public.ttc_chuong_trinh (ten, mo_ta, ngay_bd, ngay_kt, trang_thai, nhom_doi_tuong, loai, khoi_nang_luc, la_mau, vi_do, kinh_do, ban_kinh_m)
  VALUES (
    'Chương trình 10 ngày Trưởng phòng KHDN — Bản 4.0',
    'Khai tâm trước – Tư duy mỗi ngày – Rà soát chuyên môn – AI sau cùng. Bốn khối: quản trị bản thân → công việc → người khác → hệ thống. Bốn bảng điểm tách biệt, không cộng thành một điểm tổng.',
    '2026-09-07', '2026-09-18', 'DANG_CHAY', 'QUY_HOACH', '10 ngày',
    'Bốn tầng: quản trị bản thân → công việc → người khác → hệ thống', true,
    -- Toạ độ TẠM TÍNH khu vực Phường Mỹ Hào — phải đứng tại cổng chi nhánh lấy toạ độ thật
    20.9346, 106.0669, 250)
  RETURNING id INTO v_ct;

  -- Ba chương trình DỰ KIẾN cho ba nhóm còn lại (đặc tả Mục I): có mặt trong
  -- danh mục ở trạng thái Chuẩn bị, chưa có ngày và thành viên — Phòng TCTH
  -- điền nội dung ở màn Quản trị chương trình hoặc nhân bản từ mẫu.
  INSERT INTO public.ttc_chuong_trinh (ten, mo_ta, ngay_bd, ngay_kt, trang_thai, nhom_doi_tuong, loai, khoi_nang_luc) VALUES
  ('Chương trình hội nhập 30 ngày cho cán bộ mới',
   'Nắm quy trình, sản phẩm và văn hoá làm việc trong 30–60 ngày đầu; kèm bộ bài rà soát cơ bản. Mỗi tuần một khối, mỗi ngày một đầu việc có người kèm.',
   '2026-10-01', '2026-10-30', 'CHUAN_BI', 'CAN_BO_MOI', 'Hội nhập 30 ngày', 'Tầng 1 — Quản trị bản thân'),
  ('Chuyên đề thẩm định tín dụng và dự án đầu tư',
   'Bổ sung đúng khoảng trống đã lộ ra qua công việc thực tế: thẩm định tín dụng, dự án đầu tư, sản phẩm. Bài rà soát có bấm giờ, đáp án mở hai bước.',
   '2026-10-06', '2026-10-10', 'CHUAN_BI', 'NANG_CAP_CHUYEN_MON', 'Chuyên đề', 'Tầng 1 — Rà soát chuyên môn'),
  ('Duy trì 30–60–90 ngày cho cán bộ quản lý đương nhiệm',
   'Rà soát năng lực định kỳ và duy trì hành vi quản trị: bảng việc, giao việc có repeat-back, coaching, IDP; tự soi định kỳ theo 08 tiêu chí.',
   '2026-09-21', '2026-12-18', 'CHUAN_BI', 'QUAN_LY_DUONG_NHIEM', 'Duy trì 30–60–90', 'Tầng 3–4 — Quản trị người khác và hệ thống');

  -- Thành viên: gán theo họ tên, thiếu hồ sơ thì bỏ qua (Phòng TCTH thêm tay sau)
  SELECT id INTO v_gd  FROM public.profiles WHERE full_name = 'Trần Đức Anh' AND status = 'active' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_pgd FROM public.profiles WHERE full_name = 'Nguyễn Đức Thái Hoàng' AND status = 'active' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_hv  FROM public.profiles WHERE full_name = 'Đỗ Việt Anh' AND status = 'active' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_qt  FROM public.profiles WHERE full_name = 'Vũ Thị Thu Hà' AND status = 'active' ORDER BY created_at LIMIT 1;
  IF v_gd  IS NOT NULL THEN INSERT INTO public.ttc_thanh_vien (chuong_trinh_id, nguoi, vai) VALUES (v_ct, v_gd, 'bgd'); END IF;
  IF v_pgd IS NOT NULL THEN INSERT INTO public.ttc_thanh_vien (chuong_trinh_id, nguoi, vai) VALUES (v_ct, v_pgd, 'huong_dan'); END IF;
  IF v_hv  IS NOT NULL THEN INSERT INTO public.ttc_thanh_vien (chuong_trinh_id, nguoi, vai) VALUES (v_ct, v_hv, 'hoc_vien'); END IF;
  IF v_qt  IS NOT NULL THEN INSERT INTO public.ttc_thanh_vien (chuong_trinh_id, nguoi, vai) VALUES (v_ct, v_qt, 'quan_tri'); END IF;

  -- 10 ngày
  INSERT INTO public.ttc_ngay (chuong_trinh_id, so_thu_tu, ngay, tieu_de, khoi, van_ban, nhiem_vu_van_ban, chuan_bi, lat_cat, cau_hoi_tu_soi) VALUES
  (v_ct, 1, '2026-09-07', 'Khai tâm và cam kết', 'Khai tâm', NULL, NULL,
    'Gửi mẫu tin zlt1 cho 15–20 khách hàng lớn nhất, đặt trạng thái Zalo zlt2, rời các nhóm tác nghiệp của Phòng.',
    'Tôi đang ở tầng nào',
    'Trong bốn tầng, tầng nào tôi đang đứng vững nhất? Câu hỏi tôi hay đặt ra nhất trong tuần vừa rồi là câu hỏi của vai nào?'),
  (v_ct, 2, '2026-09-08', 'Khối 1 – Quản trị bản thân (vào nhịp)', 'Khối 1 · Quản trị bản thân',
    '8735/TGĐ-NHCT-KHDN3 – Quy định phân loại khách hàng doanh nghiệp', 'Đến thang 4 – Phân tích',
    'Đọc lượt 1 văn bản được giao chiều hôm trước. Chuẩn bị mẫu phiếu văn bản, phiếu Bloom.',
    'Vốn kiến thức',
    'Điều gì tôi tưởng mình biết nhưng hôm nay đọc kỹ mới thấy khác? Kiến thức nào của tôi đang dựa vào thói quen thay vì dựa vào văn bản?'),
  (v_ct, 3, '2026-09-09', 'Khối 1 – Triển khai văn bản tại Phòng', 'Khối 1 · Quản trị bản thân',
    '8449/TGĐ-NHCT-QLRR1 – Quy định về nhận diện và quản lý rủi ro tín dụng', 'Đến thang 4 – Phân tích',
    'Đọc lượt 1 văn bản. Chuẩn bị 03 cán bộ chạy thử Quizizz chiều nay.',
    'Vốn kiến thức chuyển thành hành vi',
    'Một văn bản tôi đã phổ biến trước đây có thật sự đổi được cách làm của RM không? Bằng chứng nào cho thấy điều đó?'),
  (v_ct, 4, '2026-09-10', 'Bài tập 1 – Rà soát chỉ số tài chính', 'Khối 1 · Rà soát chuyên môn',
    '4.1/4.2 Thẩm định và quản lý tín dụng (bộ tài liệu Upskills) – đọc trước Bài tập 1', 'Đến thang 5 – Đánh giá',
    'Đọc lượt 1 tài liệu Thẩm định và quản lý tín dụng. Bài tập 60 phút, không AI, không internet.',
    'Tầng 1 — Quản trị bản thân',
    'Sau bài rà soát hôm nay: điều gì tôi làm chắc, điều gì tôi muốn luyện thêm? Kỷ luật, chủ động, học tập, kiên trì, trách nhiệm — tiêu chí nào của tôi mạnh nhất?'),
  (v_ct, 5, '2026-09-11', 'Khối 2 – Quản trị công việc', 'Khối 2 · Quản trị công việc',
    'Tài liệu Lập kế hoạch hành động và Chiêu thức số 2 (KHHĐ – PDCA – Kanban)', 'Đến thang 6 – Sáng tạo',
    'Lấy sẵn danh sách 30 việc từ JD và danh sách bàn giao để đưa lên bảng Kanban.',
    'Tầng 2 — Quản trị công việc',
    'Trong các đầu việc tôi vừa đưa lên bảng, việc nào thật sự chỉ tôi làm được? Việc nào tôi đang giữ vì quen tay?'),
  (v_ct, 6, '2026-09-14', 'Bài tập 2 – Rà soát bảng chạy dự án', 'Khối 1 · Rà soát chuyên môn',
    'Hướng dẫn thẩm định dự án đầu tư – đọc trước Bài tập 2', 'Đến thang 5 – Đánh giá',
    'Đọc lượt 1 hướng dẫn thẩm định dự án. Bài tập 120 phút: KHÔNG xây lại mô hình trước khi chỉ ra được lỗi.',
    'Vốn uy tín',
    'Uy tín chuyên môn của tôi đang dựa trên điều gì — thâm niên, quan hệ, hay khả năng nhìn ra điều người khác chưa nhìn ra?'),
  (v_ct, 7, '2026-09-15', 'Khối 3 – Giao việc và bám việc', 'Khối 3 · Quản trị người khác',
    '111/SP-TGĐ-NHCT-KHDN4.2 – Sản phẩm tài trợ vốn lưu động', 'Đến thang 5 – Đánh giá',
    'Chọn một nhiệm vụ THẬT nhưng PHI SỰ VỤ để giao việc (VD tổng hợp dữ liệu doanh nghiệp trong KCN/CCN). Từ hôm nay được dùng AI trong ca 16:00–17:00.',
    'Tầng 3 — Giao việc',
    'Buổi giao việc vừa rồi, cán bộ nhắc lại yêu cầu có khớp với điều tôi nghĩ mình đã nói không? Chênh lệch nằm ở đâu?'),
  (v_ct, 8, '2026-09-16', 'Khối 3 – Huấn luyện, kèm cặp và IDP', 'Khối 3 · Quản trị người khác',
    '105.02/SP-TGĐ-NHCT-KHDN4.2 và 100.01/SP-TGĐ-NHCT-KHDN', 'Đến thang 6 – Sáng tạo',
    'Chọn một cán bộ và một khoảng trống năng lực PHI SỰ VỤ để coaching. 10 phút đầu chỉ được hỏi.',
    'Tầng 3 — Phát triển người',
    'Trong buổi kèm cặp, tôi nói bao nhiêu phần trăm thời gian? Cán bộ tự nghĩ ra phương án hay tôi đã đưa sẵn?'),
  (v_ct, 9, '2026-09-17', 'Khối 4 – Quản trị hệ thống', 'Khối 4 · Quản trị hệ thống',
    'Bộ chương trình trên cổng Bắc Hưng Yên ONE + 2688/KV12-TH', 'Đến thang 6 – Sáng tạo',
    'Đọc lại tài liệu của TỪNG chương trình trên cổng ONE. Đo thời gian thực tế 03 quy trình RM hay làm nhất.',
    'Tầng 4 — Quản trị hệ thống · Vốn quan hệ · Vốn cơ hội',
    'Sáu đòn bẩy hệ thống — mục tiêu, cơ cấu, quy trình, cơ chế, kiểm soát, văn hoá — Phòng tôi đang yếu ở đòn bẩy nào? Tôi kết nối được với ai để thay đổi nó?'),
  (v_ct, 10, '2026-09-18', 'Đo lại – Bảo vệ – Cam kết', 'Tổng kết',
    '8108/TGĐ-NHCT-KHDN – Định hướng kinh doanh KHDN', 'Đến thang 6 – Sáng tạo',
    'Chọn 06 sản phẩm để bảo vệ, tự chấm theo rubric TRƯỚC khi xem điểm của hội đồng.',
    'Tổng thể — Tự soi và cam kết',
    'Tôi đang ở tầng nào so với ngày 1? Điều gì đang cản tôi lên tầng tiếp theo? Từ ngày mai tôi cần dừng gì, bắt đầu gì, tiếp tục gì?');

  -- NGÀY 1 — Khai tâm và cam kết
  PERFORM public.ttc_seed_tam_viec(v_ct, 1, 'KHOI_DONG', '08:00', '08:20', 'Khai mạc. Giám đốc nêu bối cảnh: Chi nhánh đang ở đâu, Phòng KHDN đang ở đâu, và vì sao vai Trưởng phòng là điểm nghẽn quyết định.', 'Biên bản khai mạc', 'GD', 'KHONG', 'KHONG');
  PERFORM public.ttc_seed_tam_viec(v_ct, 1, 'KHOI_DONG', '08:20', '09:00', 'Chia sẻ lộ trình 10 ngày: 4 khối, khung ngày, cách chấm, bốn bảng điểm tách biệt, quyền giải trình của người học.', 'Người học nhắc lại được lộ trình bằng lời của mình', 'GD', 'KHONG', 'KHONG');
  PERFORM public.ttc_seed_tam_viec(v_ct, 1, 'THUC_HANH', '09:00', '10:00', 'Phiên tư duy: BA CÂU HỎI TỰ TRẢ LỜI — viết tay 10 phút mỗi câu rồi đọc to. Giám đốc chỉ hỏi lại, không phản bác.', '03 trang viết tay của người học', 'GD', 'GIAY', 'TCTH', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 1, 'THUC_HANH', '10:00', '10:45', 'Khoảng cách giữa BIẾT và LÀM ĐƯỢC: mô hình 70–20–10; vì sao chương trình bắt tự làm trước và chỉ mở AI ở nửa sau. Phiên Giám đốc chia sẻ: lãi kép nghề nghiệp, năm loại vốn.', 'Người học tự nêu 3 việc mình vẫn «biết mà chưa làm»', 'GD', 'KHONG', 'KHONG');
  PERFORM public.ttc_seed_tam_viec(v_ct, 1, 'THUC_HANH', '10:45', '11:30', 'Bảy nguyên tắc và ranh giới trong 10 ngày. Làm rõ: điều gì được làm, điều gì không, xử lý thế nào khi có việc gấp.', 'Bảng ranh giới được hai bên xác nhận', 'GD_PGD', 'KHONG', 'KHONG');
  PERFORM public.ttc_seed_tam_viec(v_ct, 1, 'THUC_HANH', '13:30', '14:00', 'KÝ CAM KẾT bằng giấy (Phụ lục 6). Ba bên ký: người học, PGĐ phụ trách, Giám đốc.', 'Bản cam kết gốc lưu TCTH', 'GD_PGD', 'GIAY', 'TCTH', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 1, 'THUC_HANH', '14:00', '14:40', 'Bàn giao có cấu trúc toàn bộ việc đang mở sang PGĐ Hoàng: trạng thái, việc tiếp theo, người làm, hạn, rủi ro, nơi lưu.', 'Danh sách bàn giao có xác nhận', 'PGD', 'LAPTOP', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(v_ct, 1, 'KHOI_DONG', '14:40', '15:20', 'Cài đặt và đo VietinType lần 1 làm MỐC NỀN. Kết quả này không tính điểm, chỉ để so với ngày 10.', 'Log nền VietinType', 'TCTH', 'MAY_CO_QUAN', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(v_ct, 1, 'THUC_HANH', '15:20', '16:30', 'Hướng dẫn thao tác khung ngày: mẫu phiếu văn bản, phiếu Bloom, chuẩn slide, cách nộp file, quy tắc đặt tên. Đăng nhập Training Center trên điện thoại và laptop.', 'Người học làm thử 01 phiếu văn bản mẫu', 'TCTH', 'LAPTOP', 'EMAIL');
  PERFORM public.ttc_seed_tam_viec(v_ct, 1, 'TU_SUY_NGAM', '16:00', '16:30', 'Tự chấm phiếu 08 tiêu chí trưởng thành lần 1 — MỐC NỀN. Mỗi mức kèm một ví dụ có thật trong ba tháng gần đây.', 'Phiếu tự soi đợt 1 trên Training Center', 'HOC_VIEN', 'LAPTOP', 'TRAINING_CENTER', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 1, 'THUC_HANH', '16:30', '17:00', 'Giao văn bản ngày 2. Chốt PDCA ngày 1.', 'Phiếu PDCA', 'TCTH', 'LAPTOP', 'TRAINING_CENTER');

  -- NGÀY 2
  PERFORM public.ttc_seed_tam_sang_chuan(v_ct, 2, 1);
  PERFORM public.ttc_seed_tam_viec(v_ct, 2, 'THUC_HANH', '13:30', '15:05', 'Chuyên đề: cách một văn bản đi từ hộp thư đến hành vi của RM. Vẽ dòng chảy hiện tại của Phòng và chỉ ra 3 điểm rơi.', 'Sơ đồ dòng chảy văn bản + 3 điểm rơi (PGĐ kiểm)', 'HOC_VIEN', 'LAPTOP', 'EMAIL');
  PERFORM public.ttc_seed_tam_chieu_chuan(v_ct, 2, NULL, 'GD_PGD',
    'Thiết kế bộ 10 câu Quizizz cho văn bản này. Chốt PDCA.', 'Bộ Quizizz 1 + phiếu PDCA');

  -- NGÀY 3
  PERFORM public.ttc_seed_tam_sang_chuan(v_ct, 3, 2);
  PERFORM public.ttc_seed_tam_viec(v_ct, 3, 'THUC_HANH', '13:30', '15:05', 'Chuyên đề: PHÂN PHỐI VÀ TRIỂN KHAI VĂN BẢN. Xây quy trình chuẩn: ai đọc bản gốc, ai làm phiếu 1 trang, ai phổ biến, kiểm tra hiểu bằng cách nào, lưu minh chứng ở đâu, bao lâu kiểm tra lại.', 'SOP triển khai văn bản tại Phòng KHDN v1 (PGĐ kiểm)', 'HOC_VIEN', 'LAPTOP', 'EMAIL');
  PERFORM public.ttc_seed_tam_chieu_chuan(v_ct, 3,
    'Kèm phiên PGĐ chia sẻ 20 phút: «Một văn bản không tới được RM thì cái giá là gì».', 'PGD',
    'Chạy thử Quizizz với 03 cán bộ. Đo tỷ lệ trả lời đúng — phép đo chất lượng truyền đạt, không phải phép đo cán bộ. Chốt PDCA.',
    'Kết quả Quizizz + nhận định của người học + phiếu PDCA');

  -- NGÀY 4 — Bài tập 1
  PERFORM public.ttc_seed_tam_sang_chuan(v_ct, 4, 3);
  PERFORM public.ttc_seed_tam_viec(v_ct, 4, 'THUC_HANH', '13:30', '13:40', 'Giao đề. TCTH mở file BT1, nhắc quy tắc: không AI, không internet, không trao đổi. Chỉ hỏi làm rõ về YÊU CẦU ĐẦU RA.', 'Biên bản mở bài', 'TCTH', 'MAY_CO_QUAN', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(v_ct, 4, 'THUC_HANH', '13:40', '14:40', 'LÀM BÀI 60 PHÚT: rà soát bảng chỉ số tài chính do cán bộ mới lập cho CTCP Bao bì Giấy Hồng Phát.', 'Nhật ký rà soát + bảng chỉ số đã sửa', 'HOC_VIEN', 'MAY_CO_QUAN', 'TCTH', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 4, 'THUC_HANH', '14:40', '14:50', 'Khóa bài. Lưu theo mã, khóa quyền sửa. KHÔNG công bố đáp án.', 'Biên bản khóa bài', 'TCTH', 'MAY_CO_QUAN', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(v_ct, 4, 'TRINH_BAY', '14:50', '15:30', 'Giải trình: bảo vệ 05 lỗi quan trọng nhất và nêu 05 ô sẽ kiểm tra đầu tiên khi nhận một file phân tích tài chính.', 'Phiếu bảo vệ', 'PGD', 'LAPTOP', 'TCTH', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 4, 'THUC_HANH', '15:30', '16:00', 'BƯỚC 1 CỦA ĐÁP ÁN: chỉ phát BẢNG KẾT QUẢ CHUẨN (không phát công thức). Tự tìm chênh lệch.', 'Bản tự đối chiếu', 'TCTH', 'MAY_CO_QUAN', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(v_ct, 4, 'TRINH_BAY', '16:00', '16:30', 'BƯỚC 2: mở đáp án đầy đủ. Tổ chấm giải thích nguyên lý. Kèm phiên Giám đốc chia sẻ 20 phút: «Uy tín chuyên môn được xây bằng gì».', 'Biên bản phản hồi', 'GD_PGD', 'KHONG', 'KHONG');
  PERFORM public.ttc_seed_tam_viec(v_ct, 4, 'TU_SUY_NGAM', '16:30', '16:45', 'Tự suy ngẫm 15 phút: điều gì tôi làm chắc, điều gì tôi muốn luyện thêm.', '3 dòng viết tay, nhập vào ô Tự suy ngẫm', 'HOC_VIEN', 'GIAY', 'TRAINING_CENTER');
  PERFORM public.ttc_seed_tam_viec(v_ct, 4, 'THUC_HANH', '16:45', '17:00', 'Lập bản đồ khoảng trống phần 1 và chốt PDCA.', 'Bản đồ khoảng trống v1 + phiếu PDCA', 'HOC_VIEN', 'LAPTOP', 'TRAINING_CENTER');

  -- NGÀY 5 — Chiêu thức số 2
  PERFORM public.ttc_seed_tam_sang_chuan(v_ct, 5, 4);
  PERFORM public.ttc_seed_tam_viec(v_ct, 5, 'THUC_HANH', '13:30', '14:30', 'CHIÊU THỨC SỐ 2: chuyển 30 việc lấy từ JD và danh sách bàn giao vào bảng 5 cột. Mỗi việc phải có việc tiếp theo, người làm và hạn.', 'Bảng Kanban cá nhân v1', 'HOC_VIEN', 'LAPTOP', 'TRAINING_CENTER', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 5, 'THUC_HANH', '14:30', '15:05', 'MA TRẬN 4 HỘP quan trọng – khẩn cấp. Thêm hai cột kiểm chứng «tôi thích việc này?» và «tôi giỏi việc này?». Rút ra: việc TP phải tự làm / ủy quyền / tự động hóa / bỏ.', 'Ma trận 4 hộp + danh sách 4 nhóm việc', 'HOC_VIEN', 'LAPTOP', 'EMAIL');
  PERFORM public.ttc_seed_tam_chieu_chuan(v_ct, 5,
    'Kèm phiên PGĐ chia sẻ 20 phút: «Một tuần ngồi ở ghế Trưởng phòng».', 'PGD',
    'Chuyển bảng Kanban lên Chiêu thức 2 của cổng Bắc Hưng Yên ONE — thẻ nào là 3 việc gối đầu thì liên kết vào Bảng việc của Training Center. Chốt PDCA tuần 1.',
    'Board Kanban trên BHY ONE + biên bản tuần 1');

  -- NGÀY 6 — Bài tập 2
  PERFORM public.ttc_seed_tam_sang_chuan(v_ct, 6, 5);
  PERFORM public.ttc_seed_tam_viec(v_ct, 6, 'THUC_HANH', '13:00', '13:10', 'Giao đề BT2. Nhắc rõ: KHÔNG xây lại mô hình từ đầu trước khi chỉ ra được lỗi trong file nhận được.', 'Biên bản mở bài', 'TCTH', 'MAY_CO_QUAN', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(v_ct, 6, 'THUC_HANH', '13:10', '15:10', 'LÀM BÀI 120 PHÚT: rà soát bảng chạy dòng tiền dự án nhà máy giấy bao bì 90.000 tấn/năm, TMĐT 1.200 tỷ, đề nghị vay 840 tỷ.', 'Nhật ký lỗi + file sửa + con số đúng', 'HOC_VIEN', 'MAY_CO_QUAN', 'TCTH', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 6, 'THUC_HANH', '15:10', '15:20', 'Khóa bài.', 'Biên bản khóa bài', 'TCTH', 'MAY_CO_QUAN', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(v_ct, 6, 'TRINH_BAY', '15:20', '16:00', 'Giải trình 05 lỗi trọng yếu và trả lời: THỨ TỰ 07 BƯỚC kiểm tra khi nhận một mô hình dòng tiền dự án.', 'Phiếu bảo vệ', 'PGD', 'LAPTOP', 'TCTH', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 6, 'THUC_HANH', '16:00', '16:20', 'BƯỚC 1 CỦA ĐÁP ÁN: chỉ phát các con số neo (NPV, IRR, DSCR tối thiểu, năm thiếu tiền). Tự truy ngược.', 'Bản tự đối chiếu', 'TCTH', 'MAY_CO_QUAN', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(v_ct, 6, 'TRINH_BAY', '16:20', '16:50', 'BƯỚC 2: mở file mô hình chuẩn. Giải thích nguyên lý. Hoàn thiện bản đồ khoảng trống theo 5 nhóm: kiến thức tài chính – Excel – phát hiện sai – lập luận tín dụng – trình bày.', 'Bản đồ khoảng trống v2 (hoàn chỉnh)', 'GD_PGD', 'LAPTOP', 'EMAIL');
  PERFORM public.ttc_seed_tam_viec(v_ct, 6, 'TU_SUY_NGAM', '16:50', '17:00', 'Tự suy ngẫm: uy tín chuyên môn của tôi đang dựa trên điều gì. Chốt PDCA.', '3 dòng viết tay + phiếu PDCA', 'HOC_VIEN', 'GIAY', 'TRAINING_CENTER');

  -- NGÀY 7 — Giao việc và bám việc (việc gối đầu số 1)
  PERFORM public.ttc_seed_tam_sang_chuan(v_ct, 7, 6);
  PERFORM public.ttc_seed_tam_viec(v_ct, 7, 'THUC_HANH', '13:30', '14:15', 'Kỹ năng giao việc: phiếu WHY – WHAT – OWNER – STANDARD – DEADLINE – CHECKPOINT cho một nhiệm vụ THẬT nhưng PHI SỰ VỤ. Ghi thành việc gối đầu số 1 trên Bảng việc.', 'Phiếu giao việc + việc gối đầu 1', 'HOC_VIEN', 'LAPTOP', 'TRAINING_CENTER', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 7, 'THUC_HANH', '14:15', '14:45', 'TƯƠNG TÁC CÁN BỘ 1: giao việc trực tiếp cho 01 cán bộ. Bắt buộc có repeat-back và đặt lịch checkpoint. Sau đó KHÔNG nhắn thêm ngoài mốc đã hẹn. Thẻ việc ghi vào Chiêu thức 2, cán bộ là người chịu trách nhiệm.', 'Phiếu quan sát của PGĐ Hoàng + thẻ việc trên Chiêu thức 2', 'PGD', 'LAPTOP', 'TRAINING_CENTER', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 7, 'THUC_HANH', '14:45', '15:05', 'Bám việc bằng PDCA: thiết kế nhịp kiểm tra sao cho cán bộ không phải hỏi lại và Trưởng phòng không phải làm thay.', 'SOP nhận – giao – bám – đóng việc', 'HOC_VIEN', 'LAPTOP', 'EMAIL');
  PERFORM public.ttc_seed_tam_chieu_chuan(v_ct, 7,
    'Kèm phiên Giám đốc chia sẻ 20 phút: «Từ làm việc sang làm cho người khác làm được».', 'GD_PGD',
    'AI CA 1 – TÌM KIẾM THÔNG TIN CÓ KIỂM CHỨNG (16:00–17:00). Đã có phiếu văn bản tự làm; nay dùng AI tìm bổ sung và ghi: tôi tìm được gì – AI trả gì – chênh ở đâu – nguồn kiểm chứng – dùng hay bỏ.',
    'Nhật ký kiểm chứng AI 1');

  -- NGÀY 8 — Kèm cặp và IDP (việc gối đầu số 2)
  PERFORM public.ttc_seed_tam_sang_chuan(v_ct, 8, 7);
  PERFORM public.ttc_seed_tam_viec(v_ct, 8, 'THUC_HANH', '13:30', '14:10', 'Mô hình 70–20–10 trong kèm cặp. Thiết kế cách kèm một cán bộ cụ thể theo đúng tỷ lệ này. Ghi thành việc gối đầu số 2.', 'Kế hoạch kèm cặp 70–20–10 + việc gối đầu 2', 'HOC_VIEN', 'LAPTOP', 'TRAINING_CENTER', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 8, 'THUC_HANH', '14:10', '14:50', 'TƯƠNG TÁC CÁN BỘ 2 – COACHING THẬT (30–35 phút) về một khoảng trống năng lực PHI SỰ VỤ. 10 phút đầu chỉ được hỏi. Cán bộ tự nêu mục tiêu, phương án và hành động.', 'Phiếu quan sát coaching + phiếu cảm nhận ẩn danh của cán bộ', 'PGD', 'KHONG', 'TRAINING_CENTER', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 8, 'THUC_HANH', '14:50', '15:05', 'CHIÊU THỨC SỐ 3 – theo sát IDP: lập IDP 30 ngày cho cán bộ đó; lập bản đồ chuyên gia nội bộ của Phòng. Ghi thành việc gối đầu số 3.', 'IDP 30 ngày + bản đồ chuyên gia + việc gối đầu 3', 'HOC_VIEN', 'LAPTOP', 'TRAINING_CENTER', true);
  PERFORM public.ttc_seed_tam_chieu_chuan(v_ct, 8,
    'Kèm phiên PGĐ chia sẻ 20 phút: «Một lần kèm cặp và điều xảy ra sau đó».', 'PGD',
    'AI CA 2 – LÀM SLIDE BẰNG AI (16:00–17:00). Đưa văn bản đã tự làm slide ở ngày 2 cho AI, so sánh hai bộ slide: cấu trúc, độ chính xác, chỗ AI bịa, chỗ AI làm tốt hơn người.',
    'Bảng so sánh 2 bộ slide + Nhật ký kiểm chứng AI 2');

  -- NGÀY 9 — Quản trị hệ thống
  PERFORM public.ttc_seed_tam_viec(v_ct, 9, 'KHOI_DONG', '07:30', '07:50', 'VietinType 20 phút theo bài dựng sẵn.', 'Log VietinType trong ngày', 'TCTH', 'MAY_CO_QUAN', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(v_ct, 9, 'VAN_BAN', '07:50', '11:30', 'BẮC HƯNG YÊN ONE: đọc lại tài liệu của TỪNG chương trình trên cổng, làm slide: chương trình này giải quyết vấn đề gì; ai là người dùng thật; điều gì đang cản việc dùng.', 'Bộ slide đánh giá các chương trình BHY ONE — NGAY09_SLIDE', 'HOC_VIEN', 'MAY_CO_QUAN', 'EMAIL', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 9, 'THUC_HANH', '13:30', '14:10', 'Đánh giá từng chương trình BHY ONE theo 06 thang Bloom: người dùng đang dừng ở thang nào, và cần gì để lên thang tiếp theo.', 'Bảng đánh giá Bloom cho từng chương trình', 'HOC_VIEN', 'LAPTOP', 'EMAIL');
  PERFORM public.ttc_seed_tam_viec(v_ct, 9, 'THUC_HANH', '14:10', '14:50', 'RỦI RO PHÂN KHÚC KHDN Ở THỜI ĐIỂM HIỆN NAY: 05 rủi ro lớn nhất, mỗi rủi ro có dấu hiệu nhận biết sớm, số đo, giải pháp giảm thiểu, người chịu trách nhiệm.', 'Bản đồ rủi ro KHDN + 05 giải pháp', 'HOC_VIEN', 'LAPTOP', 'EMAIL');
  PERFORM public.ttc_seed_tam_viec(v_ct, 9, 'THUC_HANH', '14:50', '15:05', 'CẢI TIẾN GIẢM THỜI GIAN TÁC NGHIỆP CỦA RM: đo 03 quy trình hay làm nhất; chỉ ra bước thừa; ước tính số giờ tiết kiệm/tháng.', '03 đề xuất cải tiến có ước lượng định lượng', 'HOC_VIEN', 'LAPTOP', 'EMAIL');
  PERFORM public.ttc_seed_tam_chieu_chuan(v_ct, 9, NULL, 'GD_PGD',
    'AI CA 3 – PHÂN TÍCH DỰ ÁN VÀ KHÁCH HÀNG BẰNG SKILL, AI AGENT, MCP, CONNECTOR (16:00–17:00). Chỉ dữ liệu công khai hoặc giả lập. Chỉ ra ranh giới dữ liệu tuyệt đối không được đưa vào.',
    'Nhật ký kiểm chứng AI 3 + bộ lọc dữ liệu trước khi dùng AI');

  -- NGÀY 10 — Đo lại – Bảo vệ – Cam kết
  PERFORM public.ttc_seed_tam_viec(v_ct, 10, 'KHOI_DONG', '07:30', '07:50', 'Đo lại VietinType với bài có độ khó tương đương ngày 1. So tốc độ, độ chính xác, nhóm lỗi.', 'Log cuối kỳ + bảng so sánh', 'TCTH', 'MAY_CO_QUAN', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(v_ct, 10, 'THUC_HANH', '07:50', '09:20', 'BÀI SONG SONG: một bảng chỉ số tài chính khác, cùng dạng bài rà soát, 60 phút, không AI. Đo năng lực chuyển giao chứ không đo trí nhớ.', 'Bài song song đã khóa', 'HOC_VIEN', 'MAY_CO_QUAN', 'TCTH', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 10, 'THUC_HANH', '09:20', '10:20', 'Đối chiếu đáp án bài song song. So với kết quả ngày 4 để đo mức tiến bộ theo từng nhóm lỗi.', 'Bảng so sánh ngày 4 – ngày 10', 'TO_CHAM', 'MAY_CO_QUAN', 'TCTH');
  PERFORM public.ttc_seed_tam_viec(v_ct, 10, 'THUC_HANH', '10:20', '11:30', 'Chuẩn bị bảo vệ: chọn 06 sản phẩm, tự chấm theo rubric TRƯỚC khi xem điểm của hội đồng.', 'Phiếu tự chấm', 'HOC_VIEN', 'LAPTOP', 'EMAIL');
  PERFORM public.ttc_seed_tam_viec(v_ct, 10, 'TRINH_BAY', '13:30', '14:50', 'BẢO VỆ 06 SẢN PHẨM trước hội đồng gọn: phiếu văn bản và Bloom; slide và bản ghi trình bày; hai bài rà soát và bản đồ khoảng trống; hệ điều hành cá nhân; giao việc – coaching – IDP; BHY ONE, rủi ro KHDN và cải tiến RM.', 'Phiếu bảo vệ từng sản phẩm', 'GD_PGD', 'LAPTOP', 'KHONG', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 10, 'TRINH_BAY', '14:50', '15:20', 'PGĐ Hoàng trình bày ngược: sau 10 ngày trực tiếp làm vai Trưởng phòng, hệ thống lộ ra điểm yếu gì. Tối thiểu 05 cải tiến.', 'Báo cáo của PGĐ Hoàng', 'PGD', 'LAPTOP', 'EMAIL');
  PERFORM public.ttc_seed_tam_viec(v_ct, 10, 'TRINH_BAY', '15:20', '16:15', 'Công bố điểm theo TỪNG CẤU PHẦN, không công bố một điểm tổng. Giám đốc kết luận: điểm mạnh, khoảng trống, mức giám sát cần thiết trong 90 ngày. Kèm phiên Giám đốc chia sẻ: «Đừng đợi có chức danh cao hơn rồi mới hành xử như vị trí cao hơn».', 'Biên bản tổng kết', 'GD', 'KHONG', 'TCTH', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 10, 'TU_SUY_NGAM', '16:15', '16:35', 'Tự chấm 08 tiêu chí lần 2 + phiếu STOP – START – CONTINUE + cam kết 30 ngày.', 'Phiếu tự soi đợt 2 trên Training Center', 'HOC_VIEN', 'LAPTOP', 'TRAINING_CENTER', true);
  PERFORM public.ttc_seed_tam_viec(v_ct, 10, 'THUC_HANH', '16:35', '17:00', 'Chốt kế hoạch 30–60–90 ngày, lịch review, nhiệm vụ khi trở lại vai Trưởng phòng và điều kiện điều chỉnh. Ba bên ký.', 'Kế hoạch 30–60–90 được ký', 'GD_PGD', 'GIAY', 'TCTH');
END $seed$;

-- Ba hàm seed chỉ dùng một lần — xoá ngay để không thành cửa ghi ngoài RLS
DROP FUNCTION IF EXISTS public.ttc_seed_tam_viec(uuid, int, text, text, text, text, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.ttc_seed_tam_sang_chuan(uuid, int, int);
DROP FUNCTION IF EXISTS public.ttc_seed_tam_chieu_chuan(uuid, int, text, text, text, text);

COMMENT ON TABLE public.ttc_chuong_trinh IS 'Bắc Hưng Yên Training Center — một chương trình đào tạo/rèn luyện (đặc tả 1.0, 06/09/2026)';
COMMENT ON TABLE public.ttc_thanh_vien IS 'Vai trong chương trình: hoc_vien / huong_dan / bgd / quan_tri — nguồn quyền cho toàn bộ bảng ttc_*';
COMMENT ON TABLE public.ttc_tu_soi IS 'Phiếu tự soi 08 tiêu chí — CHỈ chính học viên đọc/ghi; vai khác chỉ thấy cờ đã điền qua ttc_trang_thai_tu_soi()';
COMMENT ON TABLE public.ttc_suy_ngam IS 'Tự suy ngẫm mỗi ngày — CHỈ chính học viên đọc/ghi; không đưa vào bất kỳ bảng điểm nào';
COMMENT ON TABLE public.ttc_viec_goi_dau IS 'Ba việc gối đầu (3 việc lựa chọn với cán bộ): thẻ thật ở ct2_dau_viec, đây giữ WHY/tiêu chuẩn/mốc kiểm tra/nghiệm thu';

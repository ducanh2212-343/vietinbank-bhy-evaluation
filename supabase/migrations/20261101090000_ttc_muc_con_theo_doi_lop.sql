-- ---------------------------------------------------------------------------
-- BHY TRAINING CENTER — ĐỢT 15: khung dùng lại cho mọi chương trình
--
-- Giám đốc (18/09/2026) sau khi đối chiếu bản dẫn «Chạm vào giấc mơ» V4: làm
-- Khung 1 (mục con của đầu việc), Khung 2 (Theo dõi lớp, xác nhận của người
-- dẫn) và Khung 4 (cấu hình theo chương trình). Nguyên tắc: KHÔNG thêm cột
-- cho nhu cầu của từng lớp — thêm khung mà Phòng Tổng hợp tự cấu hình.
--
--   1. Vai «trợ giảng»: xem cả lớp và xác nhận tiến độ; không chấm Bloom,
--      không sửa nội dung, không đọc tự soi. Người dẫn nhóm không nên mang vai
--      «hướng dẫn» vì vai đó chấm điểm được.
--   2. ttc_muc_con: điểm dừng / sản phẩm / tiêu chí kiểm thử của một đầu việc,
--      mỗi mục có yêu cầu kèm (đường dẫn, tệp, ghi chú) và bắt buộc hay không.
--   3. ttc_tien_do_muc: học viên tích từng mục, dán link, ghi Đạt/Chưa; team
--      xác nhận (ai, lúc nào) — hai dấu tách riêng, không dấu nào ghi đè dấu kia.
--   4. Đầu việc: ai_tich (học viên / người dẫn cho cả lớp), xong_luc + xong_boi
--      (giờ thực tế của lớp), ghi_chu_nguoi_dan (lời dẫn, chỉ team xem ở giao
--      diện), truong_ghi_chu (mẫu ghi chú có nhãn), nguoi_dan_ten (phân công
--      hiển thị). Tiến độ: tra_loi (câu trả lời theo mẫu).
--   5. Chương trình: mo_dun (bật/tắt Tự soi, Bảng việc, Bloom, Lịch BGĐ,
--      Toolkit) — rỗng = bật hết như cũ.
--   6. Cổng tích hoàn thành: thêm điều kiện «đủ mục con bắt buộc».
--   7. Nhân bản chương trình chép cả mục con và các cột mới.
-- ---------------------------------------------------------------------------

-- 1) Vai trợ giảng ------------------------------------------------------------
ALTER TABLE public.ttc_thanh_vien DROP CONSTRAINT IF EXISTS ttc_thanh_vien_vai_check;
ALTER TABLE public.ttc_thanh_vien ADD CONSTRAINT ttc_thanh_vien_vai_check
  CHECK (vai IN ('hoc_vien', 'huong_dan', 'bgd', 'quan_tri', 'tro_giang'));

-- Team đào tạo của một chương trình: mọi vai trừ học viên
CREATE OR REPLACE FUNCTION public.ttc_la_team(_ct uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.is_staff(auth.uid())
     AND (public.ttc_vai(_ct) IN ('huong_dan', 'bgd', 'quan_tri', 'tro_giang')
          OR public.has_role(auth.uid(), 'system_admin'::app_role)), false)
$$;
REVOKE ALL ON FUNCTION public.ttc_la_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_la_team(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ttc_them_thanh_vien_hang_loat(_ct uuid, _nguoi uuid[], _vai text DEFAULT 'hoc_vien')
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  IF NOT public.ttc_la_quan_tri(_ct) THEN
    RAISE EXCEPTION 'Chỉ quản trị của chương trình mới xếp thành viên';
  END IF;
  IF _vai NOT IN ('hoc_vien', 'huong_dan', 'bgd', 'quan_tri', 'tro_giang') THEN RAISE EXCEPTION 'Vai không hợp lệ'; END IF;
  WITH chen AS (
    INSERT INTO public.ttc_thanh_vien (chuong_trinh_id, nguoi, vai)
    SELECT _ct, p.id, _vai
      FROM public.profiles p
     WHERE p.id = ANY(_nguoi) AND p.status = 'active' AND public.is_staff(p.user_id)
    ON CONFLICT (chuong_trinh_id, nguoi) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO n FROM chen;
  RETURN n;
END $$;

-- 2) Cột mới ------------------------------------------------------------------
ALTER TABLE public.ttc_chuong_trinh
  ADD COLUMN IF NOT EXISTS mo_dun jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ttc_dau_viec
  ADD COLUMN IF NOT EXISTS ai_tich text NOT NULL DEFAULT 'HOC_VIEN',
  ADD COLUMN IF NOT EXISTS xong_luc timestamptz,
  ADD COLUMN IF NOT EXISTS xong_boi uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ghi_chu_nguoi_dan text,
  ADD COLUMN IF NOT EXISTS truong_ghi_chu jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS nguoi_dan_ten text;
ALTER TABLE public.ttc_dau_viec DROP CONSTRAINT IF EXISTS ttc_dau_viec_ai_tich_check;
ALTER TABLE public.ttc_dau_viec ADD CONSTRAINT ttc_dau_viec_ai_tich_check CHECK (ai_tich IN ('HOC_VIEN', 'NGUOI_DAN'));

ALTER TABLE public.ttc_tien_do
  ADD COLUMN IF NOT EXISTS tra_loi jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3) Mục con của đầu việc -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ttc_muc_con (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dau_viec_id uuid NOT NULL REFERENCES public.ttc_dau_viec(id) ON DELETE CASCADE,
  thu_tu int NOT NULL DEFAULT 0,
  ten text NOT NULL,
  kieu text NOT NULL DEFAULT 'DIEM_DUNG' CHECK (kieu IN ('DIEM_DUNG', 'SAN_PHAM', 'TIEU_CHI')),
  gio_goi_y time,
  yeu_cau text[] NOT NULL DEFAULT '{}',
  bat_buoc boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ttc_muc_con_dau_viec_idx ON public.ttc_muc_con(dau_viec_id, thu_tu);

CREATE OR REPLACE FUNCTION public.ttc_ct_cua_muc_con(_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.ttc_ct_cua_dau_viec(m.dau_viec_id) FROM public.ttc_muc_con m WHERE m.id = _id
$$;
REVOKE ALL ON FUNCTION public.ttc_ct_cua_muc_con(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_ct_cua_muc_con(uuid) TO authenticated, service_role;

ALTER TABLE public.ttc_muc_con ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ttc_muc_con FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ttc_muc_con TO authenticated;
DROP POLICY IF EXISTS "ttc xem muc con" ON public.ttc_muc_con;
CREATE POLICY "ttc xem muc con" ON public.ttc_muc_con FOR SELECT TO authenticated
  USING (public.ttc_la_thanh_vien(public.ttc_ct_cua_dau_viec(dau_viec_id)));
DROP POLICY IF EXISTS "ttc ghi muc con" ON public.ttc_muc_con;
CREATE POLICY "ttc ghi muc con" ON public.ttc_muc_con FOR ALL TO authenticated
  USING (public.ttc_sua_duoc_noi_dung(public.ttc_ct_cua_dau_viec(dau_viec_id)))
  WITH CHECK (public.ttc_sua_duoc_noi_dung(public.ttc_ct_cua_dau_viec(dau_viec_id)));

-- 4) Tiến độ từng mục ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ttc_tien_do_muc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muc_con_id uuid NOT NULL REFERENCES public.ttc_muc_con(id) ON DELETE CASCADE,
  nguoi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  xong boolean NOT NULL DEFAULT false,
  luc timestamptz,
  ket_qua text CHECK (ket_qua IS NULL OR ket_qua IN ('DAT', 'CHUA')),
  ly_do text,
  duong_dan text,
  tep jsonb NOT NULL DEFAULT '[]'::jsonb,
  ghi_chu text,
  xac_nhan_boi uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  xac_nhan_luc timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (muc_con_id, nguoi)
);
CREATE INDEX IF NOT EXISTS ttc_tien_do_muc_nguoi_idx ON public.ttc_tien_do_muc(nguoi);

ALTER TABLE public.ttc_tien_do_muc ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ttc_tien_do_muc FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.ttc_tien_do_muc TO authenticated;
DROP POLICY IF EXISTS "ttc xem tien do muc" ON public.ttc_tien_do_muc;
CREATE POLICY "ttc xem tien do muc" ON public.ttc_tien_do_muc FOR SELECT TO authenticated
  USING (public.ttc_la_thanh_vien(public.ttc_ct_cua_muc_con(muc_con_id)));
-- Học viên ghi dòng của mình; xác nhận của team đi qua RPC (trigger dưới chặn tự ghi cột xác nhận)
DROP POLICY IF EXISTS "ttc tich tien do muc" ON public.ttc_tien_do_muc;
CREATE POLICY "ttc tich tien do muc" ON public.ttc_tien_do_muc FOR INSERT TO authenticated
  WITH CHECK (nguoi = public.get_my_profile_id() AND public.ttc_la_thanh_vien(public.ttc_ct_cua_muc_con(muc_con_id)));
DROP POLICY IF EXISTS "ttc sua tien do muc" ON public.ttc_tien_do_muc;
CREATE POLICY "ttc sua tien do muc" ON public.ttc_tien_do_muc FOR UPDATE TO authenticated
  USING (nguoi = public.get_my_profile_id()) WITH CHECK (nguoi = public.get_my_profile_id());

-- Học viên không tự đặt được cột xác nhận; upsert thiếu trường thì mượn hàng cũ
-- (cùng bài học BEFORE INSERT với ttc_tien_do — đợt 10)
CREATE OR REPLACE FUNCTION public.f_ttc_tien_do_muc_truoc_ghi()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cu public.ttc_tien_do_muc;
BEGIN
  IF NEW.tep IS NULL OR jsonb_typeof(NEW.tep) <> 'array' THEN NEW.tep := '[]'::jsonb; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO cu FROM public.ttc_tien_do_muc t WHERE t.muc_con_id = NEW.muc_con_id AND t.nguoi = NEW.nguoi;
    IF cu.id IS NOT NULL THEN
      IF jsonb_array_length(NEW.tep) = 0 THEN NEW.tep := COALESCE(cu.tep, '[]'::jsonb); END IF;
      IF NEW.duong_dan IS NULL THEN NEW.duong_dan := cu.duong_dan; END IF;
      IF NEW.ghi_chu IS NULL THEN NEW.ghi_chu := cu.ghi_chu; END IF;
      IF NEW.ket_qua IS NULL THEN NEW.ket_qua := cu.ket_qua; END IF;
      IF NEW.ly_do IS NULL THEN NEW.ly_do := cu.ly_do; END IF;
    END IF;
    -- Cột xác nhận chỉ RPC của team đặt; lệnh thường (kể cả upsert) không được mang vào
    NEW.xac_nhan_boi := COALESCE(cu.xac_nhan_boi, NULL);
    NEW.xac_nhan_luc := COALESCE(cu.xac_nhan_luc, NULL);
  ELSIF NOT public.ttc_la_team(public.ttc_ct_cua_muc_con(NEW.muc_con_id)) THEN
    NEW.xac_nhan_boi := OLD.xac_nhan_boi;
    NEW.xac_nhan_luc := OLD.xac_nhan_luc;
  END IF;
  IF NEW.xong AND NEW.luc IS NULL THEN NEW.luc := now(); END IF;
  IF NOT NEW.xong THEN NEW.luc := NULL; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ttc_tien_do_muc_truoc_ghi ON public.ttc_tien_do_muc;
CREATE TRIGGER ttc_tien_do_muc_truoc_ghi BEFORE INSERT OR UPDATE ON public.ttc_tien_do_muc
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_tien_do_muc_truoc_ghi();

-- Team xác nhận (hoặc tích hộ) một mục cho một học viên. _xong = NULL → giữ dấu
-- tự tích của học viên, chỉ đặt dấu xác nhận. _bo_xac_nhan = true → rút xác nhận.
CREATE OR REPLACE FUNCTION public.ttc_xac_nhan_muc(_muc uuid, _nguoi uuid, _xong boolean DEFAULT NULL, _ket_qua text DEFAULT NULL, _bo_xac_nhan boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ct uuid := public.ttc_ct_cua_muc_con(_muc);
  toi uuid := public.get_my_profile_id();
BEGIN
  IF ct IS NULL THEN RAISE EXCEPTION 'Không thấy mục con này'; END IF;
  IF NOT public.ttc_la_team(ct) THEN RAISE EXCEPTION 'Chỉ team đào tạo của chương trình mới xác nhận được'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ttc_thanh_vien WHERE chuong_trinh_id = ct AND nguoi = _nguoi AND vai = 'hoc_vien') THEN
    RAISE EXCEPTION 'Người này không phải học viên của chương trình';
  END IF;
  IF _ket_qua IS NOT NULL AND _ket_qua NOT IN ('DAT', 'CHUA') THEN RAISE EXCEPTION 'Kết quả không hợp lệ'; END IF;
  INSERT INTO public.ttc_tien_do_muc (muc_con_id, nguoi, xong, ket_qua)
    VALUES (_muc, _nguoi, COALESCE(_xong, true), _ket_qua)
    ON CONFLICT (muc_con_id, nguoi) DO UPDATE
      SET xong = COALESCE(_xong, public.ttc_tien_do_muc.xong),
          ket_qua = COALESCE(_ket_qua, public.ttc_tien_do_muc.ket_qua);
  UPDATE public.ttc_tien_do_muc
     SET xac_nhan_boi = CASE WHEN _bo_xac_nhan THEN NULL ELSE toi END,
         xac_nhan_luc = CASE WHEN _bo_xac_nhan THEN NULL ELSE now() END
   WHERE muc_con_id = _muc AND nguoi = _nguoi;
END $$;
REVOKE ALL ON FUNCTION public.ttc_xac_nhan_muc(uuid, uuid, boolean, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_xac_nhan_muc(uuid, uuid, boolean, text, boolean) TO authenticated;

-- Người dẫn đánh dấu đầu việc của CẢ LỚP đã xong (giờ thực tế) — không đụng tiến độ từng học viên
CREATE OR REPLACE FUNCTION public.ttc_xong_dau_viec_lop(_dau_viec uuid, _xong boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ct uuid := public.ttc_ct_cua_dau_viec(_dau_viec);
BEGIN
  IF ct IS NULL THEN RAISE EXCEPTION 'Không thấy đầu việc này'; END IF;
  IF NOT public.ttc_la_team(ct) THEN RAISE EXCEPTION 'Chỉ team đào tạo của chương trình mới đánh dấu được'; END IF;
  UPDATE public.ttc_dau_viec
     SET xong_luc = CASE WHEN _xong THEN now() ELSE NULL END,
         xong_boi = CASE WHEN _xong THEN public.get_my_profile_id() ELSE NULL END
   WHERE id = _dau_viec;
END $$;
REVOKE ALL ON FUNCTION public.ttc_xong_dau_viec_lop(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_xong_dau_viec_lop(uuid, boolean) TO authenticated;

-- 5) Cổng tích hoàn thành: thêm «đủ mục con bắt buộc» ------------------------
CREATE OR REPLACE FUNCTION public.f_ttc_tien_do_truoc_ghi()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tn text[];
  thieu text[] := ARRAY[]::text[];
  cu public.ttc_tien_do;
  chua_xong text;
BEGIN
  IF NEW.tep IS NULL OR jsonb_typeof(NEW.tep) <> 'array' THEN NEW.tep := '[]'::jsonb; END IF;
  IF NEW.tra_loi IS NULL OR jsonb_typeof(NEW.tra_loi) <> 'object' THEN NEW.tra_loi := '{}'::jsonb; END IF;

  -- Upsert: hàng cũ có thể đã mang phần nộp mà lệnh này không gửi lại
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO cu FROM public.ttc_tien_do t
     WHERE t.dau_viec_id = NEW.dau_viec_id AND t.nguoi = NEW.nguoi;
    IF cu.id IS NOT NULL THEN
      IF jsonb_array_length(NEW.tep) = 0 THEN NEW.tep := COALESCE(cu.tep, '[]'::jsonb); END IF;
      IF NEW.ghi_chu IS NULL THEN NEW.ghi_chu := cu.ghi_chu; END IF;
      IF NEW.duong_dan IS NULL THEN NEW.duong_dan := cu.duong_dan; END IF;
      IF NEW.tra_loi = '{}'::jsonb THEN NEW.tra_loi := COALESCE(cu.tra_loi, '{}'::jsonb); END IF;
    END IF;
  END IF;

  NEW.file_url := NEW.tep -> 0 ->> 'path';

  IF NEW.hoan_thanh THEN
    SELECT tinh_nang INTO tn FROM public.ttc_dau_viec WHERE id = NEW.dau_viec_id;
    IF 'NOP_TEP' = ANY(tn) AND jsonb_array_length(NEW.tep) = 0 THEN
      thieu := array_append(thieu, 'tệp đính kèm');
    END IF;
    IF 'GHI_CHU' = ANY(tn) AND char_length(btrim(COALESCE(NEW.ghi_chu, ''))) < 10 THEN
      thieu := array_append(thieu, 'ghi chú kết quả (≥ 10 ký tự)');
    END IF;
    IF 'DUONG_DAN' = ANY(tn) AND btrim(COALESCE(NEW.duong_dan, '')) = '' THEN
      thieu := array_append(thieu, 'đường dẫn');
    END IF;
    -- Mục con bắt buộc chưa tích (theo thứ tự) — kết quả Đạt/Chưa không xét: kiểm thử ra «chưa» vẫn là đã kiểm
    SELECT string_agg(m.ten, ', ' ORDER BY m.thu_tu) INTO chua_xong
      FROM public.ttc_muc_con m
      LEFT JOIN public.ttc_tien_do_muc p ON p.muc_con_id = m.id AND p.nguoi = NEW.nguoi
     WHERE m.dau_viec_id = NEW.dau_viec_id AND m.bat_buoc AND NOT COALESCE(p.xong, false);
    IF chua_xong IS NOT NULL THEN
      thieu := array_append(thieu, 'mục chưa tích: ' || chua_xong);
    END IF;
    IF cardinality(thieu) > 0 THEN
      RAISE EXCEPTION 'Đầu việc này yêu cầu nộp trước khi tích hoàn thành. Còn thiếu: %', array_to_string(thieu, ', ');
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 6) Nhân bản chép cả mục con và cột mới -------------------------------------
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
  v record;
  ngay_moi uuid;
  viec_moi uuid;
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
     vi_do, kinh_do, ban_kinh_m, nguoi_tao, nhac, mo_dun)
  VALUES (_ten, goc.mo_ta, _ngay_bd, goc.ngay_kt + lech, 'CHUAN_BI', goc.nhom_doi_tuong, goc.loai,
          goc.khoi_nang_luc, false, goc.vi_do, goc.kinh_do, goc.ban_kinh_m, public.get_my_profile_id(),
          jsonb_build_object('khi_hoan_thanh', jsonb_build_object(
            'bat',   COALESCE((goc.nhac -> 'khi_hoan_thanh' ->> 'bat')::boolean, true),
            'nguoi', '[]'::jsonb)),
          COALESCE(goc.mo_dun, '{}'::jsonb))
  RETURNING id INTO moi;

  FOR r IN SELECT * FROM public.ttc_ngay WHERE chuong_trinh_id = _nguon ORDER BY so_thu_tu LOOP
    INSERT INTO public.ttc_ngay
      (chuong_trinh_id, so_thu_tu, ngay, tieu_de, khoi, van_ban, nhiem_vu_van_ban, chuan_bi, lat_cat, cau_hoi_tu_soi)
    VALUES (moi, r.so_thu_tu, r.ngay + lech, r.tieu_de, r.khoi, r.van_ban, r.nhiem_vu_van_ban, r.chuan_bi, r.lat_cat, r.cau_hoi_tu_soi)
    RETURNING id INTO ngay_moi;
    FOR v IN SELECT * FROM public.ttc_dau_viec WHERE ngay_id = r.id ORDER BY gio_bat_dau, thu_tu LOOP
      INSERT INTO public.ttc_dau_viec
        (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam, tinh_nang,
         ai_tich, ghi_chu_nguoi_dan, truong_ghi_chu, nguoi_dan_ten)
      VALUES (ngay_moi, v.phan, v.thu_tu, v.gio_bat_dau, v.gio_ket_thuc, v.ten, v.dau_ra, v.nguoi_phu_trach, v.thiet_bi, v.noi_nop, v.trong_tam, v.tinh_nang,
         v.ai_tich, v.ghi_chu_nguoi_dan, v.truong_ghi_chu, v.nguoi_dan_ten)
      RETURNING id INTO viec_moi;
      INSERT INTO public.ttc_muc_con (dau_viec_id, thu_tu, ten, kieu, gio_goi_y, yeu_cau, bat_buoc)
      SELECT viec_moi, thu_tu, ten, kieu, gio_goi_y, yeu_cau, bat_buoc FROM public.ttc_muc_con WHERE dau_viec_id = v.id;
    END LOOP;
  END LOOP;
  RETURN moi;
END $$;

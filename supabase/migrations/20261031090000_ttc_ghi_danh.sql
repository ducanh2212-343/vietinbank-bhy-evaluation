-- ---------------------------------------------------------------------------
-- BHY TRAINING CENTER — ĐỢT 14: thêm học viên nhanh
--
-- Giám đốc (16/09/2026): chọn nhiều người một lần, dán danh sách, và ghi danh
-- bằng mã lớp / QR — mã lớp CHỈ dành cho cán bộ nội bộ Bắc Hưng Yên ONE, khách
-- đối tác không có cửa.
--
-- Ba thứ mới:
--   1. ttc_chuong_trinh.ma_ghi_danh — mã lớp 6 ký tự (NULL = đóng ghi danh) và
--      ghi_danh_tu_duyet — bật thì quét là vào lớp ngay, tắt thì chờ TCTH duyệt.
--   2. ttc_ghi_danh — yêu cầu xin vào lớp, một dòng mỗi (lớp, người), giữ cả
--      dòng đã duyệt / từ chối để TCTH thấy lịch sử.
--   3. Bốn hàm: ttc_mo_ghi_danh (cấp/đóng mã), ttc_xem_ma_ghi_danh (quét mã
--      thấy lớp nào), ttc_xin_ghi_danh (xin vào), ttc_duyet_ghi_danh (duyệt),
--      và ttc_them_thanh_vien_hang_loat cho hai cách thêm còn lại.
--
-- Mọi cửa ghi vào ttc_ghi_danh đi qua hàm SECURITY DEFINER; bảng không có
-- policy INSERT/UPDATE — client không tự chèn được yêu cầu «đã duyệt».
-- Hàm dùng pgcrypto nên search_path có `extensions` (bài học đợt 9).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 0) VÁ: bốn hàm kiểm quyền trả NULL cho cán bộ KHÔNG thuộc lớp (ttc_vai = NULL
--    → «NULL = 'quan_tri'» là NULL). Trong policy RLS thì NULL bị coi là false
--    nên vẫn chặn đúng, nhưng trong plpgsql «IF NOT NULL THEN RAISE» KHÔNG chạy —
--    ttc_cap_ma_qr, ttc_diem_danh_ghi_ho, ttc_mo_ghi_danh… để lọt người ngoài lớp.
--    Phát hiện khi chạy kịch bản đợt này. Bọc coalesce để mọi hàm gọi đều đúng.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_la_quan_tri(_ct uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.is_staff(auth.uid())
     AND (public.ttc_vai(_ct) = 'quan_tri' OR public.has_role(auth.uid(), 'system_admin'::app_role)), false)
$$;
CREATE OR REPLACE FUNCTION public.ttc_sua_duoc_noi_dung(_ct uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.is_staff(auth.uid())
     AND (public.ttc_vai(_ct) IN ('quan_tri', 'bgd') OR public.has_role(auth.uid(), 'system_admin'::app_role)), false)
$$;
CREATE OR REPLACE FUNCTION public.ttc_la_nguoi_cham(_ct uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.ttc_vai(_ct) IN ('huong_dan', 'bgd'), false)
$$;
CREATE OR REPLACE FUNCTION public.ttc_la_bgd(_ct uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.ttc_vai(_ct) = 'bgd', false)
$$;

ALTER TABLE public.ttc_chuong_trinh
  ADD COLUMN IF NOT EXISTS ma_ghi_danh text,
  ADD COLUMN IF NOT EXISTS ghi_danh_tu_duyet boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS ttc_chuong_trinh_ma_ghi_danh_idx
  ON public.ttc_chuong_trinh(ma_ghi_danh) WHERE ma_ghi_danh IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ttc_ghi_danh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chuong_trinh_id uuid NOT NULL REFERENCES public.ttc_chuong_trinh(id) ON DELETE CASCADE,
  nguoi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trang_thai text NOT NULL DEFAULT 'cho_duyet' CHECK (trang_thai IN ('cho_duyet', 'da_duyet', 'tu_choi')),
  ly_do text,
  duyet_boi uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  duyet_luc timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chuong_trinh_id, nguoi)
);
CREATE INDEX IF NOT EXISTS ttc_ghi_danh_ct_idx ON public.ttc_ghi_danh(chuong_trinh_id, trang_thai);

ALTER TABLE public.ttc_ghi_danh ENABLE ROW LEVEL SECURITY;
-- Supabase cấp sẵn mọi quyền bảng mới cho authenticated; thu về chỉ SELECT để
-- «không có policy ghi» và «không có quyền ghi» cùng chặn — hai lớp, không một.
REVOKE ALL ON public.ttc_ghi_danh FROM anon, authenticated;
GRANT SELECT ON public.ttc_ghi_danh TO authenticated;

-- Người xin thấy dòng của mình; TCTH / BGĐ của lớp thấy cả danh sách chờ
DROP POLICY IF EXISTS "ttc xem ghi danh" ON public.ttc_ghi_danh;
CREATE POLICY "ttc xem ghi danh" ON public.ttc_ghi_danh FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid())
         AND (nguoi = public.get_my_profile_id() OR public.ttc_sua_duoc_noi_dung(chuong_trinh_id)));

-- ---------------------------------------------------------------------------
-- 1) Mở / đóng ghi danh — cấp mã 6 ký tự đọc được bằng mắt (bỏ 0 O 1 I).
--    Gọi lại với _cap_lai thì mã cũ hết tác dụng ngay (tấm QR in ra bị chụp lan).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_mo_ghi_danh(_ct uuid, _mo boolean, _cap_lai boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  ma_cu text;
  ma_moi text;
  bang constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea;
  i int;
BEGIN
  IF NOT public.ttc_sua_duoc_noi_dung(_ct) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổng hợp và Ban Giám đốc của chương trình mới mở ghi danh';
  END IF;
  IF NOT _mo THEN
    UPDATE public.ttc_chuong_trinh SET ma_ghi_danh = NULL WHERE id = _ct;
    RETURN NULL;
  END IF;
  SELECT ma_ghi_danh INTO ma_cu FROM public.ttc_chuong_trinh WHERE id = _ct;
  IF ma_cu IS NOT NULL AND NOT _cap_lai THEN RETURN ma_cu; END IF;
  -- 6 ký tự trên bảng 32 = 2^30 khả năng; mã chỉ sống trong thời gian mở lớp
  -- và người gọi phải là cán bộ đã đăng nhập, nên đủ chống đoán mò.
  LOOP
    b := gen_random_bytes(6);
    ma_moi := '';
    FOR i IN 0..5 LOOP
      ma_moi := ma_moi || substr(bang, (get_byte(b, i) % 32) + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.ttc_chuong_trinh WHERE ma_ghi_danh = ma_moi);
  END LOOP;
  UPDATE public.ttc_chuong_trinh SET ma_ghi_danh = ma_moi WHERE id = _ct;
  RETURN ma_moi;
END $$;
REVOKE ALL ON FUNCTION public.ttc_mo_ghi_danh(uuid, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_mo_ghi_danh(uuid, boolean, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Quét mã thấy lớp nào — trả đủ để màn ghi danh hiện tên lớp, ngày, và
--    trạng thái của chính người quét trước khi họ bấm «Xin vào lớp».
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_xem_ma_ghi_danh(_ma text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toi uuid := public.get_my_profile_id();
  c public.ttc_chuong_trinh;
  tt text;
BEGIN
  IF toi IS NULL OR NOT public.is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Ghi danh bằng mã lớp chỉ dành cho cán bộ Bắc Hưng Yên ONE. Tài khoản khách đối tác không dùng được.');
  END IF;
  SELECT * INTO c FROM public.ttc_chuong_trinh WHERE ma_ghi_danh = upper(btrim(_ma));
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Mã lớp không đúng hoặc lớp đã đóng ghi danh. Hỏi lại Phòng Tổng hợp mã mới nhất.');
  END IF;
  IF c.trang_thai = 'KET_THUC' THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', format('Lớp «%s» đã kết thúc.', c.ten));
  END IF;
  IF EXISTS (SELECT 1 FROM public.ttc_thanh_vien WHERE chuong_trinh_id = c.id AND nguoi = toi) THEN tt := 'thanh_vien';
  ELSE SELECT trang_thai INTO tt FROM public.ttc_ghi_danh WHERE chuong_trinh_id = c.id AND nguoi = toi;
  END IF;
  RETURN jsonb_build_object('ok', true, 'chuong_trinh_id', c.id, 'ten', c.ten, 'ngay_bd', c.ngay_bd, 'ngay_kt', c.ngay_kt,
    'nhom_doi_tuong', c.nhom_doi_tuong, 'tu_duyet', c.ghi_danh_tu_duyet, 'trang_thai_cua_toi', tt);
END $$;
REVOKE ALL ON FUNCTION public.ttc_xem_ma_ghi_danh(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_xem_ma_ghi_danh(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Xin vào lớp — tự duyệt thì thành học viên ngay; không thì nằm chờ.
--    Người bị từ chối xin lại được (dòng quay về chờ duyệt) — TCTH từ chối nhầm
--    thì không phải xoá tay.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_xin_ghi_danh(_ma text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toi uuid := public.get_my_profile_id();
  c public.ttc_chuong_trinh;
BEGIN
  IF toi IS NULL OR NOT public.is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Ghi danh bằng mã lớp chỉ dành cho cán bộ Bắc Hưng Yên ONE. Tài khoản khách đối tác không dùng được.');
  END IF;
  SELECT * INTO c FROM public.ttc_chuong_trinh WHERE ma_ghi_danh = upper(btrim(_ma));
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Mã lớp không đúng hoặc lớp đã đóng ghi danh.');
  END IF;
  IF c.trang_thai = 'KET_THUC' THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', format('Lớp «%s» đã kết thúc.', c.ten));
  END IF;
  IF EXISTS (SELECT 1 FROM public.ttc_thanh_vien WHERE chuong_trinh_id = c.id AND nguoi = toi) THEN
    RETURN jsonb_build_object('ok', true, 'trang_thai', 'thanh_vien', 'chuong_trinh_id', c.id, 'ten', c.ten,
      'thong_bao', format('Anh/chị đã là thành viên của «%s».', c.ten));
  END IF;
  IF c.ghi_danh_tu_duyet THEN
    INSERT INTO public.ttc_thanh_vien (chuong_trinh_id, nguoi, vai) VALUES (c.id, toi, 'hoc_vien')
      ON CONFLICT (chuong_trinh_id, nguoi) DO NOTHING;
    INSERT INTO public.ttc_ghi_danh (chuong_trinh_id, nguoi, trang_thai, duyet_luc)
      VALUES (c.id, toi, 'da_duyet', now())
      ON CONFLICT (chuong_trinh_id, nguoi) DO UPDATE SET trang_thai = 'da_duyet', duyet_luc = now(), ly_do = NULL;
    RETURN jsonb_build_object('ok', true, 'trang_thai', 'thanh_vien', 'chuong_trinh_id', c.id, 'ten', c.ten,
      'thong_bao', format('Đã vào lớp «%s». Lộ trình đã sẵn sàng.', c.ten));
  END IF;
  INSERT INTO public.ttc_ghi_danh (chuong_trinh_id, nguoi) VALUES (c.id, toi)
    ON CONFLICT (chuong_trinh_id, nguoi) DO UPDATE
      SET trang_thai = 'cho_duyet', ly_do = NULL, duyet_boi = NULL, duyet_luc = NULL, created_at = now();
  RETURN jsonb_build_object('ok', true, 'trang_thai', 'cho_duyet', 'chuong_trinh_id', c.id, 'ten', c.ten,
    'thong_bao', format('Đã gửi yêu cầu vào lớp «%s». Phòng Tổng hợp duyệt xong thì lớp hiện ở «Chương trình của tôi».', c.ten));
END $$;
REVOKE ALL ON FUNCTION public.ttc_xin_ghi_danh(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_xin_ghi_danh(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Duyệt / từ chối — TCTH hoặc BGĐ của lớp. Duyệt thì thêm học viên ngay.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_duyet_ghi_danh(_id uuid, _dong_y boolean, _ly_do text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y public.ttc_ghi_danh;
BEGIN
  SELECT * INTO y FROM public.ttc_ghi_danh WHERE id = _id;
  IF y.id IS NULL THEN RAISE EXCEPTION 'Không thấy yêu cầu ghi danh này'; END IF;
  IF NOT public.ttc_sua_duoc_noi_dung(y.chuong_trinh_id) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổng hợp và Ban Giám đốc của chương trình mới duyệt được';
  END IF;
  IF _dong_y THEN
    INSERT INTO public.ttc_thanh_vien (chuong_trinh_id, nguoi, vai) VALUES (y.chuong_trinh_id, y.nguoi, 'hoc_vien')
      ON CONFLICT (chuong_trinh_id, nguoi) DO NOTHING;
  END IF;
  UPDATE public.ttc_ghi_danh
     SET trang_thai = CASE WHEN _dong_y THEN 'da_duyet' ELSE 'tu_choi' END,
         ly_do = CASE WHEN _dong_y THEN NULL ELSE nullif(btrim(coalesce(_ly_do, '')), '') END,
         duyet_boi = public.get_my_profile_id(), duyet_luc = now()
   WHERE id = _id;
END $$;
REVOKE ALL ON FUNCTION public.ttc_duyet_ghi_danh(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_duyet_ghi_danh(uuid, boolean, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Thêm nhiều thành viên một lần — cùng quyền với policy chèn từng dòng
--    (quản trị của lớp). Chỉ nhận cán bộ đang làm việc và không phải khách;
--    người đã có trong lớp bỏ qua (không đổi vai). Trả số người thêm được.
-- ---------------------------------------------------------------------------
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
  IF _vai NOT IN ('hoc_vien', 'huong_dan', 'bgd', 'quan_tri') THEN RAISE EXCEPTION 'Vai không hợp lệ'; END IF;
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
REVOKE ALL ON FUNCTION public.ttc_them_thanh_vien_hang_loat(uuid, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_them_thanh_vien_hang_loat(uuid, uuid[], text) TO authenticated;

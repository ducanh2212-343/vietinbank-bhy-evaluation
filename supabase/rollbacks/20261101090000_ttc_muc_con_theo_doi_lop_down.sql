-- Gỡ đợt 15. Mất: mục con và tiến độ mục, cấu hình mô-đun, mẫu ghi chú, lời dẫn,
-- dấu «xong cả lớp». Thành viên vai trợ giảng đổi về học viên trước khi thu hẹp CHECK.
-- Hàm nhân bản và cổng tích trở về bản đợt 14 (không chép mục con, không xét mục con).
DROP FUNCTION IF EXISTS public.ttc_xong_dau_viec_lop(uuid, boolean);
DROP FUNCTION IF EXISTS public.ttc_xac_nhan_muc(uuid, uuid, boolean, text, boolean);
DROP TABLE IF EXISTS public.ttc_tien_do_muc;
DROP FUNCTION IF EXISTS public.f_ttc_tien_do_muc_truoc_ghi();
DROP TABLE IF EXISTS public.ttc_muc_con;
DROP FUNCTION IF EXISTS public.ttc_ct_cua_muc_con(uuid);
UPDATE public.ttc_thanh_vien SET vai = 'hoc_vien' WHERE vai = 'tro_giang';
ALTER TABLE public.ttc_thanh_vien DROP CONSTRAINT IF EXISTS ttc_thanh_vien_vai_check;
ALTER TABLE public.ttc_thanh_vien ADD CONSTRAINT ttc_thanh_vien_vai_check CHECK (vai IN ('hoc_vien','huong_dan','bgd','quan_tri'));
DROP FUNCTION IF EXISTS public.ttc_la_team(uuid);
ALTER TABLE public.ttc_dau_viec DROP CONSTRAINT IF EXISTS ttc_dau_viec_ai_tich_check;
ALTER TABLE public.ttc_dau_viec
  DROP COLUMN IF EXISTS ai_tich, DROP COLUMN IF EXISTS xong_luc, DROP COLUMN IF EXISTS xong_boi,
  DROP COLUMN IF EXISTS ghi_chu_nguoi_dan, DROP COLUMN IF EXISTS truong_ghi_chu, DROP COLUMN IF EXISTS nguoi_dan_ten;
ALTER TABLE public.ttc_tien_do DROP COLUMN IF EXISTS tra_loi;
ALTER TABLE public.ttc_chuong_trinh DROP COLUMN IF EXISTS mo_dun;

CREATE OR REPLACE FUNCTION public.ttc_them_thanh_vien_hang_loat(_ct uuid, _nguoi uuid[], _vai text DEFAULT 'hoc_vien')
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.ttc_la_quan_tri(_ct) THEN RAISE EXCEPTION 'Chỉ quản trị của chương trình mới xếp thành viên'; END IF;
  IF _vai NOT IN ('hoc_vien', 'huong_dan', 'bgd', 'quan_tri') THEN RAISE EXCEPTION 'Vai không hợp lệ'; END IF;
  WITH chen AS (
    INSERT INTO public.ttc_thanh_vien (chuong_trinh_id, nguoi, vai)
    SELECT _ct, p.id, _vai FROM public.profiles p
     WHERE p.id = ANY(_nguoi) AND p.status = 'active' AND public.is_staff(p.user_id)
    ON CONFLICT (chuong_trinh_id, nguoi) DO NOTHING RETURNING 1)
  SELECT count(*) INTO n FROM chen; RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.f_ttc_tien_do_truoc_ghi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tn text[]; thieu text[] := ARRAY[]::text[]; cu public.ttc_tien_do;
BEGIN
  IF NEW.tep IS NULL OR jsonb_typeof(NEW.tep) <> 'array' THEN NEW.tep := '[]'::jsonb; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO cu FROM public.ttc_tien_do t WHERE t.dau_viec_id = NEW.dau_viec_id AND t.nguoi = NEW.nguoi;
    IF cu.id IS NOT NULL THEN
      IF jsonb_array_length(NEW.tep) = 0 THEN NEW.tep := COALESCE(cu.tep, '[]'::jsonb); END IF;
      IF NEW.ghi_chu IS NULL THEN NEW.ghi_chu := cu.ghi_chu; END IF;
      IF NEW.duong_dan IS NULL THEN NEW.duong_dan := cu.duong_dan; END IF;
    END IF;
  END IF;
  NEW.file_url := NEW.tep -> 0 ->> 'path';
  IF NEW.hoan_thanh THEN
    SELECT tinh_nang INTO tn FROM public.ttc_dau_viec WHERE id = NEW.dau_viec_id;
    IF 'NOP_TEP' = ANY(tn) AND jsonb_array_length(NEW.tep) = 0 THEN thieu := array_append(thieu, 'tệp đính kèm'); END IF;
    IF 'GHI_CHU' = ANY(tn) AND char_length(btrim(COALESCE(NEW.ghi_chu, ''))) < 10 THEN thieu := array_append(thieu, 'ghi chú kết quả (≥ 10 ký tự)'); END IF;
    IF 'DUONG_DAN' = ANY(tn) AND btrim(COALESCE(NEW.duong_dan, '')) = '' THEN thieu := array_append(thieu, 'đường dẫn'); END IF;
    IF cardinality(thieu) > 0 THEN RAISE EXCEPTION 'Đầu việc này yêu cầu nộp trước khi tích hoàn thành. Còn thiếu: %', array_to_string(thieu, ', '); END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.ttc_nhan_ban_chuong_trinh(_nguon uuid, _ten text, _ngay_bd date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE goc public.ttc_chuong_trinh; moi uuid; lech int; r record; ngay_moi uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổng hợp mới nhân bản được chương trình';
  END IF;
  SELECT * INTO goc FROM public.ttc_chuong_trinh WHERE id = _nguon;
  IF goc.id IS NULL THEN RAISE EXCEPTION 'Không thấy chương trình nguồn'; END IF;
  lech := _ngay_bd - goc.ngay_bd;
  INSERT INTO public.ttc_chuong_trinh (ten, mo_ta, ngay_bd, ngay_kt, trang_thai, nhom_doi_tuong, loai, khoi_nang_luc, la_mau, vi_do, kinh_do, ban_kinh_m, nguoi_tao, nhac)
  VALUES (_ten, goc.mo_ta, _ngay_bd, goc.ngay_kt + lech, 'CHUAN_BI', goc.nhom_doi_tuong, goc.loai, goc.khoi_nang_luc, false, goc.vi_do, goc.kinh_do, goc.ban_kinh_m, public.get_my_profile_id(),
          jsonb_build_object('khi_hoan_thanh', jsonb_build_object('bat', COALESCE((goc.nhac -> 'khi_hoan_thanh' ->> 'bat')::boolean, true), 'nguoi', '[]'::jsonb)))
  RETURNING id INTO moi;
  FOR r IN SELECT * FROM public.ttc_ngay WHERE chuong_trinh_id = _nguon ORDER BY so_thu_tu LOOP
    INSERT INTO public.ttc_ngay (chuong_trinh_id, so_thu_tu, ngay, tieu_de, khoi, van_ban, nhiem_vu_van_ban, chuan_bi, lat_cat, cau_hoi_tu_soi)
    VALUES (moi, r.so_thu_tu, r.ngay + lech, r.tieu_de, r.khoi, r.van_ban, r.nhiem_vu_van_ban, r.chuan_bi, r.lat_cat, r.cau_hoi_tu_soi) RETURNING id INTO ngay_moi;
    INSERT INTO public.ttc_dau_viec (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam, tinh_nang)
    SELECT ngay_moi, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam, tinh_nang FROM public.ttc_dau_viec WHERE ngay_id = r.id;
  END LOOP;
  RETURN moi;
END $$;

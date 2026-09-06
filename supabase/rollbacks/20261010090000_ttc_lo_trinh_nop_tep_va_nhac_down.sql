-- Gỡ 20261010090000_ttc_lo_trinh_nop_tep_va_nhac.sql
-- Tệp trong bucket bhy-training KHÔNG bị xoá (Storage không cascade) — xoá tay
-- trên Dashboard nếu thật sự muốn bỏ kho.

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('ttc-nhac-theo-lich')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ttc-nhac-theo-lich');
  END IF;
END $cron$;

DROP FUNCTION IF EXISTS public.ttc_nhac_theo_lich(timestamptz);
DROP FUNCTION IF EXISTS public.ttc_ten_phan(text);

-- ttc_bao_cho_vai về bản tự lặp thành viên (như migration 20261008)
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
DROP FUNCTION IF EXISTS public.ttc_bao_cho_nguoi(uuid, uuid[], text, text, text, text);

-- Nhân bản về bản không có nhac / tinh_nang
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

ALTER TABLE public.ttc_chuong_trinh DROP COLUMN IF EXISTS nhac;

DROP POLICY IF EXISTS "Hoc vien nop tep training center" ON storage.objects;
DROP POLICY IF EXISTS "Thanh vien chuong trinh xem tep training center" ON storage.objects;
DROP POLICY IF EXISTS "Chu tep xoa tep training center" ON storage.objects;
DROP FUNCTION IF EXISTS public.ttc_ct_cua_duong_dan_tep(text);
DELETE FROM storage.buckets WHERE id = 'bhy-training'
  AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'bhy-training');

DROP TRIGGER IF EXISTS ttc_tien_do_truoc_ghi ON public.ttc_tien_do;
DROP FUNCTION IF EXISTS public.f_ttc_tien_do_truoc_ghi();
ALTER TABLE public.ttc_tien_do DROP COLUMN IF EXISTS tep, DROP COLUMN IF EXISTS duong_dan;

ALTER TABLE public.ttc_dau_viec DROP CONSTRAINT IF EXISTS ttc_dv_tinh_nang_hop_le;
ALTER TABLE public.ttc_dau_viec DROP COLUMN IF EXISTS tinh_nang;

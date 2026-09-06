-- GỠ: trả Training Center về nhắc theo giờ (trạng thái trước 06/09/2026).
--
-- Ba hàm nhắc theo giờ được dựng lại nguyên văn từ hai migration gốc
-- (20261008090000 và 20261010090000) vì file gỡ phải chạy được một mình.

DROP TRIGGER IF EXISTS ttc_sau_tich_tien_do ON public.ttc_tien_do;
DROP FUNCTION IF EXISTS public.ttc_bao_hoan_thanh(uuid, uuid, uuid);

-- Trả cấu hình về hai mốc cũ, tắt sẵn và chưa chọn ai
UPDATE public.ttc_chuong_trinh
   SET nhac = jsonb_build_object(
     'truoc_ngay',     jsonb_build_object('bat', false, 'phut', 30, 'nguoi', '[]'::jsonb),
     'truoc_het_phan', jsonb_build_object('bat', false, 'phut', 15, 'nguoi', '[]'::jsonb));
COMMENT ON COLUMN public.ttc_chuong_trinh.nhac IS
  'Nhắc trước giờ bắt đầu ngày (truoc_ngay) và trước giờ kết thúc từng phần (truoc_het_phan): {bat, phut, nguoi[]} — nguoi là profile id thành viên';

-- Mốc 1 cũ: tích ĐỦ đầu việc của ngày → Giám đốc và PGĐ
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
  IF TG_OP = 'UPDATE' AND OLD.hoan_thanh THEN RETURN NEW; END IF;

  SELECT n.* INTO v_ngay FROM public.ttc_ngay n
    JOIN public.ttc_dau_viec d ON d.ngay_id = n.id WHERE d.id = NEW.dau_viec_id;
  SELECT count(*) INTO v_tong FROM public.ttc_dau_viec WHERE ngay_id = v_ngay.id;
  SELECT count(*) INTO v_xong FROM public.ttc_tien_do t
    JOIN public.ttc_dau_viec d ON d.id = t.dau_viec_id
   WHERE d.ngay_id = v_ngay.id AND t.nguoi = NEW.nguoi AND t.hoan_thanh;
  IF v_tong = 0 OR v_xong < v_tong THEN RETURN NEW; END IF;

  SELECT full_name INTO v_ten FROM public.profiles WHERE id = NEW.nguoi;
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

CREATE TRIGGER ttc_sau_tich_tien_do AFTER INSERT OR UPDATE OF hoan_thanh ON public.ttc_tien_do
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_sau_tich_tien_do();

-- Mốc 2 cũ: 15:10 nhắc sắp trình bày
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

-- Mốc 3 cũ: 17:00 còn việc chưa xong
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

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('ttc-nhac-sap-trinh-bay', '10 8 * * 1-5', $job$ SELECT public.ttc_nhac_sap_trinh_bay(); $job$);
    PERFORM cron.schedule('ttc-nhac-con-viec', '0 10 * * 1-5', $job$ SELECT public.ttc_nhac_con_viec(); $job$);
  END IF;
END $cron$;

-- Hai mốc nhắc theo cấu hình (ttc_ten_phan + ttc_nhac_theo_lich + cron 5 phút)
-- KHÔNG dựng lại ở đây: nguyên văn nằm ở mục 5 của
-- supabase/migrations/20261010090000_ttc_lo_trinh_nop_tep_va_nhac.sql, chạy lại
-- đoạn đó nếu cần. Chép hai hàm dài vào file gỡ chỉ tạo thêm một bản thứ hai
-- để lệch nhau.

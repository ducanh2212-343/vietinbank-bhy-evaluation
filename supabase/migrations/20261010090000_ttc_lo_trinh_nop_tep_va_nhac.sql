-- Training Center: sửa lộ trình tại chỗ · tính năng của từng đầu việc (nộp tệp
-- đính kèm, ghi chú kết quả, đường dẫn) · nhắc trước giờ bắt đầu ngày và trước
-- giờ kết thúc từng phần — báo cho ai do từng lần đào tạo tự chọn.
--
-- Yêu cầu của Giám đốc 06/09/2026 (bổ sung sau bản mô tả phiếu giao việc):
--   1. Sửa được lộ trình chi tiết ngay trên màn Lộ trình (không phải sang màn
--      Quản trị) — quyền dùng lại ttc_sua_duoc_noi_dung, không mở thêm.
--   2. Mỗi đầu việc bật/tắt được tính năng: nộp qua tệp đính kèm, ghi chú kết
--      quả, đường dẫn. Bật rồi thì học viên phải nộp mới tích được hoàn thành —
--      chặn ở trigger, không chỉ ở giao diện.
--   3. Trước giờ bắt đầu của cả ngày và trước giờ kết thúc của từng phần,
--      hệ thống kiểm tra lại và push cho những người mà lần đào tạo này chọn.
--
-- Vì sao «báo cho ai» lưu theo NGƯỜI (uuid) chứ không theo vai: cùng vai «hướng
-- dẫn» nhưng đợt này PGĐ muốn nhận, đợt sau người kèm cặp ở phòng khác không
-- muốn; chọn thẳng người trong danh sách thành viên là cách Giám đốc mô tả.
-- Vì sao thêm hai loại tin: bốn mốc cũ đều là tin SAU sự việc (đủ ngày, còn
-- việc, thang yếu) hoặc một mốc cố định 15:10; hai mốc mới là tin TRƯỚC sự
-- việc theo giờ của từng lộ trình, gộp vào tin cũ thì sai nghĩa. Người nhận
-- do quản trị/BGĐ chọn tay nên không rơi vào tình trạng «21 loại push».

-- ---------------------------------------------------------------------------
-- 1) Tính năng của từng đầu việc
-- ---------------------------------------------------------------------------
ALTER TABLE public.ttc_dau_viec
  ADD COLUMN IF NOT EXISTS tinh_nang text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.ttc_dau_viec DROP CONSTRAINT IF EXISTS ttc_dv_tinh_nang_hop_le;
ALTER TABLE public.ttc_dau_viec ADD CONSTRAINT ttc_dv_tinh_nang_hop_le
  CHECK (tinh_nang <@ ARRAY['NOP_TEP','GHI_CHU','DUONG_DAN']::text[]);
COMMENT ON COLUMN public.ttc_dau_viec.tinh_nang IS
  'Tính năng bật cho đầu việc: NOP_TEP (nộp tệp đính kèm) · GHI_CHU (ghi chú kết quả) · DUONG_DAN (đường dẫn). Bật thì học viên phải nộp mới tích hoàn thành được.';

-- Tệp nộp: mảng {path, ten, kich_thuoc, luc}; file_url cũ giữ = path tệp đầu
ALTER TABLE public.ttc_tien_do
  ADD COLUMN IF NOT EXISTS tep jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS duong_dan text;
COMMENT ON COLUMN public.ttc_tien_do.tep IS
  'Tệp đã nộp trong bucket bhy-training: [{path, ten, kich_thuoc, luc}] — path dạng <chuong_trinh_id>/<user_id>/<dau_viec_id>/<uuid>.<đuôi>';

-- Đầu việc đã bật tính năng thì tích hoàn thành phải kèm thứ đã nộp
CREATE OR REPLACE FUNCTION public.f_ttc_tien_do_truoc_ghi()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tn text[];
  thieu text[] := ARRAY[]::text[];
BEGIN
  IF NEW.tep IS NULL OR jsonb_typeof(NEW.tep) <> 'array' THEN NEW.tep := '[]'::jsonb; END IF;
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
    IF cardinality(thieu) > 0 THEN
      RAISE EXCEPTION 'Đầu việc này yêu cầu nộp trước khi tích hoàn thành. Còn thiếu: %', array_to_string(thieu, ', ');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ttc_tien_do_truoc_ghi ON public.ttc_tien_do;
CREATE TRIGGER ttc_tien_do_truoc_ghi BEFORE INSERT OR UPDATE ON public.ttc_tien_do
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_tien_do_truoc_ghi();

-- ---------------------------------------------------------------------------
-- 2) Kho tệp riêng cho Training Center — không dùng chung bhy-one
--
-- bhy-one cho MỌI cán bộ đọc MỌI object; bài nộp của học viên (bản đồ KCN,
-- danh sách khách hàng) chỉ thành viên chương trình được xem. Đường dẫn
-- <chuong_trinh_id>/<user_id>/<dau_viec_id>/<uuid>.<đuôi>: thư mục cấp 1 là
-- chương trình (gác đọc), cấp 2 là chủ tệp (gác ghi/xoá).
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bhy-training', 'bhy-training', false, 20971520,
        ARRAY['application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-powerpoint',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.ttc_ct_cua_duong_dan_tep(_name text)
RETURNS uuid
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE WHEN (storage.foldername(_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              THEN ((storage.foldername(_name))[1])::uuid END
$$;

DROP POLICY IF EXISTS "Hoc vien nop tep training center" ON storage.objects;
CREATE POLICY "Hoc vien nop tep training center"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bhy-training'
    AND public.is_staff(auth.uid())
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.ttc_la_thanh_vien(public.ttc_ct_cua_duong_dan_tep(name))
  );

DROP POLICY IF EXISTS "Thanh vien chuong trinh xem tep training center" ON storage.objects;
CREATE POLICY "Thanh vien chuong trinh xem tep training center"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'bhy-training'
    AND public.ttc_la_thanh_vien(public.ttc_ct_cua_duong_dan_tep(name))
  );

DROP POLICY IF EXISTS "Chu tep xoa tep training center" ON storage.objects;
CREATE POLICY "Chu tep xoa tep training center"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'bhy-training'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 3) Cấu hình nhắc của từng lần đào tạo
--    {"truoc_ngay":     {"bat": true, "phut": 30, "nguoi": [uuid, ...]},
--     "truoc_het_phan": {"bat": true, "phut": 15, "nguoi": [uuid, ...]}}
-- ---------------------------------------------------------------------------
ALTER TABLE public.ttc_chuong_trinh
  ADD COLUMN IF NOT EXISTS nhac jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.ttc_chuong_trinh.nhac IS
  'Nhắc trước giờ bắt đầu ngày (truoc_ngay) và trước giờ kết thúc từng phần (truoc_het_phan): {bat, phut, nguoi[]} — nguoi là profile id thành viên';

-- Nhân bản: giữ bật/phút, KHÔNG mang người nhận sang đợt mới; giữ tính năng đầu việc
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
     vi_do, kinh_do, ban_kinh_m, nguoi_tao, nhac)
  VALUES (_ten, goc.mo_ta, _ngay_bd, goc.ngay_kt + lech, 'CHUAN_BI', goc.nhom_doi_tuong, goc.loai,
          goc.khoi_nang_luc, false, goc.vi_do, goc.kinh_do, goc.ban_kinh_m, public.get_my_profile_id(),
          jsonb_strip_nulls(jsonb_build_object(
            'truoc_ngay',     (goc.nhac -> 'truoc_ngay')     || '{"nguoi": []}'::jsonb,
            'truoc_het_phan', (goc.nhac -> 'truoc_het_phan') || '{"nguoi": []}'::jsonb)))
  RETURNING id INTO moi;

  FOR r IN SELECT * FROM public.ttc_ngay WHERE chuong_trinh_id = _nguon ORDER BY so_thu_tu LOOP
    INSERT INTO public.ttc_ngay
      (chuong_trinh_id, so_thu_tu, ngay, tieu_de, khoi, van_ban, nhiem_vu_van_ban, chuan_bi, lat_cat, cau_hoi_tu_soi)
    VALUES (moi, r.so_thu_tu, r.ngay + lech, r.tieu_de, r.khoi, r.van_ban, r.nhiem_vu_van_ban, r.chuan_bi, r.lat_cat, r.cau_hoi_tu_soi)
    RETURNING id INTO ngay_moi;
    INSERT INTO public.ttc_dau_viec
      (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam, tinh_nang)
    SELECT ngay_moi, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam, tinh_nang
      FROM public.ttc_dau_viec WHERE ngay_id = r.id;
  END LOOP;
  RETURN moi;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Gửi cho một danh sách người — ttc_bao_cho_vai dùng lại để giữ một chỗ chống trùng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_bao_cho_nguoi(
  _ct uuid, _nguoi uuid[], _ma text, _tieu_de text, _noi_dung text, _muc text DEFAULT 'NHE')
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  phat_ngay boolean := false;
BEGIN
  -- Chỉ gửi cho người còn là thành viên: người bị bỏ khỏi chương trình mà id
  -- vẫn nằm trong cấu hình thì không nhận nữa
  FOR r IN SELECT DISTINCT tv.nguoi FROM public.ttc_thanh_vien tv
            WHERE tv.chuong_trinh_id = _ct AND tv.nguoi = ANY(_nguoi) LOOP
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
REVOKE ALL ON FUNCTION public.ttc_bao_cho_nguoi(uuid, uuid[], text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ttc_bao_cho_vai(
  _ct uuid, _vai text[], _ma text, _tieu_de text, _noi_dung text, _muc text DEFAULT 'NHE')
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ds uuid[];
BEGIN
  SELECT array_agg(nguoi) INTO ds FROM public.ttc_thanh_vien WHERE chuong_trinh_id = _ct AND vai = ANY(_vai);
  IF ds IS NULL THEN RETURN false; END IF;
  RETURN public.ttc_bao_cho_nguoi(_ct, ds, _ma, _tieu_de, _noi_dung, _muc);
END $$;

-- ---------------------------------------------------------------------------
-- 5) Nhắc theo lịch — chạy mỗi 5 phút trong giờ làm việc
--
-- Mốc nhắc = giờ trong lộ trình trừ số phút cấu hình; tin gửi ở tick cron đầu
-- tiên rơi vào [mốc, mốc + 5 phút). Cửa sổ đúng bằng bước cron để cùng một
-- mốc không gửi hai lần dù thân tin (số ô chưa tích) đổi giữa hai tick.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_ten_phan(_phan text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE _phan
    WHEN 'KHOI_DONG' THEN 'Khởi động'
    WHEN 'VAN_BAN' THEN 'Nghiên cứu văn bản'
    WHEN 'THUC_HANH' THEN 'Thực hành'
    WHEN 'TRINH_BAY' THEN 'Trình bày và phản hồi'
    WHEN 'TU_SUY_NGAM' THEN 'Tự suy ngẫm'
    ELSE _phan END
$$;

CREATE OR REPLACE FUNCTION public.ttc_nhac_theo_lich(_luc timestamptz DEFAULT now())
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  hv record;
  so_gui int := 0;
  vn timestamp := _luc AT TIME ZONE 'Asia/Ho_Chi_Minh';
  hom_nay date := vn::date;
  bay_gio time := vn::time;
  moc time;
  nguoi uuid[];
  than text;
  dong_hv text;
  dau_ra text;
BEGIN
  IF NOT public.ct2_la_ngay_lam_viec(_luc) THEN RETURN 0; END IF;

  -- (a) Trước giờ bắt đầu của cả ngày: kiểm tra lại phần chuẩn bị
  FOR r IN
    SELECT c.id AS ct, c.nhac, n.so_thu_tu, n.tieu_de, n.van_ban, n.chuan_bi,
           min(d.gio_bat_dau) AS bat_dau, count(d.id) AS so_viec
      FROM public.ttc_chuong_trinh c
      JOIN public.ttc_ngay n ON n.chuong_trinh_id = c.id AND n.ngay = hom_nay
      JOIN public.ttc_dau_viec d ON d.ngay_id = n.id
     WHERE c.trang_thai <> 'KET_THUC'
       AND COALESCE((c.nhac -> 'truoc_ngay' ->> 'bat')::boolean, false)
     GROUP BY c.id, c.nhac, n.so_thu_tu, n.tieu_de, n.van_ban, n.chuan_bi
  LOOP
    moc := r.bat_dau - make_interval(mins => COALESCE((r.nhac -> 'truoc_ngay' ->> 'phut')::int, 30));
    IF bay_gio < moc OR bay_gio >= moc + interval '5 minutes' THEN CONTINUE; END IF;
    SELECT array_agg(x::uuid) INTO nguoi FROM jsonb_array_elements_text(COALESCE(r.nhac -> 'truoc_ngay' -> 'nguoi', '[]'::jsonb)) x;
    IF nguoi IS NULL THEN CONTINUE; END IF;
    than := format(E'Ngày: %s · %s\nGiờ: bắt đầu %s · %s đầu việc', r.so_thu_tu, r.tieu_de, to_char(r.bat_dau, 'HH24:MI'), r.so_viec);
    IF r.van_ban IS NOT NULL THEN than := than || E'\nVăn bản: ' || r.van_ban; END IF;
    than := than || E'\nKiểm tra lại: ' || COALESCE(r.chuan_bi, 'thiết bị, tài liệu và chỗ ngồi đã sẵn sàng');
    IF public.ttc_bao_cho_nguoi(r.ct, nguoi, 'TTC_SAP_BAT_DAU_NGAY',
         format('Ngày %s bắt đầu lúc %s', r.so_thu_tu, to_char(r.bat_dau, 'HH24:MI')), than, 'NHE') THEN
      so_gui := so_gui + 1;
    END IF;
  END LOOP;

  -- (b) Trước giờ kết thúc của từng phần: đầu ra phải nộp + ô chưa tích của từng học viên
  FOR r IN
    SELECT c.id AS ct, c.nhac, n.id AS ngay_id, n.so_thu_tu, d.phan,
           max(d.gio_ket_thuc) AS ket_thuc, count(d.id) AS so_viec,
           string_agg(DISTINCT d.dau_ra, ' · ') FILTER (WHERE d.dau_ra IS NOT NULL) AS dau_ra
      FROM public.ttc_chuong_trinh c
      JOIN public.ttc_ngay n ON n.chuong_trinh_id = c.id AND n.ngay = hom_nay
      JOIN public.ttc_dau_viec d ON d.ngay_id = n.id
     WHERE c.trang_thai <> 'KET_THUC'
       AND COALESCE((c.nhac -> 'truoc_het_phan' ->> 'bat')::boolean, false)
     GROUP BY c.id, c.nhac, n.id, n.so_thu_tu, d.phan
  LOOP
    moc := r.ket_thuc - make_interval(mins => COALESCE((r.nhac -> 'truoc_het_phan' ->> 'phut')::int, 15));
    IF bay_gio < moc OR bay_gio >= moc + interval '5 minutes' THEN CONTINUE; END IF;
    SELECT array_agg(x::uuid) INTO nguoi FROM jsonb_array_elements_text(COALESCE(r.nhac -> 'truoc_het_phan' -> 'nguoi', '[]'::jsonb)) x;
    IF nguoi IS NULL THEN CONTINUE; END IF;

    dong_hv := '';
    FOR hv IN
      SELECT p.full_name,
             (SELECT count(*) FROM public.ttc_dau_viec d2
               WHERE d2.ngay_id = r.ngay_id AND d2.phan = r.phan
                 AND NOT EXISTS (SELECT 1 FROM public.ttc_tien_do t
                                  WHERE t.dau_viec_id = d2.id AND t.nguoi = tv.nguoi AND t.hoan_thanh)) AS chua
        FROM public.ttc_thanh_vien tv JOIN public.profiles p ON p.id = tv.nguoi
       WHERE tv.chuong_trinh_id = r.ct AND tv.vai = 'hoc_vien'
       ORDER BY p.full_name
    LOOP
      dong_hv := dong_hv || format(E'\nChưa tích: %s · %s/%s', hv.full_name, hv.chua, r.so_viec);
    END LOOP;
    dau_ra := COALESCE(left(r.dau_ra, 160), 'theo đầu việc trong lộ trình');
    than := format(E'Ngày: %s · phần %s\nKết thúc: %s\nĐầu ra: %s%s',
                   r.so_thu_tu, public.ttc_ten_phan(r.phan), to_char(r.ket_thuc, 'HH24:MI'), dau_ra, dong_hv);
    IF public.ttc_bao_cho_nguoi(r.ct, nguoi, 'TTC_SAP_HET_PHAN',
         format('Ngày %s: %s phút nữa hết phần %s', r.so_thu_tu,
                COALESCE((r.nhac -> 'truoc_het_phan' ->> 'phut')::int, 15), public.ttc_ten_phan(r.phan)),
         than, 'NHE') THEN
      so_gui := so_gui + 1;
    END IF;
  END LOOP;

  IF so_gui > 0 THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN so_gui;
END $$;
REVOKE ALL ON FUNCTION public.ttc_nhac_theo_lich(timestamptz) FROM PUBLIC, anon, authenticated;

-- 07:00–18:55 giờ Việt Nam = 00:00–11:55 UTC, thứ 2 → thứ 6; hàm tự bỏ ngày nghỉ
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('ttc-nhac-theo-lich')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ttc-nhac-theo-lich');
    PERFORM cron.schedule('ttc-nhac-theo-lich', '*/5 0-11 * * 1-5', $job$ SELECT public.ttc_nhac_theo_lich(); $job$);
  END IF;
END $cron$;

-- ---------------------------------------------------------------------------
-- 6) Lần đào tạo đang chạy (chương trình 10 ngày TP KHDN): bật cả hai mốc, báo
--    cho Giám đốc, PGĐ hướng dẫn và học viên — quản trị chỉnh lại được trên màn
-- ---------------------------------------------------------------------------
UPDATE public.ttc_chuong_trinh c SET nhac = jsonb_build_object(
  'truoc_ngay', jsonb_build_object('bat', true, 'phut', 30,
    'nguoi', COALESCE((SELECT jsonb_agg(tv.nguoi) FROM public.ttc_thanh_vien tv
                        WHERE tv.chuong_trinh_id = c.id AND tv.vai IN ('bgd','huong_dan','hoc_vien')), '[]'::jsonb)),
  'truoc_het_phan', jsonb_build_object('bat', true, 'phut', 15,
    'nguoi', COALESCE((SELECT jsonb_agg(tv.nguoi) FROM public.ttc_thanh_vien tv
                        WHERE tv.chuong_trinh_id = c.id AND tv.vai IN ('bgd','huong_dan','hoc_vien')), '[]'::jsonb)))
WHERE c.ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%' AND c.nhac = '{}'::jsonb;

-- Đầu việc nộp lên Training Center thì bật sẵn nộp tệp đính kèm — đúng nghĩa «nơi
-- nộp». Trừ đầu việc mà sản phẩm đã nằm sẵn trong cổng (phiếu giao việc trên Bảng
-- việc) — bắt nộp thêm tệp cho thứ đã có trên màn là bắt làm hai lần.
UPDATE public.ttc_dau_viec SET tinh_nang = ARRAY['NOP_TEP']
WHERE noi_nop = 'TRAINING_CENTER' AND tinh_nang = '{}'
  AND COALESCE(dau_ra, '') NOT ILIKE '%Bảng việc%';

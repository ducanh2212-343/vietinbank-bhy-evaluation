-- Training Center: ĐIỂM DANH học viên theo HAI LUỒNG
--   Luồng 1 — điện thoại + định vị: học viên bấm nút, trình duyệt xin toạ độ,
--             máy chủ tính khoảng cách tới phòng học và quyết định.
--   Luồng 2 — quét QR của ngày: Phòng TCTH in mỗi ngày một tấm QR riêng, PGĐ mở
--             ra trong phòng học, học viên quét bằng camera điện thoại.
--
-- Yêu cầu của Giám đốc 06/09/2026.
--
-- Vì sao khoảng cách tính ở MÁY CHỦ chứ không ở trình duyệt: toạ độ do trình
-- duyệt gửi lên, ai cũng sửa được trước khi gửi; nếu để trình duyệt tự kết luận
-- «trong vùng» thì hàng rào chỉ là một dòng chữ. Máy chủ nhận toạ độ thô, tự
-- tính, tự quyết — trình duyệt không có đường nào ghi thẳng vào bảng.
--
-- Vì sao MỖI NGÀY MỘT MÃ QR RIÊNG: một mã dùng chung cả đợt thì chụp lại một
-- lần là điểm danh được cả mười ngày. Mã gắn với một ngày, chỉ nhận trong đúng
-- ngày đó; TCTH cấp lại mã mới thì mã cũ chết ngay.
--
-- Vì sao ghi cả toạ độ khi quét QR (không bắt buộc): tấm QR có thể bị chụp gửi
-- cho người vắng mặt. Không chặn vì PGĐ chỉ mở tấm QR khi cả lớp đã vào, nhưng
-- có toạ độ thì Ban Giám đốc đối chiếu được khi thấy bất thường.

-- ---------------------------------------------------------------------------
-- 1) Cấu hình điểm danh của từng lần đào tạo
--    {"bat": true, "muon_phut": 15, "luong": ["DINH_VI","QR"]}
--    Toạ độ và bán kính dùng lại vi_do / kinh_do / ban_kinh_m đã có sẵn trên
--    ttc_chuong_trinh (đặt chỗ từ migration 20261008, nay dùng thật).
-- ---------------------------------------------------------------------------
ALTER TABLE public.ttc_chuong_trinh
  ADD COLUMN IF NOT EXISTS diem_danh jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.ttc_chuong_trinh.diem_danh IS
  'Cấu hình điểm danh: {bat, muon_phut, luong[]} — luong ⊂ (DINH_VI, QR). Toạ độ và bán kính nằm ở vi_do/kinh_do/ban_kinh_m.';

-- ---------------------------------------------------------------------------
-- 2) Mã QR của từng ngày
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ttc_qr_ngay (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay_id uuid NOT NULL REFERENCES public.ttc_ngay(id) ON DELETE CASCADE,
  -- Mã in lên tấm QR. 16 ký tự ngẫu nhiên: đủ dài để không dò được, đủ ngắn để
  -- QR vẫn thưa nét, in đen trắng khổ A5 vẫn quét được từ cuối phòng.
  ma text NOT NULL UNIQUE,
  vo_hieu boolean NOT NULL DEFAULT false,
  nguoi_tao uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tao_luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ttc_qr_ngay_ngay_idx ON public.ttc_qr_ngay(ngay_id) WHERE NOT vo_hieu;

-- ---------------------------------------------------------------------------
-- 3) Bản ghi điểm danh — một học viên một ngày một dòng
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ttc_diem_danh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay_id uuid NOT NULL REFERENCES public.ttc_ngay(id) ON DELETE CASCADE,
  nguoi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  luc timestamptz NOT NULL DEFAULT now(),
  luong text NOT NULL CHECK (luong IN ('DINH_VI', 'QR', 'BO_SUNG')),
  vi_do double precision,
  kinh_do double precision,
  /* Sai số máy báo (mét) — GPS trong nhà thường 20–60m, để đối chiếu khi tranh luận */
  do_chinh_xac_m int,
  khoang_cach_m int,
  /* Muộn bao nhiêu phút so với giờ bắt đầu ngày + ngưỡng cho phép; 0 = đúng giờ */
  muon_phut int NOT NULL DEFAULT 0,
  qr_ngay_id uuid REFERENCES public.ttc_qr_ngay(id) ON DELETE SET NULL,
  nguoi_ghi_ho uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ghi_chu text,
  UNIQUE (ngay_id, nguoi)
);
CREATE INDEX IF NOT EXISTS ttc_diem_danh_nguoi_idx ON public.ttc_diem_danh(nguoi);

-- ---------------------------------------------------------------------------
-- 4) Khoảng cách hai toạ độ (mét) — Haversine, bán kính Trái Đất 6.371.000 m
--
-- Không dùng PostGIS: chi nhánh chỉ cần một phép so sánh khoảng cách quanh một
-- điểm, thêm cả một extension cho việc đó là đổi hạ tầng để giải một bài toán
-- ba dòng.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_khoang_cach_m(
  _vi_do1 double precision, _kinh_do1 double precision,
  _vi_do2 double precision, _kinh_do2 double precision)
RETURNS double precision
LANGUAGE sql IMMUTABLE
AS $$
  SELECT 2 * 6371000 * asin(sqrt(
      power(sin(radians(_vi_do2 - _vi_do1) / 2), 2)
    + cos(radians(_vi_do1)) * cos(radians(_vi_do2))
      * power(sin(radians(_kinh_do2 - _kinh_do1) / 2), 2)))
$$;

-- Ngày HÔM NAY của một chương trình (theo giờ Việt Nam), kèm giờ bắt đầu
CREATE OR REPLACE FUNCTION public.ttc_ngay_hom_nay(_ct uuid)
RETURNS TABLE (ngay_id uuid, so_thu_tu int, tieu_de text, bat_dau time)
LANGUAGE sql STABLE
AS $$
  SELECT n.id, n.so_thu_tu, n.tieu_de,
         COALESCE((SELECT min(d.gio_bat_dau) FROM public.ttc_dau_viec d WHERE d.ngay_id = n.id), time '08:00')
    FROM public.ttc_ngay n
   WHERE n.chuong_trinh_id = _ct
     AND n.ngay = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
   LIMIT 1
$$;

-- ---------------------------------------------------------------------------
-- 5) Ghi một bản ghi điểm danh — lõi dùng chung cho cả hai luồng
--
-- Trả về jsonb {ok, thong_bao, trang_thai, muon_phut, khoang_cach_m} thay vì
-- ném lỗi: học viên đứng trong phòng học, cần một câu tiếng Việt nói rõ thiếu
-- gì, không phải một mã lỗi Postgres.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_ghi_diem_danh(
  _ngay_id uuid, _nguoi uuid, _luong text,
  _vi_do double precision, _kinh_do double precision, _do_chinh_xac int,
  _qr uuid, _nguoi_ghi_ho uuid, _ghi_chu text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ct uuid;
  cau_hinh jsonb;
  bat_dau time;
  moc timestamptz;
  nguong int;
  muon int := 0;
  cach int;
  ban_kinh int;
  toa_do_co boolean;
  c public.ttc_chuong_trinh;
BEGIN
  SELECT n.chuong_trinh_id,
         COALESCE((SELECT min(d.gio_bat_dau) FROM public.ttc_dau_viec d WHERE d.ngay_id = n.id), time '08:00')
    INTO ct, bat_dau
    FROM public.ttc_ngay n WHERE n.id = _ngay_id;
  IF ct IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Không thấy ngày học này.');
  END IF;
  SELECT * INTO c FROM public.ttc_chuong_trinh WHERE id = ct;
  cau_hinh := COALESCE(c.diem_danh, '{}'::jsonb);

  IF NOT COALESCE((cau_hinh ->> 'bat')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Lần đào tạo này chưa bật điểm danh.');
  END IF;
  IF _luong <> 'BO_SUNG'
     AND NOT COALESCE(cau_hinh -> 'luong' @> to_jsonb(_luong), false) THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao',
      CASE WHEN _luong = 'QR' THEN 'Lần đào tạo này không dùng điểm danh bằng QR.'
           ELSE 'Lần đào tạo này không dùng điểm danh bằng định vị.' END);
  END IF;

  -- Chỉ học viên của chương trình mới có mặt để điểm danh
  IF NOT EXISTS (SELECT 1 FROM public.ttc_thanh_vien tv
                  WHERE tv.chuong_trinh_id = ct AND tv.nguoi = _nguoi AND tv.vai = 'hoc_vien') THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Chỉ học viên của chương trình mới điểm danh được.');
  END IF;

  -- Định vị: phải có toạ độ phòng học và phải đứng trong bán kính
  toa_do_co := c.vi_do IS NOT NULL AND c.kinh_do IS NOT NULL;
  ban_kinh := COALESCE(c.ban_kinh_m, 150);
  IF _vi_do IS NOT NULL AND _kinh_do IS NOT NULL AND toa_do_co THEN
    cach := round(public.ttc_khoang_cach_m(c.vi_do, c.kinh_do, _vi_do, _kinh_do));
  END IF;
  IF _luong = 'DINH_VI' THEN
    IF NOT toa_do_co THEN
      RETURN jsonb_build_object('ok', false, 'thong_bao',
        'Chương trình chưa đặt toạ độ phòng học. Phòng Tổng hợp đặt toạ độ ở màn Quản trị chương trình.');
    END IF;
    IF _vi_do IS NULL OR _kinh_do IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'thong_bao', 'Chưa lấy được vị trí. Bật định vị cho trình duyệt rồi bấm lại.');
    END IF;
    IF cach > ban_kinh THEN
      RETURN jsonb_build_object('ok', false, 'khoang_cach_m', cach, 'thong_bao',
        format('Đang cách phòng học khoảng %s m, ngoài phạm vi %s m. Vào tới phòng rồi bấm lại.', cach, ban_kinh));
    END IF;
  END IF;

  -- Muộn bao nhiêu phút so với giờ bắt đầu ngày cộng ngưỡng cho phép
  IF _luong <> 'BO_SUNG' THEN
    nguong := COALESCE((cau_hinh ->> 'muon_phut')::int, 15);
    moc := ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + bat_dau) AT TIME ZONE 'Asia/Ho_Chi_Minh';
    muon := GREATEST(0, floor(EXTRACT(epoch FROM (now() - moc)) / 60)::int - nguong);
  END IF;

  INSERT INTO public.ttc_diem_danh
    (ngay_id, nguoi, luong, vi_do, kinh_do, do_chinh_xac_m, khoang_cach_m, muon_phut, qr_ngay_id, nguoi_ghi_ho, ghi_chu)
  VALUES (_ngay_id, _nguoi, _luong, _vi_do, _kinh_do, _do_chinh_xac, cach, muon, _qr, _nguoi_ghi_ho, _ghi_chu)
  ON CONFLICT (ngay_id, nguoi) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'da_co', true, 'thong_bao', 'Hôm nay anh/chị đã điểm danh rồi.');
  END IF;
  RETURN jsonb_build_object(
    'ok', true, 'muon_phut', muon, 'khoang_cach_m', cach,
    'thong_bao', CASE WHEN muon > 0 THEN format('Đã điểm danh, muộn %s phút.', muon)
                      ELSE 'Đã điểm danh đúng giờ.' END);
END $$;
REVOKE ALL ON FUNCTION public.ttc_ghi_diem_danh(uuid, uuid, text, double precision, double precision, int, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Luồng 1 — điện thoại + định vị
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_diem_danh_dinh_vi(
  _ct uuid, _vi_do double precision, _kinh_do double precision, _do_chinh_xac int DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toi uuid := public.get_my_profile_id();
  n record;
BEGIN
  IF toi IS NULL THEN RETURN jsonb_build_object('ok', false, 'thong_bao', 'Chưa đăng nhập.'); END IF;
  SELECT * INTO n FROM public.ttc_ngay_hom_nay(_ct);
  IF n.ngay_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Hôm nay không phải ngày học của chương trình này.');
  END IF;
  RETURN public.ttc_ghi_diem_danh(n.ngay_id, toi, 'DINH_VI', _vi_do, _kinh_do, _do_chinh_xac, NULL, NULL, NULL);
END $$;
REVOKE ALL ON FUNCTION public.ttc_diem_danh_dinh_vi(uuid, double precision, double precision, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_diem_danh_dinh_vi(uuid, double precision, double precision, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Luồng 2 — quét QR của ngày
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_diem_danh_qr(
  _ma text, _vi_do double precision DEFAULT NULL, _kinh_do double precision DEFAULT NULL,
  _do_chinh_xac int DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toi uuid := public.get_my_profile_id();
  q public.ttc_qr_ngay;
  ngay_cua_ma date;
BEGIN
  IF toi IS NULL THEN RETURN jsonb_build_object('ok', false, 'thong_bao', 'Chưa đăng nhập.'); END IF;
  SELECT * INTO q FROM public.ttc_qr_ngay WHERE ma = btrim(_ma);
  IF q.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Mã QR không đúng. Quét lại tấm QR do Phòng Tổng hợp in cho hôm nay.');
  END IF;
  IF q.vo_hieu THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Mã QR này đã được cấp lại. Quét tấm QR mới nhất trong phòng học.');
  END IF;
  SELECT ngay INTO ngay_cua_ma FROM public.ttc_ngay WHERE id = q.ngay_id;
  IF ngay_cua_ma <> (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao',
      format('Tấm QR này của ngày %s, không dùng cho hôm nay được.', to_char(ngay_cua_ma, 'DD/MM/YYYY')));
  END IF;
  RETURN public.ttc_ghi_diem_danh(q.ngay_id, toi, 'QR', _vi_do, _kinh_do, _do_chinh_xac, q.id, NULL, NULL);
END $$;
REVOKE ALL ON FUNCTION public.ttc_diem_danh_qr(text, double precision, double precision, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_diem_danh_qr(text, double precision, double precision, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) Cấp mã QR cho một ngày — Phòng TCTH / Ban Giám đốc của chương trình
--    Gọi lại trên ngày đã có mã: mã cũ vô hiệu, sinh mã mới (dùng khi tấm in
--    cũ bị chụp lan ra ngoài).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_cap_ma_qr(_ngay_id uuid, _cap_lai boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ct uuid := public.ttc_ct_cua_ngay(_ngay_id);
  ma_cu text;
  ma_moi text;
BEGIN
  IF ct IS NULL THEN RAISE EXCEPTION 'Không thấy ngày học này'; END IF;
  IF NOT public.ttc_sua_duoc_noi_dung(ct) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổng hợp và Ban Giám đốc của chương trình mới cấp được mã QR';
  END IF;

  SELECT ma INTO ma_cu FROM public.ttc_qr_ngay WHERE ngay_id = _ngay_id AND NOT vo_hieu LIMIT 1;
  IF ma_cu IS NOT NULL AND NOT _cap_lai THEN RETURN ma_cu; END IF;
  UPDATE public.ttc_qr_ngay SET vo_hieu = true WHERE ngay_id = _ngay_id AND NOT vo_hieu;

  -- 12 byte ngẫu nhiên → base64 → bỏ ký tự dễ lẫn khi đọc tay và ký tự phải
  -- thoát trên URL. Còn 16 ký tự, đủ để không dò được bằng cách thử.
  ma_moi := translate(encode(gen_random_bytes(12), 'base64'), '+/=', '-_');
  INSERT INTO public.ttc_qr_ngay (ngay_id, ma, nguoi_tao) VALUES (_ngay_id, ma_moi, public.get_my_profile_id());
  RETURN ma_moi;
END $$;
REVOKE ALL ON FUNCTION public.ttc_cap_ma_qr(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_cap_ma_qr(uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9) Ghi hộ — học viên quên điện thoại, đi công tác về muộn…
--    Bắt buộc ghi lý do: một dòng điểm danh không có người chịu trách nhiệm và
--    không có lý do thì bảng theo dõi mất hết ý nghĩa.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_diem_danh_ghi_ho(_ngay_id uuid, _nguoi uuid, _ghi_chu text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ct uuid := public.ttc_ct_cua_ngay(_ngay_id);
BEGIN
  IF ct IS NULL OR NOT public.ttc_sua_duoc_noi_dung(ct) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổng hợp và Ban Giám đốc của chương trình mới ghi hộ được';
  END IF;
  IF char_length(btrim(COALESCE(_ghi_chu, ''))) < 10 THEN
    RAISE EXCEPTION 'Ghi hộ phải có lý do tối thiểu 10 ký tự';
  END IF;
  RETURN public.ttc_ghi_diem_danh(_ngay_id, _nguoi, 'BO_SUNG', NULL, NULL, NULL, NULL,
                                  public.get_my_profile_id(), btrim(_ghi_chu));
END $$;
REVOKE ALL ON FUNCTION public.ttc_diem_danh_ghi_ho(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_diem_danh_ghi_ho(uuid, uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 10) RLS — ghi CHỈ qua RPC ở trên, không có policy INSERT nào cho bảng
-- ---------------------------------------------------------------------------
ALTER TABLE public.ttc_diem_danh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ttc_qr_ngay   ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ttc_diem_danh, public.ttc_qr_ngay FROM anon;
GRANT SELECT ON public.ttc_diem_danh, public.ttc_qr_ngay TO authenticated;
GRANT DELETE ON public.ttc_diem_danh TO authenticated;

-- Thành viên chương trình xem được bảng điểm danh: học viên thấy mình đã điểm
-- danh chưa, người hướng dẫn và BGĐ thấy cả lớp.
CREATE POLICY "ttc xem diem danh" ON public.ttc_diem_danh FOR SELECT TO authenticated
  USING (public.ttc_la_thanh_vien(public.ttc_ct_cua_ngay(ngay_id)));
-- Xoá một dòng ghi nhầm là việc của quản trị/BGĐ; sửa thì không — muốn đổi thì
-- xoá rồi ghi lại, để không có đường sửa lặng lẽ giờ điểm danh.
CREATE POLICY "ttc xoa diem danh" ON public.ttc_diem_danh FOR DELETE TO authenticated
  USING (public.ttc_sua_duoc_noi_dung(public.ttc_ct_cua_ngay(ngay_id)));

-- Mã QR chỉ người in ra được đọc; học viên không cần đọc bảng này (họ quét ảnh)
CREATE POLICY "ttc xem ma qr" ON public.ttc_qr_ngay FOR SELECT TO authenticated
  USING (public.ttc_sua_duoc_noi_dung(public.ttc_ct_cua_ngay(ngay_id)));

-- ---------------------------------------------------------------------------
-- 11) Bật điểm danh cho lần đào tạo đang chạy — hai luồng, muộn sau 15 phút
--     Toạ độ đang là toạ độ TẠM TÍNH khu vực Phường Mỹ Hào (nạp từ migration
--     20261008). Bán kính nới lên 250 m để tạm chạy được; Phòng TCTH đứng tại
--     phòng học bấm «Lấy toạ độ tại đây» rồi thu bán kính về 100–150 m.
-- ---------------------------------------------------------------------------
UPDATE public.ttc_chuong_trinh
   SET diem_danh = jsonb_build_object('bat', true, 'muon_phut', 15,
                                      'luong', jsonb_build_array('DINH_VI', 'QR')),
       ban_kinh_m = GREATEST(COALESCE(ban_kinh_m, 0), 250)
 WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%' AND diem_danh = '{}'::jsonb;

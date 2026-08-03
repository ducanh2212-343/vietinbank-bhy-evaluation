-- ============================================================================
-- LỊCH NGHỈ LỄ CỦA CHI NHÁNH + NHẮC QUẢN TRỊ TRƯỚC 10 NGÀY
--
-- Đợt trước đã tách bạch «ngày làm việc» khỏi «ngày lịch», nhưng mới trừ được
-- thứ Bảy và Chủ nhật. Đến 30/4 hay Tết thì mọi đồng hồ chờ lại đếm sai đúng
-- như lỗi vừa sửa: hồ sơ trình trước kỳ nghỉ 9 ngày sẽ báo đỏ «chờ 9 ngày» khi
-- cơ quan mở cửa trở lại.
--
-- VÌ SAO KHÔNG TỰ ĐIỀN LỊCH NGHỈ: bốn mốc lễ neo cứng vào dương lịch (01/01,
-- 30/4, 01/5, 02/9) và hai mốc tính được từ âm lịch (Tết Nguyên đán, Giỗ Tổ),
-- nhưng LỊCH NGHỈ CỤ THỂ — nghỉ mấy ngày, hoán đổi ngày nào, đi làm bù thứ Bảy
-- nào — là do Chính phủ chốt từng năm. Máy đoán thì sai. Nên hệ thống chỉ NHẮC
-- quản trị trước 10 ngày, còn người nhập là người quyết.
--
-- HAI CHIỀU, KHÔNG PHẢI MỘT: bảng này vừa BỚT ngày làm việc (loại NGHI) vừa
-- THÊM ngày làm việc (loại LAM_BU — thứ Bảy đi làm bù theo lịch điều động).
-- Chỉ làm một chiều là đến kỳ nghỉ lễ có hoán đổi lại đếm sai.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Bảng lịch nghỉ
--
-- Lưu theo TỪNG NGÀY chứ không theo khoảng: hàm đếm ngày làm việc chỉ cần một
-- phép tra bảng, không phải xét chồng lấn khoảng. Nhiều ngày của cùng một kỳ
-- nghỉ chia sẻ `nhom_id` để giao diện hiện và xóa được cả cụm.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lich_nghi_le (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay date NOT NULL UNIQUE,
  loai text NOT NULL DEFAULT 'NGHI' CHECK (loai IN ('NGHI', 'LAM_BU')),
  ten text NOT NULL CHECK (char_length(trim(ten)) >= 2),
  -- Các ngày cùng một kỳ nghỉ dùng chung nhóm
  nhom_id uuid NOT NULL DEFAULT gen_random_uuid(),
  -- Mốc lễ gốc (TET_AM, GIO_TO, GIAI_PHONG…) — để biết mốc nào đã nhập rồi mà
  -- thôi nhắc, và để đối chiếu khi Chính phủ công bố
  ma_moc text,
  ghi_chu text,
  nguoi_tao uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lich_nghi_le IS
  'Lịch nghỉ lễ và ngày làm bù của Chi nhánh. loai=NGHI bớt một ngày làm việc, loai=LAM_BU thêm một ngày làm việc kể cả khi rơi vào T7/CN. Mọi hàm đếm ngày làm việc đọc từ đây.';
COMMENT ON COLUMN public.lich_nghi_le.nhom_id IS
  'Các ngày thuộc cùng một kỳ nghỉ dùng chung giá trị này, để giao diện xóa/sửa cả cụm.';

CREATE INDEX IF NOT EXISTS idx_lich_nghi_le_nhom ON public.lich_nghi_le(nhom_id);
CREATE INDEX IF NOT EXISTS idx_lich_nghi_le_moc ON public.lich_nghi_le(ma_moc) WHERE ma_moc IS NOT NULL;

ALTER TABLE public.lich_nghi_le ENABLE ROW LEVEL SECURITY;

-- Cả Chi nhánh ĐỌC được: cán bộ cần biết vì sao thẻ của mình không bị tính
-- chậm, và trang lịch nghỉ là thông tin chung chứ không phải bí mật.
DROP POLICY IF EXISTS "lich nghi doc" ON public.lich_nghi_le;
CREATE POLICY "lich nghi doc" ON public.lich_nghi_le FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Chỉ TCTH/quản trị hệ thống được sửa: đây là dữ liệu ảnh hưởng tới mọi cảnh
-- báo của mọi phòng.
DROP POLICY IF EXISTS "lich nghi sua" ON public.lich_nghi_le;
CREATE POLICY "lich nghi sua" ON public.lich_nghi_le FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  );

-- ---------------------------------------------------------------------------
-- 2) Nhập cả một kỳ nghỉ trong một lần
--
-- Kỳ nghỉ Tết có thể 9 ngày. Bắt quản trị bấm thêm 9 lần là cách chắc chắn để
-- có kỳ nhập thiếu ngày.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lich_nghi_them_ky(
  _tu date,
  _den date,
  _ten text,
  _loai text DEFAULT 'NGHI',
  _ma_moc text DEFAULT NULL,
  _ghi_chu text DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nhom uuid := gen_random_uuid();
  so_dong int;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role)
          OR public.has_role(auth.uid(), 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ TCTH/quản trị hệ thống được sửa lịch nghỉ';
  END IF;
  IF _den < _tu THEN
    RAISE EXCEPTION 'Ngày kết thúc phải từ ngày bắt đầu trở đi';
  END IF;
  IF _den - _tu > 30 THEN
    RAISE EXCEPTION 'Một kỳ nghỉ không quá 31 ngày — kiểm tra lại ngày nhập';
  END IF;

  INSERT INTO public.lich_nghi_le (ngay, loai, ten, nhom_id, ma_moc, ghi_chu, nguoi_tao)
  SELECT g::date, _loai, trim(_ten), nhom, _ma_moc, _ghi_chu, public.get_my_profile_id()
    FROM generate_series(_tu, _den, interval '1 day') AS g
  -- Nhập đè lên ngày đã có thì cập nhật, không báo lỗi: quản trị sửa lại lịch
  -- sau khi Chính phủ điều chỉnh là chuyện bình thường.
  ON CONFLICT (ngay) DO UPDATE
    SET loai = EXCLUDED.loai,
        ten = EXCLUDED.ten,
        nhom_id = EXCLUDED.nhom_id,
        ma_moc = EXCLUDED.ma_moc,
        ghi_chu = EXCLUDED.ghi_chu,
        nguoi_tao = EXCLUDED.nguoi_tao;

  GET DIAGNOSTICS so_dong = ROW_COUNT;
  RETURN so_dong;
END $$;

REVOKE ALL ON FUNCTION public.lich_nghi_them_ky(date, date, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lich_nghi_them_ky(date, date, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.lich_nghi_xoa_nhom(_nhom uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE so_dong int;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role)
          OR public.has_role(auth.uid(), 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ TCTH/quản trị hệ thống được sửa lịch nghỉ';
  END IF;
  DELETE FROM public.lich_nghi_le WHERE nhom_id = _nhom;
  GET DIAGNOSTICS so_dong = ROW_COUNT;
  RETURN so_dong;
END $$;

REVOKE ALL ON FUNCTION public.lich_nghi_xoa_nhom(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lich_nghi_xoa_nhom(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Đếm ngày làm việc: nay trừ cả ngày lễ, và cộng lại ngày làm bù
--
-- Hai hàm này đổi từ IMMUTABLE sang STABLE vì bắt đầu đọc bảng. Không có chỉ
-- mục nào dựng trên chúng nên việc đổi là an toàn.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_ngay_lam_viec(_tu date, _den date)
RETURNS int
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _tu IS NULL OR _den IS NULL OR _den <= _tu THEN 0
    ELSE (
      SELECT count(*)::int
        FROM generate_series(_tu + 1, LEAST(_den, _tu + 400), interval '1 day') AS g
        LEFT JOIN public.lich_nghi_le l ON l.ngay = g::date
       WHERE COALESCE(l.loai, '') = 'LAM_BU'
          OR (EXTRACT(dow FROM g) NOT IN (0, 6) AND COALESCE(l.loai, '') <> 'NGHI')
    )
  END
$$;

COMMENT ON FUNCTION public.ct2_ngay_lam_viec(date, date) IS
  'Số ngày làm việc trôi qua từ _tu đến _den, không tính ngày _tu. Trừ T7/CN và ngày trong lich_nghi_le loại NGHI; cộng lại ngày loại LAM_BU.';

CREATE OR REPLACE FUNCTION public.ct2_la_ngay_lam_viec(_moc timestamptz DEFAULT now())
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.lich_nghi_le l
                  WHERE l.ngay = (_moc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                    AND l.loai = 'LAM_BU') THEN true
    WHEN EXISTS (SELECT 1 FROM public.lich_nghi_le l
                  WHERE l.ngay = (_moc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                    AND l.loai = 'NGHI') THEN false
    ELSE EXTRACT(dow FROM (_moc AT TIME ZONE 'Asia/Ho_Chi_Minh')) NOT IN (0, 6)
  END
$$;

REVOKE ALL ON FUNCTION public.ct2_ngay_lam_viec(date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ct2_la_ngay_lam_viec(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_ngay_lam_viec(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_la_ngay_lam_viec(timestamptz) TO authenticated;

-- Mốc phát thông báo cũng phải nhảy qua ngày lễ, không chỉ qua cuối tuần
CREATE OR REPLACE FUNCTION public.ct2_moc_phat_gan_nhat(_moc timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  vn timestamp := _moc AT TIME ZONE 'Asia/Ho_Chi_Minh';
  ngay date := vn::date;
  gio time := vn::time;
  vong int := 0;
BEGIN
  IF public.ct2_la_ngay_lam_viec(_moc) AND gio >= time '07:00' AND gio <= time '18:00' THEN
    RETURN _moc;
  END IF;

  IF public.ct2_la_ngay_lam_viec(_moc) AND gio < time '07:00' THEN
    RETURN (ngay + time '07:00') AT TIME ZONE 'Asia/Ho_Chi_Minh';
  END IF;

  -- Nhảy tới 7h00 ngày làm việc kế tiếp. Chặn vòng lặp ở 30 ngày phòng khi ai
  -- đó nhập nhầm cả tháng thành ngày nghỉ.
  LOOP
    ngay := ngay + 1;
    vong := vong + 1;
    EXIT WHEN vong >= 30
      OR public.ct2_la_ngay_lam_viec((ngay + time '07:00') AT TIME ZONE 'Asia/Ho_Chi_Minh');
  END LOOP;
  RETURN (ngay + time '07:00') AT TIME ZONE 'Asia/Ho_Chi_Minh';
END $$;

REVOKE ALL ON FUNCTION public.ct2_moc_phat_gan_nhat(timestamptz) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Chống nhắc trùng
--
-- Tác vụ nhắc chạy mỗi ngày và quét cả một KHOẢNG 10 ngày (thay vì đúng ngày
-- thứ 10, vì tác vụ chỉ chạy ngày thường nên có thể chạy trễ). Không có bảng
-- này thì quản trị bị nhắc lại mỗi sáng suốt mười ngày liền.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lich_nghi_da_nhac (
  ma_moc text NOT NULL,
  nam int NOT NULL,
  nhac_luc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ma_moc, nam)
);

ALTER TABLE public.lich_nghi_da_nhac ENABLE ROW LEVEL SECURITY;
-- Không cấp policy nào: chỉ service_role (tác vụ nền) đụng tới bảng này.

COMMENT ON TABLE public.lich_nghi_da_nhac IS
  'Đánh dấu mốc lễ nào của năm nào đã nhắc quản trị rồi. Khóa chính (ma_moc, nam) khiến việc nhắc là idempotent kể cả khi tác vụ chạy lại nhiều lần.';

-- Edge function chạy bằng service_role cần đặt được thông báo qua đúng cửa
-- ct2_dat_thong_bao, thay vì ghi thẳng vào bảng hàng đợi và lách hết luật.
GRANT EXECUTE ON FUNCTION public.ct2_dat_thong_bao(text, uuid, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ct2_kich_hoat_phat_push() TO service_role;

-- ---------------------------------------------------------------------------
-- 5) Ai là quản trị cần nhắc
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lich_nghi_nguoi_quan_tri()
RETURNS TABLE (profile_id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.full_name
    FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.user_id
   WHERE p.status = 'active'
     AND r.role IN ('tcth_admin'::app_role, 'system_admin'::app_role)
$$;

REVOKE ALL ON FUNCTION public.lich_nghi_nguoi_quan_tri() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lich_nghi_nguoi_quan_tri() TO service_role;

-- ---------------------------------------------------------------------------
-- 6) Tác vụ nhắc: 07:05 giờ VN mỗi ngày thường
--
-- Chạy sau tác vụ phát thông báo hoãn (07:00) năm phút, để tin nhắc của hôm nay
-- đi cùng chuyến với phần còn lại thay vì phải chờ tới hôm sau.
-- ---------------------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('nhac-lich-nghi')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nhac-lich-nghi');
    -- 00:05 UTC = 07:05 giờ VN, thứ 2 → thứ 6
    PERFORM cron.schedule('nhac-lich-nghi', '5 0 * * 1-5', $job$
      select net.http_post(
        url := 'https://whlysprzsguehxmrjwha.supabase.co/functions/v1/nhac-lich-nghi',
        headers := jsonb_build_object(
          'Authorization',
          'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                        where name = 'email_queue_service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$);
  END IF;
END $cron$;

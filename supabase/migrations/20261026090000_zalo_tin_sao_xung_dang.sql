-- ĐẨY TIN SAO XỨNG ĐÁNG VÀO NHÓM ZALO GMF (12/09/2026) — bước 6 của việc nối Zalo.
--
-- Quyết định của Giám đốc (12/09): lý do nguyên văn; kèm sao tích lũy + mốc quà;
-- gom 2 phút nhưng MỖI NGƯỜI MỘT TIN (không dồn nhiều người vào một tin);
-- chân tin là đường dẫn về cổng. Chế độ gộp để trong cấu hình để đổi được
-- không cần sửa mã.
--
-- Cách chạy: trigger sau khi ghi phiếu chỉ XẾP HÀNG (bảng zalo_hang_doi) với mốc
-- «sẵn sàng» = lúc ghi + cửa sổ gom. Cron mỗi phút gọi edge function zalo-gui-sao;
-- hàm gom các dòng đã tới mốc theo người nhận, soạn tin, gửi, đóng dấu. Lỗi thì
-- thử lại theo lùi dần (2, 4, 8, 16 phút), quá số lần thì đánh dấu lỗi và báo
-- quản trị. Trigger KHÔNG gọi Zalo trực tiếp: một lệnh ghi phiếu không bao giờ
-- được phép chờ hay hỏng vì mạng ngoài.
-- Chỉ THÊM: bảng mới, trigger mới, khóa cấu hình mới. Không sửa star_records.

-- ---------------------------------------------------------------------------
-- 1. Hàng đợi tin Sao
-- ---------------------------------------------------------------------------
CREATE TABLE public.zalo_hang_doi (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Không FK cascade: phiếu bị gỡ sau khi tin đã gửi thì lịch sử gửi vẫn phải còn
  star_record_id uuid NOT NULL UNIQUE,
  trang_thai text NOT NULL DEFAULT 'cho'
    CHECK (trang_thai IN ('cho', 'dang_gui', 'da_gui', 'loi', 'bo_qua')),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  san_sang_luc timestamptz NOT NULL,
  so_lan_thu integer NOT NULL DEFAULT 0,
  loi_gan_nhat text,
  gui_luc timestamptz,
  message_id text,
  -- Bản chụp tin đã gửi: để tra «hôm đó nhóm nhận đúng chữ gì» dù phiếu đã sửa/gỡ
  noi_dung text
);
CREATE INDEX idx_zalo_hang_doi_cho ON public.zalo_hang_doi (san_sang_luc) WHERE trang_thai = 'cho';
CREATE INDEX idx_zalo_hang_doi_tao_luc ON public.zalo_hang_doi (tao_luc DESC);
COMMENT ON TABLE public.zalo_hang_doi IS
  'Hàng đợi tin Sao Xứng Đáng chờ đẩy vào nhóm Zalo GMF. Trigger sao_xep_hang_zalo ghi vào; edge function zalo-gui-sao đọc ra.';

ALTER TABLE public.zalo_hang_doi ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zalo_hang_doi FROM anon, authenticated;
CREATE POLICY "Quản trị xem hàng đợi Zalo"
  ON public.zalo_hang_doi FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  );
GRANT SELECT ON public.zalo_hang_doi TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Cấu hình cách soạn và gom tin
-- ---------------------------------------------------------------------------
INSERT INTO public.zalo_cau_hinh (khoa, gia_tri, mo_ta) VALUES
  ('gom_phut', '2', 'Cửa sổ gom (phút) kể từ lúc ghi phiếu trước khi gửi — để phiếu nhập liền nhau đi chung một tin'),
  ('che_do_gop', 'moi_nguoi_mot_tin', 'moi_nguoi_mot_tin: mỗi người nhận một tin riêng (GĐ chốt 12/09) · gop_theo_nguoi_tang: các phiếu cùng người tặng trong cửa sổ dồn một tin'),
  ('toi_da_dong_mot_tin', '10', 'Số phiếu tối đa liệt kê trong một tin; dư thì ghi «và N Sao nữa»'),
  ('link_chan_tin', 'bachungyenone.com/one/ghi-nhan/tong-hop', 'Dòng cuối mỗi tin (để trống nếu không muốn)'),
  ('so_lan_thu_toi_da', '5', 'Gửi lỗi thì thử lại tối đa bấy nhiêu lần (lùi dần 2, 4, 8, 16 phút) rồi báo quản trị'),
  ('ly_do_toi_da_ky_tu', '300', 'Lý do đưa nguyên văn (GĐ chốt 12/09) nhưng cắt ở ngưỡng này để tin không tràn màn hình')
ON CONFLICT (khoa) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Sao tích lũy của người trên một phiếu
-- ---------------------------------------------------------------------------
-- Vì sao không dùng thẳng sao_tong_cua_can_bo: 149/184 phiếu 30 ngày qua KHÔNG có
-- recipient_profile_id (ghi theo tên). Có profile thì dùng hàm đã có; không có thì
-- cộng theo tên đã bỏ dấu + phòng, đúng cách bảng thi đua đang gộp.
CREATE OR REPLACE FUNCTION public.zalo_sao_tich_luy(_record_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  tong integer;
BEGIN
  SELECT name, department, recipient_profile_id, is_collective INTO r
    FROM public.star_records WHERE id = _record_id;
  IF r IS NULL THEN RETURN 0; END IF;
  IF r.is_collective THEN
    SELECT COALESCE(sum(stars), 0)::int INTO tong
      FROM public.star_records
     WHERE is_collective
       AND bhy_chuan_hoa_ten(name) = bhy_chuan_hoa_ten(r.name);
    RETURN tong;
  END IF;
  IF r.recipient_profile_id IS NOT NULL THEN
    RETURN public.sao_tong_cua_can_bo(r.recipient_profile_id);
  END IF;
  SELECT COALESCE(sum(stars), 0)::int INTO tong
    FROM public.star_records s
   WHERE NOT s.is_collective
     AND bhy_chuan_hoa_ten(s.name) = bhy_chuan_hoa_ten(r.name)
     AND bhy_chuan_hoa_ten(COALESCE(s.department, '')) = bhy_chuan_hoa_ten(COALESCE(r.department, ''));
  RETURN tong;
END $$;
REVOKE ALL ON FUNCTION public.zalo_sao_tich_luy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zalo_sao_tich_luy(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Xếp hàng khi có phiếu mới; rút khỏi hàng khi phiếu bị gỡ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sao_xep_hang_zalo()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bat text;
  phut integer;
BEGIN
  -- Nhập bù là chép lại lịch sử, không phải tin vui vừa xảy ra (cùng luật với push)
  IF NEW.entry_mode = 'backfill' THEN RETURN NEW; END IF;
  SELECT gia_tri INTO bat FROM public.zalo_cau_hinh WHERE khoa = 'bat_sao_xung_dang';
  IF bat IS DISTINCT FROM 'true' THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(gia_tri, '')::int, 2) INTO phut FROM public.zalo_cau_hinh WHERE khoa = 'gom_phut';
  INSERT INTO public.zalo_hang_doi (star_record_id, san_sang_luc)
  VALUES (NEW.id, now() + make_interval(mins => GREATEST(0, COALESCE(phut, 2))))
  ON CONFLICT (star_record_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Xếp hàng hỏng thì thôi tin Zalo; phiếu Sao vẫn phải ghi được.
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sao_xep_hang_zalo ON public.star_records;
CREATE TRIGGER trg_sao_xep_hang_zalo
  AFTER INSERT ON public.star_records
  FOR EACH ROW EXECUTE FUNCTION public.sao_xep_hang_zalo();

CREATE OR REPLACE FUNCTION public.sao_rut_khoi_hang_zalo()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Phiếu gỡ trước khi tin đi thì tin không được đi; đã đi rồi thì giữ lịch sử.
  DELETE FROM public.zalo_hang_doi WHERE star_record_id = OLD.id AND trang_thai IN ('cho', 'loi');
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_sao_rut_khoi_hang_zalo ON public.star_records;
CREATE TRIGGER trg_sao_rut_khoi_hang_zalo
  AFTER DELETE ON public.star_records
  FOR EACH ROW EXECUTE FUNCTION public.sao_rut_khoi_hang_zalo();

-- ---------------------------------------------------------------------------
-- 5. Cho quản trị: tổng quan hàng đợi và gửi lại tin lỗi
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.zalo_hang_doi_tong_quan()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dem jsonb;
  v_dong jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role)
          OR public.has_role(auth.uid(), 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ quản trị được xem hàng đợi Zalo';
  END IF;
  SELECT jsonb_build_object(
    'cho', count(*) FILTER (WHERE trang_thai = 'cho'),
    'dang_gui', count(*) FILTER (WHERE trang_thai = 'dang_gui'),
    'loi', count(*) FILTER (WHERE trang_thai = 'loi'),
    'da_gui_7_ngay', count(*) FILTER (WHERE trang_thai = 'da_gui' AND gui_luc > now() - interval '7 days'),
    'da_gui_thang', count(*) FILTER (WHERE trang_thai = 'da_gui'
       AND (gui_luc AT TIME ZONE 'Asia/Ho_Chi_Minh') >= date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh'))
  ) INTO v_dem FROM public.zalo_hang_doi;

  SELECT COALESCE(jsonb_agg(x ORDER BY x.tao_luc DESC), '[]'::jsonb) INTO v_dong
    FROM (
      SELECT h.id, h.star_record_id, h.trang_thai, h.tao_luc, h.san_sang_luc, h.so_lan_thu,
             h.loi_gan_nhat, h.gui_luc, h.message_id, h.noi_dung,
             s.name, s.department, s.stars, s.is_collective, s.sender
        FROM public.zalo_hang_doi h
        LEFT JOIN public.star_records s ON s.id = h.star_record_id
       ORDER BY h.tao_luc DESC
       LIMIT 40
    ) x;
  RETURN jsonb_build_object('dem', v_dem, 'dong', v_dong);
END $$;
REVOKE ALL ON FUNCTION public.zalo_hang_doi_tong_quan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zalo_hang_doi_tong_quan() TO authenticated;

CREATE OR REPLACE FUNCTION public.zalo_gui_lai_tin_loi()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role)
          OR public.has_role(auth.uid(), 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ quản trị được gửi lại tin Zalo';
  END IF;
  UPDATE public.zalo_hang_doi
     SET trang_thai = 'cho', so_lan_thu = 0, san_sang_luc = now(), loi_gan_nhat = NULL
   WHERE trang_thai = 'loi';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.zalo_gui_lai_tin_loi() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zalo_gui_lai_tin_loi() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Cron mỗi phút — chỉ gọi khi có dòng đã tới mốc
-- ---------------------------------------------------------------------------
-- Không giới hạn khung giờ (GĐ chốt): tin Sao là tin vui, tối hay cuối tuần vẫn
-- đi. Mỗi phút một câu WHERE EXISTS là rẻ; gọi edge function vô ích thì không.
SELECT cron.schedule(
  'zalo-gui-sao',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://whlysprzsguehxmrjwha.supabase.co/functions/v1/zalo-gui-sao',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                      where name = 'email_queue_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{"hanh_dong": "phat"}'::jsonb
    )
    where exists (select 1 from public.zalo_hang_doi where trang_thai = 'cho' and san_sang_luc <= now());
  $cron$
);

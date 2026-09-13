-- KẾT NỐI ZALO OFFICIAL ACCOUNT «VietinBank Bắc Hưng Yên» (12/09/2026).
--
-- Mục đích: đẩy tin Sao Xứng Đáng từ cổng vào nhóm Zalo GMF «343 - Bắc Hưng Yên
-- One» — kênh mà ~100% cán bộ đọc hằng ngày, khác với push của cổng (chỉ 27/100
-- người bật). File này chỉ dựng NỀN kết nối: giữ token, giữ cấu hình nhóm, ghi
-- nhật ký và lịch gia hạn. Việc soạn tin Sao và hàng đợi gửi nằm ở migration sau,
-- sau khi mẫu tin được duyệt.
--
-- Chỉ THÊM, không sửa bảng nào đang có dữ liệu.
--
-- VÌ SAO TOKEN NẰM TRONG BẢNG CHỨ KHÔNG NẰM Ở BIẾN MÔI TRƯỜNG: refresh_token của
-- Zalo CHỈ DÙNG ĐƯỢC MỘT LẦN — mỗi lần gia hạn Zalo trả về cặp token mới và cặp cũ
-- chết ngay. Biến môi trường của edge function không tự ghi lại được, nên nếu cất
-- ở đó thì sau lần gia hạn đầu tiên là mất dấu. Bảng là nơi duy nhất ghi đè được
-- ngay trong cùng một lệnh, kèm mốc giờ để biết token còn sống bao lâu.
-- Secret Key của ứng dụng (thứ KHÔNG đổi) thì để ở Vault, không để trong bảng.

-- ---------------------------------------------------------------------------
-- 1. Cặp token đang sống — đúng MỘT dòng
-- ---------------------------------------------------------------------------
CREATE TABLE public.zalo_token (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token text,
  refresh_token text,
  -- Zalo: access_token sống ~25 giờ (expires_in 90000 giây), refresh_token sống 3 tháng
  access_het_han_luc timestamptz,
  refresh_het_han_luc timestamptz,
  -- Mốc đổi mã ủy quyền lần đầu và mốc gia hạn gần nhất — để biết token có tuổi thật
  cap_luc timestamptz,
  gia_han_luc timestamptz,
  so_lan_gia_han integer NOT NULL DEFAULT 0,
  -- Đếm lỗi liên tiếp để cảnh báo leo thang; về 0 khi gia hạn được
  loi_lien_tiep integer NOT NULL DEFAULT 0,
  loi_gan_nhat text,
  loi_luc timestamptz,
  -- Khóa mềm: hai lần gia hạn chạy song song sẽ làm cặp token "mồ côi" (lần sau
  -- dùng refresh_token đã bị lần trước tiêu). Ai giữ khóa mới được gọi Zalo.
  dang_gia_han_tu timestamptz,
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.zalo_token IS
  'Cặp token Zalo OA đang sống (một dòng). Chỉ edge function zalo-oa (service_role) đọc/ghi.';

ALTER TABLE public.zalo_token ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zalo_token FROM anon, authenticated;
-- Không có policy nào: cán bộ (kể cả quản trị) KHÔNG đọc token qua API. Muốn xem
-- tình trạng thì gọi zalo-oa với hanh_dong = 'trang_thai' — hàm chỉ trả mốc giờ.

-- ---------------------------------------------------------------------------
-- 2. Cấu hình kênh Zalo (khóa/giá trị)
-- ---------------------------------------------------------------------------
CREATE TABLE public.zalo_cau_hinh (
  khoa text PRIMARY KEY,
  gia_tri text,
  mo_ta text,
  cap_nhat_luc timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.zalo_cau_hinh IS
  'Cấu hình kênh Zalo OA: OA ID, nhóm GMF nhận tin Sao, công tắc bật/tắt.';

ALTER TABLE public.zalo_cau_hinh ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zalo_cau_hinh FROM anon, authenticated;

INSERT INTO public.zalo_cau_hinh (khoa, gia_tri, mo_ta) VALUES
  ('oa_id', '3852871198450053653', 'OA «VietinBank Bắc Hưng Yên»'),
  ('gmf_ten_nhom', '343 - Bắc Hưng Yên One', 'Tên nhóm GMF nhận tin Sao Xứng Đáng — dùng để tìm group_id'),
  ('gmf_group_id', NULL, 'group_id của nhóm trên — zalo-oa (luu_nhom) tự điền'),
  ('bat_sao_xung_dang', 'false', 'Công tắc đẩy tin Sao Xứng Đáng vào nhóm; bật sau khi mẫu tin được duyệt');

-- ---------------------------------------------------------------------------
-- 3. Nhật ký mọi lần gọi Zalo
-- ---------------------------------------------------------------------------
-- Ghi cả thành công lẫn thất bại, vì khi cán bộ hỏi «sao tin không lên nhóm» thì
-- câu trả lời phải tra được ở đây, không phải đoán từ log edge function đã trôi.
CREATE TABLE public.zalo_nhat_ky (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loai text NOT NULL,           -- doi_ma | gia_han | liet_ke_nhom | luu_nhom | gui_tin
  thanh_cong boolean NOT NULL,
  thong_diep text,
  chi_tiet jsonb,               -- KHÔNG BAO GIỜ chứa token; chỉ mã lỗi, group_id, message_id
  tao_luc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_zalo_nhat_ky_tao_luc ON public.zalo_nhat_ky (tao_luc DESC);

ALTER TABLE public.zalo_nhat_ky ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zalo_nhat_ky FROM anon, authenticated;

CREATE POLICY "Quản trị xem nhật ký Zalo"
  ON public.zalo_nhat_ky FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  );
GRANT SELECT ON public.zalo_nhat_ky TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Đọc bí mật ứng dụng từ Vault
-- ---------------------------------------------------------------------------
-- Vault không lộ qua API, nên edge function đi qua hàm này. Chỉ service_role gọi
-- được; cán bộ (authenticated) và khách (anon) bị thu quyền hẳn.
-- Tên bí mật cố định: 'zalo_app_secret_key'. Nạp bằng:
--   select vault.create_secret('<secret>', 'zalo_app_secret_key', 'Secret Key ứng dụng Zalo 298836022005112891');
CREATE OR REPLACE FUNCTION public.zalo_lay_bi_mat(_ten text)
RETURNS text
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = _ten LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.zalo_lay_bi_mat(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zalo_lay_bi_mat(text) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Khóa mềm chống gia hạn song song
-- ---------------------------------------------------------------------------
-- Trả true nếu giành được khóa. Khóa tự hết sau 3 phút để một lần chạy bị chết
-- giữa chừng (edge function hết giờ, mất mạng) không khóa vĩnh viễn.
CREATE OR REPLACE FUNCTION public.zalo_giu_khoa_gia_han()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  giu boolean;
BEGIN
  UPDATE public.zalo_token
     SET dang_gia_han_tu = now()
   WHERE id = 1
     AND (dang_gia_han_tu IS NULL OR dang_gia_han_tu < now() - interval '3 minutes')
  RETURNING true INTO giu;
  RETURN COALESCE(giu, false);
END $$;
REVOKE ALL ON FUNCTION public.zalo_giu_khoa_gia_han() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zalo_giu_khoa_gia_han() TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Cảnh báo quản trị khi kênh Zalo hỏng
-- ---------------------------------------------------------------------------
-- Đi qua đúng cửa ct2_dat_thong_bao (mức DO → push + chuông + email) tới TCTH và
-- quản trị hệ thống. Không đẻ kênh báo lỗi riêng: nếu chính Zalo hỏng thì không
-- thể báo lỗi Zalo qua Zalo được — push của cổng là kênh dự phòng đúng nghĩa.
CREATE OR REPLACE FUNCTION public.zalo_canh_bao_quan_tri(_tieu_de text, _noi_dung text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT p.id
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
     WHERE p.status = 'active'
       AND ur.role::text IN ('system_admin', 'tcth_admin')
  LOOP
    PERFORM public.ct2_dat_thong_bao('ZALO_LOI', r.id, _tieu_de, _noi_dung, 'DO', NULL, NULL);
    n := n + 1;
  END LOOP;
  PERFORM public.ct2_kich_hoat_phat_push();
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.zalo_canh_bao_quan_tri(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zalo_canh_bao_quan_tri(text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Lịch gia hạn token: 6 tiếng một lần
-- ---------------------------------------------------------------------------
-- Hàm zalo-oa tự quyết có gọi Zalo hay không: chỉ gia hạn khi access_token còn
-- dưới 7 giờ (để chắc chắn không có khoảng trống giữa hai lần chạy). Chạy 6
-- tiếng/lần mà gia hạn vô điều kiện thì mỗi ngày quay vòng refresh_token 4 lần —
-- mỗi vòng là một cơ hội mất token nếu mạng đứt đúng giữa lúc Zalo đã cấp mà ta
-- chưa kịp ghi.
SELECT cron.schedule(
  'zalo-gia-han-token',
  '0 */6 * * *',
  $cron$
    select net.http_post(
      url := 'https://whlysprzsguehxmrjwha.supabase.co/functions/v1/zalo-oa',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                      where name = 'email_queue_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{"hanh_dong": "gia_han"}'::jsonb
    )
    -- Chưa có token (chưa đổi oauth_code lần đầu) thì không gọi: gọi vào chỉ
    -- sinh một dòng nhật ký lỗi mỗi 6 tiếng, không ai được lợi gì.
    where exists (select 1 from public.zalo_token where refresh_token is not null);
  $cron$
);

-- ---------------------------------------------------------------------------
-- 8. Quản trị đọc/sửa cấu hình kênh Zalo (trang «Quản trị Zalo»)
-- ---------------------------------------------------------------------------
-- Cấu hình KHÔNG chứa token (token ở bảng riêng, không policy). Quản trị cần
-- đọc để thấy nhóm đã nối, gói cước, công tắc; cần sửa để bật/tắt và cập nhật
-- thông tin gói cước — không cần qua edge function cho việc chữ nghĩa này.
CREATE POLICY "Quản trị xem cấu hình Zalo"
  ON public.zalo_cau_hinh FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  );
CREATE POLICY "Quản trị sửa cấu hình Zalo"
  ON public.zalo_cau_hinh FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  );
GRANT SELECT, UPDATE ON public.zalo_cau_hinh TO authenticated;

-- Gói cước để trang quản trị đối chiếu lượng tin đã gửi với hạn mức và phí.
-- Con số hạn mức/phí do quản trị điền theo hợp đồng thực với Zalo — cổng không
-- đoán, vì Zalo đổi biểu phí theo thời gian và theo gói OA.
INSERT INTO public.zalo_cau_hinh (khoa, gia_tri, mo_ta) VALUES
  ('goi_cuoc_ten', 'Gói Tăng trưởng', 'Tên gói OA đang dùng'),
  ('goi_cuoc_phi_thang', NULL, 'Phí gói mỗi tháng (VNĐ) — điền theo hợp đồng'),
  ('goi_cuoc_han_muc_tin_thang', NULL, 'Hạn mức tin/tháng của gói (để trống nếu không giới hạn)'),
  ('goi_cuoc_han_muc_phut', '100', 'Giới hạn request/phút của gói'),
  ('goi_cuoc_het_han', NULL, 'Ngày hết hạn gói (YYYY-MM-DD) — để nhắc gia hạn')
ON CONFLICT (khoa) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. Tổng quan kênh Zalo cho quản trị — một RPC, không lộ token
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.zalo_tong_quan()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_token jsonb;
  v_thang jsonb;
  v_nhat_ky jsonb;
  v_cron jsonb;
BEGIN
  IF NOT (public.has_role(v_uid, 'system_admin'::app_role)
          OR public.has_role(v_uid, 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ quản trị được xem kênh Zalo';
  END IF;

  SELECT jsonb_build_object(
           'co_token', t.access_token IS NOT NULL,
           'access_het_han_luc', t.access_het_han_luc,
           'refresh_het_han_luc', t.refresh_het_han_luc,
           'cap_luc', t.cap_luc,
           'gia_han_luc', t.gia_han_luc,
           'so_lan_gia_han', t.so_lan_gia_han,
           'loi_lien_tiep', t.loi_lien_tiep,
           'loi_gan_nhat', t.loi_gan_nhat,
           'loi_luc', t.loi_luc)
    INTO v_token
    FROM public.zalo_token t WHERE t.id = 1;

  -- Tin đã gửi theo tháng (giờ VN), 12 tháng gần nhất — để đối chiếu hạn mức gói
  SELECT COALESCE(jsonb_agg(x ORDER BY x.thang DESC), '[]'::jsonb)
    INTO v_thang
    FROM (
      SELECT to_char(tao_luc AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS thang,
             count(*) FILTER (WHERE thanh_cong)      AS thanh_cong,
             count(*) FILTER (WHERE NOT thanh_cong)  AS loi
        FROM public.zalo_nhat_ky
       WHERE loai = 'gui_tin'
         AND tao_luc > now() - interval '12 months'
       GROUP BY 1
    ) x;

  SELECT COALESCE(jsonb_agg(x ORDER BY x.tao_luc DESC), '[]'::jsonb)
    INTO v_nhat_ky
    FROM (
      SELECT id, loai, thanh_cong, thong_diep, chi_tiet, tao_luc
        FROM public.zalo_nhat_ky
       ORDER BY tao_luc DESC
       LIMIT 40
    ) x;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'name', j.jobname, 'schedule', j.schedule, 'active', j.active,
           'last_status', r.status, 'last_run', r.start_time)), '[]'::jsonb)
    INTO v_cron
    FROM cron.job j
    LEFT JOIN LATERAL (
      SELECT status, start_time FROM cron.job_run_details d
       WHERE d.jobid = j.jobid ORDER BY start_time DESC LIMIT 1
    ) r ON true
   WHERE j.jobname LIKE 'zalo-%';

  RETURN jsonb_build_object(
    'token', COALESCE(v_token, jsonb_build_object('co_token', false)),
    'theo_thang', v_thang,
    'nhat_ky', v_nhat_ky,
    'cron', v_cron
  );
END $$;
REVOKE ALL ON FUNCTION public.zalo_tong_quan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zalo_tong_quan() TO authenticated;

-- ---------------------------------------------------------------------------
-- 10. Thống kê push cho quản trị (trang «Quản trị Push»)
-- ---------------------------------------------------------------------------
-- RLS trên ct2_thong_bao và push_subscriptions chỉ cho mỗi người thấy tin/thiết
-- bị của mình — đúng, vì đó là dữ liệu cá nhân. Quản trị cần CON SỐ chứ không
-- cần nội dung từng tin, nên RPC này chỉ trả số đếm gom theo loại, ngày, phòng;
-- không trả tiêu đề/nội dung/người nhận của bất kỳ tin nào.
CREATE OR REPLACE FUNCTION public.push_thong_ke(_so_ngay integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  tu timestamptz := now() - make_interval(days => GREATEST(1, LEAST(_so_ngay, 365)));
  v_tong jsonb;
  v_loai jsonb;
  v_ngay jsonb;
  v_phong jsonb;
  v_cron jsonb;
BEGIN
  IF NOT (public.has_role(v_uid, 'system_admin'::app_role)
          OR public.has_role(v_uid, 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ quản trị được xem thống kê push';
  END IF;

  SELECT jsonb_build_object(
    'can_bo', (SELECT count(*) FROM public.profiles WHERE status = 'active'),
    'nguoi_bat_push', (SELECT count(DISTINCT s.profile_id) FROM public.push_subscriptions s
                        JOIN public.profiles p ON p.id = s.profile_id AND p.status = 'active'
                       WHERE s.is_active),
    'thiet_bi', (SELECT count(*) FROM public.push_subscriptions WHERE is_active),
    'thiet_bi_loi', (SELECT count(*) FROM public.push_subscriptions WHERE is_active AND loi_cuoi IS NOT NULL),
    'tin_ky', (SELECT count(*) FROM public.ct2_thong_bao WHERE phat_luc >= tu),
    'tin_da_gui', (SELECT count(*) FROM public.ct2_thong_bao WHERE phat_luc >= tu AND gui_luc IS NOT NULL),
    'tin_da_doc', (SELECT count(*) FROM public.ct2_thong_bao WHERE phat_luc >= tu AND doc_luc IS NOT NULL),
    'tin_da_xu_ly', (SELECT count(*) FROM public.ct2_thong_bao WHERE phat_luc >= tu AND xu_ly_luc IS NOT NULL),
    'dang_cho', (SELECT count(*) FROM public.ct2_thong_bao WHERE gui_luc IS NULL AND phat_luc > now()),
    'ton_qua_han', (SELECT count(*) FROM public.ct2_thong_bao WHERE gui_luc IS NULL AND phat_luc <= now()),
    'so_loai', (SELECT count(DISTINCT ma_su_kien) FROM public.ct2_thong_bao WHERE phat_luc >= tu)
  ) INTO v_tong;

  SELECT COALESCE(jsonb_agg(x ORDER BY x.so_tin DESC), '[]'::jsonb) INTO v_loai
    FROM (
      SELECT ma_su_kien, muc,
             count(*) AS so_tin,
             count(gui_luc) AS da_gui,
             count(doc_luc) AS da_doc,
             count(DISTINCT nguoi_nhan) AS so_nguoi
        FROM public.ct2_thong_bao
       WHERE phat_luc >= tu
       GROUP BY 1, 2
    ) x;

  SELECT COALESCE(jsonb_agg(x ORDER BY x.ngay), '[]'::jsonb) INTO v_ngay
    FROM (
      SELECT (phat_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS ngay,
             count(*) AS so_tin, count(gui_luc) AS da_gui, count(doc_luc) AS da_doc
        FROM public.ct2_thong_bao
       WHERE phat_luc >= tu AND phat_luc <= now()
       GROUP BY 1
    ) x;

  SELECT COALESCE(jsonb_agg(x ORDER BY x.can_bo DESC), '[]'::jsonb) INTO v_phong
    FROM (
      SELECT COALESCE(d.name, 'Chưa xếp phòng') AS phong,
             count(*) AS can_bo,
             count(*) FILTER (WHERE EXISTS (
               SELECT 1 FROM public.push_subscriptions s WHERE s.profile_id = p.id AND s.is_active
             )) AS bat_push
        FROM public.profiles p
        LEFT JOIN public.departments d ON d.id = p.department_id
       WHERE p.status = 'active'
       GROUP BY 1
    ) x;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'name', j.jobname, 'schedule', j.schedule, 'active', j.active,
           'last_status', r.status, 'last_run', r.start_time)), '[]'::jsonb)
    INTO v_cron
    FROM cron.job j
    LEFT JOIN LATERAL (
      SELECT status, start_time FROM cron.job_run_details d
       WHERE d.jobid = j.jobid ORDER BY start_time DESC LIMIT 1
    ) r ON true
   WHERE j.jobname IN ('ct2-phat-thong-bao-hoan', 'ct2-nhac-nhip-sang', 'ct2-khen-chuoi-moc',
                       'sao-ban-tin-ngay', 'gop-y-ban-tin-sang', 'nhac-lich-nghi');

  RETURN jsonb_build_object(
    'so_ngay', GREATEST(1, LEAST(_so_ngay, 365)),
    'tong', v_tong, 'theo_loai', v_loai, 'theo_ngay', v_ngay, 'theo_phong', v_phong, 'cron', v_cron
  );
END $$;
REVOKE ALL ON FUNCTION public.push_thong_ke(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_thong_ke(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11. Nạp Secret Key vào Vault từ trang quản trị
-- ---------------------------------------------------------------------------
-- Để Giám đốc/quản trị hệ thống dán Secret Key thẳng trên cổng thay vì gửi qua
-- chat hay chạy SQL tay. Chỉ system_admin; không có hàm đọc ngược ra giao diện —
-- trang chỉ biết «đã có / chưa có».
CREATE OR REPLACE FUNCTION public.zalo_dat_bi_mat(_gia_tri text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'system_admin'::app_role) THEN
    RAISE EXCEPTION 'Chỉ quản trị hệ thống được nạp Secret Key';
  END IF;
  IF _gia_tri IS NULL OR length(trim(_gia_tri)) < 8 THEN
    RAISE EXCEPTION 'Secret Key không hợp lệ';
  END IF;
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'zalo_app_secret_key';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(trim(_gia_tri), 'zalo_app_secret_key', 'Secret Key ứng dụng Zalo 298836022005112891');
  ELSE
    PERFORM vault.update_secret(v_id, trim(_gia_tri));
  END IF;
  INSERT INTO public.zalo_nhat_ky (loai, thanh_cong, thong_diep)
  VALUES ('bi_mat', true, 'Quản trị nạp Secret Key mới');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.zalo_dat_bi_mat(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zalo_dat_bi_mat(text) TO authenticated;

-- zalo_tong_quan cần biết đã có Secret Key chưa để trang hướng dẫn đúng bước
CREATE OR REPLACE FUNCTION public.zalo_co_bi_mat()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'zalo_app_secret_key');
$$;
REVOKE ALL ON FUNCTION public.zalo_co_bi_mat() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zalo_co_bi_mat() TO authenticated;

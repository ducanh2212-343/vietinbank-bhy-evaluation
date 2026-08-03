-- ============================================================================
-- NHỊP CHIÊU THỨC 2 CHỈ CHẠY THỨ 2 → THỨ 6
--
-- RÀ SOÁT PHÁT HIỆN: quy tắc «chỉ ngày thường» mới được áp ở đúng HAI chỗ —
-- khung làm tươi tự động (trongKhungNhip) và luật im lặng của thông báo. Mọi
-- đồng hồ còn lại đếm NGÀY LỊCH, và việc chấm giờ nhịp coi thứ Bảy như một ngày
-- làm việc bình thường. Hậu quả cụ thể:
--
--   1. Hồ sơ trình chiều thứ Sáu → sáng thứ Hai đã báo đỏ «chờ 3 ngày», trong
--      khi người duyệt chưa có một buổi làm việc nào để xử lý.
--   2. Sáng thứ Hai mọi thẻ đang làm đều hiện «im lặng 3 ngày» → điểm rủi ro
--      của cả bảng vọt lên chỉ vì hai ngày nghỉ.
--   3. Cán bộ tranh thủ ghi nhịp sáng thứ Bảy bị chấm MAT_NHIP — bị phạt vì đi
--      làm ngày nghỉ.
--   4. Bảng nhịp phòng và ảnh chụp chốt sổ vẫn chạy thứ Bảy/Chủ nhật, nên lịch
--      sử nhịp có hai ngày 0% mỗi tuần, kéo tụt mọi thống kê về sau.
--   5. Thông báo sinh ngoài giờ/ngày nghỉ bị VỨT HẲN chứ không phải hoãn — hồ
--      sơ trình 18h30 thứ Sáu thì người duyệt không bao giờ được báo.
--
-- Cảnh báo sai lặp vài lần là cán bộ thôi tin bảng. Đây là sửa để con số trên
-- bảng đúng với thực tế làm việc của Chi nhánh.
--
-- KHÔNG đổi: số ngày QUÁ HẠN vẫn đếm ngày lịch. Hạn hoàn thành là lời hứa theo
-- ngày trên tờ lịch — trễ hai ngày vắt qua cuối tuần thì với khách hàng và với
-- BGĐ vẫn là trễ hai ngày. Chỉ những đồng hồ đo «người ta đã có bao nhiêu cơ
-- hội xử lý» mới trừ ngày nghỉ.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Một hàm đếm ngày làm việc duy nhất cho cả database
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_ngay_lam_viec(_tu date, _den date)
RETURNS int
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN _tu IS NULL OR _den IS NULL OR _den <= _tu THEN 0
    ELSE (
      SELECT count(*)::int
        FROM generate_series(_tu + 1, LEAST(_den, _tu + 400), interval '1 day') AS g
       WHERE EXTRACT(dow FROM g) NOT IN (0, 6)
    )
  END
$$;

COMMENT ON FUNCTION public.ct2_ngay_lam_viec(date, date) IS
  'Số ngày làm việc (thứ 2→thứ 6) trôi qua từ _tu đến _den, không tính ngày _tu. Chưa trừ ngày lễ — khi Chi nhánh có bảng lịch nghỉ thì sửa đúng hàm này và soNgayLamViec bên client.';

-- Hôm nay (giờ VN) có phải ngày làm việc không
CREATE OR REPLACE FUNCTION public.ct2_la_ngay_lam_viec(_moc timestamptz DEFAULT now())
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXTRACT(dow FROM (_moc AT TIME ZONE 'Asia/Ho_Chi_Minh')) NOT IN (0, 6)
$$;

-- Hai hàm này được gọi TỪ BÊN TRONG các RPC chạy bằng quyền người gọi
-- (ct2_nhip_phong_hom_nay, ct2_cho_toi_duyet đều STABLE, không SECURITY
-- DEFINER), nên authenticated bắt buộc phải có EXECUTE. Chúng chỉ trả về một
-- con số ngày/một cờ đúng-sai, không chạm dữ liệu nào.
REVOKE ALL ON FUNCTION public.ct2_ngay_lam_viec(date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ct2_la_ngay_lam_viec(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_ngay_lam_viec(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_la_ngay_lam_viec(timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Chấm giờ nhịp: thứ Bảy/Chủ nhật KHÔNG chấm
--
-- Ai tranh thủ ghi ngày nghỉ thì vẫn lưu đầy đủ nội dung, chỉ là không bị chấm
-- và không vào mẫu số. Phạt người đi làm ngày nghỉ là cách chắc chắn nhất để
-- lần sau họ không ghi nữa.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_ghi_nhip()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dv record;
  gio_vn time;
  hom_qua text;
BEGIN
  SELECT loai_dau_viec, trang_thai, phong INTO dv
    FROM public.ct2_dau_viec WHERE id = NEW.dau_viec_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đầu việc không tồn tại';
  END IF;

  -- Cờ vàng/đỏ: bắt buộc tách «Đang vướng vì…» và «Hôm nay tôi làm…»
  IF NEW.co_tinh_trang IN ('VANG','DO') THEN
    IF COALESCE(char_length(trim(NEW.vuong_mac)), 0) < 5
       OR COALESCE(char_length(trim(NEW.hanh_dong_hom_nay)), 0) < 5 THEN
      RAISE EXCEPTION 'Cờ vàng/đỏ cần ghi rõ cả hai ô: «Đang vướng vì…» và «Hôm nay tôi làm…»';
    END IF;
  END IF;

  -- Chống "điền cho có": từ chối câu nhịp trùng khớp 100%% với dòng gần nhất
  SELECT n.noi_dung INTO hom_qua
    FROM public.ct2_nhip_pdca n
   WHERE n.dau_viec_id = NEW.dau_viec_id
   ORDER BY n.ghi_luc DESC LIMIT 1;
  IF hom_qua IS NOT NULL AND trim(hom_qua) = trim(NEW.noi_dung) THEN
    RAISE EXCEPTION 'Nội dung giống hệt lần trước — hôm nay có gì khác không?';
  END IF;

  -- Chấm giờ theo giờ Việt Nam, và CHỈ trong ngày làm việc. Ghi thứ Bảy/Chủ
  -- nhật vẫn lưu đủ nội dung nhưng KHONG_TINH — không chấm, không vào mẫu số.
  IF NOT public.ct2_la_ngay_lam_viec(NEW.ghi_luc) THEN
    NEW.dung_nhip := 'KHONG_TINH';
  ELSIF dv.loai_dau_viec = 'TIEN_TRINH' AND dv.trang_thai = 'DANG_LAM' THEN
    gio_vn := (NEW.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;
    IF gio_vn < time '08:00' THEN
      NEW.dung_nhip := 'DUNG_GIO';
    ELSIF gio_vn < time '08:30' THEN
      -- Khung 8h00–8h30 là khung của lãnh đạo Phòng: lãnh đạo ghi vẫn ĐÚNG GIỜ,
      -- cán bộ ghi tính là MUỘN (ân hạn, không phải mất nhịp)
      NEW.dung_nhip := CASE WHEN public.ct2_la_lanh_dao_phong(dv.phong)
                            THEN 'DUNG_GIO' ELSE 'MUON' END;
    ELSE
      NEW.dung_nhip := 'MAT_NHIP';
    END IF;
  ELSE
    NEW.dung_nhip := 'KHONG_TINH';
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.f_ct2_truoc_ghi_nhip() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Bảng nhịp phòng: ngày nghỉ thì không đòi ai ghi gì
--
-- Trước đây thứ Bảy mở bảng ra là cả phòng xám ngắt «chưa ghi nhịp» — bảng nói
-- sai về chính nó. Nay trả về NGAY_NGHI để giao diện hiện một dòng bình thản.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ct2_nhip_phong_hom_nay(uuid);

CREATE OR REPLACE FUNCTION public.ct2_nhip_phong_hom_nay(_phong uuid)
RETURNS TABLE (
  profile_id uuid, full_name text, avatar_url text,
  so_viec_dang_chay bigint, so_viec_da_ghi bigint,
  so_the_do bigint, so_qua_han bigint, ket_qua text
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH viec AS (
    SELECT d.id, d.nguoi_chiu_trach_nhiem, d.co_tinh_trang, d.han_hoan_thanh
      FROM public.ct2_dau_viec d
     WHERE d.phong = _phong
       AND d.loai_dau_viec = 'TIEN_TRINH'
       AND d.trang_thai = 'DANG_LAM'
  ), nhip AS (
    SELECT n.dau_viec_id,
           min(CASE n.dung_nhip WHEN 'DUNG_GIO' THEN 0 WHEN 'MUON' THEN 1 ELSE 2 END) AS tot_nhat
      FROM public.ct2_nhip_pdca n
     WHERE n.dau_viec_id IN (SELECT id FROM viec)
       AND (n.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
     GROUP BY n.dau_viec_id
  )
  SELECT p.id, p.full_name, p.avatar_url,
         count(v.id) AS so_viec_dang_chay,
         count(nh.dau_viec_id) AS so_viec_da_ghi,
         count(*) FILTER (WHERE v.co_tinh_trang = 'DO') AS so_the_do,
         count(*) FILTER (
           WHERE v.han_hoan_thanh < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
         ) AS so_qua_han,
         CASE
           -- Ngày nghỉ đứng trước mọi nhánh khác: không đòi nhịp thì cũng không
           -- được kết luận ai «chưa ghi»
           WHEN NOT public.ct2_la_ngay_lam_viec() THEN 'NGAY_NGHI'
           WHEN count(v.id) = 0 THEN 'KHONG_CO_VIEC'
           WHEN count(nh.dau_viec_id) = count(v.id) AND max(COALESCE(nh.tot_nhat, 2)) = 0 THEN 'DUNG_GIO'
           WHEN count(nh.dau_viec_id) = count(v.id) THEN 'MUON'
           WHEN count(nh.dau_viec_id) > 0 THEN 'CHUA_DU'
           ELSE 'CHUA_GHI'
         END AS ket_qua
    FROM viec v
    JOIN public.profiles p ON p.id = v.nguoi_chiu_trach_nhiem
    LEFT JOIN nhip nh ON nh.dau_viec_id = v.id
   GROUP BY p.id, p.full_name, p.avatar_url
   ORDER BY p.full_name
$$;

REVOKE ALL ON FUNCTION public.ct2_nhip_phong_hom_nay(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_nhip_phong_hom_nay(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Chốt sổ nhịp: ngày nghỉ thì không chụp ảnh
--
-- Nếu vẫn chụp, lịch sử nhịp có hai ngày 0% mỗi tuần và mọi thống kê tỷ lệ về
-- sau đều bị kéo tụt bởi hai ngày không ai phải làm việc.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_chot_so_nhip(_ngay date DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE so_dong int;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (
    public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Chỉ TCTH/quản trị hệ thống được chốt sổ nhịp';
  END IF;

  -- Thứ Bảy/Chủ nhật không có nhịp để chốt
  IF EXTRACT(dow FROM _ngay) IN (0, 6) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.ct2_anh_chup_nhip
    (ngay, nguoi, phong, so_viec_phai_ghi, so_viec_da_ghi_truoc_8h, so_viec_ghi_8h_8h30, ket_qua)
  SELECT _ngay, d.nguoi_chiu_trach_nhiem, d.phong,
         count(*) AS phai_ghi,
         count(*) FILTER (WHERE n.dung_nhip = 'DUNG_GIO') AS truoc_8h,
         count(*) FILTER (WHERE n.dung_nhip = 'MUON') AS muon,
         CASE
           WHEN count(*) = count(*) FILTER (WHERE n.dung_nhip = 'DUNG_GIO') THEN 'DUNG_GIO'
           WHEN count(*) = count(*) FILTER (WHERE n.dung_nhip IN ('DUNG_GIO','MUON')) THEN 'MUON'
           ELSE 'MAT_NHIP'
         END
    FROM public.ct2_dau_viec d
    LEFT JOIN LATERAL (
      SELECT nn.dung_nhip FROM public.ct2_nhip_pdca nn
       WHERE nn.dau_viec_id = d.id
         AND (nn.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = _ngay
       ORDER BY CASE nn.dung_nhip WHEN 'DUNG_GIO' THEN 0 WHEN 'MUON' THEN 1 ELSE 2 END
       LIMIT 1
    ) n ON true
   WHERE d.loai_dau_viec = 'TIEN_TRINH' AND d.trang_thai = 'DANG_LAM'
   GROUP BY d.nguoi_chiu_trach_nhiem, d.phong
  ON CONFLICT (ngay, nguoi) DO UPDATE
    SET so_viec_phai_ghi = EXCLUDED.so_viec_phai_ghi,
        so_viec_da_ghi_truoc_8h = EXCLUDED.so_viec_da_ghi_truoc_8h,
        so_viec_ghi_8h_8h30 = EXCLUDED.so_viec_ghi_8h_8h30,
        ket_qua = EXCLUDED.ket_qua;
  GET DIAGNOSTICS so_dong = ROW_COUNT;
  RETURN so_dong;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Việc đang chờ chính BGĐ: tuổi chờ tính bằng NGÀY LÀM VIỆC
--
-- Đây là màn lãnh đạo tự soi mình. Nếu đồng hồ đếm cả cuối tuần thì sáng thứ
-- Hai màn nào cũng đỏ, và cái đỏ đó mất hết ý nghĩa.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_cho_toi_duyet()
RETURNS TABLE (
  loai text, id uuid, ma text, tieu_de text, phong uuid,
  nguoi_gui text, so_tien numeric, tuoi_cho int, ngay_giu timestamptz
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT 'DAU_VIEC'::text, d.id, d.ma_hien_thi, d.tieu_de, d.phong,
         p.full_name, NULL::numeric,
         public.ct2_ngay_lam_viec((d.giu_tu AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
                                  (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
         d.giu_tu
    FROM public.ct2_dau_viec d
    JOIN public.profiles p ON p.id = d.nguoi_chiu_trach_nhiem
   WHERE d.nguoi_dang_giu = public.get_my_profile_id()
     AND d.trang_thai IN ('CHO_DUYET','CHO_PHOI_HOP')

  UNION ALL

  SELECT 'HO_SO_TIN_DUNG'::text, h.id, h.ma_hs, h.khach_hang, h.phong,
         p.full_name, h.so_tien,
         public.ct2_ngay_lam_viec((h.giu_tu AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
                                  (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
         h.giu_tu
    FROM public.ct2_ho_so_tin_dung h
    JOIN public.profiles p ON p.id = h.can_bo
   WHERE h.trang_thai IN ('TRINH_LDP','TRINH_LDCN')
     AND (
       h.nguoi_dang_giu = public.get_my_profile_id()
       OR (h.trang_thai = 'TRINH_LDCN'
           AND h.phong = ANY(public.get_my_pgd_scope_dept_ids()))
     )

   ORDER BY 8 DESC NULLS LAST
$$;

REVOKE ALL ON FUNCTION public.ct2_cho_toi_duyet() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_cho_toi_duyet() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Thông báo ngoài giờ: HOÃN chứ không VỨT
--
-- Luật cũ trả false và không ghi gì — hồ sơ trình 18h30 thứ Sáu thì người duyệt
-- không bao giờ biết. Nay mỗi thông báo mang theo mốc phát: sinh trong giờ làm
-- việc thì phát ngay, ngoài giờ thì xếp hàng đến 7h00 buổi sáng làm việc kế
-- tiếp. Không tin nào bị mất, và không tin nào rơi vào bữa cơm tối hay ngày nghỉ.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ct2_thong_bao
  ADD COLUMN IF NOT EXISTS phat_luc timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.ct2_thong_bao.phat_luc IS
  'Sớm nhất được phép đẩy đi. Trong giờ làm việc = lúc sinh; ngoài giờ/ngày nghỉ = 7h00 buổi sáng làm việc kế tiếp. Chuông trong ứng dụng KHÔNG chờ mốc này — mở ứng dụng lúc nào cũng đọc được hết.';

DROP INDEX IF EXISTS public.idx_ct2_tb_chua_gui;
CREATE INDEX IF NOT EXISTS idx_ct2_tb_cho_phat
  ON public.ct2_thong_bao(phat_luc)
  WHERE gui_luc IS NULL;

-- Mốc phát sớm nhất: giờ hành chính ngày thường, nếu không thì 7h00 hôm sau
CREATE OR REPLACE FUNCTION public.ct2_moc_phat_gan_nhat(_moc timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  vn timestamp := _moc AT TIME ZONE 'Asia/Ho_Chi_Minh';
  ngay date := vn::date;
  gio time := vn::time;
BEGIN
  -- Trong khung làm việc thứ 2–6, 07:00–18:00 → phát ngay
  IF EXTRACT(dow FROM ngay) NOT IN (0, 6) AND gio >= time '07:00' AND gio <= time '18:00' THEN
    RETURN _moc;
  END IF;

  -- Trước 7h sáng ngày thường → chờ đến 7h chính ngày đó
  IF EXTRACT(dow FROM ngay) NOT IN (0, 6) AND gio < time '07:00' THEN
    RETURN (ngay + time '07:00') AT TIME ZONE 'Asia/Ho_Chi_Minh';
  END IF;

  -- Còn lại (sau 18h, hoặc ngày nghỉ) → 7h00 ngày làm việc kế tiếp
  LOOP
    ngay := ngay + 1;
    EXIT WHEN EXTRACT(dow FROM ngay) NOT IN (0, 6);
  END LOOP;
  RETURN (ngay + time '07:00') AT TIME ZONE 'Asia/Ho_Chi_Minh';
END $$;

REVOKE ALL ON FUNCTION public.ct2_moc_phat_gan_nhat(timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ct2_dat_thong_bao(
  _ma_su_kien text,
  _nguoi_nhan uuid,
  _tieu_de text,
  _noi_dung text,
  _muc text DEFAULT 'NHE',
  _dau_viec_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2n$
DECLARE
  moc_phat timestamptz;
  da_gui int;
BEGIN
  IF _nguoi_nhan IS NULL THEN RETURN false; END IF;
  -- Không tự nhắc chính mình về việc mình vừa làm
  IF _nguoi_nhan = public.get_my_profile_id() THEN RETURN false; END IF;

  -- Mức chặn được phát ngay kể cả ngoài giờ; còn lại xếp hàng đến buổi làm việc
  -- kế tiếp thay vì bị vứt đi như luật cũ.
  moc_phat := CASE WHEN _muc = 'CHAN' THEN now() ELSE public.ct2_moc_phat_gan_nhat() END;

  -- Trần 3 thông báo/người/NGÀY PHÁT cho nhóm nhắc nhẹ. Đếm theo ngày phát chứ
  -- không theo ngày sinh: nếu không, mười tin dồn tối thứ Sáu sẽ cùng đổ vào
  -- sáng thứ Hai. @nhắc tên (N12) và mức đỏ/chặn không tính vào trần.
  IF _muc = 'NHE' AND _ma_su_kien <> 'N12' THEN
    SELECT count(*) INTO da_gui FROM public.ct2_thong_bao t
     WHERE t.nguoi_nhan = _nguoi_nhan
       AND t.muc = 'NHE'
       AND (t.phat_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (moc_phat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
    IF da_gui >= 3 THEN RETURN false; END IF;
  END IF;

  INSERT INTO public.ct2_thong_bao
    (ma_su_kien, nguoi_nhan, dau_viec_id, tieu_de, noi_dung, muc, kenh, phat_luc)
  VALUES (_ma_su_kien, _nguoi_nhan, _dau_viec_id, _tieu_de, _noi_dung, _muc,
          CASE WHEN _muc IN ('DO','CHAN') THEN ARRAY['push','bell','email']
               ELSE ARRAY['push','bell'] END,
          moc_phat);

  -- Chỉ báo cho lớp gọi biết có cần đá edge function ngay không. Tin đã hoãn
  -- thì để cron buổi sáng lo, không gọi push lúc nửa đêm.
  RETURN moc_phat <= now();
END $ct2n$;

REVOKE ALL ON FUNCTION public.ct2_dat_thong_bao(text, uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ct2_dat_thong_bao(text, uuid, text, text, text, uuid) IS
  'Cửa duy nhất để sinh thông báo Chiêu thức 2/PDTD. Áp: không tự nhắc mình · hoãn ra ngoài giờ và ngày nghỉ (trừ mức CHAN) · trần 3 tin nhắc nhẹ/người/ngày phát. Trả true khi tin cần phát ngay.';

-- ---------------------------------------------------------------------------
-- 7) Cron 7h00 sáng thứ 2–6 để phát nốt các tin đã hoãn
--
-- Trigger nghiệp vụ chỉ đá edge function khi có tin phát ngay. Tin hoãn qua đêm
-- hay qua cuối tuần cần một nhịp đánh thức — nếu không nó nằm mãi trong hàng
-- đợi và người nhận chỉ thấy khi tự mở chuông.
-- ---------------------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('ct2-phat-thong-bao-hoan')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ct2-phat-thong-bao-hoan');
    -- 00:00 UTC = 07:00 giờ VN, thứ 2 → thứ 6
    PERFORM cron.schedule('ct2-phat-thong-bao-hoan', '0 0 * * 1-5', $job$
      select net.http_post(
        url := 'https://whlysprzsguehxmrjwha.supabase.co/functions/v1/notify-ct2',
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

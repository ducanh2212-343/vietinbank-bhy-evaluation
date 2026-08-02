-- ============================================================================
-- CÀI ĐẶT MỐC GIỜ NHỊP + BẢNG TỔNG HỢP NHỊP TUẦN/THÁNG
--
-- HAI VIỆC, MỘT GỐC. Chi nhánh muốn có bảng «tuần này ai không nhập đúng nhịp»,
-- nhưng «đúng nhịp» đang là con số CHÔN CỨNG trong mã nguồn: trước 08:00 là
-- đúng giờ, đến 08:30 là muộn, sau đó mất nhịp. Muốn đổi giờ giao ban thì phải
-- sửa mã và triển khai lại — TCTH không tự làm được. Nên trước khi dựng bảng
-- tổng hợp, phải đưa mốc giờ ra thành cấu hình.
--
-- PHÁT HIỆN KHI RÀ SOÁT: bảng ct2_anh_chup_nhip (ảnh chụp nhịp mỗi ngày) đã có
-- từ đợt đầu nhưng TÁC VỤ CHỐT SỔ CHƯA BAO GIỜ ĐƯỢC LÊN LỊCH — bảng rỗng. Báo
-- cáo tuần/tháng đọc từ đó nên nếu không lên lịch thì bảng nào cũng trắng. Đã
-- thêm cron trong migration này.
--
-- VÌ SAO BÁO CÁO ĐỌC ẢNH CHỤP CHỨ KHÔNG TÍNH LẠI: để biết thứ Ba tuần trước ai
-- «phải ghi mấy việc» thì cần biết hôm đó ai đang giữ bao nhiêu thẻ DANG_LAM.
-- Trạng thái thẻ hôm nay không nói được điều đó. Ảnh chụp là cách duy nhất để
-- con số của quá khứ không đổi mỗi lần ai đó kéo một thẻ.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Một dòng cấu hình cho cả Chi nhánh
--
-- Một dòng chứ không phải bảng khóa–giá trị: mỗi mốc có kiểu riêng (time, int)
-- nên cột có kiểu đúng thì database tự chặn dữ liệu sai, không phải ép kiểu ở
-- mọi nơi đọc.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct2_cau_hinh_thoi_gian (
  -- Khóa chính hằng số: bảng này chỉ được phép có đúng MỘT dòng
  id boolean PRIMARY KEY DEFAULT true CHECK (id),

  -- Chấm giờ nhịp sáng
  gio_dung_gio time NOT NULL DEFAULT '08:00',
  gio_an_han   time NOT NULL DEFAULT '08:30',

  -- Khung «bảng sống»: ngoài khung này giao diện thôi tự làm mới
  gio_mo_nhip   time NOT NULL DEFAULT '06:45',
  gio_dong_nhip time NOT NULL DEFAULT '08:45',

  -- Khung được phép phát thông báo; ngoài khung thì hoãn tới buổi làm việc sau
  gio_yen_tinh_tu  time NOT NULL DEFAULT '07:00',
  gio_yen_tinh_den time NOT NULL DEFAULT '18:00',

  -- Ngưỡng cảnh báo, tính bằng NGÀY LÀM VIỆC
  nguong_tuoi_cho      int NOT NULL DEFAULT 3 CHECK (nguong_tuoi_cho BETWEEN 1 AND 30),
  nguong_im_lang_ho_so int NOT NULL DEFAULT 2 CHECK (nguong_im_lang_ho_so BETWEEN 1 AND 30),

  -- Trần thông báo nhắc nhẹ mỗi người mỗi ngày
  tran_thong_bao int NOT NULL DEFAULT 3 CHECK (tran_thong_bao BETWEEN 1 AND 20),

  nguoi_sua uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ct2_ch_gio_hop_le CHECK (gio_dung_gio < gio_an_han),
  CONSTRAINT ct2_ch_khung_nhip_hop_le CHECK (gio_mo_nhip < gio_dong_nhip),
  CONSTRAINT ct2_ch_khung_yen_tinh_hop_le CHECK (gio_yen_tinh_tu < gio_yen_tinh_den)
);

COMMENT ON TABLE public.ct2_cau_hinh_thoi_gian IS
  'Đúng MỘT dòng. Mọi mốc giờ và ngưỡng của nhịp Chiêu thức 2 đọc từ đây, thay vì chôn cứng trong mã nguồn — TCTH đổi giờ giao ban không phải chờ triển khai lại.';

INSERT INTO public.ct2_cau_hinh_thoi_gian (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ct2_cau_hinh_thoi_gian ENABLE ROW LEVEL SECURITY;

-- Cả Chi nhánh đọc được: giao diện cần biết mốc giờ để hiện đúng và để tự làm
-- mới đúng khung. Đây là quy ước chung, không phải dữ liệu nhạy cảm.
DROP POLICY IF EXISTS "ct2 doc cau hinh gio" ON public.ct2_cau_hinh_thoi_gian;
CREATE POLICY "ct2 doc cau hinh gio" ON public.ct2_cau_hinh_thoi_gian FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "ct2 sua cau hinh gio" ON public.ct2_cau_hinh_thoi_gian;
CREATE POLICY "ct2 sua cau hinh gio" ON public.ct2_cau_hinh_thoi_gian FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  );

-- Không có policy INSERT/DELETE: bảng phải luôn có đúng một dòng, không ai được
-- xóa mất mốc giờ của cả Chi nhánh.

CREATE OR REPLACE FUNCTION public.f_ct2_cau_hinh_da_sua()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.nguoi_sua := COALESCE(public.get_my_profile_id(), OLD.nguoi_sua);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.f_ct2_cau_hinh_da_sua() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ct2_cau_hinh_da_sua ON public.ct2_cau_hinh_thoi_gian;
CREATE TRIGGER trg_ct2_cau_hinh_da_sua
  BEFORE UPDATE ON public.ct2_cau_hinh_thoi_gian
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_cau_hinh_da_sua();

/**
 * Đọc cấu hình cho các hàm nội bộ. Luôn trả về một dòng: nếu ai đó lỡ xóa mất
 * thì rơi về mặc định thay vì làm hỏng việc ghi nhịp của cả Chi nhánh.
 */
CREATE OR REPLACE FUNCTION public.ct2_cau_hinh()
RETURNS public.ct2_cau_hinh_thoi_gian
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT c FROM public.ct2_cau_hinh_thoi_gian c LIMIT 1),
    ROW(true, '08:00', '08:30', '06:45', '08:45', '07:00', '18:00', 3, 2, 3, NULL, now())::public.ct2_cau_hinh_thoi_gian
  )
$$;

REVOKE ALL ON FUNCTION public.ct2_cau_hinh() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_cau_hinh() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Chấm giờ nhịp theo cấu hình, không còn chôn cứng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_ghi_nhip()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dv record;
  ch public.ct2_cau_hinh_thoi_gian;
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

  ch := public.ct2_cau_hinh();

  -- Chấm giờ theo giờ Việt Nam, và CHỈ trong ngày làm việc
  IF NOT public.ct2_la_ngay_lam_viec(NEW.ghi_luc) THEN
    NEW.dung_nhip := 'KHONG_TINH';
  ELSIF dv.loai_dau_viec = 'TIEN_TRINH' AND dv.trang_thai = 'DANG_LAM' THEN
    gio_vn := (NEW.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;
    IF gio_vn < ch.gio_dung_gio THEN
      NEW.dung_nhip := 'DUNG_GIO';
    ELSIF gio_vn < ch.gio_an_han THEN
      -- Khung ân hạn là khung của lãnh đạo Phòng: lãnh đạo ghi vẫn ĐÚNG GIỜ,
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
-- 3) Khung yên tĩnh và trần thông báo cũng theo cấu hình
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_moc_phat_gan_nhat(_moc timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  ch public.ct2_cau_hinh_thoi_gian := public.ct2_cau_hinh();
  vn timestamp := _moc AT TIME ZONE 'Asia/Ho_Chi_Minh';
  ngay date := vn::date;
  gio time := vn::time;
  vong int := 0;
BEGIN
  IF public.ct2_la_ngay_lam_viec(_moc)
     AND gio >= ch.gio_yen_tinh_tu AND gio <= ch.gio_yen_tinh_den THEN
    RETURN _moc;
  END IF;

  IF public.ct2_la_ngay_lam_viec(_moc) AND gio < ch.gio_yen_tinh_tu THEN
    RETURN (ngay + ch.gio_yen_tinh_tu) AT TIME ZONE 'Asia/Ho_Chi_Minh';
  END IF;

  -- Nhảy tới đầu khung của ngày làm việc kế tiếp. Chặn vòng lặp ở 30 ngày
  -- phòng khi ai đó nhập nhầm cả tháng thành ngày nghỉ.
  LOOP
    ngay := ngay + 1;
    vong := vong + 1;
    EXIT WHEN vong >= 30
      OR public.ct2_la_ngay_lam_viec((ngay + ch.gio_yen_tinh_tu) AT TIME ZONE 'Asia/Ho_Chi_Minh');
  END LOOP;
  RETURN (ngay + ch.gio_yen_tinh_tu) AT TIME ZONE 'Asia/Ho_Chi_Minh';
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
  tran int := (public.ct2_cau_hinh()).tran_thong_bao;
  da_gui int;
BEGIN
  IF _nguoi_nhan IS NULL THEN RETURN false; END IF;
  IF _nguoi_nhan = public.get_my_profile_id() THEN RETURN false; END IF;

  moc_phat := CASE WHEN _muc = 'CHAN' THEN now() ELSE public.ct2_moc_phat_gan_nhat() END;

  IF _muc = 'NHE' AND _ma_su_kien <> 'N12' THEN
    SELECT count(*) INTO da_gui FROM public.ct2_thong_bao t
     WHERE t.nguoi_nhan = _nguoi_nhan
       AND t.muc = 'NHE'
       AND (t.phat_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (moc_phat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
    IF da_gui >= tran THEN RETURN false; END IF;
  END IF;

  INSERT INTO public.ct2_thong_bao
    (ma_su_kien, nguoi_nhan, dau_viec_id, tieu_de, noi_dung, muc, kenh, phat_luc)
  VALUES (_ma_su_kien, _nguoi_nhan, _dau_viec_id, _tieu_de, _noi_dung, _muc,
          CASE WHEN _muc IN ('DO','CHAN') THEN ARRAY['push','bell','email']
               ELSE ARRAY['push','bell'] END,
          moc_phat);

  RETURN moc_phat <= now();
END $ct2n$;

REVOKE ALL ON FUNCTION public.ct2_dat_thong_bao(text, uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_dat_thong_bao(text, uuid, text, text, text, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Bảng tổng hợp nhịp cho một kỳ (tuần / tháng / khoảng bất kỳ)
--
-- Mẫu số là SỐ NGÀY LÀM VIỆC người đó THỰC SỰ có việc phải ghi, không phải số
-- ngày trong kỳ. Ai nghỉ phép cả tuần hoặc không có việc nào đang chạy thì
-- không bị tính là mất nhịp — tỷ lệ mà phạt oan thì không ai tin bảng nữa.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_bang_nhip_ky(
  _tu date,
  _den date,
  _phong uuid DEFAULT NULL
)
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  phong uuid,
  ten_phong text,
  so_ngay_can_ghi bigint,
  so_ngay_dung_gio bigint,
  so_ngay_muon bigint,
  so_ngay_mat_nhip bigint,
  tong_viec_phai_ghi bigint,
  ti_le int
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT p.id, p.full_name, a.phong, d.name,
         count(*) AS so_ngay_can_ghi,
         count(*) FILTER (WHERE a.ket_qua = 'DUNG_GIO') AS so_ngay_dung_gio,
         count(*) FILTER (WHERE a.ket_qua = 'MUON') AS so_ngay_muon,
         count(*) FILTER (WHERE a.ket_qua NOT IN ('DUNG_GIO','MUON')) AS so_ngay_mat_nhip,
         COALESCE(sum(a.so_viec_phai_ghi), 0) AS tong_viec_phai_ghi,
         CASE WHEN count(*) = 0 THEN 100
              ELSE round(100.0 * count(*) FILTER (WHERE a.ket_qua IN ('DUNG_GIO','MUON')) / count(*))::int
         END AS ti_le
    FROM public.ct2_anh_chup_nhip a
    JOIN public.profiles p ON p.id = a.nguoi
    JOIN public.departments d ON d.id = a.phong
   WHERE a.ngay BETWEEN _tu AND _den
     AND a.so_viec_phai_ghi > 0
     AND (_phong IS NULL OR a.phong = _phong)
     -- Hàng rào thật: chỉ thấy phòng mình được phép xem
     AND public.ct2_xem_duoc_dau_viec(a.phong, '{}')
   GROUP BY p.id, p.full_name, a.phong, d.name
   -- Tỷ lệ thấp nhất lên đầu: đây là bảng để NHÌN AI CẦN NHẮC, không phải bảng vinh danh
   ORDER BY 10 ASC, 4, 2
$$;

REVOKE ALL ON FUNCTION public.ct2_bang_nhip_ky(date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_bang_nhip_ky(date, date, uuid) TO authenticated;

COMMENT ON FUNCTION public.ct2_bang_nhip_ky(date, date, uuid) IS
  'Bảng nhịp một kỳ, đọc từ ảnh chụp ct2_anh_chup_nhip. Mẫu số là số ngày người đó THỰC SỰ có việc phải ghi, nên người không có việc đang chạy không bị tính là mất nhịp.';

-- ---------------------------------------------------------------------------
-- 5) Lên lịch CHỐT SỔ NHỊP — thiếu cái này thì mọi bảng tổng hợp đều trắng
--
-- Chạy 09:00 giờ VN các ngày thường, tức sau khung ân hạn mặc định (08:30) và
-- trước khi thẻ bị kéo qua lại trong ngày. Nếu TCTH dời gio_an_han muộn hơn
-- 09:00 thì phải dời cả cron này — đã ghi cảnh báo trên màn cài đặt.
-- ---------------------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('ct2-chot-so-nhip')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ct2-chot-so-nhip');
    -- 02:00 UTC = 09:00 giờ VN, thứ 2 → thứ 6
    PERFORM cron.schedule('ct2-chot-so-nhip', '0 2 * * 1-5',
      $job$ SELECT public.ct2_chot_so_nhip(); $job$);
  END IF;
END $cron$;

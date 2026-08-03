-- ============================================================================
-- CHIÊU THỨC 2 — PDTD: nhận được dữ liệu LỊCH SỬ còn thiếu, không nới cổng nhập
--
-- BỐI CẢNH. Board Miro PDTD của Phòng KHDN có 47 hồ sơ thật. Đọc kỹ thì:
--   · 31/47 hồ sơ KHÔNG có số tiền ở bất kỳ trường nào
--   · 31/47 hồ sơ KHÔNG có ngày nào (kể cả hồ sơ 290 tỷ và 250 tỷ đang chạy)
--   · 3/4 hồ sơ trong cột "Đến hạn GHTD 2 tháng tới" không có ngày đến hạn
--
-- Bảng ct2_ho_so_tin_dung đang bắt buộc `so_tien`, `han_xu_ly`, `ngay_nhan`.
-- Đó là quyết định ĐÚNG cho hồ sơ mở mới — không có hạn thì không biết đúng
-- hẹn hay không, mà đó là toàn bộ lý do tồn tại của bàn Kanban.
--
-- Nhưng nó chặn việc đưa 47 hồ sơ đang chạy thật vào hệ thống. Chỉ còn hai lối:
--
--   (a) BỊA số liệu để lấp chỗ trống — điền số tiền 1 triệu, hạn xử lý = hôm
--       nay. Trong hệ thống tín dụng, một con số bịa trông y hệt một con số
--       thật. Người đọc báo cáo không có cách nào phân biệt. Tổng dư nợ đang
--       trình sẽ sai và không ai biết là nó sai.
--
--   (b) NHẬN Ô TRỐNG và hiện nó ra như một cảnh báo.
--
-- Chọn (b). Ô trống nói thật: "hồ sơ này thiếu số tiền" là một sự thật về
-- board Miro, và là việc cần ai đó đi bổ sung.
--
-- CỔNG NHẬP KHÔNG NỚI. Trước đây hàng rào nằm ở NOT NULL — nó chặn cả người
-- nhập tay lẫn tiến trình nhập liệu lịch sử. Nay chuyển hàng rào sang đúng
-- cửa: trigger BEFORE INSERT bắt buộc đủ trường CHỈ KHI có người thật đang
-- thao tác (auth.uid() IS NOT NULL). Nhập lịch sử chạy bằng service role,
-- không có auth.uid(), nên đi qua được — và mỗi ô trống nó để lại đều hiện
-- thành cảnh báo vàng trên thẻ.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Cho phép ô trống ở ba trường mà dữ liệu lịch sử thật sự không có
-- ---------------------------------------------------------------------------
-- ky_han cũng vào đây: board Miro KHÔNG có trường kỳ hạn nào. Cột đang có
-- DEFAULT 'NGAN_HAN' — nếu cứ để mặc định thì 47 thẻ đều hiện «Ngắn hạn» như
-- một sự thật, trong khi thật ra là chưa ai khai. Ô trống nói đúng hơn.
ALTER TABLE public.ct2_ho_so_tin_dung
  ALTER COLUMN so_tien   DROP NOT NULL,
  ALTER COLUMN han_xu_ly DROP NOT NULL,
  ALTER COLUMN ngay_nhan DROP NOT NULL,
  ALTER COLUMN ky_han    DROP NOT NULL,
  ALTER COLUMN ky_han    DROP DEFAULT;

-- CHECK cũ: so_tien > 0. NULL vẫn cho qua CHECK trong Postgres, nhưng viết
-- tường minh để người đọc sau không tưởng là sơ suất.
ALTER TABLE public.ct2_ho_so_tin_dung
  DROP CONSTRAINT IF EXISTS ct2_ho_so_tin_dung_so_tien_check;
ALTER TABLE public.ct2_ho_so_tin_dung
  ADD CONSTRAINT ct2_ho_so_tin_dung_so_tien_check
  CHECK (so_tien IS NULL OR so_tien > 0);

-- Hạn phải sau ngày nhận — nhưng chỉ kiểm được khi có CẢ HAI ngày
ALTER TABLE public.ct2_ho_so_tin_dung
  DROP CONSTRAINT IF EXISTS ct2_hs_han_hop_le;
ALTER TABLE public.ct2_ho_so_tin_dung
  ADD CONSTRAINT ct2_hs_han_hop_le
  CHECK (han_xu_ly IS NULL OR ngay_nhan IS NULL OR han_xu_ly >= ngay_nhan);

-- ---------------------------------------------------------------------------
-- 2) Hàng rào chuyển sang cửa người dùng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_hs_truoc_tao()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2hi$
DECLARE ma_phong text;
BEGIN
  -- Không có người thật đang thao tác = nhập liệu lịch sử bằng service role.
  -- Cho ô trống đi qua; giao diện sẽ hiện mỗi ô trống thành cảnh báo.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NOT public.ct2_phong_co_pdtd(NEW.phong) THEN
    RAISE EXCEPTION 'Phòng này chưa bật bàn Phê duyệt tín dụng. Liên hệ Phòng TCTH để bật.';
  END IF;
  -- Cán bộ tín dụng tự mở hồ sơ của mình; lãnh đạo mở cho cả phòng
  IF NOT public.ct2_sua_duoc_phong(NEW.phong)
     AND NOT (NEW.can_bo = public.get_my_profile_id()
              AND NEW.phong = public.get_my_department_id()) THEN
    RAISE EXCEPTION 'Anh/chị chỉ mở được hồ sơ do chính mình phụ trách, trong phòng mình';
  END IF;

  -- HÀNG RÀO THẬT của cổng nhập tay. Trước đây do NOT NULL giữ; nay đặt ở đây
  -- để nó chỉ áp cho hồ sơ mở mới, không áp cho dữ liệu lịch sử.
  IF NEW.so_tien IS NULL THEN
    RAISE EXCEPTION 'Hồ sơ mở mới phải có số tiền (đơn vị triệu đồng)';
  END IF;
  IF NEW.han_xu_ly IS NULL THEN
    RAISE EXCEPTION 'Hồ sơ mở mới phải có hạn xử lý — không có hạn thì không đo được đúng hẹn';
  END IF;
  IF NEW.ky_han IS NULL THEN
    RAISE EXCEPTION 'Hồ sơ mở mới phải chọn kỳ hạn (ngắn hạn / trung dài hạn)';
  END IF;
  NEW.ngay_nhan := COALESCE(NEW.ngay_nhan, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);

  IF NEW.ma_hs IS NULL THEN
    SELECT d.code INTO ma_phong FROM public.departments d WHERE d.id = NEW.phong;
    NEW.ma_hs := COALESCE(ma_phong, 'CN') || '-TD-'
      || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-'
      || lpad(nextval('public.ct2_ma_hs_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END $ct2hi$;

REVOKE ALL ON FUNCTION public.f_ct2_hs_truoc_tao() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Người thật không được XOÁ số tiền / hạn xử lý đã có
--
-- Nhận ô trống lúc nhập lịch sử là một chuyện; để ai đó xoá trắng một con số
-- đã có lại là chuyện khác. Bổ sung được, gỡ bỏ thì không.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_hs_khong_xoa_so_lieu()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $ct2hx$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF OLD.so_tien IS NOT NULL AND NEW.so_tien IS NULL THEN
    RAISE EXCEPTION 'Không xoá trắng số tiền của hồ sơ đã có số — sửa thành số khác thì được';
  END IF;
  IF OLD.han_xu_ly IS NOT NULL AND NEW.han_xu_ly IS NULL THEN
    RAISE EXCEPTION 'Không xoá trắng hạn xử lý của hồ sơ đã có hạn — dời hạn thì được';
  END IF;
  RETURN NEW;
END $ct2hx$;

DROP TRIGGER IF EXISTS trg_ct2_hs_khong_xoa_so_lieu ON public.ct2_ho_so_tin_dung;
CREATE TRIGGER trg_ct2_hs_khong_xoa_so_lieu
  BEFORE UPDATE ON public.ct2_ho_so_tin_dung
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_hs_khong_xoa_so_lieu();

REVOKE ALL ON FUNCTION public.f_ct2_hs_khong_xoa_so_lieu() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Đếm hồ sơ còn thiếu dữ liệu — để lãnh đạo biết còn bao nhiêu phải bổ sung
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_pdtd_thieu_du_lieu(_phong uuid)
RETURNS TABLE (
  tong bigint, thieu_so_tien bigint, thieu_han_xu_ly bigint,
  thieu_den_han_ghtd bigint, chua_ghi_nhip bigint
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT count(*) AS tong,
         count(*) FILTER (WHERE h.so_tien IS NULL)   AS thieu_so_tien,
         count(*) FILTER (WHERE h.han_xu_ly IS NULL) AS thieu_han_xu_ly,
         count(*) FILTER (
           WHERE h.ngay_den_han_ghtd IS NULL
             AND h.loai_ho_so IN ('TAI_CAP','DIEU_CHINH')
         ) AS thieu_den_han_ghtd,
         count(*) FILTER (WHERE h.nhip_gan_nhat IS NULL) AS chua_ghi_nhip
    FROM public.ct2_ho_so_tin_dung h
   WHERE h.phong = _phong
     AND h.trang_thai NOT IN ('HOAN_THANH','TU_CHOI')
$$;

REVOKE ALL ON FUNCTION public.ct2_pdtd_thieu_du_lieu(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_pdtd_thieu_du_lieu(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) LỖI PHÁT HIỆN KHI NHẬP LIỆU: thông báo NULL làm hỏng cả lệnh ghi hồ sơ
--
-- `f_ct2_thong_bao_ho_so` dựng nội dung tin bằng phép nối chuỗi có `so_tien`.
-- Trong Postgres, nối chuỗi với NULL cho ra NULL — nên hồ sơ không có số tiền
-- làm `noi_dung` thành NULL, vi phạm NOT NULL của ct2_thong_bao, và toàn bộ
-- lệnh INSERT hồ sơ bị huỷ.
--
-- Trước migration này lỗi chưa lộ ra vì so_tien là NOT NULL. Nó lộ ngay lệnh
-- nhập đầu tiên. Hai lớp sửa:
--
--   (a) `tien` có chữ thay khi thiếu số — đúng chỗ gốc.
--   (b) `ct2_dat_thong_bao` rơi về tiêu đề nếu nội dung rỗng — vì MỘT CÁI TIN
--       KHÔNG BAO GIỜ ĐƯỢC PHÉP CHẶN MỘT LỆNH GHI NGHIỆP VỤ. Thông báo là hệ
--       quả; hồ sơ tín dụng là việc chính.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_dat_thong_bao(
  _ma_su_kien text, _nguoi_nhan uuid, _tieu_de text, _noi_dung text,
  _muc text DEFAULT 'NHE', _dau_viec_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2tb$
DECLARE
  moc_phat timestamptz;
  tran int := (public.ct2_cau_hinh()).tran_thong_bao;
  da_gui int;
BEGIN
  IF _nguoi_nhan IS NULL THEN RETURN false; END IF;
  IF _nguoi_nhan = public.get_my_profile_id() THEN RETURN false; END IF;

  -- Lưới an toàn: một phép nối chuỗi gặp NULL ở bất kỳ đâu cũng không được
  -- phép làm hỏng lệnh ghi đã gọi tới đây.
  _tieu_de  := COALESCE(NULLIF(trim(_tieu_de), ''), 'Có cập nhật mới');
  _noi_dung := COALESCE(NULLIF(trim(_noi_dung), ''), _tieu_de);

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
END $ct2tb$;

CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_ho_so()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2tbhs$
DECLARE
  co_gui boolean := false;
  tien text;
BEGIN
  tien := CASE
    WHEN NEW.so_tien IS NULL THEN 'chưa có số tiền'
    WHEN NEW.so_tien >= 1000 THEN round(NEW.so_tien / 1000.0, 1)::text || ' tỷ'
    ELSE NEW.so_tien::text || ' triệu' END;

  IF TG_OP = 'INSERT' THEN
    IF public.ct2_dat_thong_bao(
         'HS_GIAO', NEW.can_bo, 'Anh/chị được giao một hồ sơ tín dụng',
         NEW.khach_hang || ' — ' || tien || ', hạn xử lý '
           || COALESCE(to_char(NEW.han_xu_ly, 'DD/MM/YYYY'), 'chưa đặt') || '.', 'NHE', NULL)
    THEN co_gui := true; END IF;

  ELSE
    IF NEW.nguoi_dang_giu IS NOT NULL
       AND NEW.nguoi_dang_giu IS DISTINCT FROM OLD.nguoi_dang_giu THEN
      IF public.ct2_dat_thong_bao(
           'HS_TRINH', NEW.nguoi_dang_giu, 'Có hồ sơ tín dụng chờ anh/chị',
           NEW.khach_hang || ' — ' || tien
             || '. Hồ sơ vừa được trình lên, đồng hồ chờ tính từ bây giờ.',
           'DO', NULL)
      THEN co_gui := true; END IF;
    END IF;

    IF OLD.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS NULL
       AND NEW.trang_thai <> OLD.trang_thai THEN
      IF public.ct2_dat_thong_bao(
           'HS_TRA', NEW.can_bo, 'Hồ sơ đã có ý kiến cấp trên',
           NEW.khach_hang || ' — ' || tien || ' đã chuyển sang bước tiếp theo.',
           'NHE', NULL)
      THEN co_gui := true; END IF;
    END IF;

    IF NEW.trang_thai = 'TU_CHOI' AND OLD.trang_thai <> 'TU_CHOI' THEN
      IF public.ct2_dat_thong_bao(
           'HS_TU_CHOI', NEW.can_bo, 'Hồ sơ bị dừng',
           NEW.khach_hang || ' — ' || tien || '. Lý do: '
             || left(COALESCE(NEW.ly_do_tu_choi, ''), 160), 'DO', NULL)
      THEN co_gui := true; END IF;
    END IF;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $ct2tbhs$;

REVOKE ALL ON FUNCTION public.f_ct2_thong_bao_ho_so() FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.ct2_ho_so_tin_dung.so_tien IS
  'Đơn vị: TRIỆU ĐỒNG. NULL chỉ xuất hiện ở hồ sơ nhập từ dữ liệu lịch sử không có số tiền — hồ sơ mở mới trong ứng dụng luôn bắt buộc có, do trigger f_ct2_hs_truoc_tao chặn.';
COMMENT ON COLUMN public.ct2_ho_so_tin_dung.han_xu_ly IS
  'NULL chỉ xuất hiện ở hồ sơ nhập từ dữ liệu lịch sử. Hồ sơ mở mới bắt buộc có hạn.';

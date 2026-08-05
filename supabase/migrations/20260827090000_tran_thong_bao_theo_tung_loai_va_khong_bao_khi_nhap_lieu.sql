-- Vì sao cán bộ ghi nhịp mà không ai nhận được push
--
-- Truy ra ba nguyên nhân xếp chồng, cái sau bị cái trước che mất:
--
-- (1) ĐỢT NHẬP LIỆU BẮN TIN «anh/chị vừa được giao một việc».
--     Nhập 97 thẻ lịch sử từ Miro làm trigger INSERT bắn N13 cho từng người —
--     nội dung sai sự thật (việc từ tháng 3, không phải «vừa được giao»), và
--     tệ hơn là nó ĂN HẾT hạn mức tin trong ngày của họ.
--
-- (2) TRẦN CHỐNG NHIỄU LÀ MỘT RỔ CHUNG.
--     Trần 3 tin nhẹ/người/ngày đếm GỘP mọi loại. Tin nhập liệu phát vào khung
--     sáng 05/08 chiếm đúng 3 suất của chị Vũ Thị Thu Hà; đến 08:57 chị Phượng
--     ghi nhịp thì tin báo cho chị Hà bị trần nuốt, im lặng, không dấu vết.
--     Một cơn lũ ở loại tin này không được phép bóp chết loại tin khác.
--
-- (3) Chỉ 27/100 cán bộ đã bật thông báo trên trình duyệt — phần này không sửa
--     bằng SQL được, phải để người dùng bấm «Bật thông báo».
--
-- Migration này vá (1) và (2).

-- ---------------------------------------------------------------------------
-- (2) Trần đếm THEO TỪNG LOẠI TIN, không gộp một rổ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_dat_thong_bao(
  _ma_su_kien text, _nguoi_nhan uuid, _tieu_de text, _noi_dung text,
  _muc text DEFAULT 'NHE'::text, _dau_viec_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  moc_phat timestamptz;
  tran int := (public.ct2_cau_hinh()).tran_thong_bao;
  da_gui int;
BEGIN
  IF _nguoi_nhan IS NULL THEN RETURN false; END IF;
  IF _nguoi_nhan = public.get_my_profile_id() THEN RETURN false; END IF;

  _tieu_de  := COALESCE(NULLIF(trim(_tieu_de), ''), 'Có cập nhật mới');
  _noi_dung := COALESCE(NULLIF(trim(_noi_dung), ''), _tieu_de);

  moc_phat := CASE WHEN _muc = 'CHAN' THEN now() ELSE public.ct2_moc_phat_gan_nhat() END;

  -- Trần chống nhiễu vẫn còn, nhưng đếm RIÊNG từng mã sự kiện. Trước đây một rổ
  -- chung: 3 tin «được giao việc» của đợt nhập liệu là nhịp PDCA cả ngày hôm đó
  -- không tới được ai. Nhịp và trao đổi là mạch chính của Chiêu thức 2 — chúng
  -- không được chết vì một loại tin khác nói nhiều.
  IF _muc = 'NHE' AND _ma_su_kien <> 'N12' THEN
    SELECT count(*) INTO da_gui FROM public.ct2_thong_bao t
     WHERE t.nguoi_nhan = _nguoi_nhan
       AND t.muc = 'NHE'
       AND t.ma_su_kien = _ma_su_kien
       AND (t.phat_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (moc_phat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
    IF da_gui >= tran THEN RETURN false; END IF;
  END IF;

  INSERT INTO public.ct2_thong_bao
    (ma_su_kien, nguoi_nhan, dau_viec_id, tieu_de, noi_dung, muc, kenh, phat_luc)
  VALUES (_ma_su_kien, _nguoi_nhan, _dau_viec_id, _tieu_de, _noi_dung, _muc,
          ARRAY['push','bell'], moc_phat);

  RETURN moc_phat <= now();
END $function$;

-- ---------------------------------------------------------------------------
-- (1) Nhập liệu lịch sử KHÔNG bắn tin «vừa được giao một việc»
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_dau_viec()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE co_gui boolean := false; nguoi uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- auth.uid() NULL = ghi bằng service role, tức là NHẬP LIỆU LỊCH SỬ chứ
    -- không phải ai đó vừa giao việc cho ai. Báo «anh/chị vừa được giao một
    -- việc» cho một thẻ từ tháng 3 vừa sai sự thật vừa đốt hạn mức tin của
    -- người nhận, khiến nhịp thật trong ngày không tới được nữa.
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;

    IF public.ct2_dat_thong_bao('N13', NEW.nguoi_chiu_trach_nhiem, 'Anh/chị vừa được giao một việc',
         '«' || NEW.tieu_de || '» — hạn '
           || COALESCE(to_char(NEW.han_hoan_thanh, 'DD/MM/YYYY'), 'chưa đặt')
           || '. Khi bắt tay làm, mở thẻ bấm «Bắt đầu làm».', 'NHE', NEW.id)
    THEN co_gui := true; END IF;
  ELSE
    IF NEW.muc_uu_tien = 'TRONG_DIEM_BGD' AND OLD.muc_uu_tien <> 'TRONG_DIEM_BGD' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao('N14', nguoi, 'Ban Giám đốc đặt việc này là TRỌNG ĐIỂM',
             '«' || NEW.tieu_de || '» nay là việc trọng điểm của BGĐ.', 'DO', NEW.id)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;

    IF NEW.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS DISTINCT FROM OLD.nguoi_dang_giu THEN
      IF public.ct2_dat_thong_bao('N7', NEW.nguoi_dang_giu, 'Có việc đang chờ ý kiến của anh/chị',
           '«' || NEW.tieu_de || '» vừa được chuyển sang chờ anh/chị. Đồng hồ chờ tính từ bây giờ.',
           'NHE', NEW.id) THEN co_gui := true; END IF;
    END IF;

    IF NEW.trang_thai = 'HOAN_THANH' AND OLD.trang_thai <> 'HOAN_THANH' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao('N15', nguoi, 'Có việc chờ anh/chị chốt',
             '«' || NEW.tieu_de || '» đã báo hoàn thành, mời anh/chị rà và đóng thẻ.', 'NHE', NEW.id)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;

    IF NEW.trang_thai = 'DUNG_HUY' AND OLD.trang_thai <> 'DUNG_HUY' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao('N16', nguoi, 'Một đầu việc vừa bị Dừng/Hủy',
             '«' || NEW.tieu_de || '». Lý do: ' || left(COALESCE(NEW.ly_do_dung_huy, ''), 160),
             'DO', NEW.id) THEN co_gui := true; END IF;
      END LOOP;
    END IF;

    IF NEW.han_hoan_thanh IS DISTINCT FROM OLD.han_hoan_thanh
       AND OLD.han_hoan_thanh IS NOT NULL AND NEW.han_hoan_thanh IS NOT NULL
       AND NEW.han_hoan_thanh > OLD.han_hoan_thanh THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao('N17', nguoi, 'Một đầu việc vừa lùi hạn',
             '«' || NEW.tieu_de || '»: ' || to_char(OLD.han_hoan_thanh, 'DD/MM/YYYY')
               || ' → ' || to_char(NEW.han_hoan_thanh, 'DD/MM/YYYY') || '.',
             'DO', NEW.id) THEN co_gui := true; END IF;
      END LOOP;
    END IF;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- Cùng lý lẽ cho hồ sơ tín dụng: nhập 47 hồ sơ lịch sử không phải là «anh/chị
-- được giao một hồ sơ».
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_ho_so()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE co_gui boolean := false; tien text; nguoi uuid;
BEGIN
  tien := CASE
    WHEN NEW.so_tien IS NULL THEN 'chưa có số tiền'
    WHEN NEW.so_tien >= 1000 THEN round(NEW.so_tien / 1000.0, 1)::text || ' tỷ'
    ELSE NEW.so_tien::text || ' triệu' END;

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;
    IF public.ct2_dat_thong_bao('HS_GIAO', NEW.can_bo, 'Anh/chị được giao một hồ sơ tín dụng',
         NEW.khach_hang || ' — ' || tien || ', hạn xử lý '
           || COALESCE(to_char(NEW.han_xu_ly, 'DD/MM/YYYY'), 'chưa đặt') || '.', 'NHE', NULL)
    THEN co_gui := true; END IF;
  ELSE
    IF NEW.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS DISTINCT FROM OLD.nguoi_dang_giu THEN
      IF public.ct2_dat_thong_bao('HS_TRINH', NEW.nguoi_dang_giu, 'Có hồ sơ tín dụng chờ anh/chị',
           NEW.khach_hang || ' — ' || tien
             || '. Hồ sơ vừa được trình lên, đồng hồ chờ tính từ bây giờ.', 'DO', NULL)
      THEN co_gui := true; END IF;
    END IF;

    IF OLD.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS NULL
       AND NEW.trang_thai <> OLD.trang_thai THEN
      IF public.ct2_dat_thong_bao('HS_TRA', NEW.can_bo, 'Hồ sơ đã có ý kiến cấp trên',
           NEW.khach_hang || ' — ' || tien || ' đã chuyển sang bước tiếp theo.', 'NHE', NULL)
      THEN co_gui := true; END IF;
    END IF;

    IF NEW.trang_thai = 'TU_CHOI' AND OLD.trang_thai <> 'TU_CHOI' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_ho_so(NEW.id, true) LOOP
        IF public.ct2_dat_thong_bao('HS_TU_CHOI', nguoi, 'Hồ sơ tín dụng bị dừng',
             NEW.khach_hang || ' — ' || tien || '. Lý do: '
               || left(COALESCE(NEW.ly_do_tu_choi, ''), 160), 'DO', NULL)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- Dọn hậu quả: 36 tin «vừa được giao một việc» do hai đợt nhập liệu sinh ra.
-- Chúng vừa sai nội dung vừa đang chiếm suất trong ngày của người nhận. Câu này
-- là dọn một lần cho đúng dữ liệu đã lỡ sinh ra trên production — chạy lại trên
-- một database sạch thì không khớp dòng nào, vô hại.
DELETE FROM public.ct2_thong_bao
 WHERE ma_su_kien = 'N13'
   AND created_at > now() - interval '3 days'
   AND dau_viec_id IN (SELECT id FROM public.ct2_dau_viec WHERE nguoi_tao IN
        ('a50e0917-4aef-47df-9eb2-8c297847bb7b','67a18a78-8c99-466e-ae7c-165923419d03'));

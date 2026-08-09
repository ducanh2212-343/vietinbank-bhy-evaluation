-- HÌNH THỨC PUSH — ĐỢT 2: TIN SỰ KIỆN (09/08/2026, tiếp nối 20260915090000).
--
-- Đợt 1 áp chuẩn «tiêu đề = người + tiến độ; thân = mỗi dòng một nhãn» cho tin HÀNH ĐỘNG
-- CÁ NHÂN (ghi nhịp, trao đổi, bằng chứng, cập nhật Kanban). Đợt này áp nốt cho tin
-- SỰ KIỆN — giao việc, trọng điểm, chờ chốt, dừng/hủy, lùi hạn (N7/N13–N17) và vòng đời
-- hồ sơ tín dụng (HS_*). Tiêu đề các tin này vốn đã là nhãn rõ («Có việc chờ anh/chị
-- chốt») nên giữ nguyên; chỗ phải sửa là THÂN TIN đang nối «tên việc» — chi tiết thành
-- một dòng dài, tên việc dài thì nuốt hết phần chi tiết.
--
-- Thân tin mới: dòng 1 = Việc:/Hồ sơ: <tên, cắt bằng ct2_cat>; dòng 2 = chi tiết.
-- CHỈ đổi chuỗi noi_dung — không đụng logic điều kiện, người nhận, mức tin.

CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_dau_viec()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE co_gui boolean := false; nguoi uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- auth.uid() NULL = ghi bằng service role, tức là NHẬP LIỆU LỊCH SỬ chứ
    -- không phải ai đó vừa giao việc cho ai. Báo «anh/chị vừa được giao một
    -- việc» cho một thẻ từ tháng 3 vừa sai sự thật vừa làm phiền người nhận,
    -- khiến nhịp thật trong ngày bị loãng.
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;

    IF public.ct2_dat_thong_bao('N13', NEW.nguoi_chiu_trach_nhiem, 'Anh/chị vừa được giao một việc',
         'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
           || E'\nHạn: ' || COALESCE(to_char(NEW.han_hoan_thanh, 'DD/MM/YYYY'), 'chưa đặt')
           || E'\nKhi bắt tay làm, mở thẻ bấm «Bắt đầu làm».', 'NHE', NEW.id)
    THEN co_gui := true; END IF;
  ELSE
    IF NEW.muc_uu_tien = 'TRONG_DIEM_BGD' AND OLD.muc_uu_tien <> 'TRONG_DIEM_BGD' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao('N14', nguoi, 'Ban Giám đốc đặt việc này là TRỌNG ĐIỂM',
             'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
               || E'\nNay là việc trọng điểm của Ban Giám đốc.', 'DO', NEW.id)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;

    IF NEW.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS DISTINCT FROM OLD.nguoi_dang_giu THEN
      IF public.ct2_dat_thong_bao('N7', NEW.nguoi_dang_giu, 'Có việc đang chờ ý kiến của anh/chị',
           'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
             || E'\nVừa chuyển sang chờ anh/chị — đồng hồ chờ tính từ bây giờ.',
           'NHE', NEW.id) THEN co_gui := true; END IF;
    END IF;

    IF NEW.trang_thai = 'HOAN_THANH' AND OLD.trang_thai <> 'HOAN_THANH' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao('N15', nguoi, 'Có việc chờ anh/chị chốt',
             'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
               || E'\nĐã báo hoàn thành — mời anh/chị rà và đóng thẻ.', 'NHE', NEW.id)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;

    IF NEW.trang_thai = 'DUNG_HUY' AND OLD.trang_thai <> 'DUNG_HUY' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao('N16', nguoi, 'Một đầu việc vừa bị Dừng/Hủy',
             'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
               || E'\nLý do: ' || COALESCE(public.ct2_cat(NULLIF(NEW.ly_do_dung_huy, ''), 160), '(không ghi)'),
             'DO', NEW.id) THEN co_gui := true; END IF;
      END LOOP;
    END IF;

    IF NEW.han_hoan_thanh IS DISTINCT FROM OLD.han_hoan_thanh
       AND OLD.han_hoan_thanh IS NOT NULL AND NEW.han_hoan_thanh IS NOT NULL
       AND NEW.han_hoan_thanh > OLD.han_hoan_thanh THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao('N17', nguoi, 'Một đầu việc vừa lùi hạn',
             'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
               || E'\nHạn: ' || to_char(OLD.han_hoan_thanh, 'DD/MM/YYYY')
               || ' → ' || to_char(NEW.han_hoan_thanh, 'DD/MM/YYYY'),
             'DO', NEW.id) THEN co_gui := true; END IF;
      END LOOP;
    END IF;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_ho_so()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE co_gui boolean := false; tien text; dong1 text; nguoi uuid;
BEGIN
  tien := CASE
    WHEN NEW.so_tien IS NULL THEN 'chưa có số tiền'
    WHEN NEW.so_tien >= 1000 THEN round(NEW.so_tien / 1000.0, 1)::text || ' tỷ'
    ELSE NEW.so_tien::text || ' triệu' END;
  -- Tên khách + số tiền gộp một dòng: tên khách hàng ngắn, số tiền là ngữ cảnh
  -- chứ không phải chi tiết cần dòng riêng.
  dong1 := 'Hồ sơ: ' || public.ct2_cat(NEW.khach_hang, 55) || ' (' || tien || ')';

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;
    IF public.ct2_dat_thong_bao('HS_GIAO', NEW.can_bo, 'Anh/chị được giao một hồ sơ tín dụng',
         dong1 || E'\nHạn xử lý: '
           || COALESCE(to_char(NEW.han_xu_ly, 'DD/MM/YYYY'), 'chưa đặt'), 'NHE', NULL, NEW.id)
    THEN co_gui := true; END IF;
  ELSE
    IF NEW.can_bo IS DISTINCT FROM OLD.can_bo THEN
      IF public.ct2_dat_thong_bao('HS_GIAO', NEW.can_bo, 'Hồ sơ tín dụng được giao lại cho anh/chị',
           dong1 || E'\nHạn xử lý: '
             || COALESCE(to_char(NEW.han_xu_ly, 'DD/MM/YYYY'), 'chưa đặt'), 'NHE', NULL, NEW.id)
      THEN co_gui := true; END IF;
    END IF;

    IF NEW.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS DISTINCT FROM OLD.nguoi_dang_giu THEN
      IF public.ct2_dat_thong_bao('HS_TRINH', NEW.nguoi_dang_giu, 'Có hồ sơ tín dụng chờ anh/chị',
           dong1 || E'\nVừa được trình lên — đồng hồ chờ tính từ bây giờ.', 'DO', NULL, NEW.id)
      THEN co_gui := true; END IF;
    END IF;

    IF OLD.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS NULL
       AND NEW.trang_thai <> OLD.trang_thai THEN
      IF public.ct2_dat_thong_bao('HS_TRA', NEW.can_bo, 'Hồ sơ đã có ý kiến cấp trên',
           dong1 || E'\nĐã chuyển sang bước tiếp theo.', 'NHE', NULL, NEW.id)
      THEN co_gui := true; END IF;
    END IF;

    IF NEW.trang_thai = 'TU_CHOI' AND OLD.trang_thai <> 'TU_CHOI' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_ho_so(NEW.id, true) LOOP
        IF public.ct2_dat_thong_bao('HS_TU_CHOI', nguoi, 'Hồ sơ tín dụng bị dừng',
             dong1 || E'\nLý do: '
               || COALESCE(public.ct2_cat(NULLIF(NEW.ly_do_tu_choi, ''), 160), '(không ghi)'),
             'DO', NULL, NEW.id)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

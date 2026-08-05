-- Trao đổi và ghi nhịp báo ĐỦ TUYẾN PHỤ TRÁCH — cả bốn hệ
--
-- Giám đốc chốt sáng 06/08 (kèm ảnh khoanh ô «Bấm tên để họ nhận thông báo»):
-- người chịu trách nhiệm, lãnh đạo phòng, PGĐ được gắn đều phải nhận push khi
-- BẤT KỲ AI trao đổi hoặc ghi nhịp — trên Kanban phòng, Phê duyệt tín dụng,
-- Kanban upskill (Chiêu thức 3) và Bắc Hưng Yên Mark.
--
-- Hiện trạng soi từng hệ trước khi sửa:
--   · Kanban phòng: NHỊP đã báo đủ tuyến (đợt «nhịp báo đủ tuyến» 08/2026);
--     TRAO ĐỔI thì chưa — chỉ tới danh sách bám sát (cán bộ + phối hợp + lãnh
--     đạo theo dõi + người tự theo dõi), thiếu Phó phòng/Trưởng phòng/PGĐ.
--   · PDTD: trao đổi chỉ tới danh sách hẹp (cờ _co_chuyen=false); ghi nhịp
--     hồ sơ (ct2_nhip_ho_so) KHÔNG báo ai cả — chưa từng có trigger.
--   · Upskill: cập nhật tiến độ đã có push «2 cấp trên» (edge function
--     notify-kanban-update, luật chốt 26/07) — GIỮ NGUYÊN, không bắn đúp;
--     trao đổi trên thẻ thì chỉ báo chủ thẻ.
--   · Mark: bồi bằng chứng không báo ai.
--
-- Ô «bấm tên» trên form KHÔNG mất nghĩa: tuyến phụ trách nay tự nhận, bấm tên
-- là để NHẮC ĐÍCH DANH thêm người ngoài tuyến (tiêu đề tin sẽ ghi «nhắc tên
-- anh/chị» thay vì «vừa trao đổi»).

-- ---------------------------------------------------------------------------
-- 1. Tuyến phụ trách của MỘT NGƯỜI — cho thẻ upskill và dấu ấn
-- ---------------------------------------------------------------------------
-- Hai hệ này không có cột Phó phòng/Trưởng phòng/PGĐ trên từng thẻ như Chiêu
-- thức 2; tuyến lấy từ chuỗi báo cáo có sẵn trong danh bạ (manager_id, pgd_id)
-- — cùng nguồn mà edge function notify-kanban-update đang dùng.
CREATE OR REPLACE FUNCTION public.ct2_tuyen_cua_nguoi(_nguoi uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(ARRAY(
    SELECT DISTINCT x FROM (
      SELECT unnest(ARRAY[p.id, p.manager_id, p.pgd_id]) AS x
        FROM public.profiles p WHERE p.id = _nguoi
    ) s WHERE x IS NOT NULL
  ), '{}')
$function$;

REVOKE EXECUTE ON FUNCTION public.ct2_tuyen_cua_nguoi(uuid) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- 2. Trao đổi → đủ tuyến, ở cả ba phạm vi của bảng bình luận
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_binh_luan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  ten_nguoi_gui text; tieu_de_dt text := 'Trao đổi mới';
  nguoi uuid; ds_nhan uuid[] := '{}'; co_gui boolean := false;
BEGIN
  SELECT p.full_name INTO ten_nguoi_gui FROM public.profiles p WHERE p.id = NEW.nguoi_gui;
  IF NEW.pham_vi = 'DAU_VIEC' THEN
    SELECT d.tieu_de INTO tieu_de_dt FROM public.ct2_dau_viec d WHERE d.id = NEW.doi_tuong_id;
    -- ĐỦ TUYẾN: bám sát + Phó phòng + Trưởng phòng + PGĐ phụ trách
    ds_nhan := public.ct2_ds_nhan_khi_co_chuyen(NEW.doi_tuong_id);
  ELSIF NEW.pham_vi = 'HO_SO_TIN_DUNG' THEN
    SELECT h.khach_hang INTO tieu_de_dt FROM public.ct2_ho_so_tin_dung h WHERE h.id = NEW.doi_tuong_id;
    ds_nhan := public.ct2_ds_nhan_ho_so(NEW.doi_tuong_id, true);
  ELSIF NEW.pham_vi = 'THE_KANBAN' THEN
    SELECT c.title, public.ct2_tuyen_cua_nguoi(c.profile_id) INTO tieu_de_dt, ds_nhan
      FROM public.kanban_cards c WHERE c.id = NEW.doi_tuong_id;
  END IF;
  IF NEW.cha_id IS NOT NULL THEN
    SELECT ds_nhan || b.nguoi_gui INTO ds_nhan FROM public.ct2_binh_luan b WHERE b.id = NEW.cha_id;
  END IF;
  ds_nhan := COALESCE(ds_nhan, '{}') || COALESCE(NEW.nhac_ten, '{}');
  SELECT COALESCE(ARRAY(SELECT DISTINCT x FROM unnest(ds_nhan) AS x WHERE x IS NOT NULL), '{}') INTO ds_nhan;
  FOREACH nguoi IN ARRAY ds_nhan LOOP
    IF public.ct2_dat_thong_bao('N12', nguoi,
         CASE WHEN nguoi = ANY(COALESCE(NEW.nhac_ten, '{}'))
              THEN ten_nguoi_gui || ' nhắc tên anh/chị'
              ELSE ten_nguoi_gui || ' vừa trao đổi' END,
         '«' || tieu_de_dt || '»: ' || left(NEW.noi_dung, 160)
           || CASE WHEN NEW.can_tra_loi THEN E'\n↳ Được đánh dấu «Cần trả lời».' ELSE '' END,
         'NHE', CASE WHEN NEW.pham_vi = 'DAU_VIEC' THEN NEW.doi_tuong_id ELSE NULL END
       ) THEN co_gui := true; END IF;
  END LOOP;
  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- ---------------------------------------------------------------------------
-- 3. Ghi nhịp hồ sơ PDTD → đủ tuyến (trước nay im lặng hoàn toàn)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_hs_thong_bao_nhip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  ten_nguoi text; ten_kh text; nguoi uuid; co_gui boolean := false;
BEGIN
  -- Nhập liệu lịch sử không phải nhịp thật — cùng luật với đầu việc
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  SELECT p.full_name INTO ten_nguoi FROM public.profiles p WHERE p.id = NEW.nguoi_ghi;
  SELECT h.khach_hang INTO ten_kh FROM public.ct2_ho_so_tin_dung h WHERE h.id = NEW.ho_so_id;

  FOREACH nguoi IN ARRAY public.ct2_ds_nhan_ho_so(NEW.ho_so_id, true) LOOP
    IF public.ct2_dat_thong_bao('NHIP', nguoi,
         COALESCE(ten_nguoi, 'Đồng nghiệp') || ' ghi nhịp hồ sơ',
         '«' || COALESCE(ten_kh, 'hồ sơ tín dụng') || '»: ' || left(NEW.noi_dung, 140)
           || COALESCE(E'\n↳ Vướng: ' || left(NEW.vuong_mac, 100), ''),
         'NHE', NULL) THEN co_gui := true; END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_ct2_hs_thong_bao_nhip ON public.ct2_nhip_ho_so;
CREATE TRIGGER trg_ct2_hs_thong_bao_nhip
  AFTER INSERT ON public.ct2_nhip_ho_so
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_hs_thong_bao_nhip();

-- ---------------------------------------------------------------------------
-- 4. Bồi bằng chứng dấu ấn (BHY Mark) → chủ dấu ấn + tuyến của họ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_bang_chung()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  ten_nguoi text; tieu_de_mark text; chu_mark uuid; nguoi uuid; co_gui boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  SELECT p.full_name INTO ten_nguoi FROM public.profiles p WHERE p.id = NEW.nguoi_ghi;
  SELECT m.title, m.profile_id INTO tieu_de_mark, chu_mark
    FROM public.leadership_marks m WHERE m.id = NEW.mark_id;

  FOREACH nguoi IN ARRAY public.ct2_tuyen_cua_nguoi(chu_mark) LOOP
    IF public.ct2_dat_thong_bao('NHIP', nguoi,
         COALESCE(ten_nguoi, 'Đồng nghiệp') || ' bồi bằng chứng dấu ấn',
         '«' || COALESCE(tieu_de_mark, 'dấu ấn') || '» (' || NEW.phan_star || '): '
           || left(NEW.noi_dung, 140),
         'NHE', NULL) THEN co_gui := true; END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_ct2_thong_bao_bang_chung ON public.ct2_bang_chung_dau_an;
CREATE TRIGGER trg_ct2_thong_bao_bang_chung
  AFTER INSERT ON public.ct2_bang_chung_dau_an
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_thong_bao_bang_chung();

-- ─────────────────────────────────────────────────────────────────────────────
-- THÔNG BÁO HỒ SƠ PDTD: BẤM VÀO MỞ THẲNG HỒ SƠ ĐỂ TRAO ĐỔI LUÔN
--
-- Giám đốc đặt hàng (07/08/2026): «khi hiện thông báo thì ấn vào thông báo sẽ
-- hiển thị luôn task/hoặc công việc có liên quan để có thể trao đổi luôn».
--
-- Nửa đầu đã có từ trước: tin gắn đầu việc mang dau_viec_id, bấm chuông hay
-- push đều mở thẳng thẻ (?the=...). Nửa còn thiếu là HỒ SƠ TÍN DỤNG: bảng
-- ct2_thong_bao không có chỗ ghi hồ sơ nào, nên «Có hồ sơ tín dụng chờ
-- anh/chị» bấm vào chỉ mở chung tab tín dụng — người duyệt vẫn phải tự tìm
-- giữa 48 hồ sơ. Với người phê duyệt, đó chính là chỗ rơi.
--
-- Ba việc trong migration này:
--  1. ct2_thong_bao thêm cột ho_so_id (ON DELETE SET NULL — tin cũ không giữ
--     xác hồ sơ đã gỡ).
--  2. ct2_dat_thong_bao nhận thêm _ho_so_id. Phải DROP rồi CREATE vì đổi chữ
--     ký; tham số mới có DEFAULT NULL nên MỌI chỗ gọi 6 tham số hiện có vẫn
--     chạy nguyên — không phải sửa các hàm phát tin không liên quan hồ sơ.
--     DROP làm mất ACL → tái lập đúng như đo trước khi đổi:
--     chỉ postgres + service_role (không PUBLIC, không anon/authenticated).
--  3. Ba hàm phát tin hồ sơ truyền mã hồ sơ vào: f_ct2_thong_bao_ho_so
--     (giao/giao lại, trình, trả, từ chối), f_ct2_hs_thong_bao_nhip (nhịp),
--     f_ct2_thong_bao_binh_luan (trao đổi — phạm vi HO_SO_TIN_DUNG).
--
-- Phía đọc: notify-ct2 và duongDanThongBao (client) cùng thêm một nhánh
-- ?ho_so=... ; OneMove2Page mở hộp thoại hồ sơ từ tham số đó — nơi có sẵn ô
-- Trao đổi, đúng chữ «để có thể trao đổi luôn».
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ct2_thong_bao
  ADD COLUMN IF NOT EXISTS ho_so_id uuid
    REFERENCES public.ct2_ho_so_tin_dung(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.ct2_thong_bao.ho_so_id IS
  'Hồ sơ PDTD mà tin nói tới — để bấm thông báo mở thẳng hồ sơ (?ho_so=...). NULL với tin không thuộc hồ sơ nào.';

-- 2) Hàm đặt thông báo — thêm _ho_so_id, giữ nguyên toàn bộ luật cũ
DROP FUNCTION IF EXISTS public.ct2_dat_thong_bao(text, uuid, text, text, text, uuid);

CREATE FUNCTION public.ct2_dat_thong_bao(
  _ma_su_kien text, _nguoi_nhan uuid, _tieu_de text, _noi_dung text,
  _muc text DEFAULT 'NHE', _dau_viec_id uuid DEFAULT NULL, _ho_so_id uuid DEFAULT NULL
) RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  -- Miễn trần: N12 (trao đổi) và NHIP (nhịp PDCA) — hai thứ này LÀ mạch chính
  -- của Chiêu thức 2. Trần đếm riêng từng mã sự kiện cho các loại còn lại, để
  -- một cơn lũ ở loại này không bóp chết loại khác.
  IF _muc = 'NHE' AND _ma_su_kien NOT IN ('N12', 'NHIP') THEN
    SELECT count(*) INTO da_gui FROM public.ct2_thong_bao t
     WHERE t.nguoi_nhan = _nguoi_nhan
       AND t.muc = 'NHE'
       AND t.ma_su_kien = _ma_su_kien
       AND (t.phat_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (moc_phat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
    IF da_gui >= tran THEN RETURN false; END IF;
  END IF;

  INSERT INTO public.ct2_thong_bao
    (ma_su_kien, nguoi_nhan, dau_viec_id, ho_so_id, tieu_de, noi_dung, muc, kenh, phat_luc)
  VALUES (_ma_su_kien, _nguoi_nhan, _dau_viec_id, _ho_so_id, _tieu_de, _noi_dung, _muc,
          ARRAY['push','bell'], moc_phat);

  RETURN moc_phat <= now();
END $function$;

-- DROP đã xoá ACL cũ — tái lập đúng hiện trạng đo được: postgres + service_role
REVOKE ALL ON FUNCTION public.ct2_dat_thong_bao(text, uuid, text, text, text, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_dat_thong_bao(text, uuid, text, text, text, uuid, uuid)
  TO service_role;

-- 3a) Giao/giao lại · trình · trả · từ chối — tin nào cũng mang mã hồ sơ
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_ho_so()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
           || COALESCE(to_char(NEW.han_xu_ly, 'DD/MM/YYYY'), 'chưa đặt') || '.', 'NHE', NULL, NEW.id)
    THEN co_gui := true; END IF;
  ELSE
    IF NEW.can_bo IS DISTINCT FROM OLD.can_bo THEN
      IF public.ct2_dat_thong_bao('HS_GIAO', NEW.can_bo, 'Hồ sơ tín dụng được giao lại cho anh/chị',
           NEW.khach_hang || ' — ' || tien || ', hạn xử lý '
             || COALESCE(to_char(NEW.han_xu_ly, 'DD/MM/YYYY'), 'chưa đặt') || '.', 'NHE', NULL, NEW.id)
      THEN co_gui := true; END IF;
    END IF;

    IF NEW.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS DISTINCT FROM OLD.nguoi_dang_giu THEN
      IF public.ct2_dat_thong_bao('HS_TRINH', NEW.nguoi_dang_giu, 'Có hồ sơ tín dụng chờ anh/chị',
           NEW.khach_hang || ' — ' || tien
             || '. Hồ sơ vừa được trình lên, đồng hồ chờ tính từ bây giờ.', 'DO', NULL, NEW.id)
      THEN co_gui := true; END IF;
    END IF;

    IF OLD.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS NULL
       AND NEW.trang_thai <> OLD.trang_thai THEN
      IF public.ct2_dat_thong_bao('HS_TRA', NEW.can_bo, 'Hồ sơ đã có ý kiến cấp trên',
           NEW.khach_hang || ' — ' || tien || ' đã chuyển sang bước tiếp theo.', 'NHE', NULL, NEW.id)
      THEN co_gui := true; END IF;
    END IF;

    IF NEW.trang_thai = 'TU_CHOI' AND OLD.trang_thai <> 'TU_CHOI' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_ho_so(NEW.id, true) LOOP
        IF public.ct2_dat_thong_bao('HS_TU_CHOI', nguoi, 'Hồ sơ tín dụng bị dừng',
             NEW.khach_hang || ' — ' || tien || '. Lý do: '
               || left(COALESCE(NEW.ly_do_tu_choi, ''), 160), 'DO', NULL, NEW.id)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- 3b) Nhịp hồ sơ
CREATE OR REPLACE FUNCTION public.f_ct2_hs_thong_bao_nhip()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ten_nguoi text; ten_kh text; nguoi uuid; co_gui boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  SELECT p.full_name INTO ten_nguoi FROM public.profiles p WHERE p.id = NEW.nguoi_ghi;
  SELECT h.khach_hang INTO ten_kh FROM public.ct2_ho_so_tin_dung h WHERE h.id = NEW.ho_so_id;

  FOREACH nguoi IN ARRAY public.ct2_ds_nhan_ho_so(NEW.ho_so_id, true) LOOP
    IF public.ct2_dat_thong_bao('NHIP', nguoi,
         COALESCE(ten_nguoi, 'Đồng nghiệp') || ' ghi nhịp hồ sơ',
         '«' || COALESCE(ten_kh, 'hồ sơ tín dụng') || '»: ' || left(NEW.noi_dung, 140)
           || COALESCE(E'\n↳ Vướng: ' || left(NEW.vuong_mac, 100), ''),
         'NHE', NULL, NEW.ho_so_id) THEN co_gui := true; END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- 3c) Trao đổi — phạm vi hồ sơ tín dụng mang mã hồ sơ, các phạm vi khác giữ nguyên
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_binh_luan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ten_nguoi_gui text; tieu_de_dt text := 'Trao đổi mới';
  nguoi uuid; ds_nhan uuid[] := '{}'; co_gui boolean := false;
BEGIN
  SELECT p.full_name INTO ten_nguoi_gui FROM public.profiles p WHERE p.id = NEW.nguoi_gui;
  IF NEW.pham_vi = 'DAU_VIEC' THEN
    SELECT d.tieu_de INTO tieu_de_dt FROM public.ct2_dau_viec d WHERE d.id = NEW.doi_tuong_id;
    ds_nhan := public.ct2_ds_nhan_khi_co_chuyen(NEW.doi_tuong_id);
  ELSIF NEW.pham_vi = 'HO_SO_TIN_DUNG' THEN
    SELECT h.khach_hang INTO tieu_de_dt FROM public.ct2_ho_so_tin_dung h WHERE h.id = NEW.doi_tuong_id;
    ds_nhan := public.ct2_ds_nhan_ho_so(NEW.doi_tuong_id, true);
  ELSIF NEW.pham_vi = 'THE_KANBAN' THEN
    SELECT c.title, public.ct2_tuyen_cua_nguoi(c.profile_id) INTO tieu_de_dt, ds_nhan
      FROM public.kanban_cards c WHERE c.id = NEW.doi_tuong_id;
  ELSIF NEW.pham_vi = 'DAU_AN' THEN
    SELECT m.title, public.ct2_tuyen_cua_nguoi(m.profile_id) INTO tieu_de_dt, ds_nhan
      FROM public.leadership_marks m WHERE m.id = NEW.doi_tuong_id;
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
         'NHE',
         CASE WHEN NEW.pham_vi = 'DAU_VIEC' THEN NEW.doi_tuong_id ELSE NULL END,
         CASE WHEN NEW.pham_vi = 'HO_SO_TIN_DUNG' THEN NEW.doi_tuong_id ELSE NULL END
       ) THEN co_gui := true; END IF;
  END LOOP;
  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

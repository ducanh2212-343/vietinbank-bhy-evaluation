-- Trao đổi cho thẻ dấu ấn BHY Mark — phạm vi DAU_AN trên cùng mạch bình luận
--
-- Giám đốc yêu cầu sáng 06/08 (kèm ảnh thẻ dấu ấn của một PGĐ): thẻ Mark mới
-- chỉ có nhật ký máy (tạo thẻ, chuyển trạng thái, cập nhật tiến độ) — chưa có
-- chỗ TRAO ĐỔI như thẻ Kanban. Bổ sung bằng đúng hạ tầng đang chạy ở ba bàn
-- kia (ct2_binh_luan + dòng thời gian trộn), không dựng bảng mới: một mạch
-- trao đổi thứ tư nghĩa là bốn chỗ sửa luật mỗi lần đổi, và ba tháng sau chúng
-- lệch nhau.

-- 1. Phạm vi mới
ALTER TABLE public.ct2_binh_luan
  DROP CONSTRAINT IF EXISTS ct2_binh_luan_pham_vi_check;
ALTER TABLE public.ct2_binh_luan
  ADD CONSTRAINT ct2_binh_luan_pham_vi_check
  CHECK (pham_vi = ANY (ARRAY[
    'DAU_VIEC'::text, 'PHONG'::text, 'CHIEN_DICH'::text,
    'HO_SO_TIN_DUNG'::text, 'THE_KANBAN'::text, 'DAU_AN'::text
  ]));

-- 2. Ai xem/viết được — cùng luật với thẻ upskill: chủ thẻ hoặc người trong
--    tầm nhìn của chủ thẻ (lãnh đạo tuyến, BGĐ, quản trị). RLS của bảng bình
--    luận đã trỏ hết vào hàm này nên chỉ thêm một nhánh.
CREATE OR REPLACE FUNCTION public.ct2_xem_duoc_doi_tuong(_pham_vi text, _doi_tuong uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN false; END IF;

  IF _pham_vi = 'DAU_VIEC' THEN
    SELECT d.phong, d.cac_phong_tham_gia INTO r
      FROM public.ct2_dau_viec d WHERE d.id = _doi_tuong;
    RETURN FOUND AND public.ct2_xem_duoc_dau_viec(r.phong, r.cac_phong_tham_gia);

  ELSIF _pham_vi = 'HO_SO_TIN_DUNG' THEN
    SELECT h.phong INTO r FROM public.ct2_ho_so_tin_dung h WHERE h.id = _doi_tuong;
    RETURN FOUND AND (public.can_view_all_action_plans()
                      OR public.is_my_scope_department(r.phong));

  ELSIF _pham_vi = 'THE_KANBAN' THEN
    SELECT c.profile_id INTO r FROM public.kanban_cards c WHERE c.id = _doi_tuong;
    RETURN FOUND AND (r.profile_id = public.get_my_profile_id()
                      OR public.can_view_profile(r.profile_id));

  ELSIF _pham_vi = 'DAU_AN' THEN
    SELECT m.profile_id INTO r FROM public.leadership_marks m WHERE m.id = _doi_tuong;
    RETURN FOUND AND (r.profile_id = public.get_my_profile_id()
                      OR public.can_view_profile(r.profile_id));

  ELSIF _pham_vi = 'PHONG' THEN
    RETURN public.ct2_xem_duoc_dau_viec(_doi_tuong, '{}');

  ELSIF _pham_vi = 'CHIEN_DICH' THEN
    SELECT c.phong_chu_tri AS phong, c.cac_phong_tham_gia INTO r
      FROM public.ct2_chien_dich c WHERE c.id = _doi_tuong;
    RETURN FOUND AND public.ct2_xem_duoc_dau_viec(r.phong, r.cac_phong_tham_gia);
  END IF;
  RETURN false;
END $function$;

-- 3. Thông báo: trao đổi trên dấu ấn báo đủ tuyến của CHỦ DẤU ẤN — cùng chính
--    sách «đủ tuyến bốn hệ» vừa chốt sáng nay.
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
         'NHE', CASE WHEN NEW.pham_vi = 'DAU_VIEC' THEN NEW.doi_tuong_id ELSE NULL END
       ) THEN co_gui := true; END IF;
  END LOOP;
  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

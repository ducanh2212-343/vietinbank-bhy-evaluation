-- Nhãn phân hệ cho thông báo — trả lời yêu cầu GĐ 11/08: «phân biệt Task chiêu thức 2,
-- chiêu thức 3 upskill và BHY Mark» trên màn hình khóa lẫn chuông trong ứng dụng.
--
-- Cách phân biệt KHÔNG dựa vào ma_su_kien: bình luận dùng chung N12 và bằng chứng dùng
-- chung NHIP cho mọi loại đối tượng. Nguồn sự thật là NHÃN DÒNG ĐẦU thân tin (chuẩn
-- hình thức 09/08 đã bắt mỗi dòng một nhãn): «Việc:»/«Hồ sơ:» → CT2, «Hành động:» → CT3,
-- «Dấu ấn:» → BHY Mark. notify-ct2 đọc nhãn đó để gắn [CT2]/[CT3]/[Dấu ấn] vào tiêu đề
-- push; chuông trong ứng dụng đọc cùng nhãn để treo chip màu (moduleThongBao, src/lib/ct2.ts).
--
-- Migration này vá đúng hai chỗ khiến nhãn dòng đầu chưa đủ nói lên phân hệ:
--
-- 1) f_ct2_thong_bao_binh_luan: bình luận trên THẺ KANBAN (CT3) đang rơi vào nhãn mặc
--    định «Việc:» — không phân biệt được với đầu việc CT2. Đặt nhãn riêng «Hành động:»
--    (trùng tên trang «Hành động phát triển» trong app, cán bộ đọc là hiểu ngay).
--
-- 2) f_ct2_thong_bao_bang_chung: tiêu đề «… — bồi bằng chứng dấu ấn» sẽ thành
--    «🟡 [Dấu ấn] … — bồi bằng chứng dấu ấn» khi push gắn tag — chữ «dấu ấn» lặp hai
--    lần. Rút tiêu đề còn «… — bồi bằng chứng»; tag và nhãn thân tin đã nói rõ phân hệ.
--
-- CHỈ ĐỔI CHUỖI CHỮ: người nhận, mức tin, điều kiện kích hoạt giữ nguyên từng dòng.

-- ============ 1) Bình luận: thẻ Kanban CT3 mang nhãn «Hành động:» ============
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_binh_luan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ten_nguoi_gui text; tieu_de_dt text := 'Trao đổi mới';
  nhan_doi_tuong text := 'Việc';
  nguoi uuid; ds_nhan uuid[] := '{}'; co_gui boolean := false;
BEGIN
  SELECT p.full_name INTO ten_nguoi_gui FROM public.profiles p WHERE p.id = NEW.nguoi_gui;
  IF NEW.pham_vi = 'DAU_VIEC' THEN
    SELECT d.tieu_de INTO tieu_de_dt FROM public.ct2_dau_viec d WHERE d.id = NEW.doi_tuong_id;
    ds_nhan := public.ct2_ds_nhan_khi_co_chuyen(NEW.doi_tuong_id);
  ELSIF NEW.pham_vi = 'HO_SO_TIN_DUNG' THEN
    SELECT h.khach_hang INTO tieu_de_dt FROM public.ct2_ho_so_tin_dung h WHERE h.id = NEW.doi_tuong_id;
    ds_nhan := public.ct2_ds_nhan_ho_so(NEW.doi_tuong_id, true);
    nhan_doi_tuong := 'Hồ sơ';
  ELSIF NEW.pham_vi = 'THE_KANBAN' THEN
    SELECT c.title, public.ct2_tuyen_cua_nguoi(c.profile_id) INTO tieu_de_dt, ds_nhan
      FROM public.kanban_cards c WHERE c.id = NEW.doi_tuong_id;
    -- «Hành động:» chứ không phải «Việc:» — thẻ Kanban là hành động phát triển (CT3),
    -- nhãn này là thứ duy nhất giúp push/chuông tách được CT3 khỏi đầu việc CT2
    nhan_doi_tuong := 'Hành động';
  ELSIF NEW.pham_vi = 'DAU_AN' THEN
    SELECT m.title, public.ct2_tuyen_cua_nguoi(m.profile_id) INTO tieu_de_dt, ds_nhan
      FROM public.leadership_marks m WHERE m.id = NEW.doi_tuong_id;
    nhan_doi_tuong := 'Dấu ấn';
  END IF;
  IF NEW.cha_id IS NOT NULL THEN
    SELECT ds_nhan || b.nguoi_gui INTO ds_nhan FROM public.ct2_binh_luan b WHERE b.id = NEW.cha_id;
  END IF;
  ds_nhan := COALESCE(ds_nhan, '{}') || COALESCE(NEW.nhac_ten, '{}');
  SELECT COALESCE(ARRAY(SELECT DISTINCT x FROM unnest(ds_nhan) AS x WHERE x IS NOT NULL), '{}') INTO ds_nhan;
  FOREACH nguoi IN ARRAY ds_nhan LOOP
    IF public.ct2_dat_thong_bao('N12', nguoi,
         CASE WHEN nguoi = ANY(COALESCE(NEW.nhac_ten, '{}'))
              THEN ten_nguoi_gui || ' — nhắc tên anh/chị'
              ELSE ten_nguoi_gui || ' — trao đổi' END,
         nhan_doi_tuong || ': ' || public.ct2_cat(tieu_de_dt, 70)
           || E'\nTrao đổi: ' || COALESCE(public.ct2_cat(NEW.noi_dung, 160), '(trống)')
           || CASE WHEN NEW.can_tra_loi THEN E'\n❗ Cần trả lời' ELSE '' END,
         'NHE',
         CASE WHEN NEW.pham_vi = 'DAU_VIEC' THEN NEW.doi_tuong_id ELSE NULL END,
         CASE WHEN NEW.pham_vi = 'HO_SO_TIN_DUNG' THEN NEW.doi_tuong_id ELSE NULL END
       ) THEN co_gui := true; END IF;
  END LOOP;
  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- ============ 2) Bằng chứng dấu ấn: tiêu đề thôi lặp chữ «dấu ấn» ============
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_bang_chung()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
         COALESCE(ten_nguoi, 'Đồng nghiệp') || ' — bồi bằng chứng',
         'Dấu ấn: ' || public.ct2_cat(COALESCE(tieu_de_mark, 'dấu ấn'), 70)
           || E'\n' || COALESCE('Phần ' || NEW.phan_star || ': ', 'Nội dung: ')
           || COALESCE(public.ct2_cat(NEW.noi_dung, 140), '(trống)'),
         'NHE', NULL) THEN co_gui := true; END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

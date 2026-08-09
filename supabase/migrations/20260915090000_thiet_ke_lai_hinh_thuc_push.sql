-- THIẾT KẾ LẠI HÌNH THỨC THÔNG BÁO ĐẨY (09/08/2026) — theo ảnh màn hình khóa GĐ gửi:
-- format cũ nối «tên việc · trạng thái · 25%» thành một chuỗi, tên việc dài nuốt sạch
-- chỗ, phần trăm và các dấu «·» chen giữa rất khó nhìn. Ba thứ người đọc cần tách bạch
-- — TÊN VIỆC, NGƯỜI BÁO, NỘI DUNG — thì dính vào nhau.
--
-- Chuẩn mới, áp THỐNG NHẤT cho cả notify-kanban-update (CT3, sửa cùng đợt) lẫn 4 hàm
-- soạn tin dưới đây:
--   Tiêu đề  = <Tên người> — <hành động + tiến độ nếu có>     (ngắn, không gãy dòng;
--              notify-ct2 tự thêm 🟡/🔴/⛔ theo mức ở đầu)
--   Thân tin = mỗi dòng một nhãn:
--              Việc|Hồ sơ|Dấu ấn: <tên đối tượng, cắt 70>
--              Nội dung|Trao đổi: <điều người đó viết, cắt 140–160>
--              ⚠️/❗ <cảnh báo>                                (chỉ khi có)
--
-- Chuông trong ứng dụng hiển thị noi_dung bằng whitespace-pre-wrap (Ct2ChuongThongBao)
-- nên các dòng này xuống dòng đúng ở cả hai nơi.
--
-- CHỈ đổi chuỗi tieu_de/noi_dung — tuyệt đối không đụng logic chọn người nhận,
-- mức tin, hay điều kiện kích hoạt của bất kỳ hàm nào.

-- Cắt chuỗi có dấu ba chấm — dùng chung cho mọi hàm soạn tin, để độ dài cắt nằm một chỗ.
CREATE OR REPLACE FUNCTION public.ct2_cat(_s text, _max int)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _s IS NULL THEN NULL
    WHEN length(btrim(_s)) <= _max THEN btrim(_s)
    ELSE left(btrim(_s), _max - 1) || '…'
  END
$$;

-- ============ 1) Nhịp đầu việc (Chiêu thức 2) ============
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_nhip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE ten_nguoi text; tieu_de_dv text; ds uuid[]; nguoi uuid; co_gui boolean := false;
BEGIN
  SELECT p.full_name INTO ten_nguoi FROM public.profiles p WHERE p.id = NEW.nguoi_ghi;
  SELECT d.tieu_de INTO tieu_de_dv FROM public.ct2_dau_viec d WHERE d.id = NEW.dau_viec_id;

  -- MỌI nhịp đi đủ tuyến phụ trách, không phân biệt màu cờ nữa.
  ds := public.ct2_ds_nhan_khi_co_chuyen(NEW.dau_viec_id);

  FOREACH nguoi IN ARRAY ds LOOP
    IF public.ct2_dat_thong_bao('NHIP', nguoi,
         COALESCE(ten_nguoi, 'Đồng nghiệp')
           || CASE WHEN NEW.co_tinh_trang = 'DO' THEN ' — báo ĐANG VƯỚNG'
                   WHEN NEW.co_tinh_trang = 'VANG' THEN ' — báo có rủi ro'
                   ELSE ' — ghi nhịp' || COALESCE(' ' || NEW.phan_tram || '%', '') END,
         'Việc: ' || public.ct2_cat(COALESCE(tieu_de_dv, 'đầu việc'), 70)
           || E'\nNội dung: ' || COALESCE(public.ct2_cat(NEW.noi_dung, 140), '(không ghi chú)')
           || COALESCE(E'\n⚠️ Vướng: ' || public.ct2_cat(NEW.vuong_mac, 100), ''),
         CASE WHEN NEW.co_tinh_trang = 'DO' THEN 'DO' ELSE 'NHE' END,
         NEW.dau_viec_id) THEN co_gui := true; END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- ============ 2) Nhịp hồ sơ tín dụng ============
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
         COALESCE(ten_nguoi, 'Đồng nghiệp') || ' — ghi nhịp hồ sơ',
         'Hồ sơ: ' || public.ct2_cat(COALESCE(ten_kh, 'hồ sơ tín dụng'), 70)
           || E'\nNội dung: ' || COALESCE(public.ct2_cat(NEW.noi_dung, 140), '(không ghi chú)')
           || COALESCE(E'\n⚠️ Vướng: ' || public.ct2_cat(NEW.vuong_mac, 100), ''),
         'NHE', NULL, NEW.ho_so_id) THEN co_gui := true; END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- ============ 3) Trao đổi / bình luận ============
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

-- ============ 4) Bồi bằng chứng dấu ấn (BHY Mark) ============
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
         COALESCE(ten_nguoi, 'Đồng nghiệp') || ' — bồi bằng chứng dấu ấn',
         'Dấu ấn: ' || public.ct2_cat(COALESCE(tieu_de_mark, 'dấu ấn'), 70)
           || E'\n' || COALESCE('Phần ' || NEW.phan_star || ': ', 'Nội dung: ')
           || COALESCE(public.ct2_cat(NEW.noi_dung, 140), '(trống)'),
         'NHE', NULL) THEN co_gui := true; END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

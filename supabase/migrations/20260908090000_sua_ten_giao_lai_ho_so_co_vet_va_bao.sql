-- ─────────────────────────────────────────────────────────────────────────────
-- SỬA TÊN KHÁCH / GIAO LẠI HỒ SƠ: GHI VẾT + BÁO NGƯỜI ĐƯỢC GIAO
--
-- Đề xuất của Trưởng phòng KHDN (08/2026): lãnh đạo phòng cần sửa được
-- tên/nội dung của công việc. Rà lại hai bàn:
--   · Đầu việc Kanban: đã đủ đường — «Sửa thông tin thẻ» (tiêu đề, người,
--     ngày, ưu tiên) và «Sửa kế hoạch làm» (kết quả · mục tiêu · cách làm),
--     cả hai đều mở cho lãnh đạo phòng.
--   · Hồ sơ PDTD: trigger f_ct2_hs_truoc_sua vốn ĐÃ cho lãnh đạo phòng đổi
--     khach_hang / can_bo / loai_ho_so — nhưng client không có ô nhập nào,
--     nên quyền nằm chết trong DB. Đợt này client mở ô sửa; migration này
--     vá hai chỗ DB còn khuyết đi kèm:
--
-- 1. NHẬT KÝ: f_ct2_hs_truoc_sua chỉ ghi vết trang_thai / so_tien /
--    han_xu_ly. Đổi TÊN KHÁCH HÀNG hay ĐỔI CÁN BỘ phụ trách — hai thay đổi
--    nặng ký nhất về trách nhiệm — lại không để vết nào. Thêm hai khối log.
--
-- 2. THÔNG BÁO: f_ct2_thong_bao_ho_so chỉ báo cán bộ khi hồ sơ được MỞ MỚI
--    (HS_GIAO ở nhánh INSERT). Giao lại hồ sơ đang chạy cho người khác thì
--    người mới không nhận được gì — hồ sơ đổi chủ trong im lặng là hồ sơ
--    không ai làm. Thêm nhánh UPDATE: can_bo đổi → báo người mới.
--
-- CREATE OR REPLACE (không DROP) — giữ nguyên ACL. Toàn văn hai hàm chép lại
-- từ production, phần thêm đánh dấu «-- MỚI».
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.f_ct2_hs_truoc_sua()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  la_lanh_dao boolean := public.ct2_sua_duoc_phong(OLD.phong);
  la_can_bo boolean := (public.get_my_profile_id() = OLD.can_bo);
  thieu text[];
BEGIN
  IF auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NOT la_lanh_dao AND NOT la_can_bo THEN
    RAISE EXCEPTION 'Anh/chị không có quyền sửa hồ sơ này';
  END IF;

  IF NOT la_lanh_dao AND (
       (NEW.so_tien IS DISTINCT FROM OLD.so_tien AND OLD.so_tien IS NOT NULL)
    OR NEW.cap_phe_duyet IS DISTINCT FROM OLD.cap_phe_duyet
    OR NEW.can_bo IS DISTINCT FROM OLD.can_bo
    OR NEW.khach_hang IS DISTINCT FROM OLD.khach_hang) THEN
    RAISE EXCEPTION 'Đổi khách hàng, số tiền, cấp phê duyệt hay cán bộ phụ trách cần lãnh đạo Phòng';
  END IF;

  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    IF NEW.trang_thai = 'DEN_HAN_GHTD' THEN
      RAISE EXCEPTION 'Cột «Đến hạn GHTD» là điểm xuất phát — hồ sơ đã bắt đầu không quay lại được. Cần dừng thì dùng Từ chối/Dừng.';
    END IF;

    IF OLD.trang_thai = 'DEN_HAN_GHTD' THEN
      IF NEW.trang_thai NOT IN ('THU_THAP','TU_CHOI') THEN
        RAISE EXCEPTION 'Từ cột dự kiến chỉ đi sang «Thu thập hồ sơ» — chưa thu thập thì chưa có gì để trình';
      END IF;
      IF NEW.trang_thai = 'THU_THAP' THEN
        thieu := ARRAY[]::text[];
        IF NEW.so_tien IS NULL THEN thieu := array_append(thieu, 'số tiền'); END IF;
        IF NEW.han_xu_ly IS NULL THEN thieu := array_append(thieu, 'hạn xử lý'); END IF;
        IF NEW.ky_han IS NULL THEN thieu := array_append(thieu, 'kỳ hạn'); END IF;
        IF array_length(thieu, 1) > 0 THEN
          RAISE EXCEPTION 'Bắt tay làm thì cần điền % — thẻ dự kiến chưa có các thông tin này',
            array_to_string(thieu, ' · ');
        END IF;
        NEW.ngay_nhan := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
      END IF;
    END IF;

    IF NEW.trang_thai = 'TRINH_TSC' AND NEW.cap_phe_duyet <> 'TSC' THEN
      RAISE EXCEPTION 'Hồ sơ này thuộc thẩm quyền % — không trình lên cấp PDTD Trụ sở chính', OLD.cap_phe_duyet;
    END IF;

    IF NEW.trang_thai = 'HOAN_THANH' AND OLD.trang_thai NOT IN ('HOAN_THIEN_GN','HOAN_THANH') THEN
      RAISE EXCEPTION 'Chưa qua bước «Hoàn thiện hồ sơ giải ngân» — không thể chốt Hoàn thành';
    END IF;

    IF NEW.trang_thai = 'TU_CHOI' THEN
      IF NOT la_lanh_dao THEN
        RAISE EXCEPTION 'Chỉ lãnh đạo Phòng được chuyển hồ sơ sang Từ chối/Dừng';
      END IF;
      IF COALESCE(char_length(trim(NEW.ly_do_tu_choi)), 0) < 20 THEN
        RAISE EXCEPTION 'Từ chối/dừng hồ sơ phải ghi rõ lý do (tối thiểu 20 ký tự)';
      END IF;
    END IF;

    IF NEW.trang_thai IN ('TRINH_LDP','TRINH_LDCN','TRINH_TSC') THEN
      IF NEW.nguoi_dang_giu IS NULL AND NEW.trang_thai <> 'TRINH_TSC' THEN
        RAISE EXCEPTION 'Trình cấp trên phải chọn người đang giữ hồ sơ — để đồng hồ chờ tính đúng người';
      END IF;
      NEW.giu_tu := COALESCE(NEW.giu_tu, now());
    ELSE
      NEW.nguoi_dang_giu := NULL;
      NEW.giu_tu := NULL;
    END IF;

    IF NEW.trang_thai = 'HOAN_THANH' THEN
      NEW.ngay_hoan_thanh := COALESCE(NEW.ngay_hoan_thanh, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
    END IF;

    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'trang_thai', OLD.trang_thai, NEW.trang_thai, public.get_my_profile_id());
  END IF;

  IF NEW.so_tien IS DISTINCT FROM OLD.so_tien THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'so_tien', OLD.so_tien::text, NEW.so_tien::text, public.get_my_profile_id());
  END IF;
  IF NEW.han_xu_ly IS DISTINCT FROM OLD.han_xu_ly THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'han_xu_ly', OLD.han_xu_ly::text, NEW.han_xu_ly::text, public.get_my_profile_id());
  END IF;

  -- MỚI: đổi tên khách hàng và đổi cán bộ phụ trách là hai thay đổi nặng ký
  -- nhất về trách nhiệm — phải để vết như trạng thái và số tiền
  IF NEW.khach_hang IS DISTINCT FROM OLD.khach_hang THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'khach_hang', OLD.khach_hang, NEW.khach_hang, public.get_my_profile_id());
  END IF;
  IF NEW.can_bo IS DISTINCT FROM OLD.can_bo THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'can_bo', OLD.can_bo::text, NEW.can_bo::text, public.get_my_profile_id());
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $function$;

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
           || COALESCE(to_char(NEW.han_xu_ly, 'DD/MM/YYYY'), 'chưa đặt') || '.', 'NHE', NULL)
    THEN co_gui := true; END IF;
  ELSE
    -- MỚI: giao lại hồ sơ đang chạy — người mới phải biết ngay, cùng mã
    -- HS_GIAO với lúc mở hồ sơ vì với người nhận đây chính là được giao việc
    IF NEW.can_bo IS DISTINCT FROM OLD.can_bo THEN
      IF public.ct2_dat_thong_bao('HS_GIAO', NEW.can_bo, 'Hồ sơ tín dụng được giao lại cho anh/chị',
           NEW.khach_hang || ' — ' || tien || ', hạn xử lý '
             || COALESCE(to_char(NEW.han_xu_ly, 'DD/MM/YYYY'), 'chưa đặt') || '.', 'NHE', NULL)
      THEN co_gui := true; END IF;
    END IF;

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

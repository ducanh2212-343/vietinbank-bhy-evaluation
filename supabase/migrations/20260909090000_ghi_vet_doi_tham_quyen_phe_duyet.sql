-- ─────────────────────────────────────────────────────────────────────────────
-- GHI VẾT ĐỔI THẨM QUYỀN PHÊ DUYỆT GHTD
--
-- Phản ánh của cán bộ (07/08/2026): «Tại Kanban PDTD, LĐP hiện tại không sửa
-- được lựa chọn Thẩm quyền phê duyệt GHTD — ví dụ Cty Đại Lợi cán bộ chọn
-- thẩm quyền Chi nhánh nên các bước luân chuyển hồ sơ sai, LĐP không sửa được.»
--
-- Rà lại: trigger f_ct2_hs_truoc_sua VỐN ĐÃ cho lãnh đạo phòng đổi
-- cap_phe_duyet (chỉ chặn cán bộ thường) — nhưng client không có ô nhập,
-- thẩm quyền chỉ hiện dạng chữ tĩnh trên đầu hộp thoại. Cùng mẫu hình với
-- tên khách/cán bộ ở đợt 20260908090000: quyền nằm chết trong DB.
--
-- Client đợt này mở ô «Thẩm quyền phê duyệt GHTD» trong mục Bổ sung / sửa
-- thông tin (chỉ lãnh đạo thấy). Migration này vá chỗ khuyết đi kèm: đổi
-- thẩm quyền là đổi ĐƯỜNG LUÂN CHUYỂN của khoản vay — buocKeTiep tính lại,
-- cửa Trình TSC mở/đóng theo nó — mà trước giờ không để vết nào trong
-- ct2_nhat_ky_thay_doi. Thêm khối log, cùng khuôn với khach_hang/can_bo.
--
-- CREATE OR REPLACE (không DROP) — giữ nguyên ACL. Toàn văn hàm chép lại từ
-- production, phần thêm đánh dấu «-- MỚI».
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

  IF NEW.khach_hang IS DISTINCT FROM OLD.khach_hang THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'khach_hang', OLD.khach_hang, NEW.khach_hang, public.get_my_profile_id());
  END IF;
  IF NEW.can_bo IS DISTINCT FROM OLD.can_bo THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'can_bo', OLD.can_bo::text, NEW.can_bo::text, public.get_my_profile_id());
  END IF;

  -- MỚI: đổi thẩm quyền phê duyệt là đổi đường luân chuyển của khoản vay —
  -- phải để vết như trạng thái và số tiền
  IF NEW.cap_phe_duyet IS DISTINCT FROM OLD.cap_phe_duyet THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'cap_phe_duyet', OLD.cap_phe_duyet, NEW.cap_phe_duyet, public.get_my_profile_id());
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $function$;

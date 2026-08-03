-- ============================================================================
-- CHIÊU THỨC 2 — PDTD: cán bộ BỔ SUNG được số tiền còn trống
--
-- Sau khi nhập 47 hồ sơ từ Miro, 16 hồ sơ đang chạy không có số tiền. Trigger
-- f_ct2_hs_truoc_sua đang coi MỌI thay đổi so_tien là "đổi số liệu tài chính"
-- và bắt phải là lãnh đạo Phòng — kể cả khi ô đang TRỐNG. Hệ quả: 16 con số
-- chỉ 2 lãnh đạo điền được, thành nút cổ chai đúng đợt cần bổ sung nhất.
--
-- ĐIỀN một sự thật còn thiếu khác với ĐỔI một con số đã có:
--   · Trống → có số   : cán bộ phụ trách làm được (họ là người biết số nhất),
--                       và lần điền vẫn lưu vết như mọi lần đổi.
--   · Có số → số khác : vẫn chỉ lãnh đạo — như cũ.
--   · Có số → trống   : không ai được (trg_ct2_hs_khong_xoa_so_lieu đã chặn).
--
-- Khách hàng, cấp phê duyệt, cán bộ phụ trách: giữ nguyên luật cũ, chỉ lãnh
-- đạo — các trường này không có trạng thái "trống" hợp lệ để mà bổ sung.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.f_ct2_hs_truoc_sua()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2hu$
DECLARE
  la_lanh_dao boolean := public.ct2_sua_duoc_phong(OLD.phong);
  la_can_bo boolean := (public.get_my_profile_id() = OLD.can_bo);
BEGIN
  IF auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NOT la_lanh_dao AND NOT la_can_bo THEN
    RAISE EXCEPTION 'Anh/chị không có quyền sửa hồ sơ này';
  END IF;

  -- Dữ liệu rủi ro tài chính: chỉ lãnh đạo đổi. NGOẠI LỆ DUY NHẤT: cán bộ
  -- được BỔ SUNG số tiền khi ô đang trống (hồ sơ nhập từ dữ liệu lịch sử).
  IF NOT la_lanh_dao AND (
       (NEW.so_tien IS DISTINCT FROM OLD.so_tien AND OLD.so_tien IS NOT NULL)
    OR NEW.cap_phe_duyet IS DISTINCT FROM OLD.cap_phe_duyet
    OR NEW.can_bo IS DISTINCT FROM OLD.can_bo
    OR NEW.khach_hang IS DISTINCT FROM OLD.khach_hang) THEN
    RAISE EXCEPTION 'Đổi khách hàng, số tiền, cấp phê duyệt hay cán bộ phụ trách cần lãnh đạo Phòng';
  END IF;

  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
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

  NEW.updated_at := now();
  RETURN NEW;
END $ct2hu$;

REVOKE ALL ON FUNCTION public.f_ct2_hs_truoc_sua() FROM PUBLIC, anon, authenticated;

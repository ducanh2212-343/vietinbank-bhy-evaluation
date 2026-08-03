-- Công cụ dò cán bộ từ tên người đề xuất trên phiếu BHY Ideas.
-- Dùng cho việc gán đúng công đổi mới sáng tạo về từng cán bộ (xem migration
-- 20260820090000): nhiều phiếu gửi bằng tài khoản dùng chung của phòng nên
-- không thể căn cứ email người gửi.

-- Bỏ dấu + gộp khoảng trắng/dấu chấm, không phân biệt hoa thường.
-- normalize(NFC) trước vì vài chuỗi mang từ cổng cũ để dấu ở dạng tách rời (NFD).
CREATE OR REPLACE FUNCTION public.bhy_chuan_hoa_ten(_ten TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE STRICT SET search_path = public AS $fn$
  SELECT lower(btrim(regexp_replace(
    translate(
      normalize(_ten, NFC),
      'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ',
      'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'),
    '[\s.]+', ' ', 'g')))
$fn$;

-- Ideas dùng tên phòng rút gọn ('Phòng KHBL'), bảng departments dùng tên đầy đủ
-- ('Phòng Bán lẻ') — bắc cầu giữa hai hệ tên để so khớp được.
CREATE OR REPLACE FUNCTION public.bhy_phong_ideas_sang_ho_so(_phong TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $fn$
  SELECT CASE _phong
    WHEN 'Ban Giám Đốc'   THEN 'Ban Giám đốc'
    WHEN 'Phòng KHBL'     THEN 'Phòng Bán lẻ'
    WHEN 'Phòng DVKH'     THEN 'Phòng Dịch vụ khách hàng'
    WHEN 'Phòng TCTH'     THEN 'Phòng Tổ chức Tổng hợp'
    WHEN 'Phòng HTTD'     THEN 'Phòng Hỗ trợ tín dụng'
    WHEN 'PGD Khoái Châu' THEN 'Phòng giao dịch Khoái Châu'
    WHEN 'PGD Văn Lâm'    THEN 'Phòng giao dịch Văn Lâm'
    WHEN 'PGD Văn Giang'  THEN 'Phòng giao dịch Văn Giang'
    WHEN 'PGD Ân Thi'     THEN 'Phòng giao dịch Ân Thi'
    WHEN 'PGD Yên Mỹ'     THEN 'Phòng giao dịch Yên Mỹ'
    ELSE _phong
  END
$fn$;

-- Tìm cán bộ theo tên người đề xuất. Phiếu nhóm ('A, B, C') lấy người đứng đầu.
-- Trùng tên (chi nhánh đang có 2 chị Nguyễn Thị Phượng — TCTH và PGD Ân Thi) thì
-- phân giải bằng phòng ghi trên phiếu; vẫn không tách được thì trả NULL để người
-- nhập tự quyết, không đoán bừa.
CREATE OR REPLACE FUNCTION public.bhy_tim_can_bo_theo_ten(_ten TEXT, _phong_ideas TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql STABLE SET search_path = public AS $fn$
DECLARE
  _khoa TEXT;
  _phong TEXT;
  _so_khop INTEGER;
  _id UUID;
BEGIN
  IF _ten IS NULL OR btrim(_ten) = '' THEN RETURN NULL; END IF;
  _khoa := bhy_chuan_hoa_ten(split_part(_ten, ',', 1));
  IF _khoa = '' THEN RETURN NULL; END IF;
  _phong := bhy_phong_ideas_sang_ho_so(_phong_ideas);

  SELECT count(*) INTO _so_khop FROM public.profiles p
  WHERE p.status = 'active' AND bhy_chuan_hoa_ten(p.full_name) = _khoa;

  IF _so_khop = 1 THEN
    SELECT p.user_id INTO _id FROM public.profiles p
    WHERE p.status = 'active' AND bhy_chuan_hoa_ten(p.full_name) = _khoa;
    RETURN _id;
  ELSIF _so_khop > 1 AND _phong IS NOT NULL THEN
    SELECT p.user_id INTO _id FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.status = 'active' AND bhy_chuan_hoa_ten(p.full_name) = _khoa AND d.name = _phong;
    RETURN _id; -- NULL nếu phòng cũng không tách được
  END IF;
  RETURN NULL;
END;
$fn$;

REVOKE ALL ON FUNCTION public.bhy_tim_can_bo_theo_ten(TEXT, TEXT) FROM PUBLIC, anon;

COMMENT ON FUNCTION public.bhy_tim_can_bo_theo_ten(TEXT, TEXT) IS
  'Dò hồ sơ cán bộ từ tên người đề xuất trên phiếu BHY Ideas (bỏ dấu, phiếu nhóm lấy người đầu, trùng tên phân giải bằng phòng).';

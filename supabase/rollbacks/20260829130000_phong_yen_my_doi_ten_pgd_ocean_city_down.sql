-- Trả ánh xạ Ideas ↔ hồ sơ về tên danh bạ cũ và nhãn phiếu Sao về 'Phòng Yên Mỹ'.
CREATE OR REPLACE FUNCTION public.bhy_phong_ideas_sang_ho_so(_phong text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

UPDATE public.star_records SET department = 'Phòng Yên Mỹ'
WHERE department = 'PGD Ocean City';

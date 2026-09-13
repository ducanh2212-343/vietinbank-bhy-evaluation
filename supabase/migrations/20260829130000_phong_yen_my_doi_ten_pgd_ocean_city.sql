-- Phòng Yên Mỹ chuyển trụ sở, danh bạ đã đổi tên thành "Phòng giao dịch Ocean
-- City" (cùng một đơn vị). Cầu nối Ideas ↔ hồ sơ đang trỏ về tên cũ nên phiếu
-- Ideas của phòng này không khớp danh bạ nữa — cập nhật ánh xạ. Nhãn lưu trong
-- dữ liệu Ideas ('PGD Yên Mỹ') giữ nguyên, việc đổi nhãn hiển thị Ideas là việc
-- riêng (đụng dữ liệu phiếu + cấu hình site).
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
    WHEN 'PGD Yên Mỹ'     THEN 'Phòng giao dịch Ocean City'
    ELSE _phong
  END
$function$;

-- Nhãn phân loại trên phiếu Sao: quy 14 phiếu cũ về nhãn mới để bảng thi đua
-- không tách một phòng làm hai dòng. Trường name (lời phiếu) giữ nguyên lịch sử.
UPDATE public.star_records SET department = 'PGD Ocean City'
WHERE department = 'Phòng Yên Mỹ';

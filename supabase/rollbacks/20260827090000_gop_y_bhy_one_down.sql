-- Gỡ tính năng góp ý cải thiện hệ thống BHY One.
--
-- LƯU Ý VẬN HÀNH: xoá bảng là mất toàn bộ góp ý cán bộ đã gửi và trạng thái xử
-- lý của Phòng TCTH. Kết xuất Excel trước khi chạy nếu còn cần lưu vết.
-- Chạy file gỡ của đợt đính kèm ảnh (20260929090000_..._down.sql) TRƯỚC file này.

DROP FUNCTION IF EXISTS public.gop_y_cap_nhat_trang_thai(uuid, text);

DROP TRIGGER IF EXISTS update_portal_gop_y_updated_at ON public.portal_gop_y;

DROP TABLE IF EXISTS public.portal_gop_y;

-- Hàm quyền xoá SAU bảng: policy của bảng còn tham chiếu tới nó
DROP FUNCTION IF EXISTS public.la_nguoi_duyet_gop_y(uuid);

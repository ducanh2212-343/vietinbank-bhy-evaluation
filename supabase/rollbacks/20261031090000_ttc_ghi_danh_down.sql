-- Gỡ đợt 14 (thêm học viên nhanh). Thành viên đã được thêm/duyệt VẪN GIỮ ở
-- ttc_thanh_vien — chỉ bỏ bảng yêu cầu, mã lớp và các hàm.
DROP FUNCTION IF EXISTS public.ttc_them_thanh_vien_hang_loat(uuid, uuid[], text);
DROP FUNCTION IF EXISTS public.ttc_duyet_ghi_danh(uuid, boolean, text);
DROP FUNCTION IF EXISTS public.ttc_xin_ghi_danh(text);
DROP FUNCTION IF EXISTS public.ttc_xem_ma_ghi_danh(text);
DROP FUNCTION IF EXISTS public.ttc_mo_ghi_danh(uuid, boolean, boolean);
DROP TABLE IF EXISTS public.ttc_ghi_danh;
DROP INDEX IF EXISTS public.ttc_chuong_trinh_ma_ghi_danh_idx;
ALTER TABLE public.ttc_chuong_trinh DROP COLUMN IF EXISTS ma_ghi_danh, DROP COLUMN IF EXISTS ghi_danh_tu_duyet;
-- Bốn hàm kiểm quyền: bản vá coalesce GIỮ NGUYÊN khi gỡ — trả về bản trả NULL là mở lại lỗ hổng.

-- GỠ: bỏ ghi nhận lượt sử dụng Bắc Hưng Yên FDI Hub.
--
-- Xoá bảng là mất lịch sử lượt xem đã tích luỹ (không nạp lại được) — chụp
-- lại trước khi xoá. Trang FDI Hub tự chạy tiếp không cần bảng: hook ghi lượt
-- nuốt lỗi «bảng chưa có», tab Thống kê hiện dòng nhắc chưa áp migration.
CREATE TABLE IF NOT EXISTS public.fdi_hub_luu_luot_xem_20261022 AS
  SELECT * FROM public.fdi_hub_luot_xem;
ALTER TABLE public.fdi_hub_luu_luot_xem_20261022 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fdi_hub_luu_luot_xem_20261022 FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.fdi_hub_thong_ke(date, date);
DROP FUNCTION IF EXISTS public.fdi_hub_xem_thong_ke_duoc(uuid);
DROP FUNCTION IF EXISTS public.fdi_hub_ghi_luot_xem(text);
DROP TABLE IF EXISTS public.fdi_hub_luot_xem;

-- GỠ: bỏ dòng thời gian Bắc Hưng Yên Connect.
--
-- Xoá bảng là mất lịch sử hoạt động do KHDN/TCTH ghi tay sau khi áp — chụp lại
-- trước khi xoá để còn nạp lại (4 dòng nạp sẵn thì migration nạp lại được).
CREATE TABLE IF NOT EXISTS public.connect_luu_dong_thoi_gian_20261021 AS
  SELECT * FROM public.connect_dong_thoi_gian;
ALTER TABLE public.connect_luu_dong_thoi_gian_20261021 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.connect_luu_dong_thoi_gian_20261021 FROM anon, authenticated;

DROP TRIGGER IF EXISTS connect_dong_thoi_gian_truoc_ghi ON public.connect_dong_thoi_gian;
DROP FUNCTION IF EXISTS public.f_connect_dong_thoi_gian_truoc_ghi();
DROP TABLE IF EXISTS public.connect_dong_thoi_gian;
DROP FUNCTION IF EXISTS public.connect_soan_duoc(uuid);

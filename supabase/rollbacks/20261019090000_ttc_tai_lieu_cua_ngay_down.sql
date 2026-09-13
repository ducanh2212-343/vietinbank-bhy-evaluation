-- GỠ: bỏ tài liệu của ngày.
--
-- Xoá cột là mất luôn danh sách tài liệu đã phát; các tệp vẫn nằm trong kho
-- bhy-training nhưng không còn đường nào tìm ra. Chụp lại trước khi xoá.
CREATE TABLE IF NOT EXISTS public.ttc_luu_tai_lieu_20261019 AS
  SELECT id AS ngay_id, tai_lieu FROM public.ttc_ngay WHERE jsonb_array_length(tai_lieu) > 0;
ALTER TABLE public.ttc_luu_tai_lieu_20261019 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ttc_luu_tai_lieu_20261019 FROM anon, authenticated;

DROP TRIGGER IF EXISTS ttc_ngay_truoc_ghi ON public.ttc_ngay;
DROP FUNCTION IF EXISTS public.f_ttc_ngay_truoc_ghi();
ALTER TABLE public.ttc_ngay DROP COLUMN IF EXISTS tai_lieu;

-- ttc_nhan_ban_chuong_trinh: bản trước nằm ở
-- supabase/migrations/20261015090000_ttc_bao_khi_hoan_thanh.sql (mục 2) — nội
-- dung y hệt bản này trừ phần ghi chú, nên không cần dựng lại.

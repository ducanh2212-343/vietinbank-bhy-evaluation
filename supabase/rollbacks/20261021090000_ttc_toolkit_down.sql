-- GỠ: bỏ bảng bản vẽ Toolkit. Xoá bảng là mất mọi sơ đồ tư duy, ma trận, bản vẽ
-- tay học viên đã làm — ảnh PNG xem trước vẫn nằm trong kho bhy-training nhưng
-- không còn đường nào tìm ra. Chụp lại trước khi xoá.
CREATE TABLE IF NOT EXISTS public.ttc_luu_toolkit_20261021 AS SELECT * FROM public.ttc_toolkit;
ALTER TABLE public.ttc_luu_toolkit_20261021 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ttc_luu_toolkit_20261021 FROM anon, authenticated;

DROP TABLE IF EXISTS public.ttc_toolkit;
DROP FUNCTION IF EXISTS public.f_ttc_toolkit_truoc_ghi();

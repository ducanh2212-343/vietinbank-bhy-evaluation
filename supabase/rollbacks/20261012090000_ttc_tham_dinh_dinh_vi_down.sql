-- Gỡ 20261012090000_ttc_tham_dinh_dinh_vi.sql
-- Không bật lại luồng định vị cho lớp đã bị đưa về chỉ QR: bật lại một luồng
-- chưa thẩm định là đúng thứ migration này sinh ra để ngăn.

DROP TRIGGER IF EXISTS ttc_chuong_trinh_truoc_sua ON public.ttc_chuong_trinh;
DROP FUNCTION IF EXISTS public.f_ttc_chuong_trinh_truoc_sua();
DROP FUNCTION IF EXISTS public.ttc_bat_dinh_vi(jsonb);
DROP FUNCTION IF EXISTS public.ttc_thu_dinh_vi(uuid, double precision, double precision, int, text);
DROP FUNCTION IF EXISTS public.ttc_dinh_vi_da_tham_dinh(uuid, int);
DROP FUNCTION IF EXISTS public.ttc_so_lan_thu_toi_thieu();

DROP POLICY IF EXISTS "ttc xem thu dinh vi" ON public.ttc_thu_dinh_vi;
DROP POLICY IF EXISTS "ttc xoa thu dinh vi" ON public.ttc_thu_dinh_vi;
DROP TABLE IF EXISTS public.ttc_thu_dinh_vi;

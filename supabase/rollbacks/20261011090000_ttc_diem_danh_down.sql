-- Gỡ 20261011090000_ttc_diem_danh.sql
-- Xoá bảng là xoá luôn lịch sử điểm danh đã ghi — chỉ chạy khi thật sự bỏ tính năng.

DROP POLICY IF EXISTS "ttc xem diem danh" ON public.ttc_diem_danh;
DROP POLICY IF EXISTS "ttc xoa diem danh" ON public.ttc_diem_danh;
DROP POLICY IF EXISTS "ttc xem ma qr" ON public.ttc_qr_ngay;

DROP FUNCTION IF EXISTS public.ttc_diem_danh_ghi_ho(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.ttc_cap_ma_qr(uuid, boolean);
DROP FUNCTION IF EXISTS public.ttc_diem_danh_qr(text, double precision, double precision, int);
DROP FUNCTION IF EXISTS public.ttc_diem_danh_dinh_vi(uuid, double precision, double precision, int);
DROP FUNCTION IF EXISTS public.ttc_ghi_diem_danh(uuid, uuid, text, double precision, double precision, int, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.ttc_ngay_hom_nay(uuid);
DROP FUNCTION IF EXISTS public.ttc_khoang_cach_m(double precision, double precision, double precision, double precision);

DROP TABLE IF EXISTS public.ttc_diem_danh;
DROP TABLE IF EXISTS public.ttc_qr_ngay;

ALTER TABLE public.ttc_chuong_trinh DROP COLUMN IF EXISTS diem_danh;

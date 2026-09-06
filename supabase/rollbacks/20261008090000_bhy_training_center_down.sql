-- Gỡ Bắc Hưng Yên Training Center (đảo của 20261008090000_bhy_training_center.sql).
-- Xoá cả dữ liệu chương trình 10 ngày đã nạp — sao lưu trước nếu đã có tiến độ thật.

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('ttc-nhac-sap-trinh-bay')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ttc-nhac-sap-trinh-bay');
    PERFORM cron.unschedule('ttc-nhac-con-viec')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ttc-nhac-con-viec');
  END IF;
END $cron$;

DROP FUNCTION IF EXISTS public.ttc_nhac_con_viec();
DROP FUNCTION IF EXISTS public.ttc_nhac_sap_trinh_bay();
DROP TRIGGER IF EXISTS ttc_sau_cham_bloom ON public.ttc_diem_bloom;
DROP FUNCTION IF EXISTS public.f_ttc_sau_cham_bloom();
DROP TRIGGER IF EXISTS ttc_sau_tich_tien_do ON public.ttc_tien_do;
DROP FUNCTION IF EXISTS public.f_ttc_sau_tich_tien_do();
DROP FUNCTION IF EXISTS public.ttc_bao_cho_vai(uuid, text[], text, text, text, text);
DROP FUNCTION IF EXISTS public.ttc_kanban_hoc_vien(uuid, uuid);
DROP FUNCTION IF EXISTS public.ttc_nhan_ban_chuong_trinh(uuid, text, date);
DROP TRIGGER IF EXISTS ttc_sau_tao_chuong_trinh ON public.ttc_chuong_trinh;
DROP FUNCTION IF EXISTS public.f_ttc_sau_tao_chuong_trinh();
DROP FUNCTION IF EXISTS public.ttc_trang_thai_suy_ngam(uuid);
DROP FUNCTION IF EXISTS public.ttc_trang_thai_tu_soi(uuid);
DROP TRIGGER IF EXISTS ttc_goi_dau_truoc_sua ON public.ttc_viec_goi_dau;
DROP FUNCTION IF EXISTS public.f_ttc_goi_dau_truoc_sua();

DROP TABLE IF EXISTS public.ttc_viec_goi_dau;
DROP TABLE IF EXISTS public.ttc_suy_ngam;
DROP TABLE IF EXISTS public.ttc_tu_soi;
DROP TABLE IF EXISTS public.ttc_diem_bloom;
DROP TABLE IF EXISTS public.ttc_tien_do;
DROP TABLE IF EXISTS public.ttc_dau_viec;
DROP TABLE IF EXISTS public.ttc_ngay;
DROP TABLE IF EXISTS public.ttc_thanh_vien;
DROP TABLE IF EXISTS public.ttc_chuong_trinh;

DROP FUNCTION IF EXISTS public.ttc_ct_cua_dau_viec(uuid);
DROP FUNCTION IF EXISTS public.ttc_ct_cua_ngay(uuid);
DROP FUNCTION IF EXISTS public.ttc_la_bgd(uuid);
DROP FUNCTION IF EXISTS public.ttc_la_nguoi_cham(uuid);
DROP FUNCTION IF EXISTS public.ttc_la_quan_tri(uuid);
DROP FUNCTION IF EXISTS public.ttc_la_thanh_vien(uuid);
DROP FUNCTION IF EXISTS public.ttc_vai(uuid);

-- Tin đã sinh trong hàng đợi chung giữ nguyên lịch sử; xoá nếu muốn sạch hẳn:
-- DELETE FROM public.ct2_thong_bao WHERE ma_su_kien LIKE 'TTC_%';

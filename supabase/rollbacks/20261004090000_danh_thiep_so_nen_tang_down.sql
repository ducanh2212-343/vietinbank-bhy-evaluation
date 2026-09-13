-- Gỡ toàn bộ nền tảng danh thiếp số (giai đoạn 1). Xoá cả dữ liệu từ điển,
-- hồ sơ thẻ, nhật ký quét và ảnh trong kho — chỉ chạy khi thật sự bỏ phân hệ.

SELECT cron.unschedule('nc-thu-hoi-chuc-danh-het-han')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nc-thu-hoi-chuc-danh-het-han');

DROP POLICY IF EXISTS "nc anh: ai cung xem" ON storage.objects;
DROP POLICY IF EXISTS "nc anh: chu the hoac TCTH tai len" ON storage.objects;
DROP POLICY IF EXISTS "nc anh: chu the hoac TCTH ghi de" ON storage.objects;
DROP POLICY IF EXISTS "nc anh: chu the hoac TCTH xoa" ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'nc-danh-thiep';
DELETE FROM storage.buckets WHERE id = 'nc-danh-thiep';

DROP FUNCTION IF EXISTS public.nc_so_can_bo_theo_chuc_danh();
DROP FUNCTION IF EXISTS public.nc_thu_hoi_chuc_danh_het_han();
DROP FUNCTION IF EXISTS public.nc_duyet_chuc_danh_rieng(UUID, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.nc_thu_hoi_the(UUID, TEXT);
DROP FUNCTION IF EXISTS public.nc_phat_hanh_the(UUID);
DROP FUNCTION IF EXISTS public.nc_ghi_nhat_ky_quet(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.nc_resolve_card(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.nc_chuoi_don_vi(TEXT);
DROP FUNCTION IF EXISTS public.nc_goi_6_ngon_ngu(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

DROP TABLE IF EXISTS public.nc_cau_hinh;
DROP TABLE IF EXISTS public.nc_audit;
DROP TABLE IF EXISTS public.nc_scan_log;
DROP TABLE IF EXISTS public.nc_card;
DROP TABLE IF EXISTS public.nc_channel;
ALTER TABLE IF EXISTS public.nc_staff DROP CONSTRAINT IF EXISTS nc_staff_custom_title_fk;
DROP TABLE IF EXISTS public.nc_custom_title;
DROP TABLE IF EXISTS public.nc_staff;
DROP TABLE IF EXISTS public.nc_title;
DROP TABLE IF EXISTS public.nc_org_unit;

DROP FUNCTION IF EXISTS public.nc_ghi_audit();
DROP FUNCTION IF EXISTS public.nc_chan_cot_cua_can_bo();
DROP FUNCTION IF EXISTS public.nc_kiem_can_bo();
DROP FUNCTION IF EXISTS public.nc_tao_slug(TEXT);
DROP FUNCTION IF EXISTS public.nc_mau_the(public.nc_employment_type);
DROP FUNCTION IF EXISTS public.nc_la_nguoi_duyet(UUID);
DROP FUNCTION IF EXISTS public.nc_la_quan_tri(UUID);

DROP TYPE IF EXISTS public.nc_channel_type;
DROP TYPE IF EXISTS public.nc_approval_status;
DROP TYPE IF EXISTS public.nc_title_scope;
DROP TYPE IF EXISTS public.nc_employment_type;
DROP TYPE IF EXISTS public.nc_lang;

-- Giữ lại extension unaccent: vô hại và có thể đã được nơi khác dùng.

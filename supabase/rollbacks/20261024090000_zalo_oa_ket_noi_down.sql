-- Gỡ 20261024090000: bỏ nền kết nối Zalo OA.
-- Token đang sống sẽ mất theo bảng — muốn nối lại phải lấy oauth_code mới trên
-- Zalo Developers. Bí mật 'zalo_app_secret_key' trong Vault KHÔNG bị xóa ở đây
-- (xóa tay nếu muốn: delete from vault.secrets where name = 'zalo_app_secret_key').
SELECT cron.unschedule('zalo-gia-han-token');
DROP FUNCTION IF EXISTS public.zalo_co_bi_mat();
DROP FUNCTION IF EXISTS public.zalo_dat_bi_mat(text);
DROP FUNCTION IF EXISTS public.push_thong_ke(integer);
DROP FUNCTION IF EXISTS public.zalo_tong_quan();
DROP FUNCTION IF EXISTS public.zalo_canh_bao_quan_tri(text, text);
DROP FUNCTION IF EXISTS public.zalo_giu_khoa_gia_han();
DROP FUNCTION IF EXISTS public.zalo_lay_bi_mat(text);
DROP TABLE IF EXISTS public.zalo_nhat_ky;
DROP TABLE IF EXISTS public.zalo_cau_hinh;
DROP TABLE IF EXISTS public.zalo_token;

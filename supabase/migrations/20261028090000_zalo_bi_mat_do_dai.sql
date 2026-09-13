-- Trang Quản trị Zalo cho biết Secret key đã nạp DÀI BAO NHIÊU ký tự (13/09/2026).
--
-- Vì sao: ba lần nạp token sáng 13/09 đều bị Zalo trả «Invalid secret key» mà
-- trang chỉ nói «đã nạp». Không đọc ngược được giá trị (đúng), nhưng độ dài và
-- dạng ký tự đủ để nhận ra copy nhầm (dãy «••••», thiếu ký tự, dính khoảng
-- trắng) ngay trên trang, không cần kỹ thuật tra Vault.
-- Đổi kiểu trả về nên phải DROP rồi tạo lại.
DROP FUNCTION IF EXISTS public.zalo_co_bi_mat();
CREATE OR REPLACE FUNCTION public.zalo_co_bi_mat()
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
       'co', true,
       'do_dai', length(decrypted_secret),
       'chu_so_thuan', decrypted_secret ~ '^[A-Za-z0-9]+$',
       'cap_nhat_luc', updated_at)
       FROM vault.decrypted_secrets WHERE name = 'zalo_app_secret_key' LIMIT 1),
    jsonb_build_object('co', false));
$$;
REVOKE ALL ON FUNCTION public.zalo_co_bi_mat() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zalo_co_bi_mat() TO authenticated;

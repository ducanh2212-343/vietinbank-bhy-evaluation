-- Gỡ 20261028090000: zalo_co_bi_mat trở lại trả boolean.
DROP FUNCTION IF EXISTS public.zalo_co_bi_mat();
CREATE OR REPLACE FUNCTION public.zalo_co_bi_mat()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'zalo_app_secret_key');
$$;
REVOKE ALL ON FUNCTION public.zalo_co_bi_mat() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zalo_co_bi_mat() TO authenticated;

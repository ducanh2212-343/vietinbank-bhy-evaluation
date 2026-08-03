-- Danh bạ cán bộ tối giản cho ô chọn người đề xuất / đồng đề xuất của BHY Ideas.
-- RLS bảng profiles chỉ cho cán bộ thường xem hồ sơ của chính mình, trong khi form
-- cần danh sách để chọn. Hàm này chỉ trả HỌ TÊN + PHÒNG (không email, không điện
-- thoại, không ngày sinh) và chỉ phục vụ tài khoản cán bộ — khách đối tác không gọi được.
CREATE OR REPLACE FUNCTION public.bhy_danh_ba_can_bo()
RETURNS TABLE (user_id UUID, ho_ten TEXT, phong TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $fn$
  SELECT p.user_id, p.full_name, COALESCE(d.name, '')
  FROM public.profiles p
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE p.status = 'active'
    AND p.user_id IS NOT NULL
    AND public.is_staff(auth.uid())
  ORDER BY p.full_name;
$fn$;

REVOKE ALL ON FUNCTION public.bhy_danh_ba_can_bo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_danh_ba_can_bo() TO authenticated;

COMMENT ON FUNCTION public.bhy_danh_ba_can_bo() IS
  'Danh bạ tối giản (họ tên + phòng) cho ô chọn người đề xuất của BHY Ideas; chỉ cán bộ gọi được.';

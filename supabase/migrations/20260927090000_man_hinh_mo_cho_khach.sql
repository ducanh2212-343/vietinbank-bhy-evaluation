-- Màn hình mở cho khách đối tác — chọn được từng tài khoản.
--
-- Trước đây quyền xem của guest đóng cứng trong mã nguồn (cờ `guestVisible` của
-- cây điều hướng): mở thêm một màn hình cho đối tác là phải sửa code và phát
-- hành lại, mà đã mở là mở cho MỌI khách. Nay mỗi dòng guest_access mang danh
-- sách mã màn hình; Phòng TCTH tự chọn ở màn «Quản trị tài khoản khách».
--
-- Bộ mã phải trùng với src/lib/manHinhKhach.ts và
-- supabase/functions/_shared/guestScreens.ts.

ALTER TABLE public.guest_access
  ADD COLUMN allowed_screens TEXT[] NOT NULL
  DEFAULT ARRAY['trang-chu', 'tin-tuc', 'sharing', 'connect']::TEXT[];

-- Khách đã cấp trước đợt này giữ nguyên đúng những gì họ vẫn xem được
UPDATE public.guest_access
   SET allowed_screens = ARRAY['trang-chu', 'tin-tuc', 'sharing', 'connect']::TEXT[]
 WHERE allowed_screens IS NULL OR cardinality(allowed_screens) = 0;

-- Mã lạ bị chặn ngay tại bảng: màn hình đã gỡ hoặc gõ nhầm không nằm im trong
-- dữ liệu chờ ngày trùng tên một màn hình khác. Trang chủ là cửa vào — luôn có.
ALTER TABLE public.guest_access
  ADD CONSTRAINT guest_access_allowed_screens_hop_le CHECK (
    'trang-chu' = ANY(allowed_screens)
    AND allowed_screens <@ ARRAY[
      'trang-chu', 'tin-tuc', 'sharing', 'connect', 'cay-ky-uc',
      'ghi-nhan', 'credit-360', 'ideas', 'bhy-3806'
    ]::TEXT[]
  );

COMMENT ON COLUMN public.guest_access.allowed_screens IS
  'Mã các màn hình cổng ONE khách được xem (danh mục: src/lib/manHinhKhach.ts)';

-- Helper cho RLS: khách còn hạn VÀ được mở đúng màn hình này.
-- SECURITY DEFINER như guest_active — tránh đệ quy RLS khi đọc guest_access.
CREATE OR REPLACE FUNCTION public.guest_screen_allowed(_user_id UUID, _screen TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_guest(_user_id) AND EXISTS (
    SELECT 1 FROM public.guest_access
     WHERE user_id = _user_id
       AND expires_at > now()
       AND _screen = ANY(allowed_screens)
  );
$$;

-- Cây Ký Ức: ấn phẩm nằm trong bảng riêng + bucket private, nên mở màn hình
-- thôi chưa đủ — không có hai policy này khách vào chỉ thấy trang trắng.
DROP POLICY "Staff can view published ky yeu" ON public.ky_yeu_an_pham;
CREATE POLICY "Staff or invited guests can view published ky yeu"
  ON public.ky_yeu_an_pham FOR SELECT TO authenticated
  USING (
    (public.is_staff(auth.uid()) AND trang_thai = 'xuat_ban')
    OR (public.guest_screen_allowed(auth.uid(), 'cay-ky-uc') AND trang_thai = 'xuat_ban')
    OR has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

DROP POLICY "Staff can view ky-yeu objects" ON storage.objects;
CREATE POLICY "Staff or invited guests can view ky-yeu objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ky-yeu' AND (
      public.is_staff(auth.uid())
      OR public.guest_screen_allowed(auth.uid(), 'cay-ky-uc')
    )
  );

-- Gỡ «màn hình mở cho khách»: quay lại quyền xem đóng cứng trong mã nguồn.
DROP POLICY IF EXISTS "Staff or invited guests can view ky-yeu objects" ON storage.objects;
CREATE POLICY "Staff can view ky-yeu objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ky-yeu' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff or invited guests can view published ky yeu" ON public.ky_yeu_an_pham;
CREATE POLICY "Staff can view published ky yeu"
  ON public.ky_yeu_an_pham FOR SELECT TO authenticated
  USING (
    (public.is_staff(auth.uid()) AND trang_thai = 'xuat_ban')
    OR has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

DROP FUNCTION IF EXISTS public.guest_screen_allowed(UUID, TEXT);

ALTER TABLE public.guest_access DROP CONSTRAINT IF EXISTS guest_access_allowed_screens_hop_le;
ALTER TABLE public.guest_access DROP COLUMN IF EXISTS allowed_screens;

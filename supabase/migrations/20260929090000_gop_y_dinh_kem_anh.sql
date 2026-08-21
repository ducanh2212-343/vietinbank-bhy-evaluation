-- Góp ý BHY One: đính kèm ảnh chụp lỗi
--
-- Hai cán bộ cùng đề nghị việc này trong chính hòm góp ý (Phạm Thị Diễm Ly
-- 06/08, Trần Hà Trang 14/08 — «tải ảnh báo lỗi để Admin nhìn cho rõ»).
--
-- Ảnh KHÔNG để chung bucket `bhy-one`: policy đọc của bucket đó là
-- `is_staff(auth.uid())` cho MỌI object, trong khi ảnh chụp lỗi Kanban PDTD
-- chứa tên khách hàng và hạn mức tín dụng. Dựng bucket riêng, chỉ người gửi
-- và người duyệt góp ý đọc được.

-- ---------------------------------------------------------------------------
-- 1) Cột lưu đường dẫn ảnh trên phiếu góp ý
-- ---------------------------------------------------------------------------
-- Mảng text (không phải jsonb): chỉ là danh sách path, không có cấu trúc gì thêm.
ALTER TABLE public.portal_gop_y
  ADD COLUMN IF NOT EXISTS anh TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.portal_gop_y.anh IS
  'Đường dẫn ảnh trong bucket bhy-gop-y, dạng <user_id>/<uuid>.jpg — tối đa 3 ảnh/phiếu (chặn ở client)';

-- ---------------------------------------------------------------------------
-- 2) Bucket riêng cho ảnh góp ý
-- ---------------------------------------------------------------------------
-- Trần 3 MB/file là hàng rào phía SERVER: client đã nén về ~1600px/JPEG 0.75
-- (thường 150–400 KB), nhưng không được tin mỗi lớp client.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bhy-gop-y', 'bhy-gop-y', false, 3145728,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Nhân tiện đặt trần cho bucket bhy-one — đang để NULL (không giới hạn).
UPDATE storage.buckets SET file_size_limit = 10485760
WHERE id = 'bhy-one' AND file_size_limit IS NULL;

-- ---------------------------------------------------------------------------
-- 3) Quyền trên ảnh góp ý — hẹp hơn hẳn bucket bhy-one
-- ---------------------------------------------------------------------------
-- Đường dẫn có dạng <user_id>/<uuid>.jpg nên thư mục cấp 1 chính là chủ ảnh,
-- cùng khuôn với bucket avatars.
CREATE POLICY "Can bo tai anh gop y cua minh"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bhy-gop-y'
    AND public.is_staff(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Nguoi gui hoac nguoi duyet xem anh gop y"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'bhy-gop-y'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.la_nguoi_duyet_gop_y(auth.uid())
    )
  );

-- Xoá góp ý thì xoá ảnh kèm (Storage không cascade theo dòng bảng, client tự gọi)
CREATE POLICY "Nguoi gui hoac nguoi duyet xoa anh gop y"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'bhy-gop-y'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.la_nguoi_duyet_gop_y(auth.uid())
    )
  );

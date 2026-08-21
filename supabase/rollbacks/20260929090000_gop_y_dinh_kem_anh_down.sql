-- Gỡ đính kèm ảnh cho góp ý BHY One.
--
-- LƯU Ý VẬN HÀNH: xoá cột `anh` là mất vĩnh viễn đường dẫn tới ảnh cán bộ đã
-- gửi. Nếu chỉ muốn tắt tính năng, hãy gỡ phần giao diện chứ đừng chạy file này.
-- Ảnh trong bucket phải xoá TRƯỚC, vì sau khi mất cột thì không còn biết ảnh nào
-- thuộc góp ý nào (bucket vẫn có thể còn ảnh của phiếu đã xoá dở).

DELETE FROM storage.objects WHERE bucket_id = 'bhy-gop-y';

DROP POLICY IF EXISTS "Can bo tai anh gop y cua minh" ON storage.objects;
DROP POLICY IF EXISTS "Nguoi gui hoac nguoi duyet xem anh gop y" ON storage.objects;
DROP POLICY IF EXISTS "Nguoi gui hoac nguoi duyet xoa anh gop y" ON storage.objects;

DELETE FROM storage.buckets WHERE id = 'bhy-gop-y';

ALTER TABLE public.portal_gop_y DROP COLUMN IF EXISTS anh;

-- Trần 10MB đặt cho bucket bhy-one KHÔNG gỡ lại: trước đó là "không giới hạn",
-- trả về trạng thái đó là dựng lại đúng lỗ hổng mà migration này vá.

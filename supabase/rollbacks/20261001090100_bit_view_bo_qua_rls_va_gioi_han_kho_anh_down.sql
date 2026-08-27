-- GỠ bản vá view + giới hạn kho ảnh.
--
-- CẢNH BÁO: chạy tệp này là mở lại cho người lạ đọc hai view, và cho phép tải tệp
-- bất kỳ (kể cả .html/.svg) lên hai kho ảnh CÔNG KHAI.
ALTER VIEW public.ct2_suc_khoe_kho_cau  SET (security_invoker = false);
ALTER VIEW public.ct2_hieu_qua_theo_nhom SET (security_invoker = false);
GRANT SELECT ON public.ct2_suc_khoe_kho_cau  TO anon, authenticated;
GRANT SELECT ON public.ct2_hieu_qua_theo_nhom TO anon, authenticated;

UPDATE storage.buckets
   SET file_size_limit = NULL,
       allowed_mime_types = NULL
 WHERE id IN ('avatars','skill-images');

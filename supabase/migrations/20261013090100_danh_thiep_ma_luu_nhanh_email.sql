-- Mã lưu nhanh: cán bộ chọn có đưa email vào mã hay không (null = không).
-- Thêm email là mã dày thêm khoảng một bậc, nên mặc định không đưa; cán bộ bật
-- khi hay gặp khách cần gửi hồ sơ qua thư.
ALTER TABLE public.nc_staff
  ADD COLUMN IF NOT EXISTS qr_nhanh_email TEXT
    CHECK (qr_nhanh_email IS NULL OR qr_nhanh_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$');
COMMENT ON COLUMN public.nc_staff.qr_nhanh_email IS 'Email đưa vào mã lưu nhanh; null = không đưa';

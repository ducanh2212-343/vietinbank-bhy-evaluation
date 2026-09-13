-- Làm rõ 13/09/2026: email KHÔNG đưa vào mã QR lưu nhanh (mã chỉ tên + số để
-- thưa, khách có tuổi quét nhanh); cột này chỉ là email in lên mẫu name card.
COMMENT ON COLUMN public.nc_staff.qr_nhanh_email IS 'Email in lên mẫu name card của mã lưu nhanh; KHÔNG đưa vào mã QR. null = không in';

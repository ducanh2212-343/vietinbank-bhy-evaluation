-- ============================================================================
-- DANH THIẾP SỐ — mã lưu nhanh (vCard nhúng thẳng vào QR, không cần mạng).
--
-- Khách có tuổi ở hội trường đền bù giải phóng mặt bằng dùng nhiều loại máy rẻ
-- tiền; mã đường dẫn của thẻ đa ngôn ngữ cần mạng và thêm hai bước nên không
-- hợp. Cán bộ TỰ đặt tên hiện trong danh bạ khách (có dấu hay không dấu tuỳ
-- thực tế máy khách ở địa bàn) và chọn số điện thoại đưa vào mã.
--
-- Hai cột này cán bộ được tự sửa: trigger nc_chan_cot_cua_can_bo liệt kê cột
-- CẤM chứ không liệt kê cột cho phép, nên không cần sửa trigger.
-- ============================================================================
ALTER TABLE public.nc_staff
  ADD COLUMN IF NOT EXISTS qr_nhanh_ten TEXT
    CHECK (qr_nhanh_ten IS NULL OR length(btrim(qr_nhanh_ten)) BETWEEN 3 AND 80),
  ADD COLUMN IF NOT EXISTS qr_nhanh_sdt TEXT
    CHECK (qr_nhanh_sdt IS NULL OR qr_nhanh_sdt ~ '^\+?[0-9]{9,15}$');

COMMENT ON COLUMN public.nc_staff.qr_nhanh_ten IS 'Tên hiện trong danh bạ khách khi quét mã lưu nhanh (cán bộ tự đặt, gồm tiền tố VietinBank - )';
COMMENT ON COLUMN public.nc_staff.qr_nhanh_sdt IS 'Số điện thoại trong mã lưu nhanh, đã chuẩn hoá chỉ chữ số (và dấu + nếu quốc tế)';

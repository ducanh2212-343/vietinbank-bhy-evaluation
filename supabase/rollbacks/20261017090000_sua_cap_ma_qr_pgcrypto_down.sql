-- GỠ: trả ttc_cap_ma_qr về search_path chỉ có `public`.
--
-- CẢNH BÁO: trên project whlysprzsguehxmrjwha, pgcrypto nằm ở schema
-- `extensions`, nên bản này KHÔNG cấp được mã QR — đó chính là lỗi mà migration
-- xuôi đi sửa. Chỉ dùng khi chuyển sang một project có pgcrypto cài vào public
-- và muốn siết search_path lại cho chặt.
ALTER FUNCTION public.ttc_cap_ma_qr(uuid, boolean) SET search_path = public;

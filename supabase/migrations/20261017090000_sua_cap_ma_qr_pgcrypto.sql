-- ---------------------------------------------------------------------------
-- SỬA LỖI KHÔNG TẠO ĐƯỢC MÃ QR ĐIỂM DANH (07/09/2026)
--
-- Triệu chứng: bấm «Tạo QR» ở màn Quản trị → Điểm danh thì không ra mã. Đếm
-- trên database thật: ttc_qr_ngay có 0 dòng — chưa lần nào cấp được mã kể từ
-- khi tính năng lên hệ thống.
--
-- Nguyên nhân: ttc_cap_ma_qr sinh mã bằng gen_random_bytes(12) của pgcrypto.
-- Trên project này pgcrypto cài ở schema `extensions`, không phải `public`; hàm
-- lại khai `SET search_path = public` (đúng chuẩn bảo mật của repo) nên không
-- tìm thấy gen_random_bytes và ném lỗi ngay trước khi ghi được dòng nào.
--
-- Không tự phát hiện được lúc chạy thử vì cụm Postgres cục bộ có
-- `CREATE EXTENSION pgcrypto` mặc định vào public — chỗ lệch giữa hai môi
-- trường. Từ nay: hàm nào dùng tới pgcrypto phải khai cả `extensions` trong
-- search_path.
--
-- Vẫn giữ `public` đứng trước để hàm chạy đúng ở cả nơi cài pgcrypto vào public,
-- và để mọi bảng ttc_* vẫn phân giải như cũ.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_cap_ma_qr(_ngay_id uuid, _cap_lai boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  ct uuid := public.ttc_ct_cua_ngay(_ngay_id);
  ma_cu text;
  ma_moi text;
BEGIN
  IF ct IS NULL THEN RAISE EXCEPTION 'Không thấy ngày học này'; END IF;
  IF NOT public.ttc_sua_duoc_noi_dung(ct) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổng hợp và Ban Giám đốc của chương trình mới cấp được mã QR';
  END IF;

  SELECT ma INTO ma_cu FROM public.ttc_qr_ngay WHERE ngay_id = _ngay_id AND NOT vo_hieu LIMIT 1;
  IF ma_cu IS NOT NULL AND NOT _cap_lai THEN RETURN ma_cu; END IF;
  UPDATE public.ttc_qr_ngay SET vo_hieu = true WHERE ngay_id = _ngay_id AND NOT vo_hieu;

  -- 12 byte ngẫu nhiên → base64 → bỏ ký tự dễ lẫn khi đọc tay và ký tự phải
  -- thoát trên URL. Còn 16 ký tự, đủ để không dò được bằng cách thử.
  ma_moi := translate(encode(gen_random_bytes(12), 'base64'), '+/=', '-_');
  INSERT INTO public.ttc_qr_ngay (ngay_id, ma, nguoi_tao) VALUES (_ngay_id, ma_moi, public.get_my_profile_id());
  RETURN ma_moi;
END $$;
REVOKE ALL ON FUNCTION public.ttc_cap_ma_qr(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_cap_ma_qr(uuid, boolean) TO authenticated;

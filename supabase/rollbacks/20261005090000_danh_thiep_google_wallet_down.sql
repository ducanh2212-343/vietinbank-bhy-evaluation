-- Gỡ cấu hình Google Wallet của phân hệ danh thiếp.
-- Không đụng tới ba khoá cấu hình gốc (logo_enabled, card_base_url,
-- lien_he_khi_thu_hoi) vì chúng thuộc migration nền tảng.

DELETE FROM public.nc_cau_hinh
 WHERE khoa IN ('google_wallet_bat', 'google_wallet_issuer_id', 'google_wallet_class_suffix');

COMMENT ON TABLE public.nc_cau_hinh IS
  'Cấu hình cấp hệ thống của phân hệ danh thiếp (logo, gốc URL thẻ)';

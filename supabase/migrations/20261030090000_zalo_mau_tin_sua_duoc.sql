-- Mẫu tin Sao Xứng Đáng sửa được trên trang Quản trị Zalo (13/09/2026, GĐ yêu cầu
-- sau khi xem tin thật: các đề mục Người tặng / Vì đã / Kết quả nhìn không phân biệt).
-- NULL = dùng mẫu mặc định trong mã (supabase/functions/_shared/zaloSaoMau.ts).
INSERT INTO public.zalo_cau_hinh (khoa, gia_tri, mo_ta) VALUES
  ('mau_tin_ca_nhan', NULL, 'Mẫu tin sao cá nhân — mỗi dòng một đề mục, ô {ten}, {so_sao}, {nguoi_tang}, {ly_do}, {ket_qua}, {tich_luy}, {moc_qua}, {link}…; NULL = mặc định'),
  ('mau_tin_tap_the', NULL, 'Mẫu tin sao tập thể — cùng bộ ô; NULL = mặc định')
ON CONFLICT (khoa) DO NOTHING;

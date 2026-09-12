-- Điền cấu hình gói cước Zalo OA theo BẢNG GIÁ DỊCH VỤ OA (Zalo Business Solutions,
-- áp dụng từ 01/06/2026, giá đã gồm VAT) — Giám đốc gửi ngày 12/09/2026.
--
-- Chi nhánh dùng Gói Tăng trưởng. Những con số dưới đây là của bảng giá công bố,
-- KHÔNG phải hợp đồng thực — quản trị sửa lại trên trang Quản trị Zalo nếu khác
-- (mua kỳ năm thì ~208.000đ/tháng thay vì ~233.000đ/tháng của kỳ 6 tháng).
--
-- Điểm quan trọng với kênh Sao Xứng Đáng: tin nhắn OA gửi vào nhóm chat MIỄN PHÍ
-- tới 31/12/2026 (phí duy trì nhóm cũng không áp cho nhóm có sẵn theo gói). Sau
-- mốc đó Zalo tính theo đơn giá công bố — trang quản trị phải nhắc trước.
-- Chỉ thêm dữ liệu, không đổi cấu trúc.
INSERT INTO public.zalo_cau_hinh (khoa, gia_tri, mo_ta) VALUES
  ('goi_cuoc_ky_han', '6 tháng', 'Kỳ hạn gói đang mua (6 tháng: 1.400.000đ · 1 năm: 2.500.000đ)'),
  ('goi_cuoc_tin_nhom_mien_phi_den', '2026-12-31', 'Tin OA gửi vào nhóm chat miễn phí tới ngày này (bảng giá 01/06/2026)'),
  ('goi_cuoc_nhom_gmf_kem_goi', '1', 'Số nhóm GMF-100 có sẵn theo gói (Tăng trưởng: 1 · Toàn diện: 3)'),
  ('goi_cuoc_app_uy_quyen', '1', 'Số ứng dụng tối đa OA được ủy quyền (Tăng trưởng: 1 — ủy quyền app khác là BHY ONE mất quyền)'),
  ('goi_cuoc_nhan_su', '15', 'Số tài khoản nhân viên quản lý OA theo gói'),
  ('goi_cuoc_bang_gia_ap_dung', '2026-06-01', 'Bảng giá Zalo OA đang đối chiếu')
ON CONFLICT (khoa) DO NOTHING;

UPDATE public.zalo_cau_hinh
   SET gia_tri = COALESCE(gia_tri, '233000'),
       mo_ta = 'Phí gói mỗi tháng (VNĐ, gồm VAT). Bảng giá 01/06/2026: Tăng trưởng 1.400.000đ/6 tháng (~233.000đ/tháng) hoặc 2.500.000đ/năm (~208.000đ/tháng) — sửa theo hợp đồng thực',
       cap_nhat_luc = now()
 WHERE khoa = 'goi_cuoc_phi_thang';

UPDATE public.zalo_cau_hinh
   SET mo_ta = 'Hạn mức tin OA → nhóm mỗi tháng. Bảng giá 01/06/2026 KHÔNG đặt trần cho tin vào nhóm (500 tin/tháng là hạn mức tin tư vấn 1-1 ngoài 48h, không liên quan) — để trống',
       cap_nhat_luc = now()
 WHERE khoa = 'goi_cuoc_han_muc_tin_thang';

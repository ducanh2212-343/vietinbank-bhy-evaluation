-- App ID và callback URL của ứng dụng Zalo vào cấu hình (13/09/2026).
--
-- Vì sao: trang Quản trị Zalo trước đó lấy callback từ domain đang chạy
-- (window.location.origin). Cổng được phục vụ ở cả bachungyenone.com lẫn domain
-- workers.dev, mà Zalo chỉ chấp nhận callback khớp TỪNG KÝ TỰ với giá trị khai
-- trên Zalo Developers và domain đó phải đã xác thực — mở từ workers.dev là lỗi
-- -14003. Giá trị đúng phải nằm ở một chỗ quản trị sửa được, không phụ thuộc
-- máy nào đang mở trang. App ID cùng lý do: không viết cứng ở giao diện.
-- Chỉ thêm dữ liệu.
INSERT INTO public.zalo_cau_hinh (khoa, gia_tri, mo_ta) VALUES
  ('app_id', '298836022005112891', 'App ID ứng dụng «Bắc Hưng Yên One» trên Zalo for Developers'),
  ('callback_url', 'https://bachungyenone.com', 'Callback URL — phải khớp từng ký tự với «Thiết lập đường dẫn yêu cầu cấp quyền» trên Zalo Developers, domain đã xác thực')
ON CONFLICT (khoa) DO NOTHING;

-- Làm sạch dữ liệu Sao Xứng Đáng (bảng star_records) — 08/2026
--
-- Quy tắc chi nhánh xác nhận: SAO ĐƯỢC GHI NHẬN THEO SỐ SERIAL.
-- Mỗi số serial là một ngôi sao vật lý đã in và đóng số bằng tay, nên một số
-- serial chỉ được xuất hiện đúng một lần trong bảng.
--
-- Trước khi chạy: 141 phiếu / 146 sao / 6 serial bị dùng lại.
-- Sau khi chạy:   136 phiếu / 141 sao / 0 serial bị dùng lại.
--
-- Phần A áp dụng thay đổi. Phần B là script lùi lại nguyên trạng nếu cần.

-- ===========================================================================
-- A. ÁP DỤNG
-- ===========================================================================

-- A1. Chu Thị Thủy — giữ ĐỦ CẢ 2 SAO. Phiếu ngày 28/07 bị ghi nhầm số 194
--     (trùng với phiếu 29/05), số đúng là 184.
UPDATE public.star_records SET serial = '184'
WHERE id = '1605c759-de7d-4e7c-807d-a08b4fb8eee1';

-- A2. Năm phiếu nhập lặp — cùng cán bộ, cùng số serial, ghi hai lần.
--     Giữ bản ghi sớm nhất theo (awarded_on, created_at), xóa bản ghi sau.
DELETE FROM public.star_records WHERE id IN (
  '6fa77694-e1df-4a08-ad85-887ad174f9eb',  -- Trần Hà Trang,      serial 5,      01/07
  '74a08607-85a1-4d1a-b815-4555294abf47',  -- Đỗ Thị Bích Ngãi,   serial 000124, 23/04
  '445e59a9-9d3b-464a-809f-6333d639bfe6',  -- Hàn Thị Thùy Linh,  serial 210,    28/07
  'e9fd07e5-beb4-4276-b61c-621adcc37c79',  -- Nguyễn Mạnh Quân,   serial 220,    28/07
  '93496952-4818-4c42-89c6-89be3f7c658c'   -- Nguyễn Quốc Tân,    serial 000084, 12/06
);

-- ===========================================================================
-- B. LÙI LẠI (chỉ chạy nếu cần khôi phục nguyên trạng)
-- ===========================================================================

-- B1. Trả số serial của Chu Thị Thủy về giá trị cũ.
-- UPDATE public.star_records SET serial = '194'
-- WHERE id = '1605c759-de7d-4e7c-807d-a08b4fb8eee1';

-- B2. Chèn lại 5 bản ghi đã xóa, nguyên vẹn cả id và created_at.
-- INSERT INTO public.star_records
--   (id, name, department, stars, reason, result, awarded_on, sender, serial,
--    is_collective, source, created_by, created_at)
-- VALUES
--   ('6fa77694-e1df-4a08-ad85-887ad174f9eb', 'Trần Hà Trang', 'Phòng Bán lẻ', 1,
--    'Có sáng kiến cho việc Đọc-học tại Phòng đem lại phương pháp học mới, nâng cao tinh thần học tập',
--    '1', '2026-07-01', 'Mai Hải Quân', '5', false, 'import',
--    '3a2f683e-3bc3-4b98-aac9-25d32fc21bfd', '2026-08-03T08:23:49.998094+00:00'),
--   ('74a08607-85a1-4d1a-b815-4555294abf47', 'Đỗ Thị Bích Ngãi', 'Phòng Văn Lâm', 1,
--    'có thành tích huy động tăng 14 tỷ nguồn vốn trong tháng 4',
--    '1', '2026-04-23', 'Dương Thị Thanh Thuý', '000124', false, 'import',
--    '3a2f683e-3bc3-4b98-aac9-25d32fc21bfd', '2026-08-03T08:23:49.998094+00:00'),
--   ('445e59a9-9d3b-464a-809f-6333d639bfe6', 'Hàn Thị Thùy Linh', 'Phòng KHDN', 1,
--    'Có các sản phẩm chuyển đổi số trong chương trình Bac Hung Yen Ideas',
--    '1', '2026-07-28', 'Trần Đức Anh', '210', false, 'import',
--    '3a2f683e-3bc3-4b98-aac9-25d32fc21bfd', '2026-08-03T08:23:49.998094+00:00'),
--   ('e9fd07e5-beb4-4276-b61c-621adcc37c79', 'Nguyễn Mạnh Quân', 'Phòng DVKH', 1,
--    'Đã đóng góp tích cực cho Chương trình Kỷ niệm 20 năm thành lập Chi nhánh!',
--    '1', '2026-07-28', 'Trần Đức Anh', '220', false, 'import',
--    '3a2f683e-3bc3-4b98-aac9-25d32fc21bfd', '2026-08-03T08:23:49.998094+00:00'),
--   ('93496952-4818-4c42-89c6-89be3f7c658c', 'Nguyễn Quốc Tân', 'Phòng KHDN', 1,
--    'Bố trí thời gian giải ngân đúng tiến độ mang lại sự hài lòng góp phần vào trải nghiệm CX khách hàng, kết quả kinh doanh ngoại tệ lớn cho phòng và CN',
--    '1', '2026-06-12', 'Đỗ Việt Anh', '000084', false, 'import',
--    '3a2f683e-3bc3-4b98-aac9-25d32fc21bfd', '2026-08-03T08:23:49.998094+00:00');

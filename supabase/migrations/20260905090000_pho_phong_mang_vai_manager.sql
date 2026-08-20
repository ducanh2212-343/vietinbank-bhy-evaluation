-- ─────────────────────────────────────────────────────────────────────────────
-- PHÓ PHÒNG MANG VAI `manager` — lãnh đạo phòng không chỉ có một người
--
-- Phản ánh từ Phòng KHDN ngay ngày triển khai (06/08/2026): user Lãnh đạo
-- Phòng vào bàn Phê duyệt tín dụng «không thấy hồ sơ của CB nào», không nhìn
-- được cán bộ phụ trách, thêm thẻ không chọn được người, thẻ hiện hữu không
-- sửa / không chuyển luồng / không giao lại được.
--
-- Truy nguyên: cả bốn triệu chứng về MỘT gốc. Người phản ánh là PHÓ PHÒNG —
-- trong `user_roles` họ mang vai `employee`:
--   · RLS profiles chỉ cho employee thấy mình + tuyến trên → danh bạ phòng
--     trống, băng cán bộ trên bàn PDTD toàn «Chưa rõ cán bộ», picker giao
--     việc không có ai để chọn;
--   · `ct2_la_lanh_dao_phong()` đòi vai manager → mọi policy sửa/chuyển/giao
--     (ct2_dau_viec, ct2_ho_so_tin_dung) đóng cửa, client cũng giấu nút.
--
-- Hệ thống chỉ mới cấp vai manager cho TRƯỞNG phòng theo danh mục
-- `departments.manager_id`. Nhưng «lãnh đạo phòng» ngoài đời gồm cả Phó
-- phòng — họ điều phối việc, giao hồ sơ, duyệt nhịp y như Trưởng phòng.
-- Tiền lệ đã có sẵn trong danh bạ: Phó phòng TCTH Vũ Thị Năm được cấp
-- manager từ trước và dùng bình thường.
--
-- Cách chữa: mọi profile ĐANG HOẠT ĐỘNG có chức danh bắt đầu bằng «Phó phòng»
-- (kể cả Phó phòng giao dịch tại các PGD — cùng một nguyên tắc: chức danh
-- quyết định vai) đang mang vai employee thì nâng lên manager. Không đụng
-- người đã mang vai cao hơn (tcth_admin…), không đụng Kiểm soát viên —
-- kiểm soát không phải lãnh đạo phòng.
--
-- Lưu ý vận hành: đây là backfill dữ liệu, KHÔNG phải luật tự động. Khi thêm
-- nhân sự Phó phòng mới, màn Thêm cán bộ phải chọn vai «Quản lý» — nếu quên,
-- đúng bộ triệu chứng này sẽ quay lại với người mới.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.user_roles ur
SET role = 'manager'
FROM public.profiles p
JOIN public.positions pos ON pos.id = p.position_id
WHERE p.user_id = ur.user_id
  AND p.status = 'active'
  AND ur.role = 'employee'
  AND pos.name ILIKE 'Phó phòng%';

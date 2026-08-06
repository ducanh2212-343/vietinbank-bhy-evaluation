-- Giám đốc đặt được mốc giờ và lịch nghỉ — vá lỗ quyền, và đặt mốc GĐ yêu cầu
--
-- GĐ báo 06/08: bấm «Lưu mốc giờ» mà không lưu được.
--
-- Nguyên nhân: policy ghi của ct2_cau_hinh_thoi_gian chỉ nhận system_admin và
-- tcth_admin. Tài khoản Giám đốc mang vai `bgd` — trong khi client định nghĩa
-- isAdmin = ['bgd','tcth_admin','system_admin'] nên VẪN BÀY trang và nút Lưu.
-- Lại đúng cái bẫy của nguồn việc CHI_DAO: nới một bên, bên kia không biết.
--
-- Tệ hơn lần đó ở một điểm: PostgREST trả về UPDATE-0-dòng KHÔNG kèm lỗi, nên
-- giao diện báo «Đã lưu mốc giờ» — người dùng tin là xong, mở lại thấy số cũ,
-- và không có manh mối nào để đoán vì sao. (Phần client đã sửa để đếm số dòng
-- thực sự đổi và nói thẳng là thiếu quyền.)
--
-- Vá đúng HAI bảng của trang «Cài đặt ngày giờ» — đây là quyết định điều hành
-- của Chi nhánh: giờ giao ban và ngày nghỉ do Giám đốc chốt, không phải do
-- người viết phần mềm hay quản trị hệ thống chốt. Tám bảng còn lại cũng loại
-- `bgd` (nội dung cổng, ý tưởng, sao ghi nhận, khách mời…) CỐ Ý không đụng:
-- đó là các miền quản trị nội dung khác, mở thêm quyền là quyết định riêng,
-- phải hỏi trước chứ không kèm vào một bản vá lỗi.

DROP POLICY IF EXISTS "ct2 sua cau hinh gio" ON public.ct2_cau_hinh_thoi_gian;
CREATE POLICY "ct2 sua cau hinh gio" ON public.ct2_cau_hinh_thoi_gian
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'system_admin'::app_role)
      OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
      OR public.has_role(auth.uid(), 'bgd'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role)
      OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
      OR public.has_role(auth.uid(), 'bgd'::app_role));

DROP POLICY IF EXISTS "lich nghi sua" ON public.lich_nghi_le;
CREATE POLICY "lich nghi sua" ON public.lich_nghi_le
  FOR ALL
  USING (public.has_role(auth.uid(), 'system_admin'::app_role)
      OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
      OR public.has_role(auth.uid(), 'bgd'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role)
      OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
      OR public.has_role(auth.uid(), 'bgd'::app_role));

-- ---------------------------------------------------------------------------
-- Mốc giờ GĐ yêu cầu: trước 08:31 = đúng giờ; 08:31–08:44 = muộn; từ 08:45 = mất nhịp
-- ---------------------------------------------------------------------------
-- Khung «bảng sống» đóng lúc 08:45 — trùng đúng mốc hết ân hạn, nên người ghi
-- muộn nhất vẫn thấy bảng đang cập nhật. Không cần nới thêm.
UPDATE public.ct2_cau_hinh_thoi_gian
   SET gio_dung_gio = '08:31', gio_an_han = '08:45'
 WHERE id;

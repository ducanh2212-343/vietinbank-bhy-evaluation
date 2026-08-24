-- ============================================================================
-- 1) HAI "KHUNG NHÌN" BỎ QUA HÀNG RÀO RLS
--
-- ct2_suc_khoe_kho_cau và ct2_hieu_qua_theo_nhom được tạo không kèm
-- `security_invoker`, nên chúng chạy bằng quyền của CHỦ VIEW (postgres) và đọc
-- xuyên qua RLS của ct2_thong_bao, ct2_anh_chup_nhip — hai bảng vốn giới hạn theo
-- từng người nhận. Đo thực tế ngày 24/08: người lạ CHƯA ĐĂNG NHẬP đọc được
-- 11 và 7 dòng.
--
-- Hiện chỉ là số liệu tổng hợp theo nhóm (không lộ từng người), nhưng chỉ cần ai
-- đó thêm một cột hoặc đổi GROUP BY là thành rò dữ liệu từng cá nhân.
--
-- Vì sao CẮT HẲN quyền chứ không chỉ bật security_invoker: đã rà toàn bộ src/ và
-- supabase/functions/ — KHÔNG màn hình nào dùng hai view này. Chúng chỉ phục vụ
-- người vận hành soi sức khoẻ kho câu. Cắt quyền là cách chắc chắn nhất và không
-- đổi hành vi của bất kỳ tính năng nào cán bộ đang dùng.
-- ============================================================================
ALTER VIEW public.ct2_suc_khoe_kho_cau  SET (security_invoker = true);
ALTER VIEW public.ct2_hieu_qua_theo_nhom SET (security_invoker = true);

REVOKE ALL ON public.ct2_suc_khoe_kho_cau  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ct2_hieu_qua_theo_nhom FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ct2_suc_khoe_kho_cau  TO service_role;
GRANT SELECT ON public.ct2_hieu_qua_theo_nhom TO service_role;

-- ============================================================================
-- 2) HAI KHO ẢNH CÔNG KHAI KHÔNG GIỚI HẠN LOẠI TỆP
--
-- `avatars` và `skill-images` là kho public = true: ai có đường dẫn là xem được,
-- không cần đăng nhập và KHÔNG qua RLS. Cả hai lại không đặt allowed_mime_types
-- và file_size_limit, trong khi phần tải lên phía giao diện lấy đuôi tệp từ chính
-- tên người dùng đặt. Nghĩa là bất kỳ cán bộ nào cũng tải lên được .html/.svg tuỳ ý
-- rồi có ngay một địa chỉ công khai nằm trên hạ tầng gắn với ngân hàng — mồi lừa
-- đảo sẵn có.
--
-- CỐ Ý GIỮ heic/heif: ảnh chụp bằng iPhone mặc định là hai định dạng này. Bỏ chúng
-- ra là chặn luôn phần lớn cán bộ đổi ảnh đại diện bằng điện thoại — vá bảo mật mà
-- làm hỏng việc hằng ngày thì sẽ bị gỡ ra, không ai giữ.
-- Danh sách này phải giữ TRÙNG với LOAI_ANH_CHO_PHEP trong src/lib/anhTaiLen.ts.
-- ============================================================================
UPDATE storage.buckets
   SET file_size_limit = 5242880,  -- 5 MB
       allowed_mime_types = ARRAY[
         'image/jpeg','image/pjpeg','image/png','image/webp',
         'image/gif','image/heic','image/heif'
       ]
 WHERE id IN ('avatars','skill-images');

-- Nguồn việc «Chỉ đạo của cấp trên» — nút bấm được mà database từ chối
--
-- Đúng kiểu lỗi mà nguyên tắc «hàng rào thật ở database» sinh ra khi chỉ nới
-- một bên. 08/2026 Giám đốc yêu cầu thêm nguồn việc CHI_DAO (việc do cấp trên
-- chỉ đạo trực tiếp, ngoài kênh giao ban). Danh mục CT2_NGUON_VIEC phía client
-- đã thêm, nhưng CHECK constraint này vẫn giữ ba giá trị cũ.
--
-- Hệ quả với người dùng: chọn đúng cái ô mà ứng dụng mời chọn, bấm Lưu, rồi
-- nhận nguyên câu lỗi Postgres «violates check constraint ct2_nguon_viec_hop_le»
-- — không hiểu mình sai ở đâu và mất cả form vừa gõ.
ALTER TABLE public.ct2_dau_viec
  DROP CONSTRAINT IF EXISTS ct2_nguon_viec_hop_le;

ALTER TABLE public.ct2_dau_viec
  ADD CONSTRAINT ct2_nguon_viec_hop_le
  CHECK (nguon_viec = ANY (ARRAY['KE_HOACH'::text, 'GIAO_BAN'::text, 'CHU_DONG'::text, 'CHI_DAO'::text]));

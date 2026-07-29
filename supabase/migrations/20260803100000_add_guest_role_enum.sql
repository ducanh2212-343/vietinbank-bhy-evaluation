-- Vai trò khách (đối tác) có thời hạn — giá trị enum phải thêm ở migration riêng
-- (không được dùng trong cùng transaction tạo ra nó).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'guest';

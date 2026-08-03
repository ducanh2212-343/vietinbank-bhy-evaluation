-- Gắn lại QUẢN LÝ TRỰC TIẾP (manager_id) cho cán bộ chưa có TP — 03/08/2026.
--
-- Triệu chứng GĐ báo: cán bộ Phòng Hỗ trợ tín dụng cập nhật tiến độ hành động phát triển
-- (Chiêu thức 3) thì Giám đốc nhận push, trong khi luật chỉ định người nhận là TP + PGĐ.
--
-- Nguyên nhân: 5 hồ sơ Phòng HTTD có manager_id = NULL (không trỏ về TP Đinh Văn Vang).
-- notify-kanban-update giải chuỗi được đúng 1 người nhận (PGĐ) nên rơi vào nhánh dự phòng
-- "chưa đủ 2 cấp → thêm Giám đốc". Hệ quả kép:
--   1) GĐ nhận push của mọi cán bộ HTTD;
--   2) TP HTTD KHÔNG nhận gì — không push tức thì (không là manager của ai) và không có
--      trong digest sáng thứ Hai (weekly-kanban-digest chỉ lấy người xuất hiện ở manager_id
--      / pgd_id / vai trò lãnh đạo chi nhánh).
--
-- Phần logic đã được vá ở supabase/functions/notify-kanban-update (quyết theo chức danh,
-- cán bộ thiếu TP thì dừng ở PGĐ chứ không đôn lên GĐ). Migration này vá phần DỮ LIỆU để
-- TP HTTD nhận lại đúng thông báo của phòng mình.
--
-- Phạm vi: chỉ hồ sơ active, đang thiếu manager_id, KHÔNG phải chức danh trưởng phòng, và
-- phòng đó có đúng 1 trưởng phòng. Ban Giám đốc không có TP nên không khớp; các TP tự thân
-- bị loại. Đối chiếu ngày viết: khớp đúng 5 hồ sơ Phòng HTTD → Đinh Văn Vang.
-- Idempotent: chạy lại không đổi gì vì điều kiện manager_id IS NULL không còn thỏa.

WITH tp_phong AS (
  SELECT p.department_id,
         MIN(p.id::text)::uuid AS tp_id,
         COUNT(*) AS so_tp
  FROM public.profiles p
  WHERE p.status = 'active'
    AND lower(btrim(p.position)) LIKE 'trưởng phòng%'
    AND p.department_id IS NOT NULL
  GROUP BY p.department_id
)
UPDATE public.profiles c
SET manager_id = t.tp_id,
    updated_at = now()
FROM tp_phong t
WHERE c.department_id = t.department_id
  AND t.so_tp = 1
  AND c.status = 'active'
  AND c.manager_id IS NULL
  AND c.id <> t.tp_id
  AND lower(btrim(c.position)) NOT LIKE 'trưởng phòng%'
  AND lower(btrim(c.position)) NOT LIKE 'phụ trách phòng%'
  AND lower(btrim(c.position)) NOT LIKE 'giám đốc%'
  AND lower(btrim(c.position)) NOT LIKE 'phó giám đốc%';

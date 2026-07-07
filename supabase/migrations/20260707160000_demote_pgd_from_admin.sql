-- Hạ quyền Phó Giám đốc: từ vai trò admin 'bgd' xuống vai trò quản lý 'pgd' (phạm vi Khối).
-- Lý do: PGĐ chỉ là user quản lý, KHÔNG có quyền admin/tổng hợp toàn chi nhánh. Sau thay đổi này:
--   - isAdmin = false với PGĐ → mọi menu/route/tab admin (Quản trị Hội đồng đầu mối, quản trị nhân sự,
--     phân quyền, cài đặt, Phân tích đầu mối…) tự động bị ẩn và chặn.
--   - PGĐ vẫn giữ quyền quản lý cấp Khối (role 'pgd'), quyền chấm điểm Hội đồng (theo council_members),
--     và quyền xem báo cáo đầu mối mình phụ trách (RPC get_council_subject_report cho phép theo
--     supervisor_pgd_id, độc lập với vai trò).
-- Giám đốc Chi nhánh (position 'Giám đốc') GIỮ NGUYÊN 'bgd' (không khớp mẫu 'phó giám đốc%').
-- user_roles có UNIQUE(user_id) → mỗi user 1 vai trò, nên chỉ cần UPDATE tại chỗ.
UPDATE public.user_roles ur
SET role = 'pgd'
WHERE ur.role = 'bgd'
  AND ur.user_id IN (
    SELECT p.user_id
    FROM public.profiles p
    WHERE p.status = 'active'
      AND p.user_id IS NOT NULL
      AND (p.position ILIKE 'phó giám đốc%' OR p.position ILIKE 'pgđ%')
  );

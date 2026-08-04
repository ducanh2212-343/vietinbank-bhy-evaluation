-- Nối Trưởng phòng và PGĐ phụ trách vào danh mục phòng
--
-- Vì sao cần: tính năng «Trưởng phòng và PGĐ tự điền sẵn theo phòng» dựa vào
-- departments.manager_id, mà cột này đang RỖNG ở toàn bộ 10 phòng (chỉ TCTH có,
-- do đợt trước Giám đốc xác nhận Vũ Thị Thu Hà). Hệ quả dây chuyền:
--   · ct2_pgd_cua_phong() đi qua manager → luôn trả NULL → ô PGĐ không tự điền
--   · ct2_la_lanh_dao_phong() mất nhánh is_dept_manager(), chỉ còn nhánh dự
--     phòng «có vai manager và đúng phòng mình»
-- Nên ba cấp phụ trách trông như «không nhập được», dù quyền ghi vẫn đủ.
--
-- KHÔNG bịa người. Chỉ nối con trỏ tới người mà chính hồ sơ của họ đã ghi
-- position = 'Trưởng phòng …' và đang mang vai manager, và CHỈ khi phòng đó có
-- ĐÚNG MỘT người như vậy. Phòng nào mập mờ (0 hoặc ≥2 ứng viên) thì để trống
-- — ô trống nói ra được, còn con trỏ sai thì im lặng gán nhầm trách nhiệm.

UPDATE public.departments d
   SET manager_id = ung_vien.id
  FROM (
    SELECT p.department_id, min(p.id::text)::uuid AS id
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'manager'
     WHERE p.status = 'active'
       AND p.position ILIKE 'Trưởng phòng%'
       AND p.department_id IS NOT NULL
     GROUP BY p.department_id
    HAVING count(*) = 1
  ) AS ung_vien
 WHERE d.id = ung_vien.department_id
   AND d.manager_id IS NULL;

-- ---------------------------------------------------------------------------
-- PGĐ phụ trách phòng: thêm đường dự phòng
-- ---------------------------------------------------------------------------
-- Bản cũ chỉ đọc pgd_id của Trưởng phòng — phòng chưa có Trưởng phòng thì mất
-- luôn PGĐ, dù cả phòng đều khai cùng một PGĐ trong hồ sơ cá nhân. Nay: ưu tiên
-- Trưởng phòng, không có thì lấy PGĐ mà ĐA SỐ cán bộ trong phòng đang khai.
-- Đây vẫn là dữ liệu do người khai, không phải suy đoán tổ chức.
CREATE OR REPLACE FUNCTION public.ct2_pgd_cua_phong(_phong uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT p.pgd_id
       FROM public.departments d
       JOIN public.profiles p ON p.id = d.manager_id
      WHERE d.id = _phong),
    (SELECT p.pgd_id
       FROM public.profiles p
      WHERE p.department_id = _phong
        AND p.status = 'active'
        AND p.pgd_id IS NOT NULL
      GROUP BY p.pgd_id
      ORDER BY count(*) DESC, p.pgd_id
      LIMIT 1)
  )
$function$;
REVOKE ALL ON FUNCTION public.ct2_pgd_cua_phong(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_pgd_cua_phong(uuid) TO authenticated, service_role;

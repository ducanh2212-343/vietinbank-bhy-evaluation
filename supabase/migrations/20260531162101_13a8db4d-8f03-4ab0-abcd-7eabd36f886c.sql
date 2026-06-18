
-- Phase 1: Chuẩn hoá vị trí + skill lõi cho 5 PGD nhánh từ template "Phòng giao dịch"

-- B1: Đổi tên các vị trí cũ ở 5 PGD nhánh sang đúng tên template (idempotent)
UPDATE public.positions p
SET name = 'Trưởng phòng giao dịch', code = 'TP_PGD_' || d.code
FROM public.departments d
WHERE p.department_id = d.id
  AND d.code LIKE 'PGD\_%'
  AND p.name = 'Trưởng PGD';

UPDATE public.positions p
SET name = 'Cán bộ giao dịch viên', code = 'GDV_PGD_' || d.code
FROM public.departments d
WHERE p.department_id = d.id
  AND d.code LIKE 'PGD\_%'
  AND p.name = 'Giao dịch viên';

UPDATE public.positions p
SET name = 'Phó phòng giao dịch phụ trách tín dụng', code = 'PP_PGD_TD_' || d.code
FROM public.departments d
WHERE p.department_id = d.id
  AND d.code LIKE 'PGD\_%'
  AND p.name = 'Cán bộ tín dụng';

-- B2: Insert các vị trí template còn thiếu vào từng PGD nhánh
INSERT INTO public.positions (name, code, department_id, sort_order, is_active)
SELECT
  tpl.name,
  tpl.code || '_' || d.code,
  d.id,
  tpl.sort_order,
  true
FROM public.departments d
CROSS JOIN public.positions tpl
WHERE d.code LIKE 'PGD\_%'
  AND tpl.department_id = (SELECT id FROM public.departments WHERE code = 'PGD')
  AND NOT EXISTS (
    SELECT 1 FROM public.positions p2
    WHERE p2.department_id = d.id AND p2.name = tpl.name
  );

-- B3: Copy position_core_skills từ template -> mọi vị trí cùng tên ở PGD nhánh (chỉ chèn nếu chưa có)
INSERT INTO public.position_core_skills (position_id, skill_id, minimum_level, advanced_level, weight, sort_order)
SELECT
  branch_pos.id,
  pcs.skill_id,
  pcs.minimum_level,
  pcs.advanced_level,
  pcs.weight,
  pcs.sort_order
FROM public.departments d
JOIN public.positions branch_pos ON branch_pos.department_id = d.id
JOIN public.positions tpl
  ON tpl.department_id = (SELECT id FROM public.departments WHERE code = 'PGD')
 AND tpl.name = branch_pos.name
JOIN public.position_core_skills pcs ON pcs.position_id = tpl.id
WHERE d.code LIKE 'PGD\_%'
  AND NOT EXISTS (
    SELECT 1 FROM public.position_core_skills pcs2
    WHERE pcs2.position_id = branch_pos.id AND pcs2.skill_id = pcs.skill_id
  );

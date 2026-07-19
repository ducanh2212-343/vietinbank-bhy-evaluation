-- ============================================================================
-- KIỂM THỬ PHÂN QUYỀN NẾP TỐT (Bước 1) — chạy thủ công trong SQL Editor
-- của Supabase (project chieuthuc3-bachungyen) SAU KHI áp 2 migration:
--   20260727090000_nep_tot_step1_behavior_notes.sql
--   20260727091000_harden_audit_logs_insert.sql
--
-- Cách dùng: thay các UUID mẫu bên dưới bằng user_id (auth.users.id) thật của
-- từng vai rồi chạy TỪNG KHỐI. Mỗi khối giả lập JWT của một user bằng
-- request.jwt.claims (cơ chế Supabase RLS dùng auth.uid()).
-- Kỳ vọng ghi ở cuối mỗi khối.
-- ============================================================================

-- ===== Khối 0: chuẩn bị — xem nhanh vai và profile để chọn user test =========
SELECT ur.role, p.full_name, p.position, u.id AS user_id, p.id AS profile_id
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.profiles p ON p.user_id = u.id
ORDER BY ur.role, p.full_name;

-- ===== Khối 1: Trưởng phòng (đứng đầu phòng — departments.manager_id) ========
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', '<USER_ID_TRUONG_PHONG>', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

-- 1a. Danh sách phạm vi ghi nhận: KỲ VỌNG = toàn bộ cán bộ active trong phòng (trừ chính mình)
SELECT * FROM public.get_observable_profiles();

-- 1b. Ghi nhanh cho 1 cán bộ trong phòng: KỲ VỌNG = thành công
INSERT INTO public.behavior_notes (employee_id, observer_id, raw_text, behavior_type)
VALUES ('<PROFILE_ID_CB_TRONG_PHONG>', public.get_my_profile_id(),
        '[TEST-RLS] chủ động phối hợp phòng thẩm định hoàn thiện hồ sơ', 'tich_cuc');

-- 1c. Ghi cho cán bộ PHÒNG KHÁC (không thuộc scope): KỲ VỌNG = LỖI RLS
-- INSERT INTO public.behavior_notes (employee_id, observer_id, raw_text, behavior_type)
-- VALUES ('<PROFILE_ID_CB_PHONG_KHAC>', public.get_my_profile_id(), '[TEST-RLS] x', 'tich_cuc');

ROLLBACK;

-- ===== Khối 2: Phó phòng (role manager nhưng KHÔNG phải departments.manager_id,
--               không có management_scopes) =================================
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', '<USER_ID_PHO_PHONG>', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

-- 2a. KỲ VỌNG (sau 20260727092000): danh sách = các CÁN BỘ THƯỜNG cùng phòng
--     (position không bắt đầu 'Trưởng'/'Phó') — PP ghi được cả phòng không cần
--     phân công; KHÔNG chứa Trưởng phòng/Phó phòng khác.
SELECT full_name, position_title FROM public.get_observable_profiles();

-- 2b. PP ghi 1 cán bộ cùng phòng: KỲ VỌNG = thành công
INSERT INTO public.behavior_notes (employee_id, observer_id, raw_text, behavior_type)
VALUES ('<PROFILE_ID_CB_TRONG_PHONG>', public.get_my_profile_id(),
        '[TEST-RLS] pp ghi cán bộ cùng phòng', 'tich_cuc');

-- 2c. QUYỀN XEM chặt: PP KHÔNG thấy bản ghi do người khác tạo về cán bộ cùng phòng
--     KỲ VỌNG: chỉ thấy bản ghi observer_id = chính PP
SELECT observer_id = public.get_my_profile_id() AS is_mine, count(*)
FROM public.behavior_notes GROUP BY 1;

ROLLBACK;

-- ===== Khối 3: Cấp scope cho Phó phòng rồi kiểm tra lại ======================
-- (chạy bằng quyền admin/postgres — KHÔNG set role)
INSERT INTO public.management_scopes (grantee_profile_id, scope_type, staff_profile_id, granted_by)
VALUES ('<PROFILE_ID_PHO_PHONG>', 'ca_nhan', '<PROFILE_ID_CB_DUOC_GIAO>', '<PROFILE_ID_GIAM_DOC>');

BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', '<USER_ID_PHO_PHONG>', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
-- 3a. KỲ VỌNG: thấy đúng 1 cán bộ được giao
SELECT * FROM public.get_observable_profiles();
ROLLBACK;

-- Dọn scope test
DELETE FROM public.management_scopes WHERE staff_profile_id = '<PROFILE_ID_CB_DUOC_GIAO>' AND grantee_profile_id = '<PROFILE_ID_PHO_PHONG>';

-- ===== Khối 4: Cán bộ (employee) ============================================
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', '<USER_ID_CAN_BO>', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

-- 4a. KỲ VỌNG: chỉ thấy bản ghi về CHÍNH MÌNH có status='da_xac_nhan' AND shared_with_employee=true
SELECT id, status, shared_with_employee FROM public.behavior_notes;

-- 4b. Cán bộ tự ghi: KỲ VỌNG = LỖI RLS (không có role manager/pgd/bgd)
-- INSERT INTO public.behavior_notes (employee_id, observer_id, raw_text, behavior_type)
-- VALUES ('<PROFILE_ID_CB_KHAC>', public.get_my_profile_id(), '[TEST-RLS] x', 'tich_cuc');

ROLLBACK;

-- ===== Khối 5: tcth_admin / system_admin ====================================
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', '<USER_ID_SYSTEM_ADMIN>', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

-- 5a. KỲ VỌNG (sau 20260727092000): admin chi nhánh CHỈ thấy bản đã xác nhận
--     loại 'quan_ly'; KHÔNG thấy bản nháp và bản 'rieng_tu'
SELECT status, visibility, count(*) FROM public.behavior_notes GROUP BY 1, 2;

-- 5b. KỲ VỌNG: LỖI RLS — không còn tự chèn audit_logs được (đã vá WITH CHECK(true))
-- INSERT INTO public.audit_logs (action) VALUES ('[TEST-RLS] fake');

-- 5c. KỲ VỌNG: quản lý được management_scopes
SELECT count(*) FROM public.management_scopes;

ROLLBACK;

-- ===== Khối 5bis: kiểm tra visibility 'rieng_tu' =============================
-- (chạy bằng quyền admin/postgres) Tạo 1 bản ghi đã xác nhận, riêng tư, của PP:
-- INSERT INTO public.behavior_notes (employee_id, observer_id, raw_text, behavior_type, status, visibility)
-- VALUES ('<PROFILE_ID_CB>', '<PROFILE_ID_PHO_PHONG>', '[TEST-RLS] riêng tư', 'can_cai_thien', 'da_xac_nhan', 'rieng_tu');
--
-- Rồi giả lập Trưởng phòng của cán bộ đó:
-- KỲ VỌNG: KHÔNG thấy bản ghi trên (dù đã xác nhận và trong scope) — vì 'rieng_tu'
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', '<USER_ID_TRUONG_PHONG>', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT count(*) AS should_not_include_rieng_tu FROM public.behavior_notes WHERE visibility = 'rieng_tu' AND observer_id <> public.get_my_profile_id();
ROLLBACK;

-- ===== Khối 6: PGĐ ==========================================================
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', '<USER_ID_PGD>', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

-- 6a. KỲ VỌNG: thấy cán bộ của các phòng có profiles.pgd_id trỏ về PGĐ này
SELECT department_name, count(*) FROM public.get_observable_profiles() GROUP BY 1;

ROLLBACK;

-- ===== Khối 7: Giám đốc (role bgd) ==========================================
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub', '<USER_ID_GIAM_DOC>', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

-- 7a. KỲ VỌNG: thấy toàn bộ cán bộ active toàn chi nhánh (trừ chính mình)
SELECT count(*) FROM public.get_observable_profiles();

ROLLBACK;

-- ===== Khối 8: audit trail ==================================================
-- (chạy bằng quyền admin/postgres) — sau khi thao tác thật trên UI, kiểm tra:
-- KỲ VỌNG: có dòng behavior_notes:insert/update, new_data KHÔNG chứa raw_text/behavior
SELECT action, entity_type, new_data, created_at
FROM public.audit_logs
WHERE entity_type IN ('behavior_notes', 'management_scopes')
ORDER BY created_at DESC LIMIT 20;

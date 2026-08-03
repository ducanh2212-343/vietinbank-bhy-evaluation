-- Rollback cho 20260727090000_nep_tot_step1_behavior_notes.sql
-- Chạy thủ công trong SQL Editor khi cần gỡ Bước 1 Nếp Tốt.
-- LƯU Ý: xóa bảng sẽ mất dữ liệu bản ghi hành vi đã nhập — chỉ dùng khi
-- chưa có dữ liệu thật hoặc đã export.

DROP TRIGGER IF EXISTS audit_management_scopes ON public.management_scopes;
DROP TRIGGER IF EXISTS audit_behavior_notes ON public.behavior_notes;
DROP FUNCTION IF EXISTS public.log_nep_tot_audit();

DROP FUNCTION IF EXISTS public.get_observable_profiles();
DROP FUNCTION IF EXISTS public.can_observe_profile(uuid);

DROP TRIGGER IF EXISTS behavior_notes_before_write ON public.behavior_notes;
DROP FUNCTION IF EXISTS public.behavior_notes_before_write();

DROP TABLE IF EXISTS public.behavior_notes;
DROP TABLE IF EXISTS public.management_scopes;

DELETE FROM public.ai_prompts WHERE mode = 'behavior_structuring';

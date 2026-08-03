-- Rollback cho 20260727094000_nep_tot_private_default.sql
-- LƯU Ý: không khôi phục được visibility từng bản ghi trước khi flip —
-- chỉ đổi lại mặc định của cột. Người ghi tự mở lại từng bản nếu cần.

ALTER TABLE public.behavior_notes ALTER COLUMN visibility SET DEFAULT 'quan_ly';

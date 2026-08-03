-- ============================================================================
-- NẾP TỐT — Giai đoạn đầu triển khai: MẶC ĐỊNH RIÊNG TƯ
-- Chỉ người ghi thấy bản ghi của mình (kể cả sau khi xác nhận). Muốn các cấp
-- quản lý khác của cán bộ (TP/PGĐ/GĐ/admin) xem được thì người ghi phải CHỦ
-- ĐỘNG chuyển sang 'quan_ly'. Cán bộ được đánh giá không bao giờ thuộc nhóm
-- xem này — họ chỉ thấy bản được chia sẻ đích danh (shared_with_employee).
-- Khi văn hóa ghi nhận đã quen, đổi lại mặc định bằng 1 migration tương tự.
--
-- Kèm: chuyển toàn bộ bản ghi hiện có về 'rieng_tu' (giai đoạn thử nghiệm —
-- các bản 'quan_ly' hiện có là do mặc định cũ, không phải người ghi chủ động chọn).
-- Rollback: supabase/rollbacks/20260727094000_nep_tot_private_default_down.sql
-- ============================================================================

ALTER TABLE public.behavior_notes ALTER COLUMN visibility SET DEFAULT 'rieng_tu';

UPDATE public.behavior_notes SET visibility = 'rieng_tu' WHERE visibility = 'quan_ly';

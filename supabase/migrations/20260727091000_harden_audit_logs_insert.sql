-- ============================================================================
-- Vá lỗ audit_logs: policy INSERT cũ là WITH CHECK (true) — bất kỳ user đăng
-- nhập nào cũng chèn được bản ghi audit tùy ý (giả mạo vết).
-- Từ nay chỉ trigger/SECURITY DEFINER (chạy với quyền owner, bỏ qua RLS) được
-- ghi audit_logs — hiện là log_nep_tot_audit() của phân hệ Nếp Tốt.
-- Không có code frontend nào insert audit_logs trực tiếp (đã rà soát src/).
-- Rollback: supabase/rollbacks/20260727091000_harden_audit_logs_insert_down.sql
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;

-- Rollback cho 20260727091000_harden_audit_logs_insert.sql
-- Khôi phục policy INSERT cũ (mở — không khuyến nghị, chỉ dùng khi có tính năng
-- cũ nào đó cần client tự ghi audit_logs).

CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

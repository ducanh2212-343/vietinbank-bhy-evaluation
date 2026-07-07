-- Tinh chỉnh quyền xóa phiếu đánh giá đầu mối:
--   - Bản NHÁP: người chấm tự xóa được nháp CỦA MÌNH khi kỳ đang mở
--     (nháp chưa vào báo cáo — như tờ giấy nháp cá nhân).
--   - Phiếu ĐÃ GỬI: chỉ admin (bgd/tcth_admin/system_admin) xóa được.
-- Xóa luôn là xóa vĩnh viễn (cascade điểm + minh chứng).
DROP POLICY IF EXISTS "council_evaluations_delete" ON public.council_evaluations;
CREATE POLICY "council_evaluations_delete" ON public.council_evaluations
  FOR DELETE TO authenticated
  USING (
    (
      evaluator_id = public.get_my_profile_id()
      AND status = 'draft'
      AND EXISTS (SELECT 1 FROM public.council_rounds r WHERE r.id = round_id AND r.status = 'open')
    )
    OR public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
    OR public.has_role(auth.uid(), 'bgd'::app_role)
  );

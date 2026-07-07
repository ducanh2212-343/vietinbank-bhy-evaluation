-- Siết quyền xóa phiếu đánh giá đầu mối: CHỈ admin (bgd/tcth_admin/system_admin).
-- Trước đây thành viên còn tự xóa được bản nháp của mình — bỏ theo yêu cầu Chi nhánh.
-- Xóa phiếu là xóa vĩnh viễn: điểm + minh chứng con bị xóa theo (ON DELETE CASCADE);
-- báo cáo luôn tính từ dữ liệu hiện tại nên kết quả cập nhật ngay.
-- (Thành viên vẫn sửa/xóa từng dòng điểm trong phiếu CỦA MÌNH khi kỳ đang mở —
--  đó là thao tác chỉnh sửa phiếu, không phải xóa bảng chấm.)
DROP POLICY IF EXISTS "council_evaluations_delete" ON public.council_evaluations;
CREATE POLICY "council_evaluations_delete" ON public.council_evaluations
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
    OR public.has_role(auth.uid(), 'bgd'::app_role)
  );

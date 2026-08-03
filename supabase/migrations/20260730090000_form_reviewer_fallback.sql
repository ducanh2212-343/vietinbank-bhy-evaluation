-- PHIẾU NỘP KHÔNG BAO GIỜ ĐƯỢC "VÔ CHỦ" (27/07/2026)
--
-- Sự cố: phiếu Quý II của Dương Thị Thanh Thúy (TP PGD Văn Lâm) nộp 25/07 với
-- reviewer_id = NULL. Cô là Trưởng phòng nên không có manager_id; luồng "duyệt gộp
-- một bước" (isSoleApprover) đòi reviewer_id = chính người duyệt → PGĐ phụ trách cũng
-- không có nút nào. Phiếu treo, màn Đánh giá cán bộ vẫn ghi "Cần xử lý: Trưởng phòng"
-- trong khi không tồn tại Trưởng phòng nào.
--
-- Gốc: đường nộp qua StaffEvaluation đặt status='submitted' mà không gán reviewer_id
-- (khác SelfAssessmentPage vốn bắt buộc chọn). Frontend đã vá; trigger này là lớp chặn
-- cuối, bắt MỌI lối vào (màn khác, import, sửa tay trên Studio).
--
-- Quy tắc gán: Quản lý trực tiếp → PGĐ phụ trách → Giám đốc
-- (trùng resolveDefaultReviewerId trong src/lib/reviewerScope.ts).

CREATE OR REPLACE FUNCTION public.form_reviewer_fallback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'submitted' AND NEW.reviewer_id IS NULL THEN
    SELECT COALESCE(p.manager_id, p.pgd_id, p.director_id)
      INTO NEW.reviewer_id
      FROM public.profiles p
     WHERE p.id = NEW.employee_id;
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.form_reviewer_fallback() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS form_reviewer_fallback_tr ON public.form_submissions;
CREATE TRIGGER form_reviewer_fallback_tr
  BEFORE INSERT OR UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.form_reviewer_fallback();

-- Backfill các phiếu đang treo vô chủ (đã nộp / đã rà soát mà chưa có người đánh giá)
UPDATE public.form_submissions fs
   SET reviewer_id = COALESCE(p.manager_id, p.pgd_id, p.director_id)
  FROM public.profiles p
 WHERE p.id = fs.employee_id
   AND fs.reviewer_id IS NULL
   AND fs.status IN ('submitted', 'reviewed')
   AND COALESCE(p.manager_id, p.pgd_id, p.director_id) IS NOT NULL;

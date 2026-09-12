-- VÔ HIỆU ĐỀ XUẤT SỬA KẾ HOẠCH KHI PHIẾU RỜI TRẠNG THÁI ĐÃ DUYỆT
--
-- Va chạm giữa 2 tính năng ra đời cùng ngày 29/07:
--   • plan_change_requests (PR #80): cán bộ đề xuất sửa kế hoạch trên phiếu ĐÃ DUYỆT,
--     người đánh giá duyệt thì payload được áp theo diff (xoá dòng không có trong payload).
--   • BGĐ chuyển trả phiếu đã duyệt về TP bổ sung (PR #81): approved → submitted,
--     TP sửa kế hoạch TRỰC TIẾP rồi phiếu được PGĐ phê duyệt lại.
--
-- Kịch bản mất dữ liệu nếu không có trigger này: đề xuất đang pending → BGĐ chuyển trả
-- → TP sửa kế hoạch trực tiếp → phiếu approved lại → đề xuất cũ (payload chụp từ kế
-- hoạch TRƯỚC khi TP sửa) hiện lại trên màn người đánh giá — ai bấm duyệt là bản diff
-- cũ ĐÈ MẤT kế hoạch TP vừa cập nhật.
--
-- Nguyên tắc: phiếu rời approved/closed (bất kể đường nào — nút chuyển trả của BGĐ
-- hay ép trạng thái admin) thì mọi đề xuất pending của phiếu hết hiệu lực; cán bộ
-- gửi lại sau khi phiếu được phê duyệt lại nếu vẫn cần.

CREATE OR REPLACE FUNCTION public.void_plan_change_on_leave_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status::text IN ('approved','closed') AND NEW.status::text NOT IN ('approved','closed') THEN
    UPDATE public.plan_change_requests
       SET status = 'rejected',
           decided_at = now(),
           decision_note = 'Tự vô hiệu: phiếu được chuyển trả để bổ sung/chỉnh sửa trực tiếp — kế hoạch có thể đã thay đổi. Nếu vẫn cần, gửi lại đề xuất sau khi phiếu được phê duyệt lại.'
     WHERE form_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_void_plan_change_on_leave_approved ON public.form_submissions;
CREATE TRIGGER trg_void_plan_change_on_leave_approved
AFTER UPDATE ON public.form_submissions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.void_plan_change_on_leave_approved();

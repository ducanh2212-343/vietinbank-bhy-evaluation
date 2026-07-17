-- Chốt chặn server cho quy tắc kỳ đánh giá (quy tắc GĐ chốt 07/2026):
--   • Kỳ quý N đánh giá nội dung từ đầu năm đến hết quý N → CHỈ đánh giá SAU end_date
--     (Quý III phải hết 30/9 mới đánh giá), trong cửa sổ admin MỞ kỳ (in_progress).
--   • Kỳ không ở in_progress (đã đóng/chưa mở) → phiếu chỉ xem, không tạo/sửa.
-- Frontend đã lọc, nhưng trigger này là tầng bảo vệ thật: client cũ (chưa refresh),
-- deep-link, hay lỗi UI sau này đều không lách được.
CREATE OR REPLACE FUNCTION public.guard_form_submission_cycle_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_end date;
  v_name text;
BEGIN
  -- Ngữ cảnh service_role / migration / cron: cho qua (không phải thao tác người dùng)
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  SELECT status, end_date, name INTO v_status, v_end, v_name
    FROM public.evaluation_cycles WHERE id = NEW.cycle_id;
  IF v_status IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_status <> 'in_progress' THEN
      RAISE EXCEPTION 'Kỳ % chưa mở hoặc đã đóng — không thể tạo phiếu. Cần thì mở lại kỳ trong Quản lý kỳ đánh giá.', v_name;
    END IF;
    -- Chưa hết quý thì chưa được đánh giá (tính theo ngày Việt Nam)
    IF v_end IS NOT NULL AND (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= v_end THEN
      RAISE EXCEPTION 'Kỳ % chỉ bắt đầu đánh giá sau ngày % (hết quý mới đánh giá).', v_name, to_char(v_end, 'DD/MM/YYYY');
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: bỏ qua khi chỉ thay đổi reviewer_id/updated_at (trigger đồng bộ người
  -- đánh giá khi hồ sơ đổi quản lý — sync_form_reviewer_on_profile_change).
  IF (to_jsonb(NEW) - 'reviewer_id' - 'updated_at')
     IS DISTINCT FROM (to_jsonb(OLD) - 'reviewer_id' - 'updated_at') THEN
    IF v_status <> 'in_progress' THEN
      RAISE EXCEPTION 'Kỳ % đã khóa — phiếu chỉ xem. Cần chỉnh sửa thì mở lại kỳ trong Quản lý kỳ đánh giá.', v_name;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.guard_form_submission_cycle_window() FROM anon, authenticated;

DROP TRIGGER IF EXISTS guard_form_submission_cycle_window ON public.form_submissions;
CREATE TRIGGER guard_form_submission_cycle_window
  BEFORE INSERT OR UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.guard_form_submission_cycle_window();

-- KHÁI NIỆM CHỐT (GĐ xác định lại 17/7/2026):
--   • MỞ KỲ  (status = in_progress): TCTH/GĐ chủ động mở — từ lúc này cán bộ được
--     tạo/sửa/nộp phiếu của kỳ. Thực tế có thể mở từ ~ngày 20 tháng cuối quý để
--     Trưởng phòng kịp đánh giá (mỗi cán bộ mất 1–2 giờ).
--   • ĐÓNG KỲ (status khác in_progress): phiếu CHỈ XEM — muốn sửa phải mở lại kỳ.
--   • Ngày trên kỳ (start/end_date) là NHÃN quý; submission_deadline là hạn nộp cho
--     nhắc việc/quá hạn. KHÔNG chặn nhập theo ngày — quyền nhập phụ thuộc duy nhất
--     vào trạng thái mở/đóng do người quản trị quyết định.
-- Bản này gỡ điều kiện "phải qua end_date mới được tạo phiếu" của guard trước.
CREATE OR REPLACE FUNCTION public.guard_form_submission_cycle_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_name text;
BEGIN
  -- Ngữ cảnh service_role / migration / cron: cho qua (không phải thao tác người dùng)
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  SELECT status, name INTO v_status, v_name
    FROM public.evaluation_cycles WHERE id = NEW.cycle_id;
  IF v_status IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_status <> 'in_progress' THEN
      RAISE EXCEPTION 'Kỳ % chưa được mở — TCTH mở kỳ trong Quản lý kỳ đánh giá thì mới nhập được.', v_name;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: bỏ qua khi chỉ thay đổi reviewer_id/updated_at (trigger đồng bộ người
  -- đánh giá khi hồ sơ đổi quản lý — sync_form_reviewer_on_profile_change).
  IF (to_jsonb(NEW) - 'reviewer_id' - 'updated_at')
     IS DISTINCT FROM (to_jsonb(OLD) - 'reviewer_id' - 'updated_at') THEN
    IF v_status <> 'in_progress' THEN
      RAISE EXCEPTION 'Kỳ % đã đóng — phiếu chỉ xem. Mở lại kỳ trong Quản lý kỳ đánh giá nếu cần chỉnh sửa.', v_name;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

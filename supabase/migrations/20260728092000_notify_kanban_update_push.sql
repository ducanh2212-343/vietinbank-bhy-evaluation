-- PUSH TỨC THÌ CHO 2 CẤP TRÊN khi cán bộ cập nhật tiến độ Kanban (26/07/2026).
--
-- Yêu cầu GĐ: họp phòng linh hoạt — không ép mốc trong tuần; đổi lại, MỖI LẦN cán bộ
-- cập nhật tiến độ, 2 cấp trên nhận push ngay (tên cán bộ, hành động, nội dung, trạng
-- thái, tiến độ): cán bộ/phó phòng → TP + PGĐ phụ trách; TP → PGĐ + GĐ; PGĐ → GĐ.
--
-- Cơ chế: trigger AFTER INSERT trên kanban_card_logs (progress_update /
-- completion_requested) → pg_net gọi edge function notify-kanban-update (đã deploy).
-- Edge function tự đọc log/thẻ/hồ sơ từ DB và giải chuỗi 2 cấp — không tin payload.

CREATE OR REPLACE FUNCTION public.notify_kanban_update_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.log_type IN ('progress_update', 'completion_requested') THEN
    PERFORM net.http_post(
      url := 'https://whlysprzsguehxmrjwha.supabase.co/functions/v1/notify-kanban-update',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets
                      WHERE name = 'email_queue_service_role_key'),
        'Content-Type', 'application/json'),
      body := jsonb_build_object('log_id', NEW.id));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Push chỉ là best-effort: lỗi gửi không được làm hỏng giao dịch cập nhật tiến độ
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.notify_kanban_update_push() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_kanban_update_push_tr ON public.kanban_card_logs;
CREATE TRIGGER notify_kanban_update_push_tr
  AFTER INSERT ON public.kanban_card_logs
  FOR EACH ROW EXECUTE FUNCTION public.notify_kanban_update_push();

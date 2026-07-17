-- Đồng bộ ngược Kanban → Dấu ấn: khi quản lý XÁC NHẬN hoàn thành thẻ sinh từ dấu ấn
-- (confirm_kanban_completion đặt completion_status='confirmed'), dấu ấn tương ứng
-- tự chuyển status='confirmed' — GĐ không phải bấm "Ghi nhận" tay lần thứ hai ở /dau-an.
-- Không lo vòng lặp: sync_kanban_leadership_mark (mark→card) upsert card nhưng KHÔNG
-- đụng cột completion_status, nên trigger này (UPDATE OF completion_status) không bị gọi lại.
CREATE OR REPLACE FUNCTION public.sync_leadership_mark_on_card_confirm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.completion_status = 'confirmed'
     AND NEW.leadership_mark_id IS NOT NULL
     AND OLD.completion_status IS DISTINCT FROM 'confirmed' THEN
    UPDATE public.leadership_marks
       SET status = 'confirmed'
     WHERE id = NEW.leadership_mark_id
       AND status = 'active';
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.sync_leadership_mark_on_card_confirm() FROM anon, authenticated;

DROP TRIGGER IF EXISTS sync_leadership_mark_on_card_confirm ON public.kanban_cards;
CREATE TRIGGER sync_leadership_mark_on_card_confirm
  AFTER UPDATE OF completion_status ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.sync_leadership_mark_on_card_confirm();

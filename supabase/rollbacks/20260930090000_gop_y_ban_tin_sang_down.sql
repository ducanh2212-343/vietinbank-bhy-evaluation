-- Gỡ bản tin sáng «Góp ý BHY One».
--
-- Gỡ xong thì ba người tiếp nhận quay lại phải tự mở /gop-y-he-thong mới biết
-- có góp ý mới. Bản thân góp ý và trạng thái xử lý KHÔNG mất gì.

SELECT cron.unschedule('gop-y-ban-tin-sang')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gop-y-ban-tin-sang');

DROP FUNCTION IF EXISTS public.gop_y_ban_tin_sang(boolean);

-- Tin đã đặt trong hàng đợi: xoá các tin CHƯA gửi để không còn tin mồ côi mã
-- GOP_Y (bấm vào sẽ rơi về Kanban sau khi client gỡ nhánh đường dẫn).
DELETE FROM public.ct2_thong_bao WHERE ma_su_kien = 'GOP_Y' AND gui_luc IS NULL;

DROP INDEX IF EXISTS public.idx_portal_gop_y_chua_bao;
ALTER TABLE public.portal_gop_y DROP COLUMN IF EXISTS bao_luc;

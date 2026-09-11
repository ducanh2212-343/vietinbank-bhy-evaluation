-- Gỡ 20261008090000: bỏ phiên trình bày khỏi đợt chấm Hội đồng.
-- Phiếu chấm và danh sách ý tưởng của đợt KHÔNG bị đụng — phiên chỉ là cách
-- sắp xếp để tìm cho nhanh.
DROP FUNCTION IF EXISTS public.bhy_ideas_hd_dong_phien(uuid);
DROP FUNCTION IF EXISTS public.bhy_ideas_hd_mo_phien(uuid);

ALTER TABLE public.portal_idea_council_items
  DROP COLUMN IF EXISTS phien_id,
  DROP COLUMN IF EXISTS thu_tu;

DROP TABLE IF EXISTS public.portal_idea_council_sessions;

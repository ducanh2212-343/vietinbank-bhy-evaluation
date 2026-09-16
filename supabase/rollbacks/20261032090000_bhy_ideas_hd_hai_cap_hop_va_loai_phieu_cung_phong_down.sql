-- Gỡ 20261032090000. Dòng sổ Vươn cành/Lan tỏa đã ghi khi công bố KHÔNG bị xóa
-- (tiền đã báo cho cán bộ — thu hồi là quyết định riêng). Các hàm tổng hợp về
-- bản 20260924090000: chạy lại đoạn tương ứng của migration đó.
DROP FUNCTION IF EXISTS public.bhy_ideas_hd_rut_y_tuong(uuid, text);
DROP TABLE IF EXISTS public.portal_idea_council_rut;
DROP FUNCTION IF EXISTS public.bhy_ideas_hd_ung_vien(uuid);
DROP TRIGGER IF EXISTS trg_pici_gac_cap_xet ON public.portal_idea_council_items;
DROP FUNCTION IF EXISTS public.f_pici_gac_cap_xet();
DROP FUNCTION IF EXISTS public.bhy_ideas_hd_ngay_toi_thieu_lan_toa();
DROP FUNCTION IF EXISTS public.bhy_ideas_hd_tinh_item(uuid);
DROP FUNCTION IF EXISTS public.bhy_ideas_hd_toi_duoc_cham(uuid);
DROP FUNCTION IF EXISTS public.bhy_ideas_hd_vang(uuid, uuid);
DROP FUNCTION IF EXISTS public.bhy_ideas_hd_phieu_hop_le(uuid, uuid);
DROP FUNCTION IF EXISTS public.bhy_ideas_hd_ly_do_khong_cham(uuid, uuid);
DROP TABLE IF EXISTS public.portal_idea_council_vang;
DROP FUNCTION IF EXISTS public.bhy_ideas_phong_lien_quan(uuid);
DROP TRIGGER IF EXISTS trg_portal_ideas_gan_phong_id ON public.portal_ideas;
DROP FUNCTION IF EXISTS public.f_portal_ideas_gan_phong_id();
ALTER TABLE public.portal_ideas DROP COLUMN IF EXISTS phong_id;
ALTER TABLE public.portal_idea_council_rounds DROP COLUMN IF EXISTS cap_xet, DROP COLUMN IF EXISTS ghi_so_luc;
ALTER TABLE public.portal_idea_council_items DROP CONSTRAINT IF EXISTS portal_idea_council_items_proposed_tier_check;
ALTER TABLE public.portal_idea_council_items ADD CONSTRAINT portal_idea_council_items_proposed_tier_check
  CHECK (proposed_tier IN ('Vươn cành', 'Lan tỏa', 'Lan tỏa trực tiếp'));
-- Policy gửi phiếu, bhy_ideas_hd_tong_hop / tien_do / phieu_an_danh / cong_bo:
-- chạy lại từ 20260924090000_bhy_ideas_cham_diem_hoi_dong.sql (và bản sửa ở
-- 20260926090000 nếu có) — các hàm này CREATE OR REPLACE nên áp đè được.

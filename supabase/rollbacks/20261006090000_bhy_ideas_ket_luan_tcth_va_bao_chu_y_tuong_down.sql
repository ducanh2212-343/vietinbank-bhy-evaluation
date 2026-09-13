-- Gỡ migration 20261006090000: bỏ kết luận TCTH, sổ đầy đủ, hàm báo chủ ý tưởng.
-- Dòng nuoi_duong/dung về 'thu_hoi'. Các hàm bước (trình/duyệt/thu hồi/SMP/Ươm
-- mầm) về bản 20261005090000 và 20260926090000 — chạy lại đoạn tương ứng.
DROP FUNCTION IF EXISTS public.bhy_ideas_so_ghi_nhan_day_du();
DROP FUNCTION IF EXISTS public.bhy_ideas_ket_luan_tcth(uuid, text, text, uuid[]);
DROP FUNCTION IF EXISTS public.bhy_ideas_bao_chu_y_tuong(uuid, text, text, text, text);

UPDATE public.portal_idea_awards SET trang_thai = 'thu_hoi' WHERE trang_thai IN ('nuoi_duong', 'dung');
ALTER TABLE public.portal_idea_awards DROP CONSTRAINT IF EXISTS portal_idea_awards_trang_thai_check;
ALTER TABLE public.portal_idea_awards
  ADD CONSTRAINT portal_idea_awards_trang_thai_check
  CHECK (trang_thai IN ('cho_gd_duyet', 'da_ghi_nhan', 'tu_choi', 'thu_hoi', 'tra_ve', 'da_bo_sung'));
-- Ba hàm danh sách (ung_vien, ho_so_cua_toi, so_ben_re) về bản 20261005090000:
-- chạy lại đoạn 3), 4), 5) của migration đó. Cột mới giữ lại.

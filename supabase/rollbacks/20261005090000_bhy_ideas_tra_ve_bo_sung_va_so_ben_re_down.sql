-- Gỡ migration 20261005090000: bỏ trả về / gửi lại / sổ Bén rễ.
-- Dòng đang tra_ve hoặc da_bo_sung về 'thu_hoi' (cán bộ vẫn giữ nội dung đã sửa).
DROP FUNCTION IF EXISTS public.bhy_ideas_tra_ve_bo_sung(uuid, text, text);
DROP FUNCTION IF EXISTS public.bhy_ideas_gui_lai_bo_sung(uuid, text);
DROP FUNCTION IF EXISTS public.bhy_ideas_ho_so_ben_re_cua_toi();
DROP FUNCTION IF EXISTS public.bhy_ideas_so_ben_re();

UPDATE public.portal_idea_awards SET trang_thai = 'thu_hoi' WHERE trang_thai IN ('tra_ve', 'da_bo_sung');
ALTER TABLE public.portal_idea_awards DROP CONSTRAINT IF EXISTS portal_idea_awards_trang_thai_check;
ALTER TABLE public.portal_idea_awards
  ADD CONSTRAINT portal_idea_awards_trang_thai_check
  CHECK (trang_thai IN ('cho_gd_duyet', 'da_ghi_nhan', 'tu_choi', 'thu_hoi'));
ALTER TABLE public.portal_idea_awards DROP CONSTRAINT IF EXISTS portal_idea_awards_tra_ve_boi_check;

-- Hai hàm danh sách về bản 20261004090000 — chạy lại đoạn 9) và 10) của
-- migration đó. Cột mới giữ lại để không mất nhật ký.

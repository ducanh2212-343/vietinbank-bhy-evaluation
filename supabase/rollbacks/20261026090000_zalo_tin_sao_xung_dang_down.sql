-- Gỡ 20261026090000: dừng đẩy tin Sao Xứng Đáng vào nhóm Zalo.
-- Phiếu Sao (star_records) không bị đụng. Khóa cấu hình cách soạn tin bị xóa.
SELECT cron.unschedule('zalo-gui-sao');
DROP TRIGGER IF EXISTS trg_sao_rut_khoi_hang_zalo ON public.star_records;
DROP TRIGGER IF EXISTS trg_sao_xep_hang_zalo ON public.star_records;
DROP FUNCTION IF EXISTS public.sao_rut_khoi_hang_zalo();
DROP FUNCTION IF EXISTS public.sao_xep_hang_zalo();
DROP FUNCTION IF EXISTS public.zalo_gui_lai_tin_loi();
DROP FUNCTION IF EXISTS public.zalo_hang_doi_tong_quan();
DROP FUNCTION IF EXISTS public.zalo_sao_tich_luy(uuid);
DROP TABLE IF EXISTS public.zalo_hang_doi;
DELETE FROM public.zalo_cau_hinh
 WHERE khoa IN ('gom_phut', 'che_do_gop', 'toi_da_dong_mot_tin', 'link_chan_tin', 'so_lan_thu_toi_da', 'ly_do_toi_da_ky_tu');

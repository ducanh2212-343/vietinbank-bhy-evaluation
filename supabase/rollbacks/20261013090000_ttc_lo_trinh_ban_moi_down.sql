-- Gỡ 20261013090000_ttc_lo_trinh_ban_moi.sql — trả lộ trình cũ từ ảnh chụp.
-- Chỉ chạy khi hai bảng ảnh chụp còn nguyên; chạy xong thì bỏ chúng đi.

DELETE FROM public.ttc_dau_viec d
 USING public.ttc_ngay n
 WHERE n.id = d.ngay_id
   AND n.chuong_trinh_id = (SELECT id FROM public.ttc_chuong_trinh WHERE ten LIKE 'Chương trình 10 ngày Trưởng phòng KHDN%');

INSERT INTO public.ttc_dau_viec
  (id, ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra,
   nguoi_phu_trach, thiet_bi, noi_nop, trong_tam, tinh_nang)
SELECT id, ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra,
       nguoi_phu_trach, thiet_bi, noi_nop, trong_tam, tinh_nang
  FROM public.ttc_luu_lo_trinh_20261013;

UPDATE public.ttc_ngay n
   SET tieu_de = l.tieu_de, khoi = l.khoi, van_ban = l.van_ban,
       nhiem_vu_van_ban = l.nhiem_vu_van_ban, chuan_bi = l.chuan_bi
  FROM public.ttc_luu_ngay_20261013 l
 WHERE l.id = n.id;

DROP TABLE IF EXISTS public.ttc_luu_lo_trinh_20261013;
DROP TABLE IF EXISTS public.ttc_luu_ngay_20261013;

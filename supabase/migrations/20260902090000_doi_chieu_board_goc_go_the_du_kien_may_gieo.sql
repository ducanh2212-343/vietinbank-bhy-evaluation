-- Đối chiếu board Miro gốc của Phòng KHDN — gỡ thẻ dự kiến máy gieo
--
-- Giám đốc gửi hai ảnh chụp board gốc (06/08): trên sổ sách của chính Phòng,
-- Công ty CP Nhựa Tuệ Minh (và các khách cùng cảnh) nằm ở cột HOÀN THÀNH; cột
-- «Đến hạn GHTD 2 tháng tới» của Phòng chỉ có đúng HAI thẻ Đông Dương.
--
-- Đợt gieo hôm 05/08 tôi suy: «hồ sơ hoàn thành + ngày hết hạn đã qua + chưa
-- có hồ sơ nối tiếp ⇒ khách cần tái cấp ⇒ gieo thẻ dự kiến». Board gốc bác bỏ
-- suy luận đó: tag ngày trên thẻ hoàn thành là NGÀY HẾT HẠN của hạn mức đã cấp
-- — thông tin lịch sử, không phải tín hiệu việc chưa làm. Phòng đã khép các
-- khách đó; máy không được mở lại hộ. Bài học ghi vào đây: THẺ Ở CỘT HOÀN
-- THÀNH TRÊN BOARD GỐC LÀ CHƯƠNG ĐÃ KHÉP — không sinh việc dự kiến từ nó.

-- 1. Gỡ thẻ dự kiến máy gieo — chỉ những thẻ đúng nguồn gốc đó, còn nguyên vẹn
--    (chưa nhịp, chưa trao đổi). Thẻ dự kiến do NGƯỜI tạo sau này không khớp
--    mẫu ghi_chu nên không bị đụng.
DELETE FROM public.ct2_ho_so_tin_dung h
 WHERE h.trang_thai = 'DEN_HAN_GHTD'
   AND h.ghi_chu LIKE 'Thẻ dự kiến sinh từ hồ sơ%'
   AND NOT EXISTS (SELECT 1 FROM public.ct2_nhip_ho_so n WHERE n.ho_so_id = h.id)
   AND NOT EXISTS (SELECT 1 FROM public.ct2_binh_luan b
                    WHERE b.pham_vi = 'HO_SO_TIN_DUNG' AND b.doi_tuong_id = h.id);

-- 2. Hai thẻ Đông Dương về đúng cột của chúng trên board gốc. Đợt nhập 08/2026
--    (khi chưa có trạng thái DEN_HAN_GHTD) đã xếp tạm vào «Thu thập hồ sơ» —
--    sớm hơn thực tế: trên Miro chúng nằm ở cột đến hạn, tức việc DỰ KIẾN,
--    chưa ai bắt tay thu thập.
UPDATE public.ct2_ho_so_tin_dung
   SET trang_thai = 'DEN_HAN_GHTD'
 WHERE ma_hs IN ('KHDN-TD-2608-054', 'KHDN-TD-2608-055')
   AND trang_thai = 'THU_THAP'
   AND NOT EXISTS (SELECT 1 FROM public.ct2_nhip_ho_so n
                    WHERE n.ho_so_id = ct2_ho_so_tin_dung.id);

-- 3. Cảnh báo «Hạn mức sắp hết» thôi đọc hồ sơ HOÀN THÀNH: chương đã khép
--    không đẻ ra việc phải cảnh báo. Tín hiệu còn lại đều là việc thật:
--    thẻ dự kiến chưa vào việc, và hồ sơ đang chạy mà hạn mức cận/quá.
DROP FUNCTION IF EXISTS public.ct2_pdtd_sap_den_han(uuid, integer);

CREATE OR REPLACE FUNCTION public.ct2_pdtd_sap_den_han(_phong uuid, _so_ngay integer DEFAULT 60)
 RETURNS TABLE(id uuid, ma_hs text, khach_hang text, so_tien numeric,
               ngay_den_han_ghtd date, con_lai integer,
               da_co_ho_so_moi boolean, da_xong_ho_so_moi boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT h.id, h.ma_hs, h.khach_hang, h.so_tien, h.ngay_den_han_ghtd,
         (h.ngay_den_han_ghtd - (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int AS con_lai,
         EXISTS (
           SELECT 1 FROM public.ct2_ho_so_tin_dung m
            WHERE m.phong = h.phong
              AND m.khach_hang = h.khach_hang
              AND m.id <> h.id
              AND m.loai_ho_so IN ('TAI_CAP','DIEU_CHINH')
              AND m.trang_thai NOT IN ('HOAN_THANH','TU_CHOI','DEN_HAN_GHTD')
         ) AS da_co_ho_so_moi,
         EXISTS (
           SELECT 1 FROM public.ct2_ho_so_tin_dung m
            WHERE m.phong = h.phong
              AND m.khach_hang = h.khach_hang
              AND m.id <> h.id
              AND m.loai_ho_so IN ('TAI_CAP','DIEU_CHINH')
              AND m.trang_thai = 'HOAN_THANH'
              AND COALESCE(m.ngay_den_han_ghtd > h.ngay_den_han_ghtd, true)
         ) AS da_xong_ho_so_moi
    FROM public.ct2_ho_so_tin_dung h
   WHERE h.phong = _phong
     AND h.ngay_den_han_ghtd IS NOT NULL
     AND h.ngay_den_han_ghtd <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + _so_ngay
     -- Hoàn thành = chương đã khép (đối chiếu board gốc 06/08); Từ chối = đã dừng
     AND h.trang_thai NOT IN ('TU_CHOI','HOAN_THANH')
   ORDER BY h.ngay_den_han_ghtd
$function$;

REVOKE EXECUTE ON FUNCTION public.ct2_pdtd_sap_den_han(uuid, integer) FROM PUBLIC, anon;

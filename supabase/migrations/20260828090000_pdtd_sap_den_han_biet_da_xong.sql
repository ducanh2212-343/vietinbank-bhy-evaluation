-- «Hạn mức sắp hết» phải biết khách nào ĐÃ XỬ LÝ XONG
--
-- Giám đốc chốt 08/2026: bỏ cột dẫn xuất «Đến hạn GHTD 2 tháng tới» trên bàn
-- PDTD — các hồ sơ đến hạn được cho trước vào bảng chính là để đi tiếp sang
-- «Thu thập hồ sơ», thẻ nằm ở bước thật của nó, không hiện trùng hai nơi nữa.
-- Thứ giữ lại là CẢNH BÁO: bấm «Hạn mức sắp hết» phải ra được tên khách hàng
-- sắp hết hạn mà CHƯA có hồ sơ hoặc hồ sơ CHƯA xong.
--
-- Muốn nói «chưa xong» cho đúng thì phải biết «đã xong»: khách có hồ sơ tái
-- cấp/điều chỉnh ĐÃ HOÀN THÀNH nối tiếp hạn mức cũ thì thôi không cảnh báo.
-- Cột da_xong_ho_so_moi trả lời đúng câu đó. Hồ sơ mới hoàn thành mà chưa ghi
-- ngày đến hạn mới cũng tính là xong — cảnh báo ở đây đòi mở-và-làm-xong hồ
-- sơ, không phải đòi điền một trường ngày.

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
              AND m.trang_thai NOT IN ('HOAN_THANH','TU_CHOI')
         ) AS da_co_ho_so_moi,
         EXISTS (
           SELECT 1 FROM public.ct2_ho_so_tin_dung m
            WHERE m.phong = h.phong
              AND m.khach_hang = h.khach_hang
              AND m.id <> h.id
              AND m.loai_ho_so IN ('TAI_CAP','DIEU_CHINH')
              AND m.trang_thai = 'HOAN_THANH'
              -- Hạn mức mới phải nối dài hơn hạn cũ; chưa ghi ngày mới = vẫn xong
              AND COALESCE(m.ngay_den_han_ghtd > h.ngay_den_han_ghtd, true)
         ) AS da_xong_ho_so_moi
    FROM public.ct2_ho_so_tin_dung h
   WHERE h.phong = _phong
     AND h.ngay_den_han_ghtd IS NOT NULL
     AND h.ngay_den_han_ghtd <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + _so_ngay
     AND h.trang_thai <> 'TU_CHOI'
   ORDER BY h.ngay_den_han_ghtd
$function$;

-- DROP/CREATE làm hàm nhận lại ACL mặc định (PUBLIC + anon được EXECUTE) —
-- khoá lại đúng như đợt dựng lớp khoá GRANT: hàm nghiệp vụ chỉ cho người đăng nhập.
REVOKE EXECUTE ON FUNCTION public.ct2_pdtd_sap_den_han(uuid, integer) FROM PUBLIC, anon;

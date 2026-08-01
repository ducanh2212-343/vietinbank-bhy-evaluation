-- ============================================================================
-- Dải «Nhịp Phòng hôm nay» — hàng ảnh đại diện đồng nghiệp
--
-- Miro trực quan vì thấy được đồng nghiệp đang có mặt. Với ngân hàng, thứ có
-- sức nặng hơn «ai đang mở ứng dụng» là «ai đã ghi nhịp sáng nay»: nhìn thấy
-- 8/12 đồng nghiệp đã ghi lúc 7h50 tạo áp lực tích cực đúng theo nguyên tắc
-- minh bạch ngang hàng của đặc tả §1.1 — và không tốn 150 kết nối websocket.
--
-- Bổ sung avatar_url + số thẻ đỏ + số thẻ quá hạn để một dải này tự kể được
-- câu chuyện, không phải gọi thêm query nào. Thêm trạng thái CHUA_GHI (chưa
-- ghi dòng nào) tách khỏi CHUA_DU (ghi rồi nhưng chưa đủ số thẻ).
-- ============================================================================
DROP FUNCTION IF EXISTS public.ct2_nhip_phong_hom_nay(uuid);

CREATE OR REPLACE FUNCTION public.ct2_nhip_phong_hom_nay(_phong uuid)
RETURNS TABLE (
  profile_id uuid, full_name text, avatar_url text,
  so_viec_dang_chay bigint, so_viec_da_ghi bigint,
  so_the_do bigint, so_qua_han bigint, ket_qua text
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH viec AS (
    SELECT d.id, d.nguoi_chiu_trach_nhiem, d.co_tinh_trang, d.han_hoan_thanh
      FROM public.ct2_dau_viec d
     WHERE d.phong = _phong
       AND d.loai_dau_viec = 'TIEN_TRINH'
       AND d.trang_thai = 'DANG_LAM'
  ), nhip AS (
    SELECT n.dau_viec_id,
           min(CASE n.dung_nhip WHEN 'DUNG_GIO' THEN 0 WHEN 'MUON' THEN 1 ELSE 2 END) AS tot_nhat
      FROM public.ct2_nhip_pdca n
     WHERE n.dau_viec_id IN (SELECT id FROM viec)
       AND (n.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
     GROUP BY n.dau_viec_id
  )
  SELECT p.id, p.full_name, p.avatar_url,
         count(v.id) AS so_viec_dang_chay,
         count(nh.dau_viec_id) AS so_viec_da_ghi,
         count(*) FILTER (WHERE v.co_tinh_trang = 'DO') AS so_the_do,
         count(*) FILTER (
           WHERE v.han_hoan_thanh < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
         ) AS so_qua_han,
         CASE
           WHEN count(v.id) = 0 THEN 'KHONG_CO_VIEC'
           WHEN count(nh.dau_viec_id) = count(v.id) AND max(COALESCE(nh.tot_nhat, 2)) = 0 THEN 'DUNG_GIO'
           WHEN count(nh.dau_viec_id) = count(v.id) THEN 'MUON'
           WHEN count(nh.dau_viec_id) > 0 THEN 'CHUA_DU'
           ELSE 'CHUA_GHI'
         END AS ket_qua
    FROM viec v
    JOIN public.profiles p ON p.id = v.nguoi_chiu_trach_nhiem
    LEFT JOIN nhip nh ON nh.dau_viec_id = v.id
   GROUP BY p.id, p.full_name, p.avatar_url
   ORDER BY p.full_name
$$;

REVOKE ALL ON FUNCTION public.ct2_nhip_phong_hom_nay(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_nhip_phong_hom_nay(uuid) TO authenticated;

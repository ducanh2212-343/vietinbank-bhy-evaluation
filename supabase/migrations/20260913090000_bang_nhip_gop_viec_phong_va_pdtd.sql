-- Bảng nhịp theo người: gộp Kanban CÔNG VIỆC PHÒNG và Kanban PDTD vào một bảng.
--
-- Vì sao (GĐ 12/08): bảng nhịp sáng cũ chỉ đếm thẻ công việc phòng — cán bộ
-- chạy 5 hồ sơ tín dụng, ghi nhịp đủ 5/5 vẫn KHÔNG xuất hiện trong bảng (Phan
-- Thế Huynh), còn người bỏ nhịp PDTD thì bảng vẫn báo xanh. Muốn nhắc nhở được
-- thì một người phải là MỘT DÒNG, nhưng số liệu phải tách theo từng bảng để
-- biết nhắc về việc phòng hay về hồ sơ.
--
-- Cách gộp:
--  · Các cột cũ (so_viec_dang_chay, so_viec_da_ghi, ket_qua) giữ nguyên TÊN
--    nhưng thành số GỘP hai bảng — dải avatar «Nhịp Phòng hôm nay» nhờ vậy
--    tự phản ánh cả PDTD mà không phải sửa dòng nào.
--  · Thêm 4 cột tách nguồn: cv_dang_chay/cv_da_ghi (việc phòng),
--    hs_dang_chay/hs_da_ghi (hồ sơ PDTD) — bảng chi tiết hiển thị hai cột riêng.
--  · Hồ sơ «đang chạy» theo đúng luật client HS_DANG_CHAY (ct2TinDung.ts):
--    THU_THAP, TRINH_LDP, TRINH_LDCN, TRINH_TSC, HOAN_THIEN_GN. Cột dự kiến
--    DEN_HAN_GHTD cố ý đứng ngoài — chưa phải hồ sơ, không đòi nhịp.
--  · Nhịp hồ sơ không phân đúng giờ/muộn (ct2_nhip_ho_so không có dung_nhip):
--    ghi hôm nay là đủ. Đúng giờ/muộn chỉ xét trên phần việc phòng.
--  · so_the_do, so_qua_han giữ nguyên nghĩa cũ (chỉ việc phòng) — chấm đỏ trên
--    avatar không đổi nghĩa giữa chừng.
--
-- Đổi kiểu trả về nên phải DROP rồi CREATE — ACL bị xóa theo, cấp lại y hệ
-- trạng thái cũ: authenticated + service_role, không anon (bài học ct2_dat_thong_bao).

drop function if exists public.ct2_nhip_phong_hom_nay(uuid);

create function public.ct2_nhip_phong_hom_nay(_phong uuid)
returns table(
  profile_id uuid, full_name text, avatar_url text,
  so_viec_dang_chay bigint, so_viec_da_ghi bigint,
  so_the_do bigint, so_qua_han bigint, ket_qua text,
  cv_dang_chay bigint, cv_da_ghi bigint,
  hs_dang_chay bigint, hs_da_ghi bigint
)
language sql
stable
set search_path to 'public'
as $$
  WITH cv AS (
    SELECT d.id, d.nguoi_chiu_trach_nhiem AS nguoi, d.co_tinh_trang, d.han_hoan_thanh
      FROM public.ct2_dau_viec d
     WHERE d.phong = _phong
       AND d.loai_dau_viec = 'TIEN_TRINH'
       AND d.trang_thai = 'DANG_LAM'
  ), cv_nhip AS (
    SELECT n.dau_viec_id,
           min(CASE n.dung_nhip WHEN 'DUNG_GIO' THEN 0 WHEN 'MUON' THEN 1 ELSE 2 END) AS tot_nhat
      FROM public.ct2_nhip_pdca n
     WHERE n.dau_viec_id IN (SELECT id FROM cv)
       AND (n.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
     GROUP BY n.dau_viec_id
  ), cv_gop AS (
    SELECT v.nguoi,
           count(*) AS dang_chay,
           count(nh.dau_viec_id) AS da_ghi,
           count(*) FILTER (WHERE v.co_tinh_trang = 'DO') AS the_do,
           count(*) FILTER (
             WHERE v.han_hoan_thanh < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           ) AS qua_han,
           max(COALESCE(nh.tot_nhat, 2)) AS xau_nhat
      FROM cv v
      LEFT JOIN cv_nhip nh ON nh.dau_viec_id = v.id
     GROUP BY v.nguoi
  ), hs_gop AS (
    SELECT h.can_bo AS nguoi,
           count(*) AS dang_chay,
           count(*) FILTER (
             WHERE (h.nhip_gan_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                 = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           ) AS da_ghi
      FROM public.ct2_ho_so_tin_dung h
     WHERE h.phong = _phong
       AND h.trang_thai IN ('THU_THAP','TRINH_LDP','TRINH_LDCN','TRINH_TSC','HOAN_THIEN_GN')
     GROUP BY h.can_bo
  )
  SELECT p.id, p.full_name, p.avatar_url,
         COALESCE(c.dang_chay, 0) + COALESCE(x.dang_chay, 0) AS so_viec_dang_chay,
         COALESCE(c.da_ghi, 0)    + COALESCE(x.da_ghi, 0)    AS so_viec_da_ghi,
         COALESCE(c.the_do, 0)  AS so_the_do,
         COALESCE(c.qua_han, 0) AS so_qua_han,
         CASE
           WHEN NOT public.ct2_la_ngay_lam_viec() THEN 'NGAY_NGHI'
           WHEN COALESCE(c.dang_chay, 0) + COALESCE(x.dang_chay, 0) = 0 THEN 'KHONG_CO_VIEC'
           WHEN COALESCE(c.da_ghi, 0) + COALESCE(x.da_ghi, 0)
                = COALESCE(c.dang_chay, 0) + COALESCE(x.dang_chay, 0)
                AND COALESCE(c.xau_nhat, 0) = 0 THEN 'DUNG_GIO'
           WHEN COALESCE(c.da_ghi, 0) + COALESCE(x.da_ghi, 0)
                = COALESCE(c.dang_chay, 0) + COALESCE(x.dang_chay, 0) THEN 'MUON'
           WHEN COALESCE(c.da_ghi, 0) + COALESCE(x.da_ghi, 0) > 0 THEN 'CHUA_DU'
           ELSE 'CHUA_GHI'
         END AS ket_qua,
         COALESCE(c.dang_chay, 0) AS cv_dang_chay,
         COALESCE(c.da_ghi, 0)    AS cv_da_ghi,
         COALESCE(x.dang_chay, 0) AS hs_dang_chay,
         COALESCE(x.da_ghi, 0)    AS hs_da_ghi
    FROM (SELECT nguoi FROM cv_gop UNION SELECT nguoi FROM hs_gop) ai
    JOIN public.profiles p ON p.id = ai.nguoi
    LEFT JOIN cv_gop c ON c.nguoi = ai.nguoi
    LEFT JOIN hs_gop x ON x.nguoi = ai.nguoi
   ORDER BY p.full_name
$$;

revoke all on function public.ct2_nhip_phong_hom_nay(uuid) from public;
revoke all on function public.ct2_nhip_phong_hom_nay(uuid) from anon;
grant execute on function public.ct2_nhip_phong_hom_nay(uuid) to authenticated;
grant execute on function public.ct2_nhip_phong_hom_nay(uuid) to service_role;

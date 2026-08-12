-- ============================================================================
-- Bảng Kanban TOÀN CHI NHÁNH — hiện ở màn hình của tất cả các Phòng
--
-- Yêu cầu GĐ 12/08: tạo được một bảng Kanban mới hiển thị tại tất cả các Phòng
-- (VD chương trình thi đua, chuyển đổi số, sự kiện chi nhánh).
--
-- Vì sao KHÔNG dùng bảng liên phòng sẵn có: bảng LIEN_PHONG chỉ hiện cho thành
-- viên được thêm ĐÍCH DANH ở phòng khác — muốn cả 100+ người thấy thì phải thêm
-- 100+ thành viên và nhớ thêm từng người mới về sau. «Hiện ở mọi phòng» là một
-- chế độ, không phải một danh sách.
--
-- Thiết kế: thêm loại bảng thứ ba TOAN_CN trên ct2_bang:
--  · Vẫn có đúng MỘT phòng đầu mối chịu trách nhiệm (giữ nguyên luật quản trị:
--    lãnh đạo phòng đầu mối + người tạo + BGĐ) — «của chung» không có nghĩa là
--    «không ai chịu trách nhiệm».
--  · Mọi cán bộ (is_staff) xem được bảng và thẻ trên bảng; giao thẻ được cho
--    người bất kỳ phòng nào (hệ thống vốn không khoá người phụ trách theo phòng).
--  · Chỉ BGĐ / quản trị hệ thống được ĐẶT hoặc GỠ chế độ toàn chi nhánh —
--    phát sóng tới cả chi nhánh là quyết định cấp chi nhánh. Nội dung bảng
--    (tên, mô tả) phòng đầu mối vẫn tự sửa.
--  · TOAN_CN buộc che_do_xem = 'PHONG': một bảng vừa «cho cả chi nhánh» vừa
--    «hạn chế thành viên» là tự mâu thuẫn.
--  · Bảng nhịp mỗi phòng đếm cả thẻ toàn chi nhánh của NGƯỜI phòng mình —
--    việc chung không được thành vùng mù nhịp ở chính phòng của cán bộ.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Nới danh mục loại bảng + ràng buộc chống mâu thuẫn
-- ---------------------------------------------------------------------------
ALTER TABLE public.ct2_bang DROP CONSTRAINT IF EXISTS ct2_bang_loai_check;
ALTER TABLE public.ct2_bang
  ADD CONSTRAINT ct2_bang_loai_check CHECK (loai IN ('MANG', 'LIEN_PHONG', 'TOAN_CN'));

ALTER TABLE public.ct2_bang DROP CONSTRAINT IF EXISTS ct2_bang_toan_cn_khong_han_che;
ALTER TABLE public.ct2_bang
  ADD CONSTRAINT ct2_bang_toan_cn_khong_han_che
  CHECK (loai <> 'TOAN_CN' OR che_do_xem = 'PHONG');

-- ---------------------------------------------------------------------------
-- 2) Ai xem được bảng: thêm nhánh TOAN_CN → mọi cán bộ
--    (CREATE OR REPLACE cùng chữ ký — ACL giữ nguyên, không phải cấp lại)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_xem_duoc_bang(_bang uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _bang IS NULL THEN true          -- Kanban chung của phòng: luật cũ lo
    ELSE EXISTS (
      SELECT 1 FROM public.ct2_bang b
      WHERE b.id = _bang
        AND (
          -- Bảng toàn chi nhánh: mọi cán bộ thấy — đó chính là định nghĩa của nó.
          -- is_staff đứng ngay tại đây vì policy thẻ gọi thẳng hàm này.
          (b.loai = 'TOAN_CN' AND public.is_staff(auth.uid()))
          -- BGĐ và quản trị hệ thống thấy mọi bảng — kể cả bảng hạn chế:
          -- Giám đốc phải thấy được mảng tổ chức, đó là yêu cầu gốc
          OR public.has_role(auth.uid(), 'bgd'::app_role)
          OR public.has_role(auth.uid(), 'system_admin'::app_role)
          -- Thành viên được thêm đích danh
          OR EXISTS (
            SELECT 1 FROM public.ct2_bang_thanh_vien tv
            WHERE tv.bang_id = b.id AND tv.profile_id = public.get_my_profile_id()
          )
          -- Bảng chế độ PHÒNG: ai xem được bảng phòng thì xem được bảng này
          OR (b.che_do_xem = 'PHONG' AND public.ct2_xem_duoc_dau_viec(b.phong, '{}'::uuid[]))
        )
    )
  END
$$;

-- ---------------------------------------------------------------------------
-- 3) Gác cổng: đặt/gỡ chế độ toàn chi nhánh là việc của BGĐ
--    Trigger thay vì policy WITH CHECK — chỉ chặn đúng việc ĐỔI cờ TOAN_CN,
--    không chặn lãnh đạo phòng đầu mối sửa tên/mô tả bảng của mình.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_bang_gac_toan_cn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.loai = 'TOAN_CN')
     OR (TG_OP = 'UPDATE' AND NEW.loai IS DISTINCT FROM OLD.loai
         AND 'TOAN_CN' IN (NEW.loai, OLD.loai)) THEN
    IF NOT (public.has_role(auth.uid(), 'bgd'::app_role)
            OR public.has_role(auth.uid(), 'system_admin'::app_role)) THEN
      RAISE EXCEPTION 'Chỉ Ban Giám đốc đặt hoặc gỡ được chế độ «toàn chi nhánh» — bảng hiện ở mọi Phòng là quyết định cấp chi nhánh.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_ct2_bang_gac_toan_cn ON public.ct2_bang;
CREATE TRIGGER t_ct2_bang_gac_toan_cn
  BEFORE INSERT OR UPDATE ON public.ct2_bang
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_bang_gac_toan_cn();

-- ---------------------------------------------------------------------------
-- 4) Bảng nhịp mỗi phòng đếm cả thẻ toàn chi nhánh của người phòng mình.
--    Thẻ của bảng TOAN_CN mang phong = phòng đầu mối, nên với phòng khác nó
--    vô hình trong nhịp dù người phụ trách là quân của phòng đó. Nới điều
--    kiện: thẻ thuộc phòng _phong, HOẶC thẻ trên bảng TOAN_CN mà người chịu
--    trách nhiệm biên chế ở _phong. Cùng chữ ký — CREATE OR REPLACE giữ ACL.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_nhip_phong_hom_nay(_phong uuid)
RETURNS TABLE(
  profile_id uuid, full_name text, avatar_url text,
  so_viec_dang_chay bigint, so_viec_da_ghi bigint,
  so_the_do bigint, so_qua_han bigint, ket_qua text,
  cv_dang_chay bigint, cv_da_ghi bigint,
  hs_dang_chay bigint, hs_da_ghi bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH cv AS (
    SELECT d.id, d.nguoi_chiu_trach_nhiem AS nguoi, d.co_tinh_trang, d.han_hoan_thanh
      FROM public.ct2_dau_viec d
      LEFT JOIN public.ct2_bang b ON b.id = d.bang_id
      LEFT JOIN public.profiles ng ON ng.id = d.nguoi_chiu_trach_nhiem
     WHERE d.loai_dau_viec = 'TIEN_TRINH'
       AND d.trang_thai = 'DANG_LAM'
       AND (
         d.phong = _phong
         OR (b.loai = 'TOAN_CN' AND ng.department_id = _phong)
       )
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

COMMENT ON CONSTRAINT ct2_bang_toan_cn_khong_han_che ON public.ct2_bang IS
  'Bảng toàn chi nhánh không thể đồng thời hạn chế thành viên — hai chế độ phủ định nhau.';

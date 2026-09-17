-- 20261035090000 — Cán bộ thấy số ý tưởng của mình theo TỪNG CẤP ĐỘ hiện tại
--
-- Vì sao: Hội đồng công bố đợt «Tháng 6,7,8» ngày 16/09/2026, 14 ý tưởng lên
-- Vươn cành, nhưng dải «Ý tưởng của bạn» vẫn đếm theo trạng thái HỒ SƠ Bén rễ
-- (dòng sổ Bén rễ vẫn «đã ghi nhận» dù ý tưởng đã lên cấp) nên cán bộ thấy
-- «3 đã công nhận Bén rễ» thay vì «2 Bén rễ · 1 Vươn cành». Cấp độ hiện tại
-- của ý tưởng là `portal_ideas.development_level` — nguồn duy nhất, cũng là
-- cái thẻ ý tưởng đang hiện.
--
-- Ý tưởng «của tôi» = tôi tạo phiếu HOẶC tên tôi nằm trong ô «Người đề xuất»
-- và khớp ĐÚNG MỘT hồ sơ danh bạ (đồng đề xuất). Đây là cùng luật tách tên mà
-- Hội đồng dùng để loại phiếu liên phòng (`bhy_ideas_phong_lien_quan`), nên
-- cách tách/chuẩn hóa tên được gom về MỘT hàm dùng chung thay vì chép lại.

-- 1. Tách ô «Người đề xuất» thành danh sách tên đã chuẩn hóa (thường, bỏ
--    khoảng trắng và dấu chấm/chấm phẩy cuối — cán bộ hay gõ «Ngô Thị Nhung.»).
CREATE OR REPLACE FUNCTION public.bhy_ideas_tach_ten_de_xuat(_proposer text)
RETURNS text[]
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $$
  SELECT coalesce(array_agg(lower(btrim(regexp_replace(x, '[.;,\s]+$', '')))), '{}'::text[])
  FROM unnest(string_to_array(coalesce(_proposer, ''), ',')) AS x
  WHERE btrim(x) <> ''
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_tach_ten_de_xuat(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_tach_ten_de_xuat(text) TO authenticated, service_role;

-- 2. bhy_ideas_phong_lien_quan dùng lại hàm tách tên. Kết quả KHÔNG đổi —
--    đã đối chiếu dấu vân tay 188/188 ý tưởng trước và sau khi áp.
CREATE OR REPLACE FUNCTION public.bhy_ideas_phong_lien_quan(_idea_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ten AS (
    SELECT unnest(public.bhy_ideas_tach_ten_de_xuat(i.proposer)) AS ten
    FROM public.portal_ideas i
    WHERE i.id = _idea_id
  ),
  khop AS (
    SELECT t.ten,
           (SELECT count(*) FROM public.profiles p WHERE lower(btrim(p.full_name)) = t.ten) AS n,
           (SELECT p.department_id FROM public.profiles p WHERE lower(btrim(p.full_name)) = t.ten LIMIT 1) AS phong
    FROM ten t
  )
  SELECT coalesce(array_agg(DISTINCT phong), '{}'::uuid[])
  FROM (
    SELECT i.phong_id AS phong FROM public.portal_ideas i WHERE i.id = _idea_id AND i.phong_id IS NOT NULL
    UNION
    SELECT k.phong FROM khop k WHERE k.n = 1 AND k.phong IS NOT NULL
  ) t
$$;

-- 3. Ý tưởng của người đang đăng nhập, kèm cấp độ hiện tại.
--    `vai`: 'chu_y_tuong' (tôi tạo phiếu) | 'dong_de_xuat' (tên tôi trong ô
--    Người đề xuất, khớp đúng một hồ sơ). Tên trùng nhiều hồ sơ thì chỉ tính
--    phiếu tự tạo — không gán nhầm ý tưởng của người trùng tên.
--    `cong_nhan_luc`: mốc ghi sổ của đúng cấp hiện tại (Vươn cành = ngày công
--    bố Hội đồng; Bén rễ = ngày Giám đốc duyệt). `thuong_luy_ke`: tổng tiền đã
--    ghi sổ mọi cấp — để thẻ ý tưởng nói được «thưởng lũy kế 1.400.000đ».
CREATE OR REPLACE FUNCTION public.bhy_ideas_y_tuong_cua_toi()
RETURNS TABLE(
  idea_id uuid,
  title text,
  development_level text,
  vai text,
  cong_nhan_luc timestamptz,
  thuong_luy_ke integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH toi AS (
    SELECT lower(btrim(coalesce(p.full_name, ''))) AS ten
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1
  ),
  ten_duy_nhat AS (
    SELECT t.ten FROM toi t
    WHERE t.ten <> ''
      AND (SELECT count(*) FROM public.profiles p WHERE lower(btrim(p.full_name)) = t.ten) = 1
  )
  SELECT i.id,
         i.title,
         i.development_level,
         CASE WHEN i.created_by = auth.uid() THEN 'chu_y_tuong' ELSE 'dong_de_xuat' END,
         (SELECT max(coalesce(a.duyet_luc, a.ghi_nhan_luc, a.created_at))
            FROM public.portal_idea_awards a
           WHERE a.idea_id = i.id AND a.cap_do = i.development_level AND a.trang_thai = 'da_ghi_nhan'),
         (SELECT coalesce(sum(a.muc_thuong), 0)::int
            FROM public.portal_idea_awards a
           WHERE a.idea_id = i.id AND a.trang_thai = 'da_ghi_nhan')
  FROM public.portal_ideas i
  WHERE public.is_staff(auth.uid())
    AND (
      i.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM ten_duy_nhat t
        WHERE t.ten = ANY (public.bhy_ideas_tach_ten_de_xuat(i.proposer))
      )
    )
  ORDER BY i.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_y_tuong_cua_toi() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_y_tuong_cua_toi() TO authenticated, service_role;

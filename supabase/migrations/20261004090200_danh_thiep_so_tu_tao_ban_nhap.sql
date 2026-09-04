-- ============================================================================
-- DANH THIẾP SỐ — cán bộ THẤY NGAY thẻ của mình: dựng bản nháp từ hồ sơ nhân sự 343.
--
-- Vấn đề: sau khi áp phân hệ, 100 cán bộ mở «Danh thiếp số của tôi» chỉ thấy
-- «Phòng TCTH chưa tạo hồ sơ» cho tới khi TCTH nhập tay từng người. Ở đây máy
-- ghép SẴN bản nháp từ hồ sơ 343 (tên, email, phòng → đơn vị, chức danh 343 →
-- chức danh đối ngoại theo bảng ánh xạ) — cán bộ xem trước được ngay bằng
-- nc_resolve_card(slug, xem_truoc = true); thẻ vẫn KHÔNG công khai cho tới khi
-- TCTH duyệt và phát hành (NT1/NT2 giữ nguyên: mọi chữ trên thẻ vẫn từ từ điển).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Ánh xạ tên phòng 343 → mã đơn vị danh thiếp. So khớp không dấu, chữ thường.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_anh_xa_don_vi_343(_ten_phong TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  t TEXT := lower(extensions.unaccent(replace(replace(coalesce(_ten_phong, ''), 'đ', 'd'), 'Đ', 'D')));
  ma TEXT;
BEGIN
  ma := CASE
    WHEN t LIKE '%van giang%'   THEN 'PGD_VG'
    WHEN t LIKE '%an thi%'      THEN 'PGD_AT'
    WHEN t LIKE '%khoai chau%'  THEN 'PGD_KC'
    WHEN t LIKE '%ocean city%'  THEN 'PGD_OC'
    WHEN t LIKE '%van lam%'     THEN 'PGD_VL'
    WHEN t LIKE '%khdn%' OR t LIKE '%khach hang doanh nghiep%' THEN 'P_KHDN'
    WHEN t LIKE '%ban le%'      THEN 'P_BL'
    WHEN t LIKE '%dich vu khach hang%' OR t LIKE '%dvkh%' THEN 'P_DVKH'
    WHEN t LIKE '%ho tro tin dung%' OR t LIKE '%httd%' THEN 'P_HTTD'
    WHEN t LIKE '%to chuc tong hop%' OR t LIKE '%tcth%' THEN 'P_TCTH'
    ELSE 'CN_BHY'   -- Ban Giám đốc và phòng chưa có trong từ điển: thuộc thẳng Chi nhánh
  END;
  -- Chỉ trả mã đang có trong từ điển; không có thì về Chi nhánh
  IF NOT EXISTS (SELECT 1 FROM public.nc_org_unit WHERE code = ma) THEN
    ma := CASE WHEN EXISTS (SELECT 1 FROM public.nc_org_unit WHERE code = 'CN_BHY') THEN 'CN_BHY' END;
  END IF;
  RETURN ma;
END $$;
REVOKE ALL ON FUNCTION public.nc_anh_xa_don_vi_343(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nc_anh_xa_don_vi_343(TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Ánh xạ chức danh 343 (chữ tự do theo QĐ bổ nhiệm) → mã chức danh ĐỐI NGOẠI.
--    Bám đúng 33 chức danh đang có trong hồ sơ 343 (09/2026). Không khớp → NULL
--    để TCTH gán tay; KHÔNG bao giờ đoán bừa vì sai chức danh trên thẻ là lỗi
--    khó thu hồi.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_anh_xa_chuc_danh_343(_chuc_danh TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  t TEXT := lower(extensions.unaccent(replace(replace(coalesce(_chuc_danh, ''), 'đ', 'd'), 'Đ', 'D')));
  ma TEXT;
BEGIN
  ma := CASE
    WHEN t = 'giam doc'                                   THEN 'GD_CN'
    WHEN t LIKE 'pho giam doc%'                           THEN 'PGD_CN'
    WHEN t LIKE 'truong phong giao dich%'                 THEN 'GD_PGD'
    WHEN t LIKE 'pho phong giao dich%'                    THEN 'PGD_PGD'
    WHEN t LIKE 'truong phong%'                           THEN 'TP'
    WHEN t LIKE 'pho phong%'                              THEN 'PP'
    WHEN t LIKE 'kiem soat vien%'                         THEN 'KSV'
    WHEN t LIKE '%giao dich vien%'                        THEN 'GDV'
    WHEN t LIKE '%fdi%'                                   THEN 'RM_FDI'
    WHEN t LIKE '%quan he khach hang ban le%'             THEN 'RM_BL'
    WHEN t LIKE '%phong khdn%' OR t LIKE '%khach hang doanh nghiep%' THEN 'RM_KHDN'
    WHEN t LIKE '%thu quy%' OR t LIKE '%thu kho%'         THEN 'TQ'
    -- Cán bộ nghiệp vụ nội bộ (HTTD, hậu kiểm, tổng hợp, hành chính, nhân sự,
    -- điện toán, kế toán, nhân viên DVKH): chức danh trung tính «Chuyên viên»
    WHEN t LIKE 'can bo%' OR t LIKE 'nhan vien%'          THEN 'CV'
    ELSE NULL
  END;
  IF ma IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.nc_title WHERE code = ma AND scope = 'external' AND status NOT IN ('rejected', 'retired')
  ) THEN
    ma := NULL;
  END IF;
  RETURN ma;
END $$;
REVOKE ALL ON FUNCTION public.nc_anh_xa_chuc_danh_343(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nc_anh_xa_chuc_danh_343(TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Dựng bản nháp cho MỘT hồ sơ 343. Cán bộ tự gọi cho chính mình (không tham
--    số); TCTH gọi cho người khác. Đã có hồ sơ danh thiếp thì trả về hồ sơ đó —
--    gọi lại bao nhiêu lần cũng không tạo trùng.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_tao_ban_nhap_tu_343(_profile_id UUID DEFAULT NULL)
RETURNS public.nc_staff
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  hs RECORD;
  cb public.nc_staff%ROWTYPE;
  ma_dv TEXT;
  ma_cd TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Cần đăng nhập'; END IF;

  IF _profile_id IS NULL THEN
    SELECT p.*, d.name AS ten_phong INTO hs
      FROM public.profiles p LEFT JOIN public.departments d ON d.id = p.department_id
     WHERE p.user_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'Tài khoản này không có hồ sơ nhân sự 343'; END IF;
  ELSE
    IF NOT public.nc_la_quan_tri(auth.uid()) THEN
      RAISE EXCEPTION 'Chỉ Phòng TCTH dựng bản nháp cho cán bộ khác';
    END IF;
    SELECT p.*, d.name AS ten_phong INTO hs
      FROM public.profiles p LEFT JOIN public.departments d ON d.id = p.department_id
     WHERE p.id = _profile_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy hồ sơ nhân sự'; END IF;
  END IF;
  IF hs.status <> 'active' THEN RAISE EXCEPTION 'Hồ sơ nhân sự không còn hoạt động'; END IF;

  -- Đã có (theo hồ sơ hoặc theo tài khoản) thì trả về luôn
  SELECT * INTO cb FROM public.nc_staff
   WHERE profile_id = hs.id OR (hs.user_id IS NOT NULL AND user_id = hs.user_id)
   LIMIT 1;
  IF FOUND THEN RETURN cb; END IF;

  ma_dv := public.nc_anh_xa_don_vi_343(hs.ten_phong);
  IF ma_dv IS NULL THEN RAISE EXCEPTION 'Từ điển đơn vị chưa có dữ liệu — chạy dữ liệu mồi trước'; END IF;
  ma_cd := public.nc_anh_xa_chuc_danh_343(hs.position);

  INSERT INTO public.nc_staff (
    profile_id, user_id, employee_code, full_name, employment_type, org_unit_code,
    external_title_id, email, phone_mobile, photo_url, note_internal
  ) VALUES (
    hs.id, hs.user_id,
    -- Mã cán bộ trùng (hai hồ sơ cùng mã) không được chặn việc tạo nháp
    CASE WHEN EXISTS (SELECT 1 FROM public.nc_staff WHERE employee_code = hs.employee_code) THEN NULL ELSE hs.employee_code END,
    hs.full_name, 'bien_che', ma_dv,
    (SELECT id FROM public.nc_title WHERE code = ma_cd),
    nullif(lower(btrim(hs.email)), ''), nullif(btrim(hs.phone), ''), nullif(btrim(hs.avatar_url), ''),
    'Dựng tự động từ hồ sơ 343' || CASE WHEN hs.position IS NOT NULL THEN ' — chức danh 343: ' || hs.position ELSE '' END
      || CASE WHEN ma_cd IS NULL THEN ' (CHƯA ánh xạ được chức danh đối ngoại)' ELSE '' END
  )
  RETURNING * INTO cb;
  RETURN cb;
END $$;
REVOKE ALL ON FUNCTION public.nc_tao_ban_nhap_tu_343(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nc_tao_ban_nhap_tu_343(UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) TCTH dựng hàng loạt cho mọi cán bộ đang hoạt động chưa có hồ sơ danh thiếp.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_dong_bo_hang_loat_tu_343()
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD;
  cb public.nc_staff;
  tao INT := 0;
  loi INT := 0;
  chua_cd TEXT[] := '{}';
  loi_ds TEXT[] := '{}';
BEGIN
  IF NOT public.nc_la_quan_tri(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng TCTH đồng bộ hàng loạt';
  END IF;
  FOR r IN
    SELECT p.id, p.full_name FROM public.profiles p
     WHERE p.status = 'active'
       AND NOT EXISTS (SELECT 1 FROM public.nc_staff s WHERE s.profile_id = p.id OR (p.user_id IS NOT NULL AND s.user_id = p.user_id))
     ORDER BY p.full_name
  LOOP
    BEGIN
      cb := public.nc_tao_ban_nhap_tu_343(r.id);
      tao := tao + 1;
      IF cb.external_title_id IS NULL THEN chua_cd := chua_cd || r.full_name; END IF;
    EXCEPTION WHEN OTHERS THEN
      loi := loi + 1;
      loi_ds := loi_ds || (r.full_name || ': ' || SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('tao_moi', tao, 'loi', loi, 'chua_anh_xa_chuc_danh', to_jsonb(chua_cd), 'chi_tiet_loi', to_jsonb(loi_ds));
END $$;
REVOKE ALL ON FUNCTION public.nc_dong_bo_hang_loat_tu_343() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nc_dong_bo_hang_loat_tu_343() TO authenticated, service_role;

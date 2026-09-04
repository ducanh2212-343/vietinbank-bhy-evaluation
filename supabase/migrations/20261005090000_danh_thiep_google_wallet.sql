-- ============================================================================
-- DANH THIẾP SỐ — cấu hình Google Wallet.
--
-- Ba khoá cấu hình để nút «Thêm vào Google Wallet» bật/tắt được mà không phải
-- phát hành lại bản web. Khoá RIÊNG của tài khoản dịch vụ KHÔNG nằm ở đây: nó
-- là biến bí mật của edge function (GOOGLE_WALLET_SA_KEY) — đưa khoá riêng vào
-- bảng thì mọi cán bộ đọc được nc_cau_hinh sẽ đọc được khoá.
--
-- Mặc định TẮT: chưa đăng ký Issuer với Google thì nút không hiện, tránh cán bộ
-- bấm vào một nút chỉ báo lỗi.
-- ============================================================================

INSERT INTO public.nc_cau_hinh (khoa, gia_tri) VALUES
  -- Công tắc chính; bật ở màn Quản trị VCard sau khi đã có Issuer ID
  ('google_wallet_bat', 'false'::jsonb),
  -- Issuer ID lấy trong Google Wallet Business Console (dãy số ~19 chữ số)
  ('google_wallet_issuer_id', '""'::jsonb),
  -- Hậu tố lớp thẻ: classId = <issuer_id>.<hậu tố>. Lớp tạo một lần bên Google.
  ('google_wallet_class_suffix', '"danh_thiep_v1"'::jsonb)
ON CONFLICT (khoa) DO NOTHING;

COMMENT ON TABLE public.nc_cau_hinh IS
  'Cấu hình phân hệ danh thiếp (logo, gốc URL thẻ, Google Wallet). KHÔNG chứa khoá bí mật — khoá riêng Google nằm ở biến bí mật của edge function.';

-- ---------------------------------------------------------------------------
-- nc_resolve_card: thêm cờ `wallet_ready` để trang thẻ biết có nên hiện nút
-- «Thêm vào Google Wallet» hay không.
--
-- Vì sao cờ nằm trong payload chứ không để trang tự đọc nc_cau_hinh: khách quét
-- thẻ là `anon` và anon KHÔNG được đọc bảng cấu hình (RLS fail-closed). Nếu để
-- nút luôn hiện rồi mới báo lỗi khi bấm thì khách gặp nút chết — mất thể diện
-- ngay trước mặt đối tác.
--
-- `wallet` (được phép theo loại nhân sự) giữ nguyên nghĩa cũ; nút chỉ hiện khi
-- CẢ HAI cùng đúng.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_resolve_card(_slug TEXT, _xem_truoc BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s public.nc_staff%ROWTYPE;
  chinh_thuc BOOLEAN;
  title JSONB := NULL;
  title_src TEXT := NULL;
  ct RECORD;
  logo_bat BOOLEAN;
  base_url TEXT;
  ma_lien_he TEXT;
  kenh JSONB;
  don_vi JSONB;
  dia_chi JSONB;
  map_url TEXT;
  hotline TEXT;
  wallet_bat BOOLEAN;
  wallet_issuer TEXT;
BEGIN
  SELECT * INTO s FROM public.nc_staff WHERE slug = lower(btrim(_slug));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF _xem_truoc THEN
    IF auth.uid() IS NULL
       OR NOT (public.nc_la_quan_tri(auth.uid()) OR s.user_id = auth.uid()) THEN
      RETURN jsonb_build_object('status', 'not_found');
    END IF;
  ELSE
    IF s.revoked_at IS NOT NULL THEN
      SELECT gia_tri #>> '{}' INTO ma_lien_he FROM public.nc_cau_hinh WHERE khoa = 'lien_he_khi_thu_hoi';
      SELECT jsonb_build_object(
        'name', public.nc_goi_6_ngon_ngu(u.name_vi, u.name_en, u.name_zh_hans, u.name_zh_hant, u.name_ko, u.name_ja),
        'addr', public.nc_goi_6_ngon_ngu(u.addr_vi, u.addr_en, u.addr_zh_hans, u.addr_zh_hant, u.addr_ko, u.addr_ja),
        'phone', u.phone, 'map_url', u.map_url
      ) INTO don_vi FROM public.nc_org_unit u WHERE u.code = coalesce(ma_lien_he, 'CN_BHY');
      RETURN jsonb_build_object('status', 'revoked', 'contact', coalesce(don_vi, '{}'::jsonb));
    END IF;
    IF NOT s.card_enabled OR s.status <> 'approved' THEN
      RETURN jsonb_build_object('status', 'not_found');
    END IF;
  END IF;

  chinh_thuc := s.employment_type IN ('bien_che', 'hop_dong');

  IF s.custom_title_id IS NOT NULL THEN
    SELECT * INTO ct FROM public.nc_custom_title
     WHERE id = s.custom_title_id AND status = 'approved'
       AND (expires_on IS NULL OR expires_on >= CURRENT_DATE);
    IF FOUND THEN
      title := public.nc_goi_6_ngon_ngu(ct.name_vi, ct.name_en, ct.name_zh_hans, ct.name_zh_hant, ct.name_ko, ct.name_ja);
      title_src := 'custom';
    END IF;
  END IF;
  IF title IS NULL AND s.external_title_id IS NOT NULL THEN
    SELECT public.nc_goi_6_ngon_ngu(t.name_vi, t.name_en, t.name_zh_hans, t.name_zh_hant, t.name_ko, t.name_ja)
      INTO title
      FROM public.nc_title t
     WHERE t.id = s.external_title_id
       AND (_xem_truoc OR t.status = 'approved');
    IF title IS NOT NULL THEN title_src := 'external'; END IF;
  END IF;
  IF title IS NULL AND NOT _xem_truoc THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT coalesce((gia_tri)::boolean, true) INTO logo_bat FROM public.nc_cau_hinh WHERE khoa = 'logo_enabled';
  SELECT gia_tri #>> '{}' INTO base_url FROM public.nc_cau_hinh WHERE khoa = 'card_base_url';
  SELECT coalesce((gia_tri)::boolean, false) INTO wallet_bat FROM public.nc_cau_hinh WHERE khoa = 'google_wallet_bat';
  SELECT gia_tri #>> '{}' INTO wallet_issuer FROM public.nc_cau_hinh WHERE khoa = 'google_wallet_issuer_id';

  don_vi := public.nc_chuoi_don_vi(s.org_unit_code);
  SELECT e->'addr', e->>'map_url', e->>'phone' INTO dia_chi, map_url, hotline
    FROM jsonb_array_elements(don_vi) WITH ORDINALITY AS t(e, i)
   WHERE (e->'addr') <> '{}'::jsonb
   ORDER BY i DESC LIMIT 1;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'type', c.type, 'value', c.value, 'qr_image_url', c.qr_image_url
    ) ORDER BY c.sort_order, c.type), '[]'::jsonb)
    INTO kenh
    FROM public.nc_channel c
   WHERE c.staff_id = s.id AND c.is_public
     AND (chinh_thuc OR (s.employment_type = 'ctv' AND c.type = 'zalo'));

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'status', CASE WHEN _xem_truoc THEN 'preview' ELSE 'ok' END,
    'slug', s.slug,
    'card_url', coalesce(base_url, 'https://bachungyenone.com/card/') || s.slug,
    'template', public.nc_mau_the(s.employment_type),
    'employment_type', s.employment_type,
    'name', jsonb_strip_nulls(jsonb_build_object(
      'vi', s.full_name, 'latin', s.full_name_latin,
      'zh', s.name_zh, 'ko', s.name_ko, 'ja', s.name_ja
    )),
    'title', title,
    'title_source', title_src,
    'units', don_vi,
    'addr', coalesce(dia_chi, '{}'::jsonb),
    'map_url', map_url,
    'phone_office', CASE WHEN s.phone_office_public THEN s.phone_office END,
    'unit_phone', hotline,
    'photo_url', s.photo_url,
    'phone_mobile', s.phone_mobile,
    'logo', (chinh_thuc AND logo_bat),
    'bank_line', chinh_thuc,
    'affiliation', CASE s.employment_type
      WHEN 'thue_ngoai' THEN 'thue_ngoai' WHEN 'ctv' THEN 'ctv' WHEN 'thuc_tap' THEN 'thuc_tap' END,
    'email', CASE WHEN chinh_thuc OR (s.email IS NOT NULL AND s.email NOT ILIKE '%@vietinbank.vn') THEN s.email END,
    'channels', kenh,
    'wallet', (chinh_thuc OR (s.employment_type = 'thue_ngoai' AND s.wallet_override)),
    'wallet_ready', (coalesce(wallet_bat, false) AND coalesce(btrim(wallet_issuer), '') <> ''),
    'nfc', chinh_thuc
  ));
END $$;

REVOKE ALL ON FUNCTION public.nc_resolve_card(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nc_resolve_card(TEXT, BOOLEAN) TO anon, authenticated, service_role;

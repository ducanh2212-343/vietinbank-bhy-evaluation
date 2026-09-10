-- ============================================================================
-- LƯỢT SỬ DỤNG BẮC HƯNG YÊN FDI HUB — theo tab, theo phòng
--
-- Giám đốc 10/09/2026: «hiển thị số lượt sử dụng từng tab, nhóm user sử dụng
-- thuộc phòng nào, để nắm được sự sử dụng của các Phòng, đặc biệt các Phòng
-- giao dịch đang trong quá trình tiếp cận KH FDI».
--
-- FDI Hub là cẩm nang: không sinh dữ liệu nghiệp vụ nên trước đây không tự
-- biết ai đọc. Bảng này ghi MỖI LẦN MỞ MỘT TAB của một cán bộ — chỉ cần chừng
-- đó để trả lời «phòng nào đã dùng, dùng phần nào, bao nhiêu người».
--
-- Ba quyết định:
--  1. Ghi qua RPC, không cho INSERT thẳng: hàm tự lấy hồ sơ + phòng từ phiên
--     đăng nhập (không tin client) và CHỐNG ĐẾM TRÙNG — cùng người, cùng tab
--     trong 10 phút chỉ tính một lượt, để bấm qua lại giữa hai tab không thổi
--     phồng con số.
--  2. Chụp department_id tại thời điểm xem: cán bộ chuyển phòng thì lượt cũ
--     vẫn thuộc phòng cũ — thống kê theo tháng không đổi khi tổ chức đổi.
--  3. Không ai SELECT thẳng bảng (không có policy đọc). Số liệu đi qua hàm
--     thống kê SECURITY DEFINER, gác quyền ở SQL: lãnh đạo phòng, PGĐ, BGĐ,
--     TCTH. Hàm chỉ trả CON SỐ THEO PHÒNG, không trả tên người — mục đích là
--     biết phòng nào đang tiếp cận, không phải soi từng cán bộ.
-- ============================================================================

CREATE TABLE public.fdi_hub_luot_xem (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  -- Phải trùng danh sách tab trong src/data/one/fdiHub.ts (FDI_HUB_TABS)
  tab text NOT NULL CHECK (tab IN (
    'tong-quan', 'hanh-trinh', 'checklist', 'van-hoa', 'qua-tang',
    'kho-cong-cu', 'bao-cao-nhanh', 'kich-ban', 'tro-ly-ai'
  )),
  xem_luc timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fdi_hub_luot_xem IS
  'Mỗi dòng = một lượt cán bộ mở một tab của Bắc Hưng Yên FDI Hub (đã chống trùng 10 phút). Ghi qua fdi_hub_ghi_luot_xem(), đọc qua fdi_hub_thong_ke().';

CREATE INDEX fdi_hub_luot_xem_xem_luc_idx ON public.fdi_hub_luot_xem (xem_luc DESC);
CREATE INDEX fdi_hub_luot_xem_nguoi_tab_idx ON public.fdi_hub_luot_xem (profile_id, tab, xem_luc DESC);
CREATE INDEX fdi_hub_luot_xem_phong_idx ON public.fdi_hub_luot_xem (department_id, xem_luc DESC);

ALTER TABLE public.fdi_hub_luot_xem ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fdi_hub_luot_xem FROM PUBLIC, anon, authenticated;
-- Không GRANT gì cho authenticated và không có policy: mọi đường vào/ra đều
-- qua hai hàm dưới đây (SECURITY DEFINER).

-- ---------------------------------------------------------------------------
-- Ghi một lượt xem. Trả true nếu đã ghi, false nếu bị gộp vào lượt 10 phút
-- trước hoặc người gọi không phải cán bộ (khách đối tác không ghi — họ cũng
-- không vào được trang).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_hub_ghi_luot_xem(_tab text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile uuid;
  _phong uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN
    RETURN false;
  END IF;
  SELECT id, department_id INTO _profile, _phong
    FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF _profile IS NULL THEN
    RETURN false;
  END IF;
  IF _tab IS NULL OR _tab NOT IN (
    'tong-quan', 'hanh-trinh', 'checklist', 'van-hoa', 'qua-tang',
    'kho-cong-cu', 'bao-cao-nhanh', 'kich-ban', 'tro-ly-ai'
  ) THEN
    RAISE EXCEPTION 'Tab FDI Hub không hợp lệ: %', _tab USING ERRCODE = '22023';
  END IF;
  -- Chống đếm trùng: cùng người, cùng tab trong 10 phút = một lượt
  IF EXISTS (
    SELECT 1 FROM public.fdi_hub_luot_xem
     WHERE profile_id = _profile AND tab = _tab
       AND xem_luc > now() - interval '10 minutes'
  ) THEN
    RETURN false;
  END IF;
  INSERT INTO public.fdi_hub_luot_xem (profile_id, department_id, tab)
  VALUES (_profile, _phong, _tab);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fdi_hub_ghi_luot_xem(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fdi_hub_ghi_luot_xem(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Ai xem được thống kê: lãnh đạo phòng (manager), Phó Giám đốc (pgd), Ban
-- Giám đốc (bgd), Phòng TCTH / quản trị hệ thống (is_content_admin). Xét theo
-- vai trò đăng nhập vì đây đúng là quyền «điều hành», không phải quyền nghiệp
-- vụ của một phòng.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_hub_xem_thong_ke_duoc(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_content_admin(_user_id)
      OR public.has_role(_user_id, 'bgd'::app_role)
      OR public.has_role(_user_id, 'pgd'::app_role)
      OR public.has_role(_user_id, 'manager'::app_role)
$$;
REVOKE ALL ON FUNCTION public.fdi_hub_xem_thong_ke_duoc(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fdi_hub_xem_thong_ke_duoc(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Thống kê trong khoảng [_tu, _den] (ngày theo giờ Việt Nam; NULL = không
-- chặn). Trả một jsonb:
--   tong      : { luot, nguoi, so_phong, so_phong_dung, so_can_bo }
--   theo_tab  : [ { tab, luot, nguoi } ]
--   theo_phong: [ { id, code, name, so_can_bo, luot, nguoi, xem_gan_nhat,
--                   theo_tab: { <tab>: luot } } ]  — CÓ CẢ phòng chưa dùng
--                 (luot = 0) để lãnh đạo thấy ngay phòng nào còn đứng ngoài.
-- Chỉ gồm phòng đang hoạt động; cán bộ đếm theo hồ sơ status = 'active'.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fdi_hub_thong_ke(_tu date DEFAULT NULL, _den date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tu_ts timestamptz;
  _den_ts timestamptz;
  _theo_tab jsonb;
  _theo_phong jsonb;
  _tong jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.fdi_hub_xem_thong_ke_duoc(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ lãnh đạo phòng, Ban Giám đốc và Phòng TCTH xem được thống kê sử dụng FDI Hub.'
      USING ERRCODE = '42501';
  END IF;
  -- Ngày người dùng chọn là ngày Việt Nam; máy chủ chạy UTC
  _tu_ts  := CASE WHEN _tu  IS NULL THEN '-infinity'::timestamptz
                  ELSE (_tu::timestamp) AT TIME ZONE 'Asia/Ho_Chi_Minh' END;
  _den_ts := CASE WHEN _den IS NULL THEN 'infinity'::timestamptz
                  ELSE ((_den + 1)::timestamp) AT TIME ZONE 'Asia/Ho_Chi_Minh' END;

  WITH lx AS (
    SELECT id, profile_id, department_id, tab, xem_luc
      FROM public.fdi_hub_luot_xem
     WHERE xem_luc >= _tu_ts AND xem_luc < _den_ts
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('tab', t.tab, 'luot', t.luot, 'nguoi', t.nguoi) ORDER BY t.luot DESC, t.tab), '[]'::jsonb)
    INTO _theo_tab
    FROM (SELECT tab, count(*) AS luot, count(DISTINCT profile_id) AS nguoi FROM lx GROUP BY tab) t;

  WITH lx AS (
    SELECT id, profile_id, department_id, tab, xem_luc
      FROM public.fdi_hub_luot_xem
     WHERE xem_luc >= _tu_ts AND xem_luc < _den_ts
  ),
  cb AS (
    SELECT department_id, count(*) AS so_can_bo
      FROM public.profiles
     WHERE status = 'active' AND department_id IS NOT NULL
     GROUP BY department_id
  ),
  phong AS (
    SELECT d.id, d.code, d.name,
           COALESCE(cb.so_can_bo, 0) AS so_can_bo,
           (SELECT count(*) FROM lx WHERE lx.department_id = d.id) AS luot,
           (SELECT count(DISTINCT profile_id) FROM lx WHERE lx.department_id = d.id) AS nguoi,
           (SELECT max(xem_luc) FROM lx WHERE lx.department_id = d.id) AS xem_gan_nhat,
           COALESCE((SELECT jsonb_object_agg(t.tab, t.n)
                       FROM (SELECT tab, count(*) AS n FROM lx WHERE lx.department_id = d.id GROUP BY tab) t),
                    '{}'::jsonb) AS theo_tab
      FROM public.departments d
      LEFT JOIN cb ON cb.department_id = d.id
     WHERE d.is_active
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', p.id, 'code', p.code, 'name', p.name, 'so_can_bo', p.so_can_bo,
           'luot', p.luot, 'nguoi', p.nguoi, 'xem_gan_nhat', p.xem_gan_nhat, 'theo_tab', p.theo_tab)
           ORDER BY p.luot DESC, p.name), '[]'::jsonb)
    INTO _theo_phong
    FROM phong p;

  WITH lx AS (
    SELECT profile_id, department_id
      FROM public.fdi_hub_luot_xem
     WHERE xem_luc >= _tu_ts AND xem_luc < _den_ts
  )
  SELECT jsonb_build_object(
           'luot', (SELECT count(*) FROM lx),
           'nguoi', (SELECT count(DISTINCT profile_id) FROM lx),
           'so_phong', (SELECT count(*) FROM public.departments WHERE is_active),
           'so_phong_dung', (SELECT count(DISTINCT lx.department_id) FROM lx
                               JOIN public.departments d ON d.id = lx.department_id AND d.is_active),
           'so_can_bo', (SELECT count(*) FROM public.profiles WHERE status = 'active'))
    INTO _tong;

  RETURN jsonb_build_object('tu', _tu, 'den', _den, 'tong', _tong, 'theo_tab', _theo_tab, 'theo_phong', _theo_phong);
END $$;
REVOKE ALL ON FUNCTION public.fdi_hub_thong_ke(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fdi_hub_thong_ke(date, date) TO authenticated, service_role;

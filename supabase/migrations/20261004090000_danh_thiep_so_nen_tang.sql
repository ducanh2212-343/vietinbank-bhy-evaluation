-- ============================================================================
-- DANH THIẾP SỐ ĐA NGÔN NGỮ (name card) — nền tảng giai đoạn 1.
-- Đặc tả: docs/danh-thiep-so-2026-09.md (bản gốc SPEC v1.0 ngày 02/09/2026).
--
-- Ba nguyên tắc bất di bất dịch của đặc tả được thực thi NGAY Ở TẦNG DỮ LIỆU,
-- không phó mặc cho giao diện:
--   NT1  Thẻ được GHÉP, không được NHẬP: tên riêng của cán bộ ghép với từ điển
--        chức danh và từ điển đơn vị. Sửa một dòng từ điển → mọi thẻ đổi theo.
--   NT2  Chức danh NỘI BỘ (QĐ bổ nhiệm) và ĐỐI NGOẠI (in trên thẻ) là hai
--        scope khác nhau; thẻ KHÔNG BAO GIỜ rơi về chức danh nội bộ.
--   NT3  Nhân sự thuê ngoài / cộng tác viên / thực tập không được hiển thị như
--        cán bộ ngân hàng: hàm nc_resolve_card() lọc theo ma trận quyền hiển
--        thị trước khi trả về, trigger chặn email @vietinbank.vn cho nhóm này.
--
-- Vì sao mẫu name card đang lưu hành là lý do có bảng từ điển: một tấm thẻ
-- thật có 3 lỗi (thiếu «for Industry and Trade», dùng 交易所 = sàn chứng khoán
-- cho «phòng giao dịch», trộn phồn thể với giản thể). Nhân 110 cán bộ tự gõ là
-- mất kiểm soát.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1) Kiểu liệt kê
-- ---------------------------------------------------------------------------
CREATE TYPE public.nc_lang AS ENUM ('vi', 'en', 'zh_hans', 'zh_hant', 'ko', 'ja');

-- Loại nhân sự — quyết định mẫu thẻ và quyền hiển thị (ma trận Mục 5 đặc tả)
CREATE TYPE public.nc_employment_type AS ENUM (
  'bien_che',    -- trong biên chế / HĐLĐ không xác định thời hạn
  'hop_dong',    -- HĐLĐ xác định thời hạn
  'thue_ngoai',  -- bảo vệ, lái xe, tạp vụ, dịch vụ thuê ngoài
  'ctv',         -- cộng tác viên bán hàng / môi giới
  'thuc_tap'     -- thực tập sinh
);

CREATE TYPE public.nc_title_scope AS ENUM ('internal', 'external');
CREATE TYPE public.nc_approval_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'retired');
CREATE TYPE public.nc_channel_type AS ENUM ('zalo', 'kakaotalk', 'line', 'wechat', 'whatsapp', 'linkedin');

-- ---------------------------------------------------------------------------
-- 2) Helper phân quyền
-- ---------------------------------------------------------------------------
-- Phòng TCTH quản trị từ điển + duyệt cán bộ. Dùng đúng cặp vai trò đang có
-- của hệ thống (tcth_admin / system_admin) thay vì sinh vai trò mới.
CREATE OR REPLACE FUNCTION public.nc_la_quan_tri(_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'tcth_admin'::app_role)
      OR public.has_role(_uid, 'system_admin'::app_role)
$$;

-- Giám đốc Chi nhánh duyệt chức danh đối ngoại riêng và chức danh vai trò thị
-- trường. Trong hệ phân quyền hiện hành, vai trò `bgd` chỉ gán cho Giám đốc
-- (các Phó Giám đốc mang vai trò `pgd`), nên `bgd` chính là «Giám đốc».
CREATE OR REPLACE FUNCTION public.nc_la_giam_doc(_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'bgd'::app_role)
      OR public.has_role(_uid, 'system_admin'::app_role)
$$;

REVOKE ALL ON FUNCTION public.nc_la_quan_tri(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.nc_la_giam_doc(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nc_la_quan_tri(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nc_la_giam_doc(UUID) TO authenticated, service_role;

-- Mẫu thẻ suy từ loại nhân sự — nguồn duy nhất, giao diện không được tự suy.
CREATE OR REPLACE FUNCTION public.nc_mau_the(_loai public.nc_employment_type)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE _loai
    WHEN 'bien_che'   THEN 'TPL_OFFICIAL'
    WHEN 'hop_dong'   THEN 'TPL_OFFICIAL'
    WHEN 'thue_ngoai' THEN 'TPL_PARTNER'
    ELSE                   'TPL_COLLAB'
  END
$$;

-- ---------------------------------------------------------------------------
-- 3) Từ điển đơn vị
-- ---------------------------------------------------------------------------
CREATE TABLE public.nc_org_unit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL CHECK (code ~ '^[A-Z0-9_]{2,40}$'),
  parent_code   TEXT REFERENCES public.nc_org_unit(code) ON UPDATE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  -- tên đơn vị 6 ngôn ngữ
  name_vi       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  name_zh_hans  TEXT,
  name_zh_hant  TEXT,
  name_ko       TEXT,
  name_ja       TEXT,
  -- địa chỉ 6 ngôn ngữ — phần khách nước ngoài dùng để tìm đường
  addr_vi       TEXT,
  addr_en       TEXT,
  addr_zh_hans  TEXT,
  addr_zh_hant  TEXT,
  addr_ko       TEXT,
  addr_ja       TEXT,
  map_url       TEXT,
  phone         TEXT,
  status        public.nc_approval_status NOT NULL DEFAULT 'draft',
  approved_by   UUID,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (parent_code IS NULL OR parent_code <> code)
);

-- ---------------------------------------------------------------------------
-- 4) Từ điển chức danh (nội bộ + đối ngoại)
-- ---------------------------------------------------------------------------
CREATE TABLE public.nc_title (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL CHECK (code ~ '^[A-Z0-9_]{2,40}$'),
  scope         public.nc_title_scope NOT NULL,
  name_vi       TEXT NOT NULL,
  name_en       TEXT,
  name_zh_hans  TEXT,
  name_zh_hant  TEXT,
  name_ko       TEXT,
  name_ja       TEXT,
  -- Loại nhân sự nào được gán chức danh này
  allowed_employment public.nc_employment_type[] NOT NULL DEFAULT '{bien_che,hop_dong}',
  -- Chức danh vai trò thị trường (Head of FDI Desk…) cần Giám đốc duyệt
  requires_director_approval BOOLEAN NOT NULL DEFAULT false,
  note_internal TEXT,
  status        public.nc_approval_status NOT NULL DEFAULT 'draft',
  effective_from DATE,
  approved_by   UUID,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(allowed_employment) > 0)
);

-- ---------------------------------------------------------------------------
-- 5) Cán bộ
-- ---------------------------------------------------------------------------
CREATE TABLE public.nc_staff (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Gắn với hồ sơ nhân sự 343 để kéo sẵn tên/ảnh/điện thoại, KHÔNG bắt buộc:
  -- nhân sự thuê ngoài không có hồ sơ 343.
  profile_id        UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_code     TEXT UNIQUE,
  full_name         TEXT NOT NULL CHECK (length(btrim(full_name)) BETWEEN 2 AND 120),
  full_name_latin   TEXT,          -- không dấu; dùng cho tên tệp .vcf và trường N
  name_zh           TEXT,          -- Hán tự (cán bộ phải xác nhận mặt chữ)
  name_ko           TEXT,          -- Hangul
  name_ja           TEXT,          -- Katakana
  employment_type   public.nc_employment_type NOT NULL DEFAULT 'bien_che',
  org_unit_code     TEXT NOT NULL REFERENCES public.nc_org_unit(code) ON UPDATE CASCADE,
  internal_title_id UUID REFERENCES public.nc_title(id),   -- scope internal, KHÔNG lên thẻ
  external_title_id UUID REFERENCES public.nc_title(id),   -- scope external, lên thẻ
  custom_title_id   UUID,                                   -- FK thêm sau khi có nc_custom_title
  email             TEXT CHECK (email IS NULL OR email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone_mobile      TEXT,
  phone_office      TEXT,
  phone_office_public BOOLEAN NOT NULL DEFAULT false,
  photo_url         TEXT,
  -- Không đoán tuần tự được: tên-họ, trùng thì thêm 6 ký tự ngẫu nhiên
  slug              TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 80),
  card_enabled      BOOLEAN NOT NULL DEFAULT false,
  -- Thẻ Wallet cho nhân sự thuê ngoài: mặc định KHÔNG, Giám đốc bật riêng từng trường hợp
  wallet_override   BOOLEAN NOT NULL DEFAULT false,
  wallet_override_by UUID,
  wallet_override_at TIMESTAMPTZ,
  status            public.nc_approval_status NOT NULL DEFAULT 'draft',
  approved_by       UUID,
  approved_at       TIMESTAMPTZ,
  revoked_at        TIMESTAMPTZ,
  revoke_reason     TEXT,
  note_internal     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX nc_staff_org_unit_idx ON public.nc_staff(org_unit_code);
CREATE INDEX nc_staff_user_idx ON public.nc_staff(user_id);
CREATE INDEX nc_staff_external_title_idx ON public.nc_staff(external_title_id);

-- ---------------------------------------------------------------------------
-- 6) Chức danh đối ngoại riêng (cá biệt hóa, có thời hạn)
-- ---------------------------------------------------------------------------
CREATE TABLE public.nc_custom_title (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      UUID NOT NULL REFERENCES public.nc_staff(id) ON DELETE CASCADE,
  name_vi       TEXT NOT NULL,
  name_en       TEXT,
  name_zh_hans  TEXT,
  name_zh_hant  TEXT,
  name_ko       TEXT,
  name_ja       TEXT,
  reason        TEXT NOT NULL CHECK (length(btrim(reason)) >= 10),
  status        public.nc_approval_status NOT NULL DEFAULT 'pending',
  requested_by  UUID DEFAULT auth.uid(),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by   UUID,
  approved_at   TIMESTAMPTZ,
  reject_reason TEXT,
  expires_on    DATE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ràng buộc 4: mỗi cán bộ tối đa MỘT chức danh riêng đang được duyệt
CREATE UNIQUE INDEX nc_custom_title_mot_ban_duyet ON public.nc_custom_title(staff_id)
  WHERE status = 'approved';
CREATE INDEX nc_custom_title_staff_idx ON public.nc_custom_title(staff_id);

ALTER TABLE public.nc_staff
  ADD CONSTRAINT nc_staff_custom_title_fk
  FOREIGN KEY (custom_title_id) REFERENCES public.nc_custom_title(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 7) Kênh liên hệ
-- ---------------------------------------------------------------------------
CREATE TABLE public.nc_channel (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     UUID NOT NULL REFERENCES public.nc_staff(id) ON DELETE CASCADE,
  type         public.nc_channel_type NOT NULL,
  value        TEXT,                  -- SĐT / ID / URL
  qr_image_url TEXT,                  -- bắt buộc với wechat, kakaotalk (không có deep link)
  is_public    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id, type),
  -- WeChat / KakaoTalk không có deep link theo SĐT: phải có ảnh QR cá nhân
  CHECK (
    (type IN ('wechat', 'kakaotalk') AND qr_image_url IS NOT NULL)
    OR (type NOT IN ('wechat', 'kakaotalk') AND value IS NOT NULL)
  )
);

-- ---------------------------------------------------------------------------
-- 8) Thẻ đã phát hành
-- ---------------------------------------------------------------------------
CREATE TABLE public.nc_card (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id         UUID NOT NULL REFERENCES public.nc_staff(id) ON DELETE CASCADE,
  template_code    TEXT NOT NULL CHECK (template_code IN ('TPL_OFFICIAL', 'TPL_PARTNER', 'TPL_COLLAB')),
  qr_url           TEXT NOT NULL,
  google_object_id TEXT,
  apple_serial     TEXT,
  nfc_written_at   TIMESTAMPTZ,
  issued_by        UUID,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at       TIMESTAMPTZ
);
CREATE INDEX nc_card_staff_idx ON public.nc_card(staff_id);

-- ---------------------------------------------------------------------------
-- 9) Nhật ký quét (ẩn danh — KHÔNG lưu IP, không cookie)
-- ---------------------------------------------------------------------------
CREATE TABLE public.nc_scan_log (
  id         BIGSERIAL PRIMARY KEY,
  staff_id   UUID REFERENCES public.nc_staff(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lang       public.nc_lang,
  channel    TEXT CHECK (channel IN ('qr', 'wallet', 'nfc', 'direct')),
  action     TEXT CHECK (action IN (
    'view', 'save_vcard', 'open_zalo', 'open_line', 'open_whatsapp', 'open_wechat',
    'open_kakaotalk', 'open_linkedin', 'open_map', 'call', 'email'
  )),
  country    TEXT CHECK (country IS NULL OR country ~ '^[A-Z]{2}$')   -- suy từ Accept-Language
);
CREATE INDEX nc_scan_log_staff_time_idx ON public.nc_scan_log(staff_id, scanned_at DESC);

-- ---------------------------------------------------------------------------
-- 10) Nhật ký thay đổi (ai, khi nào, giá trị cũ/mới) — Mục 9.5
-- ---------------------------------------------------------------------------
CREATE TABLE public.nc_audit (
  id         BIGSERIAL PRIMARY KEY,
  bang       TEXT NOT NULL,
  ban_ghi_id UUID,
  thao_tac   TEXT NOT NULL,
  nguoi      UUID,
  luc        TIMESTAMPTZ NOT NULL DEFAULT now(),
  cu         JSONB,
  moi        JSONB
);
CREATE INDEX nc_audit_bang_idx ON public.nc_audit(bang, ban_ghi_id);

-- ---------------------------------------------------------------------------
-- 11) Cấu hình cấp hệ thống (logo_enabled, gốc URL thẻ…) — Mục 9.6
-- ---------------------------------------------------------------------------
CREATE TABLE public.nc_cau_hinh (
  khoa        TEXT PRIMARY KEY,
  gia_tri     JSONB NOT NULL,
  cap_nhat_boi UUID,
  cap_nhat_luc TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.nc_cau_hinh (khoa, gia_tri) VALUES
  -- Công tắc tắt nhanh logo trên thẻ nếu Trụ sở chính yêu cầu
  ('logo_enabled', 'true'::jsonb),
  -- Gốc đường dẫn in trong QR / ghi lên NFC
  ('card_base_url', '"https://bachungyenone.com/card/"'::jsonb),
  -- Mã đơn vị hiện thông tin liên hệ trên trang «cán bộ đã chuyển công tác»
  ('lien_he_khi_thu_hoi', '"CN_BHY"'::jsonb);

-- ---------------------------------------------------------------------------
-- 12) updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER nc_org_unit_updated_at BEFORE UPDATE ON public.nc_org_unit
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER nc_title_updated_at BEFORE UPDATE ON public.nc_title
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER nc_staff_updated_at BEFORE UPDATE ON public.nc_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER nc_custom_title_updated_at BEFORE UPDATE ON public.nc_custom_title
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 13) Slug: tên-họ không dấu, trùng thì thêm 6 ký tự ngẫu nhiên
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_tao_slug(_ten TEXT)
RETURNS TEXT
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  goc TEXT;
  thu TEXT;
  duoi TEXT;
BEGIN
  goc := lower(extensions.unaccent(replace(replace(coalesce(_ten, ''), 'đ', 'd'), 'Đ', 'D')));
  goc := regexp_replace(goc, '[^a-z0-9]+', '-', 'g');
  goc := btrim(goc, '-');
  IF length(goc) < 3 THEN goc := 'can-bo'; END IF;
  goc := left(goc, 60);
  thu := goc;
  -- Trùng tên thì KHÔNG đánh số 2, 3, 4 (đoán được) — thêm đuôi ngẫu nhiên
  WHILE EXISTS (SELECT 1 FROM public.nc_staff WHERE slug = thu) LOOP
    duoi := lower(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6));
    thu := goc || '-' || duoi;
  END LOOP;
  RETURN thu;
END $$;
REVOKE ALL ON FUNCTION public.nc_tao_slug(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nc_tao_slug(TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 14) Ràng buộc nghiệp vụ trên nc_staff (Mục 3 «Ràng buộc bắt buộc» + NT3)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_kiem_can_bo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  cd RECORD;
  ct RECORD;
  can_duyet BOOLEAN;
BEGIN
  -- Slug và tên không dấu tự sinh khi bỏ trống
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    NEW.slug := public.nc_tao_slug(NEW.full_name);
  END IF;
  NEW.slug := lower(NEW.slug);
  IF NEW.full_name_latin IS NULL OR btrim(NEW.full_name_latin) = '' THEN
    NEW.full_name_latin := extensions.unaccent(replace(replace(NEW.full_name, 'đ', 'd'), 'Đ', 'D'));
  END IF;
  IF NEW.email IS NOT NULL THEN NEW.email := lower(btrim(NEW.email)); END IF;

  -- NT3: nhóm ngoài biên chế không mang email @vietinbank.vn lên thẻ
  IF NEW.employment_type IN ('thue_ngoai', 'ctv', 'thuc_tap')
     AND NEW.email IS NOT NULL AND NEW.email ILIKE '%@vietinbank.vn' THEN
    RAISE EXCEPTION 'Nhân sự thuê ngoài / cộng tác viên / thực tập không được dùng email @vietinbank.vn trên danh thiếp';
  END IF;

  -- Chức danh nội bộ: đúng scope, không bao giờ lên thẻ (chỉ kiểm scope)
  IF NEW.internal_title_id IS NOT NULL THEN
    SELECT scope INTO cd FROM public.nc_title WHERE id = NEW.internal_title_id;
    IF NOT FOUND OR cd.scope <> 'internal' THEN
      RAISE EXCEPTION 'Chức danh nội bộ phải thuộc từ điển scope = internal';
    END IF;
  END IF;

  -- Ràng buộc 1 + 2: chức danh đối ngoại đúng scope, đúng loại nhân sự được phép.
  -- Yêu cầu «đã duyệt» được siết ở mức: hễ cán bộ ở trạng thái approved hoặc bật
  -- thẻ thì chức danh phải approved. Cho phép gán chức danh còn draft khi hồ sơ
  -- cán bộ cũng đang draft, để Phòng TCTH soạn hồ sơ song song với rà soát từ
  -- điển — thẻ vẫn không thể phát hành với chức danh chưa duyệt.
  can_duyet := (NEW.status = 'approved' OR NEW.card_enabled);
  IF NEW.external_title_id IS NOT NULL THEN
    SELECT scope, status, allowed_employment INTO cd FROM public.nc_title WHERE id = NEW.external_title_id;
    IF NOT FOUND OR cd.scope <> 'external' THEN
      RAISE EXCEPTION 'Chức danh đối ngoại phải thuộc từ điển scope = external';
    END IF;
    IF cd.status IN ('rejected', 'retired') THEN
      RAISE EXCEPTION 'Chức danh đối ngoại này đã bị từ chối hoặc đã thu hồi';
    END IF;
    IF can_duyet AND cd.status <> 'approved' THEN
      RAISE EXCEPTION 'Chức danh đối ngoại chưa được duyệt — không thể duyệt hồ sơ hay phát hành thẻ';
    END IF;
    IF NOT (NEW.employment_type = ANY (cd.allowed_employment)) THEN
      RAISE EXCEPTION 'Loại nhân sự % không được gán chức danh đối ngoại này', NEW.employment_type;
    END IF;
  END IF;

  -- Chức danh riêng: phải của đúng cán bộ, đã duyệt, chưa hết hạn; và chỉ dành
  -- cho cán bộ ngân hàng (nhóm ngoài biên chế không mang chức danh riêng)
  IF NEW.custom_title_id IS NOT NULL THEN
    IF NEW.employment_type NOT IN ('bien_che', 'hop_dong') THEN
      RAISE EXCEPTION 'Chức danh đối ngoại riêng chỉ dành cho cán bộ biên chế / hợp đồng';
    END IF;
    SELECT staff_id, status, expires_on INTO ct FROM public.nc_custom_title WHERE id = NEW.custom_title_id;
    IF NOT FOUND OR ct.staff_id <> NEW.id THEN
      RAISE EXCEPTION 'Chức danh riêng không thuộc về cán bộ này';
    END IF;
    IF ct.status <> 'approved' OR (ct.expires_on IS NOT NULL AND ct.expires_on < CURRENT_DATE) THEN
      RAISE EXCEPTION 'Chức danh riêng chưa được duyệt hoặc đã hết hạn';
    END IF;
  END IF;

  -- Ràng buộc 3: bật thẻ chỉ khi đã duyệt VÀ có ít nhất một chức danh đối ngoại
  -- hợp lệ. TUYỆT ĐỐI không rơi về chức danh nội bộ (NT2).
  IF NEW.card_enabled THEN
    IF NEW.status <> 'approved' THEN
      RAISE EXCEPTION 'Chỉ bật thẻ cho hồ sơ đã duyệt';
    END IF;
    IF NEW.external_title_id IS NULL AND NEW.custom_title_id IS NULL THEN
      RAISE EXCEPTION 'Thiếu chức danh đối ngoại — không phát hành thẻ (không dùng chức danh nội bộ thay thế)';
    END IF;
    IF NEW.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'Thẻ đã thu hồi — muốn cấp lại phải bỏ dấu thu hồi trước';
    END IF;
  END IF;

  -- Wallet cho nhân sự thuê ngoài: chỉ Giám đốc bật, và ghi vết ai bật
  IF NEW.wallet_override AND (TG_OP = 'INSERT' OR NOT OLD.wallet_override) THEN
    IF auth.uid() IS NOT NULL AND NOT public.nc_la_giam_doc(auth.uid()) THEN
      RAISE EXCEPTION 'Chỉ Giám đốc mới bật thẻ Wallet cho nhân sự ngoài biên chế';
    END IF;
    NEW.wallet_override_by := coalesce(auth.uid(), NEW.wallet_override_by);
    NEW.wallet_override_at := now();
  END IF;

  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.nc_kiem_can_bo() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER nc_staff_kiem BEFORE INSERT OR UPDATE ON public.nc_staff
  FOR EACH ROW EXECUTE FUNCTION public.nc_kiem_can_bo();

-- Cán bộ tự sửa bản ghi của mình: CHỈ được đụng SĐT di động, ảnh và tên
-- CJK (xác nhận mặt chữ). Mọi trường phân quyền/chức danh/đơn vị/trạng thái là
-- của Phòng TCTH. Kiểm ở trigger vì RLS không giới hạn được theo cột.
CREATE OR REPLACE FUNCTION public.nc_chan_cot_cua_can_bo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  la_gd BOOLEAN;
BEGIN
  -- Máy chủ tự sửa (cron, RPC đã kiểm quyền — đặt cờ nc.bo_qua_chan_cot) và
  -- Phòng TCTH đi qua tự do
  IF auth.uid() IS NULL OR public.nc_la_quan_tri(auth.uid())
     OR coalesce(current_setting('nc.bo_qua_chan_cot', true), '') = '1' THEN
    RETURN NEW;
  END IF;
  -- Giám đốc được đụng đúng MỘT cột ngoài bộ tự phục vụ: công tắc Wallet cho
  -- nhân sự thuê ngoài (trigger nc_kiem_can_bo ghi vết ai bật)
  la_gd := public.nc_la_giam_doc(auth.uid());
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.employee_code IS DISTINCT FROM OLD.employee_code
     OR NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.full_name_latin IS DISTINCT FROM OLD.full_name_latin
     OR NEW.employment_type IS DISTINCT FROM OLD.employment_type
     OR NEW.org_unit_code IS DISTINCT FROM OLD.org_unit_code
     OR NEW.internal_title_id IS DISTINCT FROM OLD.internal_title_id
     OR NEW.external_title_id IS DISTINCT FROM OLD.external_title_id
     OR NEW.custom_title_id IS DISTINCT FROM OLD.custom_title_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.phone_office IS DISTINCT FROM OLD.phone_office
     OR NEW.phone_office_public IS DISTINCT FROM OLD.phone_office_public
     OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.card_enabled IS DISTINCT FROM OLD.card_enabled
     OR (NEW.wallet_override IS DISTINCT FROM OLD.wallet_override AND NOT la_gd)
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at
     OR NEW.revoke_reason IS DISTINCT FROM OLD.revoke_reason
     OR NEW.note_internal IS DISTINCT FROM OLD.note_internal THEN
    RAISE EXCEPTION 'Cán bộ chỉ tự sửa được số di động, ảnh và tên tiếng nước ngoài; thay đổi khác gửi Phòng TCTH';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.nc_chan_cot_cua_can_bo() FROM PUBLIC, anon, authenticated;

-- Chạy TRƯỚC trigger kiểm nghiệp vụ (tên bảng chữ cái: "nc_staff_a_..." < "nc_staff_kiem")
CREATE TRIGGER nc_staff_a_chan_cot BEFORE UPDATE ON public.nc_staff
  FOR EACH ROW EXECUTE FUNCTION public.nc_chan_cot_cua_can_bo();

-- ---------------------------------------------------------------------------
-- 15) Nhật ký thay đổi
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_ghi_audit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.nc_audit (bang, ban_ghi_id, thao_tac, nguoi, cu, moi)
  VALUES (
    TG_TABLE_NAME,
    coalesce((CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END), NULL),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.nc_ghi_audit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER nc_org_unit_audit AFTER INSERT OR UPDATE OR DELETE ON public.nc_org_unit
  FOR EACH ROW EXECUTE FUNCTION public.nc_ghi_audit();
CREATE TRIGGER nc_title_audit AFTER INSERT OR UPDATE OR DELETE ON public.nc_title
  FOR EACH ROW EXECUTE FUNCTION public.nc_ghi_audit();
CREATE TRIGGER nc_staff_audit AFTER INSERT OR UPDATE OR DELETE ON public.nc_staff
  FOR EACH ROW EXECUTE FUNCTION public.nc_ghi_audit();
CREATE TRIGGER nc_custom_title_audit AFTER INSERT OR UPDATE OR DELETE ON public.nc_custom_title
  FOR EACH ROW EXECUTE FUNCTION public.nc_ghi_audit();

-- ---------------------------------------------------------------------------
-- 16) Gom một dòng từ điển 6 ngôn ngữ thành JSON (dùng chung cho resolver)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_goi_6_ngon_ngu(
  _vi TEXT, _en TEXT, _zh_hans TEXT, _zh_hant TEXT, _ko TEXT, _ja TEXT
)
RETURNS JSONB
LANGUAGE sql IMMUTABLE
AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'vi', nullif(btrim(_vi), ''), 'en', nullif(btrim(_en), ''),
    'zh_hans', nullif(btrim(_zh_hans), ''), 'zh_hant', nullif(btrim(_zh_hant), ''),
    'ko', nullif(btrim(_ko), ''), 'ja', nullif(btrim(_ja), '')
  ))
$$;

-- Chuỗi đơn vị từ đơn vị của cán bộ ngược lên gốc (PGD → Chi nhánh → Ngân hàng)
CREATE OR REPLACE FUNCTION public.nc_chuoi_don_vi(_code TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH RECURSIVE chuoi AS (
    SELECT u.*, 0 AS muc FROM public.nc_org_unit u WHERE u.code = _code
    UNION ALL
    SELECT p.*, c.muc + 1 FROM public.nc_org_unit p JOIN chuoi c ON p.code = c.parent_code
    WHERE c.muc < 6
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'code', code,
    'name', public.nc_goi_6_ngon_ngu(name_vi, name_en, name_zh_hans, name_zh_hant, name_ko, name_ja),
    'addr', public.nc_goi_6_ngon_ngu(addr_vi, addr_en, addr_zh_hans, addr_zh_hant, addr_ko, addr_ja),
    'map_url', map_url,
    'phone', phone,
    'status', status
  ) ORDER BY muc DESC), '[]'::jsonb)
  FROM chuoi
$$;
REVOKE ALL ON FUNCTION public.nc_chuoi_don_vi(TEXT) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 17) nc_resolve_card — payload ĐÃ LỌC theo ma trận quyền hiển thị (Mục 5)
-- ---------------------------------------------------------------------------
-- Trang danh thiếp công khai chỉ render những gì hàm này trả về. Không có logic
-- quyền nào nằm ở React. Khách vãng lai (anon) gọi được; `_xem_truoc = true`
-- (xem trước hồ sơ chưa phát hành) chỉ dành cho quản trị hoặc chính cán bộ đó.
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
    -- Thẻ thu hồi: KHÔNG 404 — trả trang 410 lịch sự kèm liên hệ Chi nhánh
    IF s.revoked_at IS NOT NULL THEN
      SELECT gia_tri #>> '{}' INTO ma_lien_he FROM public.nc_cau_hinh WHERE khoa = 'lien_he_khi_thu_hoi';
      SELECT jsonb_build_object(
        'name', public.nc_goi_6_ngon_ngu(u.name_vi, u.name_en, u.name_zh_hans, u.name_zh_hant, u.name_ko, u.name_ja),
        'addr', public.nc_goi_6_ngon_ngu(u.addr_vi, u.addr_en, u.addr_zh_hans, u.addr_zh_hant, u.addr_ko, u.addr_ja),
        'phone', u.phone, 'map_url', u.map_url
      ) INTO don_vi FROM public.nc_org_unit u WHERE u.code = coalesce(ma_lien_he, 'CN_BHY');
      RETURN jsonb_build_object('status', 'revoked', 'contact', coalesce(don_vi, '{}'::jsonb));
    END IF;
    -- Chưa phát hành / chưa duyệt: với người ngoài là không tồn tại (chống liệt kê)
    IF NOT s.card_enabled OR s.status <> 'approved' THEN
      RETURN jsonb_build_object('status', 'not_found');
    END IF;
  END IF;

  chinh_thuc := s.employment_type IN ('bien_che', 'hop_dong');

  -- Thứ tự ưu tiên chức danh (Mục 4.1): riêng đã duyệt còn hạn → đối ngoại → không có
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
  -- KHÔNG fallback về chức danh nội bộ. Không có chức danh đối ngoại thì thẻ
  -- không được phát hành (trigger đã chặn) — đây chỉ là chốt chặn thứ hai.
  IF title IS NULL AND NOT _xem_truoc THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT coalesce((gia_tri)::boolean, true) INTO logo_bat FROM public.nc_cau_hinh WHERE khoa = 'logo_enabled';
  SELECT gia_tri #>> '{}' INTO base_url FROM public.nc_cau_hinh WHERE khoa = 'card_base_url';

  don_vi := public.nc_chuoi_don_vi(s.org_unit_code);
  -- Địa chỉ / bản đồ / điện thoại lấy từ đơn vị gần nhất có khai (PGD có địa chỉ
  -- riêng; phòng thuộc Chi nhánh dùng địa chỉ Chi nhánh)
  SELECT e->'addr', e->>'map_url', e->>'phone' INTO dia_chi, map_url, hotline
    FROM jsonb_array_elements(don_vi) WITH ORDINALITY AS t(e, i)
   WHERE (e->'addr') <> '{}'::jsonb
   ORDER BY i DESC LIMIT 1;

  -- Kênh chat theo ma trận: chính thức = tất cả; CTV = chỉ Zalo; còn lại = không
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
    -- Ma trận Mục 5 — thực thi tại đây, giao diện chỉ đọc cờ
    'logo', (chinh_thuc AND logo_bat),
    'bank_line', chinh_thuc,
    'affiliation', CASE s.employment_type
      WHEN 'thue_ngoai' THEN 'thue_ngoai' WHEN 'ctv' THEN 'ctv' WHEN 'thuc_tap' THEN 'thuc_tap' END,
    'email', CASE WHEN chinh_thuc OR (s.email IS NOT NULL AND s.email NOT ILIKE '%@vietinbank.vn') THEN s.email END,
    'channels', kenh,
    'wallet', (chinh_thuc OR (s.employment_type = 'thue_ngoai' AND s.wallet_override)),
    'nfc', chinh_thuc
  ));
END $$;

REVOKE ALL ON FUNCTION public.nc_resolve_card(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nc_resolve_card(TEXT, BOOLEAN) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 18) Nhật ký quét — khách vãng lai ghi được, có trần chống dội
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_ghi_nhat_ky_quet(
  _slug TEXT, _lang TEXT, _channel TEXT, _action TEXT, _country TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sid UUID;
  so_gan_day INT;
BEGIN
  SELECT id INTO sid FROM public.nc_staff WHERE slug = lower(btrim(coalesce(_slug, '')));
  IF sid IS NULL THEN RETURN; END IF;
  IF _channel NOT IN ('qr', 'wallet', 'nfc', 'direct') THEN _channel := 'direct'; END IF;
  IF _action NOT IN ('view', 'save_vcard', 'open_zalo', 'open_line', 'open_whatsapp', 'open_wechat',
                     'open_kakaotalk', 'open_linkedin', 'open_map', 'call', 'email') THEN
    RETURN;
  END IF;
  IF _lang IS NOT NULL AND _lang NOT IN ('vi', 'en', 'zh_hans', 'zh_hant', 'ko', 'ja') THEN _lang := NULL; END IF;
  IF _country IS NOT NULL AND _country !~ '^[A-Z]{2}$' THEN _country := NULL; END IF;

  -- Trần 120 dòng/phút/cán bộ: một tấm thẻ không thể bị quét nhanh hơn thế
  -- ngoài đời; vượt trần là bot — bỏ qua lặng lẽ thay vì phình bảng.
  SELECT count(*) INTO so_gan_day FROM public.nc_scan_log
   WHERE staff_id = sid AND scanned_at > now() - interval '1 minute';
  IF so_gan_day >= 120 THEN RETURN; END IF;

  INSERT INTO public.nc_scan_log (staff_id, lang, channel, action, country)
  VALUES (sid, _lang::public.nc_lang, _channel, _action, _country);
END $$;
REVOKE ALL ON FUNCTION public.nc_ghi_nhat_ky_quet(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nc_ghi_nhat_ky_quet(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 19) Phát hành / thu hồi thẻ — một thao tác, nhiều bước, chạy trong một giao dịch
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_phat_hanh_the(_staff_id UUID)
RETURNS public.nc_card
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s public.nc_staff%ROWTYPE;
  base_url TEXT;
  the public.nc_card%ROWTYPE;
BEGIN
  IF NOT public.nc_la_quan_tri(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng TCTH phát hành thẻ';
  END IF;
  SELECT * INTO s FROM public.nc_staff WHERE id = _staff_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy cán bộ'; END IF;
  IF s.status <> 'approved' THEN RAISE EXCEPTION 'Hồ sơ chưa được duyệt'; END IF;

  -- Mọi ràng buộc chức danh do trigger nc_kiem_can_bo kiểm khi bật cờ
  UPDATE public.nc_staff SET card_enabled = true, revoked_at = NULL, revoke_reason = NULL
   WHERE id = _staff_id;

  SELECT gia_tri #>> '{}' INTO base_url FROM public.nc_cau_hinh WHERE khoa = 'card_base_url';

  SELECT * INTO the FROM public.nc_card WHERE staff_id = _staff_id AND revoked_at IS NULL
   ORDER BY issued_at DESC LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.nc_card (staff_id, template_code, qr_url, issued_by)
    VALUES (_staff_id, public.nc_mau_the(s.employment_type),
            coalesce(base_url, 'https://bachungyenone.com/card/') || s.slug, auth.uid())
    RETURNING * INTO the;
  END IF;
  RETURN the;
END $$;
REVOKE ALL ON FUNCTION public.nc_phat_hanh_the(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nc_phat_hanh_the(UUID) TO authenticated, service_role;

-- Thu hồi 1 thao tác (Mục 9.4): tắt thẻ, đóng dấu thu hồi, đóng thẻ đã phát
-- hành. QR/NFC trỏ về cùng URL nên tự hiện trang 410 ngay lượt quét kế tiếp.
-- (Đặt Google pass EXPIRED là việc của giai đoạn Wallet.)
CREATE OR REPLACE FUNCTION public.nc_thu_hoi_the(_staff_id UUID, _ly_do TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.nc_la_quan_tri(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng TCTH thu hồi thẻ';
  END IF;
  UPDATE public.nc_staff
     SET card_enabled = false, revoked_at = now(), revoke_reason = nullif(btrim(_ly_do), '')
   WHERE id = _staff_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy cán bộ'; END IF;
  UPDATE public.nc_card SET revoked_at = now() WHERE staff_id = _staff_id AND revoked_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.nc_thu_hoi_the(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nc_thu_hoi_the(UUID, TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 20) Duyệt chức danh đối ngoại riêng — Giám đốc
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_duyet_chuc_danh_rieng(_id UUID, _duyet BOOLEAN, _ly_do TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ct public.nc_custom_title%ROWTYPE;
BEGIN
  IF NOT public.nc_la_giam_doc(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Giám đốc duyệt chức danh đối ngoại riêng';
  END IF;
  SELECT * INTO ct FROM public.nc_custom_title WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đề nghị'; END IF;
  IF ct.status <> 'pending' THEN RAISE EXCEPTION 'Đề nghị này đã được xử lý'; END IF;

  IF _duyet THEN
    -- Bản duyệt cũ (nếu có) lùi về retired để giữ luật «một bản approved»
    UPDATE public.nc_custom_title SET status = 'retired'
     WHERE staff_id = ct.staff_id AND status = 'approved' AND id <> _id;
    UPDATE public.nc_custom_title
       SET status = 'approved', approved_by = auth.uid(), approved_at = now(), reject_reason = NULL
     WHERE id = _id;
    -- Giám đốc không phải TCTH nên trigger chặn cột sẽ từ chối việc gán chức
    -- danh; cờ này báo cho trigger biết đây là RPC đã kiểm quyền ở trên.
    PERFORM set_config('nc.bo_qua_chan_cot', '1', true);
    UPDATE public.nc_staff SET custom_title_id = _id WHERE id = ct.staff_id;
    PERFORM set_config('nc.bo_qua_chan_cot', '', true);
  ELSE
    IF nullif(btrim(_ly_do), '') IS NULL THEN
      RAISE EXCEPTION 'Từ chối phải ghi lý do';
    END IF;
    UPDATE public.nc_custom_title
       SET status = 'rejected', approved_by = auth.uid(), approved_at = now(), reject_reason = btrim(_ly_do)
     WHERE id = _id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.nc_duyet_chuc_danh_rieng(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nc_duyet_chuc_danh_rieng(UUID, BOOLEAN, TEXT) TO authenticated, service_role;

-- Job hằng ngày: chức danh riêng quá hạn → retired, thẻ tự lùi về chức danh
-- đối ngoại chuẩn. Việc báo cho cán bộ/TCTH đi qua màn quản trị (cột cảnh báo
-- «sắp hết hạn») chứ chưa mở thêm loại push mới — thêm loại tin là quyết định
-- nghiệp vụ riêng.
CREATE OR REPLACE FUNCTION public.nc_thu_hoi_chuc_danh_het_han()
RETURNS INT
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  so INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, staff_id FROM public.nc_custom_title
     WHERE status = 'approved' AND expires_on IS NOT NULL AND expires_on < CURRENT_DATE
  LOOP
    UPDATE public.nc_staff SET custom_title_id = NULL WHERE id = r.staff_id AND custom_title_id = r.id;
    UPDATE public.nc_custom_title SET status = 'retired' WHERE id = r.id;
    so := so + 1;
  END LOOP;
  RETURN so;
END $$;
REVOKE ALL ON FUNCTION public.nc_thu_hoi_chuc_danh_het_han() FROM PUBLIC, anon, authenticated;

-- 0h30 giờ Việt Nam (17h30 UTC hôm trước) — trước mọi giờ làm việc
SELECT cron.unschedule('nc-thu-hoi-chuc-danh-het-han')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nc-thu-hoi-chuc-danh-het-han');
SELECT cron.schedule('nc-thu-hoi-chuc-danh-het-han', '30 17 * * *',
                     $cron$ SELECT public.nc_thu_hoi_chuc_danh_het_han(); $cron$);

-- ---------------------------------------------------------------------------
-- 21) Số cán bộ đang dùng từng chức danh (cột ở Tab từ điển chức danh)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nc_so_can_bo_theo_chuc_danh()
RETURNS TABLE (title_id UUID, so_can_bo BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.title_id, count(*)
    FROM (
      SELECT external_title_id AS title_id FROM public.nc_staff WHERE external_title_id IS NOT NULL
      UNION ALL
      SELECT internal_title_id FROM public.nc_staff WHERE internal_title_id IS NOT NULL
    ) t
   WHERE public.nc_la_quan_tri(auth.uid())
   GROUP BY t.title_id
$$;
REVOKE ALL ON FUNCTION public.nc_so_can_bo_theo_chuc_danh() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nc_so_can_bo_theo_chuc_danh() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 22) RLS — hàng rào thật. Khách vãng lai KHÔNG đọc bảng nào, chỉ gọi hai RPC.
-- ---------------------------------------------------------------------------
ALTER TABLE public.nc_org_unit     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_title        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_custom_title ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_channel      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_card         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_scan_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_audit        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_cau_hinh     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.nc_org_unit, public.nc_title, public.nc_staff, public.nc_custom_title,
              public.nc_channel, public.nc_card, public.nc_scan_log, public.nc_audit,
              public.nc_cau_hinh FROM anon;
REVOKE ALL ON SEQUENCE public.nc_scan_log_id_seq, public.nc_audit_id_seq FROM anon;

-- Từ điển: cán bộ đọc (để xem trước thẻ của mình), Phòng TCTH toàn quyền
CREATE POLICY "nc_org_unit_doc" ON public.nc_org_unit FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "nc_org_unit_quan_tri" ON public.nc_org_unit FOR ALL TO authenticated
  USING (public.nc_la_quan_tri(auth.uid())) WITH CHECK (public.nc_la_quan_tri(auth.uid()));

CREATE POLICY "nc_title_doc" ON public.nc_title FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "nc_title_quan_tri" ON public.nc_title FOR ALL TO authenticated
  USING (public.nc_la_quan_tri(auth.uid())) WITH CHECK (public.nc_la_quan_tri(auth.uid()));
-- Chức danh cần Giám đốc duyệt: Giám đốc được đổi trạng thái (không sửa nội dung
-- — giao diện chỉ mở nút duyệt; nội dung là việc của TCTH)
CREATE POLICY "nc_title_giam_doc_duyet" ON public.nc_title FOR UPDATE TO authenticated
  USING (public.nc_la_giam_doc(auth.uid()) AND requires_director_approval)
  WITH CHECK (public.nc_la_giam_doc(auth.uid()) AND requires_director_approval);

-- Cán bộ: đọc/sửa bản ghi của chính mình (cột bị giới hạn bởi trigger)
CREATE POLICY "nc_staff_cua_toi" ON public.nc_staff FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.nc_la_quan_tri(auth.uid()) OR public.nc_la_giam_doc(auth.uid()));
-- Giám đốc vào được để bật Wallet cho thuê ngoài; cột nào được đụng do trigger
-- nc_chan_cot_cua_can_bo quyết định
CREATE POLICY "nc_staff_toi_sua" ON public.nc_staff FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.nc_la_quan_tri(auth.uid()) OR public.nc_la_giam_doc(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.nc_la_quan_tri(auth.uid()) OR public.nc_la_giam_doc(auth.uid()));
CREATE POLICY "nc_staff_quan_tri_them" ON public.nc_staff FOR INSERT TO authenticated
  WITH CHECK (public.nc_la_quan_tri(auth.uid()));
CREATE POLICY "nc_staff_quan_tri_xoa" ON public.nc_staff FOR DELETE TO authenticated
  USING (public.nc_la_quan_tri(auth.uid()));

-- Chức danh riêng: cán bộ gửi đề nghị cho chính mình (pending), Giám đốc và
-- TCTH xem hàng chờ; duyệt/từ chối đi qua RPC nc_duyet_chuc_danh_rieng
CREATE POLICY "nc_custom_title_doc" ON public.nc_custom_title FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.nc_staff s WHERE s.id = staff_id AND s.user_id = auth.uid())
    OR public.nc_la_quan_tri(auth.uid()) OR public.nc_la_giam_doc(auth.uid())
  );
CREATE POLICY "nc_custom_title_gui" ON public.nc_custom_title FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending' AND requested_by = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.nc_staff s WHERE s.id = staff_id AND s.user_id = auth.uid())
      OR public.nc_la_quan_tri(auth.uid())
    )
  );
CREATE POLICY "nc_custom_title_quan_tri" ON public.nc_custom_title FOR UPDATE TO authenticated
  USING (public.nc_la_quan_tri(auth.uid())) WITH CHECK (public.nc_la_quan_tri(auth.uid()));
CREATE POLICY "nc_custom_title_xoa" ON public.nc_custom_title FOR DELETE TO authenticated
  USING (
    public.nc_la_quan_tri(auth.uid())
    OR (status = 'pending' AND EXISTS (SELECT 1 FROM public.nc_staff s WHERE s.id = staff_id AND s.user_id = auth.uid()))
  );

-- Kênh chat: của ai người đó sửa; TCTH toàn quyền
CREATE POLICY "nc_channel_cua_toi" ON public.nc_channel FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.nc_staff s WHERE s.id = staff_id AND s.user_id = auth.uid())
    OR public.nc_la_quan_tri(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.nc_staff s WHERE s.id = staff_id AND s.user_id = auth.uid())
    OR public.nc_la_quan_tri(auth.uid())
  );

-- Thẻ đã phát hành: cán bộ xem thẻ của mình; ghi qua RPC
CREATE POLICY "nc_card_doc" ON public.nc_card FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.nc_staff s WHERE s.id = staff_id AND s.user_id = auth.uid())
    OR public.nc_la_quan_tri(auth.uid()) OR public.nc_la_giam_doc(auth.uid())
  );
CREATE POLICY "nc_card_quan_tri" ON public.nc_card FOR ALL TO authenticated
  USING (public.nc_la_quan_tri(auth.uid())) WITH CHECK (public.nc_la_quan_tri(auth.uid()));

-- Nhật ký quét: cán bộ xem lượt quét thẻ mình; ghi chỉ qua RPC
CREATE POLICY "nc_scan_log_doc" ON public.nc_scan_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.nc_staff s WHERE s.id = staff_id AND s.user_id = auth.uid())
    OR public.nc_la_quan_tri(auth.uid()) OR public.nc_la_giam_doc(auth.uid())
  );

CREATE POLICY "nc_audit_doc" ON public.nc_audit FOR SELECT TO authenticated
  USING (public.nc_la_quan_tri(auth.uid()) OR public.nc_la_giam_doc(auth.uid()));

CREATE POLICY "nc_cau_hinh_doc" ON public.nc_cau_hinh FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "nc_cau_hinh_quan_tri" ON public.nc_cau_hinh FOR ALL TO authenticated
  USING (public.nc_la_quan_tri(auth.uid())) WITH CHECK (public.nc_la_quan_tri(auth.uid()));

-- ---------------------------------------------------------------------------
-- 23) Kho ảnh thẻ (ảnh chân dung, QR WeChat/Kakao) — CÔNG KHAI vì khách quét
--     thẻ không đăng nhập. Đường dẫn <nc_staff.id>/<tên>.<đuôi> nên thư mục
--     cấp 1 là chủ ảnh.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('nc-danh-thiep', 'nc-danh-thiep', true, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "nc anh: ai cung xem"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nc-danh-thiep');

CREATE POLICY "nc anh: chu the hoac TCTH tai len"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'nc-danh-thiep' AND (
      public.nc_la_quan_tri(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.nc_staff s
         WHERE s.user_id = auth.uid() AND s.id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY "nc anh: chu the hoac TCTH ghi de"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'nc-danh-thiep' AND (
      public.nc_la_quan_tri(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.nc_staff s
         WHERE s.user_id = auth.uid() AND s.id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY "nc anh: chu the hoac TCTH xoa"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'nc-danh-thiep' AND (
      public.nc_la_quan_tri(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.nc_staff s
         WHERE s.user_id = auth.uid() AND s.id::text = (storage.foldername(name))[1]
      )
    )
  );

COMMENT ON TABLE public.nc_org_unit IS 'Từ điển đơn vị 6 ngôn ngữ cho danh thiếp số (NT1: thẻ được ghép, không được nhập)';
COMMENT ON TABLE public.nc_title IS 'Từ điển chức danh: scope internal (QĐ bổ nhiệm) / external (in trên thẻ) — NT2';
COMMENT ON TABLE public.nc_staff IS 'Hồ sơ danh thiếp số của từng cán bộ; thẻ công khai chỉ đọc qua nc_resolve_card()';
COMMENT ON FUNCTION public.nc_resolve_card(TEXT, BOOLEAN) IS 'Payload thẻ đã lọc theo ma trận quyền hiển thị (Mục 5 đặc tả); anon gọi được';

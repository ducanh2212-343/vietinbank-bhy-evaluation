-- Cấp phụ trách cho hồ sơ PDTD + cấm «tự theo dõi chính mình»
--
-- Hai việc trong một đợt, cùng một gốc: ai giám sát việc này.
--
-- (1) Bảng PDTD chưa có ba cột Phó phòng / Trưởng phòng / PGĐ phụ trách như
--     bảng đầu việc — nên hộp thoại hồ sơ không có gì để gán. Bổ sung để hai
--     bảng dùng chung một khối giao diện và một luật.
--
-- (2) Trigger tạo đầu việc bắt `lanh_dao_theo_doi` phải khác NULL, nhưng lúc
--     đó danh mục phòng chưa có Trưởng phòng nào, nên form buộc phải lùi về
--     `|| nguoi_chiu_trach_nhiem` cho qua cửa. Kết quả: thẻ KHDN-2608-023 có
--     cán bộ Nguyễn Quốc Tân vừa là người làm vừa là «lãnh đạo theo dõi» —
--     giám sát trên giấy, không ai giám sát thật. Hàng rào cứng mà thiếu dữ
--     liệu để vượt qua thì bao giờ cũng đẻ ra một đường lách như vậy.
--
--     Nay cấm thẳng ở DB. Ngoại lệ đúng: người đó CHÍNH LÀ Trưởng phòng (trên
--     họ không còn ai trong phòng) hoặc thuộc Ban Giám đốc.

-- ---------------------------------------------------------------------------
-- 1) Ba cấp phụ trách cho hồ sơ tín dụng
-- ---------------------------------------------------------------------------
ALTER TABLE public.ct2_ho_so_tin_dung
  ADD COLUMN IF NOT EXISTS pho_phong uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS truong_phong uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS pgd_phu_trach uuid REFERENCES public.profiles(id);

COMMENT ON COLUMN public.ct2_ho_so_tin_dung.pho_phong IS 'Phó phòng phụ trách mảng việc — chọn tay, hệ thống không đoán';
COMMENT ON COLUMN public.ct2_ho_so_tin_dung.truong_phong IS 'Trưởng phòng — tự điền từ departments.manager_id, sửa được';
COMMENT ON COLUMN public.ct2_ho_so_tin_dung.pgd_phu_trach IS 'PGĐ phụ trách — tự điền qua ct2_pgd_cua_phong(), sửa được';

-- ---------------------------------------------------------------------------
-- 2) Ai được tự theo dõi chính mình
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_tu_theo_doi_duoc(_nguoi uuid, _phong uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _nguoi IS NULL
      OR EXISTS (SELECT 1 FROM public.departments d
                  WHERE d.id = _phong AND d.manager_id = _nguoi)
      OR EXISTS (SELECT 1 FROM public.profiles p
                  JOIN public.user_roles ur ON ur.user_id = p.user_id
                 WHERE p.id = _nguoi
                   AND ur.role IN ('bgd'::app_role, 'system_admin'::app_role))
$$;
REVOKE ALL ON FUNCTION public.ct2_tu_theo_doi_duoc(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_tu_theo_doi_duoc(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Dọn dữ liệu cũ TRƯỚC khi dựng rào
-- ---------------------------------------------------------------------------
-- Thẻ đang tự theo dõi mình mà đã có Trưởng phòng → chuyển sang Trưởng phòng
-- (đúng lựa chọn Giám đốc vừa gán trên chính thẻ đó, không phải suy đoán mới).
UPDATE public.ct2_dau_viec dv
   SET lanh_dao_theo_doi = dv.truong_phong
 WHERE dv.lanh_dao_theo_doi = dv.nguoi_chiu_trach_nhiem
   AND dv.truong_phong IS NOT NULL
   AND dv.truong_phong <> dv.nguoi_chiu_trach_nhiem
   AND NOT public.ct2_tu_theo_doi_duoc(dv.nguoi_chiu_trach_nhiem, dv.phong);

-- Còn lại thì để TRỐNG, hiện thành cảnh báo «thiếu Lãnh đạo theo dõi». Bịa một
-- cái tên vào ô giám sát còn tệ hơn ô trống: ô trống thì người ta đi hỏi.
UPDATE public.ct2_dau_viec dv
   SET lanh_dao_theo_doi = NULL
 WHERE dv.lanh_dao_theo_doi = dv.nguoi_chiu_trach_nhiem
   AND NOT public.ct2_tu_theo_doi_duoc(dv.nguoi_chiu_trach_nhiem, dv.phong);

UPDATE public.ct2_ho_so_tin_dung hs
   SET lanh_dao_theo_doi = NULL
 WHERE hs.lanh_dao_theo_doi = hs.can_bo
   AND NOT public.ct2_tu_theo_doi_duoc(hs.can_bo, hs.phong);

-- ---------------------------------------------------------------------------
-- 4) Rào ở trigger tạo đầu việc: bỏ «phải có lãnh đạo theo dõi» cứng nhắc,
--    thay bằng «có thì không được là chính người làm»
-- ---------------------------------------------------------------------------
-- Giữ nguyên yêu cầu phải có lãnh đạo theo dõi (việc không ai theo dõi là việc
-- rơi), nhưng thêm vế cấm tự theo dõi để đường lách cũ đóng lại.
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_tao_dau_viec()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ma_phong text;
  toi uuid := public.get_my_profile_id();
  tu_nhan_viec boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    NEW.han_goc := COALESCE(NEW.han_goc, NEW.han_hoan_thanh);
    RETURN NEW;
  END IF;

  IF NEW.nguoi_chiu_trach_nhiem IS NULL THEN
    RAISE EXCEPTION 'Việc ghi mới phải có người chịu trách nhiệm — đúng 01 người, không để «gán sau»';
  END IF;
  IF NEW.lanh_dao_theo_doi IS NULL THEN
    RAISE EXCEPTION 'Việc ghi mới phải có lãnh đạo theo dõi — chọn Trưởng phòng ở mục «Các cấp phụ trách»';
  END IF;
  IF NEW.lanh_dao_theo_doi = NEW.nguoi_chiu_trach_nhiem
     AND NOT public.ct2_tu_theo_doi_duoc(NEW.nguoi_chiu_trach_nhiem, NEW.phong) THEN
    RAISE EXCEPTION 'Người làm không tự theo dõi chính mình — chọn Trưởng phòng hoặc lãnh đạo khác';
  END IF;
  IF NEW.han_hoan_thanh IS NULL THEN
    RAISE EXCEPTION 'Việc ghi mới phải có hạn hoàn thành — không có hạn thì không đo được đúng hẹn';
  END IF;
  NEW.ngay_bat_dau := COALESCE(NEW.ngay_bat_dau, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);

  tu_nhan_viec := NEW.nguoi_chiu_trach_nhiem = toi
    AND NEW.phong = public.get_my_department_id()
    AND NEW.nguon_viec = 'CHU_DONG'
    AND NOT NEW.lien_phong
    AND NEW.muc_uu_tien = 'THUONG';

  IF NOT public.ct2_sua_duoc_phong(NEW.phong) AND NOT tu_nhan_viec THEN
    RAISE EXCEPTION 'Anh/chị chỉ tự ghi được việc chủ động của chính mình. Giao việc cho người khác cần lãnh đạo Phòng, hoặc dùng «Đề xuất việc».';
  END IF;

  IF NEW.lien_phong AND NOT (
    public.can_view_all_action_plans() OR public.ct2_la_lanh_dao_phong(NEW.phong)
    OR NEW.phong = ANY(public.get_my_pgd_scope_dept_ids())
  ) THEN
    RAISE EXCEPTION 'Chỉ Phó Phòng trở lên được khởi tạo đầu việc liên phòng';
  END IF;

  IF NEW.muc_uu_tien = 'TRONG_DIEM_BGD' AND NOT (
    public.has_role(auth.uid(), 'bgd'::app_role)
    OR public.has_role(auth.uid(), 'system_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Mức «Trọng điểm BGĐ» chỉ Ban Giám đốc đặt được';
  END IF;

  IF NEW.chien_dich_id IS NOT NULL THEN
    PERFORM 1 FROM public.ct2_chien_dich c
     WHERE c.id = NEW.chien_dich_id AND c.ngay_ket_thuc >= NEW.han_hoan_thanh;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Hạn hoàn thành vượt mốc kết thúc của chiến dịch';
    END IF;
  END IF;

  NEW.han_goc := COALESCE(NEW.han_goc, NEW.han_hoan_thanh);
  IF NEW.ma_hien_thi IS NULL THEN
    SELECT d.code INTO ma_phong FROM public.departments d WHERE d.id = NEW.phong;
    NEW.ma_hien_thi := COALESCE(ma_phong, 'CT2') || '-'
      || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-'
      || lpad(nextval('public.ct2_ma_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END $function$;

-- ---------------------------------------------------------------------------
-- 5) Rào khi SỬA: cùng luật, cho cả hai bảng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_khong_tu_theo_doi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  nguoi uuid;
BEGIN
  IF NEW.lanh_dao_theo_doi IS NULL THEN RETURN NEW; END IF;
  -- IF chứ không CASE: PL/pgSQL phân giải MỌI nhánh của CASE khi biên dịch,
  -- nên NEW.nguoi_chiu_trach_nhiem sẽ nổ «record has no field» trên bảng PDTD
  IF TG_TABLE_NAME = 'ct2_ho_so_tin_dung' THEN
    nguoi := NEW.can_bo;
  ELSE
    nguoi := NEW.nguoi_chiu_trach_nhiem;
  END IF;
  IF NEW.lanh_dao_theo_doi = nguoi
     AND NOT public.ct2_tu_theo_doi_duoc(nguoi, NEW.phong) THEN
    RAISE EXCEPTION 'Người làm không tự theo dõi chính mình — chọn Trưởng phòng hoặc lãnh đạo khác';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_ct2_dv_khong_tu_theo_doi ON public.ct2_dau_viec;
CREATE TRIGGER trg_ct2_dv_khong_tu_theo_doi
  BEFORE INSERT OR UPDATE ON public.ct2_dau_viec
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_khong_tu_theo_doi();

DROP TRIGGER IF EXISTS trg_ct2_hs_khong_tu_theo_doi ON public.ct2_ho_so_tin_dung;
CREATE TRIGGER trg_ct2_hs_khong_tu_theo_doi
  BEFORE INSERT OR UPDATE ON public.ct2_ho_so_tin_dung
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_khong_tu_theo_doi();

-- ---------------------------------------------------------------------------
-- 6) Sửa cấp phụ trách của hồ sơ PDTD: chỉ lãnh đạo
-- ---------------------------------------------------------------------------
-- Cùng lý lẽ với ct2_dau_viec ở migration 20260821090000: gán ai là cấp phụ
-- trách là quyết định của lãnh đạo, không phải của người thực hiện hồ sơ.
CREATE OR REPLACE FUNCTION public.f_ct2_hs_cap_phu_trach_chi_lanh_dao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.ct2_sua_duoc_phong(OLD.phong) THEN RETURN NEW; END IF;
  IF NEW.pho_phong IS DISTINCT FROM OLD.pho_phong
    OR NEW.truong_phong IS DISTINCT FROM OLD.truong_phong
    OR NEW.pgd_phu_trach IS DISTINCT FROM OLD.pgd_phu_trach
    OR NEW.lanh_dao_theo_doi IS DISTINCT FROM OLD.lanh_dao_theo_doi THEN
    RAISE EXCEPTION 'Gán Phó phòng / Trưởng phòng / PGĐ phụ trách là việc của lãnh đạo Phòng hoặc Ban Giám đốc.';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_ct2_hs_cap_phu_trach ON public.ct2_ho_so_tin_dung;
CREATE TRIGGER trg_ct2_hs_cap_phu_trach
  BEFORE UPDATE ON public.ct2_ho_so_tin_dung
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_hs_cap_phu_trach_chi_lanh_dao();

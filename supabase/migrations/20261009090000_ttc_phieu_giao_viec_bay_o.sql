-- ============================================================================
-- PHIẾU GIAO VIỆC BẢY Ô trên Training Center — theo «Bản mô tả yêu cầu sửa —
-- Phiếu giao việc trên BHY ONE» của Giám đốc (06/09/2026), và mở quyền SỬA
-- NỘI DUNG CHƯƠNG TRÌNH cho Ban Giám đốc + Phòng TCTH.
--
-- Khảo sát trước khi sửa (Mục 4 của bản mô tả): bảng ttc_viec_goi_dau vừa áp
-- sáng 06/09, CHƯA có bản ghi thật → không cần chuyển đổi dữ liệu. Vẫn giữ
-- nguyên các cột cũ (tieu_chuan · han · moc_kiem_tra · nghiem_thu) và đồng bộ
-- từ cột mới bằng trigger, đúng nguyên tắc «không đổi tên trường đang có».
--
-- Vì sao thẻ phiếu có trạng thái RIÊNG (trang_thai) thay vì mượn trạng thái thẻ
-- Chiêu thức 2: điều kiện chuyển cột của phiếu (đủ bảy ô + khoá chuẩn → Đang
-- làm; nghiệm thu Đạt → Hoàn thành) là kỷ luật của người GIAO việc, còn thẻ
-- Chiêu thức 2 là nhịp của người LÀM việc. Hai đồng hồ khác nhau, không ép làm một.
-- ============================================================================

ALTER TABLE public.ttc_viec_goi_dau
  ADD COLUMN IF NOT EXISTS dat_chuan text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS han_nop timestamptz,
  -- [{ngay:'YYYY-MM-DD', ket_qua: null|'chua_toi'|'dung_tien_do'|'cham_tien_do', ghi_chu:''}]
  ADD COLUMN IF NOT EXISTS diem_kiem jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS muc_giao text CHECK (muc_giao IN ('M1','M2','M3')),
  ADD COLUMN IF NOT EXISTS goi_y_cach_lam text,
  ADD COLUMN IF NOT EXISTS nguon_luc text,
  ADD COLUMN IF NOT EXISTS muc_giao_cuoi_ky text CHECK (muc_giao_cuoi_ky IN ('M1','M2','M3')),
  -- [{thoi_diem, chuan_cu:[], chuan_moi:[], ly_do}]
  ADD COLUMN IF NOT EXISTS lich_su_chuan jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS khoa_chuan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trang_thai text NOT NULL DEFAULT 'phai_lam'
    CHECK (trang_thai IN ('phai_lam','dang_lam','hoan_thanh')),
  ADD COLUMN IF NOT EXISTS nghiem_thu_ket_qua text CHECK (nghiem_thu_ket_qua IN ('dat','chua_dat')),
  ADD COLUMN IF NOT EXISTS so_lan_nghiem_thu int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hoi_lai_giua_chung boolean;

-- Dữ liệu cũ (nếu có): tiêu chuẩn một dòng → mảng; hạn ngày → 17:00 giờ VN; mốc → điểm kiểm
UPDATE public.ttc_viec_goi_dau SET
  dat_chuan = CASE WHEN tieu_chuan IS NULL OR btrim(tieu_chuan) = '' THEN '{}'::text[]
                   ELSE regexp_split_to_array(tieu_chuan, E'\\s*\\n\\s*') END,
  han_nop = CASE WHEN han IS NULL THEN NULL ELSE (han::text || ' 17:00')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' END,
  diem_kiem = CASE WHEN moc_kiem_tra IS NULL THEN '[]'::jsonb
                   ELSE jsonb_build_array(jsonb_build_object('ngay', moc_kiem_tra::text, 'ket_qua', NULL, 'ghi_chu', '')) END,
  nghiem_thu_ket_qua = CASE WHEN nghiem_thu IS NOT NULL THEN 'dat' ELSE NULL END,
  trang_thai = CASE WHEN nghiem_thu IS NOT NULL THEN 'hoan_thanh' ELSE 'phai_lam' END
WHERE dat_chuan = '{}' AND han_nop IS NULL;

-- ---------------------------------------------------------------------------
-- Bảy ô bắt buộc — cùng luật với kiemTraPhieu() ở client (src/lib/trainingCenter.ts).
-- Server chỉ chặn phần CHẶN (Mục 7.2–7.6), phần cảnh báo để client.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_phieu_thieu(g public.ttc_viec_goi_dau)
RETURNS text[]
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  thieu text[] := ARRAY[]::text[];
  dong text;
  moc jsonb;
  so_moc int := 0;
BEGIN
  IF g.muc_dich IS NULL OR btrim(g.muc_dich) = '' THEN thieu := array_append(thieu, 'VÌ SAO'); END IF;
  IF g.dau_ra IS NULL OR btrim(g.dau_ra) = '' THEN thieu := array_append(thieu, 'VIỆC GÌ'); END IF;
  IF g.can_bo IS NULL THEN thieu := array_append(thieu, 'AI LÀM'); END IF;
  IF cardinality(g.dat_chuan) = 0 THEN
    thieu := array_append(thieu, 'ĐẠT CHUẨN');
  ELSE
    FOREACH dong IN ARRAY g.dat_chuan LOOP
      IF char_length(btrim(dong)) < 15 THEN thieu := array_append(thieu, 'ĐẠT CHUẨN (mỗi dòng ≥ 15 ký tự)'); EXIT; END IF;
    END LOOP;
  END IF;
  IF g.han_nop IS NULL THEN thieu := array_append(thieu, 'HẠN NỘP'); END IF;
  IF jsonb_typeof(g.diem_kiem) = 'array' THEN
    FOR moc IN SELECT * FROM jsonb_array_elements(g.diem_kiem) LOOP
      so_moc := so_moc + 1;
      IF g.han_nop IS NOT NULL AND (moc->>'ngay') IS NOT NULL
         AND (moc->>'ngay')::date >= (g.han_nop AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN
        thieu := array_append(thieu, 'ĐIỂM KIỂM (phải trước hạn nộp)'); EXIT;
      END IF;
    END LOOP;
  END IF;
  IF so_moc = 0 THEN thieu := array_append(thieu, 'ĐIỂM KIỂM'); END IF;
  IF g.muc_giao IS NULL THEN thieu := array_append(thieu, 'MỨC GIAO'); END IF;
  IF g.muc_giao = 'M1' AND (g.goi_y_cach_lam IS NULL OR btrim(g.goi_y_cach_lam) = '') THEN
    thieu := array_append(thieu, 'GỢI Ý CÁCH LÀM (bắt buộc với mức M1)');
  END IF;
  RETURN thieu;
END $$;

-- ---------------------------------------------------------------------------
-- Kỷ luật trong trigger: khoá chuẩn · điều chỉnh chuẩn phải có lý do · điều
-- kiện chuyển cột · nghiệm thu chỉ BGĐ, hai kết quả · đồng bộ cột cũ.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ttc_goi_dau_truoc_tao()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thieu text[];
BEGIN
  -- «Giao việc» ngay từ phiếu mới: phải đủ bảy ô
  IF NEW.khoa_chuan THEN
    thieu := public.ttc_phieu_thieu(NEW);
    IF cardinality(thieu) > 0 THEN
      RAISE EXCEPTION 'Thẻ chưa đủ thông tin để giao. Còn thiếu: %', array_to_string(thieu, ', ');
    END IF;
  END IF;
  IF NEW.trang_thai <> 'phai_lam' THEN
    RAISE EXCEPTION 'Phiếu mới luôn ở cột Phải làm';
  END IF;
  RETURN public.f_ttc_goi_dau_dong_bo_goi(NEW);
END $$;

-- Gọi đồng bộ từ trigger khác (plpgsql không gọi trực tiếp hàm trigger được)
CREATE OR REPLACE FUNCTION public.f_ttc_goi_dau_dong_bo_goi(g public.ttc_viec_goi_dau)
RETURNS public.ttc_viec_goi_dau
LANGUAGE plpgsql
AS $$
DECLARE
  moc_dau text;
BEGIN
  g.tieu_chuan := NULLIF(array_to_string(g.dat_chuan, E'\n'), '');
  g.han := CASE WHEN g.han_nop IS NULL THEN NULL ELSE (g.han_nop AT TIME ZONE 'Asia/Ho_Chi_Minh')::date END;
  SELECT min(m->>'ngay') INTO moc_dau FROM jsonb_array_elements(COALESCE(g.diem_kiem, '[]'::jsonb)) m;
  g.moc_kiem_tra := CASE WHEN moc_dau IS NULL THEN NULL ELSE moc_dau::date END;
  g.updated_at := now();
  RETURN g;
END $$;

CREATE OR REPLACE FUNCTION public.f_ttc_goi_dau_truoc_sua()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toi uuid := public.get_my_profile_id();
  la_bgd boolean := public.ttc_la_bgd(NEW.chuong_trinh_id);
  la_hoc_vien boolean := (NEW.hoc_vien = toi);
  thieu text[];
  cuoi jsonb;
  doi_nghiem_thu boolean :=
    NEW.nghiem_thu IS DISTINCT FROM OLD.nghiem_thu
    OR NEW.nghiem_thu_ket_qua IS DISTINCT FROM OLD.nghiem_thu_ket_qua
    OR NEW.hoi_lai_giua_chung IS DISTINCT FROM OLD.hoi_lai_giua_chung
    OR NEW.muc_giao_cuoi_ky IS DISTINCT FROM OLD.muc_giao_cuoi_ky
    OR NEW.nguoi_nghiem_thu IS DISTINCT FROM OLD.nguoi_nghiem_thu
    OR NEW.nghiem_thu_luc IS DISTINCT FROM OLD.nghiem_thu_luc
    OR NEW.so_lan_nghiem_thu IS DISTINCT FROM OLD.so_lan_nghiem_thu;
  doi_noi_dung boolean :=
    NEW.ten IS DISTINCT FROM OLD.ten OR NEW.muc_dich IS DISTINCT FROM OLD.muc_dich
    OR NEW.dau_ra IS DISTINCT FROM OLD.dau_ra OR NEW.can_bo IS DISTINCT FROM OLD.can_bo
    OR NEW.dat_chuan IS DISTINCT FROM OLD.dat_chuan OR NEW.han_nop IS DISTINCT FROM OLD.han_nop
    OR NEW.diem_kiem IS DISTINCT FROM OLD.diem_kiem OR NEW.muc_giao IS DISTINCT FROM OLD.muc_giao
    OR NEW.goi_y_cach_lam IS DISTINCT FROM OLD.goi_y_cach_lam OR NEW.nguon_luc IS DISTINCT FROM OLD.nguon_luc
    OR NEW.dau_viec_id IS DISTINCT FROM OLD.dau_viec_id OR NEW.ket_qua IS DISTINCT FROM OLD.ket_qua
    OR NEW.khoa_chuan IS DISTINCT FROM OLD.khoa_chuan OR NEW.lich_su_chuan IS DISTINCT FROM OLD.lich_su_chuan;
  doi_trang_thai boolean := NEW.trang_thai IS DISTINCT FROM OLD.trang_thai;
BEGIN
  -- 1) Ai được đụng vào gì
  IF doi_nghiem_thu AND NOT la_bgd THEN
    RAISE EXCEPTION 'Chỉ Ban Giám đốc mới nghiệm thu được việc gối đầu';
  END IF;
  IF doi_noi_dung AND NOT la_hoc_vien THEN
    RAISE EXCEPTION 'Chỉ học viên (người giao việc) mới sửa được nội dung phiếu';
  END IF;

  -- 2) Khoá chuẩn một chiều
  IF OLD.khoa_chuan AND NOT NEW.khoa_chuan THEN
    RAISE EXCEPTION 'Đã giao việc thì không mở khoá chuẩn được';
  END IF;
  IF NEW.khoa_chuan AND NOT OLD.khoa_chuan THEN
    thieu := public.ttc_phieu_thieu(NEW);
    IF cardinality(thieu) > 0 THEN
      RAISE EXCEPTION 'Thẻ chưa đủ thông tin để giao. Còn thiếu: %', array_to_string(thieu, ', ');
    END IF;
  END IF;

  -- 3) Sau khi giao, sửa ĐẠT CHUẨN phải đi kèm một dòng lịch sử có lý do ≥ 20 ký tự
  IF OLD.khoa_chuan AND NEW.dat_chuan IS DISTINCT FROM OLD.dat_chuan THEN
    IF jsonb_array_length(NEW.lich_su_chuan) <> jsonb_array_length(OLD.lich_su_chuan) + 1 THEN
      RAISE EXCEPTION 'Chuẩn đã khoá. Muốn sửa phải bấm «Điều chỉnh chuẩn» và ghi lý do';
    END IF;
    cuoi := NEW.lich_su_chuan -> (jsonb_array_length(NEW.lich_su_chuan) - 1);
    IF char_length(btrim(COALESCE(cuoi->>'ly_do', ''))) < 20 THEN
      RAISE EXCEPTION 'Lý do điều chỉnh chuẩn tối thiểu 20 ký tự';
    END IF;
  END IF;
  IF jsonb_array_length(NEW.lich_su_chuan) < jsonb_array_length(OLD.lich_su_chuan) THEN
    RAISE EXCEPTION 'Không xoá được lịch sử điều chỉnh chuẩn';
  END IF;

  -- 4) Nghiệm thu: hai kết quả, nhận xét ≥ 30 ký tự, đếm số lần; Đạt → Hoàn thành
  IF NEW.nghiem_thu_ket_qua IS DISTINCT FROM OLD.nghiem_thu_ket_qua THEN
    IF NEW.nghiem_thu_ket_qua IS NOT NULL THEN
      IF char_length(btrim(COALESCE(NEW.nghiem_thu, ''))) < 30 THEN
        RAISE EXCEPTION 'Nhận xét nghiệm thu tối thiểu 30 ký tự';
      END IF;
      IF NOT OLD.khoa_chuan THEN
        RAISE EXCEPTION 'Chưa giao việc thì chưa nghiệm thu được';
      END IF;
      NEW.nguoi_nghiem_thu := toi;
      NEW.nghiem_thu_luc := now();
      NEW.so_lan_nghiem_thu := OLD.so_lan_nghiem_thu + 1;
      NEW.trang_thai := CASE WHEN NEW.nghiem_thu_ket_qua = 'dat' THEN 'hoan_thanh' ELSE 'dang_lam' END;
    ELSE
      -- «Mở lại nghiệm thu» của BGĐ: về Đang làm, giữ nhận xét cũ để đối chiếu
      NEW.trang_thai := 'dang_lam';
    END IF;
  ELSIF doi_trang_thai THEN
    -- 5) Chuyển cột do người giao việc bấm
    IF OLD.trang_thai = 'hoan_thanh' THEN
      RAISE EXCEPTION 'Thẻ đã nghiệm thu. Nếu cần mở lại, dùng nút Mở lại nghiệm thu.';
    END IF;
    IF NEW.trang_thai = 'dang_lam' THEN
      thieu := public.ttc_phieu_thieu(NEW);
      IF NOT NEW.khoa_chuan OR cardinality(thieu) > 0 THEN
        RAISE EXCEPTION 'Thẻ chưa đủ thông tin để giao. Còn thiếu: %',
          array_to_string(CASE WHEN NEW.khoa_chuan THEN thieu ELSE thieu || 'bấm «Giao việc» để khoá chuẩn' END, ', ');
      END IF;
    ELSIF NEW.trang_thai = 'hoan_thanh' THEN
      IF NEW.nghiem_thu_ket_qua IS DISTINCT FROM 'dat' THEN
        RAISE EXCEPTION 'Thẻ chỉ được chuyển sang Hoàn thành sau khi nghiệm thu Đạt.';
      END IF;
    END IF;
  END IF;

  RETURN public.f_ttc_goi_dau_dong_bo_goi(NEW);
END $$;

DROP TRIGGER IF EXISTS ttc_goi_dau_truoc_tao ON public.ttc_viec_goi_dau;
CREATE TRIGGER ttc_goi_dau_truoc_tao BEFORE INSERT ON public.ttc_viec_goi_dau
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_goi_dau_truoc_tao();
DROP TRIGGER IF EXISTS ttc_goi_dau_truoc_sua ON public.ttc_viec_goi_dau;
CREATE TRIGGER ttc_goi_dau_truoc_sua BEFORE UPDATE ON public.ttc_viec_goi_dau
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_goi_dau_truoc_sua();

-- ---------------------------------------------------------------------------
-- Mở quyền SỬA NỘI DUNG CHƯƠNG TRÌNH (thông tin, ngày, đầu việc) cho Ban Giám
-- đốc bên cạnh quản trị chương trình. Xếp thành viên vẫn là việc của quản trị.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_sua_duoc_noi_dung(_ct uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff(auth.uid())
     AND (public.ttc_vai(_ct) IN ('quan_tri', 'bgd')
          OR public.has_role(auth.uid(), 'system_admin'::app_role))
$$;
REVOKE ALL ON FUNCTION public.ttc_sua_duoc_noi_dung(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_sua_duoc_noi_dung(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "ttc sua chuong trinh" ON public.ttc_chuong_trinh;
CREATE POLICY "ttc sua chuong trinh" ON public.ttc_chuong_trinh FOR UPDATE TO authenticated
  USING (public.ttc_sua_duoc_noi_dung(id)) WITH CHECK (public.ttc_sua_duoc_noi_dung(id));
DROP POLICY IF EXISTS "ttc ghi ngay" ON public.ttc_ngay;
CREATE POLICY "ttc ghi ngay" ON public.ttc_ngay FOR ALL TO authenticated
  USING (public.ttc_sua_duoc_noi_dung(chuong_trinh_id)) WITH CHECK (public.ttc_sua_duoc_noi_dung(chuong_trinh_id));
DROP POLICY IF EXISTS "ttc ghi dau viec" ON public.ttc_dau_viec;
CREATE POLICY "ttc ghi dau viec" ON public.ttc_dau_viec FOR ALL TO authenticated
  USING (public.ttc_sua_duoc_noi_dung(public.ttc_ct_cua_ngay(ngay_id)))
  WITH CHECK (public.ttc_sua_duoc_noi_dung(public.ttc_ct_cua_ngay(ngay_id)));

-- ---------------------------------------------------------------------------
-- Sửa chữ trong lộ trình đã nạp (Mục 11): ba việc gối đầu chốt chiều Ngày 1,
-- giao cán bộ sáng Ngày 2; Ngày 7–8 là rà soát lại phiếu và mức giao.
-- ---------------------------------------------------------------------------
UPDATE public.ttc_dau_viec SET
  ten = 'Chốt ba việc gối đầu cùng Giám đốc bằng phiếu giao việc bảy ô (5W2H rút gọn + điểm Check của PDCA). Giao văn bản ngày 2. Chốt PDCA ngày 1.',
  dau_ra = 'Ba phiếu giao việc đã lập trên Bảng việc + phiếu PDCA',
  nguoi_phu_trach = 'GD', thiet_bi = 'LAPTOP', noi_nop = 'TRAINING_CENTER', trong_tam = true
WHERE ten LIKE 'Giao văn bản ngày 2. Chốt PDCA ngày 1.%';

UPDATE public.ttc_ngay SET
  chuan_bi = 'Sáng Ngày 2 trước 08:00: bấm «Giao việc» trên ba phiếu gối đầu và giao trực tiếp cho cán bộ (có repeat-back). Đọc lượt 1 văn bản được giao chiều hôm trước. Chuẩn bị mẫu phiếu văn bản, phiếu Bloom.'
WHERE so_thu_tu = 2 AND chuan_bi LIKE 'Đọc lượt 1 văn bản được giao chiều hôm trước.%';

UPDATE public.ttc_dau_viec SET
  ten = 'Kỹ năng giao việc: rà soát lại ba phiếu giao việc bảy ô đã giao từ Ngày 2 — VÌ SAO · VIỆC GÌ · AI LÀM · ĐẠT CHUẨN · HẠN NỘP · ĐIỂM KIỂM · MỨC GIAO. Xác định lại mức giao cho từng cán bộ.',
  dau_ra = 'Ba phiếu giao việc đã rà soát, mức giao đã xác định'
WHERE ten LIKE 'Kỹ năng giao việc: phiếu WHY%';

UPDATE public.ttc_dau_viec SET
  ten = 'TƯƠNG TÁC CÁN BỘ 1: kiểm điểm kiểm của việc gối đầu số 1 với cán bộ. Bắt buộc có repeat-back, ghi kết quả điểm kiểm (đúng/chậm tiến độ) và xử lý tình huống chậm. Sau đó KHÔNG nhắn thêm ngoài mốc đã hẹn.'
WHERE ten LIKE 'TƯƠNG TÁC CÁN BỘ 1: giao việc trực tiếp cho 01 cán bộ.%';

UPDATE public.ttc_dau_viec SET
  ten = 'Mô hình 70–20–10 trong kèm cặp. Thiết kế cách kèm một cán bộ cụ thể theo đúng tỷ lệ này. Rà soát phiếu giao việc số 2: cán bộ có phải hỏi lại giữa chừng không, mức giao có đúng không.'
WHERE ten LIKE 'Mô hình 70–20–10 trong kèm cặp.%';

UPDATE public.ttc_dau_viec SET
  ten = 'CHIÊU THỨC SỐ 3 – theo sát IDP: lập IDP 30 ngày cho cán bộ đó; lập bản đồ chuyên gia nội bộ của Phòng. Rà soát phiếu giao việc số 3.'
WHERE ten LIKE 'CHIÊU THỨC SỐ 3 – theo sát IDP%';

COMMENT ON COLUMN public.ttc_viec_goi_dau.dat_chuan IS 'Ô ĐẠT CHUẨN — mỗi phần tử một tiêu chí đo được; khoá sau khi Giao việc (khoa_chuan)';
COMMENT ON COLUMN public.ttc_viec_goi_dau.lich_su_chuan IS 'Nhật ký mọi lần sửa ĐẠT CHUẨN sau khi giao: [{thoi_diem, chuan_cu, chuan_moi, ly_do ≥ 20 ký tự}]';
COMMENT ON COLUMN public.ttc_viec_goi_dau.muc_giao IS 'Mức uỷ quyền đầu kỳ: M1 làm theo hướng dẫn · M2 tự làm, báo phương án trước · M3 tự làm, báo kết quả';
COMMENT ON COLUMN public.ttc_viec_goi_dau.muc_giao_cuoi_ky IS 'Mức giao đánh giá lại ngày 10 — so với muc_giao là kết quả kèm cặp đo được';

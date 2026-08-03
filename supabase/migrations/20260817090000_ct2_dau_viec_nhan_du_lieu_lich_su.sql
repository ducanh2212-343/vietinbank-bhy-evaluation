-- ============================================================================
-- CHIÊU THỨC 2 — Bàn đầu việc: nhận được dữ liệu LỊCH SỬ còn thiếu
--
-- BỐI CẢNH. Board Miro «Kanban KẾ HOẠCH HÀNH ĐỘNG» của Phòng KHDN có 21 thẻ:
--   · 1/21 thẻ KHÔNG có người phụ trách (KHAI THÁC NGUỒN VỐN KHCN BIG4 —
--     đúng thẻ được đánh dấu High và sắp tới hạn)
--   · 4/21 thẻ KHÔNG có hạn hoàn thành
--   · 18/21 thẻ KHÔNG có ngày bắt đầu
--   · 21/21 thẻ KHÔNG có lãnh đạo theo dõi — board này không có cột đó
--
-- Cùng bài toán và cùng lời giải với bàn PDTD: bịa một cái tên vào ô «ai chịu
-- trách nhiệm» là gán trách nhiệm cho người không nhận, còn tệ hơn số tiền
-- bịa. Nên NHẬN Ô TRỐNG và hiện nó ra như một cảnh báo.
--
-- CỔNG NHẬP KHÔNG NỚI. Hàng rào chuyển từ NOT NULL sang trigger, và chỉ áp
-- khi có người thật đang thao tác (auth.uid() IS NOT NULL). Thẻ ghi mới trong
-- ứng dụng vẫn bắt buộc đủ người + hạn + ngày bắt đầu + lãnh đạo theo dõi.
--
-- ---------------------------------------------------------------------------
-- ⚠ THỨ TỰ TRIỂN KHAI — ĐỌC TRƯỚC KHI ÁP
--
-- Bỏ NOT NULL là THAY ĐỔI PHÁ VỠ với bản web đang chạy trong trình duyệt của
-- cán bộ. Ngày 03/08/2026 việc này đã làm trắng cả màn Kanban PDTD: bản cũ
-- xếp thứ tự bằng `han_xu_ly.localeCompare(...)` và ném TypeError trên null.
--
-- ĐÚNG THỨ TỰ, không đảo:
--   1. Triển khai bản web có null-guard (test chặn hồi quy đã có trong
--      src/lib/ct2.test.ts — «xếp được cả cột thẻ chưa có hạn»)
--   2. Áp migration này
--   3. Nhập dữ liệu có ô trống
-- ---------------------------------------------------------------------------
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Cho phép ô trống ở bốn trường mà board cũ thật sự không có
-- ---------------------------------------------------------------------------
ALTER TABLE public.ct2_dau_viec
  ALTER COLUMN nguoi_chiu_trach_nhiem DROP NOT NULL,
  ALTER COLUMN lanh_dao_theo_doi      DROP NOT NULL,
  ALTER COLUMN ngay_bat_dau           DROP NOT NULL,
  ALTER COLUMN han_hoan_thanh         DROP NOT NULL;

-- Hạn phải từ ngày bắt đầu trở đi — chỉ kiểm được khi có CẢ HAI mốc
ALTER TABLE public.ct2_dau_viec
  DROP CONSTRAINT IF EXISTS ct2_dv_han_hop_le;
ALTER TABLE public.ct2_dau_viec
  ADD CONSTRAINT ct2_dv_han_hop_le
  CHECK (han_hoan_thanh IS NULL OR ngay_bat_dau IS NULL OR han_hoan_thanh >= ngay_bat_dau);

-- ---------------------------------------------------------------------------
-- 2) Hàng rào chuyển sang cửa người dùng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_tao_dau_viec()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2dvi$
DECLARE
  ma_phong text;
  toi uuid := public.get_my_profile_id();
  tu_nhan_viec boolean;
BEGIN
  -- Không có người thật thao tác = nhập liệu lịch sử bằng service role.
  -- Cho ô trống đi qua; giao diện hiện mỗi ô trống thành cảnh báo vàng.
  IF auth.uid() IS NULL THEN
    NEW.han_goc := COALESCE(NEW.han_goc, NEW.han_hoan_thanh);
    RETURN NEW;
  END IF;

  -- HÀNG RÀO THẬT của cổng ghi việc. Trước đây do NOT NULL giữ; nay đặt ở đây
  -- để chỉ áp cho thẻ ghi mới, không áp cho dữ liệu lịch sử.
  IF NEW.nguoi_chiu_trach_nhiem IS NULL THEN
    RAISE EXCEPTION 'Việc ghi mới phải có người chịu trách nhiệm — đúng 01 người, không để «gán sau»';
  END IF;
  IF NEW.lanh_dao_theo_doi IS NULL THEN
    RAISE EXCEPTION 'Việc ghi mới phải có lãnh đạo theo dõi';
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
END $ct2dvi$;

REVOKE ALL ON FUNCTION public.f_ct2_truoc_tao_dau_viec() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Người thật không được XOÁ TRẮNG thông tin đã có
--
-- Nhận ô trống lúc nhập lịch sử là một chuyện; để ai đó gỡ bỏ người phụ trách
-- hay hạn đã có lại là chuyện khác. Bổ sung được, gỡ bỏ thì không.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_dv_khong_xoa_so_lieu()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $ct2dvx$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF OLD.nguoi_chiu_trach_nhiem IS NOT NULL AND NEW.nguoi_chiu_trach_nhiem IS NULL THEN
    RAISE EXCEPTION 'Không bỏ trống người chịu trách nhiệm của việc đã có chủ — đổi sang người khác thì được';
  END IF;
  IF OLD.han_hoan_thanh IS NOT NULL AND NEW.han_hoan_thanh IS NULL THEN
    RAISE EXCEPTION 'Không xoá trắng hạn hoàn thành đã có — dời hạn thì được';
  END IF;
  RETURN NEW;
END $ct2dvx$;

DROP TRIGGER IF EXISTS trg_ct2_dv_khong_xoa_so_lieu ON public.ct2_dau_viec;
CREATE TRIGGER trg_ct2_dv_khong_xoa_so_lieu
  BEFORE UPDATE ON public.ct2_dau_viec
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_dv_khong_xoa_so_lieu();

REVOKE ALL ON FUNCTION public.f_ct2_dv_khong_xoa_so_lieu() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Đếm việc còn thiếu thông tin — để lãnh đạo biết còn bao nhiêu phải bổ sung
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_dv_thieu_du_lieu(_phong uuid)
RETURNS TABLE (
  tong bigint, vo_chu bigint, thieu_han bigint,
  thieu_ngay_bat_dau bigint, thieu_lanh_dao bigint
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT count(*) AS tong,
         count(*) FILTER (WHERE d.nguoi_chiu_trach_nhiem IS NULL) AS vo_chu,
         count(*) FILTER (
           WHERE d.han_hoan_thanh IS NULL AND d.loai_dau_viec <> 'THUONG_TRUC'
         ) AS thieu_han,
         count(*) FILTER (WHERE d.ngay_bat_dau IS NULL) AS thieu_ngay_bat_dau,
         count(*) FILTER (WHERE d.lanh_dao_theo_doi IS NULL) AS thieu_lanh_dao
    FROM public.ct2_dau_viec d
   WHERE d.phong = _phong
     AND d.trang_thai NOT IN ('DA_DONG','DUNG_HUY')
$$;

REVOKE ALL ON FUNCTION public.ct2_dv_thieu_du_lieu(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_dv_thieu_du_lieu(uuid) TO authenticated;

COMMENT ON COLUMN public.ct2_dau_viec.nguoi_chiu_trach_nhiem IS
  'NULL chỉ xuất hiện ở thẻ nhập từ dữ liệu lịch sử (board Miro có thẻ vô chủ). Việc ghi mới trong ứng dụng luôn bắt buộc có, do trigger f_ct2_truoc_tao_dau_viec chặn.';
COMMENT ON COLUMN public.ct2_dau_viec.han_hoan_thanh IS
  'NULL chỉ xuất hiện ở thẻ nhập từ dữ liệu lịch sử. Việc ghi mới bắt buộc có hạn.';

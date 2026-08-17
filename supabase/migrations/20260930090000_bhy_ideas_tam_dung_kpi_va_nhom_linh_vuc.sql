-- ============================================================================
-- BHY Ideas — TẠM DỪNG ÁP KPI + NHÓM LĨNH VỰC CHO Ý TƯỞNG
--
-- Chỉ đạo 08/2026: "tính năng liên quan tới KPI tạm thời chưa áp để tập trung
-- vào việc sáng tạo và xác định nhóm cho Ideas."
--
-- 1) TẠM DỪNG KPI bằng CÔNG TẮC, không gỡ cấu trúc.
--    Cột ghi_nhan_kpi, hàm tính chỉ tiêu, chỉ báo khoán gọn đều giữ nguyên; chỉ
--    thêm cờ dang_ap_kpi = false để:
--      - trần 02 ý tưởng/tuần/phòng KHÔNG chặn nữa (ghi nhận thoải mái),
--      - giao diện bỏ ngôn ngữ «tính KPI», «hạn mức» → nói ghi nhận và vinh danh.
--    Sổ vẫn ghi đủ, nên bật lại lúc nào cũng có số liệu, không mất gì.
--
--    Đây cũng chính là hướng đã nêu ở docs/tong-the-bhy-ideas-va-van-de-can-quyet:
--    trần ghi nhận là thứ bóp nghẹt phong trào, còn ngân sách thì kiểm soát ở
--    khâu xét thưởng chứ không phải khâu ghi nhận.
--
-- 2) NHÓM LĨNH VỰC — trục phân loại thứ tư, trả lời câu «sáng tạo về chuyện gì»
--    mà ba trục cũ (cấp đề xuất, phạm vi áp dụng, cấp độ phát triển) không nói.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Công tắc tạm dừng KPI
-- ---------------------------------------------------------------------------
ALTER TABLE public.bhy_ideas_cau_hinh
  ADD COLUMN IF NOT EXISTS dang_ap_kpi BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bhy_ideas_cau_hinh.dang_ap_kpi IS
  'false = tạm dừng áp KPI: trần Ươm mầm mỗi tuần không chặn, giao diện bỏ ngôn ngữ KPI. Sổ vẫn ghi đủ nên bật lại là có ngay số liệu.';

-- Đang tạm dừng theo chỉ đạo 08/2026
UPDATE public.bhy_ideas_cau_hinh SET dang_ap_kpi = false;

-- Hàm đọc cấu hình phải tạo lại vì kiểu trả về (chính là kiểu bảng) đã đổi
DROP FUNCTION IF EXISTS public.bhy_ideas_cau_hinh();

CREATE OR REPLACE FUNCTION public.bhy_ideas_cau_hinh()
RETURNS public.bhy_ideas_cau_hinh
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT c FROM public.bhy_ideas_cau_hinh c LIMIT 1),
    ROW(true, 'tcth', 2, NULL, now(), false)::public.bhy_ideas_cau_hinh
  )
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_cau_hinh() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_cau_hinh() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Trần Ươm mầm chỉ chặn KHI ĐANG ÁP KPI.
--
--    Trần tồn tại là để KPI đo đúng hạn mức quy chế. Không áp KPI thì trần mất
--    lý do tồn tại — giữ nó lúc này chỉ chặn phong trào mà không phục vụ ai.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_pia_gac_han_muc_uom_mam()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_dem integer;
  v_tran integer;
  v_ch public.bhy_ideas_cau_hinh;
BEGIN
  IF NEW.cap_do <> 'Ươm mầm' OR NOT NEW.ghi_nhan_kpi OR NOT NEW.duyet_cn THEN
    RETURN NEW;
  END IF;

  v_ch := public.bhy_ideas_cau_hinh();

  -- Đang tạm dừng KPI: ghi nhận thoải mái, không đếm trần
  IF NOT v_ch.dang_ap_kpi THEN
    RETURN NEW;
  END IF;

  v_tran := v_ch.tran_uom_mam_moi_tuan;

  SELECT count(*) INTO v_dem
  FROM public.portal_idea_awards a
  WHERE a.cap_do = 'Ươm mầm'
    AND a.ghi_nhan_kpi
    AND a.duyet_cn
    AND a.phong = NEW.phong
    AND a.tuan_chon = NEW.tuan_chon
    AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_dem >= v_tran THEN
    RAISE EXCEPTION 'Phòng % đã dùng hết hạn mức % ý tưởng Ươm mầm của tuần % — bỏ chọn một ý tưởng khác trước khi chọn ý tưởng này',
      NEW.phong, to_char(v_tran, 'FM00'), to_char(NEW.tuan_chon, 'DD/MM/YYYY');
  END IF;
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Nhóm lĩnh vực của ý tưởng
--
--    Không đặt NOT NULL: 134 ý tưởng cũ chưa ai phân nhóm, ép cứng thì phải
--    đoán hộ cán bộ. Để trống nghĩa là «chưa phân nhóm» và hiện rõ trên màn để
--    TCTH gắn dần.
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_ideas
  ADD COLUMN IF NOT EXISTS linh_vuc TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'linh_vuc_hop_le') THEN
    ALTER TABLE public.portal_ideas
      ADD CONSTRAINT linh_vuc_hop_le CHECK (
        linh_vuc IS NULL OR linh_vuc IN (
          'Quy trình nghiệp vụ', 'Công nghệ số & AI', 'Trải nghiệm khách hàng',
          'Tiết giảm chi phí', 'An toàn & tuân thủ', 'Quản trị nội bộ', 'Khác'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.portal_ideas.linh_vuc IS
  'Nhóm lĩnh vực — sáng tạo về chuyện gì. Khác cấp đề xuất (nơi duyệt), phạm vi áp dụng (ảnh hưởng tới đâu) và cấp độ phát triển (đi được bao xa). NULL = chưa phân nhóm.';

CREATE INDEX IF NOT EXISTS idx_portal_ideas_linh_vuc
  ON public.portal_ideas (linh_vuc) WHERE linh_vuc IS NOT NULL;

-- Người gửi tự chọn nhóm cho ý tưởng của mình, nên linh_vuc KHÔNG nằm trong
-- danh sách cột quản trị bị trigger chặn — chủ phiếu sửa được như phần chữ.

-- ---------------------------------------------------------------------------
-- 4) Bức tranh sáng tạo theo nhóm — mảng nào mạnh, mảng nào bỏ trống.
--
--    Trả về ĐỦ 7 nhóm kể cả nhóm chưa có ý tưởng nào: nhóm trống mới là thông
--    tin đáng giá nhất, vì đó là chỗ cần phát động tiếp. Truy vấn thường chỉ
--    trả nhóm có dữ liệu nên nhìn vào tưởng đâu mọi mảng đều có người làm.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_buc_tranh_linh_vuc()
RETURNS TABLE (
  linh_vuc text,
  so_y_tuong integer,
  so_phong integer,
  uom_mam integer,
  ben_re integer,
  vuon_canh integer,
  lan_toa integer,
  moi_nhat timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    nhom.ten,
    count(i.id)::int,
    count(DISTINCT i.department_name)::int,
    count(i.id) FILTER (WHERE i.development_level = 'Ươm mầm')::int,
    count(i.id) FILTER (WHERE i.development_level = 'Bén rễ')::int,
    count(i.id) FILTER (WHERE i.development_level = 'Vươn cành')::int,
    count(i.id) FILTER (WHERE i.development_level = 'Lan tỏa')::int,
    max(i.created_at)
  FROM unnest(ARRAY[
    'Quy trình nghiệp vụ', 'Công nghệ số & AI', 'Trải nghiệm khách hàng',
    'Tiết giảm chi phí', 'An toàn & tuân thủ', 'Quản trị nội bộ', 'Khác'
  ]) AS nhom(ten)
  LEFT JOIN public.portal_ideas i ON i.linh_vuc = nhom.ten
  WHERE public.is_staff(auth.uid())
  GROUP BY nhom.ten
  ORDER BY count(i.id) DESC, nhom.ten
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_buc_tranh_linh_vuc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_buc_tranh_linh_vuc() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) TCTH gắn nhóm cho ý tưởng cũ.
--
--    Chủ phiếu sửa nhóm ý tưởng của mình qua form bình thường; hàm này để TCTH
--    phân nhóm hàng loạt cho 134 ý tưởng đã có mà không phải mượn tài khoản ai.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_dat_linh_vuc(_idea_id uuid, _linh_vuc text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng TCTH / Quản trị hệ thống được phân nhóm hàng loạt';
  END IF;

  UPDATE public.portal_ideas
  SET linh_vuc = nullif(btrim(coalesce(_linh_vuc, '')), '')
  WHERE id = _idea_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  RETURN jsonb_build_object('ok', true, 'linh_vuc', _linh_vuc);
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_dat_linh_vuc(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_dat_linh_vuc(uuid, text) TO authenticated, service_role;

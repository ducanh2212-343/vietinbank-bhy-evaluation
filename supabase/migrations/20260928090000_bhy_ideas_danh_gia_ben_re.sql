-- ============================================================================
-- BHY Ideas — PHIẾU ĐÁNH GIÁ THAM KHẢO CẤP BÉN RỄ
--
-- Trước đây Phòng TCTH trình Giám đốc bằng một ô ghi chú tự do, Giám đốc duyệt
-- cũng bằng một ô ghi chú. Không có gì để hai bên đối chiếu, và không lưu lại
-- được vì sao một ý tưởng được trình hay bị từ chối.
--
-- Nay mỗi bên có một PHIẾU 5 CÂU, thang 0–2, tối đa 10 điểm:
--   Đ1 Vấn đề có thật · Đ2 Giải pháp đủ rõ để làm thử ·
--   Đ3 Làm được bằng nguồn lực sẵn có · Đ4 Không tạo rủi ro mới (điều kiện chặn) ·
--   Đ5 Có ích cho ít nhất một bộ phận
--
-- Thang này CỐ Ý THẤP HƠN Phụ lục 06 của Hội đồng (5 tiêu chí × 1–5, ngưỡng
-- 3,5/4,0) vì quy chế đặt điều kiện Bén rễ là "có KHẢ NĂNG thử nghiệm", chưa
-- đòi bằng chứng kết quả như Vươn cành và Lan tỏa.
--
-- ⚠️ ĐÂY LÀ PHIẾU THAM KHẢO, KHÔNG PHẢI BỘ GÁC. Cơ sở dữ liệu lưu và tính
-- điểm, nhưng KHÔNG chặn theo điểm: TCTH vẫn trình được ý tưởng điểm thấp nếu
-- có lý do, Giám đốc vẫn duyệt hay từ chối theo thẩm quyền. Bản tính điểm phía
-- giao diện nằm ở src/lib/ideaBenRe.ts, hai bên dùng chung quy tắc.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Chỗ lưu phiếu trên chính dòng sổ Bén rễ
--
--    Đặt trên portal_idea_awards chứ không lập bảng riêng vì quan hệ đúng là
--    1–1: mỗi ý tưởng có một hồ sơ trình Bén rễ, hồ sơ đó có phiếu của TCTH và
--    phiếu của Giám đốc. Lập bảng riêng chỉ thêm một phép nối cho mọi truy vấn.
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_idea_awards
  ADD COLUMN IF NOT EXISTS danh_gia_tcth JSONB,
  ADD COLUMN IF NOT EXISTS diem_tcth SMALLINT,
  ADD COLUMN IF NOT EXISTS danh_gia_gd JSONB,
  ADD COLUMN IF NOT EXISTS diem_gd SMALLINT;

COMMENT ON COLUMN public.portal_idea_awards.danh_gia_tcth IS
  'Phiếu đánh giá tham khảo của Phòng TCTH khi trình: {d1..d5: 0-2, ghi_chu}. Tham khảo, không gác điều kiện.';
COMMENT ON COLUMN public.portal_idea_awards.danh_gia_gd IS
  'Phiếu đánh giá tham khảo của Giám đốc khi duyệt — cùng bộ câu hỏi với TCTH để hai bên đối chiếu.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diem_danh_gia_trong_thang') THEN
    ALTER TABLE public.portal_idea_awards
      ADD CONSTRAINT diem_danh_gia_trong_thang CHECK (
        (diem_tcth IS NULL OR diem_tcth BETWEEN 0 AND 10)
        AND (diem_gd IS NULL OR diem_gd BETWEEN 0 AND 10)
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Tính tổng điểm từ phiếu JSONB.
--
--    CSDL tự tính chứ không nhận điểm do máy khách gửi lên: điểm là thứ hiện
--    trên báo cáo trình Giám đốc, để máy khách khai thì sửa được bằng tay.
--    Câu ngoài thang bị kẹp về 0–2, câu chưa chấm tính 0 — cùng quy tắc với
--    hàm chamPhieuBenRe của giao diện.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_diem_danh_gia(_phieu jsonb)
RETURNS smallint
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN _phieu IS NULL OR jsonb_typeof(_phieu) <> 'object' THEN NULL
    ELSE (
      SELECT coalesce(sum(least(2, greatest(0, coalesce((_phieu ->> ma)::numeric, 0))))::smallint, 0)
      FROM unnest(ARRAY['d1','d2','d3','d4','d5']) AS ma
    )
  END
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_diem_danh_gia(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_diem_danh_gia(jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) TCTH trình kèm phiếu đánh giá.
--
--    Phải DROP bản cũ trước: thêm tham số có giá trị mặc định sẽ tạo NẠP CHỒNG
--    chứ không thay thế, và lời gọi hai tham số khi đó trở nên nhập nhằng giữa
--    hai bản — PostgREST trả lỗi "function is not unique".
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.bhy_ideas_trinh_ben_re(uuid, text);

CREATE OR REPLACE FUNCTION public.bhy_ideas_trinh_ben_re(
  _idea_id uuid,
  _ghi_chu text DEFAULT NULL,
  _danh_gia jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_da_ghi_nhan boolean;
  v_diem smallint;
  v_n integer;
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổ chức tổng hợp trình Giám đốc công nhận cấp Bén rễ';
  END IF;

  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.portal_idea_awards
    WHERE idea_id = _idea_id AND cap_do = 'Bén rễ' AND trang_thai = 'da_ghi_nhan'
  ) INTO v_da_ghi_nhan;

  IF v_da_ghi_nhan THEN
    RETURN jsonb_build_object('ok', true, 'da_ghi_nhan', true, 'trinh_moi', false);
  END IF;

  v_diem := public.bhy_ideas_diem_danh_gia(_danh_gia);

  INSERT INTO public.portal_idea_awards
    (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, duyet_tsc, phong,
     muc_thuong, ly_do_thuong, trang_thai, ghi_chu, danh_gia_tcth, diem_tcth)
  VALUES
    (_idea_id, 'Bén rễ', false, false, false, v_idea.department_name,
     0, 'khong_chi', 'cho_gd_duyet', nullif(btrim(coalesce(_ghi_chu, '')), ''),
     _danh_gia, v_diem)
  ON CONFLICT (idea_id, cap_do) DO UPDATE
    SET trang_thai = 'cho_gd_duyet',
        ghi_chu = COALESCE(
          nullif(btrim(coalesce(_ghi_chu, '')), ''), public.portal_idea_awards.ghi_chu),
        danh_gia_tcth = COALESCE(_danh_gia, public.portal_idea_awards.danh_gia_tcth),
        diem_tcth = COALESCE(v_diem, public.portal_idea_awards.diem_tcth),
        nguoi_ghi_nhan = auth.uid(),
        -- Trình lại hồ sơ ĐANG chờ thì giữ nguyên mốc trình đầu tiên: số ngày
        -- chờ là thước đo để đôn đốc, bấm lại nút không được xóa nó đi
        ghi_nhan_luc = CASE
          WHEN public.portal_idea_awards.trang_thai = 'cho_gd_duyet'
            THEN public.portal_idea_awards.ghi_nhan_luc
          ELSE now()
        END,
        -- Trình lại sau khi bị từ chối thì xóa phiếu cũ của Giám đốc, tránh
        -- hiển thị ý kiến của lần duyệt trước như thể vừa mới cho
        danh_gia_gd = CASE
          WHEN public.portal_idea_awards.trang_thai = 'tu_choi' THEN NULL
          ELSE public.portal_idea_awards.danh_gia_gd
        END,
        diem_gd = CASE
          WHEN public.portal_idea_awards.trang_thai = 'tu_choi' THEN NULL
          ELSE public.portal_idea_awards.diem_gd
        END,
        nguoi_duyet = NULL,
        duyet_luc = NULL
    WHERE public.portal_idea_awards.trang_thai <> 'da_ghi_nhan';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object(
    'ok', true, 'da_ghi_nhan', false, 'trinh_moi', v_n > 0, 'diem_tcth', v_diem
  );
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_trinh_ben_re(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_trinh_ben_re(uuid, text, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Giám đốc duyệt kèm phiếu đánh giá của mình
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.bhy_ideas_gd_duyet_ben_re(uuid, boolean, text);

CREATE OR REPLACE FUNCTION public.bhy_ideas_gd_duyet_ben_re(
  _idea_id uuid,
  _dong_y boolean,
  _ghi_chu text DEFAULT NULL,
  _danh_gia jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award public.portal_idea_awards%ROWTYPE;
  v_don_gia integer := 300000;
  v_luy_ke integer := 0;
  v_diem smallint;
BEGIN
  IF NOT public.bhy_ideas_la_giam_doc() THEN
    RAISE EXCEPTION 'Chỉ Giám đốc chi nhánh phê duyệt cấp Bén rễ';
  END IF;

  SELECT * INTO v_award
  FROM public.portal_idea_awards
  WHERE idea_id = _idea_id AND cap_do = 'Bén rễ';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ý tưởng này chưa được Phòng TCTH trình xin công nhận Bén rễ';
  END IF;
  IF v_award.trang_thai <> 'cho_gd_duyet' THEN
    RAISE EXCEPTION 'Ý tưởng không còn ở trạng thái chờ duyệt (hiện: %)', v_award.trang_thai;
  END IF;

  v_diem := public.bhy_ideas_diem_danh_gia(_danh_gia);

  IF _dong_y THEN
    UPDATE public.portal_idea_awards
    SET trang_thai = 'da_ghi_nhan',
        ghi_nhan_kpi = true,
        duyet_cn = true,
        muc_thuong = GREATEST(muc_thuong, v_don_gia),
        ly_do_thuong = 'trong_han_muc',
        nguoi_duyet = auth.uid(),
        duyet_luc = now(),
        danh_gia_gd = COALESCE(_danh_gia, danh_gia_gd),
        diem_gd = COALESCE(v_diem, diem_gd),
        ghi_chu = COALESCE(nullif(btrim(coalesce(_ghi_chu, '')), ''), ghi_chu)
    WHERE id = v_award.id;

    v_luy_ke := public.bhy_ideas_thuong_luy_ke(_idea_id, 'Bén rễ');

    PERFORM set_config('bhy.ideas_ghi_so', 'on', true);
    UPDATE public.portal_ideas
    SET development_level = 'Bén rễ'
    WHERE id = _idea_id AND development_level = 'Ươm mầm';
    PERFORM set_config('bhy.ideas_ghi_so', 'off', true);
  ELSE
    UPDATE public.portal_idea_awards
    SET trang_thai = 'tu_choi',
        ghi_nhan_kpi = false,
        duyet_cn = false,
        muc_thuong = 0,
        ly_do_thuong = 'khong_chi',
        nguoi_duyet = auth.uid(),
        duyet_luc = now(),
        danh_gia_gd = COALESCE(_danh_gia, danh_gia_gd),
        diem_gd = COALESCE(v_diem, diem_gd),
        ghi_chu = COALESCE(nullif(btrim(coalesce(_ghi_chu, '')), ''), ghi_chu)
    WHERE id = v_award.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'dong_y', _dong_y,
    'muc_thuong', CASE WHEN _dong_y THEN v_don_gia ELSE 0 END,
    'thuong_luy_ke', v_luy_ke,
    'diem_gd', v_diem
  );
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_gd_duyet_ben_re(uuid, boolean, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_gd_duyet_ben_re(uuid, boolean, text, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Hàng chờ của Giám đốc — trả kèm PHIẾU ĐÁNH GIÁ CỦA TCTH.
--
--    Đây chính là "báo cáo trình Giám đốc": mở màn duyệt là thấy đủ nội dung ý
--    tưởng, điểm TCTH chấm và ý kiến TCTH, không phải mở thêm chỗ nào.
--    Đổi kiểu trả về nên phải DROP trước, CREATE OR REPLACE không làm được.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.bhy_ideas_viec_cua_giam_doc();

CREATE OR REPLACE FUNCTION public.bhy_ideas_viec_cua_giam_doc()
RETURNS TABLE (
  idea_id uuid,
  title text,
  proposer text,
  expected_benefits text,
  current_status text,
  proposed_solution text,
  phong text,
  created_at timestamptz,
  trinh_luc timestamptz,
  nguoi_trinh text,
  ghi_chu text,
  so_ngay_cho integer,
  danh_gia_tcth jsonb,
  diem_tcth smallint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.title, i.proposer, i.expected_benefits, i.current_status, i.proposed_solution,
    a.phong, i.created_at,
    a.ghi_nhan_luc,
    (SELECT p.full_name FROM public.profiles p WHERE p.user_id = a.nguoi_ghi_nhan LIMIT 1),
    a.ghi_chu,
    GREATEST(0, EXTRACT(DAY FROM (now() - a.ghi_nhan_luc))::int),
    a.danh_gia_tcth,
    a.diem_tcth
  FROM public.portal_idea_awards a
  JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE a.trang_thai = 'cho_gd_duyet'
    AND a.cap_do = 'Bén rễ'
    AND public.is_staff(auth.uid())
  ORDER BY a.ghi_nhan_luc
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_viec_cua_giam_doc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_viec_cua_giam_doc() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Danh sách ứng viên để TCTH chọn mà đánh giá.
--
--    Ý tưởng chưa đạt Bén rễ và chưa nằm trong hàng chờ. Kèm sẵn nội dung phiếu
--    để TCTH chấm ngay trên màn, khỏi mở từng ý tưởng ở bảng theo dõi.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_ung_vien_ben_re()
RETURNS TABLE (
  idea_id uuid,
  title text,
  proposer text,
  phong text,
  current_status text,
  proposed_solution text,
  expected_benefits text,
  created_at timestamptz,
  development_level text,
  smp_trang_thai text,
  da_tung_tu_choi boolean,
  danh_gia_tcth jsonb,
  diem_tcth smallint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.title, i.proposer, i.department_name,
    i.current_status, i.proposed_solution, i.expected_benefits,
    i.created_at, i.development_level, i.smp_trang_thai,
    coalesce(a.trang_thai = 'tu_choi', false),
    a.danh_gia_tcth,
    a.diem_tcth
  FROM public.portal_ideas i
  LEFT JOIN public.portal_idea_awards a
    ON a.idea_id = i.id AND a.cap_do = 'Bén rễ'
  WHERE public.is_content_admin(auth.uid())
    -- Chưa được công nhận Bén rễ và không đang chờ Giám đốc
    AND coalesce(a.trang_thai, 'chua_co') NOT IN ('da_ghi_nhan', 'cho_gd_duyet')
  ORDER BY i.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_ung_vien_ben_re() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_ung_vien_ben_re() TO authenticated, service_role;

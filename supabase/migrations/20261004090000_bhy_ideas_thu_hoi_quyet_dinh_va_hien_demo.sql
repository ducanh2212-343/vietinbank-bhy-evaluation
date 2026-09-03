-- ============================================================================
-- BHY Ideas — THU HỒI QUYẾT ĐỊNH BÉN RỄ, HIỆN DEMO, SỬA ĐIỂM 0 GIẢ
--
-- Ba việc từ vận hành 03/09/2026 (Giám đốc + Phòng TCTH), cộng hai lỗi phát
-- hiện khi rà lại logic:
--
--   1. THU HỒI: Giám đốc ấn nhầm «Công nhận» cho một hồ sơ (ghi chú đi kèm đọc
--      như lời từ chối). Sổ không có đường lùi: dòng đã da_ghi_nhan, KPI đã
--      cộng, 300.000đ đã cam kết, cấp độ ý tưởng đã nhảy. Nay có
--      bhy_ideas_gd_thu_hoi_ben_re: đưa hồ sơ VỀ ĐÚNG TRẠNG THÁI TRƯỚC CÚ BẤM
--      (hàng chờ), gỡ KPI, gỡ tiền, trả cấp độ, gỡ cả tiền lũy kế cấp dưới do
--      cú bấm sinh ra — và ghi vết ai thu hồi, lúc nào, vì sao. Không xóa gì.
--      Phòng TCTH cũng rút được hồ sơ mình trình nhầm (bhy_ideas_rut_ho_so_ben_re).
--
--   2. DEMO: cán bộ đã khai «có demo hay không» ngay lúc gửi, nhưng hai màn
--      đánh giá và duyệt không đưa cột đó ra — TCTH và Giám đốc phải quay về
--      bảng tra cứu xem lại từng ý tưởng. Hai hàm danh sách nay trả has_demo.
--
--   3. ĐIỂM 0 GIẢ: bhy_ideas_diem_danh_gia trả 0 khi phiếu KHÔNG có câu nào
--      được chấm (chỉ có ô ý kiến). Bốn hồ sơ Giám đốc đang mang «điểm Giám
--      đốc 0/10» dù Giám đốc chỉ ghi ý kiến — đọc lên như Giám đốc chấm rớt
--      rồi vẫn duyệt. Hàm nay trả NULL khi chưa chấm câu nào; sửa lại dữ liệu.
--
--   4. Ý KIẾN GIÁM ĐỐC ĐÈ LỜI TRÌNH: bhy_ideas_gd_duyet_ben_re ghi ý kiến Giám
--      đốc vào chính cột ghi_chu của TCTH — lời trình của TCTH mất. Tách ra
--      cột y_kien_gd riêng.
--
--   5. ĐƯỜNG TSC KHÔNG LÙI ĐƯỢC: bhy_ideas_cap_nhat_smp chuyển dong_y →
--      trạng thái khác thì dòng Bén rễ TSC vẫn nằm nguyên (KPI + tiền). Nay
--      đảo ngược đúng phần TSC, giữ nguyên phần Chi nhánh nếu Chi nhánh cũng
--      đã duyệt.
--
-- Đổi kiểu trả về của hai hàm danh sách nên phải DROP rồi tạo lại.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Cột dấu vết thu hồi và ý kiến Giám đốc
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_idea_awards
  -- Cấp độ của ý tưởng NGAY TRƯỚC khi Giám đốc duyệt — để thu hồi trả về đúng
  -- chỗ cũ thay vì đoán
  ADD COLUMN IF NOT EXISTS cap_do_truoc text,
  -- Ý kiến chỉ đạo của Giám đốc, tách khỏi ghi_chu (lời trình của TCTH)
  ADD COLUMN IF NOT EXISTS y_kien_gd text,
  ADD COLUMN IF NOT EXISTS thu_hoi_luc timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_thu_hoi uuid,
  ADD COLUMN IF NOT EXISTS ly_do_thu_hoi text,
  ADD COLUMN IF NOT EXISTS so_lan_thu_hoi smallint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.portal_idea_awards.cap_do_truoc IS
  'development_level của ý tưởng ngay trước khi Giám đốc công nhận — thu hồi thì trả về đây';
COMMENT ON COLUMN public.portal_idea_awards.y_kien_gd IS
  'Ý kiến chỉ đạo của Giám đốc khi duyệt/từ chối; ghi_chu là lời trình của TCTH';

-- Trạng thái mới: thu_hoi = hồ sơ đã rút khỏi hàng chờ (chưa từng được công nhận)
ALTER TABLE public.portal_idea_awards DROP CONSTRAINT IF EXISTS portal_idea_awards_trang_thai_check;
ALTER TABLE public.portal_idea_awards
  ADD CONSTRAINT portal_idea_awards_trang_thai_check
  CHECK (trang_thai IN ('cho_gd_duyet', 'da_ghi_nhan', 'tu_choi', 'thu_hoi'));

-- ---------------------------------------------------------------------------
-- 2) Điểm phiếu: chưa chấm câu nào thì KHÔNG có điểm, không phải 0 điểm
--
--    Bản cũ coalesce từng câu thiếu thành 0 rồi cộng — phiếu chỉ có ô ý kiến
--    ra đúng 0/10. Với thang 0–2 thì 0 là «không đạt» ở mọi câu, khác hẳn
--    «chưa chấm». Giám đốc viết một dòng chỉ đạo rồi duyệt mà sổ ghi 0/10.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_diem_danh_gia(_phieu jsonb)
RETURNS smallint
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN _phieu IS NULL OR jsonb_typeof(_phieu) <> 'object' THEN NULL
    WHEN NOT (_phieu ?| ARRAY['d1','d2','d3','d4','d5']) THEN NULL
    ELSE (
      SELECT sum(least(2, greatest(0, coalesce((_phieu ->> ma)::numeric, 0))))::smallint
      FROM unnest(ARRAY['d1','d2','d3','d4','d5']) AS ma
    )
  END
$$;

-- Sửa dữ liệu: điểm 0 mà phiếu không có câu nào → về NULL (cả hai phía)
UPDATE public.portal_idea_awards
SET diem_gd = NULL
WHERE diem_gd = 0 AND (danh_gia_gd IS NULL OR NOT (danh_gia_gd ?| ARRAY['d1','d2','d3','d4','d5']));

UPDATE public.portal_idea_awards
SET diem_tcth = NULL
WHERE diem_tcth = 0 AND (danh_gia_tcth IS NULL OR NOT (danh_gia_tcth ?| ARRAY['d1','d2','d3','d4','d5']));

-- ---------------------------------------------------------------------------
-- 3) Gỡ thưởng lũy kế do một lần công nhận sinh ra — dùng chung cho thu hồi
--    đường Chi nhánh và đường TSC
--
--    Chỉ gỡ dòng THUẦN lũy kế: mang đúng ghi chú của bhy_ideas_thuong_luy_ke
--    và không có nguồn duyệt nào (không CN, không TSC, không KPI). Dòng Ươm mầm
--    do TCTH chốt thật hay dòng thưởng hồi tố 16/08 KHÔNG mang dấu đó nên
--    không bị đụng — tiền hồi tố là tiền của cán bộ, không phải hệ quả cú bấm.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_thu_hoi_luy_ke(_idea_id uuid, _cap_moi text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tong integer := 0;
BEGIN
  WITH xoa AS (
    DELETE FROM public.portal_idea_awards
    WHERE idea_id = _idea_id
      AND cap_do <> _cap_moi
      AND ghi_chu = 'Thưởng lũy kế khi công nhận cấp ' || _cap_moi
      AND NOT duyet_cn AND NOT duyet_tsc AND NOT ghi_nhan_kpi
    RETURNING muc_thuong
  )
  SELECT coalesce(sum(muc_thuong), 0) INTO v_tong FROM xoa;
  RETURN v_tong;
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_thu_hoi_luy_ke(uuid, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Giám đốc duyệt — nhớ cấp độ trước khi duyệt, ý kiến ghi cột riêng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_gd_duyet_ben_re(
  _idea_id uuid, _dong_y boolean, _ghi_chu text DEFAULT NULL, _danh_gia jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award public.portal_idea_awards%ROWTYPE;
  v_idea public.portal_ideas%ROWTYPE;
  v_don_gia integer := 300000;
  v_luy_ke integer := 0;
  v_diem smallint;
  v_y_kien text := nullif(btrim(coalesce(_ghi_chu, '')), '');
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

  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
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
        y_kien_gd = COALESCE(v_y_kien, y_kien_gd),
        cap_do_truoc = v_idea.development_level
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
        y_kien_gd = COALESCE(v_y_kien, y_kien_gd)
    WHERE id = v_award.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'dong_y', _dong_y,
    'muc_thuong', CASE WHEN _dong_y THEN v_don_gia ELSE 0 END,
    'thuong_luy_ke', v_luy_ke,
    'diem_gd', v_diem
  );
END $$;

-- ---------------------------------------------------------------------------
-- 5) Giám đốc THU HỒI quyết định của mình — về lại hàng chờ
--
--    Đảo ngược đúng cú bấm: đã công nhận thì gỡ KPI, gỡ tiền, trả cấp độ, gỡ
--    lũy kế; đã từ chối thì chỉ mở lại hàng chờ. Hai hướng đều về
--    'cho_gd_duyet' — phiếu của TCTH còn nguyên, phiếu của Giám đốc xóa để
--    lần quyết sau không lẫn phiếu cũ. Bắt buộc có lý do: thu hồi là việc
--    phải giải trình được, không phải nút hoàn tác.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_gd_thu_hoi_ben_re(_idea_id uuid, _ly_do text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award public.portal_idea_awards%ROWTYPE;
  v_ly_do text := nullif(btrim(coalesce(_ly_do, '')), '');
  v_cap_ve text;
  v_tien_go integer := 0;
  v_luy_ke_go integer := 0;
  v_tu_trang_thai text;
BEGIN
  IF NOT public.bhy_ideas_la_giam_doc() THEN
    RAISE EXCEPTION 'Chỉ Giám đốc chi nhánh thu hồi được quyết định phê duyệt Bén rễ';
  END IF;
  IF v_ly_do IS NULL THEN
    RAISE EXCEPTION 'Cần ghi lý do thu hồi để có căn cứ giải trình';
  END IF;

  SELECT * INTO v_award
  FROM public.portal_idea_awards
  WHERE idea_id = _idea_id AND cap_do = 'Bén rễ';
  IF NOT FOUND OR v_award.nguoi_duyet IS NULL
     OR v_award.trang_thai NOT IN ('da_ghi_nhan', 'tu_choi') THEN
    RAISE EXCEPTION 'Hồ sơ này không có quyết định của Giám đốc để thu hồi';
  END IF;
  IF v_award.trang_thai = 'da_ghi_nhan' AND v_award.duyet_tsc THEN
    RAISE EXCEPTION 'Ý tưởng này còn được Trụ sở chính công nhận trên SMP — thu hồi phần Chi nhánh không đổi kết quả; sửa ở màn Đối chiếu SMP';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.portal_idea_awards
    WHERE idea_id = _idea_id AND cap_do IN ('Vươn cành', 'Lan tỏa') AND trang_thai = 'da_ghi_nhan'
  ) THEN
    RAISE EXCEPTION 'Ý tưởng đã lên cấp cao hơn qua Hội đồng — không thu hồi cấp Bén rễ được nữa';
  END IF;

  v_tu_trang_thai := v_award.trang_thai;

  IF v_award.trang_thai = 'da_ghi_nhan' THEN
    v_tien_go := v_award.muc_thuong;
    v_cap_ve := COALESCE(v_award.cap_do_truoc, 'Ươm mầm');
    v_luy_ke_go := public.bhy_ideas_thu_hoi_luy_ke(_idea_id, 'Bén rễ');

    PERFORM set_config('bhy.ideas_ghi_so', 'on', true);
    UPDATE public.portal_ideas
    SET development_level = v_cap_ve
    WHERE id = _idea_id AND development_level = 'Bén rễ';
    PERFORM set_config('bhy.ideas_ghi_so', 'off', true);
  END IF;

  UPDATE public.portal_idea_awards
  SET trang_thai = 'cho_gd_duyet',
      ghi_nhan_kpi = false,
      duyet_cn = false,
      muc_thuong = 0,
      ly_do_thuong = 'khong_chi',
      nguoi_duyet = NULL,
      duyet_luc = NULL,
      danh_gia_gd = NULL,
      diem_gd = NULL,
      y_kien_gd = NULL,
      thu_hoi_luc = now(),
      nguoi_thu_hoi = auth.uid(),
      ly_do_thu_hoi = v_ly_do,
      so_lan_thu_hoi = so_lan_thu_hoi + 1
  WHERE id = v_award.id;

  RETURN jsonb_build_object(
    'ok', true,
    'tu_trang_thai', v_tu_trang_thai,
    've_trang_thai', 'cho_gd_duyet',
    'cap_do_ve', v_cap_ve,
    'tien_go', v_tien_go,
    'luy_ke_go', v_luy_ke_go
  );
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_gd_thu_hoi_ben_re(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_gd_thu_hoi_ben_re(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Phòng TCTH RÚT hồ sơ đang chờ Giám đốc
--
--    Chỉ áp cho hồ sơ CHƯA có quyết định. Phiếu chấm giữ nguyên để trình lại
--    không phải chấm từ đầu; ý tưởng quay về danh sách ứng viên.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_rut_ho_so_ben_re(_idea_id uuid, _ly_do text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ly_do text := nullif(btrim(coalesce(_ly_do, '')), '');
  v_n integer;
BEGIN
  IF NOT (public.is_content_admin(auth.uid()) OR public.bhy_ideas_la_giam_doc()) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổ chức tổng hợp hoặc Giám đốc rút được hồ sơ';
  END IF;
  IF v_ly_do IS NULL THEN
    RAISE EXCEPTION 'Cần ghi lý do rút hồ sơ';
  END IF;

  UPDATE public.portal_idea_awards
  SET trang_thai = 'thu_hoi',
      thu_hoi_luc = now(),
      nguoi_thu_hoi = auth.uid(),
      ly_do_thu_hoi = v_ly_do,
      so_lan_thu_hoi = so_lan_thu_hoi + 1
  WHERE idea_id = _idea_id AND cap_do = 'Bén rễ' AND trang_thai = 'cho_gd_duyet';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'Hồ sơ không ở trạng thái chờ Giám đốc nên không rút được';
  END IF;

  RETURN jsonb_build_object('ok', true, 've_trang_thai', 'thu_hoi');
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_rut_ho_so_ben_re(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_rut_ho_so_ben_re(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) TCTH trình — trình lại sau thu hồi/từ chối thì xóa cả ý kiến Giám đốc cũ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_trinh_ben_re(
  _idea_id uuid, _ghi_chu text DEFAULT NULL, _danh_gia jsonb DEFAULT NULL
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
        -- Trình lại hồ sơ ĐANG chờ thì giữ nguyên mốc trình đầu tiên
        ghi_nhan_luc = CASE
          WHEN public.portal_idea_awards.trang_thai = 'cho_gd_duyet'
            THEN public.portal_idea_awards.ghi_nhan_luc
          ELSE now()
        END,
        -- Trình lại sau khi bị từ chối / đã rút thì xóa phiếu và ý kiến cũ của Giám đốc
        danh_gia_gd = CASE
          WHEN public.portal_idea_awards.trang_thai IN ('tu_choi', 'thu_hoi') THEN NULL
          ELSE public.portal_idea_awards.danh_gia_gd
        END,
        diem_gd = CASE
          WHEN public.portal_idea_awards.trang_thai IN ('tu_choi', 'thu_hoi') THEN NULL
          ELSE public.portal_idea_awards.diem_gd
        END,
        y_kien_gd = CASE
          WHEN public.portal_idea_awards.trang_thai IN ('tu_choi', 'thu_hoi') THEN NULL
          ELSE public.portal_idea_awards.y_kien_gd
        END,
        nguoi_duyet = NULL,
        duyet_luc = NULL
    WHERE public.portal_idea_awards.trang_thai <> 'da_ghi_nhan';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object(
    'ok', true, 'da_ghi_nhan', false, 'trinh_moi', v_n > 0, 'diem_tcth', v_diem
  );
END $$;

-- ---------------------------------------------------------------------------
-- 8) Đối chiếu SMP — TSC không còn đồng ý thì gỡ đúng phần TSC
--
--    Bản cũ chỉ có chiều lên. Ghi nhầm «Đồng ý» rồi sửa lại thì dòng Bén rễ
--    TSC vẫn nằm nguyên với KPI và 300.000đ. Nay:
--      · Chi nhánh cũng đã duyệt → chỉ tắt cờ duyet_tsc, kết quả giữ nguyên
--      · Chỉ có TSC → dòng về 'thu_hoi', gỡ KPI, tiền, lũy kế, trả cấp độ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_cap_nhat_smp(_idea_id uuid, _smp_ma text, _smp_trang_thai text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_award public.portal_idea_awards%ROWTYPE;
  v_ghi_nhan boolean := false;
  v_thu_hoi boolean := false;
  v_cap_ve text;
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng TCTH / Quản trị hệ thống được cập nhật kết quả SMP';
  END IF;
  IF _smp_trang_thai NOT IN ('chua_gui','da_gui','dong_y','dong_y_mot_phan','khong_dong_y') THEN
    RAISE EXCEPTION 'Trạng thái SMP không hợp lệ: %', _smp_trang_thai;
  END IF;

  UPDATE public.portal_ideas
  SET smp_ma = nullif(btrim(coalesce(_smp_ma, '')), ''),
      smp_trang_thai = _smp_trang_thai,
      smp_cap_nhat_luc = now()
  WHERE id = _idea_id
  RETURNING * INTO v_idea;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  IF _smp_trang_thai IN ('dong_y', 'dong_y_mot_phan') THEN
    INSERT INTO public.portal_idea_awards
      (idea_id, cap_do, ghi_nhan_kpi, duyet_tsc, phong, muc_thuong, ly_do_thuong,
       trang_thai, ghi_chu, cap_do_truoc)
    VALUES
      (_idea_id, 'Bén rễ', true, true, v_idea.department_name, 300000, 'trong_han_muc',
       'da_ghi_nhan', 'TSC phê duyệt trên SMP: ' || _smp_trang_thai, v_idea.development_level)
    ON CONFLICT (idea_id, cap_do) DO UPDATE
      SET ghi_nhan_kpi = true,
          duyet_tsc = true,
          trang_thai = 'da_ghi_nhan',
          muc_thuong = GREATEST(public.portal_idea_awards.muc_thuong, 300000),
          ly_do_thuong = 'trong_han_muc',
          ghi_chu = 'TSC phê duyệt trên SMP: ' || _smp_trang_thai,
          cap_do_truoc = COALESCE(public.portal_idea_awards.cap_do_truoc, v_idea.development_level);

    PERFORM public.bhy_ideas_thuong_luy_ke(_idea_id, 'Bén rễ');

    UPDATE public.portal_ideas
    SET development_level = 'Bén rễ'
    WHERE id = _idea_id AND development_level = 'Ươm mầm';

    v_ghi_nhan := true;
  ELSE
    SELECT * INTO v_award
    FROM public.portal_idea_awards
    WHERE idea_id = _idea_id AND cap_do = 'Bén rễ' AND duyet_tsc AND trang_thai = 'da_ghi_nhan';

    IF FOUND THEN
      IF v_award.duyet_cn THEN
        UPDATE public.portal_idea_awards
        SET duyet_tsc = false,
            ghi_chu = 'TSC không còn đồng ý trên SMP (' || _smp_trang_thai || ') — Chi nhánh vẫn công nhận'
        WHERE id = v_award.id;
      ELSIF NOT EXISTS (
        SELECT 1 FROM public.portal_idea_awards
        WHERE idea_id = _idea_id AND cap_do IN ('Vươn cành', 'Lan tỏa') AND trang_thai = 'da_ghi_nhan'
      ) THEN
        v_cap_ve := COALESCE(v_award.cap_do_truoc, 'Ươm mầm');
        PERFORM public.bhy_ideas_thu_hoi_luy_ke(_idea_id, 'Bén rễ');

        UPDATE public.portal_idea_awards
        SET trang_thai = 'thu_hoi',
            ghi_nhan_kpi = false,
            duyet_tsc = false,
            muc_thuong = 0,
            ly_do_thuong = 'khong_chi',
            thu_hoi_luc = now(),
            nguoi_thu_hoi = auth.uid(),
            ly_do_thu_hoi = 'Sửa trạng thái SMP về «' || _smp_trang_thai || '»',
            so_lan_thu_hoi = so_lan_thu_hoi + 1
        WHERE id = v_award.id;

        UPDATE public.portal_ideas
        SET development_level = v_cap_ve
        WHERE id = _idea_id AND development_level = 'Bén rễ';

        v_thu_hoi := true;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'ghi_nhan_ben_re', v_ghi_nhan, 'thu_hoi_ben_re', v_thu_hoi);
END $$;

-- ---------------------------------------------------------------------------
-- 9) Hàng chờ Giám đốc — trả thêm demo, cấp đề xuất, cấp hiện tại, vết thu hồi
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
  diem_tcth smallint,
  has_demo boolean,
  cap_de_xuat text,
  development_level text,
  so_lan_thu_hoi smallint,
  ly_do_thu_hoi text,
  thu_hoi_luc timestamptz
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
    a.diem_tcth,
    i.has_demo,
    i.level,
    i.development_level,
    a.so_lan_thu_hoi,
    a.ly_do_thu_hoi,
    a.thu_hoi_luc
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
-- 10) Ứng viên cho TCTH — trả thêm demo
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.bhy_ideas_ung_vien_ben_re();

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
  diem_tcth smallint,
  cap_de_xuat text,
  has_demo boolean
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
    a.diem_tcth,
    i.level,
    i.has_demo
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

-- ---------------------------------------------------------------------------
-- 11) Quyết định gần đây của Giám đốc — để tìm lại hồ sơ bấm nhầm
--
--    Chỉ đường Chi nhánh (có nguoi_duyet). Đường TSC sửa ở màn SMP.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_gd_da_quyet_gan_day(_so_ngay integer DEFAULT 30)
RETURNS TABLE (
  idea_id uuid,
  title text,
  proposer text,
  phong text,
  has_demo boolean,
  cap_de_xuat text,
  development_level text,
  trang_thai text,
  duyet_cn boolean,
  duyet_tsc boolean,
  muc_thuong integer,
  nguoi_duyet text,
  duyet_luc timestamptz,
  diem_tcth smallint,
  diem_gd smallint,
  y_kien_gd text,
  so_lan_thu_hoi smallint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.title, i.proposer, a.phong, i.has_demo, i.level, i.development_level,
    a.trang_thai, a.duyet_cn, a.duyet_tsc, a.muc_thuong,
    (SELECT p.full_name FROM public.profiles p WHERE p.user_id = a.nguoi_duyet LIMIT 1),
    a.duyet_luc, a.diem_tcth, a.diem_gd, a.y_kien_gd, a.so_lan_thu_hoi
  FROM public.portal_idea_awards a
  JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE a.cap_do = 'Bén rễ'
    AND a.nguoi_duyet IS NOT NULL
    AND a.trang_thai IN ('da_ghi_nhan', 'tu_choi')
    AND a.duyet_luc >= now() - make_interval(days => GREATEST(1, _so_ngay))
    AND (public.bhy_ideas_la_giam_doc() OR public.is_content_admin(auth.uid()))
  ORDER BY a.duyet_luc DESC
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_gd_da_quyet_gan_day(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_gd_da_quyet_gan_day(integer) TO authenticated, service_role;

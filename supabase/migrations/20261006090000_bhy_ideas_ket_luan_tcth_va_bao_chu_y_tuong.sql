-- ============================================================================
-- BHY Ideas — KẾT LUẬN CỦA TCTH (NUÔI DƯỠNG / DỪNG ƯƠM MẦM), BÁO CHỦ Ý TƯỞNG
-- Ở MỌI BƯỚC, SỔ GHI NHẬN ĐẦY ĐỦ ĐỂ KẾT XUẤT
--
-- Bổ sung từ Phòng TCTH qua Giám đốc (03/09/2026):
--
--   · Ý tưởng không thực sự khả thi → TCTH chọn DỪNG ƯƠM MẦM (chưa khả thi),
--     ghi lý do. Trước đây TCTH chỉ có hai đường: trình hoặc để đó — ý tưởng
--     yếu cứ nằm mãi trong danh sách 153 ứng viên, không ai nói cho cán bộ.
--   · Ý tưởng có thể PHỐI HỢP và phát triển (ví dụ của chị Hải và của PGD Văn
--     Lâm) → chọn NUÔI DƯỠNG, ghép với các ý tưởng liên quan, báo cho chủ ý
--     tưởng vào góp thêm ý kiến để hoàn thiện.
--   · MỌI hành động đổi cấp hoặc từ chối đều báo cho chủ ý tưởng, để cán bộ
--     biết ý tưởng của mình đang được xem xét tới đâu.
--
-- Cộng yêu cầu của Giám đốc: quản trị kết xuất được chi tiết kết quả đánh giá
-- theo từng cấp độ, phân biệt Bén rễ do TSC phê duyệt với Bén rễ do Giám đốc
-- Chi nhánh duyệt → hàm sổ ghi nhận đầy đủ mọi cấp.
--
-- Thông báo là việc «cho biết», KHÔNG được làm hỏng việc chính: hàm báo nuốt
-- mọi lỗi và trả false — một quyết định của Giám đốc không bao giờ bị hủy chỉ
-- vì hàng đợi thông báo trục trặc.
-- ============================================================================

ALTER TABLE public.portal_idea_awards
  ADD COLUMN IF NOT EXISTS ket_luan_luc timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_ket_luan uuid,
  ADD COLUMN IF NOT EXISTS ly_do_ket_luan text,
  -- Các ý tưởng được ghép nuôi dưỡng cùng — id của portal_ideas
  ADD COLUMN IF NOT EXISTS phoi_hop_voi uuid[];

ALTER TABLE public.portal_idea_awards DROP CONSTRAINT IF EXISTS portal_idea_awards_trang_thai_check;
ALTER TABLE public.portal_idea_awards
  ADD CONSTRAINT portal_idea_awards_trang_thai_check
  CHECK (trang_thai IN ('cho_gd_duyet', 'da_ghi_nhan', 'tu_choi', 'thu_hoi', 'tra_ve', 'da_bo_sung', 'nuoi_duong', 'dung'));

-- ---------------------------------------------------------------------------
-- 1) Báo cho CHỦ ý tưởng — hàm nội bộ, best-effort
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_bao_chu_y_tuong(
  _idea_id uuid, _ma text, _tieu_de text, _noi_dung text, _muc text DEFAULT 'NHE'
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid;
BEGIN
  SELECT p.id INTO v_profile
  FROM public.portal_ideas i JOIN public.profiles p ON p.user_id = i.created_by
  WHERE i.id = _idea_id LIMIT 1;
  IF v_profile IS NULL THEN RETURN false; END IF;
  RETURN public.ct2_dat_thong_bao(
    _ma_su_kien => _ma, _nguoi_nhan => v_profile, _tieu_de => _tieu_de,
    _noi_dung => _noi_dung, _muc => _muc, _dau_viec_id => NULL, _ho_so_id => NULL);
EXCEPTION WHEN OTHERS THEN
  -- Thông báo hỏng không được làm hỏng quyết định
  RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_bao_chu_y_tuong(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Kết luận của TCTH: nuôi dưỡng (có phối hợp) hoặc dừng ươm mầm
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_ket_luan_tcth(
  _idea_id uuid, _ket_luan text, _ly_do text, _phoi_hop_voi uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_award public.portal_idea_awards%ROWTYPE;
  v_ly_do text := nullif(btrim(coalesce(_ly_do, '')), '');
  v_ten text;
  v_phoi_hop uuid[] := '{}';
  v_ten_phoi_hop text;
  v_lien uuid;
  v_lien_title text;
  v_da_bao boolean := false;
  v_so_bao_phoi_hop integer := 0;
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổ chức tổng hợp kết luận được ở bước này';
  END IF;
  IF _ket_luan NOT IN ('nuoi_duong', 'dung') THEN
    RAISE EXCEPTION 'Kết luận không hợp lệ';
  END IF;
  IF v_ly_do IS NULL THEN
    RAISE EXCEPTION 'Cần ghi lý do / hướng phát triển — cán bộ sẽ đọc nguyên văn';
  END IF;

  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  SELECT * INTO v_award FROM public.portal_idea_awards WHERE idea_id = _idea_id AND cap_do = 'Bén rễ';
  IF FOUND AND v_award.trang_thai IN ('da_ghi_nhan', 'cho_gd_duyet') THEN
    RAISE EXCEPTION 'Hồ sơ đang chờ Giám đốc hoặc đã được công nhận — rút hồ sơ / thu hồi trước';
  END IF;

  -- Chỉ giữ id có thật, loại chính nó
  IF _ket_luan = 'nuoi_duong' AND _phoi_hop_voi IS NOT NULL THEN
    SELECT coalesce(array_agg(i.id), '{}') INTO v_phoi_hop
    FROM public.portal_ideas i WHERE i.id = ANY(_phoi_hop_voi) AND i.id <> _idea_id;
  END IF;

  INSERT INTO public.portal_idea_awards
    (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, duyet_tsc, phong, muc_thuong, ly_do_thuong,
     trang_thai, ket_luan_luc, nguoi_ket_luan, ly_do_ket_luan, phoi_hop_voi)
  VALUES
    (_idea_id, 'Bén rễ', false, false, false, v_idea.department_name, 0, 'khong_chi',
     _ket_luan, now(), auth.uid(), v_ly_do,
     CASE WHEN _ket_luan = 'nuoi_duong' THEN v_phoi_hop ELSE NULL END)
  ON CONFLICT (idea_id, cap_do) DO UPDATE
    SET trang_thai = _ket_luan,
        ghi_nhan_kpi = false,
        duyet_cn = false,
        muc_thuong = 0,
        ly_do_thuong = 'khong_chi',
        nguoi_duyet = NULL,
        duyet_luc = NULL,
        danh_gia_gd = NULL,
        diem_gd = NULL,
        y_kien_gd = NULL,
        ket_luan_luc = now(),
        nguoi_ket_luan = auth.uid(),
        ly_do_ket_luan = v_ly_do,
        phoi_hop_voi = CASE WHEN _ket_luan = 'nuoi_duong' THEN v_phoi_hop ELSE NULL END;

  SELECT string_agg('«' || title || '»', ', ') INTO v_ten_phoi_hop
  FROM public.portal_ideas WHERE id = ANY(v_phoi_hop);
  SELECT full_name INTO v_ten FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.portal_idea_comments (idea_id, user_id, user_name, body)
  VALUES (_idea_id, auth.uid(), coalesce(v_ten, 'Phòng TCTH'),
    CASE _ket_luan
      WHEN 'nuoi_duong' THEN '🌱 Phòng TCTH đưa vào nuôi dưỡng: ' || v_ly_do
        || coalesce(' — phối hợp cùng ' || v_ten_phoi_hop, '')
        || '. Mời anh/chị góp thêm ý kiến ngay tại đây để hoàn thiện.'
      ELSE '⏹️ Phòng TCTH dừng ươm mầm: ' || v_ly_do
    END);

  IF _ket_luan = 'nuoi_duong' THEN
    v_da_bao := public.bhy_ideas_bao_chu_y_tuong(_idea_id, 'IDEA_TRA_VE',
      '🌱 Ý tưởng được chọn nuôi dưỡng — ' || left(v_idea.title, 44),
      'Ý tưởng: ' || v_idea.title
        || E'\n' || 'Phòng TCTH: ' || v_ly_do
        || coalesce(E'\n' || 'Phối hợp cùng: ' || v_ten_phoi_hop, '')
        || E'\n' || 'Việc cần làm: vào Bắc Hưng Yên Ideas › Gửi & tra cứu, góp thêm ý kiến ở phần trao đổi của ý tưởng.',
      'DO');

    -- Chủ các ý tưởng được ghép cùng cũng cần biết
    FOREACH v_lien IN ARRAY v_phoi_hop LOOP
      SELECT title INTO v_lien_title FROM public.portal_ideas WHERE id = v_lien;
      INSERT INTO public.portal_idea_comments (idea_id, user_id, user_name, body)
      VALUES (v_lien, auth.uid(), coalesce(v_ten, 'Phòng TCTH'),
              '🔗 Phòng TCTH ghép nuôi dưỡng cùng ý tưởng «' || v_idea.title || '»: ' || v_ly_do);
      IF public.bhy_ideas_bao_chu_y_tuong(v_lien, 'IDEA_TIEN_TRINH',
           '🔗 Ý tưởng được ghép nuôi dưỡng — ' || left(v_lien_title, 40),
           'Ý tưởng: ' || v_lien_title
             || E'\n' || 'Ghép cùng: ' || v_idea.title
             || E'\n' || 'Phòng TCTH: ' || v_ly_do,
           'NHE') THEN
        v_so_bao_phoi_hop := v_so_bao_phoi_hop + 1;
      END IF;
    END LOOP;
  ELSE
    v_da_bao := public.bhy_ideas_bao_chu_y_tuong(_idea_id, 'IDEA_TIEN_TRINH',
      '⏹️ Dừng ươm mầm — ' || left(v_idea.title, 44),
      'Ý tưởng: ' || v_idea.title
        || E'\n' || 'Kết luận: Phòng TCTH dừng ươm mầm (chưa khả thi)'
        || E'\n' || 'Lý do: ' || v_ly_do,
      'NHE');
  END IF;

  RETURN jsonb_build_object('ok', true, 'ket_luan', _ket_luan, 'da_bao', v_da_bao,
    'so_phoi_hop', coalesce(array_length(v_phoi_hop, 1), 0), 'so_bao_phoi_hop', v_so_bao_phoi_hop);
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_ket_luan_tcth(uuid, text, text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_ket_luan_tcth(uuid, text, text, uuid[]) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Các bước sẵn có — thêm một dòng báo chủ ý tưởng, thân hàm giữ nguyên
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
        ghi_nhan_luc = CASE
          WHEN public.portal_idea_awards.trang_thai = 'cho_gd_duyet'
            THEN public.portal_idea_awards.ghi_nhan_luc
          ELSE now()
        END,
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
  IF v_n > 0 THEN
    PERFORM public.bhy_ideas_bao_chu_y_tuong(_idea_id, 'IDEA_TIEN_TRINH',
      '⏳ Ý tưởng đã trình Giám đốc — ' || left(v_idea.title, 44),
      'Ý tưởng: ' || v_idea.title
        || E'\n' || 'Bước: Phòng TCTH đã đánh giá và trình Giám đốc công nhận cấp Bén rễ'
        || E'\n' || 'Tiếp theo: chờ Giám đốc quyết — theo dõi ở Gửi & tra cứu.',
      'NHE');
  END IF;
  RETURN jsonb_build_object(
    'ok', true, 'da_ghi_nhan', false, 'trinh_moi', v_n > 0, 'diem_tcth', v_diem
  );
END $$;

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

    PERFORM public.bhy_ideas_bao_chu_y_tuong(_idea_id, 'IDEA_TIEN_TRINH',
      '🎉 Ý tưởng được công nhận Bén rễ — ' || left(v_idea.title, 40),
      'Ý tưởng: ' || v_idea.title
        || E'\n' || 'Quyết định: Giám đốc công nhận cấp Bén rễ'
        || E'\n' || 'Thưởng: ' || to_char(v_don_gia, 'FM999G999G999') || 'đ'
        || CASE WHEN v_luy_ke > 0 THEN ' + cộng bù cấp dưới ' || to_char(v_luy_ke, 'FM999G999G999') || 'đ' ELSE '' END
        || coalesce(E'\n' || 'Ý kiến Giám đốc: ' || v_y_kien, ''),
      'KHEN');
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

    PERFORM public.bhy_ideas_bao_chu_y_tuong(_idea_id, 'IDEA_TIEN_TRINH',
      'Ý tưởng chưa đạt Bén rễ — ' || left(v_idea.title, 44),
      'Ý tưởng: ' || v_idea.title
        || E'\n' || 'Quyết định: Giám đốc kết luận chưa đạt cấp Bén rễ'
        || coalesce(E'\n' || 'Ý kiến Giám đốc: ' || v_y_kien, ''),
      'NHE');
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'dong_y', _dong_y,
    'muc_thuong', CASE WHEN _dong_y THEN v_don_gia ELSE 0 END,
    'thuong_luy_ke', v_luy_ke,
    'diem_gd', v_diem
  );
END $$;

CREATE OR REPLACE FUNCTION public.bhy_ideas_gd_thu_hoi_ben_re(_idea_id uuid, _ly_do text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award public.portal_idea_awards%ROWTYPE;
  v_idea public.portal_ideas%ROWTYPE;
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

  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
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

  PERFORM public.bhy_ideas_bao_chu_y_tuong(_idea_id, 'IDEA_TIEN_TRINH',
    'Giám đốc thu hồi quyết định — ' || left(v_idea.title, 44),
    'Ý tưởng: ' || v_idea.title
      || E'\n' || 'Quyết định trước: ' || CASE v_tu_trang_thai WHEN 'da_ghi_nhan' THEN 'công nhận Bén rễ' ELSE 'chưa đạt' END
      || E'\n' || 'Lý do thu hồi: ' || v_ly_do
      || E'\n' || 'Tiếp theo: hồ sơ về hàng chờ để Giám đốc quyết lại.',
    'NHE');

  RETURN jsonb_build_object(
    'ok', true,
    'tu_trang_thai', v_tu_trang_thai,
    've_trang_thai', 'cho_gd_duyet',
    'cap_do_ve', v_cap_ve,
    'tien_go', v_tien_go,
    'luy_ke_go', v_luy_ke_go
  );
END $$;

CREATE OR REPLACE FUNCTION public.bhy_ideas_rut_ho_so_ben_re(_idea_id uuid, _ly_do text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ly_do text := nullif(btrim(coalesce(_ly_do, '')), '');
  v_title text;
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

  SELECT title INTO v_title FROM public.portal_ideas WHERE id = _idea_id;
  PERFORM public.bhy_ideas_bao_chu_y_tuong(_idea_id, 'IDEA_TIEN_TRINH',
    'Hồ sơ Bén rễ tạm rút khỏi hàng chờ — ' || left(v_title, 40),
    'Ý tưởng: ' || v_title
      || E'\n' || 'Bước: hồ sơ rút khỏi hàng chờ Giám đốc để Phòng TCTH xem lại'
      || E'\n' || 'Lý do: ' || v_ly_do,
    'NHE');

  RETURN jsonb_build_object('ok', true, 've_trang_thai', 'thu_hoi');
END $$;

CREATE OR REPLACE FUNCTION public.bhy_ideas_cap_nhat_smp(_idea_id uuid, _smp_ma text, _smp_trang_thai text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_award public.portal_idea_awards%ROWTYPE;
  v_da_cong_nhan_truoc boolean := false;
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

  SELECT coalesce(bool_or(trang_thai = 'da_ghi_nhan' AND duyet_tsc), false) INTO v_da_cong_nhan_truoc
  FROM public.portal_idea_awards WHERE idea_id = _idea_id AND cap_do = 'Bén rễ';

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
    -- Chỉ báo lần ĐẦU được TSC công nhận — sửa mã SMP lặt vặt không báo lại
    IF NOT v_da_cong_nhan_truoc THEN
      PERFORM public.bhy_ideas_bao_chu_y_tuong(_idea_id, 'IDEA_TIEN_TRINH',
        '🎉 Trụ sở chính đồng ý — ý tưởng lên Bén rễ — ' || left(v_idea.title, 34),
        'Ý tưởng: ' || v_idea.title
          || E'\n' || 'Kết quả SMP: ' || CASE _smp_trang_thai WHEN 'dong_y' THEN 'Đồng ý' ELSE 'Đồng ý một phần' END
          || coalesce(' · mã ' || v_idea.smp_ma, '')
          || E'\n' || 'Ghi nhận: cấp Bén rễ theo quy chế, thưởng 300.000đ',
        'KHEN');
    END IF;
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
        PERFORM public.bhy_ideas_bao_chu_y_tuong(_idea_id, 'IDEA_TIEN_TRINH',
          'Kết quả SMP thay đổi — ' || left(v_idea.title, 44),
          'Ý tưởng: ' || v_idea.title
            || E'\n' || 'Kết quả SMP mới: ' || _smp_trang_thai
            || E'\n' || 'Ghi nhận Bén rễ theo đường Trụ sở chính đã được gỡ; cấp độ về ' || v_cap_ve,
          'NHE');
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'ghi_nhan_ben_re', v_ghi_nhan, 'thu_hoi_ben_re', v_thu_hoi);
END $$;

CREATE OR REPLACE FUNCTION public.bhy_ideas_chon_uom_mam(
  _idea_id uuid, _tuan_chon date, _chot_voi_tp boolean DEFAULT false, _ghi_chu text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_thuong integer;
  v_ly_do text;
  v_chot_luc timestamptz;
  v_da_chon boolean := false;
BEGIN
  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  IF NOT public.bhy_ideas_duoc_chon_uom_mam(v_idea.department_name) THEN
    RAISE EXCEPTION 'Quyền chốt ý tưởng Ươm mầm đang thuộc %',
      CASE (public.bhy_ideas_cau_hinh()).ai_chon_uom_mam
        WHEN 'tcth' THEN 'Phòng Tổ chức tổng hợp'
        ELSE 'Trưởng phòng của phòng đề xuất'
      END;
  END IF;

  SELECT coalesce(bool_or(ghi_nhan_kpi AND duyet_cn), false) INTO v_da_chon
  FROM public.portal_idea_awards WHERE idea_id = _idea_id AND cap_do = 'Ươm mầm';

  v_thuong := 100000;
  v_ly_do := 'trong_han_muc';
  v_chot_luc := CASE WHEN _chot_voi_tp THEN now() ELSE NULL END;

  INSERT INTO public.portal_idea_awards
    (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, phong, tuan_chon, muc_thuong, ly_do_thuong,
     trang_thai, chot_voi_tp, chot_voi_tp_luc, chot_voi_tp_ghi_chu)
  VALUES
    (_idea_id, 'Ươm mầm', true, true, v_idea.department_name,
     date_trunc('week', _tuan_chon)::date, v_thuong, v_ly_do,
     'da_ghi_nhan', _chot_voi_tp, v_chot_luc, nullif(btrim(coalesce(_ghi_chu, '')), ''))
  ON CONFLICT (idea_id, cap_do) DO UPDATE
    SET ghi_nhan_kpi = true,
        duyet_cn = true,
        trang_thai = 'da_ghi_nhan',
        tuan_chon = date_trunc('week', _tuan_chon)::date,
        muc_thuong = GREATEST(public.portal_idea_awards.muc_thuong, v_thuong),
        ly_do_thuong = v_ly_do,
        chot_voi_tp = public.portal_idea_awards.chot_voi_tp OR _chot_voi_tp,
        chot_voi_tp_luc = COALESCE(public.portal_idea_awards.chot_voi_tp_luc, v_chot_luc),
        chot_voi_tp_ghi_chu = COALESCE(
          nullif(btrim(coalesce(_ghi_chu, '')), ''), public.portal_idea_awards.chot_voi_tp_ghi_chu),
        nguoi_ghi_nhan = auth.uid(),
        ghi_nhan_luc = now();

  IF NOT v_da_chon THEN
    PERFORM public.bhy_ideas_bao_chu_y_tuong(_idea_id, 'IDEA_TIEN_TRINH',
      '🌱 Ý tưởng được ghi nhận Ươm mầm — ' || left(v_idea.title, 40),
      'Ý tưởng: ' || v_idea.title
        || E'\n' || 'Ghi nhận: cấp Ươm mầm, tuần ' || to_char(date_trunc('week', _tuan_chon)::date, 'DD/MM/YYYY')
        || E'\n' || 'Thưởng: 100.000đ',
      'KHEN');
  END IF;

  RETURN jsonb_build_object('ok', true, 'muc_thuong', v_thuong, 'ly_do', v_ly_do);
END $$;

CREATE OR REPLACE FUNCTION public.bhy_ideas_bo_chon_uom_mam(_idea_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_truoc_moc boolean;
BEGIN
  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  IF NOT public.bhy_ideas_duoc_chon_uom_mam(v_idea.department_name) THEN
    RAISE EXCEPTION 'Quyền chốt ý tưởng Ươm mầm đang thuộc %',
      CASE (public.bhy_ideas_cau_hinh()).ai_chon_uom_mam
        WHEN 'tcth' THEN 'Phòng Tổ chức tổng hợp'
        ELSE 'Trưởng phòng của phòng đề xuất'
      END;
  END IF;

  v_truoc_moc := (v_idea.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') < '2026-08-16'::timestamp;

  IF v_truoc_moc THEN
    UPDATE public.portal_idea_awards
    SET duyet_cn = false,
        ghi_nhan_kpi = duyet_tsc,
        muc_thuong = 100000,
        ly_do_thuong = 'hoi_to_khuyen_khich',
        nguoi_ghi_nhan = auth.uid(),
        ghi_nhan_luc = now()
    WHERE idea_id = _idea_id AND cap_do = 'Ươm mầm';
  ELSE
    UPDATE public.portal_idea_awards
    SET duyet_cn = false, ghi_nhan_kpi = duyet_tsc,
        muc_thuong = CASE WHEN duyet_tsc THEN muc_thuong ELSE 0 END,
        ly_do_thuong = CASE WHEN duyet_tsc THEN ly_do_thuong ELSE 'khong_chi' END
    WHERE idea_id = _idea_id AND cap_do = 'Ươm mầm';

    DELETE FROM public.portal_idea_awards
    WHERE idea_id = _idea_id AND cap_do = 'Ươm mầm'
      AND NOT duyet_cn AND NOT duyet_tsc;
  END IF;

  PERFORM public.bhy_ideas_bao_chu_y_tuong(_idea_id, 'IDEA_TIEN_TRINH',
    'Bỏ ghi nhận Ươm mầm — ' || left(v_idea.title, 44),
    'Ý tưởng: ' || v_idea.title
      || E'\n' || 'Bước: Phòng TCTH bỏ ghi nhận cấp Ươm mầm tuần này'
      || CASE WHEN v_truoc_moc THEN E'\n' || 'Thưởng khuyến khích 100.000đ vẫn giữ (ý tưởng gửi trước 16/08/2026)' ELSE '' END,
    'NHE');

  RETURN jsonb_build_object('ok', true, 'giu_thuong_hoi_to', v_truoc_moc);
END $$;

-- ---------------------------------------------------------------------------
-- 4) Các hàm danh sách — thêm kết luận TCTH và tên ý tưởng phối hợp
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.bhy_ideas_ung_vien_ben_re();
CREATE OR REPLACE FUNCTION public.bhy_ideas_ung_vien_ben_re()
RETURNS TABLE (
  idea_id uuid, title text, proposer text, phong text, current_status text, proposed_solution text,
  expected_benefits text, created_at timestamptz, development_level text, smp_trang_thai text,
  da_tung_tu_choi boolean, danh_gia_tcth jsonb, diem_tcth smallint, cap_de_xuat text, has_demo boolean,
  trang_thai_so text, tra_ve_boi text, ly_do_tra_ve text, tra_ve_luc timestamptz,
  bo_sung_luc timestamptz, bo_sung_ghi_chu text, so_lan_bo_sung smallint,
  ly_do_ket_luan text, ket_luan_luc timestamptz, phoi_hop_voi uuid[], phoi_hop_ten text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.title, i.proposer, i.department_name,
    i.current_status, i.proposed_solution, i.expected_benefits,
    i.created_at, i.development_level, i.smp_trang_thai,
    coalesce(a.trang_thai = 'tu_choi', false),
    a.danh_gia_tcth, a.diem_tcth, i.level, i.has_demo,
    a.trang_thai, a.tra_ve_boi, a.ly_do_tra_ve, a.tra_ve_luc,
    a.bo_sung_luc, a.bo_sung_ghi_chu, coalesce(a.so_lan_bo_sung, 0),
    a.ly_do_ket_luan, a.ket_luan_luc, a.phoi_hop_voi,
    ARRAY(SELECT p.title FROM public.portal_ideas p WHERE p.id = ANY(a.phoi_hop_voi))
  FROM public.portal_ideas i
  LEFT JOIN public.portal_idea_awards a
    ON a.idea_id = i.id AND a.cap_do = 'Bén rễ'
  WHERE public.is_content_admin(auth.uid())
    AND coalesce(a.trang_thai, 'chua_co') NOT IN ('da_ghi_nhan', 'cho_gd_duyet')
  ORDER BY i.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_ung_vien_ben_re() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_ung_vien_ben_re() TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.bhy_ideas_ho_so_ben_re_cua_toi();
CREATE OR REPLACE FUNCTION public.bhy_ideas_ho_so_ben_re_cua_toi()
RETURNS TABLE (
  idea_id uuid, trang_thai text, tra_ve_boi text, ly_do_tra_ve text, tra_ve_luc timestamptz,
  so_lan_bo_sung smallint, bo_sung_luc timestamptz, bo_sung_ghi_chu text,
  ly_do_ket_luan text, ket_luan_luc timestamptz, phoi_hop_ten text[],
  muc_thuong integer, ghi_nhan_kpi boolean, duyet_cn boolean, duyet_tsc boolean,
  y_kien_gd text, duyet_luc timestamptz, trinh_luc timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.idea_id, a.trang_thai, a.tra_ve_boi, a.ly_do_tra_ve, a.tra_ve_luc,
         a.so_lan_bo_sung, a.bo_sung_luc, a.bo_sung_ghi_chu,
         a.ly_do_ket_luan, a.ket_luan_luc,
         ARRAY(SELECT p.title FROM public.portal_ideas p WHERE p.id = ANY(a.phoi_hop_voi)),
         a.muc_thuong, a.ghi_nhan_kpi, a.duyet_cn, a.duyet_tsc,
         a.y_kien_gd, a.duyet_luc, a.ghi_nhan_luc
  FROM public.portal_idea_awards a
  JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE a.cap_do = 'Bén rễ'
    AND i.created_by = auth.uid()
    AND public.is_staff(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_ho_so_ben_re_cua_toi() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_ho_so_ben_re_cua_toi() TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.bhy_ideas_so_ben_re();
CREATE OR REPLACE FUNCTION public.bhy_ideas_so_ben_re()
RETURNS TABLE (
  idea_id uuid, title text, proposer text, phong text, has_demo boolean, cap_de_xuat text,
  development_level text, trang_thai text, duyet_cn boolean, duyet_tsc boolean, ghi_nhan_kpi boolean,
  muc_thuong integer, tra_ve_boi text, ly_do_tra_ve text, tra_ve_luc timestamptz,
  so_lan_bo_sung smallint, bo_sung_luc timestamptz, nguoi_duyet text, duyet_luc timestamptz,
  nguoi_trinh text, trinh_luc timestamptz, smp_ma text, smp_trang_thai text,
  diem_tcth smallint, diem_gd smallint, y_kien_gd text, moc_gan_nhat timestamptz,
  ly_do_ket_luan text, ket_luan_luc timestamptz, phoi_hop_ten text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.title, i.proposer, a.phong, i.has_demo, i.level, i.development_level,
    a.trang_thai, a.duyet_cn, a.duyet_tsc, a.ghi_nhan_kpi, a.muc_thuong,
    a.tra_ve_boi, a.ly_do_tra_ve, a.tra_ve_luc, a.so_lan_bo_sung, a.bo_sung_luc,
    (SELECT p.full_name FROM public.profiles p WHERE p.user_id = a.nguoi_duyet LIMIT 1),
    a.duyet_luc,
    (SELECT p.full_name FROM public.profiles p WHERE p.user_id = a.nguoi_ghi_nhan LIMIT 1),
    a.ghi_nhan_luc,
    i.smp_ma, i.smp_trang_thai,
    a.diem_tcth, a.diem_gd, a.y_kien_gd,
    GREATEST(a.ghi_nhan_luc, coalesce(a.duyet_luc, a.ghi_nhan_luc), coalesce(a.tra_ve_luc, a.ghi_nhan_luc),
             coalesce(a.bo_sung_luc, a.ghi_nhan_luc), coalesce(a.ket_luan_luc, a.ghi_nhan_luc),
             coalesce(a.updated_at, a.ghi_nhan_luc)),
    a.ly_do_ket_luan, a.ket_luan_luc,
    ARRAY(SELECT p.title FROM public.portal_ideas p WHERE p.id = ANY(a.phoi_hop_voi))
  FROM public.portal_idea_awards a
  JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE a.cap_do = 'Bén rễ'
    AND (public.bhy_ideas_la_giam_doc() OR public.is_content_admin(auth.uid()))
  ORDER BY 27 DESC
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_so_ben_re() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_so_ben_re() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Sổ ghi nhận ĐẦY ĐỦ mọi cấp — để kết xuất Excel
--    nguon_cong_nhan: 'giam_doc' | 'tsc' | 'ca_hai' | 'chi_nhanh' (Ươm mầm do
--    TCTH/TP chốt) | 'hoi_to' (thưởng khuyến khích trước 16/08, chưa KPI) |
--    'luy_ke' (tiền bù khi lên cấp) | 'hoi_dong' (Vươn cành/Lan tỏa) | '' (chưa công nhận)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_so_ghi_nhan_day_du()
RETURNS TABLE (
  idea_id uuid, title text, proposer text, phong text, has_demo boolean, cap_de_xuat text,
  linh_vuc text, development_level text, cap_do text, trang_thai text, nguon_cong_nhan text,
  duyet_cn boolean, duyet_tsc boolean, ghi_nhan_kpi boolean, muc_thuong integer, ly_do_thuong text,
  tuan_chon date, nguoi_duyet text, duyet_luc timestamptz, nguoi_ghi_nhan text, ghi_nhan_luc timestamptz,
  smp_ma text, smp_trang_thai text, diem_tcth smallint, diem_gd smallint, y_kien_gd text, ghi_chu text,
  tra_ve_boi text, ly_do_tra_ve text, so_lan_bo_sung smallint, ly_do_ket_luan text, ly_do_thu_hoi text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.title, i.proposer, a.phong, i.has_demo, i.level, i.linh_vuc, i.development_level,
    a.cap_do, a.trang_thai,
    CASE
      WHEN a.trang_thai <> 'da_ghi_nhan' THEN ''
      WHEN a.cap_do = 'Bén rễ' AND a.duyet_cn AND a.duyet_tsc THEN 'ca_hai'
      WHEN a.cap_do = 'Bén rễ' AND a.duyet_tsc THEN 'tsc'
      WHEN a.cap_do = 'Bén rễ' AND a.duyet_cn THEN 'giam_doc'
      WHEN a.cap_do = 'Ươm mầm' AND (a.duyet_cn OR a.duyet_tsc) THEN 'chi_nhanh'
      -- 134 dòng nạp trước 16/08/2026: chỉ có tiền khuyến khích, chưa ai chốt KPI
      WHEN a.cap_do = 'Ươm mầm' AND a.ly_do_thuong = 'hoi_to_khuyen_khich' THEN 'hoi_to'
      WHEN a.cap_do = 'Ươm mầm' AND a.ghi_chu LIKE 'Thưởng lũy kế%' THEN 'luy_ke'
      WHEN a.cap_do IN ('Vươn cành', 'Lan tỏa') THEN 'hoi_dong'
      ELSE ''
    END,
    a.duyet_cn, a.duyet_tsc, a.ghi_nhan_kpi, a.muc_thuong, a.ly_do_thuong, a.tuan_chon,
    (SELECT p.full_name FROM public.profiles p WHERE p.user_id = a.nguoi_duyet LIMIT 1),
    a.duyet_luc,
    (SELECT p.full_name FROM public.profiles p WHERE p.user_id = a.nguoi_ghi_nhan LIMIT 1),
    a.ghi_nhan_luc,
    i.smp_ma, i.smp_trang_thai, a.diem_tcth, a.diem_gd, a.y_kien_gd, a.ghi_chu,
    a.tra_ve_boi, a.ly_do_tra_ve, a.so_lan_bo_sung, a.ly_do_ket_luan, a.ly_do_thu_hoi,
    i.created_at
  FROM public.portal_idea_awards a
  JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE public.bhy_ideas_la_giam_doc() OR public.is_content_admin(auth.uid())
  ORDER BY a.cap_do, i.department_name, i.created_at
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_so_ghi_nhan_day_du() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_so_ghi_nhan_day_du() TO authenticated, service_role;

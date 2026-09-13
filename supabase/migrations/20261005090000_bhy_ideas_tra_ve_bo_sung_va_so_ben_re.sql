-- ============================================================================
-- BHY Ideas — TRẢ VỀ ĐỂ BỔ SUNG, GỬI LẠI, SỔ BÉN RỄ THEO NGUỒN CÔNG NHẬN
--
-- Chốt vận hành 03/09/2026 (Giám đốc):
--   (1) «Chưa đạt» và «Trả về bổ sung» là HAI quyết định khác nhau — chưa đạt
--       là dừng, trả về là cán bộ được sửa rồi gửi lại.
--   (2) Phòng TCTH cũng trả về được (trước khi trình); sổ phân biệt TCTH trả
--       về / Giám đốc trả về.
--   (3) Cán bộ gửi lại → về TCTH chấm lại rồi trình, kể cả khi người trả về
--       là Giám đốc.
--   (4) Cán bộ bị trả về LUÔN được báo đẩy.
--
-- Cộng yêu cầu cùng ngày: Giám đốc và TCTH nhìn được ý tưởng Bén rễ nào do
-- Giám đốc duyệt, ý tưởng nào do Trụ sở chính đồng ý → hàm sổ đầy đủ.
--
-- Vì sao không tái dùng «tu_choi» rồi cho sửa: cán bộ nhìn «chưa đạt» không
-- biết mình còn cơ hội hay không; TCTH nhìn danh sách không biết cái nào đang
-- đợi cán bộ, cái nào đã gửi lại. Hai trạng thái mới nói rõ ai đang cầm việc:
--   tra_ve      — đang ở tay cán bộ (chờ bổ sung)
--   da_bo_sung  — đã về tay TCTH (chờ chấm lại)
--
-- Nhật ký trao đổi ghi bằng bình luận hệ thống ngay trên ý tưởng — cán bộ đọc
-- được ở bảng tra cứu, không phải dựng bảng mới.
-- ============================================================================

ALTER TABLE public.portal_idea_awards
  ADD COLUMN IF NOT EXISTS tra_ve_boi text,
  ADD COLUMN IF NOT EXISTS nguoi_tra_ve uuid,
  ADD COLUMN IF NOT EXISTS tra_ve_luc timestamptz,
  ADD COLUMN IF NOT EXISTS ly_do_tra_ve text,
  ADD COLUMN IF NOT EXISTS so_lan_tra_ve smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bo_sung_luc timestamptz,
  ADD COLUMN IF NOT EXISTS bo_sung_ghi_chu text,
  ADD COLUMN IF NOT EXISTS so_lan_bo_sung smallint NOT NULL DEFAULT 0;

ALTER TABLE public.portal_idea_awards DROP CONSTRAINT IF EXISTS portal_idea_awards_tra_ve_boi_check;
ALTER TABLE public.portal_idea_awards
  ADD CONSTRAINT portal_idea_awards_tra_ve_boi_check CHECK (tra_ve_boi IS NULL OR tra_ve_boi IN ('tcth', 'gd'));

ALTER TABLE public.portal_idea_awards DROP CONSTRAINT IF EXISTS portal_idea_awards_trang_thai_check;
ALTER TABLE public.portal_idea_awards
  ADD CONSTRAINT portal_idea_awards_trang_thai_check
  CHECK (trang_thai IN ('cho_gd_duyet', 'da_ghi_nhan', 'tu_choi', 'thu_hoi', 'tra_ve', 'da_bo_sung'));

COMMENT ON COLUMN public.portal_idea_awards.tra_ve_boi IS 'tcth = Phòng TCTH trả về trước khi trình; gd = Giám đốc trả về từ hàng chờ';

-- ---------------------------------------------------------------------------
-- 1) Trả về để bổ sung — TCTH hoặc Giám đốc
--
--    _vai do màn hình khai ('tcth' | 'gd') và được đối chiếu với quyền thật:
--    một người mang cả hai vai (system_admin) chọn vai mình đang đứng, sổ ghi
--    đúng vai đó thay vì đoán.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_tra_ve_bo_sung(_idea_id uuid, _ly_do text, _vai text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_award public.portal_idea_awards%ROWTYPE;
  v_ly_do text := nullif(btrim(coalesce(_ly_do, '')), '');
  v_ten_nguoi text;
  v_nhan_vai text;
  v_profile_cb uuid;
  v_da_bao boolean := false;
BEGIN
  IF _vai NOT IN ('tcth', 'gd') THEN
    RAISE EXCEPTION 'Vai trả về không hợp lệ';
  END IF;
  IF _vai = 'gd' AND NOT public.bhy_ideas_la_giam_doc() THEN
    RAISE EXCEPTION 'Chỉ Giám đốc trả về hồ sơ với vai Giám đốc';
  END IF;
  IF _vai = 'tcth' AND NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổ chức tổng hợp trả về hồ sơ với vai TCTH';
  END IF;
  IF v_ly_do IS NULL THEN
    RAISE EXCEPTION 'Cần ghi rõ khuyến nghị để cán bộ biết phải bổ sung gì';
  END IF;

  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;

  SELECT * INTO v_award
  FROM public.portal_idea_awards
  WHERE idea_id = _idea_id AND cap_do = 'Bén rễ';

  IF FOUND AND v_award.trang_thai = 'da_ghi_nhan' THEN
    RAISE EXCEPTION 'Ý tưởng đã được công nhận Bén rễ — muốn trả về thì thu hồi công nhận trước';
  END IF;

  INSERT INTO public.portal_idea_awards
    (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, duyet_tsc, phong, muc_thuong, ly_do_thuong,
     trang_thai, tra_ve_boi, nguoi_tra_ve, tra_ve_luc, ly_do_tra_ve, so_lan_tra_ve)
  VALUES
    (_idea_id, 'Bén rễ', false, false, false, v_idea.department_name, 0, 'khong_chi',
     'tra_ve', _vai, auth.uid(), now(), v_ly_do, 1)
  ON CONFLICT (idea_id, cap_do) DO UPDATE
    SET trang_thai = 'tra_ve',
        ghi_nhan_kpi = false,
        duyet_cn = false,
        muc_thuong = 0,
        ly_do_thuong = 'khong_chi',
        nguoi_duyet = NULL,
        duyet_luc = NULL,
        danh_gia_gd = NULL,
        diem_gd = NULL,
        y_kien_gd = NULL,
        tra_ve_boi = _vai,
        nguoi_tra_ve = auth.uid(),
        tra_ve_luc = now(),
        ly_do_tra_ve = v_ly_do,
        so_lan_tra_ve = public.portal_idea_awards.so_lan_tra_ve + 1;

  -- Nhật ký trao đổi trên ý tưởng — cán bộ đọc ngay ở bảng tra cứu
  v_nhan_vai := CASE _vai WHEN 'gd' THEN 'Giám đốc' ELSE 'Phòng TCTH' END;
  SELECT full_name INTO v_ten_nguoi FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  INSERT INTO public.portal_idea_comments (idea_id, user_id, user_name, body)
  VALUES (_idea_id, auth.uid(), coalesce(v_ten_nguoi, v_nhan_vai),
          '↩️ ' || v_nhan_vai || ' trả về để bổ sung: ' || v_ly_do);

  -- Báo đẩy cho cán bộ đề xuất — mức ĐỎ để không rơi vào trần 3 tin nhẹ/ngày
  -- (chốt (4): cán bộ bị trả về luôn được báo). Hàng đợi vẫn giữ luật ngoài
  -- giờ: tin sinh sau 18h nằm chờ tới 7h sáng làm việc kế tiếp.
  SELECT id INTO v_profile_cb FROM public.profiles WHERE user_id = v_idea.created_by LIMIT 1;
  IF v_profile_cb IS NOT NULL THEN
    v_da_bao := public.ct2_dat_thong_bao(
      _ma_su_kien => 'IDEA_TRA_VE',
      _nguoi_nhan => v_profile_cb,
      _tieu_de => '↩️ Ý tưởng cần bổ sung — ' || left(v_idea.title, 48),
      _noi_dung => 'Ý tưởng: ' || v_idea.title
        || E'\n' || 'Người trả về: ' || v_nhan_vai
        || E'\n' || 'Nội dung: ' || v_ly_do
        || E'\n' || 'Việc cần làm: vào Bắc Hưng Yên Ideas › Gửi & tra cứu, bấm «Sửa & gửi lại».',
      _muc => 'DO',
      _dau_viec_id => NULL,
      _ho_so_id => NULL);
  END IF;

  RETURN jsonb_build_object('ok', true, 've_trang_thai', 'tra_ve', 'vai', _vai, 'da_bao', v_da_bao);
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_tra_ve_bo_sung(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_tra_ve_bo_sung(uuid, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Cán bộ gửi lại sau khi bổ sung — về tay TCTH chấm lại (chốt (3))
--
--    Nội dung ý tưởng cán bộ đã tự sửa bằng quyền chủ sở hữu (RLS sẵn có);
--    hàm này chỉ chuyển trạng thái và ghi lời giải trình.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_gui_lai_bo_sung(_idea_id uuid, _ghi_chu text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_ghi_chu text := nullif(btrim(coalesce(_ghi_chu, '')), '');
  v_ten_nguoi text;
  v_n integer;
BEGIN
  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = _idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng';
  END IF;
  IF NOT (v_idea.created_by = auth.uid() OR public.is_content_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Chỉ người đề xuất (hoặc Phòng TCTH nhập hộ) gửi lại được ý tưởng này';
  END IF;
  IF v_ghi_chu IS NULL THEN
    RAISE EXCEPTION 'Cần ghi đã bổ sung những gì để người đánh giá lại khỏi đọc từ đầu';
  END IF;

  UPDATE public.portal_idea_awards
  SET trang_thai = 'da_bo_sung',
      bo_sung_luc = now(),
      bo_sung_ghi_chu = v_ghi_chu,
      so_lan_bo_sung = so_lan_bo_sung + 1
  WHERE idea_id = _idea_id AND cap_do = 'Bén rễ' AND trang_thai = 'tra_ve';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'Ý tưởng này không ở trạng thái chờ bổ sung';
  END IF;

  SELECT full_name INTO v_ten_nguoi FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  INSERT INTO public.portal_idea_comments (idea_id, user_id, user_name, body)
  VALUES (_idea_id, auth.uid(), coalesce(v_ten_nguoi, v_idea.proposer),
          '📝 Đã bổ sung và gửi lại: ' || v_ghi_chu);

  RETURN jsonb_build_object('ok', true, 've_trang_thai', 'da_bo_sung');
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_gui_lai_bo_sung(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_gui_lai_bo_sung(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Hồ sơ Bén rễ của CHÍNH TÔI — bảng tra cứu hiện «cần bổ sung» đúng chỗ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_ho_so_ben_re_cua_toi()
RETURNS TABLE (
  idea_id uuid,
  trang_thai text,
  tra_ve_boi text,
  ly_do_tra_ve text,
  tra_ve_luc timestamptz,
  so_lan_bo_sung smallint,
  bo_sung_luc timestamptz,
  bo_sung_ghi_chu text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.idea_id, a.trang_thai, a.tra_ve_boi, a.ly_do_tra_ve, a.tra_ve_luc,
         a.so_lan_bo_sung, a.bo_sung_luc, a.bo_sung_ghi_chu
  FROM public.portal_idea_awards a
  JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE a.cap_do = 'Bén rễ'
    AND i.created_by = auth.uid()
    AND public.is_staff(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_ho_so_ben_re_cua_toi() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_ho_so_ben_re_cua_toi() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Sổ Bén rễ đầy đủ — Giám đốc và TCTH nhìn theo nguồn công nhận
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_so_ben_re()
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
  ghi_nhan_kpi boolean,
  muc_thuong integer,
  tra_ve_boi text,
  ly_do_tra_ve text,
  tra_ve_luc timestamptz,
  so_lan_bo_sung smallint,
  bo_sung_luc timestamptz,
  nguoi_duyet text,
  duyet_luc timestamptz,
  nguoi_trinh text,
  trinh_luc timestamptz,
  smp_ma text,
  smp_trang_thai text,
  diem_tcth smallint,
  diem_gd smallint,
  y_kien_gd text,
  moc_gan_nhat timestamptz
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
             coalesce(a.bo_sung_luc, a.ghi_nhan_luc), coalesce(a.updated_at, a.ghi_nhan_luc))
  FROM public.portal_idea_awards a
  JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE a.cap_do = 'Bén rễ'
    AND (public.bhy_ideas_la_giam_doc() OR public.is_content_admin(auth.uid()))
  ORDER BY 27 DESC
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_so_ben_re() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_so_ben_re() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Ứng viên cho TCTH — trả thêm trạng thái sổ và vết trả về / bổ sung để màn
--    gom «Đã bổ sung — chờ đánh giá lại» lên đầu và đánh dấu «đang chờ cán bộ»
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.bhy_ideas_ung_vien_ben_re();

CREATE OR REPLACE FUNCTION public.bhy_ideas_ung_vien_ben_re()
RETURNS TABLE (
  idea_id uuid, title text, proposer text, phong text, current_status text, proposed_solution text,
  expected_benefits text, created_at timestamptz, development_level text, smp_trang_thai text,
  da_tung_tu_choi boolean, danh_gia_tcth jsonb, diem_tcth smallint, cap_de_xuat text, has_demo boolean,
  trang_thai_so text, tra_ve_boi text, ly_do_tra_ve text, tra_ve_luc timestamptz,
  bo_sung_luc timestamptz, bo_sung_ghi_chu text, so_lan_bo_sung smallint
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
    i.has_demo,
    a.trang_thai,
    a.tra_ve_boi, a.ly_do_tra_ve, a.tra_ve_luc,
    a.bo_sung_luc, a.bo_sung_ghi_chu, coalesce(a.so_lan_bo_sung, 0)
  FROM public.portal_ideas i
  LEFT JOIN public.portal_idea_awards a
    ON a.idea_id = i.id AND a.cap_do = 'Bén rễ'
  WHERE public.is_content_admin(auth.uid())
    AND coalesce(a.trang_thai, 'chua_co') NOT IN ('da_ghi_nhan', 'cho_gd_duyet')
  ORDER BY i.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_ung_vien_ben_re() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_ung_vien_ben_re() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Hàng chờ Giám đốc — trả thêm «trình lần n, đã bổ sung theo ý kiến …»
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.bhy_ideas_viec_cua_giam_doc();

CREATE OR REPLACE FUNCTION public.bhy_ideas_viec_cua_giam_doc()
RETURNS TABLE (
  idea_id uuid, title text, proposer text, expected_benefits text, current_status text,
  proposed_solution text, phong text, created_at timestamptz, trinh_luc timestamptz,
  nguoi_trinh text, ghi_chu text, so_ngay_cho integer, danh_gia_tcth jsonb, diem_tcth smallint,
  has_demo boolean, cap_de_xuat text, development_level text,
  so_lan_thu_hoi smallint, ly_do_thu_hoi text, thu_hoi_luc timestamptz,
  so_lan_bo_sung smallint, bo_sung_luc timestamptz, bo_sung_ghi_chu text,
  ly_do_tra_ve text, tra_ve_boi text
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
    a.thu_hoi_luc,
    a.so_lan_bo_sung, a.bo_sung_luc, a.bo_sung_ghi_chu,
    a.ly_do_tra_ve, a.tra_ve_boi
  FROM public.portal_idea_awards a
  JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE a.trang_thai = 'cho_gd_duyet'
    AND a.cap_do = 'Bén rễ'
    AND public.is_staff(auth.uid())
  ORDER BY a.ghi_nhan_luc
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_viec_cua_giam_doc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_viec_cua_giam_doc() TO authenticated, service_role;

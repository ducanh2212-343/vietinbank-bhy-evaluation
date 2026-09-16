-- ============================================================================
-- BHY Ideas — HỘI ĐỒNG: BỎ CÂU A4; BAN GIÁM ĐỐC KHÔNG ÁP NGUYÊN TẮC CÙNG PHÒNG
--
-- Chốt Giám đốc 16/09/2026 (bổ sung sau PR #166):
--  (a) Thành viên Hội đồng thuộc BAN GIÁM ĐỐC không áp nguyên tắc loại phiếu
--      cùng phòng / liên phòng — Ban Giám đốc phụ trách chung mọi phòng, loại
--      thì ý tưởng nào của Ban Giám đốc cũng mất ba phiếu. Vẫn không được tự
--      chấm ý tưởng mình đề xuất.
--  (b) BỎ HẲN câu A4 (tự khai xung đột lợi ích). Ai liên quan thì máy nhận
--      diện theo danh bạ và người đó KHÔNG chấm — không hỏi, không tích chọn.
--      Cột conflict_status giữ lại cho phiếu cũ, không còn bắt buộc khi gửi.
--  (c) Thưởng Lan tỏa chốt 2.000.000đ/ý tưởng (đã đúng trong bhy_ideas_hd_cong_bo).
-- ============================================================================

-- (a) Ban Giám đốc: chỉ chặn tự đề xuất, không chặn theo phòng
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_ly_do_khong_cham(_user_id uuid, _item_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_ten text;
  v_phong uuid;
  v_ma_phong text;
BEGIN
  SELECT i.* INTO v_idea
    FROM public.portal_idea_council_items it JOIN public.portal_ideas i ON i.id = it.idea_id
   WHERE it.id = _item_id;
  IF NOT FOUND THEN RETURN 'khong_ton_tai'; END IF;

  SELECT lower(btrim(coalesce(p.full_name, ''))), p.department_id, d.code
    INTO v_ten, v_phong, v_ma_phong
    FROM public.profiles p LEFT JOIN public.departments d ON d.id = p.department_id
   WHERE p.user_id = _user_id LIMIT 1;

  IF v_idea.created_by = _user_id THEN RETURN 'tu_de_xuat'; END IF;
  IF v_ten <> '' AND v_ten = ANY (
       SELECT lower(btrim(regexp_replace(x, '[.;,\s]+$', ''))) FROM unnest(string_to_array(v_idea.proposer, ',')) AS x
     ) THEN
    RETURN 'tu_de_xuat';
  END IF;

  -- Ban Giám đốc phụ trách chung — không áp nguyên tắc phòng (chốt 16/09/2026)
  IF v_ma_phong = 'BGD' THEN RETURN NULL; END IF;

  IF v_phong IS NOT NULL THEN
    IF v_phong = v_idea.phong_id THEN RETURN 'cung_phong'; END IF;
    IF v_phong = ANY (public.bhy_ideas_phong_lien_quan(v_idea.id)) THEN RETURN 'lien_phong'; END IF;
  END IF;
  RETURN NULL;
END $$;

-- (b) Gửi phiếu không cần A4 nữa
ALTER TABLE public.portal_idea_council_votes DROP CONSTRAINT IF EXISTS phieu_gui_du_du_lieu;
ALTER TABLE public.portal_idea_council_votes ADD CONSTRAINT phieu_gui_du_du_lieu CHECK (
  status = 'draft' OR (
    score_problem IS NOT NULL AND score_impact IS NOT NULL AND score_feasible IS NOT NULL
    AND score_safety IS NOT NULL AND score_scale IS NOT NULL AND recommendation IS NOT NULL
    AND (recommendation NOT IN ('khong_xet', 'can_bo_sung') OR btrim(coalesce(gop_y, '')) <> '')
  )
);
COMMENT ON COLUMN public.portal_idea_council_votes.conflict_status IS
  'Câu A4 tự khai — ĐÃ BỎ 16/09/2026. Xung đột lợi ích nay do máy nhận diện theo danh bạ (bhy_ideas_hd_ly_do_khong_cham) và người liên quan không chấm. Giữ cột cho phiếu cũ; phiếu mới để NULL.';

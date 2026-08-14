-- ============================================================================
-- Chấm điểm Hội đồng Bac Hung Yen Ideas — theo bộ câu hỏi Phụ lục 06 của quy
-- chế chương trình (mục VI: Hội đồng và phương thức chấm điểm).
--
-- Nghiệp vụ: hàng quý Phòng TCTH trình Hội đồng các ý tưởng đề xuất Cấp độ
-- Vươn cành / Lan tỏa. Mỗi thành viên Hội đồng chấm MỘT phiếu định danh cho
-- từng ý tưởng: khai xung đột lợi ích (A4), chấm 5 tiêu chí thang 1-5 (C1-C5),
-- nêu đề xuất (D1) và góp ý (D2 — bắt buộc khi Không xét thưởng/Cần bổ sung).
--
-- Bảo mật theo quy chế + chốt vận hành 08/2026 (ẩn danh CẢ với TCTH và BGĐ):
-- thành viên chỉ đọc được phiếu của MÌNH; phiếu ĐỊNH DANH chỉ System Admin
-- đọc trực tiếp; Admin TCTH tổng hợp/vận hành trên dữ liệu ẨN DANH qua hai
-- RPC (bhy_ideas_hd_phieu_an_danh, bhy_ideas_hd_dat_tham_khao); bản tổng hợp
-- (điểm TB, tỷ lệ đồng ý…) công bố cho thành viên qua RPC sau khi đợt chốt.
--
-- Mô hình 3 bảng, nối vào portal_ideas sẵn có:
--   portal_idea_council_rounds  đợt chấm (quý) — draft → open → closed
--   portal_idea_council_items   ý tưởng trình Hội đồng trong đợt (mã + tầng đề xuất)
--   portal_idea_council_votes   phiếu chấm của từng thành viên
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Thành viên Hội đồng theo quy chế: Ban Giám đốc; Trưởng/Phó phụ trách
--    phòng; lãnh đạo phụ trách Tổng hợp của Phòng TCTH. Ánh xạ sang vai trò
--    hiện có: bgd, pgd, manager, tcth_admin (+ system_admin để vận hành).
--    "Thành phần khác do Giám đốc quyết định" → cấp vai trò manager cho người đó.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_la_thanh_vien(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'bgd'::app_role)
      OR public.has_role(_user_id, 'pgd'::app_role)
      OR public.has_role(_user_id, 'manager'::app_role)
      OR public.has_role(_user_id, 'tcth_admin'::app_role)
      OR public.has_role(_user_id, 'system_admin'::app_role)
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_la_thanh_vien(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_la_thanh_vien(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1) Đợt chấm
-- ---------------------------------------------------------------------------
CREATE TABLE public.portal_idea_council_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  note TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_idea_council_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Council members can view idea council rounds"
  ON public.portal_idea_council_rounds FOR SELECT TO authenticated
  USING (public.bhy_ideas_hd_la_thanh_vien(auth.uid()));

CREATE POLICY "Content admins manage idea council rounds"
  ON public.portal_idea_council_rounds FOR ALL TO authenticated
  USING (public.is_content_admin(auth.uid()))
  WITH CHECK (public.is_content_admin(auth.uid()));

CREATE TRIGGER update_portal_idea_council_rounds_updated_at
  BEFORE UPDATE ON public.portal_idea_council_rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2) Ý tưởng trình Hội đồng trong đợt
--    FK sang portal_ideas KHÔNG cascade: ý tưởng đã trình Hội đồng thì chủ
--    phiếu không xóa được nữa (giữ hồ sơ chấm điểm); muốn xóa phải gỡ khỏi
--    đợt chấm trước (việc của TCTH).
-- ---------------------------------------------------------------------------
CREATE TABLE public.portal_idea_council_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.portal_idea_council_rounds(id) ON DELETE CASCADE,
  idea_id UUID NOT NULL REFERENCES public.portal_ideas(id) ON DELETE RESTRICT,
  -- Mã do TCTH cấp, ví dụ BHYI-2026-001 (Phụ lục 06 câu B1)
  idea_code TEXT NOT NULL,
  -- Tầng đề xuất xét thưởng (Phụ lục 06 câu B4 — TCTH ấn định khi trình).
  -- Ba tầng theo mô hình thưởng CỘNG DỒN (chốt vận hành 08/2026, văn bản sẽ
  -- cập nhật sau):
  --   'Vươn cành'          xét công nhận Vươn cành ở kỳ quý — thưởng 1M.
  --   'Lan tỏa'            KỲ XÉT LAN TỎA RIÊNG (đầu/cuối quý IV): nâng ý tưởng
  --                        ĐÃ đạt Vươn cành lên Lan tỏa — thưởng THÊM 2-3M
  --                        (ngoài 1M Vươn cành đã nhận trước đó).
  --   'Lan tỏa trực tiếp'  trường hợp đặc biệt xét thẳng Lan tỏa khi chưa qua
  --                        Vươn cành — mang dấu hiệu nhận diện riêng trên phiếu;
  --                        nếu đạt, thưởng GỘP cả hai mức (1M + 2-3M).
  proposed_tier TEXT NOT NULL CHECK (proposed_tier IN ('Vươn cành', 'Lan tỏa', 'Lan tỏa trực tiếp')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (round_id, idea_id),
  UNIQUE (round_id, idea_code)
);

CREATE INDEX idx_pic_items_round ON public.portal_idea_council_items (round_id);

ALTER TABLE public.portal_idea_council_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Council members can view idea council items"
  ON public.portal_idea_council_items FOR SELECT TO authenticated
  USING (public.bhy_ideas_hd_la_thanh_vien(auth.uid()));

CREATE POLICY "Content admins manage idea council items"
  ON public.portal_idea_council_items FOR ALL TO authenticated
  USING (public.is_content_admin(auth.uid()))
  WITH CHECK (public.is_content_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 3) Phiếu chấm — mỗi thành viên 1 phiếu/ý tưởng, sửa được khi đợt còn mở
-- ---------------------------------------------------------------------------
CREATE TABLE public.portal_idea_council_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.portal_idea_council_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  -- A4: khai báo xung đột lợi ích
  conflict_status TEXT NOT NULL CHECK (conflict_status IN ('khong', 'cung_phong', 'phoi_hop')),
  -- C1-C5: 5 tiêu chí thang 1-5
  score_problem  SMALLINT NOT NULL CHECK (score_problem  BETWEEN 1 AND 5), -- Đúng vấn đề
  score_impact   SMALLINT NOT NULL CHECK (score_impact   BETWEEN 1 AND 5), -- Hiệu quả/kết quả
  score_feasible SMALLINT NOT NULL CHECK (score_feasible BETWEEN 1 AND 5), -- Khả thi
  score_safety   SMALLINT NOT NULL CHECK (score_safety   BETWEEN 1 AND 5), -- An toàn/rủi ro
  score_scale    SMALLINT NOT NULL CHECK (score_scale    BETWEEN 1 AND 5), -- Nhân rộng/chuẩn hóa
  -- D1: đề xuất của thành viên
  recommendation TEXT NOT NULL CHECK (recommendation IN ('khong_xet', 'can_bo_sung', 'vuon_canh', 'lan_toa')),
  -- D2: bắt buộc khi Không xét thưởng / Cần bổ sung
  gop_y TEXT,
  -- Phiếu chỉ tính THAM KHẢO (không vào điểm TB chính thức) — Hội đồng quyết
  -- với phiếu có xung đột lợi ích ở ý tưởng Lan tỏa/ảnh hưởng lớn; TCTH gạt cờ.
  is_reference BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (item_id, user_id),
  CONSTRAINT gop_y_bat_buoc_khi_tu_choi
    CHECK (recommendation NOT IN ('khong_xet', 'can_bo_sung') OR btrim(coalesce(gop_y, '')) <> '')
);

CREATE INDEX idx_pic_votes_item ON public.portal_idea_council_votes (item_id);

ALTER TABLE public.portal_idea_council_votes ENABLE ROW LEVEL SECURITY;

-- Thành viên chỉ đọc phiếu của mình; phiếu ĐỊNH DANH toàn Hội đồng chỉ
-- System Admin đọc trực tiếp (ẩn danh cả với TCTH/BGĐ — TCTH tổng hợp qua
-- RPC bhy_ideas_hd_phieu_an_danh phía dưới)
CREATE POLICY "Members read own idea council votes"
  ON public.portal_idea_council_votes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "Members vote while round open"
  ON public.portal_idea_council_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.bhy_ideas_hd_la_thanh_vien(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.portal_idea_council_items it
      JOIN public.portal_idea_council_rounds r ON r.id = it.round_id
      WHERE it.id = item_id AND r.status = 'open'
    )
  );

CREATE POLICY "Members update own vote while round open"
  ON public.portal_idea_council_votes FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.portal_idea_council_items it
      JOIN public.portal_idea_council_rounds r ON r.id = it.round_id
      WHERE it.id = item_id AND r.status = 'open'
    )
  );

CREATE POLICY "Members delete own vote while round open"
  ON public.portal_idea_council_votes FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.portal_idea_council_items it
      JOIN public.portal_idea_council_rounds r ON r.id = it.round_id
      WHERE it.id = item_id AND r.status = 'open'
    )
  );

-- Chỉ System Admin được thao tác trực tiếp trên phiếu người khác; Admin TCTH
-- gạt cờ tham khảo qua RPC bhy_ideas_hd_dat_tham_khao (không thấy danh tính)
CREATE POLICY "System admins manage idea council votes"
  ON public.portal_idea_council_votes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role));

CREATE TRIGGER update_portal_idea_council_votes_updated_at
  BEFORE UPDATE ON public.portal_idea_council_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cột quản trị của phiếu (cờ tham khảo, danh tính) chỉ admin được đụng —
-- cùng nếp trigger chặn cột như portal_ideas (migration 20260811090000)
CREATE OR REPLACE FUNCTION public.f_pic_votes_chan_cot_quan_tri()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_content_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.is_reference := false;
    RETURN NEW;
  END IF;

  IF NEW.is_reference IS DISTINCT FROM OLD.is_reference
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.item_id IS DISTINCT FROM OLD.item_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cờ phiếu tham khảo và danh tính phiếu do Phòng TCTH quản lý';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.f_pic_votes_chan_cot_quan_tri() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_pic_votes_chan_cot_quan_tri
  BEFORE INSERT OR UPDATE ON public.portal_idea_council_votes
  FOR EACH ROW EXECUTE FUNCTION public.f_pic_votes_chan_cot_quan_tri();

-- ---------------------------------------------------------------------------
-- 4) RPC tổng hợp kết quả (Phụ lục 07) — KHÔNG lộ điểm từng thành viên.
--    Admin TCTH/System xem mọi lúc (theo dõi tiến độ); thành viên Hội đồng chỉ
--    xem sau khi đợt đã chốt. Điểm TB tính trên phiếu hợp lệ (không tham khảo);
--    góp ý trả về ẩn danh.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_tong_hop(_round_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round public.portal_idea_council_rounds%ROWTYPE;
  v_items jsonb;
BEGIN
  IF NOT public.bhy_ideas_hd_la_thanh_vien(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ thành viên Hội đồng Bac Hung Yen Ideas được xem tổng hợp';
  END IF;

  SELECT * INTO v_round FROM public.portal_idea_council_rounds WHERE id = _round_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đợt chấm';
  END IF;
  IF v_round.status <> 'closed' AND NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Kết quả tổng hợp chỉ công bố sau khi đợt chấm được chốt';
  END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'idea_code'), '[]'::jsonb) INTO v_items
  FROM (
    SELECT jsonb_build_object(
      'item_id', it.id,
      'idea_id', it.idea_id,
      'idea_code', it.idea_code,
      'proposed_tier', it.proposed_tier,
      'idea_title', i.title,
      'department_name', i.department_name,
      'idea_level', i.level,
      'proposer', i.proposer,
      'total_votes', count(v.id),
      'counted_votes', count(v.id) FILTER (WHERE NOT v.is_reference),
      'reference_votes', count(v.id) FILTER (WHERE v.is_reference),
      'avg_problem',  round(avg(v.score_problem)  FILTER (WHERE NOT v.is_reference), 2),
      'avg_impact',   round(avg(v.score_impact)   FILTER (WHERE NOT v.is_reference), 2),
      'avg_feasible', round(avg(v.score_feasible) FILTER (WHERE NOT v.is_reference), 2),
      'avg_safety',   round(avg(v.score_safety)   FILTER (WHERE NOT v.is_reference), 2),
      'avg_scale',    round(avg(v.score_scale)    FILTER (WHERE NOT v.is_reference), 2),
      -- Điểm TB chung = TB 5 tiêu chí (Phụ lục 07)
      'avg_overall', round((
          avg(v.score_problem)  FILTER (WHERE NOT v.is_reference)
        + avg(v.score_impact)   FILTER (WHERE NOT v.is_reference)
        + avg(v.score_feasible) FILTER (WHERE NOT v.is_reference)
        + avg(v.score_safety)   FILTER (WHERE NOT v.is_reference)
        + avg(v.score_scale)    FILTER (WHERE NOT v.is_reference)
      ) / 5, 2),
      -- Đồng ý Vươn cành tính cả phiếu đồng ý Lan tỏa (tầng cao hơn)
      'agree_vuon_canh', count(v.id) FILTER (WHERE NOT v.is_reference AND v.recommendation IN ('vuon_canh', 'lan_toa')),
      'agree_lan_toa',   count(v.id) FILTER (WHERE NOT v.is_reference AND v.recommendation = 'lan_toa'),
      'rec_khong_xet',   count(v.id) FILTER (WHERE NOT v.is_reference AND v.recommendation = 'khong_xet'),
      'rec_can_bo_sung', count(v.id) FILTER (WHERE NOT v.is_reference AND v.recommendation = 'can_bo_sung'),
      'rec_vuon_canh',   count(v.id) FILTER (WHERE NOT v.is_reference AND v.recommendation = 'vuon_canh'),
      'rec_lan_toa',     count(v.id) FILTER (WHERE NOT v.is_reference AND v.recommendation = 'lan_toa'),
      -- Góp ý ẩn danh (kể cả từ phiếu tham khảo) — phục vụ tổng hợp ý kiến
      'gop_y', coalesce(
        jsonb_agg(v.gop_y ORDER BY v.created_at) FILTER (WHERE btrim(coalesce(v.gop_y, '')) <> ''),
        '[]'::jsonb
      )
    ) AS x
    FROM public.portal_idea_council_items it
    JOIN public.portal_ideas i ON i.id = it.idea_id
    LEFT JOIN public.portal_idea_council_votes v ON v.item_id = it.id
    WHERE it.round_id = _round_id
    GROUP BY it.id, i.id
  ) t;

  RETURN jsonb_build_object(
    'round', jsonb_build_object('id', v_round.id, 'name', v_round.name, 'status', v_round.status),
    'items', v_items
  );
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_tong_hop(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_tong_hop(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Phiếu ẨN DANH cho Admin TCTH tổng hợp: đủ dữ liệu nghiệp vụ (xung đột,
--    điểm, đề xuất, góp ý, cờ tham khảo) nhưng KHÔNG danh tính và KHÔNG mốc
--    thời gian gửi (tránh suy ngược người chấm theo giờ). Sắp theo id (uuid
--    ngẫu nhiên) để thứ tự không tiết lộ trình tự gửi phiếu.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_phieu_an_danh(_round_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ballots jsonb;
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Admin TCTH / System Admin được xem phiếu ẩn danh';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'vote_id', v.id,
    'item_id', v.item_id,
    'conflict_status', v.conflict_status,
    'score_problem', v.score_problem,
    'score_impact', v.score_impact,
    'score_feasible', v.score_feasible,
    'score_safety', v.score_safety,
    'score_scale', v.score_scale,
    'recommendation', v.recommendation,
    'gop_y', v.gop_y,
    'is_reference', v.is_reference
  ) ORDER BY v.id), '[]'::jsonb) INTO v_ballots
  FROM public.portal_idea_council_votes v
  JOIN public.portal_idea_council_items it ON it.id = v.item_id
  WHERE it.round_id = _round_id;

  RETURN v_ballots;
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_phieu_an_danh(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_phieu_an_danh(uuid) TO authenticated, service_role;

-- Gạt cờ "tính tham khảo" theo quyết định Hội đồng — RPC chỉ đụng đúng cột
-- is_reference nên Admin TCTH thao tác được mà không cần (và không thể) đọc
-- hay sửa nội dung phiếu định danh.
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_dat_tham_khao(_vote_id uuid, _tham_khao boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Admin TCTH / System Admin được gạt cờ phiếu tham khảo';
  END IF;
  UPDATE public.portal_idea_council_votes
  SET is_reference = _tham_khao
  WHERE id = _vote_id;
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_dat_tham_khao(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_dat_tham_khao(uuid, boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Vá lỗi phát hiện khi rà soát BHY Ideas: bình luận ý tưởng gửi từ UI
--    (useIdeaComments.addComment) không kèm user_id, cột lại không có DEFAULT
--    → policy "Staff can comment as themselves" (user_id = auth.uid()) chặn
--    MỌI bình luận mới. Đặt DEFAULT auth.uid() để insert thiếu user_id vẫn
--    gán đúng người gửi (comment import từ Firebase do service_role ghi,
--    không qua policy này nên vẫn giữ được user_id NULL).
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_idea_comments ALTER COLUMN user_id SET DEFAULT auth.uid();

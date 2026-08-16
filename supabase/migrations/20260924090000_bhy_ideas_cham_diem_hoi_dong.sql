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
-- đọc trực tiếp; Admin TCTH tổng hợp/vận hành trên dữ liệu ẨN DANH qua RPC
-- bhy_ideas_hd_phieu_an_danh (chỉ sau khi đợt chốt); bản tổng hợp công bố
-- cho Hội đồng qua nút Công bố của Chủ tịch (embargo — mục 4). Tiến độ «ai
-- đã nộp» hiển thị TÊN THẬT cho TCTH đôn đốc nhưng không kèm điểm (mục 5c).
--
-- Nhiều cơ chế học từ Hội đồng đầu mối (CT3) đã vận hành thực tế: bảng thành
-- viên, phiếu 2 pha nháp/gửi, hạn bỏ phiếu + cron tự chốt + nhắc PUSH, chặn
-- tự chấm 2 lớp, phong tỏa kết quả tách khỏi chốt đợt.
--
-- Xung đột lợi ích (mục VI.4): thành viên KHAI BÁO trong phiếu (câu A4);
-- lời khai hiện trên phiếu ẩn danh để TCTH tổng hợp trình Hội đồng cân nhắc
-- khi kết luận. MỌI phiếu đều tính vào điểm — không có cơ chế loại phiếu
-- «tham khảo» (đã bỏ theo chốt vận hành: khi phiếu ẩn danh với cả TCTH thì
-- việc gạt loại từng phiếu không còn cơ sở thao tác minh bạch).
--
-- Mô hình 4 bảng, nối vào portal_ideas sẵn có:
--   portal_idea_council_members đội hình Hội đồng (GĐ quyết định từng thời kỳ)
--   portal_idea_council_rounds  đợt chấm (quý) — draft → open → closed + công bố
--   portal_idea_council_items   ý tưởng trình Hội đồng trong đợt (mã + tầng đề xuất)
--   portal_idea_council_votes   phiếu chấm của từng thành viên (nháp → gửi)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Thành viên Hội đồng là BẢNG DỮ LIỆU (học từ council_members của Hội đồng
--    đầu mối đã vận hành thực tế) thay vì suy từ vai trò: quy chế cho Giám đốc
--    quyết định thành phần từng thời kỳ, người nghỉ dài hạn tắt is_active,
--    và có mẫu số chính danh để tính quorum 2/3.
--    is_chair = Chủ tịch Hội đồng (Giám đốc CN) — được vượt khóa xem tổng hợp
--    ẩn danh khi đợt đang chấm và được bấm công bố kết quả.
-- ---------------------------------------------------------------------------
CREATE TABLE public.portal_idea_council_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_chair BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_idea_council_members ENABLE ROW LEVEL SECURITY;

-- Thành viên đọc được DÒNG CỦA MÌNH (để client biết mình thuộc Hội đồng/là
-- Chủ tịch); danh sách đầy đủ chỉ Admin TCTH/System đọc (phục vụ đôn đốc).
CREATE POLICY "Members read own idea council membership"
  ON public.portal_idea_council_members FOR SELECT TO authenticated
  USING (profile_id = public.get_my_profile_id() OR public.is_content_admin(auth.uid()));

CREATE POLICY "Content admins manage idea council members"
  ON public.portal_idea_council_members FOR ALL TO authenticated
  USING (public.is_content_admin(auth.uid()))
  WITH CHECK (public.is_content_admin(auth.uid()));

CREATE TRIGGER update_portal_idea_council_members_updated_at
  BEFORE UPDATE ON public.portal_idea_council_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed từ Hội đồng đầu mối đang vận hành (thành phần gần trùng quy chế Ideas:
-- BGĐ + Trưởng/Phó phụ trách phòng + đầu mối TCTH); Giám đốc → Chủ tịch.
-- TCTH điều chỉnh tiếp ở khung quản trị.
INSERT INTO public.portal_idea_council_members (profile_id, is_chair, note)
SELECT cm.profile_id, cm.member_group = 'giam_doc', cm.note
FROM public.council_members cm
WHERE cm.is_active
ON CONFLICT (profile_id) DO NOTHING;

-- Thành viên Hội đồng đang hoạt động (tra theo auth user id)
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_la_thanh_vien(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_idea_council_members m
    JOIN public.profiles p ON p.id = m.profile_id
    WHERE p.user_id = _user_id AND m.is_active
  )
$$;

-- Chủ tịch Hội đồng (Giám đốc CN)
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_la_chu_tich(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_idea_council_members m
    JOIN public.profiles p ON p.id = m.profile_id
    WHERE p.user_id = _user_id AND m.is_active AND m.is_chair
  )
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_la_thanh_vien(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_la_thanh_vien(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.bhy_ideas_hd_la_chu_tich(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_la_chu_tich(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1) Đợt chấm
-- ---------------------------------------------------------------------------
CREATE TABLE public.portal_idea_council_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  note TEXT,
  -- Hạn gửi phiếu: cron notify-idea-council nhắc PUSH khi còn <=3 ngày và tự
  -- chuyển 'open' -> 'closed' khi quá hạn (bài học voting_deadline của Hội
  -- đồng đầu mối). NULL = không đặt hạn, TCTH chốt tay.
  voting_deadline TIMESTAMP WITH TIME ZONE,
  -- Công bố kết quả TÁCH RIÊNG khỏi chốt đợt (bài học results_embargo):
  -- chưa công bố thì chỉ Chủ tịch + Quản trị hệ thống xem được tổng hợp;
  -- nút công bố qua RPC bhy_ideas_hd_cong_bo (TCTH không tự công bố).
  results_published BOOLEAN NOT NULL DEFAULT false,
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
-- 3) Phiếu chấm — mỗi thành viên 1 phiếu/ý tưởng, HAI PHA nháp -> gửi (như
--    Hội đồng đầu mối): nháp lưu dở được (cột nghiệp vụ nullable), chỉ phiếu
--    'submitted' mới vào tổng hợp; sửa được đến khi đợt chốt.
-- ---------------------------------------------------------------------------
CREATE TABLE public.portal_idea_council_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.portal_idea_council_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  -- A4: khai báo xung đột lợi ích
  conflict_status TEXT CHECK (conflict_status IN ('khong', 'cung_phong', 'phoi_hop')),
  -- C1-C5: 5 tiêu chí thang 1-5
  score_problem  SMALLINT CHECK (score_problem  BETWEEN 1 AND 5), -- Đúng vấn đề
  score_impact   SMALLINT CHECK (score_impact   BETWEEN 1 AND 5), -- Hiệu quả/kết quả
  score_feasible SMALLINT CHECK (score_feasible BETWEEN 1 AND 5), -- Khả thi
  score_safety   SMALLINT CHECK (score_safety   BETWEEN 1 AND 5), -- An toàn/rủi ro
  score_scale    SMALLINT CHECK (score_scale    BETWEEN 1 AND 5), -- Nhân rộng/chuẩn hóa
  -- D1: đề xuất của thành viên
  recommendation TEXT CHECK (recommendation IN ('khong_xet', 'can_bo_sung', 'vuon_canh', 'lan_toa')),
  -- D2: bắt buộc khi Không xét thưởng / Cần bổ sung
  gop_y TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (item_id, user_id),
  -- Phiếu GỬI phải đủ toàn bộ câu trả lời + góp ý khi từ chối/yêu cầu bổ sung
  CONSTRAINT phieu_gui_du_du_lieu CHECK (
    status = 'draft' OR (
      conflict_status IS NOT NULL
      AND score_problem IS NOT NULL AND score_impact IS NOT NULL AND score_feasible IS NOT NULL
      AND score_safety IS NOT NULL AND score_scale IS NOT NULL
      AND recommendation IS NOT NULL
      AND (recommendation NOT IN ('khong_xet', 'can_bo_sung') OR btrim(coalesce(gop_y, '')) <> '')
    )
  )
);

CREATE INDEX idx_pic_votes_item ON public.portal_idea_council_votes (item_id);

ALTER TABLE public.portal_idea_council_votes ENABLE ROW LEVEL SECURITY;

-- Thành viên chỉ đọc phiếu của mình; phiếu ĐỊNH DANH toàn Hội đồng chỉ
-- System Admin đọc trực tiếp (ẩn danh cả với TCTH/BGĐ — TCTH tổng hợp qua
-- RPC bhy_ideas_hd_phieu_an_danh phía dưới)
CREATE POLICY "Members read own idea council votes"
  ON public.portal_idea_council_votes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'system_admin'::app_role));

-- Chặn tự chấm ý tưởng của mình HAI LỚP (bài học 20260707180000 của Hội đồng
-- đầu mối — từng bị lách 1 lần): theo tài khoản gửi phiếu (created_by) VÀ theo
-- họ tên trong nhóm đề xuất (so khớp danh sách tách dấu phẩy, chuẩn hóa
-- lowercase/trim). Cùng PHÒNG đề xuất thì vẫn chấm + khai A4.
CREATE POLICY "Members vote while round open"
  ON public.portal_idea_council_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.bhy_ideas_hd_la_thanh_vien(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.portal_idea_council_items it
      JOIN public.portal_idea_council_rounds r ON r.id = it.round_id
      JOIN public.portal_ideas i ON i.id = it.idea_id
      WHERE it.id = item_id AND r.status = 'open'
        AND i.created_by <> auth.uid()
        AND NOT (
          lower(btrim(coalesce(
            (SELECT p.full_name FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1), ''
          ))) = ANY (
            SELECT lower(btrim(x)) FROM unnest(string_to_array(i.proposer, ',')) AS x
          )
        )
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

-- Chỉ NHÁP của mình mới tự xóa được khi đợt mở (như tờ giấy nháp cá nhân —
-- bài học 20260707110000); phiếu đã gửi chỉ System Admin xóa.
CREATE POLICY "Members delete own draft while round open"
  ON public.portal_idea_council_votes FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.portal_idea_council_items it
      JOIN public.portal_idea_council_rounds r ON r.id = it.round_id
      WHERE it.id = item_id AND r.status = 'open'
    )
  );

-- Chỉ System Admin được thao tác trực tiếp trên phiếu người khác
CREATE POLICY "System admins manage idea council votes"
  ON public.portal_idea_council_votes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role));

CREATE TRIGGER update_portal_idea_council_votes_updated_at
  BEFORE UPDATE ON public.portal_idea_council_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mốc gửi phiếu do DB đóng dấu: đặt khi chuyển sang 'submitted', xóa khi lùi
-- về nháp — client không tự khai được.
CREATE OR REPLACE FUNCTION public.f_pic_votes_dau_moc_gui()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'submitted' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted' THEN
      NEW.submitted_at := now();
    ELSE
      NEW.submitted_at := OLD.submitted_at;
    END IF;
  ELSE
    NEW.submitted_at := NULL;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.f_pic_votes_dau_moc_gui() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_pic_votes_dau_moc_gui
  BEFORE INSERT OR UPDATE ON public.portal_idea_council_votes
  FOR EACH ROW EXECUTE FUNCTION public.f_pic_votes_dau_moc_gui();

-- Danh tính và mốc gửi của phiếu là bất biến với người chấm —
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
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.item_id IS DISTINCT FROM OLD.item_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Danh tính và mốc gửi của phiếu không tự sửa được';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.f_pic_votes_chan_cot_quan_tri() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_pic_votes_chan_cot_quan_tri
  BEFORE INSERT OR UPDATE ON public.portal_idea_council_votes
  FOR EACH ROW EXECUTE FUNCTION public.f_pic_votes_chan_cot_quan_tri();

-- ---------------------------------------------------------------------------
-- 4) RPC tổng hợp kết quả (Phụ lục 07) — KHÔNG lộ điểm từng thành viên, chỉ
--    tính phiếu ĐÃ GỬI. Phong tỏa kết quả kiểu Hội đồng đầu mối
--    (results_embargo): chưa công bố thì CHỈ Chủ tịch Hội đồng + Quản trị hệ
--    thống xem được — Admin TCTH cũng phải chờ công bố vì chính họ là người
--    chấm (nhìn điểm giữa chừng ảnh hưởng khách quan).
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
  IF NOT (public.bhy_ideas_hd_la_thanh_vien(auth.uid()) OR public.is_content_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Chỉ thành viên Hội đồng Bac Hung Yen Ideas được xem tổng hợp';
  END IF;

  SELECT * INTO v_round FROM public.portal_idea_council_rounds WHERE id = _round_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đợt chấm';
  END IF;
  IF NOT v_round.results_published
     AND NOT public.has_role(auth.uid(), 'system_admin'::app_role)
     AND NOT public.bhy_ideas_hd_la_chu_tich(auth.uid()) THEN
    RAISE EXCEPTION 'Kết quả đợt này chưa được công bố — Chủ tịch Hội đồng sẽ mở kết quả sau khi đợt chấm hoàn tất';
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
      -- Mẫu số quorum: thành viên đang hoạt động đủ điều kiện chấm ý tưởng này
      -- (trừ người bị chặn tự chấm — cùng logic với policy INSERT phiếu)
      'eligible_members', (
        SELECT count(*)
        FROM public.portal_idea_council_members m
        JOIN public.profiles p ON p.id = m.profile_id
        WHERE m.is_active
          AND p.user_id IS DISTINCT FROM i.created_by
          AND NOT (lower(btrim(coalesce(p.full_name, ''))) = ANY (
            SELECT lower(btrim(x)) FROM unnest(string_to_array(i.proposer, ',')) AS x
          ))
      ),
      'avg_problem',  round(avg(v.score_problem), 2),
      'avg_impact',   round(avg(v.score_impact), 2),
      'avg_feasible', round(avg(v.score_feasible), 2),
      'avg_safety',   round(avg(v.score_safety), 2),
      'avg_scale',    round(avg(v.score_scale), 2),
      -- Điểm TB chung = TB 5 tiêu chí (Phụ lục 07)
      'avg_overall', round((
          avg(v.score_problem)
        + avg(v.score_impact)
        + avg(v.score_feasible)
        + avg(v.score_safety)
        + avg(v.score_scale)
      ) / 5, 2),
      -- Số phiếu có khai xung đột lợi ích (A4 ≠ Không) — Hội đồng tham chiếu khi kết luận
      'conflict_votes', count(v.id) FILTER (WHERE v.conflict_status <> 'khong'),
      -- Đồng ý Vươn cành tính cả phiếu đồng ý Lan tỏa (tầng cao hơn)
      'agree_vuon_canh', count(v.id) FILTER (WHERE v.recommendation IN ('vuon_canh', 'lan_toa')),
      'agree_lan_toa',   count(v.id) FILTER (WHERE v.recommendation = 'lan_toa'),
      'rec_khong_xet',   count(v.id) FILTER (WHERE v.recommendation = 'khong_xet'),
      'rec_can_bo_sung', count(v.id) FILTER (WHERE v.recommendation = 'can_bo_sung'),
      'rec_vuon_canh',   count(v.id) FILTER (WHERE v.recommendation = 'vuon_canh'),
      'rec_lan_toa',     count(v.id) FILTER (WHERE v.recommendation = 'lan_toa'),
      -- Góp ý ẩn danh — phục vụ tổng hợp ý kiến
      'gop_y', coalesce(
        jsonb_agg(v.gop_y ORDER BY v.created_at) FILTER (WHERE btrim(coalesce(v.gop_y, '')) <> ''),
        '[]'::jsonb
      )
    ) AS x
    FROM public.portal_idea_council_items it
    JOIN public.portal_ideas i ON i.id = it.idea_id
    LEFT JOIN public.portal_idea_council_votes v
      ON v.item_id = it.id AND v.status = 'submitted'
    WHERE it.round_id = _round_id
    GROUP BY it.id, i.id
  ) t;

  RETURN jsonb_build_object(
    'round', jsonb_build_object(
      'id', v_round.id, 'name', v_round.name, 'status', v_round.status,
      'results_published', v_round.results_published
    ),
    'items', v_items
  );
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_tong_hop(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_tong_hop(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Phiếu ẨN DANH cho Admin TCTH tổng hợp: đủ dữ liệu nghiệp vụ (xung đột,
--    điểm, đề xuất, góp ý) nhưng KHÔNG danh tính và KHÔNG mốc thời gian gửi
--    (tránh suy ngược người chấm theo giờ). Sắp theo id (uuid ngẫu nhiên) để
--    thứ tự không tiết lộ trình tự gửi phiếu.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_phieu_an_danh(_round_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_ballots jsonb;
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Admin TCTH / System Admin được xem phiếu ẩn danh';
  END IF;

  SELECT r.status INTO v_status FROM public.portal_idea_council_rounds r WHERE r.id = _round_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đợt chấm';
  END IF;
  -- TCTH chỉ xem phiếu (ẩn danh) SAU khi đợt chốt — đang chấm mà nhìn điểm
  -- giữa chừng thì mất khách quan (chính TCTH cũng chấm). System Admin xem mọi lúc.
  IF v_status <> 'closed' AND NOT public.has_role(auth.uid(), 'system_admin'::app_role) THEN
    RAISE EXCEPTION 'Phiếu ẩn danh chỉ xem được sau khi đợt chấm đã chốt';
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
    'gop_y', v.gop_y
  ) ORDER BY v.id), '[]'::jsonb) INTO v_ballots
  FROM public.portal_idea_council_votes v
  JOIN public.portal_idea_council_items it ON it.id = v.item_id
  WHERE it.round_id = _round_id AND v.status = 'submitted';

  RETURN v_ballots;
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_phieu_an_danh(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_phieu_an_danh(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5b) Công bố / khóa kết quả — quyền của Chủ tịch Hội đồng + Quản trị hệ thống
--     (đúng nếp set_council_results_published của Hội đồng đầu mối: TCTH
--     không tự công bố).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_cong_bo(_round_id uuid, _published boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role)
          OR public.bhy_ideas_hd_la_chu_tich(auth.uid())) THEN
    RAISE EXCEPTION 'Chỉ Chủ tịch Hội đồng hoặc Quản trị hệ thống được công bố/khóa kết quả';
  END IF;
  UPDATE public.portal_idea_council_rounds
  SET results_published = _published
  WHERE id = _round_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đợt chấm';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_cong_bo(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_cong_bo(uuid, boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5c) Tiến độ chấm cho việc ĐÔN ĐỐC (Admin TCTH + Chủ tịch): hiển thị TÊN
--     THẬT kèm trạng thái đã gửi/nháp/còn thiếu — nhưng TUYỆT ĐỐI không kèm
--     điểm (tách «ai đã nộp» khỏi «ai chấm bao nhiêu» — bài học
--     CouncilProgressTab của Hội đồng đầu mối). Đây đúng mục đích quy chế:
--     "kiểm soát số lượt chấm, đánh giá mức độ tham gia".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_tien_do(_round_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round public.portal_idea_council_rounds%ROWTYPE;
  v_members jsonb;
  v_total_items integer;
BEGIN
  IF NOT (public.is_content_admin(auth.uid()) OR public.bhy_ideas_hd_la_chu_tich(auth.uid())) THEN
    RAISE EXCEPTION 'Chỉ Admin TCTH / Chủ tịch Hội đồng được xem tiến độ chấm';
  END IF;

  SELECT * INTO v_round FROM public.portal_idea_council_rounds WHERE id = _round_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đợt chấm';
  END IF;

  SELECT count(*) INTO v_total_items
  FROM public.portal_idea_council_items it WHERE it.round_id = _round_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'profile_id', m.profile_id,
    'full_name', p.full_name,
    'is_chair', m.is_chair,
    -- Số ý tưởng thành viên này ĐƯỢC chấm (trừ ý tưởng bị chặn tự chấm)
    'expected', (
      SELECT count(*)
      FROM public.portal_idea_council_items it
      JOIN public.portal_ideas i ON i.id = it.idea_id
      WHERE it.round_id = _round_id
        AND i.created_by IS DISTINCT FROM p.user_id
        AND NOT (lower(btrim(coalesce(p.full_name, ''))) = ANY (
          SELECT lower(btrim(x)) FROM unnest(string_to_array(i.proposer, ',')) AS x
        ))
    ),
    'submitted', (
      SELECT count(*)
      FROM public.portal_idea_council_votes v
      JOIN public.portal_idea_council_items it ON it.id = v.item_id
      WHERE it.round_id = _round_id AND v.user_id = p.user_id AND v.status = 'submitted'
    ),
    'draft', (
      SELECT count(*)
      FROM public.portal_idea_council_votes v
      JOIN public.portal_idea_council_items it ON it.id = v.item_id
      WHERE it.round_id = _round_id AND v.user_id = p.user_id AND v.status = 'draft'
    ),
    -- Mã các ý tưởng còn thiếu phiếu gửi — để lời nhắc push nói đúng việc
    'pending_codes', (
      SELECT coalesce(jsonb_agg(it.idea_code ORDER BY it.idea_code), '[]'::jsonb)
      FROM public.portal_idea_council_items it
      JOIN public.portal_ideas i ON i.id = it.idea_id
      WHERE it.round_id = _round_id
        AND i.created_by IS DISTINCT FROM p.user_id
        AND NOT (lower(btrim(coalesce(p.full_name, ''))) = ANY (
          SELECT lower(btrim(x)) FROM unnest(string_to_array(i.proposer, ',')) AS x
        ))
        AND NOT EXISTS (
          SELECT 1 FROM public.portal_idea_council_votes v
          WHERE v.item_id = it.id AND v.user_id = p.user_id AND v.status = 'submitted'
        )
    )
  ) ORDER BY p.full_name), '[]'::jsonb) INTO v_members
  FROM public.portal_idea_council_members m
  JOIN public.profiles p ON p.id = m.profile_id
  WHERE m.is_active;

  RETURN jsonb_build_object(
    'round', jsonb_build_object(
      'id', v_round.id, 'name', v_round.name, 'status', v_round.status,
      'voting_deadline', v_round.voting_deadline,
      'results_published', v_round.results_published
    ),
    'total_items', v_total_items,
    'members', v_members
  );
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_tien_do(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_tien_do(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5d) Cron nhắc PUSH + tự chốt đợt quá hạn (đúng nếp ct2-nhip: pg_cron gọi
--     edge function notify-idea-council bằng service key trong Vault).
--     '0 2 * * 1-5' = 09:00 giờ VN, thứ Hai–thứ Sáu. Chi tiết nghiệp vụ nằm
--     trong function: quá voting_deadline → chuyển closed; còn <=3 ngày →
--     push nhắc thành viên chưa gửi đủ phiếu. KHÔNG gửi email (chốt 08/2026).
-- ---------------------------------------------------------------------------
SELECT cron.schedule(
  'bhy-ideas-hoi-dong-nhac',
  '0 2 * * 1-5',
  $$
    select net.http_post(
      url := 'https://whlysprzsguehxmrjwha.supabase.co/functions/v1/notify-idea-council',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                      where name = 'email_queue_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{"mode": "cron", "dry_run": false}'::jsonb
    );
  $$
);

-- ---------------------------------------------------------------------------
-- 6) Vá lỗi phát hiện khi rà soát BHY Ideas: bình luận ý tưởng gửi từ UI
--    (useIdeaComments.addComment) không kèm user_id, cột lại không có DEFAULT
--    → policy "Staff can comment as themselves" (user_id = auth.uid()) chặn
--    MỌI bình luận mới. Đặt DEFAULT auth.uid() để insert thiếu user_id vẫn
--    gán đúng người gửi (comment import từ Firebase do service_role ghi,
--    không qua policy này nên vẫn giữ được user_id NULL).
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_idea_comments ALTER COLUMN user_id SET DEFAULT auth.uid();

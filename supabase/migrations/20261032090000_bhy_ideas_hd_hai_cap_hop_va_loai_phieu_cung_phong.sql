-- ============================================================================
-- BHY Ideas — HỘI ĐỒNG: HAI CẤP HỌP, LOẠI PHIẾU CÙNG PHÒNG, ĐIỂM DANH, CÔNG BỐ
-- TỰ GHI SỔ, RÚT Ý TƯỞNG CÓ BÁO, KHỚP PHÒNG Ý TƯỞNG VỚI DANH MỤC
--
-- Chốt của Giám đốc sau đợt Hội đồng đầu tiên (16/09/2026), từng điểm:
--
--  (a) Phiếu của thành viên THUỘC PHÒNG ĐỀ XUẤT bị loại; ý tưởng liên phòng thì
--      thành viên thuộc phòng có cán bộ đồng đề xuất cũng bị loại. Loại khỏi cả
--      điểm trung bình lẫn mẫu số quorum. Suy từ DANH BẠ (phòng của người chấm,
--      phòng của từng người đề xuất) — không dựa vào câu A4 tự khai, vì đợt
--      đầu cho thấy A4 khai tay có 2 phiếu sót và 14 phiếu bấm nhầm.
--  (b) Hai cấp họp tách bạch: đợt XÉT VƯƠN CÀNH và đợt XÉT LAN TỎA. KHÔNG xét
--      vượt cấp khi chưa qua Hội đồng (quy chế). Lan tỏa chỉ xét ý tưởng đã
--      được công nhận Vươn cành tối thiểu 30 ngày. TCTH mở đợt, Chủ tịch quyết
--      thời điểm.
--  (c) Công bố kết quả là TỰ ĐỘNG ghi sổ thưởng, nâng cấp độ ý tưởng, báo chủ ý
--      tưởng — giống lúc Giám đốc duyệt Bén rễ — để ngân sách tự tính. Trước
--      đây kết luận Hội đồng chỉ là chữ trên màn tổng hợp, sổ có 0 dòng Vươn
--      cành sau khi Hội đồng đã chấm xong 19 ý tưởng.
--  (d) Thành viên vắng / đến giữa phiên: ĐIỂM DANH theo đợt hoặc theo phiên
--      trình bày, có lý do, thay cho bật/tắt «Hoạt động» thủ công (đã có ca
--      quên bật lại là rủi ro thật).
--  (e) Rút ý tưởng khỏi đợt: ghi lý do, báo push cho chủ ý tưởng. Ca BHYI-017
--      rút để hoàn thiện mà tác giả không được báo gì.
--  (f) Ý tưởng gắn mã phòng theo danh mục phòng ban của BHY One thay vì chỉ
--      giữ tên phòng bằng chữ.
--
-- Migration CHỈ CỘNG THÊM. Không sửa, không xóa phiếu nào của đợt đang chốt.
-- ============================================================================

-- ============================================================================
-- 1) Ý TƯỞNG GẮN MÃ PHÒNG THEO DANH MỤC
-- ============================================================================
ALTER TABLE public.portal_ideas
  ADD COLUMN IF NOT EXISTS phong_id uuid REFERENCES public.departments(id);
CREATE INDEX IF NOT EXISTS idx_portal_ideas_phong ON public.portal_ideas (phong_id);

-- Tên phòng trên ý tưởng là nhãn rút gọn của Ideas ('Phòng TCTH'); danh mục ghi
-- tên đầy đủ ('Phòng Tổ chức Tổng hợp'). Bảng ánh xạ đã có sẵn: hàm
-- bhy_phong_ideas_sang_ho_so (đối xứng với HO_SO_PHONG_SANG_IDEAS ở client).
UPDATE public.portal_ideas i
   SET phong_id = d.id
  FROM public.departments d
 WHERE i.phong_id IS NULL
   AND d.name = public.bhy_phong_ideas_sang_ho_so(i.department_name);

-- Ý tưởng mới gửi tự gắn mã phòng; đổi tên phòng thì gắn lại. Form không phải
-- biết gì về mã — chỉ cần tiếp tục gửi department_name như trước.
CREATE OR REPLACE FUNCTION public.f_portal_ideas_gan_phong_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.phong_id IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.department_name IS DISTINCT FROM OLD.department_name) THEN
    SELECT d.id INTO NEW.phong_id
      FROM public.departments d
     WHERE d.name = public.bhy_phong_ideas_sang_ho_so(NEW.department_name)
     LIMIT 1;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_portal_ideas_gan_phong_id ON public.portal_ideas;
CREATE TRIGGER trg_portal_ideas_gan_phong_id
  BEFORE INSERT OR UPDATE ON public.portal_ideas
  FOR EACH ROW EXECUTE FUNCTION public.f_portal_ideas_gan_phong_id();

-- Các phòng LIÊN QUAN tới một ý tưởng: phòng đề xuất + phòng của từng người
-- đề xuất (theo danh sách tên tách dấu phẩy). Tên chỉ được dùng khi khớp ĐÚNG
-- MỘT hồ sơ — chi nhánh có ba «Nguyễn Thị Phượng» ở hai phòng khác nhau, khớp
-- mù là loại oan phiếu của phòng không liên quan. Dấu chấm/chấm phẩy cuối tên
-- (cán bộ gõ «Ngô Thị Nhung.») được bỏ trước khi so.
CREATE OR REPLACE FUNCTION public.bhy_ideas_phong_lien_quan(_idea_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ten AS (
    SELECT lower(btrim(regexp_replace(x, '[.;,\s]+$', ''))) AS ten
    FROM public.portal_ideas i, unnest(string_to_array(i.proposer, ',')) AS x
    WHERE i.id = _idea_id AND btrim(x) <> ''
  ),
  khop AS (
    SELECT t.ten,
           (SELECT count(*) FROM public.profiles p WHERE lower(btrim(p.full_name)) = t.ten) AS n,
           (SELECT p.department_id FROM public.profiles p WHERE lower(btrim(p.full_name)) = t.ten LIMIT 1) AS phong
    FROM ten t
  )
  SELECT coalesce(array_agg(DISTINCT phong), '{}'::uuid[])
  FROM (
    SELECT i.phong_id AS phong FROM public.portal_ideas i WHERE i.id = _idea_id AND i.phong_id IS NOT NULL
    UNION
    SELECT k.phong FROM khop k WHERE k.n = 1 AND k.phong IS NOT NULL
  ) t
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_phong_lien_quan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_phong_lien_quan(uuid) TO authenticated, service_role;

-- ============================================================================
-- 2) ĐIỂM DANH — vắng cả đợt hoặc vắng một phiên trình bày
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.portal_idea_council_vang (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.portal_idea_council_rounds(id) ON DELETE CASCADE,
  -- NULL = vắng cả đợt; có giá trị = chỉ vắng phiên đó (đến muộn / về sớm)
  phien_id uuid REFERENCES public.portal_idea_council_sessions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ly_do text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Một người chỉ có một dòng vắng cho mỗi (đợt, phiên). NULL của phiên_id phải
-- được coi là một giá trị nên không dùng UNIQUE thường.
CREATE UNIQUE INDEX IF NOT EXISTS uq_picv_mot_dong
  ON public.portal_idea_council_vang (round_id, profile_id, coalesce(phien_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.portal_idea_council_vang ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_idea_council_vang FROM anon;
DROP POLICY IF EXISTS "Council members can view idea council absences" ON public.portal_idea_council_vang;
CREATE POLICY "Council members can view idea council absences"
  ON public.portal_idea_council_vang FOR SELECT
  USING (public.bhy_ideas_hd_la_thanh_vien(auth.uid()));
DROP POLICY IF EXISTS "Content admins manage idea council absences" ON public.portal_idea_council_vang;
CREATE POLICY "Content admins manage idea council absences"
  ON public.portal_idea_council_vang FOR ALL
  USING (public.is_content_admin(auth.uid()))
  WITH CHECK (public.is_content_admin(auth.uid()));

-- ============================================================================
-- 3) AI ĐƯỢC CHẤM, AI TRONG MẪU SỐ — một nguồn duy nhất cho mọi hàm bên dưới
-- ============================================================================

-- Phiếu HỢP LỆ: không phải người gửi ý tưởng, không có tên trong nhóm đề xuất,
-- và KHÔNG thuộc phòng liên quan (chốt 16/09/2026). Dùng cho tử số, cho RLS
-- gửi phiếu, và cho giao diện báo trước «bạn không chấm ý tưởng này».
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_ly_do_khong_cham(_user_id uuid, _item_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.portal_ideas%ROWTYPE;
  v_ten text;
  v_phong uuid;
BEGIN
  SELECT i.* INTO v_idea
    FROM public.portal_idea_council_items it JOIN public.portal_ideas i ON i.id = it.idea_id
   WHERE it.id = _item_id;
  IF NOT FOUND THEN RETURN 'khong_ton_tai'; END IF;

  SELECT lower(btrim(coalesce(p.full_name, ''))), p.department_id INTO v_ten, v_phong
    FROM public.profiles p WHERE p.user_id = _user_id LIMIT 1;

  IF v_idea.created_by = _user_id THEN RETURN 'tu_de_xuat'; END IF;
  IF v_ten <> '' AND v_ten = ANY (
       SELECT lower(btrim(regexp_replace(x, '[.;,\s]+$', ''))) FROM unnest(string_to_array(v_idea.proposer, ',')) AS x
     ) THEN
    RETURN 'tu_de_xuat';
  END IF;
  IF v_phong IS NOT NULL THEN
    IF v_phong = v_idea.phong_id THEN RETURN 'cung_phong'; END IF;
    IF v_phong = ANY (public.bhy_ideas_phong_lien_quan(v_idea.id)) THEN RETURN 'lien_phong'; END IF;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_hd_ly_do_khong_cham(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_ly_do_khong_cham(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_phieu_hop_le(_user_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.bhy_ideas_hd_ly_do_khong_cham(_user_id, _item_id) IS NULL $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_hd_phieu_hop_le(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_phieu_hop_le(uuid, uuid) TO authenticated, service_role;

-- Có VẮNG ở ý tưởng này không: vắng cả đợt, hoặc vắng đúng phiên chứa ý tưởng.
-- Người đã GỬI phiếu cho ý tưởng thì không tính vắng dù có dòng điểm danh —
-- có phiếu tức là có mặt, và tử số không được lớn hơn mẫu số.
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_vang(_profile_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_idea_council_items it
    JOIN public.portal_idea_council_vang v
      ON v.round_id = it.round_id AND v.profile_id = _profile_id
     AND (v.phien_id IS NULL OR v.phien_id = it.phien_id)
    WHERE it.id = _item_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.portal_idea_council_votes vo
    JOIN public.profiles p ON p.user_id = vo.user_id
    WHERE vo.item_id = _item_id AND p.id = _profile_id AND vo.status = 'submitted'
  )
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_hd_vang(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_vang(uuid, uuid) TO authenticated, service_role;

-- RLS gửi phiếu dùng đúng hàm hợp lệ — trước đây điều kiện chặn tự chấm được
-- viết tay trong policy, nay thêm loại cùng phòng nên gom về một chỗ.
DROP POLICY IF EXISTS "Members vote while round open" ON public.portal_idea_council_votes;
CREATE POLICY "Members vote while round open"
  ON public.portal_idea_council_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.bhy_ideas_hd_la_thanh_vien(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.portal_idea_council_items it
      JOIN public.portal_idea_council_rounds r ON r.id = it.round_id
      WHERE it.id = portal_idea_council_votes.item_id AND r.status = 'open'
    )
    AND public.bhy_ideas_hd_phieu_hop_le(auth.uid(), portal_idea_council_votes.item_id)
  );

-- Cho giao diện: với đợt này, tôi được chấm ý tưởng nào, không được thì vì sao
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_toi_duoc_cham(_round_id uuid)
RETURNS TABLE (item_id uuid, ly_do text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT it.id, public.bhy_ideas_hd_ly_do_khong_cham(auth.uid(), it.id)
  FROM public.portal_idea_council_items it
  WHERE it.round_id = _round_id
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_hd_toi_duoc_cham(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_toi_duoc_cham(uuid) TO authenticated, service_role;

-- ============================================================================
-- 4) ĐỢT CÓ CẤP XÉT; BỎ XÉT VƯỢT CẤP; LAN TỎA CẦN ≥ 30 NGÀY SAU VƯƠN CÀNH
-- ============================================================================
ALTER TABLE public.portal_idea_council_rounds
  ADD COLUMN IF NOT EXISTS cap_xet text NOT NULL DEFAULT 'Vươn cành'
    CHECK (cap_xet IN ('Vươn cành', 'Lan tỏa')),
  -- Mốc lần công bố đã ghi sổ — công bố lại không ghi trùng
  ADD COLUMN IF NOT EXISTS ghi_so_luc timestamptz;

-- Tầng 'Lan tỏa trực tiếp' (xét thẳng khi chưa qua Vươn cành) bị bỏ theo quy
-- chế. Không dòng nào đang dùng nên thu hẹp CHECK được ngay.
ALTER TABLE public.portal_idea_council_items
  DROP CONSTRAINT IF EXISTS portal_idea_council_items_proposed_tier_check;
ALTER TABLE public.portal_idea_council_items
  ADD CONSTRAINT portal_idea_council_items_proposed_tier_check
  CHECK (proposed_tier IN ('Vươn cành', 'Lan tỏa'));

-- Số ngày tối thiểu triển khai sau khi được công nhận Vươn cành mới được xét
-- Lan tỏa (chốt 16/09/2026). Đổi thì đổi ở đây và ở client (ideaCouncil.ts).
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_ngay_toi_thieu_lan_toa()
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 30 $$;

-- Ý tưởng đưa vào đợt phải hợp cấp xét của đợt — hàng rào ở CSDL, không chỉ
-- ở giao diện. Tầng đề xuất suy thẳng từ đợt, giao diện không chọn nữa.
CREATE OR REPLACE FUNCTION public.f_pici_gac_cap_xet()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap text;
  v_level text;
  v_vc_luc timestamptz;
  v_du_tu timestamptz;
BEGIN
  SELECT cap_xet INTO v_cap FROM public.portal_idea_council_rounds WHERE id = NEW.round_id;
  NEW.proposed_tier := v_cap;

  SELECT development_level INTO v_level FROM public.portal_ideas WHERE id = NEW.idea_id;

  IF v_cap = 'Vươn cành' THEN
    IF v_level IN ('Vươn cành', 'Lan tỏa') THEN
      RAISE EXCEPTION 'Ý tưởng đã ở cấp % — không trình xét Vươn cành nữa', v_level;
    END IF;
  ELSE
    IF v_level <> 'Vươn cành' THEN
      RAISE EXCEPTION 'Chỉ ý tưởng ĐÃ được Hội đồng công nhận Vươn cành mới xét Lan tỏa (hiện: %) — không xét vượt cấp', v_level;
    END IF;
    SELECT coalesce(a.duyet_luc, a.ghi_nhan_luc) INTO v_vc_luc
      FROM public.portal_idea_awards a
     WHERE a.idea_id = NEW.idea_id AND a.cap_do = 'Vươn cành' AND a.trang_thai = 'da_ghi_nhan';
    IF v_vc_luc IS NULL THEN
      RAISE EXCEPTION 'Chưa có dòng sổ công nhận Vươn cành cho ý tưởng này';
    END IF;
    v_du_tu := v_vc_luc + make_interval(days => public.bhy_ideas_hd_ngay_toi_thieu_lan_toa());
    IF now() < v_du_tu THEN
      RAISE EXCEPTION 'Ý tưởng mới được công nhận Vươn cành %, phải triển khai tối thiểu % ngày — đủ điều kiện từ %',
        to_char(v_vc_luc AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY'),
        public.bhy_ideas_hd_ngay_toi_thieu_lan_toa(),
        to_char(v_du_tu AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pici_gac_cap_xet ON public.portal_idea_council_items;
CREATE TRIGGER trg_pici_gac_cap_xet
  BEFORE INSERT OR UPDATE OF idea_id, round_id, proposed_tier ON public.portal_idea_council_items
  FOR EACH ROW EXECUTE FUNCTION public.f_pici_gac_cap_xet();

-- Ứng viên cho một đợt theo cấp xét — kèm lý do chưa đủ điều kiện để TCTH thấy
-- «còn n ngày» thay vì danh sách trống không giải thích.
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_ung_vien(_round_id uuid)
RETURNS TABLE (
  idea_id uuid, title text, department_name text, proposer text, development_level text,
  cong_nhan_vc_luc timestamptz, du_dieu_kien_tu timestamptz, du_dieu_kien boolean, ly_do text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_cap text;
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng TCTH xem được danh sách ứng viên';
  END IF;
  SELECT cap_xet INTO v_cap FROM public.portal_idea_council_rounds WHERE id = _round_id;

  IF v_cap = 'Vươn cành' THEN
    RETURN QUERY
      SELECT i.id, i.title, i.department_name, i.proposer, i.development_level,
             NULL::timestamptz, NULL::timestamptz, true, NULL::text
      FROM public.portal_ideas i
      WHERE i.council_proposal
        AND i.development_level NOT IN ('Vươn cành', 'Lan tỏa')
        AND NOT EXISTS (SELECT 1 FROM public.portal_idea_council_items it WHERE it.round_id = _round_id AND it.idea_id = i.id)
      ORDER BY i.created_at DESC;
  ELSE
    RETURN QUERY
      SELECT i.id, i.title, i.department_name, i.proposer, i.development_level,
             coalesce(a.duyet_luc, a.ghi_nhan_luc),
             coalesce(a.duyet_luc, a.ghi_nhan_luc) + make_interval(days => public.bhy_ideas_hd_ngay_toi_thieu_lan_toa()),
             now() >= coalesce(a.duyet_luc, a.ghi_nhan_luc) + make_interval(days => public.bhy_ideas_hd_ngay_toi_thieu_lan_toa()),
             CASE WHEN now() < coalesce(a.duyet_luc, a.ghi_nhan_luc) + make_interval(days => public.bhy_ideas_hd_ngay_toi_thieu_lan_toa())
                  THEN 'Chưa đủ ' || public.bhy_ideas_hd_ngay_toi_thieu_lan_toa() || ' ngày triển khai' END
      FROM public.portal_ideas i
      JOIN public.portal_idea_awards a ON a.idea_id = i.id AND a.cap_do = 'Vươn cành' AND a.trang_thai = 'da_ghi_nhan'
      WHERE i.development_level = 'Vươn cành'
        AND NOT EXISTS (SELECT 1 FROM public.portal_idea_council_items it WHERE it.round_id = _round_id AND it.idea_id = i.id)
      ORDER BY coalesce(a.duyet_luc, a.ghi_nhan_luc);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_hd_ung_vien(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_ung_vien(uuid) TO authenticated, service_role;

-- ============================================================================
-- 5) TÍNH MỘT Ý TƯỞNG — nguồn duy nhất cho tổng hợp, tiến độ và công bố
-- ============================================================================
-- Ngưỡng mục VI.3 (trùng NGUONG_VUON_CANH / NGUONG_LAN_TOA ở client):
--   Vươn cành: đủ 100% mẫu số · TB chung ≥ 3,5 · An toàn ≥ 3 · ≥ 2/3 đồng ý
--   Lan tỏa:   đủ 100% mẫu số · TB chung ≥ 4,0 · Nhân rộng ≥ 4 · An toàn ≥ 3 · ≥ 2/3 đồng ý Lan tỏa
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_tinh_item(_item_id uuid)
RETURNS TABLE (
  total_votes integer, eligible_members integer, so_phieu_bi_loai integer, so_vang integer,
  avg_problem numeric, avg_impact numeric, avg_feasible numeric, avg_safety numeric, avg_scale numeric,
  avg_overall numeric, conflict_votes integer,
  agree_vuon_canh integer, agree_lan_toa integer,
  rec_khong_xet integer, rec_can_bo_sung integer, rec_vuon_canh integer, rec_lan_toa integer,
  gop_y jsonb, ket_luan text, ly_do_chua_dat text[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap text;
  v_ly_do text[] := '{}';
BEGIN
  SELECT r.cap_xet INTO v_cap
    FROM public.portal_idea_council_items it JOIN public.portal_idea_council_rounds r ON r.id = it.round_id
   WHERE it.id = _item_id;

  SELECT
    count(v.id) FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id))::int,
    (SELECT count(*)::int
       FROM public.portal_idea_council_members m JOIN public.profiles p ON p.id = m.profile_id
      WHERE m.is_active
        AND public.bhy_ideas_hd_phieu_hop_le(p.user_id, _item_id)
        AND NOT public.bhy_ideas_hd_vang(p.id, _item_id)),
    count(v.id) FILTER (WHERE NOT public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id))::int,
    (SELECT count(*)::int
       FROM public.portal_idea_council_members m JOIN public.profiles p ON p.id = m.profile_id
      WHERE m.is_active
        AND public.bhy_ideas_hd_phieu_hop_le(p.user_id, _item_id)
        AND public.bhy_ideas_hd_vang(p.id, _item_id)),
    round(avg(v.score_problem)  FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id)), 2),
    round(avg(v.score_impact)   FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id)), 2),
    round(avg(v.score_feasible) FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id)), 2),
    round(avg(v.score_safety)   FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id)), 2),
    round(avg(v.score_scale)    FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id)), 2),
    round((
        avg(v.score_problem)  FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id))
      + avg(v.score_impact)   FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id))
      + avg(v.score_feasible) FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id))
      + avg(v.score_safety)   FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id))
      + avg(v.score_scale)    FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id))
    ) / 5, 2),
    count(v.id) FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id) AND v.conflict_status <> 'khong')::int,
    count(v.id) FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id) AND v.recommendation IN ('vuon_canh', 'lan_toa'))::int,
    count(v.id) FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id) AND v.recommendation = 'lan_toa')::int,
    count(v.id) FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id) AND v.recommendation = 'khong_xet')::int,
    count(v.id) FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id) AND v.recommendation = 'can_bo_sung')::int,
    count(v.id) FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id) AND v.recommendation = 'vuon_canh')::int,
    count(v.id) FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id) AND v.recommendation = 'lan_toa')::int,
    coalesce(jsonb_agg(v.gop_y ORDER BY v.created_at)
      FILTER (WHERE public.bhy_ideas_hd_phieu_hop_le(v.user_id, _item_id) AND btrim(coalesce(v.gop_y, '')) <> ''), '[]'::jsonb)
  INTO total_votes, eligible_members, so_phieu_bi_loai, so_vang,
       avg_problem, avg_impact, avg_feasible, avg_safety, avg_scale, avg_overall, conflict_votes,
       agree_vuon_canh, agree_lan_toa, rec_khong_xet, rec_can_bo_sung, rec_vuon_canh, rec_lan_toa, gop_y
  FROM public.portal_idea_council_votes v
  WHERE v.item_id = _item_id AND v.status = 'submitted';

  -- Kết luận theo ngưỡng — cùng luật với xetVuonCanh / xetLanToa ở client
  ket_luan := NULL;
  IF total_votes = 0 THEN
    v_ly_do := array_append(v_ly_do, 'Chưa có phiếu chấm hợp lệ');
  ELSE
    IF eligible_members = 0 OR total_votes < eligible_members THEN
      v_ly_do := array_append(v_ly_do, format('Mới %s/%s thành viên chấm — yêu cầu đủ 100%%', total_votes, eligible_members));
    END IF;
    IF v_cap = 'Vươn cành' THEN
      IF avg_overall < 3.5 THEN v_ly_do := array_append(v_ly_do, format('Điểm TB chung %s < 3,5', avg_overall)); END IF;
      IF avg_safety < 3 THEN v_ly_do := array_append(v_ly_do, format('Điểm An toàn/rủi ro %s < 3', avg_safety)); END IF;
      IF agree_vuon_canh * 3 < total_votes * 2 THEN
        v_ly_do := array_append(v_ly_do, format('Mới %s/%s phiếu đồng ý (< 2/3)', agree_vuon_canh, total_votes));
      END IF;
      IF cardinality(v_ly_do) = 0 THEN ket_luan := 'vuon_canh'; END IF;
    ELSE
      IF avg_overall < 4.0 THEN v_ly_do := array_append(v_ly_do, format('Điểm TB chung %s < 4,0', avg_overall)); END IF;
      IF avg_scale < 4 THEN v_ly_do := array_append(v_ly_do, format('Điểm Nhân rộng/chuẩn hóa %s < 4', avg_scale)); END IF;
      IF avg_safety < 3 THEN v_ly_do := array_append(v_ly_do, format('Điểm An toàn/rủi ro %s < 3', avg_safety)); END IF;
      IF agree_lan_toa * 3 < total_votes * 2 THEN
        v_ly_do := array_append(v_ly_do, format('Mới %s/%s phiếu đồng ý Lan tỏa (< 2/3)', agree_lan_toa, total_votes));
      END IF;
      IF cardinality(v_ly_do) = 0 THEN ket_luan := 'lan_toa'; END IF;
    END IF;
  END IF;
  ly_do_chua_dat := v_ly_do;
  RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_hd_tinh_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_tinh_item(uuid) TO authenticated, service_role;

-- Tổng hợp Phụ lục 07 — chỉ ghép bảng, mọi con số lấy từ bhy_ideas_hd_tinh_item
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đợt chấm'; END IF;
  IF NOT v_round.results_published
     AND NOT public.has_role(auth.uid(), 'system_admin'::app_role)
     AND NOT public.bhy_ideas_hd_la_chu_tich(auth.uid()) THEN
    RAISE EXCEPTION 'Kết quả đợt này chưa được công bố — Chủ tịch Hội đồng sẽ mở kết quả sau khi đợt chấm hoàn tất';
  END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'idea_code'), '[]'::jsonb) INTO v_items
  FROM (
    SELECT to_jsonb(t) || jsonb_build_object(
      'item_id', it.id, 'idea_id', it.idea_id, 'idea_code', it.idea_code,
      'proposed_tier', it.proposed_tier, 'idea_title', i.title,
      'department_name', i.department_name, 'idea_level', i.level, 'proposer', i.proposer
    ) AS x
    FROM public.portal_idea_council_items it
    JOIN public.portal_ideas i ON i.id = it.idea_id
    CROSS JOIN LATERAL public.bhy_ideas_hd_tinh_item(it.id) t
    WHERE it.round_id = _round_id
  ) s;

  RETURN jsonb_build_object(
    'round', jsonb_build_object(
      'id', v_round.id, 'name', v_round.name, 'status', v_round.status,
      'cap_xet', v_round.cap_xet, 'results_published', v_round.results_published,
      'ghi_so_luc', v_round.ghi_so_luc
    ),
    'items', v_items
  );
END $$;

-- Tiến độ đôn đốc — expected/pending theo mẫu số mới, thêm số vắng
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đợt chấm'; END IF;
  SELECT count(*) INTO v_total_items FROM public.portal_idea_council_items it WHERE it.round_id = _round_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'profile_id', m.profile_id,
    'full_name', p.full_name,
    'is_chair', m.is_chair,
    'expected', (SELECT count(*) FROM public.portal_idea_council_items it
                  WHERE it.round_id = _round_id
                    AND public.bhy_ideas_hd_phieu_hop_le(p.user_id, it.id)
                    AND NOT public.bhy_ideas_hd_vang(p.id, it.id)),
    'khong_cham', (SELECT count(*) FROM public.portal_idea_council_items it
                    WHERE it.round_id = _round_id AND NOT public.bhy_ideas_hd_phieu_hop_le(p.user_id, it.id)),
    'vang', (SELECT count(*) FROM public.portal_idea_council_items it
              WHERE it.round_id = _round_id
                AND public.bhy_ideas_hd_phieu_hop_le(p.user_id, it.id)
                AND public.bhy_ideas_hd_vang(p.id, it.id)),
    'submitted', (SELECT count(*) FROM public.portal_idea_council_votes v
                   JOIN public.portal_idea_council_items it ON it.id = v.item_id
                  WHERE it.round_id = _round_id AND v.user_id = p.user_id AND v.status = 'submitted'
                    AND public.bhy_ideas_hd_phieu_hop_le(p.user_id, it.id)),
    'draft', (SELECT count(*) FROM public.portal_idea_council_votes v
               JOIN public.portal_idea_council_items it ON it.id = v.item_id
              WHERE it.round_id = _round_id AND v.user_id = p.user_id AND v.status = 'draft'),
    'pending_codes', (SELECT coalesce(jsonb_agg(it.idea_code ORDER BY it.idea_code), '[]'::jsonb)
                       FROM public.portal_idea_council_items it
                      WHERE it.round_id = _round_id
                        AND public.bhy_ideas_hd_phieu_hop_le(p.user_id, it.id)
                        AND NOT public.bhy_ideas_hd_vang(p.id, it.id)
                        AND NOT EXISTS (SELECT 1 FROM public.portal_idea_council_votes v
                                         WHERE v.item_id = it.id AND v.user_id = p.user_id AND v.status = 'submitted'))
  ) ORDER BY p.full_name), '[]'::jsonb) INTO v_members
  FROM public.portal_idea_council_members m
  JOIN public.profiles p ON p.id = m.profile_id
  WHERE m.is_active;

  RETURN jsonb_build_object(
    'round', jsonb_build_object('id', v_round.id, 'name', v_round.name, 'status', v_round.status,
      'cap_xet', v_round.cap_xet, 'voting_deadline', v_round.voting_deadline, 'results_published', v_round.results_published),
    'total_items', v_total_items,
    'members', v_members
  );
END $$;

-- Phiếu ẩn danh — đánh dấu phiếu bị loại và vì sao, vẫn không lộ danh tính
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đợt chấm'; END IF;
  IF v_status <> 'closed' AND NOT public.has_role(auth.uid(), 'system_admin'::app_role) THEN
    RAISE EXCEPTION 'Phiếu ẩn danh chỉ xem được sau khi đợt chấm đã chốt';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'vote_id', v.id, 'item_id', v.item_id, 'conflict_status', v.conflict_status,
    'score_problem', v.score_problem, 'score_impact', v.score_impact, 'score_feasible', v.score_feasible,
    'score_safety', v.score_safety, 'score_scale', v.score_scale,
    'recommendation', v.recommendation, 'gop_y', v.gop_y,
    'ly_do_loai', public.bhy_ideas_hd_ly_do_khong_cham(v.user_id, v.item_id)
  ) ORDER BY v.id), '[]'::jsonb) INTO v_ballots
  FROM public.portal_idea_council_votes v
  JOIN public.portal_idea_council_items it ON it.id = v.item_id
  WHERE it.round_id = _round_id AND v.status = 'submitted';
  RETURN v_ballots;
END $$;

-- ============================================================================
-- 6) CÔNG BỐ = GHI SỔ THƯỞNG + NÂNG CẤP ĐỘ + BÁO CHỦ Ý TƯỞNG
-- ============================================================================
-- Giống lúc Giám đốc duyệt Bén rễ: công bố xong là sổ có dòng, ý tưởng lên cấp,
-- chủ ý tưởng nhận tin. Mức tiền theo quy chế: Vươn cành 1.000.000đ; Lan tỏa
-- 2.000.000đ (khoảng 2–3 triệu, lấy mức tối thiểu như đã chốt cho dự toán —
-- TCTH sửa lên nếu Hội đồng quyết mức khác). Cộng bù cấp dưới chưa có tiền
-- theo bhy_ideas_thuong_luy_ke. KPI CHƯA XÂY cho hai cấp này → ghi_nhan_kpi
-- để false, không tự áp.
-- Chỉ ghi sổ MỘT LẦN (ghi_so_luc); khóa rồi công bố lại không ghi trùng. Khóa
-- kết quả không thu hồi thưởng — thu hồi là quyết định riêng.
-- Bản cũ trả void; đổi kiểu trả về nên phải DROP rồi tạo lại
DROP FUNCTION IF EXISTS public.bhy_ideas_hd_cong_bo(uuid, boolean);
CREATE FUNCTION public.bhy_ideas_hd_cong_bo(_round_id uuid, _published boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round public.portal_idea_council_rounds%ROWTYPE;
  v_it record;
  v_kq record;
  v_idea public.portal_ideas%ROWTYPE;
  v_cap text;
  v_don_gia integer;
  v_luy_ke integer;
  v_so_dat integer := 0;
  v_so_khong integer := 0;
  v_tong_tien integer := 0;
  v_ghi_chu text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role)
          OR public.bhy_ideas_hd_la_chu_tich(auth.uid())) THEN
    RAISE EXCEPTION 'Chỉ Chủ tịch Hội đồng hoặc Quản trị hệ thống được công bố/khóa kết quả';
  END IF;
  SELECT * INTO v_round FROM public.portal_idea_council_rounds WHERE id = _round_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đợt chấm'; END IF;

  IF _published AND v_round.status <> 'closed' THEN
    RAISE EXCEPTION 'Chốt đợt chấm trước rồi mới công bố — công bố là ghi sổ thưởng, không ghi khi phiếu còn đang đổ về';
  END IF;

  UPDATE public.portal_idea_council_rounds SET results_published = _published WHERE id = _round_id;

  IF NOT _published OR v_round.ghi_so_luc IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'da_ghi_so_truoc_do', v_round.ghi_so_luc IS NOT NULL);
  END IF;

  v_cap := v_round.cap_xet;
  v_don_gia := CASE v_cap WHEN 'Vươn cành' THEN 1000000 ELSE 2000000 END;

  FOR v_it IN SELECT it.* FROM public.portal_idea_council_items it WHERE it.round_id = _round_id ORDER BY it.idea_code LOOP
    SELECT * INTO v_kq FROM public.bhy_ideas_hd_tinh_item(v_it.id);
    SELECT * INTO v_idea FROM public.portal_ideas WHERE id = v_it.idea_id;

    IF v_kq.ket_luan IS NOT NULL THEN
      v_so_dat := v_so_dat + 1;
      v_ghi_chu := format('Hội đồng đợt «%s»: TB %s, đồng ý %s/%s, mã %s',
        v_round.name, v_kq.avg_overall,
        CASE v_cap WHEN 'Vươn cành' THEN v_kq.agree_vuon_canh ELSE v_kq.agree_lan_toa END,
        v_kq.total_votes, v_it.idea_code);

      INSERT INTO public.portal_idea_awards
        (idea_id, cap_do, ghi_nhan_kpi, duyet_cn, duyet_tsc, phong, muc_thuong, ly_do_thuong,
         round_id, trang_thai, nguoi_ghi_nhan, nguoi_duyet, duyet_luc, ghi_chu, cap_do_truoc)
      VALUES
        (v_it.idea_id, v_cap, false, true, false, v_idea.department_name, v_don_gia, 'trong_han_muc',
         _round_id, 'da_ghi_nhan', auth.uid(), auth.uid(), now(), v_ghi_chu, v_idea.development_level)
      ON CONFLICT (idea_id, cap_do) DO UPDATE
        SET trang_thai = 'da_ghi_nhan', duyet_cn = true, muc_thuong = v_don_gia,
            ly_do_thuong = 'trong_han_muc', round_id = _round_id,
            nguoi_duyet = auth.uid(), duyet_luc = now(), ghi_chu = v_ghi_chu,
            cap_do_truoc = v_idea.development_level
        -- Chỉ ghi đè dòng chưa có tiền — không bao giờ trả trùng
        WHERE public.portal_idea_awards.muc_thuong = 0;

      v_luy_ke := public.bhy_ideas_thuong_luy_ke(v_it.idea_id, v_cap);
      v_tong_tien := v_tong_tien + v_don_gia + v_luy_ke;

      PERFORM set_config('bhy.ideas_ghi_so', 'on', true);
      UPDATE public.portal_ideas SET development_level = v_cap
       WHERE id = v_it.idea_id
         AND array_position(ARRAY['Ươm mầm','Bén rễ','Vươn cành','Lan tỏa'], development_level)
           < array_position(ARRAY['Ươm mầm','Bén rễ','Vươn cành','Lan tỏa'], v_cap);
      PERFORM set_config('bhy.ideas_ghi_so', 'off', true);

      PERFORM public.bhy_ideas_bao_chu_y_tuong(v_it.idea_id, 'IDEA_TIEN_TRINH',
        '🎉 Hội đồng công nhận ' || v_cap || ' — ' || left(v_idea.title, 40),
        'Ý tưởng: ' || v_idea.title
          || E'\n' || 'Quyết định: Hội đồng Bắc Hưng Yên Ideas công nhận cấp ' || v_cap
          || E'\n' || 'Điểm: trung bình ' || v_kq.avg_overall || '/5, '
          || CASE v_cap WHEN 'Vươn cành' THEN v_kq.agree_vuon_canh ELSE v_kq.agree_lan_toa END || '/' || v_kq.total_votes || ' phiếu đồng ý'
          || E'\n' || 'Thưởng: ' || to_char(v_don_gia, 'FM999G999G999') || 'đ'
          || CASE WHEN v_luy_ke > 0 THEN ' + cộng bù cấp dưới ' || to_char(v_luy_ke, 'FM999G999G999') || 'đ' ELSE '' END,
        'KHEN');
    ELSE
      v_so_khong := v_so_khong + 1;
      PERFORM public.bhy_ideas_bao_chu_y_tuong(v_it.idea_id, 'IDEA_TIEN_TRINH',
        'Ý tưởng chưa đạt ' || v_cap || ' — ' || left(v_idea.title, 44),
        'Ý tưởng: ' || v_idea.title
          || E'\n' || 'Quyết định: Hội đồng kết luận chưa đạt cấp ' || v_cap
          || E'\n' || 'Lý do: ' || array_to_string(v_kq.ly_do_chua_dat, '; ')
          || E'\n' || 'Tiếp theo: hoàn thiện thêm và trình lại ở đợt sau.',
        'NHE');
    END IF;
  END LOOP;

  UPDATE public.portal_idea_council_rounds SET ghi_so_luc = now() WHERE id = _round_id;

  RETURN jsonb_build_object('ok', true, 'cap_xet', v_cap, 'so_dat', v_so_dat,
    'so_khong_dat', v_so_khong, 'tong_tien', v_tong_tien);
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_cong_bo(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_cong_bo(uuid, boolean) TO authenticated, service_role;

-- ============================================================================
-- 7) RÚT Ý TƯỞNG KHỎI ĐỢT — có lý do, có báo
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.portal_idea_council_rut (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.portal_idea_council_rounds(id) ON DELETE CASCADE,
  idea_id uuid NOT NULL REFERENCES public.portal_ideas(id) ON DELETE CASCADE,
  idea_code text NOT NULL,
  ly_do text NOT NULL,
  nguoi_rut uuid NOT NULL DEFAULT auth.uid(),
  rut_luc timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_idea_council_rut ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_idea_council_rut FROM anon;
DROP POLICY IF EXISTS "Council members can view withdrawn ideas" ON public.portal_idea_council_rut;
CREATE POLICY "Council members can view withdrawn ideas"
  ON public.portal_idea_council_rut FOR SELECT
  USING (public.bhy_ideas_hd_la_thanh_vien(auth.uid()) OR public.is_content_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_rut_y_tuong(_item_id uuid, _ly_do text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_it public.portal_idea_council_items%ROWTYPE;
  v_idea public.portal_ideas%ROWTYPE;
  v_round public.portal_idea_council_rounds%ROWTYPE;
  v_ly_do text := nullif(btrim(coalesce(_ly_do, '')), '');
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổ chức tổng hợp rút được ý tưởng khỏi đợt';
  END IF;
  IF v_ly_do IS NULL THEN RAISE EXCEPTION 'Phải ghi lý do rút — chủ ý tưởng sẽ nhận được lý do này'; END IF;
  SELECT * INTO v_it FROM public.portal_idea_council_items WHERE id = _item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy ý tưởng trong đợt'; END IF;
  SELECT * INTO v_idea FROM public.portal_ideas WHERE id = v_it.idea_id;
  SELECT * INTO v_round FROM public.portal_idea_council_rounds WHERE id = v_it.round_id;

  INSERT INTO public.portal_idea_council_rut (round_id, idea_id, idea_code, ly_do)
  VALUES (v_it.round_id, v_it.idea_id, v_it.idea_code, v_ly_do);

  DELETE FROM public.portal_idea_council_items WHERE id = _item_id;

  PERFORM public.bhy_ideas_bao_chu_y_tuong(v_it.idea_id, 'IDEA_TIEN_TRINH',
    'Ý tưởng rút khỏi đợt Hội đồng — ' || left(v_idea.title, 40),
    'Ý tưởng: ' || v_idea.title
      || E'\n' || 'Đợt: ' || v_round.name || ' (mã ' || v_it.idea_code || ')'
      || E'\n' || 'Lý do: ' || v_ly_do
      || E'\n' || 'Tiếp theo: hoàn thiện thêm rồi Phòng TCTH sẽ trình lại ở đợt sau.',
    'NHE');

  RETURN jsonb_build_object('ok', true, 'idea_code', v_it.idea_code);
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_hd_rut_y_tuong(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_rut_y_tuong(uuid, text) TO authenticated, service_role;

COMMENT ON TABLE public.portal_idea_council_vang IS
  'Điểm danh Hội đồng BHY Ideas: vắng cả đợt (phien_id NULL) hoặc vắng một phiên trình bày. Người vắng ra khỏi mẫu số quorum của các ý tưởng tương ứng; đã gửi phiếu thì không tính vắng.';
COMMENT ON TABLE public.portal_idea_council_rut IS
  'Nhật ký ý tưởng rút khỏi đợt chấm Hội đồng, kèm lý do — chủ ý tưởng được báo qua hàng đợi ct2_thong_bao.';

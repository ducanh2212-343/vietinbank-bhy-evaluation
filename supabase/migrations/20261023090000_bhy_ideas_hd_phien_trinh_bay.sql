-- ============================================================================
-- BHY Ideas — PHIÊN TRÌNH BÀY trong đợt chấm của Hội đồng
--
-- Giám đốc (11/09/2026): «Hội đồng đang chấm khó tìm ra sáng kiến đang trình
-- bày… thêm tính năng hiện riêng bản chấm theo từng phiên trình bày (có thể
-- 1-5 ý tưởng trình bày, sau đó Hội đồng chấm)».
--
-- Đợt «Tháng 6,7,8» đang mở có 20 ý tưởng trong một danh sách dọc, riêng Phòng
-- KHDN 11 ý tưởng và bốn ý tưởng cùng mở đầu bằng «Xây dựng Dashboard». Họp
-- thật chạy theo nhóm: 1–5 ý tưởng lên trình bày rồi Hội đồng chấm ngay nhóm
-- đó. Nay TCTH xếp ý tưởng vào PHIÊN và bấm «Bắt đầu trình bày»; màn chấm của
-- mọi thành viên tự thu lại còn đúng phiên đó.
--
-- Xếp phiên KHÔNG đụng gì tới phiếu chấm hay cách tính điểm: phiên chỉ là cách
-- sắp xếp để tìm cho nhanh, tổng hợp/quorum vẫn tính trên toàn đợt.
-- ============================================================================

-- 1) Bảng phiên trình bày ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_idea_council_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.portal_idea_council_rounds(id) ON DELETE CASCADE,
  ten text NOT NULL,
  thu_tu smallint NOT NULL DEFAULT 1,
  trang_thai text NOT NULL DEFAULT 'cho'
    CHECK (trang_thai IN ('cho', 'dang_trinh', 'da_xong')),
  bat_dau_luc timestamptz,
  ket_thuc_luc timestamptz,
  ghi_chu text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Mỗi đợt chỉ có ĐÚNG MỘT phiên đang trình bày. Không có ràng buộc này thì
-- TCTH bấm nhầm hai phiên là màn chấm của cả Hội đồng không biết bám vào đâu.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pics_mot_phien_dang_trinh
  ON public.portal_idea_council_sessions (round_id)
  WHERE trang_thai = 'dang_trinh';

CREATE INDEX IF NOT EXISTS idx_pics_round ON public.portal_idea_council_sessions (round_id, thu_tu);

DROP TRIGGER IF EXISTS update_pics_updated_at ON public.portal_idea_council_sessions;
CREATE TRIGGER update_pics_updated_at
  BEFORE UPDATE ON public.portal_idea_council_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.portal_idea_council_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_idea_council_sessions FROM anon;

DROP POLICY IF EXISTS "Council members can view idea council sessions" ON public.portal_idea_council_sessions;
CREATE POLICY "Council members can view idea council sessions"
  ON public.portal_idea_council_sessions FOR SELECT
  USING (public.bhy_ideas_hd_la_thanh_vien(auth.uid()));

DROP POLICY IF EXISTS "Content admins manage idea council sessions" ON public.portal_idea_council_sessions;
CREATE POLICY "Content admins manage idea council sessions"
  ON public.portal_idea_council_sessions FOR ALL
  USING (public.is_content_admin(auth.uid()))
  WITH CHECK (public.is_content_admin(auth.uid()));

-- 2) Ý tưởng thuộc phiên nào ---------------------------------------------------
-- ON DELETE SET NULL: xóa phiên thì ý tưởng quay về nhóm «chưa xếp phiên», KHÔNG
-- mất khỏi đợt và KHÔNG mất phiếu đã chấm.
ALTER TABLE public.portal_idea_council_items
  ADD COLUMN IF NOT EXISTS phien_id uuid
    REFERENCES public.portal_idea_council_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thu_tu smallint NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_pici_phien ON public.portal_idea_council_items (phien_id, thu_tu);

-- 3) Bắt đầu / kết thúc một phiên ----------------------------------------------
-- Phải là HÀM chứ không phải hai lần UPDATE từ giao diện: đóng phiên cũ và mở
-- phiên mới phải nằm trong cùng một giao dịch, nếu không có khoảnh khắc cả đợt
-- không có phiên nào (hoặc có hai) và màn chấm của Hội đồng nhảy lung tung.
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_mo_phien(_phien_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phien public.portal_idea_council_sessions%ROWTYPE;
  v_trang_thai_dot text;
  v_so_y_tuong integer;
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổ chức tổng hợp mở được phiên trình bày';
  END IF;

  SELECT * INTO v_phien FROM public.portal_idea_council_sessions WHERE id = _phien_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiên trình bày';
  END IF;

  SELECT status INTO v_trang_thai_dot
    FROM public.portal_idea_council_rounds WHERE id = v_phien.round_id;
  IF v_trang_thai_dot <> 'open' THEN
    RAISE EXCEPTION 'Đợt chấm chưa mở — mở đợt trước rồi mới bắt đầu phiên trình bày';
  END IF;

  SELECT count(*) INTO v_so_y_tuong
    FROM public.portal_idea_council_items WHERE phien_id = _phien_id;
  IF v_so_y_tuong = 0 THEN
    RAISE EXCEPTION 'Phiên này chưa có ý tưởng nào — xếp ý tưởng vào phiên trước đã';
  END IF;

  -- Đóng phiên đang chạy TRƯỚC rồi mới mở phiên mới: chỉ mục duy nhất một phiên
  -- «dang_trinh» được kiểm tra theo từng câu lệnh nên thứ tự này là bắt buộc.
  UPDATE public.portal_idea_council_sessions
     SET trang_thai = 'da_xong', ket_thuc_luc = coalesce(ket_thuc_luc, now())
   WHERE round_id = v_phien.round_id AND trang_thai = 'dang_trinh' AND id <> _phien_id;

  UPDATE public.portal_idea_council_sessions
     SET trang_thai = 'dang_trinh',
         bat_dau_luc = coalesce(bat_dau_luc, now()),
         ket_thuc_luc = NULL
   WHERE id = _phien_id;

  RETURN jsonb_build_object('ok', true, 'phien_id', _phien_id, 'so_y_tuong', v_so_y_tuong);
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_mo_phien(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_mo_phien(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_dong_phien(_phien_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_content_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổ chức tổng hợp đóng được phiên trình bày';
  END IF;

  UPDATE public.portal_idea_council_sessions
     SET trang_thai = 'da_xong', ket_thuc_luc = now()
   WHERE id = _phien_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiên trình bày';
  END IF;

  RETURN jsonb_build_object('ok', true, 'phien_id', _phien_id);
END $$;

REVOKE ALL ON FUNCTION public.bhy_ideas_hd_dong_phien(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_dong_phien(uuid) TO authenticated, service_role;

COMMENT ON TABLE public.portal_idea_council_sessions IS
  'Phiên trình bày trong một đợt chấm Hội đồng BHY Ideas: 1–5 ý tưởng lên trình bày rồi Hội đồng chấm ngay nhóm đó. Chỉ để sắp xếp/tìm kiếm — không ảnh hưởng cách tính điểm hay quorum của đợt.';

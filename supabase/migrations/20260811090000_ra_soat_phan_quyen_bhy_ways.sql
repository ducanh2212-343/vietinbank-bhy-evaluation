-- ============================================================================
-- Rà soát phân quyền BHY Ways (trừ Chiêu thức 3) — vá các lỗ hổng phát hiện:
--
-- 1) portal_uploads (Tin tức / Kho tri thức — «sửa bài viết»): policy
--    "Owners can update own portal uploads" cho chủ bài sửa MỌI cột, kể cả
--    is_featured (ghim Trang chủ), is_shared_with_guests (mở cho khách đối tác)
--    và seed_likes — trong khi UI và chú thích khẳng định các việc này chỉ
--    System Admin / Admin TCTH làm được. Trigger dưới đây chặn đúng các cột
--    quản trị, chủ bài vẫn sửa được phần chữ của mình.
--
-- 2) portal_ideas (BHY Ideas): cùng lỗ hổng — chủ ý tưởng có thể tự nâng
--    development_level, tự bật council_proposal, tự bơm seed_likes/seed_unlikes
--    qua API, vô hiệu hóa RPC admin_update_idea_status vốn là cổng duy nhất
--    theo thiết kế.
--
-- 3) star_records (Sao Xứng Đáng): form cán bộ chỉ cho gửi 1–3 sao nhưng
--    policy INSERT nhận mọi stars > 0 — gọi API trực tiếp là ghi được phiếu
--    trăm sao. Siết về ≤ 3 cho nguồn 'form' (nhập hàng loạt của admin giữ nguyên).
--
-- 4) Hai lỗi nền phát hiện khi rà:
--    a) Policy của Chiêu thức 2 (action_plans, 20260805) gọi public.is_staff()
--       KHÔNG tham số, nhưng toàn hệ chỉ định nghĩa is_staff(_user_id uuid).
--       Bổ sung overload không tham số để các policy đó chạy đúng.
--    b) Đợt siết RLS 03/08 drop mọi policy SELECT "USING (true)" rồi chỉ tạo
--       lại theo danh sách chốt ngày 29/07 — ba bảng Quizzi ra đời cuối tháng 7
--       (quiz_badge_catalog, quiz_campaign_initiator_depts, quiz_pledge_items)
--       bị drop mà không được tạo lại → không ai đọc được. Tạo lại theo is_staff.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Helper dùng chung
-- ---------------------------------------------------------------------------

-- Admin nội dung cổng BHY one (không gồm bgd — giữ đúng quy ước hiện hành)
CREATE OR REPLACE FUNCTION public.is_content_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'system_admin'::app_role)
      OR public.has_role(_user_id, 'tcth_admin'::app_role)
$$;

-- Overload không tham số mà policy action_plans (Chiêu thức 2) đang gọi
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff(auth.uid())
$$;

REVOKE ALL ON FUNCTION public.is_content_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_content_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1) portal_uploads — cột quản trị chỉ admin nội dung được đụng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_portal_uploads_chan_cot_quan_tri()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role (import/backfill) và admin nội dung đi qua tự do
  IF auth.uid() IS NULL OR public.is_content_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Cán bộ đăng bài: mọi cờ quản trị về mặc định, không tự ghim/tự chia sẻ
    NEW.is_featured := false;
    NEW.is_shared_with_guests := false;
    NEW.seed_likes := 0;
    NEW.legacy_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.is_featured IS DISTINCT FROM OLD.is_featured
     OR NEW.is_shared_with_guests IS DISTINCT FROM OLD.is_shared_with_guests
     OR NEW.seed_likes IS DISTINCT FROM OLD.seed_likes
     OR NEW.legacy_id IS DISTINCT FROM OLD.legacy_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Ghim tin, chia sẻ cho khách đối tác hay chỉnh số liệu gốc là việc của Admin TCTH / System Admin';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.f_portal_uploads_chan_cot_quan_tri() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_portal_uploads_chan_cot_quan_tri ON public.portal_uploads;
CREATE TRIGGER trg_portal_uploads_chan_cot_quan_tri
  BEFORE INSERT OR UPDATE ON public.portal_uploads
  FOR EACH ROW EXECUTE FUNCTION public.f_portal_uploads_chan_cot_quan_tri();

-- ---------------------------------------------------------------------------
-- 2) portal_ideas — cấp độ phát triển / cờ Hội đồng / seed vote chỉ đi qua admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_portal_ideas_chan_cot_quan_tri()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_content_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.development_level := 'Ươm mầm';
    NEW.council_proposal := false;
    NEW.seed_likes := 0;
    NEW.seed_unlikes := 0;
    NEW.legacy_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.development_level IS DISTINCT FROM OLD.development_level
     OR NEW.council_proposal IS DISTINCT FROM OLD.council_proposal
     OR NEW.seed_likes IS DISTINCT FROM OLD.seed_likes
     OR NEW.seed_unlikes IS DISTINCT FROM OLD.seed_unlikes
     OR NEW.legacy_id IS DISTINCT FROM OLD.legacy_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cấp độ phát triển, đề xuất Hội đồng và số liệu gốc chỉ quản trị viên cập nhật được';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.f_portal_ideas_chan_cot_quan_tri() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_portal_ideas_chan_cot_quan_tri ON public.portal_ideas;
CREATE TRIGGER trg_portal_ideas_chan_cot_quan_tri
  BEFORE INSERT OR UPDATE ON public.portal_ideas
  FOR EACH ROW EXECUTE FUNCTION public.f_portal_ideas_chan_cot_quan_tri();

-- Lưu ý: RPC admin_update_idea_status là SECURITY DEFINER nhưng auth.uid()
-- trong trigger vẫn là người gọi (đã qua kiểm tra admin của RPC) — không kẹt.

-- ---------------------------------------------------------------------------
-- 3) star_records — form cán bộ tối đa 3 sao (đúng như UI 1–3 sao)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can submit form star records" ON public.star_records;
CREATE POLICY "Staff can submit form star records"
  ON public.star_records FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid())
    AND source = 'form'
    AND created_by = auth.uid()
    AND stars <= 3
  );

-- ---------------------------------------------------------------------------
-- 4b) Tạo lại policy SELECT cho ba bảng Quizzi bị đợt siết 03/08 bỏ sót
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated read badge catalog" ON public.quiz_badge_catalog;
DROP POLICY IF EXISTS "Staff can view quiz_badge_catalog" ON public.quiz_badge_catalog;
CREATE POLICY "Staff can view quiz_badge_catalog"
  ON public.quiz_badge_catalog FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read initiator depts" ON public.quiz_campaign_initiator_depts;
DROP POLICY IF EXISTS "Staff can view quiz_campaign_initiator_depts" ON public.quiz_campaign_initiator_depts;
CREATE POLICY "Staff can view quiz_campaign_initiator_depts"
  ON public.quiz_campaign_initiator_depts FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read pledge items" ON public.quiz_pledge_items;
DROP POLICY IF EXISTS "Staff can view quiz_pledge_items" ON public.quiz_pledge_items;
CREATE POLICY "Staff can view quiz_pledge_items"
  ON public.quiz_pledge_items FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

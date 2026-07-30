-- Đợt 4 BHY one: hệ thống sáng kiến BHY Ideas (port từ Firestore bhy_ideas).
-- Vote/bình luận dùng bảng riêng (sửa race condition array của bản gốc);
-- seed_likes/seed_unlikes giữ số vote mang từ Firebase (không map được danh tính).

CREATE TABLE public.portal_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  level TEXT NOT NULL CHECK (level IN ('Nội bộ CN', 'Đề xuất TSC')),
  applicability TEXT NOT NULL CHECK (applicability IN ('Cấp Phòng', 'Cấp Chi nhánh', 'Toàn hàng')),
  title TEXT NOT NULL,
  current_status TEXT,
  proposed_solution TEXT,
  expected_benefits TEXT,
  department_name TEXT NOT NULL,
  has_demo BOOLEAN NOT NULL DEFAULT false,
  proposer TEXT NOT NULL,
  development_level TEXT NOT NULL DEFAULT 'Ươm mầm'
    CHECK (development_level IN ('Ươm mầm', 'Bén rễ', 'Vươn cành', 'Lan tỏa')),
  council_proposal BOOLEAN NOT NULL DEFAULT false,
  custom_values JSONB,
  seed_likes INTEGER NOT NULL DEFAULT 0,
  seed_unlikes INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  creator_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_ideas_department ON public.portal_ideas (department_name);
CREATE INDEX idx_portal_ideas_created_at ON public.portal_ideas (created_at DESC);

ALTER TABLE public.portal_ideas ENABLE ROW LEVEL SECURITY;

-- Sáng kiến là dữ liệu nội bộ: chỉ cán bộ (không mở cho guest)
CREATE POLICY "Staff can view portal ideas"
  ON public.portal_ideas FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert own portal ideas"
  ON public.portal_ideas FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_staff(auth.uid()));

-- Chủ sở hữu sửa nội dung; cột quản trị (tier/phòng/HĐ) đi qua RPC admin bên dưới
CREATE POLICY "Owners can update own portal ideas"
  ON public.portal_ideas FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can manage portal ideas"
  ON public.portal_ideas FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

CREATE POLICY "Owners can delete own portal ideas"
  ON public.portal_ideas FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE TRIGGER update_portal_ideas_updated_at
  BEFORE UPDATE ON public.portal_ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vote: mỗi người 1 dòng, vote = 1 (thích) / -1 (không thích), đổi vote = update
CREATE TABLE public.portal_idea_votes (
  idea_id UUID NOT NULL REFERENCES public.portal_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);

ALTER TABLE public.portal_idea_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view idea votes"
  ON public.portal_idea_votes FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can vote as themselves"
  ON public.portal_idea_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_staff(auth.uid()));

CREATE POLICY "Users can change own vote"
  ON public.portal_idea_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can remove own vote"
  ON public.portal_idea_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Bình luận: bảng riêng; comment import từ Firebase có user_id NULL (giữ user_name)
CREATE TABLE public.portal_idea_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.portal_ideas(id) ON DELETE CASCADE,
  legacy_id TEXT,
  user_id UUID,
  user_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_idea_comments_idea ON public.portal_idea_comments (idea_id);

ALTER TABLE public.portal_idea_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view idea comments"
  ON public.portal_idea_comments FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can comment as themselves"
  ON public.portal_idea_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_staff(auth.uid()));

CREATE POLICY "Owners or admins can delete comments"
  ON public.portal_idea_comments FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

-- RPC quản trị: đổi cấp độ phát triển / phòng ban / cờ đề xuất Hội đồng.
-- SECURITY DEFINER + tự check quyền (bản gốc chỉ ẩn UI, không bảo vệ backend).
CREATE OR REPLACE FUNCTION public.admin_update_idea_status(
  _idea_id UUID,
  _development_level TEXT DEFAULT NULL,
  _department_name TEXT DEFAULT NULL,
  _council_proposal BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'system_admin'::app_role)
          OR has_role(auth.uid(), 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ quản trị viên được cập nhật trạng thái ý tưởng';
  END IF;
  UPDATE public.portal_ideas SET
    development_level = COALESCE(_development_level, development_level),
    department_name = COALESCE(_department_name, department_name),
    council_proposal = COALESCE(_council_proposal, council_proposal)
  WHERE id = _idea_id;
END;
$$;

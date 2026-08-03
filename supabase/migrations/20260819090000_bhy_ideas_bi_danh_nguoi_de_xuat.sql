-- Một số phiếu BHY Ideas ghi tên đăng nhập/biệt danh ở ô "Cán bộ đề xuất"
-- ('lypham', 'duy.nd', 'PHUONGNT5') nên không dò được theo họ tên.
-- Bảng tra tay để quản trị bổ sung dần, thay vì đoán trong code.

CREATE TABLE IF NOT EXISTS public.portal_idea_proposer_alias (
  bi_danh TEXT PRIMARY KEY,          -- đã qua bhy_chuan_hoa_ten
  user_id UUID NOT NULL,
  ghi_chu TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_idea_proposer_alias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view proposer alias"
  ON public.portal_idea_proposer_alias FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins can manage proposer alias"
  ON public.portal_idea_proposer_alias FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'system_admin'::app_role) OR has_role(auth.uid(), 'tcth_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR has_role(auth.uid(), 'tcth_admin'::app_role));

-- Tra bí danh trước, sau đó mới dò theo họ tên
CREATE OR REPLACE FUNCTION public.bhy_tim_can_bo_theo_ten(_ten TEXT, _phong_ideas TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql STABLE SET search_path = public AS $fn$
DECLARE
  _khoa TEXT;
  _phong TEXT;
  _so_khop INTEGER;
  _id UUID;
BEGIN
  IF _ten IS NULL OR btrim(_ten) = '' THEN RETURN NULL; END IF;
  _khoa := bhy_chuan_hoa_ten(split_part(_ten, ',', 1));
  IF _khoa = '' THEN RETURN NULL; END IF;

  SELECT a.user_id INTO _id FROM public.portal_idea_proposer_alias a WHERE a.bi_danh = _khoa;
  IF _id IS NOT NULL THEN RETURN _id; END IF;

  _phong := bhy_phong_ideas_sang_ho_so(_phong_ideas);

  SELECT count(*) INTO _so_khop FROM public.profiles p
  WHERE p.status = 'active' AND bhy_chuan_hoa_ten(p.full_name) = _khoa;

  IF _so_khop = 1 THEN
    SELECT p.user_id INTO _id FROM public.profiles p
    WHERE p.status = 'active' AND bhy_chuan_hoa_ten(p.full_name) = _khoa;
    RETURN _id;
  ELSIF _so_khop > 1 AND _phong IS NOT NULL THEN
    SELECT p.user_id INTO _id FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.status = 'active' AND bhy_chuan_hoa_ten(p.full_name) = _khoa AND d.name = _phong;
    RETURN _id;
  END IF;
  RETURN NULL;
END;
$fn$;

-- Seed 3 bí danh đã đối chiếu chắc chắn (email trên phiếu trùng đúng hồ sơ cán bộ)
INSERT INTO public.portal_idea_proposer_alias (bi_danh, user_id, ghi_chu)
SELECT v.bi_danh, p.user_id, v.ghi_chu
FROM (VALUES
  ('lypham',    'ln343018@gmail.com',            'Phiếu ghi tên đăng nhập, email trên phiếu trùng hồ sơ'),
  ('duy nd',    'nguyenducduy87@gmail.com',      'Phiếu ghi tên đăng nhập, email trên phiếu trùng hồ sơ'),
  ('phuongnt5', 'phuongnt5151089@gmail.com',     'Tên đăng nhập TCTH admin; dùng cho cả phiếu gửi từ email phụ phuong.aob@gmail.com')
) AS v(bi_danh, email, ghi_chu)
JOIN public.profiles p ON lower(p.email) = v.email
ON CONFLICT (bi_danh) DO NOTHING;

COMMENT ON TABLE public.portal_idea_proposer_alias IS
  'Bí danh/tên đăng nhập xuất hiện ở ô "Cán bộ đề xuất" của BHY Ideas, quy về đúng hồ sơ cán bộ.';

-- Đợt 3 BHY one: vai trò guest (đối tác, có thời hạn) + siết RLS toàn hệ thống.
-- Nguyên tắc: guest CHỈ đọc được nội dung cổng BHY one được chia sẻ; mọi bảng
-- nghiệp vụ trước đây mở "USING (true)" cho authenticated được siết về is_staff().

-- 1) Bảng hồ sơ khách (KHÔNG tạo dòng profiles cho guest — vô hình với query nhân sự)
CREATE TABLE public.guest_access (
  user_id UUID PRIMARY KEY,
  email TEXT,
  display_name TEXT NOT NULL,
  organization TEXT,
  note TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_access ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_guest_access_updated_at
  BEFORE UPDATE ON public.guest_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Helper (SECURITY DEFINER như has_role, tránh đệ quy RLS)
CREATE OR REPLACE FUNCTION public.is_guest(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'guest');
$$;

CREATE OR REPLACE FUNCTION public.guest_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_guest(_user_id) AND EXISTS (
    SELECT 1 FROM public.guest_access WHERE user_id = _user_id AND expires_at > now()
  );
$$;

-- Cán bộ = đã đăng nhập và KHÔNG phải guest (NULL → false để an toàn với anon)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND NOT public.is_guest(_user_id);
$$;

-- RLS guest_access: khách xem được dòng của mình (để biết hạn); admin quản trị
CREATE POLICY "Guests can view own access row"
  ON public.guest_access FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Content admins can manage guest access"
  ON public.guest_access FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

-- 3) Nhánh guest cho các bảng cổng BHY one
DROP POLICY "Authenticated can view site content" ON public.site_content;
CREATE POLICY "Staff or active guests can view site content"
  ON public.site_content FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR public.guest_active(auth.uid()));

DROP POLICY "Authenticated can view portal images" ON public.portal_images;
CREATE POLICY "Staff or active guests can view portal images"
  ON public.portal_images FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR public.guest_active(auth.uid()));

DROP POLICY "Authenticated can view portal uploads" ON public.portal_uploads;
CREATE POLICY "Staff or active guests can view portal uploads"
  ON public.portal_uploads FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR (public.guest_active(auth.uid()) AND is_shared_with_guests)
  );

DROP POLICY "Authenticated can insert own portal uploads" ON public.portal_uploads;
CREATE POLICY "Staff can insert own portal uploads"
  ON public.portal_uploads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_staff(auth.uid()));

DROP POLICY "Authenticated can view portal upload likes" ON public.portal_upload_likes;
CREATE POLICY "Staff can view portal upload likes"
  ON public.portal_upload_likes FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY "Users can like as themselves" ON public.portal_upload_likes;
CREATE POLICY "Staff can like as themselves"
  ON public.portal_upload_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_staff(auth.uid()));

-- Storage bhy-one: guest chỉ đọc được path shared/…
DROP POLICY "Staff can view bhy-one objects" ON storage.objects;
CREATE POLICY "Staff or active guests can view bhy-one objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'bhy-one' AND (
      public.is_staff(auth.uid())
      OR (public.guest_active(auth.uid()) AND name LIKE 'shared/%')
    )
  );

DROP POLICY "Staff can upload bhy-one objects" ON storage.objects;
CREATE POLICY "Staff can upload bhy-one objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bhy-one' AND public.is_staff(auth.uid()));

-- 4) SIẾT các policy SELECT "USING (true)" hiện có về is_staff().
-- Danh sách lấy từ pg_policies thật ngày 29/07/2026 (qual = true, role authenticated/public).
DO $harden$
DECLARE
  r RECORD;
BEGIN
  -- Xóa mọi policy SELECT mở toang (một bảng có thể có nhiều policy trùng, vd ai_prompts)
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'SELECT'
      AND qual = 'true'
      AND tablename NOT IN ('site_content', 'portal_uploads', 'portal_upload_likes', 'portal_images')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;

  -- Tạo lại đúng một policy is_staff cho mỗi bảng vừa siết
  FOR r IN
    SELECT DISTINCT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relrowsecurity
      AND c.relname IN (
        'ai_prompts','attachments','attitude_dimensions_catalog','core_values',
        'council_criteria','council_members','council_rounds','council_subjects',
        'departments','evaluation_cycles','feature_tips','leadership_competencies',
        'learning_campaign_targets','learning_campaigns','one_on_one_questions',
        'position_core_skills','position_to_vtb_group','positions','skill_catalog',
        'skill_growth_stage_images','skill_level_criteria','skill_level_images',
        'staff_groups','vtb_course_position_groups','vtb_course_skills',
        'vtb_course_training_plans','vtb_courses'
      )
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))',
      'Staff can view ' || r.tablename, r.tablename
    );
  END LOOP;
END
$harden$;

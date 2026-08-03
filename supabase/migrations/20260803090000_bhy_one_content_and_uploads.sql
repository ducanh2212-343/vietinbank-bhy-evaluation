-- Cổng BHY one (Đợt 2): nội dung chỉnh sửa được + kho tư liệu + gallery ảnh.
-- RLS bản staff-only; nhánh guest sẽ bổ sung ở Đợt 3.

-- 1) site_content: nội dung chữ của cổng, admin sửa inline (EditableText)
CREATE TABLE public.site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view site content"
  ON public.site_content FOR SELECT TO authenticated
  USING (true);

-- Chỉ TCTH admin / System admin được sửa nội dung cổng (không gồm bgd)
CREATE POLICY "Content admins can manage site content"
  ON public.site_content FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

-- 2) portal_uploads: tư liệu Kho Dữ Liệu (thay localStorage bhy_uploaded_items)
CREATE TABLE public.portal_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_id TEXT UNIQUE,                 -- id bản Firebase cũ, để import idempotent
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  image_path TEXT,                       -- ảnh đại diện trong bucket bhy-one
  image_paths TEXT[] NOT NULL DEFAULT '{}', -- ảnh bổ sung (dữ liệu thật có item 4 ảnh)
  tags TEXT[] NOT NULL DEFAULT '{}',
  department_name TEXT,
  author_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  custom_values JSONB,                   -- giữ customValues của bản Firebase
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_shared_with_guests BOOLEAN NOT NULL DEFAULT false,
  seed_likes INTEGER NOT NULL DEFAULT 0, -- like mang sang từ Firebase (không còn danh tính)
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_uploads_category ON public.portal_uploads (category);
CREATE INDEX idx_portal_uploads_created_at ON public.portal_uploads (created_at DESC);

ALTER TABLE public.portal_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view portal uploads"
  ON public.portal_uploads FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert own portal uploads"
  ON public.portal_uploads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can update own portal uploads"
  ON public.portal_uploads FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Content admins can manage portal uploads"
  ON public.portal_uploads FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

CREATE TRIGGER update_portal_uploads_updated_at
  BEFORE UPDATE ON public.portal_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) portal_upload_likes: mỗi user 1 like / tư liệu (thay bộ đếm likes tự do)
CREATE TABLE public.portal_upload_likes (
  upload_id UUID NOT NULL REFERENCES public.portal_uploads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (upload_id, user_id)
);

ALTER TABLE public.portal_upload_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view portal upload likes"
  ON public.portal_upload_likes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can like as themselves"
  ON public.portal_upload_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike their own like"
  ON public.portal_upload_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 4) portal_images: gallery ảnh theo slot (pillar.<id> / move.<id>) do admin biên tập
CREATE TABLE public.portal_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_key TEXT NOT NULL,
  image_path TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_images_slot ON public.portal_images (slot_key);

ALTER TABLE public.portal_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view portal images"
  ON public.portal_images FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Content admins can manage portal images"
  ON public.portal_images FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

CREATE TRIGGER update_portal_images_updated_at
  BEFORE UPDATE ON public.portal_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Bucket bhy-one: PRIVATE (toàn bộ cổng nằm sau đăng nhập, khác skill-images public).
-- Path quy ước: staff/<uuid>.<ext> (nội bộ) | shared/<uuid>.<ext> (Đợt 3 chia sẻ guest).
INSERT INTO storage.buckets (id, name, public) VALUES ('bhy-one', 'bhy-one', false);

CREATE POLICY "Staff can view bhy-one objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bhy-one');

CREATE POLICY "Staff can upload bhy-one objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bhy-one');

CREATE POLICY "Admins or owner can delete bhy-one objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'bhy-one' AND (
      owner = auth.uid()
      OR has_role(auth.uid(), 'system_admin'::app_role)
      OR has_role(auth.uid(), 'tcth_admin'::app_role)
    )
  );

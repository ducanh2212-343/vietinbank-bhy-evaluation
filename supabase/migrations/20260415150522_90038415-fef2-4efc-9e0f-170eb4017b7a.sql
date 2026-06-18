-- Create skill_level_images table
CREATE TABLE public.skill_level_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  level_no INTEGER NOT NULL CHECK (level_no BETWEEN 1 AND 4),
  image_url TEXT NOT NULL,
  image_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique: one active image per skill per level
CREATE UNIQUE INDEX idx_skill_level_images_unique_active
  ON public.skill_level_images (skill_id, level_no)
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.skill_level_images ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can view skill level images"
  ON public.skill_level_images FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage skill level images"
  ON public.skill_level_images FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'bgd'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

-- Trigger for updated_at
CREATE TRIGGER update_skill_level_images_updated_at
  BEFORE UPDATE ON public.skill_level_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('skill-images', 'skill-images', true);

-- Storage policies
CREATE POLICY "Anyone can view skill images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'skill-images');

CREATE POLICY "Admins can upload skill images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'skill-images'
    AND (
      public.has_role(auth.uid(), 'system_admin'::app_role)
      OR public.has_role(auth.uid(), 'bgd'::app_role)
      OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
    )
  );

CREATE POLICY "Admins can update skill images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'skill-images'
    AND (
      public.has_role(auth.uid(), 'system_admin'::app_role)
      OR public.has_role(auth.uid(), 'bgd'::app_role)
      OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
    )
  );

CREATE POLICY "Admins can delete skill images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'skill-images'
    AND (
      public.has_role(auth.uid(), 'system_admin'::app_role)
      OR public.has_role(auth.uid(), 'bgd'::app_role)
      OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
    )
  );
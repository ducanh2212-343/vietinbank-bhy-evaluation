-- Bộ hình chung 4 nấc phát triển skill (Ươm mầm / Bám rễ / Vươn cành / Lan tỏa).
-- Admin upload 1 ảnh cho mỗi nấc; dùng làm fallback chung cho mọi skill chưa có
-- ảnh riêng lẫn icon riêng. Vector SVG built-in chỉ còn là dự phòng cuối.
CREATE TABLE public.skill_growth_stage_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_no INTEGER NOT NULL CHECK (stage_no BETWEEN 1 AND 4),
  image_url TEXT NOT NULL,
  image_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique: one active image per stage
CREATE UNIQUE INDEX idx_skill_growth_stage_images_unique_active
  ON public.skill_growth_stage_images (stage_no)
  WHERE is_active = true;

ALTER TABLE public.skill_growth_stage_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view growth stage images"
  ON public.skill_growth_stage_images FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage growth stage images"
  ON public.skill_growth_stage_images FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'bgd'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

CREATE TRIGGER update_skill_growth_stage_images_updated_at
  BEFORE UPDATE ON public.skill_growth_stage_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ảnh lưu trong bucket 'skill-images' sẵn có (đường dẫn growth-stages/…),
-- các storage policy hiện hành đã phủ toàn bucket nên không cần policy mới.

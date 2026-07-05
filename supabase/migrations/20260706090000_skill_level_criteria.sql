-- Bộ tiêu chí hành vi xác định level skill (BARS + thang tích luỹ Guttman).
-- Admin quản trị hoàn toàn: thêm/sửa/tắt từng tiêu chí; AI chỉ sinh bản nháp.
-- Tắt (is_active=false) thay vì xoá cứng để giữ lịch sử khi có bảng trả lời
-- tham chiếu về sau.
CREATE TABLE public.skill_level_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  level_no INTEGER NOT NULL CHECK (level_no BETWEEN 1 AND 4),
  statement TEXT NOT NULL,
  -- Tiêu chí "cửa": bắt buộc đạt thì level mới được tính
  is_gate BOOLEAN NOT NULL DEFAULT false,
  -- Bắt buộc nhập minh chứng khi tự nhận đạt tiêu chí này
  requires_evidence BOOLEAN NOT NULL DEFAULT false,
  weight NUMERIC NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_level_criteria_skill ON public.skill_level_criteria(skill_id, level_no) WHERE is_active = true;

ALTER TABLE public.skill_level_criteria ENABLE ROW LEVEL SECURITY;

-- Cán bộ cần đọc tiêu chí khi làm wizard tự xác định level
CREATE POLICY "Authenticated can view skill level criteria"
  ON public.skill_level_criteria FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage skill level criteria"
  ON public.skill_level_criteria FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
    OR has_role(auth.uid(), 'bgd'::app_role)
  );

CREATE TRIGGER update_skill_level_criteria_updated_at
  BEFORE UPDATE ON public.skill_level_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Đăng ký tác vụ AI sinh nháp tiêu chí vào Quản trị AI (bật/tắt + sửa template được).
-- content rỗng = dùng template mặc định trong edge function.
INSERT INTO public.ai_prompts (mode, content, description, is_active)
VALUES (
  'generate_criteria',
  '',
  'Sinh nháp tiêu chí hành vi xác định level skill (admin duyệt trước khi lưu). Biến khả dụng: {skill_name} {skill_group} {description} {l1} {l2} {l3} {l4} {upskill_l0_l1} {upskill_l1_l2} {upskill_l2_l3} {upskill_l3_l4} {level_filter}',
  true
)
ON CONFLICT (mode) DO NOTHING;

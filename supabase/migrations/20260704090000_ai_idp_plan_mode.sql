-- Bổ sung tác vụ AI "Gợi ý kế hoạch hành động" (IDP 70/20/10) cho mục D biểu mẫu
-- và bật lại tác vụ gợi ý khóa học (người dùng cần 3 nút: chân dung năng lực,
-- kế hoạch hành động, khóa học). Content để trống = dùng prompt mặc định trong code.
INSERT INTO public.ai_prompts (mode, description, content, model, is_active)
VALUES (
  'suggest_idp_plan',
  'Gợi ý kế hoạch hành động 70/20/10 cho 1 skill ưu tiên (mục D). Biến: {skill_name}, {current_level}, {target_level}, {role}. Để trống content = dùng prompt mặc định trong code.',
  '',
  'google/gemini-2.5-flash',
  TRUE
)
ON CONFLICT (mode) DO UPDATE SET is_active = TRUE;

UPDATE public.ai_prompts SET is_active = TRUE WHERE mode = 'suggest_vtb_courses';

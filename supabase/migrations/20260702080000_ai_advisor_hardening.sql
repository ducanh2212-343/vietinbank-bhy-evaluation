-- AI advisor hardening:
-- 1) ai_usage_log — nhật ký gọi AI theo user, dùng cho rate-limit kiểm soát chi phí
-- 2) form_submissions.ai_portrait — lưu chân dung năng lực AI vào DB (thay localStorage)
-- 3) Dọn các mode AI không còn dùng; thêm mode suggest_vtb_courses vào ai_prompts

-- 1) Nhật ký sử dụng AI (edge function ghi bằng service role)
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mode text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_time
  ON public.ai_usage_log (user_id, created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Chỉ admin xem được nhật ký; client không được ghi (edge function dùng service role)
DROP POLICY IF EXISTS "Admins can view ai usage" ON public.ai_usage_log;
CREATE POLICY "Admins can view ai usage" ON public.ai_usage_log
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin')
    OR has_role(auth.uid(), 'bgd')
    OR has_role(auth.uid(), 'tcth_admin')
  );

-- 2) Lưu chân dung năng lực AI theo phiếu (CB/TP dùng chung, không sinh lại tốn credit)
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS ai_portrait text,
  ADD COLUMN IF NOT EXISTS ai_portrait_generated_at timestamptz;

COMMENT ON COLUMN public.form_submissions.ai_portrait IS 'Chân dung năng lực do AI sinh (markdown), dùng chung giữa cán bộ và cấp duyệt';

-- 3) Dọn 4 mode không có UI nào gọi (backend vẫn còn fallback trong code nếu cần khôi phục)
DELETE FROM public.ai_prompts
WHERE mode IN ('suggest_evidence', 'suggest_idp_plan', 'suggest_attitude_action', 'summarize_assessment');

-- Thêm mode gợi ý khóa học VTB (đang chạy thật) để admin chỉnh prompt/model — mặc định model rẻ
INSERT INTO public.ai_prompts (mode, description, content, model) VALUES (
  'suggest_vtb_courses',
  'Gợi ý khóa học Trường ĐT VietinBank phù hợp với kỹ năng đang phát triển. Biến: {skill_name}, {skill_group}, {current_level}, {target_level}, {position_id}, {candidates}. Để trống content = dùng prompt mặc định trong code. Tác vụ ngắn — nên dùng model tiết kiệm.',
  '',
  'google/gemini-2.5-flash-lite'
)
ON CONFLICT (mode) DO NOTHING;

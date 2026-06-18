
-- ai_settings: singleton row id=1
CREATE TABLE public.ai_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider TEXT NOT NULL DEFAULT 'lovable' CHECK (provider IN ('lovable','gemini','openai')),
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  temperature NUMERIC NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER NOT NULL DEFAULT 2048,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ai settings"
ON public.ai_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage ai settings"
ON public.ai_settings FOR ALL TO authenticated
USING (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'))
WITH CHECK (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'));

CREATE TRIGGER ai_settings_set_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_prompts
CREATE TABLE public.ai_prompts (
  mode TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ai prompts"
ON public.ai_prompts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage ai prompts"
ON public.ai_prompts FOR ALL TO authenticated
USING (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'))
WITH CHECK (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'));

CREATE TRIGGER ai_prompts_set_updated_at
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed
INSERT INTO public.ai_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

INSERT INTO public.ai_prompts (mode, content, description) VALUES
('system_base',
'Bạn là chuyên gia tư vấn phát triển năng lực ngành Ngân hàng tại Việt Nam. Trả lời bằng tiếng Việt, ngắn gọn, cụ thể, gợi ý hành động đo lường được (theo mô hình 70/20/10 và PDCA). Luôn nêu bằng chứng/cách kiểm chứng. Không bịa số liệu nội bộ.',
'Prompt hệ thống chung, áp dụng cho mọi chế độ AI.'),
('suggest_evidence',
'Gợi ý 3-5 minh chứng cụ thể cho kỹ năng "{skill_name}" ở mức L{level} của vị trí "{role}".{context_block}
Trả về dạng gạch đầu dòng, mỗi minh chứng có thể đo lường.',
'Gợi ý minh chứng cho 1 kỹ năng ở 1 cấp độ. Biến: {skill_name}, {level}, {role}, {context_block}.'),
('suggest_idp_plan',
'Lập kế hoạch IDP 70/20/10 trong 1 quý để nâng kỹ năng "{skill_name}" từ L{current_level} lên L{target_level} cho "{role}".
- 70% học qua công việc (3 hành động cụ thể, có deadline)
- 20% học qua người khác (mentor, peer review)
- 10% học qua đào tạo chính thức
Mỗi hành động phải có: nội dung, kết quả mong đợi, hỗ trợ cần.',
'Lập kế hoạch IDP nâng cấp 1 kỹ năng. Biến: {skill_name}, {current_level}, {target_level}, {role}.'),
('suggest_attitude_action',
'Cán bộ đang ở mức "{status}" cho nhóm thái độ "{attitude_name}".{context_block}
Gợi ý 2-3 hành động cải thiện cụ thể trong quý, kèm trụ cột nền tảng (IQ/EQ/PhQ/SQ) phù hợp và bằng chứng tiến bộ.',
'Gợi ý hành động cải thiện thái độ. Biến: {attitude_name}, {status}, {context_block}.'),
('summarize_assessment',
'Tóm tắt kết quả đánh giá quý sau cho quản lý (3-5 gạch đầu dòng, nêu điểm mạnh, điểm cần cải thiện, đề xuất hành động):

{payload}',
'Tóm tắt 1 phiếu đánh giá. Biến: {payload} (JSON dữ liệu phiếu).'),
('chat',
'',
'Chat tự do - không cần template; system_base + lịch sử hội thoại là đủ.')
ON CONFLICT (mode) DO NOTHING;

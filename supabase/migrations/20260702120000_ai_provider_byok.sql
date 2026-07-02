-- BYOK (Bring Your Own Key): quản trị nhà cung cấp AI chủ động, không phụ thuộc Lovable.
-- Admin chọn provider (lovable/gemini/openai/custom) và tự nhập API key trên màn hình Quản trị AI.
-- Edge function ai-advisor đọc cấu hình này bằng service role.

-- 1) Thêm cột lưu API key + base URL tùy chỉnh
ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS api_key text,
  ADD COLUMN IF NOT EXISTS api_base_url text;

COMMENT ON COLUMN public.ai_settings.api_key IS 'API key của nhà cung cấp AI (Gemini/OpenAI/custom). Chỉ admin đọc được qua RLS; edge function đọc bằng service role.';
COMMENT ON COLUMN public.ai_settings.api_base_url IS 'Base URL OpenAI-compatible cho provider=custom (ví dụ https://my-gateway.example.com/v1)';

-- 2) Mở rộng provider: thêm 'custom' (gateway OpenAI-compatible bất kỳ)
ALTER TABLE public.ai_settings DROP CONSTRAINT IF EXISTS ai_settings_provider_check;
ALTER TABLE public.ai_settings
  ADD CONSTRAINT ai_settings_provider_check
  CHECK (provider IN ('lovable', 'gemini', 'openai', 'custom'));

-- 3) Siết RLS: API key KHÔNG được để mọi user đọc — chỉ admin.
--    (Policy "Admins can manage ai settings" FOR ALL đã có sẵn, giữ nguyên.)
DROP POLICY IF EXISTS "Authenticated can view ai settings" ON public.ai_settings;

-- Nhà cung cấp AI linh hoạt: bỏ CHECK cứng danh sách provider để thêm nhà cung
-- cấp mới (deepseek, ...) không cần sửa schema. Danh sách provider hợp lệ được
-- kiểm soát tại registry PROVIDER_PRESETS trong edge function ai-advisor và
-- PROVIDER_OPTIONS trên màn hình Quản trị AI; provider lạ bị ai-advisor trả về
-- lỗi cấu hình rõ ràng thay vì âm thầm fallback.
ALTER TABLE public.ai_settings DROP CONSTRAINT IF EXISTS ai_settings_provider_check;
ALTER TABLE public.ai_settings
  ADD CONSTRAINT ai_settings_provider_check CHECK (length(trim(provider)) > 0);

COMMENT ON COLUMN public.ai_settings.provider IS
  'Nhà cung cấp AI (lovable/gemini/openai/deepseek/custom...). Giá trị hợp lệ do PROVIDER_PRESETS trong ai-advisor quyết định.';

-- Quản trị chi phí AI: đo token thực, bảng giá model, ngân sách tháng, dashboard.
-- Đơn giá/chi phí theo đơn vị tiền cấu hình ở ai_settings.pricing_currency (mặc định USD).

-- 1) ai_usage_log: thêm cột token + chi phí. Edge function ai-advisor ghi bằng service role.
ALTER TABLE public.ai_usage_log
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS prompt_tokens integer,
  ADD COLUMN IF NOT EXISTS completion_tokens integer,
  ADD COLUMN IF NOT EXISTS total_tokens integer,
  ADD COLUMN IF NOT EXISTS cost numeric(12,4);

COMMENT ON COLUMN public.ai_usage_log.cost IS 'Chi phí ước tính 1 lượt gọi, theo ai_settings.pricing_currency. NULL nếu model chưa có giá.';

-- Index phục vụ tổng hợp chi phí theo thời gian
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created ON public.ai_usage_log (created_at DESC);

-- 2) Bảng giá model — admin tự quản; đơn giá tính trên MỖI 1 TRIỆU token.
CREATE TABLE IF NOT EXISTS public.ai_model_pricing (
  model text PRIMARY KEY,
  label text,
  input_price numeric(12,4) NOT NULL DEFAULT 0,
  output_price numeric(12,4) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_model_pricing IS 'Đơn giá model per 1M token (input/output) — admin cập nhật theo bảng giá chính thức nhà cung cấp.';

ALTER TABLE public.ai_model_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage ai pricing" ON public.ai_model_pricing;
CREATE POLICY "Admins manage ai pricing" ON public.ai_model_pricing
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'))
  WITH CHECK (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin'));

-- 3) Ngân sách AI theo tháng (ai_settings singleton id=1)
ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS monthly_budget numeric(14,2),
  ADD COLUMN IF NOT EXISTS budget_enforce boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_currency text NOT NULL DEFAULT 'USD';
COMMENT ON COLUMN public.ai_settings.monthly_budget IS 'Ngân sách AI mỗi tháng (theo pricing_currency). NULL = không đặt trần.';
COMMENT ON COLUMN public.ai_settings.budget_enforce IS 'true = chặn gọi AI khi vượt ngân sách; false = chỉ theo dõi/cảnh báo.';

-- 4) Seed giá THAM KHẢO — admin PHẢI kiểm tra lại theo bảng giá chính thức (USD / 1M token).
INSERT INTO public.ai_model_pricing (model, label, input_price, output_price) VALUES
  ('google/gemini-2.5-flash-lite','Gemini 2.5 Flash Lite',0.10,0.40),
  ('google/gemini-2.5-flash','Gemini 2.5 Flash',0.30,2.50),
  ('google/gemini-2.5-pro','Gemini 2.5 Pro',1.25,10.00),
  ('google/gemini-3-flash-preview','Gemini 3 Flash (preview)',0.30,2.50),
  ('google/gemini-3.5-flash','Gemini 3.5 Flash',0.30,2.50),
  ('openai/gpt-5-nano','GPT-5 Nano',0.05,0.40),
  ('openai/gpt-5-mini','GPT-5 Mini',0.25,2.00),
  ('openai/gpt-5','GPT-5',1.25,10.00),
  ('deepseek/deepseek-chat','DeepSeek V3 (Chat)',0.27,1.10),
  ('deepseek/deepseek-reasoner','DeepSeek R1',0.55,2.19)
ON CONFLICT (model) DO NOTHING;

-- 5) RPC: tổng chi phí THÁNG hiện tại — dùng cho trần ngân sách trong edge function.
CREATE OR REPLACE FUNCTION public.get_ai_month_cost()
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(cost),0)
  FROM public.ai_usage_log
  WHERE created_at >= date_trunc('month', now());
$$;
REVOKE ALL ON FUNCTION public.get_ai_month_cost() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_month_cost() TO service_role;

-- 6) RPC: dashboard tổng hợp usage (chỉ admin gọi được — có guard has_role bên trong).
CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_start timestamptz := now() - make_interval(days => GREATEST(_days, 1));
  v_month_start timestamptz := date_trunc('month', now());
  result jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'system_admin') OR has_role(auth.uid(),'bgd') OR has_role(auth.uid(),'tcth_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'range_days', _days,
    'total_calls', COALESCE(COUNT(*), 0),
    'total_tokens', COALESCE(SUM(total_tokens), 0),
    'total_cost', COALESCE(SUM(cost), 0),
    'month_cost', (SELECT COALESCE(SUM(cost),0) FROM public.ai_usage_log WHERE created_at >= v_month_start),
    'by_mode', (
      SELECT COALESCE(jsonb_agg(x ORDER BY x.cost DESC), '[]'::jsonb) FROM (
        SELECT mode, COUNT(*) AS calls, COALESCE(SUM(total_tokens),0) AS tokens, COALESCE(SUM(cost),0) AS cost
        FROM public.ai_usage_log WHERE created_at >= v_start GROUP BY mode
      ) x
    ),
    'by_model', (
      SELECT COALESCE(jsonb_agg(x ORDER BY x.cost DESC), '[]'::jsonb) FROM (
        SELECT model, COUNT(*) AS calls, COALESCE(SUM(total_tokens),0) AS tokens, COALESCE(SUM(cost),0) AS cost
        FROM public.ai_usage_log WHERE created_at >= v_start AND model IS NOT NULL GROUP BY model
      ) x
    ),
    'by_day', (
      SELECT COALESCE(jsonb_agg(x ORDER BY x.day), '[]'::jsonb) FROM (
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
               COUNT(*) AS calls, COALESCE(SUM(total_tokens),0) AS tokens, COALESCE(SUM(cost),0) AS cost
        FROM public.ai_usage_log WHERE created_at >= v_start GROUP BY 1
      ) x
    ),
    'top_users', (
      SELECT COALESCE(jsonb_agg(x ORDER BY x.cost DESC), '[]'::jsonb) FROM (
        SELECT l.user_id, p.full_name,
               COUNT(*) AS calls, COALESCE(SUM(l.total_tokens),0) AS tokens, COALESCE(SUM(l.cost),0) AS cost
        FROM public.ai_usage_log l
        LEFT JOIN public.profiles p ON p.user_id = l.user_id
        WHERE l.created_at >= v_start
        GROUP BY l.user_id, p.full_name
        ORDER BY cost DESC
        LIMIT 10
      ) x
    )
  ) INTO result
  FROM public.ai_usage_log WHERE created_at >= v_start;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_ai_usage_summary(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_summary(integer) TO authenticated;


ALTER TABLE public.ai_prompts ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash';

INSERT INTO public.ai_prompts (mode, description, content, is_active, model)
VALUES
('coach_skill',
 'Tư vấn toàn diện 1 dòng skill. Biến: {skill_name},{skill_code},{skill_group},{kind},{role},{req_text},{l1},{l2},{l3},{l4},{self_level_txt},{manager_level_txt},{evidence_block},{employee_comment_block},{manager_note_block},{upskill_hint},{current_level},{next_level}',
 '', TRUE, 'google/gemini-2.5-flash'),
('competency_portrait',
 'Vẽ chân dung năng lực tổng thể. Biến: {payload}',
 '', TRUE, 'google/gemini-2.5-flash')
ON CONFLICT (mode) DO NOTHING;

-- Đảm bảo RLS bật và policies tồn tại
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_prompts_select_auth" ON public.ai_prompts;
CREATE POLICY "ai_prompts_select_auth" ON public.ai_prompts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ai_prompts_admin_all" ON public.ai_prompts;
CREATE POLICY "ai_prompts_admin_all" ON public.ai_prompts
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'bgd') OR
    public.has_role(auth.uid(), 'tcth_admin') OR
    public.has_role(auth.uid(), 'system_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'bgd') OR
    public.has_role(auth.uid(), 'tcth_admin') OR
    public.has_role(auth.uid(), 'system_admin')
  );

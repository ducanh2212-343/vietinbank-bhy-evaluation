-- Mẹo tính năng hay theo nhóm người dùng: admin soạn tip giới thiệu tính năng,
-- nhắm theo VAI TRÒ (target_roles rỗng = mọi người). Hiển thị: banner Tổng quan
-- (đóng được), modal hiện 1 lần, trang /meo-hay, và push cho cán bộ lâu không
-- đăng nhập (edge function send-feature-tip-push).

CREATE TABLE IF NOT EXISTS public.feature_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,                  -- markdown-lite
  cta_url text,                           -- route nội bộ, VD '/chien-dich-hoc-tap'
  cta_label text,
  target_roles app_role[] NOT NULL DEFAULT '{}',  -- rỗng = áp dụng mọi vai trò
  display_mode text NOT NULL DEFAULT 'banner' CHECK (display_mode IN ('banner', 'modal')),
  priority int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trạng thái theo từng cán bộ: đã xem modal / đã đóng banner / đã được push
CREATE TABLE IF NOT EXISTS public.feature_tip_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id uuid NOT NULL REFERENCES public.feature_tips(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seen_at timestamptz,
  dismissed_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tip_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_tip_states_profile ON public.feature_tip_states (profile_id);

ALTER TABLE public.feature_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_tip_states ENABLE ROW LEVEL SECURITY;

-- Mọi người đăng nhập đều đọc được tip (nội dung giới thiệu, không nhạy cảm);
-- lọc theo vai trò làm ở client — như learning_campaigns.
DROP POLICY IF EXISTS "Authenticated can view tips" ON public.feature_tips;
CREATE POLICY "Authenticated can view tips"
  ON public.feature_tips FOR SELECT TO authenticated USING (true);

-- Chỉ BGĐ / TCTH admin / system admin quản trị tip
DROP POLICY IF EXISTS "Admins manage tips" ON public.feature_tips;
CREATE POLICY "Admins manage tips"
  ON public.feature_tips FOR ALL
  USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
    OR public.has_role(auth.uid(), 'bgd'::app_role)
  );

-- Cán bộ tự quản lý trạng thái tip của CHÍNH MÌNH; service_role (cron) ghi pushed_at.
DROP POLICY IF EXISTS "Users manage own tip states" ON public.feature_tip_states;
CREATE POLICY "Users manage own tip states"
  ON public.feature_tip_states FOR ALL TO authenticated
  USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());

REVOKE ALL ON public.feature_tips FROM anon;
REVOKE ALL ON public.feature_tip_states FROM anon;

-- RPC cho edge function: mốc đăng nhập cuối từ auth.users — CHỈ service_role
-- (lộ danh sách tài khoản nếu grant rộng hơn).
CREATE OR REPLACE FUNCTION public.get_users_last_sign_in()
RETURNS TABLE (user_id uuid, last_sign_in_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, last_sign_in_at FROM auth.users;
$$;

REVOKE ALL ON FUNCTION public.get_users_last_sign_in() FROM public;
REVOKE ALL ON FUNCTION public.get_users_last_sign_in() FROM anon;
REVOKE ALL ON FUNCTION public.get_users_last_sign_in() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_last_sign_in() TO service_role;

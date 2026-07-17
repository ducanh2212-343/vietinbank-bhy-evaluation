-- Web Push (PWA): bảng đăng ký thiết bị nhận thông báo đẩy + RPC đọc VAPID key từ Vault.
-- ĐÃ ÁP vào project whlysprzsguehxmrjwha ngày 14/07/2026 (qua MCP apply_migration).
--
-- Thao tác vận hành kèm theo (đã làm 14/07/2026, ghi lại để tra cứu):
--   select vault.create_secret('<VAPID_PRIVATE_KEY_BASE64URL>', 'vapid_private_key');
-- Public key tương ứng hardcode ở src/lib/pushNotifications.ts và send-reminders
-- (public key không phải bí mật). Đổi cặp khóa: tạo secret Vault mới cùng tên
-- (vault.update_secret) + cập nhật public key ở 2 chỗ trên → mọi thiết bị phải đăng ký lại.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_push_subs_profile on public.push_subscriptions(profile_id);
alter table public.push_subscriptions enable row level security;

-- Cán bộ tự quản lý đăng ký thiết bị của CHÍNH MÌNH; service_role (cron) đọc/ghi tất cả.
drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (profile_id = public.get_my_profile_id())
  with check (profile_id = public.get_my_profile_id());
revoke all on public.push_subscriptions from anon;

-- RPC đọc VAPID private key từ Vault (secret name: 'vapid_private_key') — CHỈ service_role.
create or replace function public.get_vapid_private_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key' limit 1;
$$;
revoke all on function public.get_vapid_private_key() from public;
revoke all on function public.get_vapid_private_key() from anon;
revoke all on function public.get_vapid_private_key() from authenticated;
grant execute on function public.get_vapid_private_key() to service_role;

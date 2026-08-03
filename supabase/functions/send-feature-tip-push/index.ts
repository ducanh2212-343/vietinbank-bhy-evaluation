// send-feature-tip-push — Push "mẹo tính năng hay" cho cán bộ LÂU KHÔNG ĐĂNG NHẬP
// để kéo họ quay lại app. Mỗi cán bộ nhận tối đa 1 tip/lần chạy: tip active khớp
// vai trò, priority cao nhất, chưa push trong PUSH_COOLDOWN_DAYS (feature_tip_states.pushed_at).
// Mốc đăng nhập cuối đọc qua RPC get_users_last_sign_in (auth.users, chỉ service_role).
//
// AN TOÀN: dry_run MẶC ĐỊNH = true → chỉ TRẢ VỀ danh sách sẽ push, KHÔNG gửi.
//   Gửi thật: body {"dry_run": false}. Tuỳ chọn {"inactive_days": N} (mặc định 7).
// Quyền: service_role (cron) hoặc user admin (system_admin/bgd/tcth_admin) — như send-reminders.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@1.0.2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Public key khớp src/lib/pushNotifications.ts; private key trong Vault
// (RPC get_vapid_private_key, chỉ service_role gọi được).
const VAPID_PUBLIC_KEY =
  'BB5f9DtRA7ezR7W3vbUkFBHwLIQZ-Xv2sKBSQQo3dmAgouQaKiHk2JoXNTdt8qEIHh5N26DtlhigrQmvKgpWMR8';
const VAPID_SUBJECT = 'mailto:ducanh2212@gmail.com';

const DEFAULT_INACTIVE_DAYS = 7;
const PUSH_COOLDOWN_DAYS = 30; // không push lại cùng 1 tip cho cùng 1 người trong 30 ngày
const ADMIN_ROLES = ['system_admin', 'bgd', 'tcth_admin'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSub { id: string; profile_id: string; endpoint: string; p256dh: string; auth: string }
interface PushMsg { title: string; body: string; url: string; tag: string }

/** Gửi push tới mọi thiết bị của 1 cán bộ; tự vô hiệu hóa đăng ký chết (404/410). */
async function sendPushToProfile(
  admin: any,
  subsByProfile: Map<string, PushSub[]>,
  vapidPrivateKey: string | null,
  profileId: string,
  msg: PushMsg,
): Promise<number> {
  if (!vapidPrivateKey) return 0;
  const subs = subsByProfile.get(profileId) || [];
  let sent = 0;
  for (const s of subs) {
    try {
      const init = await buildPushPayload(
        { data: JSON.stringify(msg), options: { ttl: 12 * 3600, urgency: 'normal' } },
        { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
        { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: vapidPrivateKey },
      );
      const res = await fetch(s.endpoint, init);
      if (res.status === 404 || res.status === 410) {
        await admin.from('push_subscriptions').update({ is_active: false }).eq('id', s.id);
      } else if (res.ok) {
        sent++;
      } else {
        console.error('Push bị từ chối', { status: res.status, endpoint: s.endpoint.slice(0, 60) });
      }
    } catch (e) {
      console.error('Push lỗi', { error: String(e) });
    }
  }
  return sent;
}

// Đọc claims từ JWT (không xác minh chữ ký — chỉ để nhận diện service_role của cron).
function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Rút gọn nội dung tip thành body push: bỏ markdown cơ bản, cắt ~120 ký tự. */
function tipBody(content: string): string {
  const plain = content
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 120 ? `${plain.slice(0, 117)}...` : plain;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---- Xác thực: service_role (cron) hoặc user admin — như send-reminders ----
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    let authorized = token === SERVICE_KEY || parseJwtClaims(token)?.role === 'service_role';
    if (!authorized && token) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
        authorized = (roles || []).some((r: any) => ADMIN_ROLES.includes(r.role));
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }
    const dryRun = body?.dry_run !== false; // MẶC ĐỊNH an toàn: true
    const inactiveDays = Number(body?.inactive_days) >= 0 ? Number(body?.inactive_days) : DEFAULT_INACTIVE_DAYS;

    const now = Date.now();
    const inactiveCutoff = now - inactiveDays * 86400000;
    const cooldownCutoff = now - PUSH_COOLDOWN_DAYS * 86400000;

    // ---- 1) Cán bộ active + mốc đăng nhập cuối → lọc người "lâu không đăng nhập" ----
    const [profRes, signInRes] = await Promise.all([
      admin.from('profiles').select('id, user_id, full_name').eq('status', 'active').not('user_id', 'is', null),
      admin.rpc('get_users_last_sign_in'),
    ]);
    const lastSignIn = new Map<string, string | null>(
      ((signInRes.data || []) as any[]).map((r) => [r.user_id, r.last_sign_in_at]),
    );
    const profiles = ((profRes.data || []) as any[]).filter((p) => lastSignIn.has(p.user_id));
    const inactive = profiles.filter((p) => {
      const ts = lastSignIn.get(p.user_id);
      return !ts || new Date(ts).getTime() < inactiveCutoff;
    });

    // ---- 2) Chỉ giữ người có thiết bị đã bật push ----
    const subsByProfile = new Map<string, PushSub[]>();
    if (inactive.length > 0) {
      const { data: pushRows } = await admin
        .from('push_subscriptions')
        .select('id, profile_id, endpoint, p256dh, auth')
        .eq('is_active', true)
        .in('profile_id', inactive.map((p) => p.id));
      for (const r of (pushRows || []) as PushSub[]) {
        const arr = subsByProfile.get(r.profile_id) || [];
        arr.push(r);
        subsByProfile.set(r.profile_id, arr);
      }
    }
    const reachable = inactive.filter((p) => (subsByProfile.get(p.id) || []).length > 0);

    // ---- 3) Vai trò + tip active trong khung hiệu lực + trạng thái đã push ----
    const [rolesRes, tipsRes, statesRes] = await Promise.all([
      admin.from('user_roles').select('user_id, role').in('user_id', reachable.map((p) => p.user_id)),
      admin.from('feature_tips').select('*').eq('is_active', true)
        .order('priority', { ascending: false }).order('created_at', { ascending: false }),
      reachable.length > 0
        ? admin.from('feature_tip_states').select('tip_id, profile_id, pushed_at')
            .in('profile_id', reachable.map((p) => p.id))
        : Promise.resolve({ data: [] } as any),
    ]);
    const rolesByUser = new Map<string, string[]>();
    for (const r of (rolesRes.data || []) as any[]) {
      const arr = rolesByUser.get(r.user_id) || [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }
    const tips = ((tipsRes.data || []) as any[]).filter((t) => {
      if (t.starts_at && new Date(t.starts_at).getTime() > now) return false;
      if (t.ends_at && new Date(t.ends_at).getTime() < now) return false;
      return true;
    });
    const pushedRecently = new Set(
      ((statesRes.data || []) as any[])
        .filter((s) => s.pushed_at && new Date(s.pushed_at).getTime() > cooldownCutoff)
        .map((s) => `${s.tip_id}:${s.profile_id}`),
    );

    // ---- 4) Chọn tip cho từng người: khớp vai trò, chưa push trong cooldown ----
    const planned: { profile_id: string; name: string; tip_id: string; tip_title: string; url: string }[] = [];
    for (const p of reachable) {
      const userRoles = rolesByUser.get(p.user_id) || [];
      const tip = tips.find(
        (t) =>
          (t.target_roles.length === 0 || t.target_roles.some((r: string) => userRoles.includes(r))) &&
          !pushedRecently.has(`${t.id}:${p.id}`),
      );
      if (tip) {
        planned.push({
          profile_id: p.id, name: p.full_name,
          tip_id: tip.id, tip_title: tip.title, url: tip.cta_url || '/meo-hay',
        });
      }
    }

    let vapidPrivateKey: string | null = Deno.env.get('VAPID_PRIVATE_KEY') || null;
    if (!vapidPrivateKey) {
      const { data: vk } = await admin.rpc('get_vapid_private_key');
      vapidPrivateKey = (vk as string) || null;
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        dry_run: true,
        inactive_days: inactiveDays,
        inactive_users: inactive.length,
        users_with_device: reachable.length,
        planned: planned.map(({ name, tip_title }) => ({ name, tip: tip_title })),
        vapid_ready: !!vapidPrivateKey,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Gửi thật + ghi pushed_at (service_role vượt RLS) ----
    let sent = 0;
    const tipById = new Map(tips.map((t) => [t.id, t]));
    for (const plan of planned) {
      const tip = tipById.get(plan.tip_id)!;
      const n = await sendPushToProfile(admin, subsByProfile, vapidPrivateKey, plan.profile_id, {
        title: `💡 ${tip.title}`,
        body: tipBody(tip.content),
        url: plan.url,
        tag: 'meo-tinh-nang',
      });
      if (n > 0) {
        sent++;
        await admin.from('feature_tip_states').upsert(
          { tip_id: plan.tip_id, profile_id: plan.profile_id, pushed_at: new Date().toISOString() },
          { onConflict: 'tip_id,profile_id' },
        );
      }
    }

    return new Response(JSON.stringify({
      dry_run: false,
      inactive_days: inactiveDays,
      inactive_users: inactive.length,
      users_with_device: reachable.length,
      planned: planned.length,
      pushed: sent,
      vapid_ready: !!vapidPrivateKey,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

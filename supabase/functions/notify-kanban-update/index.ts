// notify-kanban-update — Push TỨC THÌ cho 2 CẤP TRÊN khi cán bộ cập nhật tiến độ Kanban.
//
// Kích hoạt bởi DB trigger trên kanban_card_logs (progress_update / completion_requested)
// qua pg_net → không phụ thuộc frontend, mọi lối vào cập nhật đều bắn thông báo.
//
// Quy tắc "2 cấp trên mình" (chốt với GĐ 26/07/2026):
//   cấp 1 = manager_id (quản lý trực tiếp — với cán bộ/phó phòng là TP);
//   cấp 2 = pgd_id (PGĐ/GĐ phụ trách) nếu khác cấp 1;
//   nếu chưa đủ 2 người nhận (TP, PGĐ cập nhật) → thêm Giám đốc.
//   Suy ra: cán bộ/PP → TP + PGĐ; TP → PGĐ phụ trách + GĐ; PGĐ → GĐ; GĐ → không ai.
//
// Nội dung push: tên cán bộ · tên hành động · trạng thái · tiến độ % · nội dung cập nhật.
// Quyền: chỉ service_role (trigger). Body: {log_id, dry_run?} — dry_run trả danh sách
// người nhận, không gửi (để kiểm thử).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@1.0.2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY =
  'BB5f9DtRA7ezR7W3vbUkFBHwLIQZ-Xv2sKBSQQo3dmAgouQaKiHk2JoXNTdt8qEIHh5N26DtlhigrQmvKgpWMR8';
const VAPID_SUBJECT = 'mailto:ducanh2212@gmail.com';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch { return null; }
}
function short(s: string | null | undefined, max = 160): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

const STATUS_LABEL: Record<string, string> = { todo: 'Phải làm', doing: 'Đang làm', done: 'Hoàn thành' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const authorized = token === SERVICE_KEY || parseJwtClaims(token)?.role === 'service_role';
    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }
    const logId = body?.log_id as string | undefined;
    const dryRun = body?.dry_run === true;
    if (!logId) {
      return new Response(JSON.stringify({ error: 'log_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Nội dung lấy từ DB (không tin payload) — log là nguồn sự thật
    const { data: log } = await admin
      .from('kanban_card_logs')
      .select('id, card_id, log_type, progress_percent, progress_note, current_result, blocker_note, support_needed')
      .eq('id', logId).maybeSingle();
    if (!log || !['progress_update', 'completion_requested'].includes(log.log_type)) {
      return new Response(JSON.stringify({ skipped: 'log không hợp lệ' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: card } = await admin
      .from('kanban_cards')
      .select('id, profile_id, title, kanban_status, progress_percent')
      .eq('id', log.card_id).maybeSingle();
    if (!card) {
      return new Response(JSON.stringify({ skipped: 'card không tồn tại' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: owner } = await admin
      .from('profiles').select('id, full_name, manager_id, pgd_id')
      .eq('id', card.profile_id).maybeSingle();
    if (!owner) {
      return new Response(JSON.stringify({ skipped: 'không có hồ sơ cán bộ' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Chuỗi 2 cấp trên ----
    const recipients: string[] = [];
    const push = (id: string | null | undefined) => {
      if (id && id !== owner.id && !recipients.includes(id)) recipients.push(id);
    };
    push(owner.manager_id);
    push(owner.pgd_id);
    if (recipients.length < 2) {
      // Chưa đủ 2 cấp (TP hoặc PGĐ cập nhật) → thêm Giám đốc
      const { data: gd } = await admin
        .from('profiles').select('id').eq('status', 'active').eq('position', 'Giám đốc').limit(1).maybeSingle();
      push(gd?.id);
    }
    const finalRecipients = recipients.slice(0, 2);

    // ---- Soạn nội dung ----
    const isDone = log.log_type === 'completion_requested';
    const status = isDone ? 'Gửi hoàn thành — chờ xác nhận' : (STATUS_LABEL[card.kanban_status] || card.kanban_status);
    const percent = log.progress_percent ?? card.progress_percent;
    const note = short(log.progress_note || log.current_result);
    const flags: string[] = [];
    if (log.blocker_note && String(log.blocker_note).trim()) flags.push('có vướng mắc');
    if (log.support_needed && String(log.support_needed).trim()) flags.push('cần hỗ trợ');
    const msg = {
      title: `${isDone ? '🏁' : '📝'} ${owner.full_name} vừa cập nhật hành động`,
      body: `${card.title} · ${status} · ${percent}%${flags.length ? ` · ${flags.join(', ')}` : ''}${note ? `\n↳ ${note}` : ''}`,
      url: '/hanh-dong-phat-trien?view=team',
      tag: `kanban-update-${log.id}`, // tag riêng từng lần để không đè thông báo trước
    };

    if (dryRun) {
      const { data: names } = await admin.from('profiles').select('id, full_name').in('id', finalRecipients);
      return new Response(JSON.stringify({ dry_run: true, owner: owner.full_name, recipients: names, msg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Gửi push ----
    let vapidPrivateKey: string | null = Deno.env.get('VAPID_PRIVATE_KEY') || null;
    if (!vapidPrivateKey) {
      const { data: vk } = await admin.rpc('get_vapid_private_key');
      vapidPrivateKey = (vk as string) || null;
    }
    let sent = 0;
    if (vapidPrivateKey && finalRecipients.length) {
      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('id, profile_id, endpoint, p256dh, auth')
        .eq('is_active', true)
        .in('profile_id', finalRecipients);
      for (const s of (subs || []) as any[]) {
        try {
          const init = await buildPushPayload(
            { data: JSON.stringify(msg), options: { ttl: 12 * 3600, urgency: 'normal' } },
            { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
            { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: vapidPrivateKey },
          );
          const res = await fetch(s.endpoint, init);
          if (res.status === 404 || res.status === 410) {
            await admin.from('push_subscriptions').update({ is_active: false }).eq('id', s.id);
          } else if (res.ok) sent++;
        } catch (e) { console.error('Push lỗi', { error: String(e) }); }
      }
    }
    return new Response(JSON.stringify({ recipients: finalRecipients.length, push_sent: sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

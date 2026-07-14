// send-reminders — Nhắc việc qua email cho người phụ trách.
// Gom "digest" theo từng người nhận: phiếu chờ rà soát (TP), phiếu chờ phê duyệt (PGĐ),
// và thẻ Kanban chờ xác nhận (quản lý). Enqueue vào hàng đợi 'transactional_emails' có sẵn.
// Đánh giá đầu mối (Hội đồng): tự chuyển kỳ 'open' quá voting_deadline sang 'closed';
// nhắc thành viên còn phiếu chưa gửi khi còn <=3 ngày đến hạn (1 lần/ngày/kỳ/người,
// chung idempotency_key với nút nhắc tay ở tab Tiến độ nên không gửi trùng).
//
// AN TOÀN: dry_run MẶC ĐỊNH = true → chỉ TRẢ VỀ danh sách sẽ gửi, KHÔNG gửi.
//   Muốn gửi thật: gọi với body {"dry_run": false}. Idempotency theo ngày để chạy lại cùng ngày không gửi trùng.
// Quyền: service_role (cron) hoặc user admin (system_admin/bgd/tcth_admin).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { APP_URL, FROM_DOMAIN, SENDER_DOMAIN } from '../_shared/email-config.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_NAME = 'chieuthuc3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_ROLES = ['system_admin', 'bgd', 'tcth_admin'];

// Đọc claims từ JWT (không xác minh chữ ký — chỉ để nhận diện service_role của cron).
// Dùng đúng cách của process-email-queue: bền vững khi service_role key đổi định dạng
// (legacy JWT vs sb_secret_...) nên KHÔNG so khớp chuỗi cứng với biến môi trường.
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

interface Digest {
  profileId: string;
  name: string;
  email: string;
  reviews: number;   // phiếu chờ TP rà soát
  approvals: number; // phiếu chờ PGĐ phê duyệt
  kanban: number;    // thẻ chờ quản lý xác nhận
}

function renderHtml(d: Digest): { subject: string; html: string; text: string } {
  const lines: string[] = [];
  if (d.reviews) lines.push(`${d.reviews} phiếu đánh giá đang chờ bạn rà soát`);
  if (d.approvals) lines.push(`${d.approvals} phiếu đánh giá đang chờ bạn phê duyệt`);
  if (d.kanban) lines.push(`${d.kanban} thẻ hành động phát triển đang chờ bạn xác nhận hoàn thành`);
  const total = d.reviews + d.approvals + d.kanban;
  const subject = `[343 Phát triển nhân sự] Bạn có ${total} việc cần xử lý`;
  const items = lines.map((l) => `<li style="margin:4px 0">${l}</li>`).join('');
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
<p>Kính gửi <b>${d.name}</b>,</p>
<p>Hệ thống 343 Phát triển nhân sự ghi nhận bạn đang có các việc cần xử lý:</p>
<ul>${items}</ul>
<p><a href="${APP_URL}" style="display:inline-block;background:#0b3d91;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Đăng nhập để xử lý</a></p>
<p style="color:#6b7280;font-size:12px">Email nhắc việc tự động. Vui lòng không trả lời email này.</p>
</body></html>`;
  const text = `Kính gửi ${d.name},\nBạn đang có: ${lines.join('; ')}.\nĐăng nhập: ${APP_URL}`;
  return { subject, html, text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---- Xác thực: service_role (cron) hoặc user admin ----
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    // Cron gửi service_role JWT lấy từ Vault; nhận diện qua claim role thay vì so chuỗi
    // (env SUPABASE_SERVICE_ROLE_KEY có thể khác định dạng với key trong Vault).
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

    // ---- Thu thập việc cần xử lý ----
    const [profRes, subRes, kanRes] = await Promise.all([
      admin.from('profiles').select('id, full_name, email, manager_id, pgd_id').eq('status', 'active'),
      admin.from('form_submissions').select('employee_id, reviewer_id, status').in('status', ['submitted', 'reviewed']),
      admin.from('kanban_cards').select('profile_id').eq('is_active', true).eq('completion_status', 'waiting_manager_confirmation'),
    ]);
    const profiles = (profRes.data || []) as any[];
    const byId = new Map(profiles.map((p) => [p.id, p]));

    const digests = new Map<string, Digest>();
    const ensure = (pid: string | null | undefined): Digest | null => {
      if (!pid) return null;
      const p = byId.get(pid);
      if (!p || !p.email) return null;
      let d = digests.get(pid);
      if (!d) { d = { profileId: pid, name: p.full_name, email: p.email, reviews: 0, approvals: 0, kanban: 0 }; digests.set(pid, d); }
      return d;
    };

    for (const f of (subRes.data || []) as any[]) {
      if (f.status === 'submitted') {
        const d = ensure(f.reviewer_id); if (d) d.reviews++;
      } else if (f.status === 'reviewed') {
        const emp = byId.get(f.employee_id);
        const d = ensure(emp?.pgd_id); if (d) d.approvals++;
      }
    }
    for (const c of (kanRes.data || []) as any[]) {
      const owner = byId.get(c.profile_id);
      const d = ensure(owner?.manager_id || owner?.pgd_id); if (d) d.kanban++;
    }

    const list = [...digests.values()].filter((d) => d.reviews + d.approvals + d.kanban > 0);

    // ---- Đánh giá đầu mối: kỳ quá hạn cần chốt + thành viên cần nhắc ----
    const nowMs = Date.now();
    const remindWindowMs = 3 * 24 * 3600 * 1000; // nhắc khi còn <=3 ngày đến hạn
    const { data: openRounds } = await admin
      .from('council_rounds')
      .select('id, name, voting_deadline')
      .eq('status', 'open');
    const roundsToClose = (openRounds || []).filter(
      (r: any) => r.voting_deadline && new Date(r.voting_deadline).getTime() < nowMs,
    );
    const roundsToRemind = (openRounds || []).filter((r: any) => {
      if (!r.voting_deadline) return false;
      const dl = new Date(r.voting_deadline).getTime();
      return dl >= nowMs && dl - nowMs <= remindWindowMs;
    });

    interface CouncilReminder { roundName: string; deadline: string; profileId: string; name: string; email: string; pending: string[] }
    const councilReminders: CouncilReminder[] = [];
    if (roundsToRemind.length > 0) {
      const roundIds = roundsToRemind.map((r: any) => r.id);
      const [membersRes, subjectsRes, evalsRes] = await Promise.all([
        admin.from('council_members').select('profile_id').eq('is_active', true),
        admin.from('council_subjects').select('id, round_id, full_name, profile_id').eq('is_active', true).in('round_id', roundIds),
        admin.from('council_evaluations').select('subject_id, evaluator_id').eq('status', 'submitted').in('round_id', roundIds),
      ]);
      const submitted = new Set(((evalsRes.data || []) as any[]).map((e) => `${e.subject_id}:${e.evaluator_id}`));
      for (const round of roundsToRemind as any[]) {
        const roundSubjects = ((subjectsRes.data || []) as any[]).filter((s) => s.round_id === round.id);
        for (const m of (membersRes.data || []) as any[]) {
          const p = byId.get(m.profile_id);
          if (!p?.email) continue;
          const pending = roundSubjects
            .filter((s) => !(s.profile_id && s.profile_id === m.profile_id))
            .filter((s) => !submitted.has(`${s.id}:${m.profile_id}`))
            .map((s) => s.full_name);
          if (pending.length > 0) {
            councilReminders.push({
              roundName: round.name,
              deadline: new Date(round.voting_deadline).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
              profileId: m.profile_id, name: p.full_name, email: p.email, pending,
            });
          }
        }
      }
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        dry_run: true, recipients: list.length, digests: list,
        council: {
          rounds_to_close: roundsToClose.map((r: any) => r.name),
          reminders: councilReminders.map((c) => ({ round: c.roundName, name: c.name, pending: c.pending.length })),
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Chốt kỳ quá hạn (chỉ khi chạy thật)
    let roundsClosed = 0;
    if (roundsToClose.length > 0) {
      const { error: closeErr } = await admin
        .from('council_rounds')
        .update({ status: 'closed' })
        .in('id', roundsToClose.map((r: any) => r.id));
      if (!closeErr) roundsClosed = roundsToClose.length;
    }

    // ---- Gửi thật: enqueue mỗi người 1 email, idempotency theo ngày ----
    const today = new Date().toISOString().slice(0, 10);
    let enqueued = 0;
    for (const d of list) {
      const { subject, html, text } = renderHtml(d);
      const messageId = crypto.randomUUID();
      const idempotencyKey = `reminder:${d.profileId}:${today}`;
      await admin.from('email_send_log').insert({
        message_id: messageId, template_name: 'reminder_digest', recipient_email: d.email, status: 'pending',
      });
      const { error } = await admin.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: messageId, to: d.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN, subject, html, text,
          purpose: 'transactional', label: 'reminder_digest',
          idempotency_key: idempotencyKey, queued_at: new Date().toISOString(),
        },
      });
      if (!error) enqueued++;
    }

    // ---- Nhắc thành viên Hội đồng còn phiếu chưa gửi (dedup 1 lần/ngày/kỳ/người) ----
    let councilEnqueued = 0;
    for (const c of councilReminders) {
      const recipient = c.email.trim().toLowerCase();
      const idempotencyKey = `cvote-${c.roundName}-${c.profileId}-${today}`;
      const { data: dup } = await admin
        .from('email_send_log')
        .select('id')
        .eq('template_name', 'council-vote-reminder')
        .eq('recipient_email', recipient)
        .in('status', ['pending', 'sent'])
        .contains('metadata', { idempotency_key: idempotencyKey })
        .limit(1);
      if (dup && dup.length > 0) continue;
      const { data: suppressed } = await admin
        .from('suppressed_emails').select('id').eq('email', recipient).maybeSingle();
      if (suppressed) continue;
      const subjectList = c.pending.map((s) => `<li style="margin:3px 0">${s}</li>`).join('');
      const subject = `🗳️ Nhắc chấm điểm đầu mối ${c.roundName} — 343 Phát triển nhân sự`;
      const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
<p>Kính gửi <b>${c.name}</b>,</p>
<p>Kỳ đánh giá công tác đầu mối <b>${c.roundName}</b> sẽ chốt phiếu lúc <b>${c.deadline}</b>.
Ông/bà còn <b>${c.pending.length} phiếu</b> chưa gửi cho các cán bộ đầu mối:</p>
<ul>${subjectList}</ul>
<p><a href="${APP_URL}/danh-gia-dau-moi" style="display:inline-block;background:#0b3d91;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Mở phiếu chấm điểm</a></p>
<p style="color:#6b7280;font-size:12px">Email nhắc tự động; kết quả chấm được ẩn danh trong báo cáo tổng hợp.</p>
</body></html>`;
      const text = `Kính gửi ${c.name},\nKỳ đánh giá đầu mối ${c.roundName} chốt phiếu lúc ${c.deadline}. Ông/bà còn ${c.pending.length} phiếu chưa gửi:\n${c.pending.map((s) => `- ${s}`).join('\n')}\nChấm điểm tại: ${APP_URL}/danh-gia-dau-moi`;
      const messageId = crypto.randomUUID();
      await admin.from('email_send_log').insert({
        message_id: messageId, template_name: 'council-vote-reminder', recipient_email: recipient,
        status: 'pending', metadata: { idempotency_key: idempotencyKey },
      });
      const { error } = await admin.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: messageId, to: recipient, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN, subject, html, text,
          purpose: 'transactional', label: 'council-vote-reminder',
          idempotency_key: idempotencyKey, queued_at: new Date().toISOString(),
        },
      });
      if (!error) councilEnqueued++;
    }

    return new Response(JSON.stringify({
      dry_run: false, recipients: list.length, enqueued,
      council: { rounds_closed: roundsClosed, reminders_enqueued: councilEnqueued },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

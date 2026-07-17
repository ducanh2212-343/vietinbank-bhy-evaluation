// send-reminders — Nhắc việc qua email cho người phụ trách.
// Gom "digest" theo từng người nhận: phiếu chờ rà soát (TP), phiếu chờ phê duyệt (PGĐ),
// và thẻ Kanban chờ xác nhận (quản lý). Enqueue vào hàng đợi 'transactional_emails' có sẵn.
// Đánh giá đầu mối (Hội đồng): tự chuyển kỳ 'open' quá voting_deadline sang 'closed';
// nhắc thành viên còn phiếu chưa gửi khi còn <=3 ngày đến hạn (1 lần/ngày/kỳ/người,
// chung idempotency_key với nút nhắc tay ở tab Tiến độ nên không gửi trùng).
// Bổ sung 07/2026: (1) từ 15 ngày trước hạn đóng kỳ (kể cả khi đã quá hạn, tới khi đóng
// kỳ) — nhắc TỪNG cán bộ chưa nộp phiếu; (2) digest TP/PGĐ kèm số cán bộ chưa nộp thuộc
// phạm vi; (3) digest toàn cảnh cho BGĐ/TCTH.
//
// AN TOÀN: dry_run MẶC ĐỊNH = true → chỉ TRẢ VỀ danh sách sẽ gửi, KHÔNG gửi.
//   Muốn gửi thật: gọi với body {"dry_run": false}. Idempotency theo ngày để chạy lại cùng ngày không gửi trùng.
// Quyền: service_role (cron) hoặc user admin (system_admin/bgd/tcth_admin).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@1.0.2';
import { APP_URL, FROM_DOMAIN, SENDER_DOMAIN } from '../_shared/email-config.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_NAME = 'chieuthuc3';

// Web Push (07/2026): kênh nhắc chính cho TỪNG cán bộ (email cá nhân đã tắt để giữ
// Resend trong ngưỡng miễn phí — email chỉ còn gửi cấp quản lý TP/PGĐ/TCTH/BGĐ).
// Public key khớp src/lib/pushNotifications.ts; private key nằm trong Vault
// (RPC get_vapid_private_key, chỉ service_role gọi được).
const VAPID_PUBLIC_KEY =
  'BB5f9DtRA7ezR7W3vbUkFBHwLIQZ-Xv2sKBSQQo3dmAgouQaKiHk2JoXNTdt8qEIHh5N26DtlhigrQmvKgpWMR8';
const VAPID_SUBJECT = 'mailto:ducanh2212@gmail.com';

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
  // Gần hạn kỳ: số cán bộ CHƯA NỘP phiếu thuộc phạm vi mình phụ trách
  deptNotSubmitted?: number;  // TP — trong phòng
  blockNotSubmitted?: number; // PGĐ — trong khối
  cycleName?: string;
  deadlineText?: string;
}

function renderHtml(d: Digest): { subject: string; html: string; text: string; summary: string } {
  const lines: string[] = [];
  if (d.reviews) lines.push(`${d.reviews} phiếu đánh giá đang chờ bạn rà soát`);
  if (d.approvals) lines.push(`${d.approvals} phiếu đánh giá đang chờ bạn phê duyệt`);
  if (d.kanban) lines.push(`${d.kanban} thẻ hành động phát triển đang chờ bạn xác nhận hoàn thành`);
  const dueSuffix = d.cycleName
    ? ` kỳ ${d.cycleName}${d.deadlineText ? ` (hạn nộp ${d.deadlineText})` : ''}`
    : '';
  if (d.deptNotSubmitted) lines.push(`${d.deptNotSubmitted} cán bộ trong phòng CHƯA NỘP phiếu${dueSuffix}`);
  if (d.blockNotSubmitted) lines.push(`${d.blockNotSubmitted} cán bộ trong khối phụ trách CHƯA NỘP phiếu${dueSuffix}`);
  const total = d.reviews + d.approvals + d.kanban + (d.deptNotSubmitted || 0) + (d.blockNotSubmitted || 0);
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
  return { subject, html, text, summary: lines.join('; ') };
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
      admin.from('profiles').select('id, user_id, full_name, email, manager_id, pgd_id').eq('status', 'active'),
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

    // ---- Kỳ đánh giá hiện tại: cán bộ CHƯA NỘP + số tồn theo cấp (gần hạn/quá hạn) ----
    // Kỳ ĐANG ĐÁNH GIÁ = kỳ in_progress mới nhất (admin mở/đóng thủ công — kỳ Quý II có
    // thể đánh giá vào đầu tháng 7; ngày trên kỳ chỉ là nhãn quý). Không có kỳ mở → không nhắc.
    // "Cửa sổ nhắc" = kỳ in_progress và còn <= 15 NGÀY đến hạn đóng, và TIẾP TỤC khi
    // quá hạn cho tới khi admin đóng kỳ — áp dụng cho CẢ nhắc từng cán bộ chưa nộp
    // lẫn số tồn trong digest TP/PGĐ/BGĐ ("chưa nộp đúng hạn thì vẫn nhắc").
    // Mỗi người tối đa 1 email/ngày (idempotent); đóng kỳ là dừng toàn bộ.
    const REMIND_BEFORE_DAYS = 15;
    const nowTs = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: cycleRows } = await admin
      .from('evaluation_cycles')
      .select('id, name, start_date, end_date, status, submission_deadline');
    const pickCycle = (rows: any[]): any | null => {
      const inProg = (rows || []).filter((c) => c.status === 'in_progress');
      if (!inProg.length) return null;
      return [...inProg].sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)))[0];
    };
    // Hạn nộp HIỆU LỰC = submission_deadline (TCTH thiết đặt), fallback cuối ngày end_date.
    // Trùng logic getEffectiveDeadline (src/lib/submissionKpi.ts) — KHÔNG dùng end_date
    // (ngày cuối quý) làm hạn nộp vì hai mốc có thể khác nhau (VD Quý II: cuối quý 30/6,
    // hạn nộp thật 26/7).
    const effectiveDeadlineTs = (c: any): number => {
      if (c.submission_deadline) return new Date(c.submission_deadline).getTime();
      const [y, m, d] = String(c.end_date).split('-').map(Number);
      return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 16, 59, 59)).getTime(); // 23:59:59 giờ VN
    };
    const cycle = pickCycle(cycleRows || []);
    let notSubmitted: any[] = [];
    let cycleWaitTP = 0, cycleWaitPGD = 0;
    let inWindow = false;      // cửa sổ nhắc cá nhân: <=15 ngày trước hạn HOẶC quá hạn (tới khi đóng kỳ)
    let dueWindow = false;     // cửa sổ digest cấp quản lý: giống trên
    let deadlineText = '';
    if (cycle) {
      const deadlineTs = effectiveDeadlineTs(cycle);
      deadlineText = new Date(deadlineTs).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const daysLeft = Math.floor((deadlineTs - nowTs) / 86400000);
      dueWindow = daysLeft <= REMIND_BEFORE_DAYS;
      inWindow = dueWindow;
      const { data: cycleSubs } = await admin
        .from('form_submissions')
        .select('employee_id, status')
        .eq('cycle_id', cycle.id);
      const rank: Record<string, number> = { draft: 1, submitted: 2, reviewed: 3, approved: 4 };
      const best = new Map<string, string>();
      (cycleSubs || []).forEach((s: any) => {
        const prev = best.get(s.employee_id);
        if (!prev || (rank[s.status] || 0) > (rank[prev] || 0)) best.set(s.employee_id, s.status);
      });
      notSubmitted = profiles.filter((p) => {
        const st = best.get(p.id);
        return !st || st === 'draft';
      });
      cycleWaitTP = [...best.values()].filter((s) => s === 'submitted').length;
      cycleWaitPGD = [...best.values()].filter((s) => s === 'reviewed').length;
      // Trong cửa sổ digest: cộng số "chưa nộp" vào digest của TP (theo phòng) và PGĐ (theo khối)
      if (dueWindow) {
        for (const p of notSubmitted) {
          const dTp = ensure(p.manager_id);
          if (dTp) {
            dTp.deptNotSubmitted = (dTp.deptNotSubmitted || 0) + 1;
            dTp.cycleName = cycle.name; dTp.deadlineText = deadlineText;
          }
          if (p.pgd_id && p.pgd_id !== p.manager_id) {
            const dPgd = ensure(p.pgd_id);
            if (dPgd) {
              dPgd.blockNotSubmitted = (dPgd.blockNotSubmitted || 0) + 1;
              dPgd.cycleName = cycle.name; dPgd.deadlineText = deadlineText;
            }
          }
        }
      }
    }

    const list = [...digests.values()].filter(
      (d) => d.reviews + d.approvals + d.kanban + (d.deptNotSubmitted || 0) + (d.blockNotSubmitted || 0) > 0,
    );

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

    // ---- Người nhận digest toàn cảnh: BGĐ + TCTH admin ----
    const { data: leaderRoles } = await admin
      .from('user_roles').select('user_id').in('role', ['bgd', 'tcth_admin']);
    const leaderUserIds = new Set(((leaderRoles || []) as any[]).map((r) => r.user_id));
    const leaders = profiles.filter((p) => p.user_id && leaderUserIds.has(p.user_id) && p.email);
    const kanbanWaitingTotal = (kanRes.data || []).length;
    const { count: kanbanOverdueTotal } = await admin
      .from('kanban_cards')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .neq('kanban_status', 'done')
      .lt('deadline', todayStr);
    // Số tồn TOÀN CỤC (mọi kỳ) — phiếu đã nộp chờ TP / đã rà soát chờ PGĐ, kể cả kỳ cũ
    // chưa đóng, để BGĐ không mất dấu tồn đọng kỳ trước.
    const globalWaitTP = ((subRes.data || []) as any[]).filter((s) => s.status === 'submitted').length;
    const globalWaitPGD = ((subRes.data || []) as any[]).filter((s) => s.status === 'reviewed').length;
    const leadershipNeeded =
      globalWaitTP + globalWaitPGD + kanbanWaitingTotal > 0 || (dueWindow && notSubmitted.length > 0);

    // ---- Web Push: tải đăng ký thiết bị của mọi người liên quan (1 query) ----
    const pushTargetIds = new Set<string>();
    for (const d of list) pushTargetIds.add(d.profileId);
    for (const l of leaders) pushTargetIds.add(l.id);
    if (inWindow) for (const p of notSubmitted) pushTargetIds.add(p.id);
    const subsByProfile = new Map<string, PushSub[]>();
    if (pushTargetIds.size > 0) {
      const { data: pushRows } = await admin
        .from('push_subscriptions')
        .select('id, profile_id, endpoint, p256dh, auth')
        .eq('is_active', true)
        .in('profile_id', [...pushTargetIds]);
      for (const r of (pushRows || []) as PushSub[]) {
        const arr = subsByProfile.get(r.profile_id) || [];
        arr.push(r);
        subsByProfile.set(r.profile_id, arr);
      }
    }
    let vapidPrivateKey: string | null = Deno.env.get('VAPID_PRIVATE_KEY') || null;
    if (!vapidPrivateKey) {
      const { data: vk } = await admin.rpc('get_vapid_private_key');
      vapidPrivateKey = (vk as string) || null;
    }
    const staffWithDevice = inWindow
      ? notSubmitted.filter((p) => (subsByProfile.get(p.id) || []).length > 0).length
      : 0;

    if (dryRun) {
      return new Response(JSON.stringify({
        dry_run: true, recipients: list.length, digests: list,
        push: {
          vapid_ready: !!vapidPrivateKey,
          devices_registered: [...subsByProfile.values()].reduce((n, a) => n + a.length, 0),
          staff_with_device: staffWithDevice,
        },
        cycle: cycle ? {
          name: cycle.name, end_date: cycle.end_date,
          staff_remind_window: inWindow, digest_window: dueWindow,
          not_submitted: notSubmitted.length, waiting_tp: cycleWaitTP, waiting_pgd: cycleWaitPGD,
          staff_reminders: inWindow ? notSubmitted.filter((p) => p.email).map((p) => p.full_name) : [],
        } : null,
        leadership: {
          needed: leadershipNeeded,
          recipients: leadershipNeeded ? leaders.map((l) => l.full_name) : [],
          waiting_tp_all: globalWaitTP,
          waiting_pgd_all: globalWaitPGD,
          kanban_waiting: kanbanWaitingTotal,
          kanban_overdue: kanbanOverdueTotal || 0,
        },
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

    // ---- Gửi thật: digest cấp quản lý = EMAIL (trong ngưỡng Resend) + PUSH ----
    const today = new Date().toISOString().slice(0, 10);
    let enqueued = 0;
    let digestPushSent = 0;
    for (const d of list) {
      const { subject, html, text, summary } = renderHtml(d);
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
      digestPushSent += await sendPushToProfile(admin, subsByProfile, vapidPrivateKey, d.profileId, {
        title: subject, body: summary, url: '/tong-quan', tag: 'digest-quan-ly',
      });
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

    // ---- Nhắc TỪNG cán bộ chưa nộp phiếu: WEB PUSH (15 ngày trước hạn + khi quá hạn) ----
    // 07/2026: email nhắc cá nhân ĐÃ TẮT (giữ Resend trong ngưỡng miễn phí — email chỉ
    // còn cho cấp quản lý). Cán bộ nhận push trên thiết bị đã bật thông báo; ai chưa bật
    // sẽ được nhắc gián tiếp qua digest của TP (số chưa nộp trong phòng).
    const { data: suppressedRows } = await admin.from('suppressed_emails').select('email');
    const suppressedSet = new Set(((suppressedRows || []) as any[]).map((r) => String(r.email).toLowerCase()));
    let staffPushSent = 0;
    if (inWindow && cycle) {
      for (const p of notSubmitted) {
        staffPushSent += await sendPushToProfile(admin, subsByProfile, vapidPrivateKey, p.id, {
          title: `⏰ Nhắc nộp phiếu đánh giá ${cycle.name}`,
          body: `Phiếu tự đánh giá của bạn CHƯA nộp — hạn ${deadlineText}. Nộp muộn bị trừ điểm KPI. Bấm để mở phiếu.`,
          url: '/tu-danh-gia',
          tag: 'nop-phieu',
        });
      }
    }

    // ---- Digest toàn cảnh cho BGĐ / TCTH admin (1 lần/ngày/người khi có tồn đọng) ----
    let leadershipEnqueued = 0;
    let leadershipPushSent = 0;
    if (leadershipNeeded) {
      const rows: string[] = [];
      if (cycle) {
        rows.push(`Kỳ <b>${cycle.name}</b> (hạn nộp ${deadlineText}): ${notSubmitted.length} cán bộ CHƯA NỘP phiếu`);
      }
      rows.push(`• ${globalWaitTP} phiếu đang chờ Trưởng phòng rà soát (mọi kỳ)`);
      rows.push(`• ${globalWaitPGD} phiếu đang chờ PGĐ phê duyệt (mọi kỳ)`);
      rows.push(`• ${kanbanWaitingTotal} thẻ hành động phát triển chờ quản lý xác nhận`);
      rows.push(`• ${kanbanOverdueTotal || 0} thẻ hành động phát triển QUÁ HẠN`);
      const subject = `📊 Toàn cảnh xử lý đánh giá${cycle ? ` — kỳ ${cycle.name}` : ''} — 343 Phát triển nhân sự`;
      const bodyHtml = rows.map((r) => `<p style="margin:4px 0">${r}</p>`).join('');
      const text = rows.map((r) => r.replace(/<[^>]+>/g, '')).join('\n');
      for (const l of leaders) {
        const recipient = String(l.email).trim().toLowerCase();
        if (suppressedSet.has(recipient)) continue;
        const idempotencyKey = `leaderdigest:${l.id}:${today}`;
        const { data: dup } = await admin
          .from('email_send_log')
          .select('id')
          .eq('template_name', 'leadership-digest')
          .eq('recipient_email', recipient)
          .in('status', ['pending', 'sent'])
          .contains('metadata', { idempotency_key: idempotencyKey })
          .limit(1);
        if (dup && dup.length > 0) continue;
        const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
<p>Kính gửi <b>${l.full_name}</b>,</p>
<p>Bức tranh xử lý đánh giá toàn chi nhánh hôm nay:</p>
${bodyHtml}
<p><a href="${APP_URL}/tong-quan" style="display:inline-block;background:#0b3d91;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Mở Tổng quan để xem chi tiết</a></p>
<p style="color:#6b7280;font-size:12px">Email tổng hợp tự động hằng ngày (chỉ gửi khi có tồn đọng). Vui lòng không trả lời email này.</p>
</body></html>`;
        const messageId = crypto.randomUUID();
        await admin.from('email_send_log').insert({
          message_id: messageId, template_name: 'leadership-digest', recipient_email: recipient,
          status: 'pending', metadata: { idempotency_key: idempotencyKey },
        });
        const { error } = await admin.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId, to: recipient, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN, subject, html,
            text: `Kính gửi ${l.full_name},\n${text}\nXem chi tiết: ${APP_URL}/tong-quan`,
            purpose: 'transactional', label: 'leadership-digest',
            idempotency_key: idempotencyKey, queued_at: new Date().toISOString(),
          },
        });
        if (!error) leadershipEnqueued++;
        leadershipPushSent += await sendPushToProfile(admin, subsByProfile, vapidPrivateKey, l.id, {
          title: `📊 Toàn cảnh xử lý đánh giá${cycle ? ` — kỳ ${cycle.name}` : ''}`,
          body: text,
          url: '/tong-quan',
          tag: 'toan-canh',
        });
      }
    }

    return new Response(JSON.stringify({
      dry_run: false, recipients: list.length, enqueued,
      push: {
        vapid_ready: !!vapidPrivateKey,
        staff_push_sent: staffPushSent,
        digest_push_sent: digestPushSent,
        leadership_push_sent: leadershipPushSent,
      },
      leadership_enqueued: leadershipEnqueued,
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

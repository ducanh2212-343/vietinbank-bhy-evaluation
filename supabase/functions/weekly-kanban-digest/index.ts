// weekly-kanban-digest — Thông báo tuần về kỷ luật cập nhật Kanban kế hoạch hành động.
//
// 2 chế độ (body.mode):
//   'leader_digest' (mặc định) — chạy SÁNG THỨ HAI, tổng kết TUẦN VỪA KẾT THÚC (T2→CN):
//     · GĐ/PGĐ/TP: email chi tiết + push. Email mở đầu bằng TIẾN ĐỘ KẾ HOẠCH (hoàn thành
//       %, thẻ chưa khởi động, quá hạn, sắp tới hạn, xếp hạng phòng) rồi mới tới kỷ luật
//       cập nhật — vì đó mới là thứ lãnh đạo cần quyết (chốt với GĐ 09/08).
//     · CÁN BỘ TOÀN PHÒNG: push tóm tắt phòng mình, NÊU TÊN ai đã/chưa cập nhật.
//     Phạm vi email: TP = cán bộ mình quản lý trực tiếp (manager_id); PGĐ = khối phụ
//     trách (pgd_id); BGĐ/TCTH admin = toàn chi nhánh. Mỗi người 1 email, phạm vi rộng nhất.
//   'staff_nudge' — chạy CHIỀU THỨ SÁU: web push cho TỪNG cán bộ tuần này chưa cập nhật
//     VÀ cho lãnh đạo của họ (TP + PGĐ) kèm danh sách tên — nhắc hai phía cùng lúc, còn
//     T6–CN để kịp trước hạn chót Chủ nhật. Không email (giữ Resend trong ngưỡng miễn
//     phí — nhất quán với send-reminders).
//
// Quy tắc "đã cập nhật tuần" ĐỒNG BỘ với frontend (src/lib/kanban.ts):
//   - Thẻ theo dõi: is_active, chưa 'done', tiêu đề không phải placeholder.
//   - Đạt khi có log progress_update / completion_requested / evidence_added / created
//     (thẻ mới sinh trong tuần được ân hạn) kể từ thứ Hai 00:00 giờ VN.
//
// AN TOÀN: dry_run MẶC ĐỊNH = true → chỉ trả về danh sách sẽ gửi, KHÔNG gửi.
// Idempotency email: kanbanweekly:<profile>:<tuần> — chạy lại cùng tuần không gửi trùng.
// Quyền: service_role (cron) hoặc user admin (system_admin/bgd/tcth_admin).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@1.0.2';
import { APP_URL, FROM_DOMAIN, SENDER_DOMAIN } from '../_shared/email-config.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_NAME = 'chieuthuc3';
const VAPID_PUBLIC_KEY =
  'BB5f9DtRA7ezR7W3vbUkFBHwLIQZ-Xv2sKBSQQo3dmAgouQaKiHk2JoXNTdt8qEIHh5N26DtlhigrQmvKgpWMR8';
const VAPID_SUBJECT = 'mailto:ducanh2212@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const ADMIN_ROLES = ['system_admin', 'bgd', 'tcth_admin'];

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch { return null; }
}

/** Thứ Hai 00:00 giờ VN của tuần chứa `now` (trùng getVietnamWeekStart phía client). */
function vietnamWeekStart(now: Date): Date {
  const vn = new Date(now.getTime() + 7 * 3600 * 1000);
  const day = vn.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  const mondayVn = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() - offset);
  return new Date(mondayVn - 7 * 3600 * 1000);
}
function fmtVnDate(d: Date): string {
  return d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' });
}
function isTitleMissing(title: string | null | undefined): boolean {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  return t === '' || t === '(chưa đặt tên)' || t.startsWith('chưa nhập');
}
function esc(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
function short(s: string | null | undefined, max = 140): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

interface PushSub { id: string; profile_id: string; endpoint: string; p256dh: string; auth: string; loi_cuoi?: string | null }
async function sendPush(
  admin: any, subsByProfile: Map<string, PushSub[]>, vapidPrivateKey: string | null,
  profileId: string, msg: { title: string; body: string; url: string; tag: string },
): Promise<number> {
  if (!vapidPrivateKey) return 0;
  let sent = 0;
  const bayGio = new Date().toISOString();
  for (const s of subsByProfile.get(profileId) || []) {
    try {
      const init = await buildPushPayload(
        { data: JSON.stringify(msg), options: { ttl: 12 * 3600, urgency: 'normal' } },
        { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
        { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: vapidPrivateKey },
      );
      const res = await fetch(s.endpoint, init);
      if (res.status === 404 || res.status === 410) {
        await admin.from('push_subscriptions')
          .update({ is_active: false, loi_cuoi: `${res.status} endpoint đã hết hiệu lực`, loi_luc: bayGio })
          .eq('id', s.id);
      } else if (res.ok) {
        sent++;
        // Xoá vết lỗi cũ khi máy nhận lại được, để một lần trục trặc không đeo bám mãi
        if (s.loi_cuoi) {
          await admin.from('push_subscriptions')
            .update({ loi_cuoi: null, loi_luc: null }).eq('id', s.id);
        }
      } else {
        // Mã lỗi ngoài 404/410 từng bị nuốt lặng lẽ: đăng ký vẫn is_active nên nhìn
        // vào bảng thì tưởng máy còn sống, trong khi thực tế mọi tin đều bị từ chối.
        // Vá 09/08, cùng cách notify-ct2 đã làm 11/09.
        const chiTiet = (await res.text().catch(() => '')).slice(0, 300);
        console.error('Push tuần bị từ chối', {
          sub: s.id, status: res.status, endpoint: s.endpoint.slice(0, 60), body: chiTiet,
        });
        await admin.from('push_subscriptions')
          .update({ loi_cuoi: `${res.status} ${chiTiet}`.slice(0, 400), loi_luc: bayGio })
          .eq('id', s.id);
      }
    } catch (e) {
      console.error('Push tuần lỗi', { sub: s.id, error: String(e) });
      await admin.from('push_subscriptions')
        .update({ loi_cuoi: String(e).slice(0, 400), loi_luc: bayGio }).eq('id', s.id);
    }
  }
  return sent;
}

interface UpdateItem { staffId: string; staffName: string; dept: string; cardTitle: string; percent: number | null; note: string; blocker: boolean; support: boolean; done: boolean }
interface MissItem { staffId: string; staffName: string; dept: string; cards: number }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---- Xác thực (đồng bộ send-reminders) ----
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
    const dryRun = body?.dry_run !== false;
    const mode: 'leader_digest' | 'staff_nudge' = body?.mode === 'staff_nudge' ? 'staff_nudge' : 'leader_digest';

    const now = new Date();
    const thisWeekStart = vietnamWeekStart(now);
    // leader_digest tổng kết TUẦN VỪA KẾT THÚC; staff_nudge soi TUẦN ĐANG CHẠY
    const winStart = mode === 'leader_digest'
      ? new Date(thisWeekStart.getTime() - 7 * 86400000)
      : thisWeekStart;
    const winEnd = mode === 'leader_digest' ? thisWeekStart : now;
    const weekLabel = `${fmtVnDate(winStart)}–${fmtVnDate(new Date(winEnd.getTime() - 1))}`;
    const weekKey = winStart.toISOString().slice(0, 10);

    // ---- Dữ liệu nền ----
    const [profRes, deptRes, cardRes] = await Promise.all([
      admin.from('profiles').select('id, user_id, full_name, email, manager_id, pgd_id, department_id').eq('status', 'active'),
      admin.from('departments').select('id, name'),
      admin.from('kanban_cards')
        .select('id, profile_id, title, kanban_status, progress_percent, leadership_mark_id, created_at, last_progress_at, deadline')
        .eq('is_active', true),
    ]);
    const profiles = (profRes.data || []) as any[];
    const byId = new Map(profiles.map((p) => [p.id, p]));
    const deptName = new Map(((deptRes.data || []) as any[]).map((d) => [d.id, d.name]));
    const cards = ((cardRes.data || []) as any[]);
    const cardById = new Map(cards.map((c) => [c.id, c]));

    // Thẻ theo dõi nhịp tuần (đồng bộ isWeeklyTracked): chưa done, có nội dung thật,
    // và (với digest tuần trước) đã tồn tại trước khi tuần kết thúc.
    const tracked = cards.filter((c) =>
      c.kanban_status !== 'done' && !isTitleMissing(c.title) &&
      new Date(c.created_at).getTime() < winEnd.getTime());

    // ---- Chỉ số TIẾN ĐỘ KẾ HOẠCH (khác hẳn kỷ luật cập nhật) ----
    // Kỷ luật cập nhật chỉ trả lời "tuần này có ai động vào thẻ không". Câu quản trị
    // thật sự là "kế hoạch đã duyệt nhích được bao nhiêu" — hai thứ khác nhau: cán bộ
    // mở thẻ, gõ một dòng, để nguyên 0% thì vẫn được tính là đã cập nhật và vẫn xanh.
    // Vì vậy digest lãnh đạo phải mang cả hai nhóm số.
    //
    // «Chưa khởi động» tách riêng khỏi «tuần này chưa cập nhật»: thẻ nằm im từ ngày
    // tạo là vấn đề khác hẳn thẻ đang chạy mà tuần này lỡ nhịp, nhưng đếm theo tuần
    // thì hai loại lẫn vào nhau và loại nguy hiểm hơn bị che mất.
    const homNayVN = new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const sau30Ngay = new Date(now.getTime() + 30 * 86400000 + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const coNoiDung = cards.filter((c) => !isTitleMissing(c.title));
    const chuaXong = coNoiDung.filter((c) => c.kanban_status !== 'done');
    const daXong = coNoiDung.filter((c) => c.kanban_status === 'done');
    const chuaKhoiDong = chuaXong.filter((c) => !c.last_progress_at);
    const quaHan = chuaXong.filter((c) => c.deadline && c.deadline < homNayVN);
    const satHan = chuaXong.filter((c) => c.deadline && c.deadline >= homNayVN && c.deadline <= sau30Ngay);

    /** Gom chỉ số theo phòng — dùng cho bảng xếp hạng trong email lãnh đạo. */
    const chiSoTheoPhong = (loc: (staffId: string) => boolean) => {
      const gom = new Map<string, { ten: string; tong: number; xong: number; im: number; tre: number; tienDo: number }>();
      for (const c of coNoiDung) {
        if (!loc(c.profile_id)) continue;
        const p = byId.get(c.profile_id);
        if (!p) continue;
        const key = p.department_id || 'khac';
        let g = gom.get(key);
        if (!g) { g = { ten: deptName.get(p.department_id) || '—', tong: 0, xong: 0, im: 0, tre: 0, tienDo: 0 }; gom.set(key, g); }
        g.tong++;
        g.tienDo += Number(c.progress_percent) || 0;
        if (c.kanban_status === 'done') g.xong++;
        else {
          if (!c.last_progress_at) g.im++;
          if (c.deadline && c.deadline < homNayVN) g.tre++;
        }
      }
      return [...gom.values()]
        .map((g) => ({ ...g, tbTienDo: g.tong ? Math.round(g.tienDo / g.tong) : 0 }))
        .sort((a, b) => a.tbTienDo - b.tbTienDo);
    };

    // ---- Log trong cửa sổ tuần ----
    const { data: logRows } = await admin
      .from('kanban_card_logs')
      .select('card_id, log_type, progress_percent, progress_note, current_result, blocker_note, support_needed, created_at')
      .gte('created_at', winStart.toISOString())
      .lt('created_at', winEnd.toISOString())
      .order('created_at', { ascending: true });
    const OK_TYPES = new Set(['progress_update', 'completion_requested', 'evidence_added', 'created']);
    const updatedCardIds = new Set<string>();
    for (const l of (logRows || []) as any[]) {
      if (OK_TYPES.has(l.log_type)) updatedCardIds.add(l.card_id);
    }

    // Nội dung cập nhật (chỉ log có nội dung thật, gắn về thẻ + cán bộ)
    const updates: UpdateItem[] = [];
    for (const l of (logRows || []) as any[]) {
      if (l.log_type !== 'progress_update' && l.log_type !== 'completion_requested') continue;
      const c = cardById.get(l.card_id);
      const p = c ? byId.get(c.profile_id) : null;
      if (!c || !p) continue;
      updates.push({
        staffId: p.id,
        staffName: p.full_name,
        dept: deptName.get(p.department_id) || '—',
        cardTitle: c.title,
        percent: l.progress_percent,
        note: short(l.progress_note || l.current_result),
        blocker: !!(l.blocker_note && String(l.blocker_note).trim()),
        support: !!(l.support_needed && String(l.support_needed).trim()),
        done: l.log_type === 'completion_requested',
      });
    }

    // Cán bộ chưa cập nhật: có thẻ theo dõi mà không thẻ nào đạt trong tuần → đếm thẻ thiếu
    const missByStaff = new Map<string, number>();
    for (const c of tracked) {
      if (!updatedCardIds.has(c.id)) missByStaff.set(c.profile_id, (missByStaff.get(c.profile_id) || 0) + 1);
    }
    const misses: MissItem[] = [...missByStaff.entries()]
      .map(([pid, n]) => {
        const p = byId.get(pid);
        return p ? { staffId: pid, staffName: p.full_name, dept: deptName.get(p.department_id) || '—', cards: n } : null;
      })
      .filter(Boolean) as MissItem[];
    misses.sort((a, b) => b.cards - a.cards || a.staffName.localeCompare(b.staffName, 'vi'));

    // ---- Push subs + VAPID (dùng cho cả 2 chế độ) ----
    let vapidPrivateKey: string | null = Deno.env.get('VAPID_PRIVATE_KEY') || null;
    if (!vapidPrivateKey) {
      const { data: vk } = await admin.rpc('get_vapid_private_key');
      vapidPrivateKey = (vk as string) || null;
    }
    const loadSubs = async (ids: string[]): Promise<Map<string, PushSub[]>> => {
      const map = new Map<string, PushSub[]>();
      if (!ids.length) return map;
      const { data } = await admin
        .from('push_subscriptions')
        .select('id, profile_id, endpoint, p256dh, auth, loi_cuoi')
        .eq('is_active', true)
        .in('profile_id', ids);
      for (const r of (data || []) as PushSub[]) {
        (map.get(r.profile_id) || map.set(r.profile_id, []).get(r.profile_id)!).push(r);
      }
      return map;
    };

    // ================= CHẾ ĐỘ 2: nhắc cán bộ chiều thứ Sáu (push) =================
    if (mode === 'staff_nudge') {
      // Nhắc CẢ HAI phía cùng lúc (chốt với GĐ 09/08): cán bộ biết mình còn nợ, lãnh đạo
      // biết ai còn nợ để đốc ngay trong chiều thứ Sáu. Nhắc một phía thì cán bộ dễ bỏ
      // qua, mà chờ tới sáng thứ Hai mới báo lãnh đạo thì tuần đã đóng — không cứu kịp.
      const theoLanhDao = new Map<string, MissItem[]>();
      for (const m of misses) {
        const s = byId.get(m.staffId);
        if (!s) continue;
        for (const ld of [s.manager_id, s.pgd_id]) {
          if (!ld || ld === m.staffId) continue;
          const ds = theoLanhDao.get(ld) || [];
          if (!ds.some((x) => x.staffId === m.staffId)) ds.push(m);
          theoLanhDao.set(ld, ds);
        }
      }
      const staffIds = misses.map((m) => m.staffId);
      const moiNguoi = [...new Set([...staffIds, ...theoLanhDao.keys()])];
      const subsByProfile = await loadSubs(moiNguoi);

      if (dryRun) {
        return new Response(JSON.stringify({
          dry_run: true, mode, week: weekLabel,
          staff_not_updated: misses.map((m) => `${m.staffName} (${m.cards} thẻ)`),
          staff_with_device: staffIds.filter((id) => (subsByProfile.get(id) || []).length > 0).length,
          leaders_notified: [...theoLanhDao.entries()].map(([id, ds]) => ({
            to: byId.get(id)?.full_name || id,
            staff: ds.map((m) => `${m.staffName} (${m.cards})`),
          })),
          vapid_ready: !!vapidPrivateKey,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let pushSent = 0;
      for (const m of misses) {
        pushSent += await sendPush(admin, subsByProfile, vapidPrivateKey, m.staffId, {
          title: '⏰ Tuần này bạn chưa cập nhật Kanban',
          body: `Còn ${m.cards} hành động chưa cập nhật tuần này. Hạn chót: hết Chủ nhật — quá tuần sẽ báo đỏ tới lãnh đạo.`,
          url: '/hanh-dong-phat-trien',
          tag: 'kanban-tuan',
        });
      }
      let leaderPush = 0;
      for (const [ldId, ds] of theoLanhDao.entries()) {
        const ten = ds.slice(0, 4).map((m) => m.staffName).join(', ');
        const them = ds.length > 4 ? ` và ${ds.length - 4} người nữa` : '';
        leaderPush += await sendPush(admin, subsByProfile, vapidPrivateKey, ldId, {
          title: `⏰ ${ds.length} cán bộ chưa cập nhật Kanban tuần này`,
          body: `${ten}${them}. Còn thứ Sáu tới hết Chủ nhật để kịp — nhắc ngay thì tuần này không phải báo đỏ.`,
          url: '/hanh-dong-phat-trien?view=team',
          tag: 'kanban-tuan-lanh-dao',
        });
      }
      return new Response(JSON.stringify({
        dry_run: false, mode, week: weekLabel,
        staff: misses.length, push_sent: pushSent,
        leaders: theoLanhDao.size, leader_push_sent: leaderPush,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ================= CHẾ ĐỘ 1: digest lãnh đạo sáng thứ Hai =================
    // Người nhận + phạm vi (rộng nhất thắng): BGĐ/TCTH → toàn CN; PGĐ → khối; TP → đội trực tiếp
    const { data: leaderRoles } = await admin
      .from('user_roles').select('user_id').in('role', ['bgd', 'tcth_admin', 'system_admin']);
    const leaderUserIds = new Set(((leaderRoles || []) as any[]).map((r) => r.user_id));
    const isBranchLeader = (p: any) => p.user_id && leaderUserIds.has(p.user_id);
    const tpIds = new Set(profiles.map((p) => p.manager_id).filter(Boolean));
    const pgdIds = new Set(profiles.map((p) => p.pgd_id).filter(Boolean));

    interface Recipient { profile: any; scope: 'branch' | 'block' | 'team' }
    const recipients: Recipient[] = [];
    for (const p of profiles) {
      if (!p.email) continue;
      if (isBranchLeader(p)) recipients.push({ profile: p, scope: 'branch' });
      else if (pgdIds.has(p.id)) recipients.push({ profile: p, scope: 'block' });
      else if (tpIds.has(p.id)) recipients.push({ profile: p, scope: 'team' });
    }

    const inScope = (r: Recipient, staffId: string): boolean => {
      if (staffId === r.profile.id) return false; // việc của chính mình không nằm trong digest quản lý
      const s = byId.get(staffId);
      if (!s) return false;
      if (r.scope === 'branch') return true;
      if (r.scope === 'block') return s.pgd_id === r.profile.id || s.manager_id === r.profile.id;
      return s.manager_id === r.profile.id;
    };

    const SCOPE_LABEL: Record<string, string> = {
      branch: 'toàn chi nhánh', block: 'khối phụ trách', team: 'cán bộ bạn quản lý trực tiếp',
    };
    const MAX_MISS_ROWS = 40, MAX_UPDATE_ROWS = 40;

    const previews: any[] = [];
    const { data: suppressedRows } = await admin.from('suppressed_emails').select('email');
    const suppressedSet = new Set(((suppressedRows || []) as any[]).map((r) => String(r.email).toLowerCase()));
    const subsByProfile = await loadSubs(recipients.map((r) => r.profile.id));

    let enqueued = 0, pushSent = 0, skippedIdem = 0;
    for (const r of recipients) {
      const myMisses = misses.filter((m) => inScope(r, m.staffId));
      const myUpdates = updates.filter((u) => inScope(r, u.staffId));
      if (myMisses.length === 0 && myUpdates.length === 0) continue;

      const missCards = myMisses.reduce((n, m) => n + m.cards, 0);

      // Tiến độ kế hoạch trong phạm vi người nhận — phần trả lời câu hỏi quản trị,
      // đặt TRƯỚC phần kỷ luật cập nhật vì đó mới là thứ lãnh đạo cần quyết.
      const trongPV = (staffId: string) => inScope(r, staffId);
      const thePV = coNoiDung.filter((c) => trongPV(c.profile_id));
      const xongPV = thePV.filter((c) => c.kanban_status === 'done').length;
      const imPV = thePV.filter((c) => c.kanban_status !== 'done' && !c.last_progress_at).length;
      const trePV = thePV.filter((c) => c.kanban_status !== 'done' && c.deadline && c.deadline < homNayVN).length;
      const satPV = thePV.filter((c) =>
        c.kanban_status !== 'done' && c.deadline && c.deadline >= homNayVN && c.deadline <= sau30Ngay).length;
      const tiLeXong = thePV.length ? Math.round((100 * xongPV) / thePV.length) : 0;
      const bangPhongPV = chiSoTheoPhong(trongPV);

      const subject = `📋 Kanban tuần ${weekLabel}: hoàn thành ${tiLeXong}% · ${imPV} thẻ chưa khởi động · ${myMisses.length} cán bộ chưa cập nhật`;

      if (dryRun) {
        previews.push({
          to: r.profile.full_name, scope: r.scope, subject,
          ke_hoach: { tong: thePV.length, xong: xongPV, ti_le: tiLeXong, chua_khoi_dong: imPV, qua_han: trePV, sat_han: satPV },
          theo_phong: bangPhongPV.slice(0, 5).map((g) => `${g.ten}: TB ${g.tbTienDo}% · ${g.im} im · ${g.tre} trễ`),
          not_updated: myMisses.slice(0, 10).map((m) => `${m.staffName} (${m.cards})`),
          updates: myUpdates.length,
        });
        continue;
      }

      const recipient = String(r.profile.email).trim().toLowerCase();
      if (suppressedSet.has(recipient)) continue;
      const idempotencyKey = `kanbanweekly:${r.profile.id}:${weekKey}`;
      const { data: dup } = await admin
        .from('email_send_log').select('id')
        .eq('template_name', 'kanban-weekly-digest')
        .eq('recipient_email', recipient)
        .in('status', ['pending', 'sent'])
        .contains('metadata', { idempotency_key: idempotencyKey })
        .limit(1);
      if (dup && dup.length > 0) { skippedIdem++; continue; }

      const missHtml = myMisses.length === 0
        ? '<p style="margin:4px 0;color:#059669">Tất cả cán bộ trong phạm vi đều đã cập nhật — tuyệt vời!</p>'
        : `<table style="border-collapse:collapse;font-size:13px">${myMisses.slice(0, MAX_MISS_ROWS).map((m) =>
            `<tr><td style="padding:3px 10px 3px 0"><b>${esc(m.staffName)}</b></td><td style="padding:3px 10px 3px 0;color:#6b7280">${esc(m.dept)}</td><td style="padding:3px 0;color:#b91c1c">${m.cards} thẻ chưa cập nhật</td></tr>`).join('')}</table>` +
          (myMisses.length > MAX_MISS_ROWS ? `<p style="color:#6b7280;font-size:12px">… và ${myMisses.length - MAX_MISS_ROWS} cán bộ khác (xem trong app)</p>` : '');

      const updHtml = myUpdates.length === 0
        ? '<p style="margin:4px 0;color:#6b7280">Không có cập nhật nào trong tuần.</p>'
        : myUpdates.slice(0, MAX_UPDATE_ROWS).map((u) =>
            `<p style="margin:6px 0 2px"><b>${esc(u.staffName)}</b> <span style="color:#6b7280">(${esc(u.dept)})</span> — ${esc(u.cardTitle)}${u.percent != null ? ` · <b>${u.percent}%</b>` : ''}${u.done ? ' · <span style="color:#059669">gửi hoàn thành</span>' : ''}${u.blocker ? ' · <span style="color:#b91c1c">vướng mắc</span>' : ''}${u.support ? ' · <span style="color:#7c3aed">cần hỗ trợ</span>' : ''}</p>` +
            (u.note ? `<p style="margin:0 0 4px;color:#374151;font-size:13px">↳ ${esc(u.note)}</p>` : ''),
          ).join('') +
          (myUpdates.length > MAX_UPDATE_ROWS ? `<p style="color:#6b7280;font-size:12px">… và ${myUpdates.length - MAX_UPDATE_ROWS} cập nhật khác (xem trong app)</p>` : '');

      const phongHtml = bangPhongPV.length <= 1 ? '' :
        `<h3 style="margin:16px 0 6px;font-size:15px">Theo phòng — xếp tiến độ thấp lên đầu</h3>
<table style="border-collapse:collapse;font-size:13px">${bangPhongPV.map((g) =>
          `<tr><td style="padding:3px 12px 3px 0"><b>${esc(g.ten)}</b></td>` +
          `<td style="padding:3px 12px 3px 0;text-align:right">TB <b>${g.tbTienDo}%</b></td>` +
          `<td style="padding:3px 12px 3px 0;color:#059669">${g.xong}/${g.tong} xong</td>` +
          `<td style="padding:3px 12px 3px 0;color:${g.im ? '#b91c1c' : '#6b7280'}">${g.im} chưa khởi động</td>` +
          `<td style="padding:3px 0;color:${g.tre ? '#b45309' : '#6b7280'}">${g.tre} quá hạn</td></tr>`).join('')}</table>`;

      const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
<p>Kính gửi <b>${esc(r.profile.full_name)}</b>,</p>
<p>Tiến độ kế hoạch phát triển (Chiêu thức 3) và nhịp cập nhật <b>tuần ${weekLabel}</b> (${SCOPE_LABEL[r.scope]}):</p>

<h3 style="margin:14px 0 6px;font-size:15px">📊 Tiến độ so với kế hoạch đã duyệt</h3>
<table style="border-collapse:collapse;font-size:14px">
<tr><td style="padding:4px 16px 4px 0">Hoàn thành</td><td style="padding:4px 0"><b style="font-size:18px">${tiLeXong}%</b> — ${xongPV}/${thePV.length} hành động</td></tr>
<tr><td style="padding:4px 16px 4px 0">Chưa khởi động</td><td style="padding:4px 0;color:${imPV ? '#b91c1c' : '#059669'}"><b>${imPV}</b> hành động chưa từng cập nhật lần nào kể từ khi lập</td></tr>
<tr><td style="padding:4px 16px 4px 0">Quá hạn</td><td style="padding:4px 0;color:${trePV ? '#b45309' : '#059669'}"><b>${trePV}</b> hành động</td></tr>
<tr><td style="padding:4px 16px 4px 0">Sắp tới hạn 30 ngày</td><td style="padding:4px 0"><b>${satPV}</b> hành động</td></tr>
</table>
${phongHtml}

<h3 style="margin:16px 0 6px;font-size:15px">🔴 Chưa cập nhật tuần (${myMisses.length} cán bộ · ${missCards} thẻ)</h3>
${missHtml}
<h3 style="margin:14px 0 6px;font-size:15px">✅ Nội dung đã cập nhật (${myUpdates.length})</h3>
${updHtml}
<p style="margin-top:14px"><a href="${APP_URL}/hanh-dong-phat-trien?view=team" style="display:inline-block;background:#0b3d91;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Mở màn hình Đội ngũ</a></p>
<p style="color:#6b7280;font-size:12px">Quy ước toàn chi nhánh: mỗi tuần (thứ Hai → hết Chủ nhật) mỗi hành động cập nhật ít nhất 1 lần trên Kanban; thời điểm do phòng linh hoạt (ví dụ chốt tại họp phòng). Hết tuần không cập nhật sẽ báo đỏ. Email tổng hợp tự động sáng thứ Hai — vui lòng không trả lời.</p>
</body></html>`;
      const text = `Kính gửi ${r.profile.full_name},\nKanban tuần ${weekLabel} (${SCOPE_LABEL[r.scope]}):\n` +
        `- Tiến độ kế hoạch: hoàn thành ${tiLeXong}% (${xongPV}/${thePV.length}); ${imPV} chưa khởi động; ${trePV} quá hạn; ${satPV} sắp tới hạn 30 ngày\n` +
        `- Chưa cập nhật: ${myMisses.length} cán bộ (${missCards} thẻ): ${myMisses.slice(0, 15).map((m) => `${m.staffName} (${m.cards})`).join(', ')}\n` +
        `- Đã cập nhật: ${myUpdates.length} lượt\nXem chi tiết: ${APP_URL}/hanh-dong-phat-trien?view=team`;

      const messageId = crypto.randomUUID();
      await admin.from('email_send_log').insert({
        message_id: messageId, template_name: 'kanban-weekly-digest', recipient_email: recipient,
        status: 'pending', metadata: { idempotency_key: idempotencyKey },
      });
      const { error } = await admin.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: messageId, to: recipient, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN, subject, html, text,
          purpose: 'transactional', label: 'kanban-weekly-digest',
          idempotency_key: idempotencyKey, queued_at: new Date().toISOString(),
        },
      });
      if (!error) enqueued++;
      pushSent += await sendPush(admin, subsByProfile, vapidPrivateKey, r.profile.id, {
        title: `📋 Kanban tuần ${weekLabel}: hoàn thành ${tiLeXong}%`,
        body: `${imPV} thẻ chưa khởi động · ${trePV} quá hạn · ${myMisses.length} cán bộ chưa cập nhật. Bấm để mở màn Đội ngũ.`,
        url: '/hanh-dong-phat-trien?view=team',
        tag: 'kanban-tuan-digest',
      });
    }

    // ---- Push tổng hợp cho CÁN BỘ TOÀN PHÒNG, nêu tên đầy đủ (chốt với GĐ 09/08) ----
    // GĐ chọn nêu tên: cả phòng thấy ai đã nhập, ai chưa. Đây là quyết định có chủ ý,
    // NGƯỢC với nguyên tắc của Bảng nhịp Chiêu thức 2 — bảng đó cố tình giấu so sánh
    // đồng nghiệp khỏi cán bộ để nhịp không thành cuộc thi. Lý do khác nhau: nhịp hằng
    // ngày là tấm gương soi cho chính mình, còn kế hoạch phát triển là cam kết chung
    // của phòng nên áp lực đồng đội là đòn bẩy hợp lý. Đổi ý thì sửa đúng khối này.
    const phongTuan = new Map<string, { ten: string; daNhap: string[]; chuaNhap: string[]; canBo: string[] }>();
    for (const p of profiles) {
      if (!p.department_id) continue;
      let g = phongTuan.get(p.department_id);
      if (!g) {
        g = { ten: deptName.get(p.department_id) || '—', daNhap: [], chuaNhap: [], canBo: [] };
        phongTuan.set(p.department_id, g);
      }
      g.canBo.push(p.id);
    }
    // Chỉ xét cán bộ CÓ thẻ theo dõi trong tuần — người không có kế hoạch đang chạy
    // thì không có gì để nêu tên, đưa vào chỉ làm loãng.
    const coTheTheoDoi = new Set(tracked.map((c) => c.profile_id));
    for (const p of profiles) {
      const g = p.department_id ? phongTuan.get(p.department_id) : null;
      if (!g || !coTheTheoDoi.has(p.id)) continue;
      if (missByStaff.has(p.id)) g.chuaNhap.push(p.full_name);
      else g.daNhap.push(p.full_name);
    }
    const phongCoViec = [...phongTuan.values()].filter((g) => g.daNhap.length + g.chuaNhap.length > 0);

    const soanTinPhong = (g: { ten: string; daNhap: string[]; chuaNhap: string[] }) => {
      const tong = g.daNhap.length + g.chuaNhap.length;
      return {
        title: g.chuaNhap.length === 0
          ? `✅ ${g.ten}: cả phòng đã cập nhật tuần ${weekLabel}`
          : `📋 ${g.ten} tuần ${weekLabel}: ${g.chuaNhap.length}/${tong} chưa cập nhật`,
        body: g.chuaNhap.length === 0
          ? `Cả ${tong} cán bộ có kế hoạch đang chạy đều đã cập nhật. Giữ nhịp này sang tuần mới.`
          : `Chưa cập nhật: ${g.chuaNhap.join(', ')}.` +
            (g.daNhap.length ? ` Đã cập nhật: ${g.daNhap.join(', ')}.` : ''),
        url: '/hanh-dong-phat-trien',
        tag: 'kanban-tuan-phong',
      };
    };

    if (dryRun) {
      return new Response(JSON.stringify({
        dry_run: true, mode, week: weekLabel,
        totals: {
          tracked_cards: tracked.length,
          updates: updates.length,
          staff_not_updated: misses.length,
          ke_hoach: {
            tong: coNoiDung.length, xong: daXong.length,
            ti_le: coNoiDung.length ? Math.round((100 * daXong.length) / coNoiDung.length) : 0,
            chua_khoi_dong: chuaKhoiDong.length, qua_han: quaHan.length, sat_han: satHan.length,
          },
        },
        recipients: previews,
        push_toan_phong: phongCoViec.map((g) => ({
          phong: g.ten, so_can_bo_nhan: g.daNhap.length + g.chuaNhap.length, tin: soanTinPhong(g),
        })),
        vapid_ready: !!vapidPrivateKey,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Gửi push toàn phòng — tải riêng đăng ký thiết bị của cán bộ (recipients ở trên
    // chỉ có lãnh đạo).
    let staffPush = 0;
    const subsCanBo = await loadSubs([...new Set(phongCoViec.flatMap((g: any) => g.canBo))]);
    for (const g of phongCoViec as any[]) {
      const msg = soanTinPhong(g);
      for (const pid of g.canBo) {
        staffPush += await sendPush(admin, subsCanBo, vapidPrivateKey, pid, msg);
      }
    }

    return new Response(JSON.stringify({
      dry_run: false, mode, week: weekLabel,
      recipients: recipients.length, enqueued, push_sent: pushSent, skipped_idempotent: skippedIdem,
      phong_da_bao: phongCoViec.length, push_can_bo: staffPush,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

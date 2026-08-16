// notify-idea-council — Nhắc PUSH thành viên Hội đồng BHY Ideas chưa gửi đủ
// phiếu + tự chốt đợt quá hạn. KHÔNG gửi email (chốt vận hành 08/2026 — kênh
// nhắc của Ideas là web push, đúng nếp ct2-nhip-bao-cao).
//
// Hai chế độ:
//   - UI (TCTH bấm nút đôn đốc): body {round_id, profile_ids?, dry_run?}
//     → push cho các thành viên còn thiếu phiếu của đợt đó (hoặc đúng danh
//     sách profile_ids truyền vào). Quyền: system_admin / tcth_admin.
//   - Cron hằng ngày: body {mode: 'cron'} (service_role):
//     1) đợt 'open' quá voting_deadline → chuyển 'closed';
//     2) đợt 'open' còn <=3 ngày tới hạn → push nhắc mọi thành viên còn thiếu.
//
// Nội dung push không nêu ý tưởng cụ thể của ai (chỉ số lượng + hạn) — phiếu
// và điểm vẫn ẩn danh, lời nhắc chỉ nói «bạn còn N ý tưởng chưa chấm».
//
// Chế độ cron còn nhắc GIÁM ĐỐC khi có hồ sơ Bén rễ đang chờ phê duyệt: luồng
// Bén rễ trình liên tục (chỉ đạo 08/2026) nên không có mốc họp để nhớ — hệ
// thống phải chủ động nhắc, nếu không hồ sơ nằm chờ vô thời hạn.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@1.0.2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Public key khớp src/lib/pushNotifications.ts; private key trong Vault
// (RPC get_vapid_private_key, chỉ service_role gọi được).
const VAPID_PUBLIC_KEY =
  'BB5f9DtRA7ezR7W3vbUkFBHwLIQZ-Xv2sKBSQQo3dmAgouQaKiHk2JoXNTdt8qEIHh5N26DtlhigrQmvKgpWMR8';
const VAPID_SUBJECT = 'mailto:ducanh2212@gmail.com';
const ADMIN_ROLES = ['system_admin', 'tcth_admin'];
const NGAY_NHAC_TRUOC_HAN = 3;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSub { id: string; profile_id: string; endpoint: string; p256dh: string; auth: string }
interface PushMsg { title: string; body: string; url: string; tag: string }
/** Client service_role — đặt tên kiểu để khỏi rải `any` khắp nơi */
type AdminClient = ReturnType<typeof createClient>;
interface HoSoNgan { id: string; full_name: string | null }

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch { return null; }
}

/**
 * Gửi push tới mọi thiết bị của 1 cán bộ. Ghi lỗi vào loi_cuoi/loi_luc thay vì
 * nuốt lặng lẽ (bài học migration 20260911), xóa lỗi khi máy nhận lại được,
 * tắt đăng ký chết (404/410).
 */
async function sendPushToProfile(
  // deno-lint-ignore no-explicit-any
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
        await admin.from('push_subscriptions').update({ loi_cuoi: null, loi_luc: null }).eq('id', s.id);
      } else {
        const body = await res.text().catch(() => '');
        await admin.from('push_subscriptions')
          .update({ loi_cuoi: `${res.status} ${body}`.slice(0, 500), loi_luc: new Date().toISOString() })
          .eq('id', s.id);
      }
    } catch (e) {
      console.error('Push lỗi', { error: String(e) });
    }
  }
  return sent;
}

interface ThanhVienThieu {
  profileId: string;
  fullName: string;
  pending: number;
}

/** Thành viên active còn thiếu phiếu gửi trong một đợt (đã trừ ý tưởng bị chặn tự chấm) */
// deno-lint-ignore no-explicit-any
async function tinhThanhVienThieu(admin: any, roundId: string): Promise<ThanhVienThieu[]> {
  const [{ data: members }, { data: items }, { data: votes }] = await Promise.all([
    admin.from('portal_idea_council_members')
      .select('profile_id, is_active, profiles(id, user_id, full_name)')
      .eq('is_active', true),
    admin.from('portal_idea_council_items')
      .select('id, idea_code, portal_ideas(created_by, proposer)')
      .eq('round_id', roundId),
    admin.from('portal_idea_council_votes')
      .select('item_id, user_id, status, portal_idea_council_items!inner(round_id)')
      .eq('status', 'submitted')
      .eq('portal_idea_council_items.round_id', roundId),
  ]);

  const daGui = new Set<string>(
    // deno-lint-ignore no-explicit-any
    (votes || []).map((v: any) => `${v.item_id}|${v.user_id}`),
  );
  const out: ThanhVienThieu[] = [];
  // deno-lint-ignore no-explicit-any
  for (const m of (members || []) as any[]) {
    const p = m.profiles;
    if (!p) continue;
    const tenChuan = String(p.full_name || '').toLowerCase().trim();
    let pending = 0;
    // deno-lint-ignore no-explicit-any
    for (const it of (items || []) as any[]) {
      const idea = it.portal_ideas;
      if (!idea) continue;
      // Cùng logic chặn tự chấm với policy INSERT phiếu
      const laChuPhieu = p.user_id && idea.created_by === p.user_id;
      const coTenDeXuat = String(idea.proposer || '')
        .split(',').map((x: string) => x.toLowerCase().trim())
        .includes(tenChuan);
      if (laChuPhieu || coTenDeXuat) continue;
      if (!p.user_id || !daGui.has(`${it.id}|${p.user_id}`)) pending++;
    }
    if (pending > 0) out.push({ profileId: p.id, fullName: p.full_name || '', pending });
  }
  return out;
}

/**
 * Nhắc Giám đốc khi còn hồ sơ Bén rễ chờ duyệt.
 *
 * Nhận diện Giám đốc theo đúng hai đường của hàm bhy_ideas_la_giam_doc():
 * role 'bgd', hoặc chức danh hồ sơ bắt đầu bằng 'Giám đốc' (tài khoản Giám đốc
 * chi nhánh đang mang role system_admin nên không gán thêm 'bgd' được).
 */
async function nhacGiamDocBenRe(admin: AdminClient, vapidPrivateKey: string | null, dryRun: boolean) {
  const { data: cho } = await admin.from('portal_idea_awards')
    .select('id, ghi_nhan_luc')
    .eq('trang_thai', 'cho_gd_duyet')
    .eq('cap_do', 'Bén rễ');
  const soHoSo = (cho || []).length;
  if (soHoSo === 0) return { pending: 0, reminded: [] as Array<{ name: string; sent: number }> };

  const nowMs = Date.now();
  const cuNhat = Math.max(
    0,
    ...(cho || []).map((r: { ghi_nhan_luc: string }) =>
      Math.floor((nowMs - new Date(r.ghi_nhan_luc).getTime()) / 86_400_000)),
  );

  const [{ data: bgdRoles }, { data: theoChucDanh }] = await Promise.all([
    admin.from('user_roles').select('user_id').eq('role', 'bgd'),
    admin.from('profiles').select('id, full_name')
      .eq('status', 'active').ilike('position', 'Giám đốc%'),
  ]);

  const profileIds = new Set<string>();
  const tenTheoProfile = new Map<string, string>();
  for (const p of (theoChucDanh || []) as HoSoNgan[]) {
    profileIds.add(p.id);
    tenTheoProfile.set(p.id, p.full_name || '');
  }
  const userIds = ((bgdRoles || []) as Array<{ user_id: string | null }>)
    .map(r => r.user_id).filter((x): x is string => !!x);
  if (userIds.length > 0) {
    const { data: hoSoBgd } = await admin.from('profiles')
      .select('id, full_name').eq('status', 'active').in('user_id', userIds);
    for (const p of (hoSoBgd || []) as HoSoNgan[]) {
      profileIds.add(p.id);
      tenTheoProfile.set(p.id, p.full_name || '');
    }
  }
  if (profileIds.size === 0) return { pending: soHoSo, reminded: [] };

  const subsByProfile = new Map<string, PushSub[]>();
  const { data: subRows } = await admin.from('push_subscriptions')
    .select('id, profile_id, endpoint, p256dh, auth')
    .eq('is_active', true)
    .in('profile_id', [...profileIds]);
  for (const s of (subRows || []) as PushSub[]) {
    (subsByProfile.get(s.profile_id) ?? subsByProfile.set(s.profile_id, []).get(s.profile_id)!)
      .push(s);
  }

  const reminded: Array<{ name: string; sent: number }> = [];
  for (const pid of profileIds) {
    const msg: PushMsg = {
      title: '📋 [Ideas] Việc chờ Giám đốc phê duyệt',
      body: `Có ${soHoSo} ý tưởng Phòng TCTH trình công nhận cấp Bén rễ`
        + (cuNhat >= 1 ? ` — hồ sơ cũ nhất đã chờ ${cuNhat} ngày` : ''),
      url: '/one/y-tuong',
      tag: 'idea-ben-re-cho-duyet',
    };
    const sent = dryRun ? 0 : await sendPushToProfile(admin, subsByProfile, vapidPrivateKey, pid, msg);
    reminded.push({ name: tenTheoProfile.get(pid) || '', sent });
  }
  return { pending: soHoSo, reminded };
}

function hanText(deadline: string | null): string {
  if (!deadline) return '';
  const d = new Date(deadline);
  return ` — hạn ${d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const isServiceRole = token === SERVICE_KEY || parseJwtClaims(token)?.role === 'service_role';

    let isAdminUser = false;
    if (!isServiceRole && token) {
      const { data: userData } = await admin.auth.getUser(token);
      if (userData?.user) {
        const { data: roles } = await admin.from('user_roles')
          .select('role').eq('user_id', userData.user.id);
        // deno-lint-ignore no-explicit-any
        isAdminUser = (roles || []).some((r: any) => ADMIN_ROLES.includes(r.role));
      }
    }
    if (!isServiceRole && !isAdminUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // an toàn mặc định: chỉ liệt kê, không gửi
    const { data: vapidPrivateKey } = await admin.rpc('get_vapid_private_key');

    // ---- Chế độ cron: tự chốt đợt quá hạn + nhắc đợt sắp hết hạn ----
    if (body.mode === 'cron') {
      const nowMs = Date.now();
      const { data: rounds } = await admin.from('portal_idea_council_rounds')
        .select('id, name, status, voting_deadline')
        .eq('status', 'open');

      let closed = 0;
      const reminded: Array<{ round: string; name: string; pending: number; sent: number }> = [];
      // deno-lint-ignore no-explicit-any
      for (const r of (rounds || []) as any[]) {
        if (!r.voting_deadline) continue;
        const dl = new Date(r.voting_deadline).getTime();
        if (dl < nowMs) {
          if (!dryRun) {
            await admin.from('portal_idea_council_rounds')
              .update({ status: 'closed' }).eq('id', r.id);
          }
          closed++;
          continue;
        }
        if (dl - nowMs > NGAY_NHAC_TRUOC_HAN * 24 * 3600 * 1000) continue;

        const thieu = await tinhThanhVienThieu(admin, r.id);
        if (thieu.length === 0) continue;
        const subsByProfile = new Map<string, PushSub[]>();
        const { data: subRows } = await admin.from('push_subscriptions')
          .select('id, profile_id, endpoint, p256dh, auth')
          .eq('is_active', true)
          .in('profile_id', thieu.map(t => t.profileId));
        for (const s of (subRows || []) as PushSub[]) {
          (subsByProfile.get(s.profile_id) ?? subsByProfile.set(s.profile_id, []).get(s.profile_id)!)
            .push(s);
        }
        for (const t of thieu) {
          const msg: PushMsg = {
            title: '🏛️ [Ideas] Nhắc chấm điểm Hội đồng',
            body: `Đợt «${r.name}»: bạn còn ${t.pending} ý tưởng chưa chấm${hanText(r.voting_deadline)}`,
            url: '/one/y-tuong/hoi-dong',
            tag: `idea-council-${r.id}`,
          };
          const sent = dryRun ? 0 : await sendPushToProfile(admin, subsByProfile, vapidPrivateKey, t.profileId, msg);
          reminded.push({ round: r.id, name: t.fullName, pending: t.pending, sent });
        }
      }
      // Nhắc Giám đốc hàng chờ Bén rễ — độc lập với đợt chấm Hội đồng
      const benRe = await nhacGiamDocBenRe(admin, vapidPrivateKey, dryRun);

      return new Response(JSON.stringify({
        ok: true, mode: 'cron', dry_run: dryRun,
        rounds_closed: closed, reminded, ben_re_cho_duyet: benRe,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Chế độ UI: TCTH bấm đôn đốc một đợt ----
    const roundId = String(body.round_id || '');
    if (!roundId) {
      return new Response(JSON.stringify({ error: 'Thiếu round_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: round } = await admin.from('portal_idea_council_rounds')
      .select('id, name, status, voting_deadline').eq('id', roundId).maybeSingle();
    if (!round) {
      return new Response(JSON.stringify({ error: 'Không tìm thấy đợt chấm' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (round.status !== 'open') {
      return new Response(JSON.stringify({ error: 'Đợt chấm không ở trạng thái đang mở' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let thieu = await tinhThanhVienThieu(admin, roundId);
    const chiNhung: string[] | null = Array.isArray(body.profile_ids) ? body.profile_ids : null;
    if (chiNhung) thieu = thieu.filter(t => chiNhung.includes(t.profileId));

    const subsByProfile = new Map<string, PushSub[]>();
    if (thieu.length > 0) {
      const { data: subRows } = await admin.from('push_subscriptions')
        .select('id, profile_id, endpoint, p256dh, auth')
        .eq('is_active', true)
        .in('profile_id', thieu.map(t => t.profileId));
      for (const s of (subRows || []) as PushSub[]) {
        (subsByProfile.get(s.profile_id) ?? subsByProfile.set(s.profile_id, []).get(s.profile_id)!)
          .push(s);
      }
    }

    const results: Array<{ profile_id: string; name: string; pending: number; devices: number; sent: number }> = [];
    for (const t of thieu) {
      const msg: PushMsg = {
        title: '🏛️ [Ideas] Nhắc chấm điểm Hội đồng',
        body: `Đợt «${round.name}»: bạn còn ${t.pending} ý tưởng chưa chấm${hanText(round.voting_deadline)}`,
        url: '/one/y-tuong/hoi-dong',
        tag: `idea-council-${round.id}`,
      };
      const devices = (subsByProfile.get(t.profileId) || []).length;
      const sent = dryRun ? 0 : await sendPushToProfile(admin, subsByProfile, vapidPrivateKey, t.profileId, msg);
      results.push({ profile_id: t.profileId, name: t.fullName, pending: t.pending, devices, sent });
    }

    return new Response(JSON.stringify({ ok: true, dry_run: dryRun, round: round.name, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('notify-idea-council lỗi', { error: String(e) });
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

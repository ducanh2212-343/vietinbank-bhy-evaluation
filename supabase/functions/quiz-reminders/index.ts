// quiz-reminders — Nhắc nhịp BHY Quizzi qua Web Push, chạy hằng ngày (cron 08:00 VN),
// tự rẽ nhánh theo thứ trong tuần (giờ VN):
//   - Thứ Hai : áp "đóng băng chuỗi" cho tuần trước (quiz_apply_streak_freezes)
//               + push mở tuần cho thành viên các phòng đang giữ chuỗi.
//   - Thứ Năm : phòng CHƯA phát hành quiz tuần này → push mọi thành viên phòng đó
//               (ai cũng tạo được quiz — giữ chuỗi của phòng).
//   - Thứ Sáu : cá nhân CHƯA làm quiz tuần này (phòng đã có ≥1 quiz) → push cá nhân
//               kèm số tuần chuỗi đang giữ.
//   - Mọi ngày: dọn lượt làm treo (quiz_expire_stale_attempts).
//
// AN TOÀN: dry_run MẶC ĐỊNH = true → chỉ TRẢ VỀ danh sách sẽ gửi, KHÔNG gửi.
// Quyền: service_role (cron) hoặc user admin (system_admin/bgd/tcth_admin).
// Idempotency: mỗi push có tag theo ngày — trình duyệt tự gộp; function không lưu
// trạng thái gửi (push không có hộp thư), chạy lại cùng ngày chỉ thay thông báo cũ.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@1.0.2';
import { APP_URL } from '../_shared/email-config.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Khớp send-reminders (public key trùng src/lib/pushNotifications.ts)
const VAPID_PUBLIC_KEY =
  'BB5f9DtRA7ezR7W3vbUkFBHwLIQZ-Xv2sKBSQQo3dmAgouQaKiHk2JoXNTdt8qEIHh5N26DtlhigrQmvKgpWMR8';
const VAPID_SUBJECT = 'mailto:ducanh2212@gmail.com';

interface PushSub { id: string; profile_id: string; endpoint: string; p256dh: string; auth: string }
interface PushMsg { title: string; body: string; url: string; tag: string }

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

/** Thứ trong tuần theo giờ VN: 1=Thứ Hai … 7=Chủ nhật */
function vnWeekday(d = new Date()): number {
  const vn = new Date(d.getTime() + 7 * 3600_000);
  const dow = vn.getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** Thứ Hai đầu tuần hiện tại theo giờ VN, 'YYYY-MM-DD' (mirror quiz_week_start) */
function vnWeekStart(d = new Date()): string {
  const vn = new Date(d.getTime() + 7 * 3600_000);
  const sinceMonday = (vn.getUTCDay() + 6) % 7;
  vn.setUTCDate(vn.getUTCDate() - sinceMonday);
  return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---- Xác thực: service_role (cron) hoặc user admin ----
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
    // Cho phép ép thứ để thử từng nhánh: {"force_weekday": 4}
    const weekday = Number(body?.force_weekday) || vnWeekday();
    const weekStart = vnWeekStart();
    const today = new Date().toISOString().slice(0, 10);

    // Mọi ngày: dọn lượt làm treo
    let expired = 0;
    if (!dryRun) {
      const { data } = await admin.rpc('quiz_expire_stale_attempts');
      expired = (data as number) || 0;
    }

    // ---- Dữ liệu nền ----
    const [deptRes, profRes, quizRes] = await Promise.all([
      admin.from('departments').select('id, name').eq('is_active', true),
      admin.from('profiles').select('id, full_name, department_id').eq('status', 'active').not('department_id', 'is', null),
      admin.from('quizzes').select('id, department_id, created_by, week_start, status')
        .eq('status', 'published').eq('week_start', weekStart),
    ]);
    const departments = deptRes.data || [];
    const profiles = profRes.data || [];
    const thisWeekQuizzes = quizRes.data || [];
    const deptsWithQuiz = new Set(thisWeekQuizzes.map((q: any) => q.department_id));
    const profilesByDept = new Map<string, any[]>();
    for (const p of profiles) {
      const arr = profilesByDept.get(p.department_id) || [];
      arr.push(p);
      profilesByDept.set(p.department_id, arr);
    }

    // Danh sách push dự kiến: [profileId, title, body]
    const planned: { profileId: string; name: string; title: string; text: string }[] = [];
    let freezesApplied = 0;

    if (weekday === 1) {
      // Thứ Hai: áp freeze tuần trước + mở tuần cho phòng đang giữ chuỗi
      if (!dryRun) {
        const { data } = await admin.rpc('quiz_apply_streak_freezes');
        freezesApplied = (data as number) || 0;
      }
      const { data: deptStreaks } = await admin.rpc('quiz_get_department_streaks');
      const streakByDept = new Map(
        (((deptStreaks as any[]) || [])).map((d: any) => [d.department_id, d.streak]),
      );
      for (const dept of departments) {
        const streak = streakByDept.get(dept.id) || 0;
        if (streak <= 0) continue; // chỉ nhắc phòng đang giữ chuỗi — tránh spam
        for (const p of profilesByDept.get(dept.id) || []) {
          planned.push({
            profileId: p.id, name: p.full_name,
            title: 'BHY Quizzi — tuần mới bắt đầu!',
            text: `Phòng ${dept.name} đang giữ chuỗi ${streak} tuần. Tạo quiz tuần này để giữ lửa 🔥`,
          });
        }
      }
    } else if (weekday === 4) {
      // Thứ Năm: phòng chưa có quiz tuần này → nhắc mọi thành viên
      for (const dept of departments) {
        if (deptsWithQuiz.has(dept.id)) continue;
        for (const p of profilesByDept.get(dept.id) || []) {
          planned.push({
            profileId: p.id, name: p.full_name,
            title: `Phòng ${dept.name} chưa có quiz tuần này`,
            text: 'Ai cũng tạo được quiz — mở màn tuần này và nhận huy hiệu Người gieo hạt 🌱',
          });
        }
      }
    } else if (weekday === 5) {
      // Thứ Sáu: cá nhân chưa làm quiz (phòng đã có quiz do người khác soạn)
      const { data: attempts } = await admin
        .from('quiz_attempts')
        .select('profile_id, quiz_id, status')
        .in('quiz_id', thisWeekQuizzes.map((q: any) => q.id));
      const doneProfiles = new Set(
        ((attempts || []) as any[]).filter((a) => a.status === 'completed').map((a) => a.profile_id),
      );
      for (const dept of departments) {
        const deptQuizzes = thisWeekQuizzes.filter((q: any) => q.department_id === dept.id);
        if (deptQuizzes.length === 0) continue;
        for (const p of profilesByDept.get(dept.id) || []) {
          if (doneProfiles.has(p.id)) continue;
          // Người chỉ soạn quiz (không làm được quiz của mình) vẫn giữ nhịp — bỏ qua
          const authoredAll = deptQuizzes.every((q: any) => q.created_by === p.id);
          if (authoredAll) continue;
          planned.push({
            profileId: p.id, name: p.full_name,
            title: 'Quiz tuần này đang chờ bạn',
            text: 'Còn 3 ngày để giữ chuỗi tuần — làm quiz của phòng ngay nhé ⚡',
          });
        }
      }
    }

    // ---- Push subscriptions ----
    const subsByProfile = new Map<string, PushSub[]>();
    if (planned.length > 0) {
      const { data: pushRows } = await admin
        .from('push_subscriptions')
        .select('id, profile_id, endpoint, p256dh, auth')
        .eq('is_active', true)
        .in('profile_id', [...new Set(planned.map((x) => x.profileId))]);
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

    if (dryRun) {
      return new Response(JSON.stringify({
        dry_run: true, weekday, week_start: weekStart,
        planned: planned.map((x) => ({ name: x.name, title: x.title })),
        push: {
          vapid_ready: !!vapidPrivateKey,
          recipients_with_device: planned.filter((x) => (subsByProfile.get(x.profileId) || []).length > 0).length,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let pushSent = 0;
    for (const x of planned) {
      pushSent += await sendPushToProfile(admin, subsByProfile, vapidPrivateKey, x.profileId, {
        title: x.title, body: x.text, url: `${APP_URL}/quizzi`, tag: `quizzi:${weekday}:${today}`,
      });
    }

    return new Response(JSON.stringify({
      dry_run: false, weekday, week_start: weekStart,
      planned: planned.length, push_sent: pushSent,
      freezes_applied: freezesApplied, attempts_expired: expired,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('quiz-reminders lỗi', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

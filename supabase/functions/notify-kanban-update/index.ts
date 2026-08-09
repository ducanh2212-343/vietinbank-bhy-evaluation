// notify-kanban-update — Push TỨC THÌ cho 2 CẤP TRÊN khi cán bộ cập nhật tiến độ Kanban.
//
// Kích hoạt bởi DB trigger trên kanban_card_logs (progress_update / completion_requested)
// qua pg_net → không phụ thuộc frontend, mọi lối vào cập nhật đều bắn thông báo.
//
// Quy tắc "2 cấp trên mình" (chốt với GĐ 26/07/2026) — CHIẾU THEO CHỨC DANH người cập nhật:
//   cán bộ/phó phòng/KSV → manager_id (TP) + pgd_id (PGĐ phụ trách);
//   Trưởng phòng         → pgd_id (PGĐ phụ trách) + Giám đốc;
//   Phó giám đốc         → Giám đốc;
//   Giám đốc             → không báo ai.
//
// Trước 03/08/2026 luật này suy ra từ SỐ LƯỢNG người nhận giải được ("chưa đủ 2 thì thêm
// Giám đốc"). Cách đó không phân biệt được "TP thì đúng là chỉ có 1 cấp trên" với "cán bộ
// bị thiếu manager_id" → mọi cán bộ chưa gắn TP đều leo thẳng lên GĐ. Nay quyết định dựa
// vào chức danh: cán bộ thiếu TP thì chỉ báo PGĐ và ghi log cảnh báo, KHÔNG leo lên GĐ.
//
// Hình thức tin (chuẩn 09/08 — thống nhất với các hàm f_ct2_thong_bao_* trong DB):
//   Tiêu đề: 📝 <Tên cán bộ> — tiến độ <N>%   (đậm, một dòng, không gãy)
//   Thân:    Việc: <tên hành động, cắt 70>
//            Nội dung: <ghi chú cập nhật, cắt 140>
//            ⚠️ Có vướng mắc, cần hỗ trợ      (chỉ khi có)
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

// Nhận diện cấp theo chức danh — giữ khớp với src/lib/reportingLine.ts (edge function
// chạy Deno nên không import được từ src/, buộc phải chép logic; sửa 1 nơi thì sửa cả 2).
const norm = (s: string | null | undefined) => (s || '').toLowerCase().trim();
const laGiamDoc = (pos: string | null | undefined) => {
  const n = norm(pos);
  return n === 'giám đốc' || n === 'giám đốc chi nhánh';
};
const laPhoGiamDoc = (pos: string | null | undefined) => {
  const n = norm(pos);
  return n.startsWith('phó giám đốc') || n.startsWith('pgđ');
};
const laTruongPhong = (pos: string | null | undefined) => {
  const n = norm(pos);
  if (n === 'tp') return true;
  return ['trưởng phòng', 'phụ trách phòng', 'trưởng pgd', 'phụ trách pgd', 'pt phòng', 'pt pgd']
    .some((p) => n.startsWith(p));
};

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
      .from('profiles').select('id, full_name, position, manager_id, pgd_id')
      .eq('id', card.profile_id).maybeSingle();
    if (!owner) {
      return new Response(JSON.stringify({ skipped: 'không có hồ sơ cán bộ' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Chuỗi 2 cấp trên, quyết theo CHỨC DANH người cập nhật ----
    const recipients: string[] = [];
    const push = (id: string | null | undefined) => {
      if (id && id !== owner.id && !recipients.includes(id)) recipients.push(id);
    };
    const layGiamDoc = async (): Promise<string | null> => {
      const { data: gd } = await admin
        .from('profiles').select('id').eq('status', 'active').eq('position', 'Giám đốc').limit(1).maybeSingle();
      return gd?.id ?? null;
    };

    let thieuQuanLy = false;
    if (laGiamDoc(owner.position)) {
      // GĐ tự cập nhật — trên GĐ không còn ai
    } else if (laPhoGiamDoc(owner.position)) {
      push(await layGiamDoc());
    } else if (laTruongPhong(owner.position)) {
      push(owner.pgd_id);
      push(await layGiamDoc());
    } else {
      // Cán bộ / phó phòng / kiểm soát viên: dừng ở TP + PGĐ phụ trách.
      // Thiếu manager_id thì chỉ còn PGĐ — KHÔNG đôn lên Giám đốc, vì đó là lỗ hổng dữ
      // liệu chứ không phải ý đồ phân cấp. Ghi log để Tổ chức Tổng hợp gắn lại TP.
      if (!owner.manager_id) {
        thieuQuanLy = true;
        console.warn('Hồ sơ thiếu manager_id — chỉ báo PGĐ', {
          profile_id: owner.id, full_name: owner.full_name, position: owner.position,
        });
      }
      push(owner.manager_id);
      push(owner.pgd_id);
    }
    const finalRecipients = recipients.slice(0, 2);

    // ---- Soạn nội dung (chuẩn 09/08: mỗi dòng một thứ, không nối bằng «·») ----
    // Ảnh màn hình khóa GĐ gửi 09/08 chỉ đúng chỗ rối của format cũ: tiêu đề dài gãy
    // hai dòng, thân tin nối «tên việc · trạng thái · 25%» thành một chuỗi — tên việc
    // dài nuốt sạch chỗ, ba thứ dính nhau. Chuẩn mới: TIÊU ĐỀ = người + tiến độ
    // (ngắn để không gãy dòng, phần trăm nằm ở chỗ đậm nhất); THÂN = mỗi dòng một
    // nhãn. Chữ trạng thái (Phải làm/Đang làm) bỏ hẳn — con số tiến độ và động từ đã
    // nói đủ, chữ đó chính là thứ chen giữa gây rối.
    const isDone = log.log_type === 'completion_requested';
    const percent = log.progress_percent ?? card.progress_percent;
    const note = short(log.progress_note || log.current_result, 140);
    const flags: string[] = [];
    if (log.blocker_note && String(log.blocker_note).trim()) flags.push('có vướng mắc');
    if (log.support_needed && String(log.support_needed).trim()) flags.push('cần hỗ trợ');

    const dong: string[] = [`Việc: ${short(card.title, 70)}`];
    if (note) dong.push(`Nội dung: ${note}`);
    if (flags.length) {
      const canhBao = flags.join(', ');
      dong.push(`⚠️ ${canhBao.charAt(0).toUpperCase()}${canhBao.slice(1)}`);
    }
    if (isDone) dong.push('Chờ anh/chị xác nhận để đóng thẻ.');

    const msg = {
      title: isDone
        ? `🏁 ${owner.full_name} — báo hoàn thành`
        : percent != null
          ? `📝 ${owner.full_name} — tiến độ ${percent}%`
          : `📝 ${owner.full_name} — cập nhật hành động`,
      body: dong.join('\n'),
      url: '/hanh-dong-phat-trien?view=team',
      tag: `kanban-update-${log.id}`, // tag riêng từng lần để không đè thông báo trước
    };

    if (dryRun) {
      const { data: names } = await admin.from('profiles').select('id, full_name').in('id', finalRecipients);
      return new Response(JSON.stringify({
        dry_run: true, owner: owner.full_name, position: owner.position,
        thieu_quan_ly: thieuQuanLy, recipients: names, msg,
      }), {
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
      const bayGio = new Date().toISOString();
      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('id, profile_id, endpoint, p256dh, auth, loi_cuoi')
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
            await admin.from('push_subscriptions')
              .update({ is_active: false, loi_cuoi: `${res.status} endpoint đã hết hiệu lực`, loi_luc: bayGio })
              .eq('id', s.id);
          } else if (res.ok) {
            sent++;
            // Xoá vết lỗi cũ khi máy này nhận lại được — nếu không thì một lần trục
            // trặc sẽ đeo bám mãi và ta đọc nhầm là máy vẫn đang hỏng
            if (s.loi_cuoi) {
              await admin.from('push_subscriptions')
                .update({ loi_cuoi: null, loi_luc: null }).eq('id', s.id);
            }
          } else {
            /*
              ĐIỂM MÙ CŨ (vá 09/08, cùng cách notify-ct2 đã làm 11/09): mọi mã lỗi
              ngoài 404/410 từng bị nuốt lặng lẽ — đăng ký vẫn is_active nên bảng
              điều khiển báo «máy còn sống», trong khi Apple/Google từ chối từng tin
              và người nhận không bao giờ thấy gì. Chính là cảnh iPhone của Giám đốc
              đăng ký sống từ 19/07 mà màn hình khóa im lặng. Nay ghi lại nguyên văn.
            */
            const chiTiet = (await res.text().catch(() => '')).slice(0, 300);
            console.error('Push Kanban bị từ chối', {
              sub: s.id, status: res.status, endpoint: s.endpoint.slice(0, 60), body: chiTiet,
            });
            await admin.from('push_subscriptions')
              .update({ loi_cuoi: `${res.status} ${chiTiet}`.slice(0, 400), loi_luc: bayGio })
              .eq('id', s.id);
          }
        } catch (e) {
          console.error('Push Kanban lỗi', { sub: s.id, error: String(e) });
          await admin.from('push_subscriptions')
            .update({ loi_cuoi: String(e).slice(0, 400), loi_luc: bayGio }).eq('id', s.id);
        }
      }
    }
    return new Response(JSON.stringify({
      recipients: finalRecipients.length, push_sent: sent, thieu_quan_ly: thieuQuanLy,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

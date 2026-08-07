// notify-ct2 — phát Web Push cho hàng đợi thông báo Chiêu thức 2 + Phê duyệt tín dụng.
//
// Khác notify-kanban-update ở chỗ: hàm này KHÔNG tự quyết ai được nhận. Mọi luật
// (ai liên quan, trần 3 tin/người/ngày, im lặng ngoài giờ) đã nằm trong DB ở
// public.ct2_dat_thong_bao — nơi duy nhất, để giao diện hay trigger mới sau này
// cũng không lách được. Hàm này chỉ làm đúng một việc: đọc các dòng chưa gửi
// trong ct2_thong_bao, đẩy đi, rồi đóng dấu gui_luc.
//
// Nhờ vậy chuông trong ứng dụng vẫn chạy kể cả khi hàm này hỏng hoặc người dùng
// từ chối quyền push — bảng hàng đợi mới là nguồn sự thật, push chỉ là một kênh.
//
// Kích hoạt: pg_net từ trigger nghiệp vụ (public.ct2_kich_hoat_phat_push) khi có
// tin cần phát ngay, và cron 7h00 thứ 2–6 để phát nốt các tin đã hoãn qua đêm
// hoặc qua cuối tuần. Body: {gioi_han?: number, dry_run?: boolean}. Chỉ service_role.
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

interface ThongBao {
  id: string;
  ma_su_kien: string;
  nguoi_nhan: string;
  dau_viec_id: string | null;
  ho_so_id: string | null;
  tieu_de: string;
  noi_dung: string;
  muc: string;
  kenh: string[] | null;
  phat_luc: string;
}

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch { return null; }
}

// Biểu tượng theo mức, không theo mã sự kiện — cán bộ chỉ cần phân biệt
// «phải xử lý ngay» với «biết để đấy».
const DAU_MUC: Record<string, string> = { CHAN: '⛔', DO: '🔴', NHE: '🟡' };

/**
 * Bấm vào thông báo phải mở đúng chỗ, nếu không cán bộ phải tự đi tìm thẻ.
 * Quy tắc PHẢI trùng với duongDanThongBao() ở client (src/lib/ct2.ts) —
 * push và chuông trong ứng dụng không được lệch nhau.
 */
function duongDan(tb: ThongBao): string {
  if (tb.dau_viec_id) return `/one/chieu-thuc-2?the=${tb.dau_viec_id}`;
  if (tb.ho_so_id) return `/one/chieu-thuc-2?ho_so=${tb.ho_so_id}`;
  if (tb.ma_su_kien.startsWith('HS_')) return '/one/chieu-thuc-2?tab=tin-dung';
  return '/one/chieu-thuc-2';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!(token === SERVICE_KEY || parseJwtClaims(token)?.role === 'service_role')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* trigger gọi với body rỗng */ }
    const dryRun = body?.dry_run === true;
    const gioiHan = Math.min(Number(body?.gioi_han) || 200, 500);

    // phat_luc do database quyết (ct2_moc_phat_gan_nhat): tin sinh ngoài giờ hoặc
    // ngày nghỉ mang mốc 7h00 buổi sáng làm việc kế tiếp. Chưa tới mốc thì để
    // yên trong hàng đợi — chuông trong ứng dụng vẫn đọc được ngay.
    const bayGio = new Date().toISOString();
    // Tin đã quá mốc phát 12 tiếng thì đóng dấu mà không đẩy: một lời nhắc của
    // hôm qua bật lên hôm nay chỉ gây nhiễu.
    const qua = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    const { data: rows, error: loiDoc } = await admin
      .from('ct2_thong_bao')
      .select('id, ma_su_kien, nguoi_nhan, dau_viec_id, ho_so_id, tieu_de, noi_dung, muc, kenh, phat_luc')
      .is('gui_luc', null)
      .lte('phat_luc', bayGio)
      .gte('phat_luc', qua)
      .order('phat_luc', { ascending: true })
      .limit(gioiHan);
    if (loiDoc) throw loiDoc;

    const dsTb = (rows || []) as ThongBao[];
    if (!dsTb.length) {
      // Vẫn đóng dấu các tin quá cũ để hàng đợi không phình mãi
      if (!dryRun) {
        await admin.from('ct2_thong_bao').update({ gui_luc: bayGio })
          .is('gui_luc', null).lt('phat_luc', qua);
      }
      return new Response(JSON.stringify({ hang_doi: 0, push_sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const canPush = dsTb.filter((t) => !t.kenh || t.kenh.includes('push'));
    const nguoiNhan = [...new Set(canPush.map((t) => t.nguoi_nhan))];

    if (dryRun) {
      return new Response(JSON.stringify({ hang_doi: dsTb.length, nguoi_nhan: nguoiNhan.length, tin: dsTb }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let vapidPrivateKey: string | null = Deno.env.get('VAPID_PRIVATE_KEY') || null;
    if (!vapidPrivateKey) {
      const { data: vk } = await admin.rpc('get_vapid_private_key');
      vapidPrivateKey = (vk as string) || null;
    }

    let sent = 0;
    const daXuLy: string[] = [];
    // Thống kê lỗi trả về ngay trong phản hồi — người gọi tay (kiểm thử) thấy
    // được kết quả mà không phải đi đọc log
    const loiGui: Array<{ sub: string; status: number | string; body?: string }> = [];

    if (vapidPrivateKey && nguoiNhan.length) {
      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('id, profile_id, endpoint, p256dh, auth, loi_cuoi')
        .eq('is_active', true)
        .in('profile_id', nguoiNhan);

      // Gom thiết bị theo người: một người có thể đăng ký nhiều máy
      const theoNguoi = new Map<string, any[]>();
      for (const s of (subs || []) as any[]) {
        const ds = theoNguoi.get(s.profile_id) || [];
        ds.push(s);
        theoNguoi.set(s.profile_id, ds);
      }

      for (const tb of canPush) {
        const msg = {
          title: `${DAU_MUC[tb.muc] || '🔔'} ${tb.tieu_de}`,
          body: tb.noi_dung,
          url: duongDan(tb),
          // tag riêng từng tin: hai việc khác nhau không được đè lên nhau
          tag: `ct2-${tb.id}`,
        };
        for (const s of theoNguoi.get(tb.nguoi_nhan) || []) {
          try {
            const init = await buildPushPayload(
              {
                data: JSON.stringify(msg),
                options: { ttl: 12 * 3600, urgency: tb.muc === 'NHE' ? 'normal' : 'high' },
              },
              { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
              { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: vapidPrivateKey },
            );
            const res = await fetch(s.endpoint, init);
            if (res.status === 404 || res.status === 410) {
              await admin.from('push_subscriptions')
                .update({ is_active: false, loi_cuoi: `${res.status} endpoint đã hết hiệu lực`, loi_luc: bayGio })
                .eq('id', s.id);
              loiGui.push({ sub: s.id, status: res.status });
            } else if (res.ok) {
              sent++;
              // Xoá vết lỗi cũ khi máy này nhận lại được — nếu không thì một lần
              // trục trặc sẽ đeo bám mãi và ta đọc nhầm là máy vẫn đang hỏng
              if (s.loi_cuoi) {
                await admin.from('push_subscriptions')
                  .update({ loi_cuoi: null, loi_luc: null }).eq('id', s.id);
              }
            } else {
              /*
                ĐIỂM MÙ CŨ: mọi mã lỗi ngoài 404/410 từng bị nuốt lặng lẽ — đăng
                ký vẫn is_active nên bảng điều khiển báo «máy còn sống», trong
                khi Apple/Google từ chối từng tin một và người dùng không bao giờ
                nhận được gì. Đúng cảnh iPhone của Giám đốc: đăng ký sống từ
                19/07, tin nào cũng «gửi xong», màn hình khóa im lặng.
                Nay ghi lại nguyên văn để còn truy được.
              */
              const chiTiet = (await res.text().catch(() => '')).slice(0, 300);
              console.error('Push CT2 bị từ chối', {
                tb: tb.id, sub: s.id, status: res.status,
                endpoint: s.endpoint.slice(0, 60), body: chiTiet,
              });
              await admin.from('push_subscriptions')
                .update({ loi_cuoi: `${res.status} ${chiTiet}`.slice(0, 400), loi_luc: bayGio })
                .eq('id', s.id);
              loiGui.push({ sub: s.id, status: res.status, body: chiTiet });
            }
          } catch (e) {
            console.error('Push CT2 lỗi', { tb: tb.id, sub: s.id, error: String(e) });
            await admin.from('push_subscriptions')
              .update({ loi_cuoi: String(e).slice(0, 400), loi_luc: bayGio }).eq('id', s.id);
            loiGui.push({ sub: s.id, status: 'ngoại lệ', body: String(e).slice(0, 300) });
          }
        }
        daXuLy.push(tb.id);
      }
    }

    // Đóng dấu TẤT CẢ tin đã đọc ra — kể cả tin không có thiết bị nào đăng ký
    // hoặc kênh không có 'push'. Nếu không, mỗi lần chạy lại đọc lại đúng nhóm
    // đó và hàng đợi không bao giờ vơi.
    await admin.from('ct2_thong_bao').update({ gui_luc: bayGio })
      .in('id', dsTb.map((t) => t.id));
    await admin.from('ct2_thong_bao').update({ gui_luc: bayGio })
      .is('gui_luc', null).lt('phat_luc', qua);

    return new Response(
      JSON.stringify({ hang_doi: dsTb.length, da_day: daXuLy.length, push_sent: sent, loi: loiGui }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// zalo-gui-sao — đẩy tin Sao Xứng Đáng từ hàng đợi zalo_hang_doi vào nhóm Zalo GMF.
//
// Body JSON: { hanh_dong, ... }
//   phat       { dry_run?, gioi_han? }  gom các dòng đã tới mốc, soạn, gửi, đóng dấu — cron mỗi phút gọi
//   xem_truoc  { star_record_id }        soạn tin cho một phiếu (không gửi) — trang quản trị dùng
//   gui_phieu  { star_record_id }        gửi thật một phiếu chỉ định (kể cả đã gửi) — để thử mẫu
//
// Luật gom và mẫu chữ nằm ở _shared/zaloSaoMau.ts (hàm thuần, có kiểm thử). Hàm này
// chỉ lo: khóa dòng, tính tích lũy/mốc quà từ DB, gửi qua _shared/zalo.ts, thử lại.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { requireRole, HttpError } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { LoiZalo, docCauHinh, ghiNhatKy, guiVanBanVaoNhom } from '../_shared/zalo.ts';
import { MAU_MAC_DINH, khoaGom, soanTinSao, type BoiCanhTin, type CheDoGop, type MauTin, type PhieuSao } from '../_shared/zaloSaoMau.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const COT_PHIEU = 'id, name, department, sub_unit, stars, reason, result, awarded_on, sender, is_collective, recipient_profile_id';

function claimsCua(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const p = parts[1].replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(p)) as Record<string, unknown>;
  } catch { return null; }
}

interface DongHangDoi { id: number; star_record_id: string; so_lan_thu: number }

async function boiCanhCua(admin: SupabaseClient, p: PhieuSao, ch: Record<string, string | null>): Promise<BoiCanhTin> {
  let tichLuy: number | null = null;
  let mocQua: string | null = null;
  const { data: tl } = await admin.rpc('zalo_sao_tich_luy', { _record_id: p.id });
  if (typeof tl === 'number') tichLuy = tl;
  if (!p.is_collective && tichLuy != null) {
    const { data: mq } = await admin.rpc('sao_moc_qua_ke_tiep', { _sao: tichLuy });
    mocQua = typeof mq === 'string' ? mq : null;
  }
  return {
    tichLuy, mocQua,
    linkChanTin: (ch.link_chan_tin ?? '').trim(),
    toiDaDong: Math.max(1, Number(ch.toi_da_dong_mot_tin) || 10),
    lyDoToiDaKyTu: Math.max(40, Number(ch.ly_do_toi_da_ky_tu) || 300),
  };
}

/** Mẫu quản trị sửa trên trang; ô trống thì về mặc định trong mã. */
function mauCua(ch: Record<string, string | null>): MauTin {
  return {
    ca_nhan: (ch.mau_tin_ca_nhan ?? '').trim() || MAU_MAC_DINH.ca_nhan,
    tap_the: (ch.mau_tin_tap_the ?? '').trim() || MAU_MAC_DINH.tap_the,
  };
}

function cheDoCua(ch: Record<string, string | null>): CheDoGop {
  return ch.che_do_gop === 'gop_theo_nguoi_tang' ? 'gop_theo_nguoi_tang' : 'moi_nguoi_mot_tin';
}

async function docPhieu(admin: SupabaseClient, ids: string[]): Promise<Map<string, PhieuSao>> {
  const { data, error } = await admin.from('star_records').select(COT_PHIEU).in('id', ids);
  if (error) throw new LoiZalo('Không đọc được phiếu Sao: ' + error.message);
  const m = new Map<string, PhieuSao>();
  for (const r of (data ?? []) as PhieuSao[]) m.set(r.id, { ...r, stars: Number(r.stars) });
  return m;
}

/** Gửi một nhóm phiếu đã gom thành một tin; trả về message_id. */
async function guiNhom(admin: SupabaseClient, nhom: PhieuSao[], cheDo: CheDoGop, ch: Record<string, string | null>, groupId: string) {
  const bc = await boiCanhCua(admin, nhom[0], ch);
  const noiDung = soanTinSao(nhom, cheDo, bc, mauCua(ch));
  const messageId = await guiVanBanVaoNhom(admin, groupId, noiDung);
  return { noiDung, messageId };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const laServiceRole = token === SERVICE_KEY || claimsCua(token)?.role === 'service_role';
    if (!laServiceRole) await requireRole(req, ['system_admin', 'tcth_admin']);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* body rỗng */ }
    const hanhDong = String(body.hanh_dong ?? 'phat');
    const ch = await docCauHinh(admin);
    const cheDo = cheDoCua(ch);

    if (hanhDong === 'xem_truoc' || hanhDong === 'gui_phieu') {
      const id = String(body.star_record_id ?? '').trim();
      if (!id) throw new HttpError('Thiếu star_record_id', 400);
      const phieu = await docPhieu(admin, [id]);
      const p = phieu.get(id);
      if (!p) throw new HttpError('Không có phiếu này', 404);
      const bc = await boiCanhCua(admin, p, ch);
      const noiDung = soanTinSao([p], cheDo, bc, mauCua(ch));
      if (hanhDong === 'xem_truoc') return jsonResponse({ ok: true, noi_dung: noiDung, che_do: cheDo });
      if (!ch.gmf_group_id) throw new HttpError('Chưa có gmf_group_id — nối nhóm trước', 400);
      try {
        const messageId = await guiVanBanVaoNhom(admin, ch.gmf_group_id, noiDung);
        await ghiNhatKy(admin, 'gui_tin', true, 'Gửi thử tin Sao cho một phiếu', { star_record_id: id, message_id: messageId });
        return jsonResponse({ ok: true, noi_dung: noiDung, message_id: messageId });
      } catch (e) {
        const loi = e as LoiZalo;
        await ghiNhatKy(admin, 'gui_tin', false, loi.message, { star_record_id: id, ...(loi.chiTiet ?? {}) });
        throw loi;
      }
    }

    if (hanhDong !== 'phat') throw new HttpError(`hanh_dong không hợp lệ: «${hanhDong}»`, 400);
    const dryRun = body.dry_run === true;
    const gioiHan = Math.min(Number(body.gioi_han) || 50, 200);

    if (ch.bat_sao_xung_dang !== 'true') return jsonResponse({ ok: true, bo_qua: 'cong_tac_tat', gui: 0 });
    if (!ch.gmf_group_id) {
      await ghiNhatKy(admin, 'gui_tin', false, 'Có tin chờ nhưng chưa nối nhóm GMF');
      return jsonResponse({ ok: false, loi: 'Chưa có gmf_group_id', gui: 0 });
    }

    const bayGio = new Date().toISOString();
    const { data: rows, error } = await admin
      .from('zalo_hang_doi')
      .select('id, star_record_id, so_lan_thu')
      .eq('trang_thai', 'cho')
      .lte('san_sang_luc', bayGio)
      .order('tao_luc', { ascending: true })
      .limit(gioiHan);
    if (error) throw new LoiZalo('Không đọc được hàng đợi: ' + error.message);
    const dsDong = (rows ?? []) as DongHangDoi[];
    if (!dsDong.length) return jsonResponse({ ok: true, gui: 0 });

    const phieu = await docPhieu(admin, dsDong.map((d) => d.star_record_id));
    // Phiếu đã bị gỡ trong lúc chờ → bỏ qua dòng
    const moCoi = dsDong.filter((d) => !phieu.has(d.star_record_id)).map((d) => d.id);
    if (moCoi.length && !dryRun) {
      await admin.from('zalo_hang_doi').update({ trang_thai: 'bo_qua', loi_gan_nhat: 'Phiếu đã bị gỡ trước khi gửi' }).in('id', moCoi);
    }

    // Gom theo khóa
    const nhomTheoKhoa = new Map<string, { dong: DongHangDoi[]; phieu: PhieuSao[] }>();
    for (const d of dsDong) {
      const p = phieu.get(d.star_record_id);
      if (!p) continue;
      const k = khoaGom(p, cheDo);
      const g = nhomTheoKhoa.get(k) ?? { dong: [], phieu: [] };
      g.dong.push(d); g.phieu.push(p);
      nhomTheoKhoa.set(k, g);
    }

    const soLanToiDa = Math.max(1, Number(ch.so_lan_thu_toi_da) || 5);
    let daGui = 0, loiCount = 0;
    const xemTruoc: string[] = [];
    for (const [, g] of nhomTheoKhoa) {
      const ids = g.dong.map((d) => d.id);
      if (dryRun) {
        const bc = await boiCanhCua(admin, g.phieu[0], ch);
        xemTruoc.push(soanTinSao(g.phieu, cheDo, bc, mauCua(ch)));
        continue;
      }
      // Khóa dòng: chỉ tiến trình nào đổi được 'cho' → 'dang_gui' mới được gửi,
      // tránh hai lượt cron chồng nhau gửi đúp.
      const { data: khoa } = await admin.from('zalo_hang_doi')
        .update({ trang_thai: 'dang_gui' }).in('id', ids).eq('trang_thai', 'cho').select('id');
      const idsGiu = (khoa ?? []).map((r: { id: number }) => r.id);
      if (idsGiu.length !== ids.length) {
        // Ai đó đã giữ một phần — trả lại phần mình lỡ giữ, để lượt sau gom lại
        if (idsGiu.length) await admin.from('zalo_hang_doi').update({ trang_thai: 'cho' }).in('id', idsGiu);
        continue;
      }
      try {
        const { noiDung, messageId } = await guiNhom(admin, g.phieu, cheDo, ch, ch.gmf_group_id);
        await admin.from('zalo_hang_doi').update({
          trang_thai: 'da_gui', gui_luc: new Date().toISOString(), message_id: messageId, noi_dung: noiDung, loi_gan_nhat: null,
        }).in('id', ids);
        await ghiNhatKy(admin, 'gui_tin', true, `Tin Sao: ${g.phieu.length} phiếu`, {
          star_record_ids: g.phieu.map((p) => p.id), message_id: messageId, che_do: cheDo,
        });
        daGui += 1;
      } catch (e) {
        const loi = e as LoiZalo;
        loiCount += 1;
        const lanThu = Math.max(...g.dong.map((d) => d.so_lan_thu)) + 1;
        const hetCach = lanThu >= soLanToiDa;
        // Lùi dần 2, 4, 8, 16 phút — đủ để Zalo hoặc token hồi, không dồn dập
        const lui = Math.min(2 ** lanThu, 60) * 60 * 1000;
        await admin.from('zalo_hang_doi').update({
          trang_thai: hetCach ? 'loi' : 'cho',
          so_lan_thu: lanThu,
          loi_gan_nhat: loi.message.slice(0, 500),
          san_sang_luc: new Date(Date.now() + lui).toISOString(),
        }).in('id', ids);
        await ghiNhatKy(admin, 'gui_tin', false, loi.message, {
          star_record_ids: g.phieu.map((p) => p.id), lan_thu: lanThu, ...(loi.chiTiet ?? {}),
        });
        if (hetCach) {
          await admin.rpc('zalo_canh_bao_quan_tri', {
            _tieu_de: `Zalo: ${g.phieu.length} tin Sao gửi lỗi ${lanThu} lần`,
            _noi_dung: `Việc: đẩy tin Sao Xứng Đáng vào nhóm Zalo\nLỗi: ${loi.message}\nNội dung: mở Quản trị Zalo → tab Tin Sao để xem và gửi lại.`,
          });
        }
        // Lỗi thường là token/nhóm — các nhóm còn lại gần như chắc cũng lỗi; dừng
        // lượt này để không đốt số lần thử của tất cả.
        if (loi.chiTiet?.ma_loi === -216 || /token/i.test(loi.message)) break;
      }
      // Giãn nhẹ giữa các tin: gói Tăng trưởng 100 request/phút, và nhóm đọc dễ hơn
      await new Promise((r) => setTimeout(r, 400));
    }

    return jsonResponse({ ok: loiCount === 0, gui: daGui, loi: loiCount, nhom: nhomTheoKhoa.size, dry_run: dryRun, ...(dryRun ? { xem_truoc: xemTruoc } : {}) });
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ ok: false, loi: e.message }, e.status);
    if (e instanceof LoiZalo) return jsonResponse({ ok: false, loi: e.message, chi_tiet: e.chiTiet }, 502);
    console.error('zalo-gui-sao:', e);
    return jsonResponse({ ok: false, loi: (e as Error).message ?? 'Lỗi không rõ' }, 500);
  }
});

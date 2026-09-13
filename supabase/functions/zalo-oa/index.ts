// zalo-oa — cửa duy nhất nói chuyện với Zalo Official Account từ cổng BHY ONE.
//
// Body JSON: { hanh_dong, ...tham số }. Các hành động:
//   doi_ma        { code, code_verifier?, oa_id? }  đổi oauth_code lấy cặp token (cách 1 PKCE hoặc cách 3 dán link);
//                                            oa_id (nếu gửi) phải trùng OA đang cấu hình
//   nap_token     { refresh_token }          dán refresh token lấy từ API Explorer (bước 1, cách 2)
//   gia_han       { ep? }         gia hạn nếu sắp hết hạn — cron 6 tiếng/lần gọi (bước 2)
//   trang_thai                    tình trạng token + cấu hình (không lộ token)
//   liet_ke_nhom                  các nhóm GMF mà OA đang tham gia
//   luu_nhom      { ten_nhom? }   tìm nhóm theo tên rồi ghi group_id vào cấu hình (bước 3)
//   gui_thu       { noi_dung? }   gửi một tin văn bản vào nhóm đã cấu hình (bước 4)
//
// Ai được gọi: service_role (cron, trigger) hoặc cán bộ có vai system_admin /
// tcth_admin. Mọi thứ liên quan token nằm ở _shared/zalo.ts — đừng gọi Zalo ở chỗ khác.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireRole, HttpError } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  LoiZalo, docCauHinh, docToken, doiMaLayToken, ghiCauHinh, ghiNhatKy,
  giaHanNeuCan, guiVanBanVaoNhom, lietKeNhom, napRefreshToken,
} from '../_shared/zalo.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function claimsCua(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const p = parts[1].replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(p)) as Record<string, unknown>;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const laServiceRole = token === SERVICE_KEY || claimsCua(token)?.role === 'service_role';
    // Ai làm, lúc nào — vào nhật ký mọi thao tác đổi/nạp token
    const nguoi = laServiceRole ? 'service_role' : (await requireRole(req, ['system_admin', 'tcth_admin'])).email ?? 'quản trị';
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* body rỗng */ }
    const hanhDong = String(body.hanh_dong ?? '');

    switch (hanhDong) {
      case 'doi_ma': {
        const code = String(body.code ?? '').trim();
        if (!code) throw new HttpError('Thiếu oauth_code', 400);
        const codeVerifier = String(body.code_verifier ?? '').trim() || undefined;
        const oaId = String(body.oa_id ?? '').trim();
        if (oaId) {
          const ch = await docCauHinh(admin);
          if (ch.oa_id && oaId !== ch.oa_id) {
            await ghiNhatKy(admin, 'doi_ma', false, `oa_id trong đường dẫn (${oaId}) khác OA đang cấu hình (${ch.oa_id}) — không đổi token`, { nguoi, ma_dau: code.slice(0, 4) });
            throw new HttpError(`Đường dẫn này cấp quyền cho OA ${oaId}, không phải OA đang cấu hình (${ch.oa_id}). Kiểm tra lại đã chọn đúng OA «VietinBank Bắc Hưng Yên» khi bấm Cho phép.`, 409);
          }
        }
        const t = await doiMaLayToken(admin, code, codeVerifier, { nguoi, cach: codeVerifier ? 'pkce' : 'dan_link' });
        return jsonResponse({
          ok: true, access_het_han_luc: t.access_het_han_luc, refresh_het_han_luc: t.refresh_het_han_luc,
        });
      }
      case 'nap_token': {
        const rt = String(body.refresh_token ?? '').trim();
        if (rt.length < 20) throw new HttpError('refresh_token không hợp lệ', 400);
        const kq = await napRefreshToken(admin, rt, { nguoi });
        if (!kq.da_gia_han) {
          // Trả đúng câu Zalo nói (đã dịch kèm cách sửa) — «loi» chung chung làm
          // Giám đốc mất một buổi sáng 13/09 mà không biết tại Secret key.
          const t = await docToken(admin);
          return jsonResponse({ ok: false, loi: t?.loi_gan_nhat ?? ('Zalo không đổi được Refresh token vừa dán: ' + kq.ly_do), ...kq }, 502);
        }
        return jsonResponse({ ok: true, ...kq });
      }
      case 'gia_han': {
        const kq = await giaHanNeuCan(admin, body.ep === true);
        return jsonResponse({ ok: kq.ly_do !== 'loi', ...kq });
      }
      case 'trang_thai': {
        const t = await docToken(admin);
        const ch = await docCauHinh(admin);
        return jsonResponse({
          co_token: !!t?.access_token,
          access_het_han_luc: t?.access_het_han_luc ?? null,
          refresh_het_han_luc: t?.refresh_het_han_luc ?? null,
          cap_luc: t?.cap_luc ?? null,
          gia_han_luc: t?.gia_han_luc ?? null,
          so_lan_gia_han: t?.so_lan_gia_han ?? 0,
          loi_lien_tiep: t?.loi_lien_tiep ?? 0,
          loi_gan_nhat: t?.loi_gan_nhat ?? null,
          cau_hinh: ch,
        });
      }
      case 'liet_ke_nhom': {
        const ds = await lietKeNhom(admin);
        await ghiNhatKy(admin, 'liet_ke_nhom', true, `Đọc được ${ds.length} nhóm`, {
          nhom: ds.map((n) => ({ group_id: n.group_id, group_name: n.group_name })),
        });
        return jsonResponse({ ok: true, so_nhom: ds.length, nhom: ds.map((n) => ({ group_id: n.group_id, group_name: n.group_name })) });
      }
      case 'luu_nhom': {
        const ch = await docCauHinh(admin);
        const ten = String(body.ten_nhom ?? ch.gmf_ten_nhom ?? '').trim();
        if (!ten) throw new HttpError('Thiếu tên nhóm', 400);
        const ds = await lietKeNhom(admin);
        const chuan = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
        const khop = ds.filter((n) => chuan(String(n.group_name ?? '')) === chuan(ten));
        if (khop.length !== 1) {
          await ghiNhatKy(admin, 'luu_nhom', false, `Tìm «${ten}»: ${khop.length} nhóm khớp`, {
            nhom: ds.map((n) => ({ group_id: n.group_id, group_name: n.group_name })),
          });
          return jsonResponse({
            ok: false, loi: khop.length === 0 ? 'Không có nhóm nào tên đúng như vậy' : 'Nhiều nhóm trùng tên',
            nhom: ds.map((n) => ({ group_id: n.group_id, group_name: n.group_name })),
          }, 404);
        }
        await ghiCauHinh(admin, 'gmf_group_id', String(khop[0].group_id));
        await ghiCauHinh(admin, 'gmf_ten_nhom', String(khop[0].group_name));
        await ghiNhatKy(admin, 'luu_nhom', true, `Đã lưu nhóm «${khop[0].group_name}»`, { group_id: khop[0].group_id });
        return jsonResponse({ ok: true, group_id: khop[0].group_id, group_name: khop[0].group_name });
      }
      case 'gui_thu': {
        const ch = await docCauHinh(admin);
        const groupId = ch.gmf_group_id;
        if (!groupId) throw new HttpError('Chưa có gmf_group_id — chạy luu_nhom trước', 400);
        const noiDung = String(body.noi_dung ?? '').trim()
          || `[Thử kết nối] BHY ONE đã nối được với nhóm Zalo. Tin này do hệ thống gửi lúc ${
            new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.`;
        try {
          const msgId = await guiVanBanVaoNhom(admin, groupId, noiDung);
          await ghiNhatKy(admin, 'gui_tin', true, 'Gửi tin thử', { group_id: groupId, message_id: msgId, do_dai: noiDung.length });
          return jsonResponse({ ok: true, message_id: msgId });
        } catch (e) {
          const loi = e as LoiZalo;
          await ghiNhatKy(admin, 'gui_tin', false, loi.message, { group_id: groupId, ...(loi.chiTiet ?? {}) });
          throw loi;
        }
      }
      default:
        throw new HttpError(`hanh_dong không hợp lệ: «${hanhDong}»`, 400);
    }
  } catch (e) {
    if (e instanceof HttpError) return jsonResponse({ ok: false, loi: e.message }, e.status);
    if (e instanceof LoiZalo) return jsonResponse({ ok: false, loi: e.message, chi_tiet: e.chiTiet }, 502);
    console.error('zalo-oa:', e);
    return jsonResponse({ ok: false, loi: (e as Error).message ?? 'Lỗi không rõ' }, 500);
  }
});

// Thư viện dùng chung cho kênh Zalo Official Account «VietinBank Bắc Hưng Yên».
//
// Trạng thái kết nối sống trong ba bảng (migration 20261024090000):
//   zalo_token    — cặp access/refresh token đang sống, một dòng
//   zalo_cau_hinh — OA ID, group_id nhóm GMF, công tắc
//   zalo_nhat_ky  — mọi lần gọi Zalo, thành công lẫn thất bại
//
// QUY TẮC SỐNG CÒN với refresh_token: Zalo cấp cặp token mới ở MỖI lần gia hạn
// và cặp cũ chết ngay. Vì thế: (1) chỉ một tiến trình được gia hạn tại một thời
// điểm (khóa mềm zalo_giu_khoa_gia_han), (2) nhận được token mới là GHI XUỐNG
// BẢNG NGAY, trước khi làm bất cứ việc gì khác, (3) không bao giờ log token.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const ZALO_OAUTH_URL = 'https://oauth.zaloapp.com/v4/oa/access_token';
export const ZALO_OA_API = 'https://openapi.zalo.me/v3.0/oa';
/** Dự phòng khi cấu hình chưa có khóa app_id — nguồn chính là zalo_cau_hinh.app_id */
export const ZALO_APP_ID = '298836022005112891';
/** Tên bí mật trong Vault giữ Secret Key của ứng dụng */
export const TEN_BI_MAT_VAULT = 'zalo_app_secret_key';

/** Gia hạn khi access_token còn dưới ngần này — cron chạy 6 tiếng/lần nên lấy 7 giờ */
export const NGUONG_GIA_HAN_MS = 7 * 3600 * 1000;
/** Zalo không trả hạn refresh_token; tài liệu ghi 3 tháng — trừ 1 ngày cho chắc */
const HAN_REFRESH_MS = 89 * 24 * 3600 * 1000;

export interface DongToken {
  access_token: string | null;
  refresh_token: string | null;
  access_het_han_luc: string | null;
  refresh_het_han_luc: string | null;
  cap_luc: string | null;
  gia_han_luc: string | null;
  so_lan_gia_han: number;
  loi_lien_tiep: number;
  loi_gan_nhat: string | null;
  loi_luc: string | null;
}

export class LoiZalo extends Error {
  chiTiet: Record<string, unknown>;
  constructor(thongDiep: string, chiTiet: Record<string, unknown> = {}) {
    super(thongDiep);
    this.name = 'LoiZalo';
    this.chiTiet = chiTiet;
  }
}

export async function ghiNhatKy(
  admin: SupabaseClient,
  loai: string,
  thanhCong: boolean,
  thongDiep: string,
  chiTiet: Record<string, unknown> = {},
): Promise<void> {
  // Lưới an toàn: chi_tiet không được mang token dù người gọi lỡ đưa vào
  const sach = { ...chiTiet };
  for (const k of Object.keys(sach)) {
    if (/token|secret/i.test(k)) delete sach[k];
  }
  const { error } = await admin
    .from('zalo_nhat_ky')
    .insert({ loai, thanh_cong: thanhCong, thong_diep: thongDiep.slice(0, 500), chi_tiet: sach });
  if (error) console.error('zalo_nhat_ky:', error.message);
}

export async function docCauHinh(admin: SupabaseClient): Promise<Record<string, string | null>> {
  const { data, error } = await admin.from('zalo_cau_hinh').select('khoa, gia_tri');
  if (error) throw new LoiZalo('Không đọc được zalo_cau_hinh: ' + error.message);
  const ra: Record<string, string | null> = {};
  for (const d of data ?? []) ra[d.khoa] = d.gia_tri;
  return ra;
}

export async function ghiCauHinh(admin: SupabaseClient, khoa: string, giaTri: string | null, moTa?: string) {
  const { error } = await admin
    .from('zalo_cau_hinh')
    .upsert({ khoa, gia_tri: giaTri, ...(moTa ? { mo_ta: moTa } : {}), cap_nhat_luc: new Date().toISOString() });
  if (error) throw new LoiZalo('Không ghi được zalo_cau_hinh: ' + error.message);
}

export async function docToken(admin: SupabaseClient): Promise<DongToken | null> {
  const { data, error } = await admin.from('zalo_token').select('*').eq('id', 1).maybeSingle();
  if (error) throw new LoiZalo('Không đọc được zalo_token: ' + error.message);
  return (data as DongToken | null) ?? null;
}

/** Secret Key: biến môi trường (nếu quản trị đặt) ưu tiên, không có thì Vault. */
async function laySecretKey(admin: SupabaseClient): Promise<string> {
  const env = Deno.env.get('ZALO_SECRET_KEY');
  if (env) return env;
  const { data, error } = await admin.rpc('zalo_lay_bi_mat', { _ten: TEN_BI_MAT_VAULT });
  if (error) throw new LoiZalo('Không đọc được Secret Key từ Vault: ' + error.message);
  if (!data) throw new LoiZalo(`Chưa có bí mật '${TEN_BI_MAT_VAULT}' trong Vault`);
  return String(data);
}

interface TokenZalo {
  access_token: string;
  refresh_token: string;
  /** giây — Zalo trả dạng chuỗi "90000" */
  expires_in: number;
}

/** Gọi máy chủ OAuth của Zalo — dùng cho cả đổi mã lần đầu lẫn gia hạn. */
async function goiOAuth(
  admin: SupabaseClient,
  than: Record<string, string>,
): Promise<TokenZalo> {
  const secret = await laySecretKey(admin);
  const ch = await docCauHinh(admin);
  const form = new URLSearchParams({ app_id: (ch.app_id ?? '').trim() || ZALO_APP_ID, ...than });
  const res = await fetch(ZALO_OAUTH_URL, {
    method: 'POST',
    headers: { secret_key: secret, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(text); } catch { /* Zalo trả HTML khi lỗi hạ tầng */ }
  if (!res.ok || !json.access_token) {
    const chiTiet = {
      http: res.status,
      ma_loi: json.error ?? null,
      ten_loi: json.error_name ?? null,
      ly_do: json.error_reason ?? null,
      mo_ta_goc: json.error_description ?? json.message ?? null,
      grant_type: than.grant_type,
    };
    throw new LoiZalo(dienGiaiLoiOAuth(chiTiet), chiTiet);
  }
  return {
    access_token: String(json.access_token),
    refresh_token: String(json.refresh_token ?? ''),
    expires_in: Number(json.expires_in) || 90000,
  };
}

/**
 * Dịch lỗi OAuth của Zalo sang tiếng Việt KÈM CÁCH KHẮC PHỤC — người đọc là TCTH,
 * không phải lập trình viên. Mã -14003 do Giám đốc xác nhận từ thực tế (13/09):
 * callback không khớp giá trị khai trên Zalo Developers hoặc domain chưa xác thực.
 */
export function dienGiaiLoiOAuth(ct: { http?: number; ma_loi?: unknown; ten_loi?: unknown; ly_do?: unknown; mo_ta_goc?: unknown; grant_type?: string }): string {
  const ma = Number(ct.ma_loi);
  const chu = `${ct.ten_loi ?? ''} ${ct.ly_do ?? ''} ${ct.mo_ta_goc ?? ''}`.toLowerCase();
  const goc = ct.mo_ta_goc ? ` (Zalo: ${ct.mo_ta_goc})` : ct.ten_loi ? ` (Zalo: ${ct.ten_loi})` : '';
  if (ma === -14003 || /redirect_uri|callback/.test(chu)) {
    return 'Callback URL không khớp giá trị khai trên Zalo Developers tại mục «Thiết lập đường dẫn yêu cầu cấp quyền», hoặc domain chưa xác thực. Sửa callback ở mục Cấu hình ứng dụng cho khớp từng ký tự rồi lấy mã mới.' + goc;
  }
  if (/secret|app_id|application|invalid app|unauthorized/.test(chu) || ct.http === 401 || ct.http === 403) {
    return 'Secret Key sai hoặc chưa nạp, hoặc App ID không đúng. Kiểm tra mục 1.' + goc;
  }
  if (ct.grant_type === 'authorization_code' && (/code|expire|invalid_grant|used/.test(chu) || ma === -14004 || ma === -14005 || ma === -14010)) {
    return 'Mã đã hết hạn hoặc đã dùng. Bấm «Mở trang cấp quyền» lấy mã mới, dán ngay.' + goc;
  }
  if (ct.grant_type === 'refresh_token' && (/refresh|token|expire|invalid_grant/.test(chu) || ma === -14020 || ma === -14019)) {
    return 'Refresh token đã bị dùng hoặc hết hạn — Zalo chỉ cho dùng một lần. Lấy lại token bằng Cách 2 (API Explorer).' + goc;
  }
  if (/verifier|challenge|pkce/.test(chu)) {
    return 'code_verifier không khớp code_challenge đã khai. Tạo mã PKCE mới, cập nhật code_challenge trên Zalo Developers rồi lấy mã lại; hoặc dùng Cách 3.' + goc;
  }
  return `Zalo từ chối (${ct.ten_loi ?? ct.ma_loi ?? 'HTTP ' + ct.http})${ct.mo_ta_goc ? ': ' + ct.mo_ta_goc : ''}. Xem nhật ký để biết chi tiết.`;
}

/** Ghi cặp token mới xuống bảng — việc đầu tiên sau khi Zalo trả lời. */
async function luuToken(admin: SupabaseClient, t: TokenZalo, laGiaHan: boolean, cu: DongToken | null) {
  const bayGio = Date.now();
  const dong = {
    id: 1,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    access_het_han_luc: new Date(bayGio + t.expires_in * 1000).toISOString(),
    refresh_het_han_luc: new Date(bayGio + HAN_REFRESH_MS).toISOString(),
    cap_luc: laGiaHan ? (cu?.cap_luc ?? new Date(bayGio).toISOString()) : new Date(bayGio).toISOString(),
    gia_han_luc: laGiaHan ? new Date(bayGio).toISOString() : null,
    so_lan_gia_han: laGiaHan ? (cu?.so_lan_gia_han ?? 0) + 1 : 0,
    loi_lien_tiep: 0,
    loi_gan_nhat: null,
    loi_luc: null,
    dang_gia_han_tu: null,
    cap_nhat_luc: new Date(bayGio).toISOString(),
  };
  const { error } = await admin.from('zalo_token').upsert(dong);
  if (error) {
    // Đây là tình huống xấu nhất: Zalo đã cấp cặp mới (cặp cũ đã chết) mà ta không
    // ghi được. Báo to để quản trị lấy oauth_code mới ngay.
    throw new LoiZalo('ZALO ĐÃ CẤP TOKEN MỚI NHƯNG KHÔNG GHI ĐƯỢC XUỐNG BẢNG: ' + error.message, { nghiem_trong: true });
  }
}

async function ghiLoiGiaHan(admin: SupabaseClient, cu: DongToken | null, thongDiep: string) {
  await admin.from('zalo_token').update({
    loi_lien_tiep: (cu?.loi_lien_tiep ?? 0) + 1,
    loi_gan_nhat: thongDiep.slice(0, 500),
    loi_luc: new Date().toISOString(),
    dang_gia_han_tu: null,
    cap_nhat_luc: new Date().toISOString(),
  }).eq('id', 1);
}

async function canhBaoQuanTri(admin: SupabaseClient, tieuDe: string, noiDung: string) {
  const { error } = await admin.rpc('zalo_canh_bao_quan_tri', { _tieu_de: tieuDe, _noi_dung: noiDung });
  if (error) console.error('zalo_canh_bao_quan_tri:', error.message);
}

/**
 * Bước 1 (cách 1): đổi oauth_code lấy cặp token đầu tiên.
 * Zalo dùng PKCE: nếu đường dẫn cấp quyền được thiết lập với code_challenge thì
 * lúc đổi mã BẮT BUỘC gửi kèm code_verifier tương ứng, không thì Zalo từ chối.
 */
export async function doiMaLayToken(
  admin: SupabaseClient, code: string, codeVerifier?: string,
  boiCanh: Record<string, unknown> = {},
): Promise<DongToken> {
  const cu = await docToken(admin);
  // Nhật ký chỉ giữ 4 ký tự đầu của mã — đủ đối chiếu, không đủ để dùng lại
  const dau = { ...boiCanh, ma_dau: code.slice(0, 4), co_verifier: !!codeVerifier };
  try {
    const t = await goiOAuth(admin, {
      grant_type: 'authorization_code', code,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });
    await luuToken(admin, t, false, cu);
    await ghiNhatKy(admin, 'doi_ma', true, 'Đổi oauth_code lấy token thành công', { ...dau, expires_in: t.expires_in });
  } catch (e) {
    const loi = e as LoiZalo;
    await ghiNhatKy(admin, 'doi_ma', false, loi.message, { ...(loi.chiTiet ?? {}), ...dau });
    throw loi;
  }
  return (await docToken(admin))!;
}

/**
 * Bước 1 (cách 2): admin OA lấy refresh token bằng công cụ API Explorer trên
 * Zalo for Developers rồi dán vào cổng. Không lưu thẳng cái vừa dán: dùng nó
 * gia hạn NGAY để nhận cặp mới do hệ thống giữ — cái dán vào chết ngay sau đó,
 * nên có lộ ra ngoài (ảnh chụp màn hình, lịch sử clipboard) cũng vô hại.
 */
export async function napRefreshToken(admin: SupabaseClient, refreshToken: string, boiCanh: Record<string, unknown> = {}): Promise<KetQuaGiaHan> {
  const bayGio = new Date().toISOString();
  const { error } = await admin.from('zalo_token').upsert({
    id: 1, access_token: null, refresh_token: refreshToken,
    access_het_han_luc: null, refresh_het_han_luc: new Date(Date.now() + HAN_REFRESH_MS).toISOString(),
    cap_luc: bayGio, gia_han_luc: null, so_lan_gia_han: 0,
    loi_lien_tiep: 0, loi_gan_nhat: null, loi_luc: null, dang_gia_han_tu: null, cap_nhat_luc: bayGio,
  });
  if (error) throw new LoiZalo('Không ghi được refresh token: ' + error.message);
  await ghiNhatKy(admin, 'nap_token', true, 'Nạp refresh token từ API Explorer — đang đổi lấy cặp mới', { ...boiCanh, rt_dau: refreshToken.slice(0, 4) });
  return giaHanNeuCan(admin, true);
}

export interface KetQuaGiaHan {
  da_gia_han: boolean;
  ly_do: string;
  access_het_han_luc: string | null;
}

/**
 * Bước 2: gia hạn nếu cần. `ep = true` gia hạn bất kể còn hạn hay không (dùng khi
 * Zalo báo access_token không hợp lệ dù chưa tới hạn).
 */
export async function giaHanNeuCan(admin: SupabaseClient, ep = false): Promise<KetQuaGiaHan> {
  const cu = await docToken(admin);
  if (!cu?.refresh_token) {
    const td = 'Zalo OA: chưa có token';
    const nd = 'Việc: gia hạn token Zalo\nNội dung: bảng zalo_token trống — cần đổi oauth_code mới trên Zalo Developers rồi gọi zalo-oa (doi_ma).';
    await ghiNhatKy(admin, 'gia_han', false, 'Chưa có refresh_token');
    await canhBaoQuanTri(admin, td, nd);
    return { da_gia_han: false, ly_do: 'chua_co_token', access_het_han_luc: null };
  }

  const conLai = new Date(cu.access_het_han_luc ?? 0).getTime() - Date.now();
  if (!ep && conLai > NGUONG_GIA_HAN_MS) {
    return { da_gia_han: false, ly_do: 'con_han', access_het_han_luc: cu.access_het_han_luc };
  }

  const { data: giuDuoc } = await admin.rpc('zalo_giu_khoa_gia_han');
  if (!giuDuoc) {
    await ghiNhatKy(admin, 'gia_han', false, 'Bỏ qua: tiến trình khác đang gia hạn');
    return { da_gia_han: false, ly_do: 'dang_ban', access_het_han_luc: cu.access_het_han_luc };
  }

  try {
    const t = await goiOAuth(admin, { grant_type: 'refresh_token', refresh_token: cu.refresh_token });
    await luuToken(admin, t, true, cu);
    await ghiNhatKy(admin, 'gia_han', true, 'Gia hạn thành công', {
      expires_in: t.expires_in, lan_thu: (cu.so_lan_gia_han ?? 0) + 1, ep,
    });
    return {
      da_gia_han: true, ly_do: ep ? 'ep' : 'sap_het_han',
      access_het_han_luc: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    };
  } catch (e) {
    const loi = e as LoiZalo;
    await ghiLoiGiaHan(admin, cu, loi.message);
    await ghiNhatKy(admin, 'gia_han', false, loi.message, loi.chiTiet ?? {});
    // Lần lỗi đầu có thể chỉ là mạng; từ lần thứ hai liên tiếp (12 giờ) hoặc khi
    // Zalo đã cấp mà ta không ghi được thì cảnh báo ngay — token còn sống dưới 13
    // giờ, quản trị cần thời gian lấy oauth_code mới.
    const lienTiep = (cu.loi_lien_tiep ?? 0) + 1;
    if (lienTiep >= 2 || loi.chiTiet?.nghiem_trong) {
      await canhBaoQuanTri(
        admin,
        `Zalo OA: gia hạn token lỗi ${lienTiep} lần liên tiếp`,
        `Việc: gia hạn token Zalo\nLỗi: ${loi.message}\nNội dung: nếu lỗi tiếp, tin Sao Xứng Đáng sẽ ngừng lên nhóm Zalo. Lấy oauth_code mới trên Zalo Developers rồi gọi zalo-oa (doi_ma).`,
      );
    }
    return { da_gia_han: false, ly_do: 'loi', access_het_han_luc: cu.access_het_han_luc };
  }
}

/** access_token còn dùng được; tự gia hạn nếu sắp hết. */
async function layAccessToken(admin: SupabaseClient): Promise<string> {
  let t = await docToken(admin);
  if (!t?.access_token) throw new LoiZalo('Chưa có token Zalo — cần đổi oauth_code trước');
  const conLai = new Date(t.access_het_han_luc ?? 0).getTime() - Date.now();
  if (conLai < 5 * 60 * 1000) {
    const kq = await giaHanNeuCan(admin, true);
    if (!kq.da_gia_han) throw new LoiZalo('access_token hết hạn và gia hạn không được: ' + kq.ly_do);
    t = await docToken(admin);
  }
  return t!.access_token!;
}

/**
 * Gọi Open API của OA. Nếu Zalo báo token không hợp lệ (mã -216) thì gia hạn ép
 * rồi thử lại đúng một lần — tránh vòng lặp khi refresh_token cũng đã chết.
 */
export async function goiZalo(
  admin: SupabaseClient,
  duong: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {},
  daThuLai = false,
): Promise<Record<string, unknown>> {
  const token = await layAccessToken(admin);
  const res = await fetch(`${ZALO_OA_API}${duong}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: { access_token: token, 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(text); } catch { /* giữ rỗng */ }
  const ma = Number(json.error ?? (res.ok ? 0 : res.status));
  if (ma === 0) return json;
  if (ma === -216 && !daThuLai) {
    await giaHanNeuCan(admin, true);
    return goiZalo(admin, duong, init, true);
  }
  throw new LoiZalo(String(json.message ?? `Zalo trả HTTP ${res.status}`), { ma_loi: ma, duong, http: res.status });
}

export interface NhomGmf { group_id: string; group_name: string; [k: string]: unknown }

/** Danh sách nhóm GMF mà OA đang là thành viên. */
export async function lietKeNhom(admin: SupabaseClient): Promise<NhomGmf[]> {
  const ds: NhomGmf[] = [];
  for (let offset = 0; offset < 500; offset += 50) {
    const kq = await goiZalo(admin, `/group/listgroup?offset=${offset}&count=50`);
    const data = (kq.data ?? {}) as Record<string, unknown>;
    const trang = (Array.isArray(data.groups) ? data.groups : Array.isArray(data) ? data : []) as NhomGmf[];
    ds.push(...trang);
    if (trang.length < 50) break;
  }
  return ds;
}

/** Gửi tin văn bản vào một nhóm GMF. Trả về message_id (nếu Zalo cấp). */
export async function guiVanBanVaoNhom(admin: SupabaseClient, groupId: string, vanBan: string): Promise<string | null> {
  const kq = await goiZalo(admin, '/group/message', {
    method: 'POST',
    body: { recipient: { group_id: groupId }, message: { text: vanBan } },
  });
  const data = (kq.data ?? {}) as Record<string, unknown>;
  return data.message_id ? String(data.message_id) : null;
}

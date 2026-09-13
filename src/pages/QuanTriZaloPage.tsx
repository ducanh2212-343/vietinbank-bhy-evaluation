// Quản trị Zalo — kênh Zalo Official Account «VietinBank Bắc Hưng Yên».
//
// Trang này là nơi DUY NHẤT quản trị thao tác với kết nối Zalo: nạp Secret Key,
// đổi mã ủy quyền lấy token, gia hạn tay, chọn nhóm GMF, gửi tin thử, theo dõi
// gói cước và nhật ký. Mọi lệnh đi qua edge function zalo-oa (token không bao giờ
// xuống trình duyệt); trang chỉ thấy mốc giờ và kết quả.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen, CheckCircle2, ChevronDown, CircleAlert, Copy, ExternalLink, KeyRound, MessageSquareText, RefreshCw, Send, Users, Wallet, XCircle,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface TongQuan {
  token: {
    co_token: boolean; access_het_han_luc?: string | null; refresh_het_han_luc?: string | null;
    cap_luc?: string | null; gia_han_luc?: string | null; so_lan_gia_han?: number;
    loi_lien_tiep?: number; loi_gan_nhat?: string | null; loi_luc?: string | null;
  };
  theo_thang: { thang: string; thanh_cong: number; loi: number }[];
  nhat_ky: { id: number; loai: string; thanh_cong: boolean; thong_diep: string | null; chi_tiet: Record<string, unknown> | null; tao_luc: string }[];
  cron: { name: string; schedule: string; active: boolean; last_status: string | null; last_run: string | null }[];
}

type CauHinh = Record<string, string | null>;

interface HangDoi {
  dem: { cho: number; dang_gui: number; loi: number; da_gui_7_ngay: number; da_gui_thang: number };
  dong: {
    id: number; star_record_id: string; trang_thai: string; tao_luc: string; san_sang_luc: string; so_lan_thu: number;
    loi_gan_nhat: string | null; gui_luc: string | null; message_id: string | null; noi_dung: string | null;
    name: string | null; department: string | null; stars: number | null; is_collective: boolean | null; sender: string | null;
  }[];
}

const TEN_TRANG_THAI: Record<string, string> = { cho: 'Chờ gửi', dang_gui: 'Đang gửi', da_gui: 'Đã gửi', loi: 'Lỗi', bo_qua: 'Bỏ qua' };
const MAU_TRANG_THAI: Record<string, string> = {
  cho: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300',
  dang_gui: 'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300',
  da_gui: 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300',
  loi: 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300',
  bo_qua: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400',
};

const TEN_LOAI_NHAT_KY: Record<string, string> = {
  doi_ma: 'Đổi mã ủy quyền', nap_token: 'Nạp refresh token', gia_han: 'Gia hạn token',
  liet_ke_nhom: 'Đọc danh sách nhóm', luu_nhom: 'Lưu nhóm', gui_tin: 'Gửi tin', bi_mat: 'Nạp Secret Key',
};

/** Khóa sessionStorage giữ code_verifier giữa lúc tạo và lúc Zalo gọi về kèm oauth_code. */
const KHOA_VERIFIER = 'zalo_code_verifier';

/** Base64url không đệm — đúng dạng Zalo yêu cầu cho code_challenge (tài liệu «Xác thực và ủy quyền»). */
export function base64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Tạo cặp PKCE theo tài liệu Zalo: verifier là chuỗi 43 ký tự chữ-số, challenge
 * = base64url(SHA-256(ASCII(verifier))). Zalo yêu cầu mỗi lần xin mã một verifier khác.
 */
export async function taoPkce(): Promise<{ verifier: string; challenge: string }> {
  const bang = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const ngau = crypto.getRandomValues(new Uint8Array(43));
  let verifier = '';
  for (const n of ngau) verifier += bang[n % bang.length];
  const bam = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(bam)) };
}

/** Tình trạng token nhìn từ mốc hết hạn: còn tốt / sắp hết / đã hết / chưa có. */
export function tinhTrangToken(hetHan: string | null | undefined, bayGio = Date.now()) {
  if (!hetHan) return { ma: 'chua_co', nhan: 'Chưa có token', mau: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400' } as const;
  const conLai = new Date(hetHan).getTime() - bayGio;
  if (conLai <= 0) return { ma: 'het', nhan: 'Đã hết hạn', mau: 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300' } as const;
  if (conLai < 7 * 3600 * 1000) return { ma: 'sap_het', nhan: `Còn ${Math.max(1, Math.round(conLai / 3600000))} giờ`, mau: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300' } as const;
  return { ma: 'tot', nhan: `Còn ${Math.round(conLai / 3600000)} giờ`, mau: 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300' } as const;
}

/**
 * Cách 3: nhận MỌI dạng đầu vào — đường dẫn Zalo trả về đầy đủ
 * (https://bachungyenone.com/?code=ABC&oa_id=385…), đường dẫn thiếu giao thức,
 * hay chỉ mỗi mã — trả về mã và oa_id (nếu có). Ký tự thừa, khoảng trắng, dấu
 * ngoặc kép người dùng lỡ dán kèm đều được gỡ.
 */
export function tachMaTuDauVao(dauVao: string): { code: string; oaId: string | null } {
  const t = (dauVao ?? '').trim().replace(/^["'«»<>\s]+|["'«»<>\s]+$/g, '');
  if (!t) return { code: '', oaId: null };
  const coThamSo = /[?&#]code=/.test(t);
  if (coThamSo || /^https?:\/\//i.test(t)) {
    try {
      const url = new URL(/^https?:\/\//i.test(t) ? t : 'https://x/' + t.replace(/^\/+/, ''));
      const tham = new URLSearchParams(url.search || url.hash.replace(/^#/, '?'));
      const code = (tham.get('code') ?? '').trim();
      const oaId = (tham.get('oa_id') ?? '').trim() || null;
      if (code) return { code, oaId };
    } catch { /* rơi xuống nhánh chuỗi thường */ }
    const m = t.match(/[?&#]code=([^&#\s]+)/);
    const o = t.match(/[?&#]oa_id=([^&#\s]+)/);
    return { code: m ? decodeURIComponent(m[1]) : '', oaId: o ? decodeURIComponent(o[1]) : null };
  }
  // Chỉ mã: bỏ mọi thứ không phải ký tự mã (Zalo dùng chữ, số, _ và -)
  return { code: t.replace(/[^A-Za-z0-9_-]/g, ''), oaId: null };
}

/** Che mã: 4 ký tự đầu + ••••, để đối chiếu mà không lộ. */
export function cheMa(ma: string): string {
  if (!ma) return '';
  return ma.slice(0, 4) + '•'.repeat(Math.min(12, Math.max(4, ma.length - 4)));
}

/** Đường dẫn cấp quyền OA v4 — dựng từ cấu hình, không viết cứng. */
export function duongDanCapQuyen(appId: string | null | undefined, callbackUrl: string | null | undefined): string {
  const a = (appId ?? '').trim();
  const cb = (callbackUrl ?? '').trim();
  if (!a || !cb) return '';
  return `https://oauth.zaloapp.com/v4/oa/permission?app_id=${encodeURIComponent(a)}&redirect_uri=${encodeURIComponent(cb)}`;
}

/** Callback đang cấu hình có cùng domain với nơi đang mở trang không. */
export function callbackKhopDomain(callbackUrl: string | null | undefined, hostHienTai: string): boolean {
  try { return new URL((callbackUrl ?? '').trim()).host === hostHienTai; } catch { return false; }
}

/** Phí trung bình mỗi tin gửi thành công trong tháng — null khi chưa có phí hoặc chưa gửi tin. */
export function phiMoiTin(phiThang: number | null, soTin: number): number | null {
  if (!phiThang || !soTin) return null;
  return Math.round(phiThang / soTin);
}

const dinhDangTien = (n: number) => n.toLocaleString('vi-VN') + ' đ';
const gio = (s: string | null | undefined) => (s ? new Date(s).toLocaleString('vi-VN') : '—');

export default function QuanTriZaloPage() {
  const { toast } = useToast();
  const { roles } = useAuth();
  const laSystemAdmin = roles.includes('system_admin');

  const [tq, setTq] = useState<TongQuan | null>(null);
  const [ch, setCh] = useState<CauHinh>({});
  const [coBiMat, setCoBiMat] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [dangChay, setDangChay] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [secretKey, setSecretKey] = useState('');
  // Zalo gọi về callback URL dạng /quan-tri-zalo?code=...&oa_id=... — đọc sẵn vào ô
  const [oauthCode, setOauthCode] = useState(() => searchParams.get('code') ?? '');
  const [codeVerifier, setCodeVerifier] = useState(() => {
    try { return sessionStorage.getItem(KHOA_VERIFIER) ?? ''; } catch { return ''; }
  });
  const [codeChallenge, setCodeChallenge] = useState('');
  const [refreshTokenDan, setRefreshTokenDan] = useState('');
  const [dauVaoCach3, setDauVaoCach3] = useState('');
  const [loiCach3, setLoiCach3] = useState<string | null>(null);
  const [huongDanMo, setHuongDanMo] = useState(false);
  const [callbackForm, setCallbackForm] = useState<string | null>(null);
  const [hangDoi, setHangDoi] = useState<HangDoi | null>(null);
  const [phieuGanNhat, setPhieuGanNhat] = useState<{ id: string; name: string; department: string; stars: number; is_collective: boolean; created_at: string }[]>([]);
  const [phieuChon, setPhieuChon] = useState('');
  const [xemTruoc, setXemTruoc] = useState<string | null>(null);
  const [caiDatTin, setCaiDatTin] = useState<CauHinh>({});
  const [tinThu, setTinThu] = useState('');
  const [dsNhom, setDsNhom] = useState<{ group_id: string; group_name: string }[] | null>(null);
  const [goiCuoc, setGoiCuoc] = useState<CauHinh>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [tqRes, chRes, bmRes, hdRes, psRes] = await Promise.all([
      (supabase as any).rpc('zalo_tong_quan'),
      (supabase as any).from('zalo_cau_hinh').select('khoa, gia_tri'),
      (supabase as any).rpc('zalo_co_bi_mat'),
      (supabase as any).rpc('zalo_hang_doi_tong_quan'),
      supabase.from('star_records').select('id, name, department, stars, is_collective, created_at')
        .order('created_at', { ascending: false }).limit(15),
    ]);
    if (!hdRes.error) setHangDoi(hdRes.data as HangDoi);
    if (!psRes.error) {
      const ds = (psRes.data ?? []).map((r: any) => ({ ...r, stars: Number(r.stars) }));
      setPhieuGanNhat(ds);
      setPhieuChon((cu) => cu || ds[0]?.id || '');
    }
    if (tqRes.error) toast({ title: 'Không tải được tổng quan Zalo', description: tqRes.error.message, variant: 'destructive' });
    else setTq(tqRes.data as TongQuan);
    if (!chRes.error) {
      const m: CauHinh = {};
      for (const r of (chRes.data ?? []) as { khoa: string; gia_tri: string | null }[]) m[r.khoa] = r.gia_tri;
      setCh(m);
      setGoiCuoc({
        goi_cuoc_ten: m.goi_cuoc_ten ?? '', goi_cuoc_phi_thang: m.goi_cuoc_phi_thang ?? '',
        goi_cuoc_han_muc_tin_thang: m.goi_cuoc_han_muc_tin_thang ?? '', goi_cuoc_han_muc_phut: m.goi_cuoc_han_muc_phut ?? '',
        goi_cuoc_het_han: m.goi_cuoc_het_han ?? '',
        goi_cuoc_ky_han: m.goi_cuoc_ky_han ?? '',
        goi_cuoc_tin_nhom_mien_phi_den: m.goi_cuoc_tin_nhom_mien_phi_den ?? '',
      });
      setCaiDatTin({
        gom_phut: m.gom_phut ?? '2', toi_da_dong_mot_tin: m.toi_da_dong_mot_tin ?? '10',
        link_chan_tin: m.link_chan_tin ?? '', ly_do_toi_da_ky_tu: m.ly_do_toi_da_ky_tu ?? '300',
        so_lan_thu_toi_da: m.so_lan_thu_toi_da ?? '5',
      });
    }
    if (!bmRes.error) setCoBiMat(bmRes.data === true);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  /** Gọi edge function zalo-oa; báo lỗi bằng toast, trả về data hoặc null. */
  const goiZaloOa = useCallback(async (hanhDong: string, body: Record<string, unknown> = {}) => {
    setDangChay(hanhDong);
    try {
      const { data, error } = await supabase.functions.invoke('zalo-oa', { body: { hanh_dong: hanhDong, ...body } });
      // functions.invoke gói lỗi HTTP vào error; thân JSON có `loi` tiếng Việt của hàm
      if (error) {
        let chiTiet = error.message;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === 'function') {
            const j = await ctx.json();
            if (j?.loi) chiTiet = j.loi;
          }
        } catch { /* giữ message gốc */ }
        toast({ title: 'Zalo trả lỗi', description: chiTiet, variant: 'destructive' });
        return { ok: false, loi: chiTiet };
      }
      if (data && data.ok === false) {
        toast({ title: 'Zalo trả lỗi', description: data.loi ?? 'Không rõ', variant: 'destructive' });
        return data;
      }
      return data;
    } finally {
      setDangChay(null);
      load();
    }
  }, [load, toast]);

  const napSecretKey = async () => {
    setDangChay('bi_mat');
    const { error } = await (supabase as any).rpc('zalo_dat_bi_mat', { _gia_tri: secretKey });
    setDangChay(null);
    if (error) toast({ title: 'Không nạp được Secret Key', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Đã nạp Secret Key vào kho bí mật' }); setSecretKey(''); load(); }
  };

  const taoMaPkce = async () => {
    const { verifier, challenge } = await taoPkce();
    setCodeVerifier(verifier);
    setCodeChallenge(challenge);
    try { sessionStorage.setItem(KHOA_VERIFIER, verifier); } catch { /* trình duyệt chặn — vẫn còn trong ô */ }
  };

  const doiMa = async () => {
    const kq = await goiZaloOa('doi_ma', {
      code: oauthCode.trim(), ...(codeVerifier.trim() ? { code_verifier: codeVerifier.trim() } : {}),
    });
    if (kq?.ok) {
      toast({ title: 'Đã lấy token', description: `Hết hạn lúc ${gio(kq.access_het_han_luc)}` });
      setOauthCode(''); setCodeVerifier(''); setCodeChallenge('');
      try { sessionStorage.removeItem(KHOA_VERIFIER); } catch { /* bỏ qua */ }
      if (searchParams.has('code')) setSearchParams({}, { replace: true });
    }
  };

  const maCach3 = useMemo(() => tachMaTuDauVao(dauVaoCach3), [dauVaoCach3]);
  const oaIdLech = !!(maCach3.oaId && ch.oa_id && maCach3.oaId !== ch.oa_id);
  const linkCapQuyen = duongDanCapQuyen(ch.app_id, ch.callback_url);
  const hostHienTai = typeof window !== 'undefined' ? window.location.host : '';
  const callbackLechDomain = !!ch.callback_url && !!hostHienTai && !callbackKhopDomain(ch.callback_url, hostHienTai);

  const moTrangCapQuyen = () => {
    if (!linkCapQuyen) return;
    window.open(linkCapQuyen, '_blank', 'noopener');
  };
  const chepLink = async () => {
    try { await navigator.clipboard.writeText(linkCapQuyen); toast({ title: 'Đã chép đường dẫn cấp quyền' }); }
    catch { toast({ title: 'Trình duyệt không cho chép — bôi đen ô rồi Ctrl+C', variant: 'destructive' }); }
  };
  const doiMaCach3 = async () => {
    setLoiCach3(null);
    if (!maCach3.code) { setLoiCach3('Chưa nhận diện được mã trong nội dung dán.'); return; }
    if (oaIdLech) { setLoiCach3(`Đường dẫn này cấp quyền cho OA ${maCach3.oaId}, không phải OA đang cấu hình (${ch.oa_id}). Không đổi token.`); return; }
    const kq = await goiZaloOa('doi_ma', { code: maCach3.code, ...(maCach3.oaId ? { oa_id: maCach3.oaId } : {}) });
    if (kq?.ok) { toast({ title: 'Đã lấy token', description: `Hết hạn lúc ${gio(kq.access_het_han_luc)}` }); setDauVaoCach3(''); }
    else if (kq?.loi) setLoiCach3(String(kq.loi));
  };
  const luuCallback = async () => {
    const gt = (callbackForm ?? '').trim();
    if (!/^https:\/\/[^\s]+$/.test(gt)) { toast({ title: 'Callback URL phải bắt đầu bằng https:// và không có khoảng trắng', variant: 'destructive' }); return; }
    await doiCauHinh('callback_url', gt);
    setCallbackForm(null);
    toast({ title: 'Đã lưu callback URL', description: 'Nhớ khai đúng giá trị này trên Zalo Developers.' });
  };

  const napRefreshToken = async () => {
    const kq = await goiZaloOa('nap_token', { refresh_token: refreshTokenDan.trim() });
    if (kq?.ok) { toast({ title: 'Đã nạp token', description: `Đã đổi lấy cặp mới, hết hạn lúc ${gio(kq.access_het_han_luc)}` }); setRefreshTokenDan(''); }
  };

  const giaHan = async () => {
    const kq = await goiZaloOa('gia_han', { ep: true });
    if (kq?.da_gia_han) toast({ title: 'Đã gia hạn token', description: `Hết hạn lúc ${gio(kq.access_het_han_luc)}` });
    else if (kq) toast({ title: 'Không gia hạn', description: kq.ly_do === 'chua_co_token' ? 'Chưa có token — đổi mã ủy quyền trước.' : kq.ly_do });
  };

  const lietKeNhom = async () => {
    const kq = await goiZaloOa('liet_ke_nhom');
    if (kq?.ok) setDsNhom(kq.nhom ?? []);
  };

  const luuNhom = async (tenNhom?: string) => {
    const kq = await goiZaloOa('luu_nhom', tenNhom ? { ten_nhom: tenNhom } : {});
    if (kq?.ok) toast({ title: 'Đã lưu nhóm', description: `${kq.group_name} (${kq.group_id})` });
    else if (kq?.nhom) setDsNhom(kq.nhom);
  };

  const guiThu = async () => {
    const kq = await goiZaloOa('gui_thu', tinThu.trim() ? { noi_dung: tinThu.trim() } : {});
    if (kq?.ok) toast({ title: 'Đã gửi tin thử vào nhóm', description: 'Mở Zalo để xác nhận.' });
  };

  /** Gọi zalo-gui-sao (xem trước / gửi thử một phiếu). */
  const goiGuiSao = useCallback(async (hanhDong: string, body: Record<string, unknown> = {}) => {
    setDangChay(hanhDong);
    try {
      const { data, error } = await supabase.functions.invoke('zalo-gui-sao', { body: { hanh_dong: hanhDong, ...body } });
      if (error) {
        let chiTiet = error.message;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === 'function') { const j = await ctx.json(); if (j?.loi) chiTiet = j.loi; }
        } catch { /* giữ message gốc */ }
        toast({ title: 'Không soạn/gửi được tin Sao', description: chiTiet, variant: 'destructive' });
        return null;
      }
      if (data && data.ok === false) { toast({ title: 'Zalo trả lỗi', description: data.loi ?? 'Không rõ', variant: 'destructive' }); return data; }
      return data;
    } finally { setDangChay(null); }
  }, [toast]);

  const xemTruocPhieu = async () => {
    const kq = await goiGuiSao('xem_truoc', { star_record_id: phieuChon });
    if (kq?.ok) setXemTruoc(kq.noi_dung);
  };
  const guiThuPhieu = async () => {
    const kq = await goiGuiSao('gui_phieu', { star_record_id: phieuChon });
    if (kq?.ok) { setXemTruoc(kq.noi_dung); toast({ title: 'Đã gửi tin Sao vào nhóm', description: 'Mở Zalo để xem.' }); load(); }
  };
  const guiLaiTinLoi = async () => {
    const { data, error } = await (supabase as any).rpc('zalo_gui_lai_tin_loi');
    if (error) toast({ title: 'Không gửi lại được', description: error.message, variant: 'destructive' });
    else { toast({ title: `Đã xếp lại ${data} tin lỗi vào hàng đợi` }); load(); }
  };
  const luuCaiDatTin = async () => {
    setDangChay('cai_dat_tin');
    for (const [khoa, giaTri] of Object.entries(caiDatTin)) {
      const { error } = await (supabase as any).from('zalo_cau_hinh')
        .update({ gia_tri: (giaTri ?? '').trim() || null, cap_nhat_luc: new Date().toISOString() }).eq('khoa', khoa);
      if (error) { toast({ title: 'Không lưu được cài đặt tin', description: error.message, variant: 'destructive' }); break; }
    }
    setDangChay(null);
    toast({ title: 'Đã lưu cài đặt tin Sao' });
    load();
  };

  const doiCauHinh = async (khoa: string, giaTri: string | null) => {
    const { error } = await (supabase as any).from('zalo_cau_hinh')
      .update({ gia_tri: giaTri, cap_nhat_luc: new Date().toISOString() }).eq('khoa', khoa);
    if (error) toast({ title: 'Không lưu được cấu hình', description: error.message, variant: 'destructive' });
    else load();
  };

  const luuGoiCuoc = async () => {
    setDangChay('goi_cuoc');
    for (const [khoa, giaTri] of Object.entries(goiCuoc)) {
      const { error } = await (supabase as any).from('zalo_cau_hinh')
        .update({ gia_tri: giaTri?.trim() ? giaTri.trim() : null, cap_nhat_luc: new Date().toISOString() }).eq('khoa', khoa);
      if (error) { toast({ title: 'Không lưu được gói cước', description: error.message, variant: 'destructive' }); break; }
    }
    setDangChay(null);
    toast({ title: 'Đã lưu thông tin gói cước' });
    load();
  };

  const token = tq?.token;
  const ttAccess = tinhTrangToken(token?.co_token ? token.access_het_han_luc : null);
  const ttRefresh = tinhTrangToken(token?.co_token ? token.refresh_het_han_luc : null);
  const batSao = ch.bat_sao_xung_dang === 'true';

  const thangNay = useMemo(() => {
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return tq?.theo_thang.find((t) => t.thang === key) ?? { thang: key, thanh_cong: 0, loi: 0 };
  }, [tq]);
  const phiThang = Number(ch.goi_cuoc_phi_thang) || null;
  const hanMucThang = Number(ch.goi_cuoc_han_muc_tin_thang) || null;
  const phiTin = phiMoiTin(phiThang, thangNay.thanh_cong);
  // Bảng giá Zalo 01/06/2026: tin OA → nhóm chat miễn phí tới 31/12/2026. Qua mốc
  // này Zalo thu theo đơn giá công bố — phải nhắc trước, đừng để hóa đơn báo hộ.
  const mienPhiDen = ch.goi_cuoc_tin_nhom_mien_phi_den ? new Date(ch.goi_cuoc_tin_nhom_mien_phi_den + 'T23:59:59') : null;
  const conNgayMienPhi = mienPhiDen ? Math.ceil((mienPhiDen.getTime() - Date.now()) / 86400000) : null;
  const ngayHetHanGoi = ch.goi_cuoc_het_han ? new Date(ch.goi_cuoc_het_han + 'T00:00:00') : null;
  const conNgayGoi = ngayHetHanGoi ? Math.ceil((ngayHetHanGoi.getTime() - Date.now()) / 86400000) : null;

  // Bước kế tiếp cho quản trị — trang phải nói rõ đang kẹt ở đâu, không bắt đoán
  const buocKeTiep = coBiMat === false ? 'Nạp Secret Key của ứng dụng Zalo (ô «Kết nối»).'
    : !token?.co_token ? 'Lấy oauth_code trên Zalo Developers rồi dán vào ô «Đổi mã ủy quyền».'
    : !ch.gmf_group_id ? 'Bấm «Tìm và lưu nhóm» để nối nhóm GMF.'
    : !batSao ? 'Gửi tin thử; xác nhận trên Zalo rồi bật công tắc Sao Xứng Đáng khi mẫu tin đã duyệt.'
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquareText className="w-6 h-6" /> Quản trị Zalo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kênh Zalo OA «VietinBank Bắc Hưng Yên» → nhóm GMF «{ch.gmf_ten_nhom ?? '343 - Bắc Hưng Yên One'}». Token, nhóm, gói cước và nhật ký gửi.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </Button>
      </div>

      {(token?.loi_lien_tiep ?? 0) > 0 && (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Gia hạn token lỗi {token!.loi_lien_tiep} lần liên tiếp</AlertTitle>
          <AlertDescription>{token!.loi_gan_nhat} — lúc {gio(token!.loi_luc)}. Nếu refresh_token đã chết, lấy oauth_code mới rồi đổi mã lại.</AlertDescription>
        </Alert>
      )}
      {conNgayMienPhi !== null && conNgayMienPhi <= 45 && (
        <Alert variant={conNgayMienPhi < 0 ? 'destructive' : 'default'}>
          <Wallet className="h-4 w-4" />
          <AlertTitle>{conNgayMienPhi < 0 ? 'Zalo đã bắt đầu thu phí tin gửi vào nhóm' : `Còn ${conNgayMienPhi} ngày tin gửi vào nhóm còn miễn phí`}</AlertTitle>
          <AlertDescription>
            Theo bảng giá Zalo 01/06/2026, tin OA gửi vào nhóm chat miễn phí tới {mienPhiDen!.toLocaleDateString('vi-VN')}. Sau đó tính theo đơn giá Zalo công bố —
            xem lại tần suất tin Sao và cập nhật đơn giá ở tab Gói cước.
          </AlertDescription>
        </Alert>
      )}
      {buocKeTiep && !loading && (
        <Alert>
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Bước kế tiếp</AlertTitle>
          <AlertDescription>{buocKeTiep}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><KeyRound className="w-4 h-4" /> Access token (sống 25 giờ)</CardTitle></CardHeader>
          <CardContent>
            <Badge className={ttAccess.mau}>{ttAccess.nhan}</Badge>
            <p className="text-xs text-muted-foreground mt-1">Hết hạn: {gio(token?.access_het_han_luc)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> Refresh token (sống 3 tháng, dùng 1 lần)</CardTitle></CardHeader>
          <CardContent>
            <Badge className={ttRefresh.mau}>{ttRefresh.ma === 'tot' || ttRefresh.ma === 'sap_het' ? `Còn ${Math.round((new Date(token!.refresh_het_han_luc!).getTime() - Date.now()) / 86400000)} ngày` : ttRefresh.nhan}</Badge>
            <p className="text-xs text-muted-foreground mt-1">Đã gia hạn {token?.so_lan_gia_han ?? 0} lần · gần nhất {gio(token?.gia_han_luc)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Users className="w-4 h-4" /> Nhóm GMF</CardTitle></CardHeader>
          <CardContent>
            {ch.gmf_group_id
              ? <Badge className="bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Đã nối</Badge>
              : <Badge className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400"><XCircle className="w-3 h-3 mr-1" /> Chưa nối</Badge>}
            <p className="text-xs text-muted-foreground mt-1 truncate" title={ch.gmf_group_id ?? ''}>{ch.gmf_group_id ? `ID ${ch.gmf_group_id}` : 'Chưa có group_id'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Send className="w-4 h-4" /> Tin tháng này</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thangNay.thanh_cong}{hanMucThang ? <span className="text-base font-normal text-muted-foreground">/{hanMucThang.toLocaleString('vi-VN')}</span> : null}</div>
            <p className={`text-xs ${thangNay.loi > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{thangNay.loi} tin lỗi{phiTin ? ` · phí gói phân bổ ≈ ${dinhDangTien(phiTin)}/tin` : ''}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ket-noi">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="ket-noi">Kết nối</TabsTrigger>
          <TabsTrigger value="nhom">Nhóm & gửi thử</TabsTrigger>
          <TabsTrigger value="tin-sao">Tin Sao</TabsTrigger>
          <TabsTrigger value="goi-cuoc">Gói cước & phí</TabsTrigger>
          <TabsTrigger value="nhat-ky">Nhật ký</TabsTrigger>
        </TabsList>

        <TabsContent value="ket-noi" className="space-y-4">
          <Collapsible open={huongDanMo} onOpenChange={setHuongDanMo}>
            <Card>
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full text-left">
                  <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> Hướng dẫn vận hành kênh Zalo</CardTitle>
                    <ChevronDown className={`w-4 h-4 transition-transform ${huongDanMo ? 'rotate-180' : ''}`} />
                  </CardHeader>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <div className="font-medium">1. Thông tin cố định</div>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-0.5 mt-1">
                      <li>Ứng dụng «Bắc Hưng Yên One» — App ID <span className="font-mono">{ch.app_id ?? '298836022005112891'}</span>.</li>
                      <li>OA «VietinBank Bắc Hưng Yên» — OA ID <span className="font-mono">{ch.oa_id ?? '3852871198450053653'}</span>, gói {ch.goi_cuoc_ten ?? 'Tăng trưởng'}.</li>
                      <li>Nhóm GMF nhận tin: «{ch.gmf_ten_nhom ?? '343 - Bắc Hưng Yên One'}».</li>
                      <li>Nơi quản trị: <span className="font-mono">developers.zalo.me</span> (ứng dụng, token, callback) và <span className="font-mono">oa.zalo.me</span> (OA, gói cước, nhóm chat).</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium">2. Ba cách lấy token — thử theo thứ tự này</div>
                    <ol className="list-decimal pl-5 text-muted-foreground space-y-0.5 mt-1">
                      <li><strong>Cách 2 · dán refresh token từ API Explorer</strong> — nhanh nhất, không cần cấu hình gì thêm. Thử trước.</li>
                      <li><strong>Cách 3 · dán đường dẫn Zalo trả về</strong> — chắc chắn nhất, không phụ thuộc PKCE hay callback trỏ về đúng trang.</li>
                      <li><strong>Cách 1 · PKCE</strong> — gọn nhất khi đã khai callback đúng; mã tự điền khi Zalo đưa về trang này.</li>
                    </ol>
                  </div>
                  <div>
                    <div className="font-medium">3. Đường đi trên Zalo Developers, từng cú bấm</div>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-0.5 mt-1">
                      <li><strong>API Explorer (Cách 2):</strong> developers.zalo.me → Công cụ &amp; Hỗ trợ → API Explorer → «Chọn ứng dụng» = Bắc Hưng Yên One → «Loại access token» = <strong>OA Access Token</strong> (không phải User Access Token) → chọn OA «VietinBank Bắc Hưng Yên» → Cho phép → màn hình hiện hai ô: <strong>Access token</strong> (ô trên) và <strong>Refresh token</strong> (ô dưới). Bấm nút copy ở ô <strong>Refresh token</strong> → dán vào ô «Refresh token» của Cách 2 trên trang này → «Nạp và đổi lấy cặp mới». Ô Access token không cần dán.</li>
                      <li><strong>Đường dẫn cấp quyền (Cách 3 và Cách 1):</strong> developers.zalo.me → ứng dụng → Official Account → «Thiết lập đường dẫn yêu cầu cấp quyền» → khối «Đường dẫn yêu cầu cấp quyền» có sẵn link, bấm copy. Hoặc bấm «Mở trang cấp quyền» ngay trên trang này — hai link phải giống nhau. Bấm Cho phép bằng tài khoản admin OA; trình duyệt chuyển tới callback kèm <em>code</em> — copy cả thanh địa chỉ dán vào ô Cách 3.</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium">4. Ba điều dễ quên nhất</div>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-0.5 mt-1">
                      <li>Mã oauth sống vài phút, dùng một lần — mở sẵn trang này rồi mới bấm Cho phép, dán ngay.</li>
                      <li>Refresh token của Zalo chỉ dùng được MỘT lần; mỗi lần gia hạn sinh cặp mới. Hệ thống ghi đè ngay khi nhận — không tự tay gia hạn ở nơi khác (API Explorer, Postman) khi cổng đang giữ token, làm vậy là cặp trên cổng chết.</li>
                      <li>Callback URL phải khớp TỪNG KÝ TỰ với giá trị khai trên Zalo Developers, và domain đó phải đã xác thực với Zalo. Hiện khai: <span className="font-mono">{ch.callback_url ?? '—'}</span>.</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium">5. Xử lý sự cố</div>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-0.5 mt-1">
                      <li><strong>Token chết, lịch gia hạn báo lỗi liên tiếp:</strong> lấy lại bằng Cách 2. Không cần sửa gì khác.</li>
                      <li><strong>Lỗi -14003:</strong> callback không khớp hoặc domain chưa xác thực — so ô «Callback URL» bên dưới với Zalo Developers, sửa cho khớp từng ký tự; nếu vẫn lỗi thì dùng Cách 2.</li>
                      <li><strong>Tin không lên nhóm:</strong> tab Nhóm kiểm tra group_id đã có; tab Tin Sao xem hàng đợi và cột ghi chú; tab Nhật ký xem Zalo trả lỗi gì. Công tắc «Đẩy tin Sao» phải đang bật.</li>
                      <li><strong>Mất Secret Key:</strong> developers.zalo.me → ứng dụng → Cài đặt → xem/đổi Secret Key → nạp lại ở mục 1.</li>
                    </ul>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Cấu hình ứng dụng</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <span>App ID: <span className="font-mono">{ch.app_id ?? '—'}</span></span>
                <span>OA ID: <span className="font-mono">{ch.oa_id ?? '—'}</span></span>
              </div>
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-[260px]">
                  <Label htmlFor="cb">Callback URL (khớp từng ký tự với Zalo Developers)</Label>
                  <Input id="cb" value={callbackForm ?? ch.callback_url ?? ''} onChange={(e) => setCallbackForm(e.target.value)} placeholder="https://bachungyenone.com" className="font-mono text-xs" />
                </div>
                <Button variant="outline" onClick={luuCallback} disabled={callbackForm === null || callbackForm.trim() === (ch.callback_url ?? '')}>Lưu callback</Button>
              </div>
              {callbackLechDomain && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Callback đang cấu hình ({ch.callback_url}) khác domain đang mở trang ({hostHienTai}). Zalo chỉ chấp nhận domain đã xác thực và khớp giá trị khai trên Zalo Developers — nếu anh đang mở từ domain phụ (workers.dev), Cách 1 sẽ không tự điền mã; dùng Cách 2 hoặc Cách 3.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">1. Secret key của ứng dụng Zalo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                App ID <span className="font-mono">298836022005112891</span> · OA ID <span className="font-mono">{ch.oa_id}</span>.
                Secret Key nằm trong kho bí mật của máy chủ, không hiện lại ở đây. Trạng thái:{' '}
                {coBiMat === null ? '…' : coBiMat ? <Badge className="bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300">Đã nạp</Badge> : <Badge className="bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300">Chưa nạp</Badge>}
              </p>
              {laSystemAdmin ? (
                <div className="flex gap-2 flex-wrap items-end">
                  <div className="flex-1 min-w-[240px]">
                    <Label htmlFor="secret">Secret key {coBiMat ? '(dán để ghi đè)' : ''}</Label>
                    <Input id="secret" type="password" autoComplete="off" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="Zalo Developers → ứng dụng → Cài đặt → ô «Secret key»" />
                  </div>
                  <Button onClick={napSecretKey} disabled={secretKey.trim().length < 8 || dangChay === 'bi_mat'}>Nạp vào kho bí mật</Button>
                </div>
              ) : <p className="text-xs text-muted-foreground">Chỉ quản trị hệ thống mới nạp được Secret Key.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">2. Lấy token lần đầu — chọn một trong ba cách</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3 rounded-md border p-3">
                <div className="font-medium text-sm">Cách 1 · Authorization code + PKCE (Zalo tự đưa mã về trang này)</div>
                <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                  <li>Bấm «Tạo mã PKCE», chép <em>code_challenge</em>.</li>
                  <li>Trên Zalo for Developers → ứng dụng → Official Account API → «Thiết lập đường dẫn yêu cầu cấp quyền»: dán code_challenge,
                    callback URL đúng như ô «Cấu hình ứng dụng» (<span className="font-mono">{ch.callback_url ?? '—'}</span>), chọn đủ quyền, lưu.</li>
                  <li>Mở đường dẫn cấp quyền bằng tài khoản admin OA, bấm «Cho phép». Zalo đưa anh quay lại trang này kèm <em>code</em> — ô bên dưới tự điền. Mã sống vài phút, dùng một lần.</li>
                  <li>Bấm «Đổi mã lấy token». Mỗi lần xin mã phải tạo PKCE mới.</li>
                </ol>
                <div className="flex gap-2 flex-wrap items-end">
                  <Button variant="outline" onClick={taoMaPkce}>Tạo mã PKCE</Button>
                  {codeChallenge && (
                    <div className="flex-1 min-w-[240px]">
                      <Label>Code challenge — dán vào ô «Code challenge» trên Zalo Developers</Label>
                      <Input readOnly value={codeChallenge} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                    </div>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="code">Authorization code (mã ủy quyền — Zalo gọi là «code»)</Label>
                    <Input id="code" autoComplete="off" value={oauthCode} onChange={(e) => setOauthCode(e.target.value)} placeholder="Tự điền khi Zalo đưa về trang này; hoặc dán tay" />
                  </div>
                  <div>
                    <Label htmlFor="verifier">Code verifier (tự giữ từ lúc bấm «Tạo mã PKCE»; để trống nếu Zalo không đặt Code challenge)</Label>
                    <Input id="verifier" autoComplete="off" value={codeVerifier} onChange={(e) => setCodeVerifier(e.target.value)} placeholder="43 ký tự, tự giữ từ lúc tạo PKCE" className="font-mono text-xs" />
                  </div>
                </div>
                <Button onClick={doiMa} disabled={!oauthCode.trim() || dangChay === 'doi_ma' || coBiMat === false}>
                  {dangChay === 'doi_ma' ? 'Đang đổi…' : 'Đổi mã lấy token'}
                </Button>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <div className="font-medium text-sm">Cách 2 · Dán Refresh token từ API Explorer (nhanh nhất — thử trước)</div>
                <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                  <li>Zalo for Developers → Công cụ &amp; Hỗ trợ → <strong>API Explorer</strong>.</li>
                  <li>Góc phải «Chọn ứng dụng» = <strong>Bắc Hưng Yên One</strong>. Ô «Loại access token» = <strong>OA Access Token</strong> (mặc định là «User Access Token» — phải đổi, nếu không token là của tài khoản cá nhân và không gửi được tin vào nhóm).</li>
                  <li>Chọn OA «VietinBank Bắc Hưng Yên» → Cho phép → bấm «Lấy Access Token».</li>
                  <li>Màn hình hiện hai ô. Ô <strong>Access token</strong> (ô trên): KHÔNG cần dán — cổng tự lấy. Ô <strong>Refresh token</strong> (ô dưới): bấm nút copy cạnh ô rồi dán vào ô bên dưới.</li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  Cổng dùng Refresh token vừa dán để đổi ngay lấy cặp Access token + Refresh token mới của riêng hệ thống; chuỗi anh dán hết tác dụng ngay sau đó, có lộ cũng vô hại.
                </p>
                <div className="flex gap-2 flex-wrap items-end">
                  <div className="flex-1 min-w-[240px]">
                    <Label htmlFor="rt">Refresh token (ô DƯỚI trên API Explorer)</Label>
                    <Input id="rt" type="password" autoComplete="off" value={refreshTokenDan} onChange={(e) => setRefreshTokenDan(e.target.value)} placeholder="Dán Refresh token — không dán Access token vào đây" />
                  </div>
                  <Button onClick={napRefreshToken} disabled={refreshTokenDan.trim().length < 20 || dangChay === 'nap_token' || coBiMat === false}>
                    {dangChay === 'nap_token' ? 'Đang nạp…' : 'Nạp và đổi lấy cặp mới'}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <div className="font-medium text-sm">Cách 3 · Dán đường dẫn Zalo trả về sau khi Cho phép (dự phòng — không PKCE, không cần callback trỏ về đúng trang)</div>
                <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                  <li>Bấm «Mở trang cấp quyền» (tab mới), chọn OA «VietinBank Bắc Hưng Yên», bấm Cho phép.</li>
                  <li>Trình duyệt chuyển tới callback kèm <em>code</em>. Copy TOÀN BỘ thanh địa chỉ (hoặc chỉ mã) dán vào ô dưới.</li>
                  <li>Đối chiếu mã và OA hiện dưới ô rồi bấm «Đổi mã lấy token». Mã sống vài phút.</li>
                </ol>
                <div className="flex gap-2 flex-wrap items-end">
                  <Button variant="outline" onClick={moTrangCapQuyen} disabled={!linkCapQuyen}><ExternalLink className="w-4 h-4 mr-1" /> Mở trang cấp quyền</Button>
                  <div className="flex-1 min-w-[260px]">
                    <Label>Đường dẫn cấp quyền (đối chiếu với Zalo Developers)</Label>
                    <div className="flex gap-1">
                      <Input readOnly value={linkCapQuyen || 'Thiếu App ID hoặc callback URL'} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                      <Button variant="outline" size="icon" onClick={chepLink} disabled={!linkCapQuyen} title="Chép"><Copy className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="dan3">Dán cả thanh địa chỉ Zalo trả về (có «code=…&amp;oa_id=…») hoặc chỉ mã «code»</Label>
                  <Textarea id="dan3" rows={2} value={dauVaoCach3} onChange={(e) => { setDauVaoCach3(e.target.value); setLoiCach3(null); }} placeholder="https://bachungyenone.com/?code=…&oa_id=… hoặc chỉ mã" className="font-mono text-xs" />
                  {dauVaoCach3.trim() && (
                    <p className="text-xs mt-1">
                      {maCach3.code
                        ? <>Mã nhận diện: <span className="font-mono">{cheMa(maCach3.code)}</span> ({maCach3.code.length} ký tự)</>
                        : <span className="text-red-600 dark:text-red-400">Không thấy mã trong nội dung dán.</span>}
                      {' · '}OA trong đường dẫn: <span className="font-mono">{maCach3.oaId ?? 'không có'}</span>
                      {oaIdLech && <span className="text-red-600 dark:text-red-400"> — KHÁC OA đang cấu hình ({ch.oa_id}); sẽ không đổi token</span>}
                      {maCach3.oaId && !oaIdLech && <span className="text-green-700 dark:text-green-300"> — đúng OA</span>}
                    </p>
                  )}
                </div>
                {loiCach3 && (
                  <Alert variant="destructive"><CircleAlert className="h-4 w-4" /><AlertDescription>{loiCach3}</AlertDescription></Alert>
                )}
                <Button onClick={doiMaCach3} disabled={!maCach3.code || oaIdLech || dangChay === 'doi_ma' || coBiMat === false}>
                  {dangChay === 'doi_ma' ? 'Đang đổi…' : 'Đổi mã lấy token'}
                </Button>
                {coBiMat === false && <p className="text-xs text-red-600 dark:text-red-400">Chưa nạp Secret Key — kiểm tra mục 1 trước.</p>}
              </div>

              <div className="text-sm text-muted-foreground grid gap-1 sm:grid-cols-2">
                <span>Lấy token lần đầu: {gio(token?.cap_luc)}</span>
                <span>Gia hạn gần nhất: {gio(token?.gia_han_luc)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">3. Gia hạn tự động</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Lịch chạy 6 tiếng một lần; chỉ gọi Zalo khi access token còn dưới 7 giờ. Refresh token của Zalo dùng được MỘT lần,
                mỗi lần gia hạn nhận cặp mới và ghi đè ngay xuống máy chủ. Lỗi 2 lần liên tiếp thì TCTH và quản trị nhận cảnh báo.
              </p>
              <div className="space-y-2">
                {(tq?.cron ?? []).map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-2 text-sm flex-wrap">
                    <span className="font-medium">Lịch gia hạn token <span className="text-xs text-muted-foreground font-mono">{c.schedule}</span></span>
                    <span className="flex items-center gap-2">
                      <Badge className={c.active ? 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}>{c.active ? 'Đang bật' : 'Đã tắt'}</Badge>
                      {c.last_status && <Badge className={c.last_status === 'succeeded' ? 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300'}>Lần cuối: {c.last_status === 'succeeded' ? 'OK' : 'Lỗi'}</Badge>}
                      {c.last_run && <span className="text-xs text-muted-foreground">{gio(c.last_run)}</span>}
                    </span>
                  </div>
                ))}
                {(tq?.cron ?? []).length === 0 && !loading && <p className="text-sm text-muted-foreground">Chưa đăng ký lịch gia hạn (migration chưa áp).</p>}
              </div>
              <Button variant="outline" onClick={giaHan} disabled={!token?.co_token || dangChay === 'gia_han'}>
                <RefreshCw className={`w-4 h-4 mr-1 ${dangChay === 'gia_han' ? 'animate-spin' : ''}`} /> Gia hạn ngay
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nhom" className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Nhóm GMF nhận tin</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-1 text-sm sm:grid-cols-2">
                <span>Tên nhóm: <strong>{ch.gmf_ten_nhom ?? '—'}</strong></span>
                <span>group_id: <span className="font-mono">{ch.gmf_group_id ?? 'chưa có'}</span></span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => luuNhom()} disabled={!token?.co_token || dangChay === 'luu_nhom'}>
                  <Users className="w-4 h-4 mr-1" /> Tìm và lưu nhóm «{ch.gmf_ten_nhom}»
                </Button>
                <Button variant="outline" onClick={lietKeNhom} disabled={!token?.co_token || dangChay === 'liet_ke_nhom'}>Liệt kê nhóm OA đang tham gia</Button>
              </div>
              {dsNhom && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2 pr-3 font-medium">Nhóm</th><th className="py-2 pr-3 font-medium">group_id</th><th className="py-2 font-medium"></th></tr></thead>
                    <tbody>
                      {dsNhom.map((n) => (
                        <tr key={n.group_id} className="border-b last:border-0">
                          <td className="py-2 pr-3">{n.group_name}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{n.group_id}</td>
                          <td className="py-2 text-right"><Button size="sm" variant={ch.gmf_group_id === n.group_id ? 'secondary' : 'outline'} onClick={() => luuNhom(n.group_name)}>{ch.gmf_group_id === n.group_id ? 'Đang dùng' : 'Dùng nhóm này'}</Button></td>
                        </tr>
                      ))}
                      {dsNhom.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">OA chưa tham gia nhóm nào — thêm OA vào nhóm trên Zalo trước.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Gửi tin thử vào nhóm</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={3} value={tinThu} onChange={(e) => setTinThu(e.target.value)} placeholder="Để trống để gửi tin thử mặc định «[Thử kết nối] BHY ONE đã nối được với nhóm Zalo…»" />
              <Button onClick={guiThu} disabled={!ch.gmf_group_id || dangChay === 'gui_thu'}><Send className="w-4 h-4 mr-1" /> Gửi tin thử</Button>
              <p className="text-xs text-muted-foreground">Không đưa tên khách hàng, số tài khoản hay dữ liệu tín dụng vào tin gửi qua Zalo.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Công tắc nghiệp vụ</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">Đẩy tin Sao Xứng Đáng vào nhóm</div>
                  <p className="text-xs text-muted-foreground">Bật sau khi mẫu tin đã được duyệt. Tắt là tin dừng ngay, không mất dữ liệu Sao.</p>
                </div>
                <Switch checked={batSao} onCheckedChange={(v) => doiCauHinh('bat_sao_xung_dang', v ? 'true' : 'false')} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tin-sao" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Đang chờ gửi</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{(hangDoi?.dem.cho ?? 0) + (hangDoi?.dem.dang_gui ?? 0)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Lỗi cần xử lý</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${(hangDoi?.dem.loi ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{hangDoi?.dem.loi ?? 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Đã gửi 7 ngày</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{hangDoi?.dem.da_gui_7_ngay ?? 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Đã gửi tháng này</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{hangDoi?.dem.da_gui_thang ?? 0}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Xem trước / gửi thử với phiếu thật</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Chọn một phiếu Sao gần đây để xem đúng chữ sẽ lên nhóm (lý do nguyên văn, tích lũy, mốc quà, link). «Gửi thử» đẩy thật vào nhóm — dùng khi cần cả chi nhánh nhìn mẫu.
              </p>
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-[260px]">
                  <Label>Phiếu</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={phieuChon} onChange={(e) => { setPhieuChon(e.target.value); setXemTruoc(null); }}>
                    {phieuGanNhat.map((p) => (
                      <option key={p.id} value={p.id}>{p.is_collective ? '👥 ' : ''}{p.name} — {p.department} · {p.stars} Sao · {new Date(p.created_at).toLocaleDateString('vi-VN')}</option>
                    ))}
                  </select>
                </div>
                <Button variant="outline" onClick={xemTruocPhieu} disabled={!phieuChon || dangChay === 'xem_truoc'}>Xem trước</Button>
                <Button onClick={guiThuPhieu} disabled={!phieuChon || !ch.gmf_group_id || dangChay === 'gui_phieu'}><Send className="w-4 h-4 mr-1" /> Gửi thử vào nhóm</Button>
              </div>
              {xemTruoc && (
                <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm font-sans">{xemTruoc}</pre>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Cách gom và soạn tin</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <div className="font-medium text-sm">Mỗi người nhận một tin riêng</div>
                  <p className="text-xs text-muted-foreground">Bật (GĐ chốt 12/09): phiếu của mỗi người đi một tin, tách bạch. Tắt: các phiếu cùng người tặng trong cửa sổ gom dồn vào một tin liệt kê.</p>
                </div>
                <Switch checked={(ch.che_do_gop ?? 'moi_nguoi_mot_tin') === 'moi_nguoi_mot_tin'} onCheckedChange={(v) => doiCauHinh('che_do_gop', v ? 'moi_nguoi_mot_tin' : 'gop_theo_nguoi_tang')} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Cửa sổ gom (phút)</Label><Input inputMode="numeric" value={caiDatTin.gom_phut ?? ''} onChange={(e) => setCaiDatTin({ ...caiDatTin, gom_phut: e.target.value.replace(/[^\d]/g, '') })} /></div>
                <div><Label>Tối đa phiếu liệt kê trong một tin</Label><Input inputMode="numeric" value={caiDatTin.toi_da_dong_mot_tin ?? ''} onChange={(e) => setCaiDatTin({ ...caiDatTin, toi_da_dong_mot_tin: e.target.value.replace(/[^\d]/g, '') })} /></div>
                <div><Label>Lý do tối đa (ký tự)</Label><Input inputMode="numeric" value={caiDatTin.ly_do_toi_da_ky_tu ?? ''} onChange={(e) => setCaiDatTin({ ...caiDatTin, ly_do_toi_da_ky_tu: e.target.value.replace(/[^\d]/g, '') })} /></div>
                <div><Label>Số lần thử lại khi lỗi</Label><Input inputMode="numeric" value={caiDatTin.so_lan_thu_toi_da ?? ''} onChange={(e) => setCaiDatTin({ ...caiDatTin, so_lan_thu_toi_da: e.target.value.replace(/[^\d]/g, '') })} /></div>
                <div className="sm:col-span-2"><Label>Dòng cuối tin (link về cổng)</Label><Input value={caiDatTin.link_chan_tin ?? ''} onChange={(e) => setCaiDatTin({ ...caiDatTin, link_chan_tin: e.target.value })} placeholder="bachungyenone.com/one/ghi-nhan/tong-hop" /></div>
              </div>
              <Button onClick={luuCaiDatTin} disabled={dangChay === 'cai_dat_tin'}>Lưu cài đặt tin</Button>
              <p className="text-xs text-muted-foreground">Tin chỉ đi khi công tắc «Đẩy tin Sao Xứng Đáng vào nhóm» (tab Nhóm & gửi thử) đang bật. Phiếu nhập bù không bao giờ lên nhóm. Lý do đưa nguyên văn — nhắc người tặng không ghi tên khách hàng, số tài khoản, số tiền.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base">Hàng đợi 40 phiếu gần nhất</CardTitle>
                {(hangDoi?.dem.loi ?? 0) > 0 && <Button size="sm" variant="outline" onClick={guiLaiTinLoi}><RefreshCw className="w-4 h-4 mr-1" /> Gửi lại {hangDoi!.dem.loi} tin lỗi</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-medium">Ghi phiếu lúc</th>
                      <th className="py-2 pr-3 font-medium">Người / tập thể</th>
                      <th className="py-2 pr-3 font-medium text-right">Sao</th>
                      <th className="py-2 pr-3 font-medium">Trạng thái</th>
                      <th className="py-2 pr-3 font-medium">Gửi lúc</th>
                      <th className="py-2 font-medium">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hangDoi?.dong ?? []).map((d) => (
                      <tr key={d.id} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{gio(d.tao_luc)}</td>
                        <td className="py-2 pr-3">{d.name ?? <span className="text-muted-foreground">(phiếu đã gỡ)</span>}{d.department ? <span className="text-xs text-muted-foreground"> · {d.department}</span> : null}</td>
                        <td className="py-2 pr-3 text-right">{d.stars ?? '—'}</td>
                        <td className="py-2 pr-3"><Badge className={MAU_TRANG_THAI[d.trang_thai] ?? ''}>{TEN_TRANG_THAI[d.trang_thai] ?? d.trang_thai}</Badge>{d.so_lan_thu > 0 && <span className="text-xs text-muted-foreground"> · thử {d.so_lan_thu}</span>}</td>
                        <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{d.gui_luc ? gio(d.gui_luc) : d.trang_thai === 'cho' ? `sẵn sàng ${gio(d.san_sang_luc)}` : '—'}</td>
                        <td className="py-2 text-xs max-w-[260px]">
                          {d.loi_gan_nhat && <div className="text-red-600 dark:text-red-400">{d.loi_gan_nhat}</div>}
                          {d.noi_dung && <details><summary className="cursor-pointer text-muted-foreground">Xem tin đã gửi</summary><pre className="whitespace-pre-wrap font-sans mt-1">{d.noi_dung}</pre></details>}
                        </td>
                      </tr>
                    ))}
                    {(hangDoi?.dong ?? []).length === 0 && !loading && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Chưa có phiếu nào vào hàng đợi (công tắc đang tắt hoặc chưa có phiếu mới).</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goi-cuoc" className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Gói OA đang dùng</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Số liệu điền sẵn lấy từ bảng giá dịch vụ OA của Zalo áp dụng {ch.goi_cuoc_bang_gia_ap_dung ? new Date(ch.goi_cuoc_bang_gia_ap_dung + 'T00:00:00').toLocaleDateString('vi-VN') : '01/06/2026'} (đã gồm VAT).
                Đối chiếu với hợp đồng thực rồi sửa nếu khác — cổng dùng để tính phí gói phân bổ mỗi tin và nhắc trước khi gói hết hạn.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-medium">Quyền lợi gói {ch.goi_cuoc_ten ?? 'Tăng trưởng'}</th>
                      <th className="py-2 pr-3 font-medium">Mức</th>
                      <th className="py-2 font-medium">Ý nghĩa với kênh Sao Xứng Đáng</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="py-2 pr-3">Phí gói</td><td className="py-2 pr-3 whitespace-nowrap">1.400.000đ/6 tháng · 2.500.000đ/năm</td><td className="py-2 text-muted-foreground">Mua kỳ năm rẻ hơn ~11%; không hoàn tiền khi bỏ giữa chừng.</td></tr>
                    <tr className="border-b"><td className="py-2 pr-3">Tin OA gửi vào nhóm</td><td className="py-2 pr-3 whitespace-nowrap">Miễn phí đến {mienPhiDen ? mienPhiDen.toLocaleDateString('vi-VN') : '31/12/2026'}</td><td className="py-2 text-muted-foreground">Toàn bộ tin Sao trong năm 2026 không phát sinh phí theo tin. Sau mốc này Zalo công bố đơn giá.</td></tr>
                    <tr className="border-b"><td className="py-2 pr-3">Nhóm GMF-100 kèm gói</td><td className="py-2 pr-3">{ch.goi_cuoc_nhom_gmf_kem_goi ?? '1'} nhóm</td><td className="py-2 text-muted-foreground">Nhóm «{ch.gmf_ten_nhom}» dùng suất này; nhóm thứ hai phải mua thêm (GMF-100: 75.000đ/tháng).</td></tr>
                    <tr className="border-b"><td className="py-2 pr-3">Ứng dụng được ủy quyền</td><td className="py-2 pr-3">{ch.goi_cuoc_app_uy_quyen ?? '1'} ứng dụng</td><td className="py-2 text-red-700 dark:text-red-300">Chỉ một app — ai ủy quyền OA cho app khác là BHY ONE mất token ngay. Không cấp quyền cho công cụ bên thứ ba.</td></tr>
                    <tr className="border-b"><td className="py-2 pr-3">API rate limit</td><td className="py-2 pr-3">{ch.goi_cuoc_han_muc_phut ?? '100'} request/phút</td><td className="py-2 text-muted-foreground">Gộp nhiều sao vào một tin và giãn gửi là đủ; ~35 phiếu sao/tháng còn rất xa trần.</td></tr>
                    <tr className="border-b"><td className="py-2 pr-3">Tin tư vấn 1-1 ngoài 48h</td><td className="py-2 pr-3">500 tin/tháng, sau đó 55đ/tin</td><td className="py-2 text-muted-foreground">Không liên quan tin nhóm — chỉ tính khi OA chat riêng với người dùng.</td></tr>
                    <tr><td className="py-2 pr-3">Tài khoản nhân viên OA</td><td className="py-2 pr-3">{ch.goi_cuoc_nhan_su ?? '15'}</td><td className="py-2 text-muted-foreground">Đủ cho TCTH + Ban Giám đốc quản trị OA.</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Tên gói</Label><Input value={goiCuoc.goi_cuoc_ten ?? ''} onChange={(e) => setGoiCuoc({ ...goiCuoc, goi_cuoc_ten: e.target.value })} /></div>
                <div><Label>Kỳ hạn đang mua</Label><Input value={goiCuoc.goi_cuoc_ky_han ?? ''} onChange={(e) => setGoiCuoc({ ...goiCuoc, goi_cuoc_ky_han: e.target.value })} placeholder="6 tháng / 1 năm" /></div>
                <div><Label>Phí quy ra mỗi tháng (đ, gồm VAT)</Label><Input inputMode="numeric" value={goiCuoc.goi_cuoc_phi_thang ?? ''} onChange={(e) => setGoiCuoc({ ...goiCuoc, goi_cuoc_phi_thang: e.target.value.replace(/[^\d]/g, '') })} placeholder="233000 (6 tháng) · 208000 (năm)" /></div>
                <div><Label>Hạn mức tin vào nhóm/tháng (bảng giá không đặt trần — để trống)</Label><Input inputMode="numeric" value={goiCuoc.goi_cuoc_han_muc_tin_thang ?? ''} onChange={(e) => setGoiCuoc({ ...goiCuoc, goi_cuoc_han_muc_tin_thang: e.target.value.replace(/[^\d]/g, '') })} /></div>
                <div><Label>Giới hạn request/phút</Label><Input inputMode="numeric" value={goiCuoc.goi_cuoc_han_muc_phut ?? ''} onChange={(e) => setGoiCuoc({ ...goiCuoc, goi_cuoc_han_muc_phut: e.target.value.replace(/[^\d]/g, '') })} /></div>
                <div><Label>Tin vào nhóm miễn phí đến</Label><Input type="date" value={goiCuoc.goi_cuoc_tin_nhom_mien_phi_den ?? ''} onChange={(e) => setGoiCuoc({ ...goiCuoc, goi_cuoc_tin_nhom_mien_phi_den: e.target.value })} /></div>
                <div><Label>Ngày hết hạn gói</Label><Input type="date" value={goiCuoc.goi_cuoc_het_han ?? ''} onChange={(e) => setGoiCuoc({ ...goiCuoc, goi_cuoc_het_han: e.target.value })} /></div>
              </div>
              <Button onClick={luuGoiCuoc} disabled={dangChay === 'goi_cuoc'}>Lưu gói cước</Button>
              {conNgayGoi !== null && (
                <p className={`text-sm ${conNgayGoi <= 15 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                  {conNgayGoi < 0 ? `Gói đã hết hạn ${-conNgayGoi} ngày — OA bị hạ về gói Cơ bản, mất quyền tích hợp API.` : `Gói còn ${conNgayGoi} ngày. Hết hạn mà không gia hạn là OA về gói Cơ bản và API ngừng.`}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Tin đã gửi theo tháng</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-medium">Tháng</th>
                      <th className="py-2 pr-3 font-medium text-right">Gửi thành công</th>
                      <th className="py-2 pr-3 font-medium text-right">Lỗi</th>
                      <th className="py-2 pr-3 font-medium text-right">% hạn mức</th>
                      <th className="py-2 font-medium text-right">Phí gói phân bổ/tin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tq?.theo_thang ?? []).map((t) => {
                      const pt = phiMoiTin(phiThang, t.thanh_cong);
                      return (
                        <tr key={t.thang} className="border-b last:border-0">
                          <td className="py-2 pr-3">{t.thang.split('-').reverse().join('/')}</td>
                          <td className="py-2 pr-3 text-right font-medium">{t.thanh_cong}</td>
                          <td className={`py-2 pr-3 text-right ${t.loi > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{t.loi}</td>
                          <td className="py-2 pr-3 text-right">{hanMucThang ? `${Math.round((t.thanh_cong / hanMucThang) * 100)}%` : '—'}</td>
                          <td className="py-2 text-right">{pt ? dinhDangTien(pt) : '—'}</td>
                        </tr>
                      );
                    })}
                    {(tq?.theo_thang ?? []).length === 0 && !loading && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Chưa gửi tin nào.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Phí gói phân bổ/tin = phí gói tháng chia cho số tin gửi thành công — Zalo chưa thu theo tin vào nhóm (miễn phí tới {mienPhiDen ? mienPhiDen.toLocaleDateString('vi-VN') : '31/12/2026'}), con số này cho biết gói đang được dùng đáng tiền hay không.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nhat-ky">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">40 lần gọi Zalo gần nhất</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-medium">Thời gian</th>
                      <th className="py-2 pr-3 font-medium">Việc</th>
                      <th className="py-2 pr-3 font-medium">Kết quả</th>
                      <th className="py-2 font-medium">Thông điệp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tq?.nhat_ky ?? []).map((r) => (
                      <tr key={r.id} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{gio(r.tao_luc)}</td>
                        <td className="py-2 pr-3">{TEN_LOAI_NHAT_KY[r.loai] ?? r.loai}</td>
                        <td className="py-2 pr-3">
                          <Badge className={r.thanh_cong ? 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300'}>{r.thanh_cong ? 'OK' : 'Lỗi'}</Badge>
                        </td>
                        <td className="py-2 text-xs">
                          <div>{r.thong_diep}</div>
                          {r.chi_tiet && Object.keys(r.chi_tiet).length > 0 && (
                            <div className="text-muted-foreground font-mono truncate max-w-[360px]" title={JSON.stringify(r.chi_tiet)}>{JSON.stringify(r.chi_tiet)}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(tq?.nhat_ky ?? []).length === 0 && !loading && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Chưa có lần gọi nào.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * TAB 4 — CÁN BỘ VÀ PHÁT HÀNH THẺ.
 *
 * Mỗi dòng là một hồ sơ danh thiếp (nc_staff). Phòng TCTH: tạo từ hồ sơ nhân
 * sự 343 hoặc nhập tay (nhân sự thuê ngoài không có hồ sơ 343), gán đơn vị +
 * chức danh đối ngoại, duyệt, phát hành / thu hồi, xuất QR. Mọi ràng buộc
 * (chức danh phải duyệt, thuê ngoài không email vietinbank…) do CSDL chặn —
 * màn này chỉ hiện lỗi cho dễ hiểu.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Ban, Download, Eye, Loader2, Pencil, Plus, QrCode, Send, ShieldCheck, TriangleAlert, UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  useCanBoDanhThiep, useCauHinhDanhThiep, useChucDanh, useChucDanhRieng, useDonVi, useLamTuoiDanhThiep,
} from '@/hooks/useDanhThiep';
import { db, goiRpc } from '@/lib/danhThiep/db';
import {
  CAC_LOAI_NHAN_SU, TEN_LOAI_NHAN_SU, TEN_MAU_THE, banDichTen, mauTheTheoLoai,
  type CanBo, type ChucDanh, type LoaiNhanSu, type TrangThaiDuyet,
} from '@/lib/danhThiep/kieu';
import { NHAN_NGAN, ngonNguThieu } from '@/lib/danhThiep/ngonNgu';
import { slugHopLe, slugTuTen } from '@/lib/danhThiep/slug';
import { taiTepVeMay, taoQrPng, taoQrSvg } from '@/lib/danhThiep/qr';
import { dongCsv } from '@/lib/xuatCsv';
import { khopTimKiem } from '@/lib/vietnamese';
import { HuyHieuTrangThai } from './HuyHieuTrangThai';
import { XemTruocThe } from './XemTruocThe';

interface HoSo343 {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  employee_code: string | null;
  position: string | null;
}

interface FormCanBo {
  id: string | null;
  profile_id: string | null;
  user_id: string | null;
  employee_code: string;
  full_name: string;
  name_zh: string;
  name_ko: string;
  name_ja: string;
  employment_type: LoaiNhanSu;
  org_unit_code: string;
  internal_title_id: string;
  external_title_id: string;
  email: string;
  phone_mobile: string;
  phone_office: string;
  phone_office_public: boolean;
  slug: string;
  tuDatSlug: boolean;
  note_internal: string;
}

const FORM_TRONG: FormCanBo = {
  id: null, profile_id: null, user_id: null, employee_code: '', full_name: '', name_zh: '', name_ko: '', name_ja: '',
  employment_type: 'bien_che', org_unit_code: '', internal_title_id: '', external_title_id: '',
  email: '', phone_mobile: '', phone_office: '', phone_office_public: false, slug: '', tuDatSlug: false, note_internal: '',
};

type LocThe = 'all' | 'chua_duyet' | 'da_duyet_chua_phat' | 'dang_hoat_dong' | 'thu_hoi';

function ngayVn(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Cảnh báo trên từng dòng (Mục 6 Tab 4). */
function canhBao(cb: CanBo, chucDanh: Map<string, ChucDanh>, hanRieng: Map<string, string | null>): string[] {
  const ra: string[] = [];
  const cd = cb.external_title_id ? chucDanh.get(cb.external_title_id) : undefined;
  if (!cb.external_title_id && !cb.custom_title_id) ra.push('Chưa có chức danh đối ngoại');
  if (cd) {
    if (cd.status !== 'approved') ra.push('Chức danh đối ngoại chưa duyệt');
    const thieu = ngonNguThieu(banDichTen(cd));
    if (thieu.length) ra.push(`Chức danh thiếu bản dịch ${thieu.map((l) => NHAN_NGAN[l]).join(', ')}`);
  }
  if (!cb.photo_url) ra.push('Chưa có ảnh');
  if (!cb.phone_mobile) ra.push('Chưa có số di động');
  if (cb.custom_title_id && hanRieng.has(cb.custom_title_id)) {
    const han = hanRieng.get(cb.custom_title_id);
    if (han) {
      const conLai = Math.ceil((new Date(han).getTime() - Date.now()) / 86400000);
      if (conLai <= 30) ra.push(conLai < 0 ? 'Chức danh riêng đã hết hạn' : `Chức danh riêng hết hạn sau ${conLai} ngày`);
    }
  }
  if (cb.employment_type === 'thue_ngoai' && cb.wallet_override) ra.push('Thuê ngoài đang bật Wallet (Giám đốc duyệt)');
  return ra;
}

export function TabCanBo() {
  const { roles, user } = useAuth();
  const laQuanTri = roles.includes('tcth_admin') || roles.includes('system_admin');
  const laGiamDoc = roles.includes('bgd') || roles.includes('system_admin');
  const { data: ds = [], isLoading } = useCanBoDanhThiep();
  const { data: donVi = [] } = useDonVi();
  const { data: chucDanh = [] } = useChucDanh();
  const { data: rieng = [] } = useChucDanhRieng();
  const { data: cauHinh = {} } = useCauHinhDanhThiep();
  const lamTuoi = useLamTuoiDanhThiep();

  const [tim, setTim] = useState('');
  const [locDonVi, setLocDonVi] = useState('all');
  const [locLoai, setLocLoai] = useState<'all' | LoaiNhanSu>('all');
  const [locThe, setLocThe] = useState<LocThe>('all');
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormCanBo | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [xemTruoc, setXemTruoc] = useState<string | null>(null);
  const [thuHoi, setThuHoi] = useState<CanBo | null>(null);
  const [lyDoThuHoi, setLyDoThuHoi] = useState('');
  const [dangXuLy, setDangXuLy] = useState<string | null>(null);
  const [hoSo, setHoSo] = useState<HoSo343[] | null>(null);
  const [timHoSo, setTimHoSo] = useState('');
  const [moChonHoSo, setMoChonHoSo] = useState(false);

  const chucDanhMap = useMemo(() => new Map(chucDanh.map((c) => [c.id, c])), [chucDanh]);
  const donViMap = useMemo(() => new Map(donVi.map((d) => [d.code, d])), [donVi]);
  const hanRieng = useMemo(() => new Map(rieng.filter((r) => r.status === 'approved').map((r) => [r.id, r.expires_on])), [rieng]);
  const daCoProfile = useMemo(() => new Set(ds.map((c) => c.profile_id).filter(Boolean)), [ds]);
  const logoBat = cauHinh.logo_enabled !== false;
  const baseUrl = typeof cauHinh.card_base_url === 'string' ? cauHinh.card_base_url : 'https://bachungyenone.com/card/';

  const daLoc = useMemo(() => ds.filter((c) => {
    if (locDonVi !== 'all' && c.org_unit_code !== locDonVi) return false;
    if (locLoai !== 'all' && c.employment_type !== locLoai) return false;
    if (locThe === 'chua_duyet' && c.status === 'approved') return false;
    if (locThe === 'da_duyet_chua_phat' && !(c.status === 'approved' && !c.card_enabled && !c.revoked_at)) return false;
    if (locThe === 'dang_hoat_dong' && !(c.card_enabled && !c.revoked_at)) return false;
    if (locThe === 'thu_hoi' && !c.revoked_at) return false;
    if (tim && !khopTimKiem(`${c.full_name} ${c.employee_code ?? ''} ${c.email ?? ''} ${c.slug}`, tim)) return false;
    return true;
  }), [ds, locDonVi, locLoai, locThe, tim]);

  const chucDanhDoiNgoai = (loai: LoaiNhanSu) =>
    chucDanh.filter((c) => c.scope === 'external' && c.status !== 'retired' && c.status !== 'rejected' && c.allowed_employment.includes(loai));
  const chucDanhNoiBo = chucDanh.filter((c) => c.scope === 'internal' && c.status !== 'retired');

  // ---- Tạo / sửa -----------------------------------------------------------
  const moThemTay = () => setForm({ ...FORM_TRONG, org_unit_code: donVi[0]?.code ?? '' });
  const moChonTuHoSo = async () => {
    setMoChonHoSo(true);
    if (hoSo) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email, phone, avatar_url, employee_code, position')
      .eq('status', 'active')
      .order('full_name');
    if (error) { toast.error(`Không đọc được hồ sơ nhân sự: ${error.message}`); setMoChonHoSo(false); return; }
    setHoSo((data ?? []) as HoSo343[]);
  };
  const chonHoSo = (h: HoSo343) => {
    setMoChonHoSo(false);
    setForm({
      ...FORM_TRONG, profile_id: h.id, user_id: h.user_id, employee_code: h.employee_code ?? '', full_name: h.full_name,
      email: h.email ?? '', phone_mobile: h.phone ?? '', org_unit_code: donVi[0]?.code ?? '', note_internal: h.position ? `Chức danh 343: ${h.position}` : '',
    });
  };
  const moSua = (c: CanBo) => setForm({
    id: c.id, profile_id: c.profile_id, user_id: c.user_id, employee_code: c.employee_code ?? '', full_name: c.full_name,
    name_zh: c.name_zh ?? '', name_ko: c.name_ko ?? '', name_ja: c.name_ja ?? '', employment_type: c.employment_type,
    org_unit_code: c.org_unit_code, internal_title_id: c.internal_title_id ?? '', external_title_id: c.external_title_id ?? '',
    email: c.email ?? '', phone_mobile: c.phone_mobile ?? '', phone_office: c.phone_office ?? '', phone_office_public: c.phone_office_public,
    slug: c.slug, tuDatSlug: true, note_internal: c.note_internal ?? '',
  });

  const luu = async () => {
    if (!form) return;
    if (form.full_name.trim().length < 2) { toast.error('Thiếu họ tên'); return; }
    if (!form.org_unit_code) { toast.error('Chọn đơn vị'); return; }
    const slug = form.tuDatSlug ? form.slug.trim().toLowerCase() : '';
    if (slug && !slugHopLe(slug)) { toast.error('Slug chỉ gồm chữ thường không dấu, số, gạch ngang (3–80 ký tự)'); return; }
    setDangLuu(true);
    const c = (s: string) => (s.trim() ? s.trim() : null);
    const dong: Record<string, unknown> = {
      profile_id: form.profile_id, user_id: form.user_id, employee_code: c(form.employee_code), full_name: form.full_name.trim(),
      name_zh: c(form.name_zh), name_ko: c(form.name_ko), name_ja: c(form.name_ja), employment_type: form.employment_type,
      org_unit_code: form.org_unit_code, internal_title_id: form.internal_title_id || null, external_title_id: form.external_title_id || null,
      email: c(form.email), phone_mobile: c(form.phone_mobile), phone_office: c(form.phone_office), phone_office_public: form.phone_office_public,
      note_internal: c(form.note_internal),
    };
    if (form.id) { if (slug) dong.slug = slug; } else { dong.slug = slug || null; }
    // Khi TẠO MỚI, để trống slug thì CSDL tự sinh (trigger); không gửi cột slug
    if (!form.id && !slug) delete dong.slug;
    const { error } = form.id
      ? await db.from('nc_staff').update(dong).eq('id', form.id)
      : await db.from('nc_staff').insert(dong);
    setDangLuu(false);
    if (error) { toast.error(`Không lưu được: ${error.message}`); return; }
    toast.success(form.id ? 'Đã lưu hồ sơ danh thiếp' : 'Đã tạo hồ sơ danh thiếp (nháp)');
    setForm(null);
    lamTuoi();
  };

  // ---- Duyệt / phát hành / thu hồi ----------------------------------------
  const duyet = async (c: CanBo) => {
    setDangXuLy(c.id);
    const { error } = await db.from('nc_staff')
      .update({ status: 'approved', approved_by: user?.id ?? null, approved_at: new Date().toISOString() })
      .eq('id', c.id);
    setDangXuLy(null);
    if (error) { toast.error(`Không duyệt được: ${error.message}`); return; }
    toast.success(`Đã duyệt hồ sơ «${c.full_name}»`);
    lamTuoi();
  };
  const phatHanh = async (c: CanBo) => {
    setDangXuLy(c.id);
    try {
      await goiRpc('nc_phat_hanh_the', { _staff_id: c.id });
      toast.success(`Đã phát hành thẻ cho «${c.full_name}» — ${baseUrl}${c.slug}`);
      lamTuoi();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDangXuLy(null);
    }
  };
  const thuHoiThe = async () => {
    if (!thuHoi) return;
    setDangXuLy(thuHoi.id);
    try {
      await goiRpc('nc_thu_hoi_the', { _staff_id: thuHoi.id, _ly_do: lyDoThuHoi.trim() || null });
      toast.success(`Đã thu hồi thẻ của «${thuHoi.full_name}» — QR/NFC cũ nay hiện trang «đã chuyển công tác»`);
      setThuHoi(null);
      setLyDoThuHoi('');
      lamTuoi();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDangXuLy(null);
    }
  };
  const batWallet = async (c: CanBo, bat: boolean) => {
    const { error } = await db.from('nc_staff').update({ wallet_override: bat }).eq('id', c.id);
    if (error) { toast.error(error.message); return; }
    toast.success(bat ? 'Đã cho phép thẻ Wallet (Giám đốc duyệt riêng)' : 'Đã tắt Wallet');
    lamTuoi();
  };

  // ---- Xuất --------------------------------------------------------------
  const coLogo = (c: CanBo) => logoBat && mauTheTheoLoai(c.employment_type) === 'TPL_OFFICIAL';
  const taiQr = async (c: CanBo, dinhDang: 'png' | 'svg') => {
    try {
      const url = `${baseUrl}${c.slug}?c=qr`;
      const ten = `${(c.full_name_latin ?? c.slug).replace(/[^A-Za-z0-9]+/g, '')}-QR`;
      if (dinhDang === 'png') taiTepVeMay(await taoQrPng(url, { logo: coLogo(c) }), `${ten}.png`);
      else taiTepVeMay(new Blob([await taoQrSvg(url, { logo: coLogo(c) })], { type: 'image/svg+xml' }), `${ten}.svg`);
    } catch (e) {
      toast.error(`Không sinh được QR: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const dangChon = () => ds.filter((c) => chon.has(c.id));
  const xuatZipQr = async () => {
    const ds2 = dangChon().filter((c) => c.card_enabled && !c.revoked_at);
    if (!ds2.length) { toast.error('Chọn ít nhất một cán bộ đã phát hành thẻ'); return; }
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    for (const c of ds2) {
      const url = `${baseUrl}${c.slug}?c=qr`;
      const ten = (c.full_name_latin ?? c.slug).replace(/[^A-Za-z0-9]+/g, '');
      zip.file(`${ten}/${ten}-QR.png`, await taoQrPng(url, { logo: coLogo(c) }));
      zip.file(`${ten}/${ten}-QR.svg`, await taoQrSvg(url, { logo: coLogo(c) }));
    }
    taiTepVeMay(await zip.generateAsync({ type: 'blob' }), `QR-danh-thiep-${new Date().toISOString().slice(0, 10)}.zip`);
    toast.success(`Đã xuất QR cho ${ds2.length} cán bộ`);
  };
  const xuatCsvNhaIn = () => {
    const ds2 = dangChon();
    if (!ds2.length) { toast.error('Chọn ít nhất một cán bộ'); return; }
    const dong = [dongCsv(['Họ tên', 'Tên không dấu', 'Tên Hán tự', 'Chức danh VI', 'Chức danh EN', 'Chức danh ZH', 'Đơn vị VI', 'Đơn vị EN', 'Di động', 'Email', 'URL thẻ'])];
    for (const c of ds2) {
      const cd = c.external_title_id ? chucDanhMap.get(c.external_title_id) : undefined;
      const dv = donViMap.get(c.org_unit_code);
      dong.push(dongCsv([
        c.full_name, c.full_name_latin ?? '', c.name_zh ?? '', cd?.name_vi ?? '', cd?.name_en ?? '', cd?.name_zh_hans ?? '',
        dv?.name_vi ?? '', dv?.name_en ?? '', c.phone_mobile ?? '', c.email ?? '', `${baseUrl}${c.slug}`,
      ]));
    }
    taiTepVeMay(new Blob(['﻿' + dong.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `danh-thiep-nha-in-${new Date().toISOString().slice(0, 10)}.csv`);
  };
  const phatHanhHangLoat = async () => {
    const ds2 = dangChon().filter((c) => c.status === 'approved' && !c.card_enabled && !c.revoked_at);
    if (!ds2.length) { toast.error('Không có cán bộ nào đã duyệt mà chưa phát hành trong lựa chọn'); return; }
    let ok = 0; const loi: string[] = [];
    for (const c of ds2) {
      try { await goiRpc('nc_phat_hanh_the', { _staff_id: c.id }); ok++; } catch (e) { loi.push(`${c.full_name}: ${e instanceof Error ? e.message : String(e)}`); }
    }
    toast[loi.length ? 'warning' : 'success'](`Đã phát hành ${ok}/${ds2.length}${loi.length ? ` — lỗi: ${loi.join('; ')}` : ''}`);
    lamTuoi();
  };

  const tatCaDangLoc = daLoc.length > 0 && daLoc.every((c) => chon.has(c.id));
  const hoSoLoc = (hoSo ?? []).filter((h) => !daCoProfile.has(h.id) && (!timHoSo || khopTimKiem(`${h.full_name} ${h.employee_code ?? ''} ${h.position ?? ''}`, timHoSo)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <Label htmlFor="cb-tim" className="text-xs">Tìm</Label>
          <Input id="cb-tim" placeholder="tên, mã CB, email, slug…" value={tim} onChange={(e) => setTim(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Đơn vị</Label>
          <Select value={locDonVi} onValueChange={setLocDonVi}>
            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {donVi.map((d) => <SelectItem key={d.code} value={d.code}>{d.name_vi}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Loại nhân sự</Label>
          <Select value={locLoai} onValueChange={(v) => setLocLoai(v as typeof locLoai)}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {CAC_LOAI_NHAN_SU.map((l) => <SelectItem key={l} value={l}>{TEN_LOAI_NHAN_SU[l]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Trạng thái thẻ</Label>
          <Select value={locThe} onValueChange={(v) => setLocThe(v as LocThe)}>
            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="chua_duyet">Hồ sơ chưa duyệt</SelectItem>
              <SelectItem value="da_duyet_chua_phat">Đã duyệt, chưa phát hành</SelectItem>
              <SelectItem value="dang_hoat_dong">Thẻ đang hoạt động</SelectItem>
              <SelectItem value="thu_hoi">Đã thu hồi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {laQuanTri && (
          <>
            <Button variant="outline" onClick={moChonTuHoSo}><UserPlus className="mr-1.5 h-4 w-4" /> Tạo từ hồ sơ 343</Button>
            <Button onClick={moThemTay}><Plus className="mr-1.5 h-4 w-4" /> Nhập tay</Button>
          </>
        )}
      </div>

      {laQuanTri && chon.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2 text-sm">
          <span className="font-medium">Đã chọn {chon.size}</span>
          <Button size="sm" variant="outline" onClick={phatHanhHangLoat}><Send className="mr-1 h-4 w-4" /> Phát hành</Button>
          <Button size="sm" variant="outline" onClick={xuatZipQr}><QrCode className="mr-1 h-4 w-4" /> Xuất QR (ZIP PNG+SVG)</Button>
          <Button size="sm" variant="outline" onClick={xuatCsvNhaIn}><Download className="mr-1 h-4 w-4" /> CSV cho nhà in</Button>
          <Button size="sm" variant="ghost" onClick={() => setChon(new Set())}>Bỏ chọn</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox checked={tatCaDangLoc} aria-label="Chọn tất cả"
                  onCheckedChange={(v) => setChon(v === true ? new Set(daLoc.map((c) => c.id)) : new Set())} />
              </TableHead>
              <TableHead>Cán bộ</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead>Chức danh đối ngoại</TableHead>
              <TableHead>Loại / mẫu</TableHead>
              <TableHead>Hồ sơ</TableHead>
              <TableHead>Thẻ</TableHead>
              <TableHead>Cảnh báo</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Đang tải…</TableCell></TableRow>}
            {!isLoading && daLoc.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Chưa có hồ sơ danh thiếp nào khớp bộ lọc.</TableCell></TableRow>
            )}
            {daLoc.map((c) => {
              const cd = c.external_title_id ? chucDanhMap.get(c.external_title_id) : undefined;
              const cb = canhBao(c, chucDanhMap, hanRieng);
              const hoatDong = c.card_enabled && !c.revoked_at;
              return (
                <TableRow key={c.id} className={c.revoked_at ? 'opacity-70' : undefined}>
                  <TableCell>
                    <Checkbox checked={chon.has(c.id)} aria-label={`Chọn ${c.full_name}`}
                      onCheckedChange={(v) => setChon((s) => { const n = new Set(s); if (v === true) n.add(c.id); else n.delete(c.id); return n; })} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">{c.employee_code ?? '—'} · <span className="font-mono">{c.slug}</span></div>
                  </TableCell>
                  <TableCell className="text-sm">{donViMap.get(c.org_unit_code)?.name_vi ?? c.org_unit_code}</TableCell>
                  <TableCell className="text-sm">
                    {c.custom_title_id && <Badge variant="outline" className="mr-1 border-[#A8763E] text-[#A8763E]">Riêng</Badge>}
                    {cd ? cd.name_vi : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {TEN_LOAI_NHAN_SU[c.employment_type]}
                    <div className="text-muted-foreground">{TEN_MAU_THE[mauTheTheoLoai(c.employment_type)]}</div>
                  </TableCell>
                  <TableCell><HuyHieuTrangThai tt={c.status} /></TableCell>
                  <TableCell className="text-xs">
                    {c.revoked_at ? <Badge variant="outline" className="border-red-300 text-red-700">Thu hồi {ngayVn(c.revoked_at)}</Badge>
                      : hoatDong ? <Badge variant="outline" className="border-emerald-300 text-emerald-700">Đang hoạt động</Badge>
                      : <span className="text-muted-foreground">Chưa phát hành</span>}
                  </TableCell>
                  <TableCell className="max-w-[220px] text-xs">
                    {cb.length > 0 && (
                      <ul className="space-y-0.5 text-amber-700 dark:text-amber-400">
                        {cb.map((x) => <li key={x}><TriangleAlert className="mr-1 inline h-3 w-3" />{x}</li>)}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button size="icon" variant="ghost" title="Xem trước thẻ" onClick={() => setXemTruoc(c.slug)}><Eye className="h-4 w-4" /></Button>
                      {laQuanTri && <Button size="icon" variant="ghost" title="Sửa" onClick={() => moSua(c)}><Pencil className="h-4 w-4" /></Button>}
                      {laQuanTri && c.status !== 'approved' && (
                        <Button size="icon" variant="ghost" title="Duyệt hồ sơ" disabled={dangXuLy === c.id} onClick={() => duyet(c)}>
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {laQuanTri && c.status === 'approved' && !hoatDong && (
                        <Button size="icon" variant="ghost" title={c.revoked_at ? 'Cấp lại thẻ' : 'Phát hành thẻ'} disabled={dangXuLy === c.id} onClick={() => phatHanh(c)}>
                          {dangXuLy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-primary" />}
                        </Button>
                      )}
                      {hoatDong && (
                        <>
                          <Button size="icon" variant="ghost" title="Tải QR PNG 1024px" onClick={() => taiQr(c, 'png')}><QrCode className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Tải QR SVG" onClick={() => taiQr(c, 'svg')}><Download className="h-4 w-4" /></Button>
                          {laQuanTri && (
                            <Button size="icon" variant="ghost" title="Thu hồi thẻ" onClick={() => { setThuHoi(c); setLyDoThuHoi(''); }}>
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Hộp chọn hồ sơ 343 */}
      <Dialog open={moChonHoSo} onOpenChange={setMoChonHoSo}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo hồ sơ danh thiếp từ hồ sơ nhân sự 343</DialogTitle>
            <DialogDescription>Kéo sẵn tên, email, điện thoại; đơn vị và chức danh đối ngoại gán ở bước sau. Cán bộ đã có danh thiếp không hiện ở đây.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Tìm theo tên / mã / chức danh 343" value={timHoSo} onChange={(e) => setTimHoSo(e.target.value)} />
          <div className="max-h-[50vh] divide-y overflow-y-auto rounded-md border">
            {!hoSo && <p className="p-3 text-sm text-muted-foreground">Đang tải…</p>}
            {hoSo && hoSoLoc.length === 0 && <p className="p-3 text-sm text-muted-foreground">Không còn hồ sơ nào phù hợp.</p>}
            {hoSoLoc.slice(0, 200).map((h) => (
              <button key={h.id} type="button" className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => chonHoSo(h)}>
                <span><span className="font-medium">{h.full_name}</span> <span className="text-xs text-muted-foreground">{h.employee_code ?? ''}</span></span>
                <span className="truncate text-xs text-muted-foreground">{h.position ?? ''}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Form tạo / sửa */}
      <Dialog open={!!form} onOpenChange={(o) => { if (!o) setForm(null); }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Sửa hồ sơ danh thiếp' : 'Hồ sơ danh thiếp mới'}</DialogTitle>
            <DialogDescription>
              Thẻ được GHÉP từ tên riêng + từ điển: không gõ tên ngân hàng, tên phòng hay chức danh nước ngoài ở đây.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="cb-ten">Họ tên (tiếng Việt có dấu) *</Label>
                  <Input id="cb-ten" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cb-zh">Tên Hán tự (cán bộ xác nhận mặt chữ)</Label>
                  <Input id="cb-zh" lang="zh" value={form.name_zh} onChange={(e) => setForm({ ...form, name_zh: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cb-ko">Tên Hangul</Label>
                  <Input id="cb-ko" lang="ko" value={form.name_ko} onChange={(e) => setForm({ ...form, name_ko: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cb-ja">Tên Katakana</Label>
                  <Input id="cb-ja" lang="ja" value={form.name_ja} onChange={(e) => setForm({ ...form, name_ja: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cb-ma">Mã cán bộ</Label>
                  <Input id="cb-ma" value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} />
                </div>
                <div>
                  <Label>Loại nhân sự *</Label>
                  <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v as LoaiNhanSu, external_title_id: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CAC_LOAI_NHAN_SU.map((l) => <SelectItem key={l} value={l}>{TEN_LOAI_NHAN_SU[l]}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">Mẫu thẻ: {TEN_MAU_THE[mauTheTheoLoai(form.employment_type)]}</p>
                </div>
                <div>
                  <Label>Đơn vị *</Label>
                  <Select value={form.org_unit_code} onValueChange={(v) => setForm({ ...form, org_unit_code: v })}>
                    <SelectTrigger><SelectValue placeholder="Chọn đơn vị" /></SelectTrigger>
                    <SelectContent>{donVi.map((d) => <SelectItem key={d.code} value={d.code}>{d.name_vi}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chức danh ĐỐI NGOẠI (lên thẻ)</Label>
                  <Select value={form.external_title_id || '__none'} onValueChange={(v) => setForm({ ...form, external_title_id: v === '__none' ? '' : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Chưa gán —</SelectItem>
                      {chucDanhDoiNgoai(form.employment_type).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name_vi}{c.name_en ? ` · ${c.name_en}` : ''}{c.status !== 'approved' ? ' (chưa duyệt)' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chức danh NỘI BỘ (không lên thẻ)</Label>
                  <Select value={form.internal_title_id || '__none'} onValueChange={(v) => setForm({ ...form, internal_title_id: v === '__none' ? '' : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Không —</SelectItem>
                      {chucDanhNoiBo.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_vi}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cb-email">Email</Label>
                  <Input id="cb-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  {form.employment_type !== 'bien_che' && form.employment_type !== 'hop_dong' && (
                    <p className="mt-1 text-xs text-amber-700">Nhóm này không được dùng email @vietinbank.vn trên thẻ.</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="cb-dd">Di động</Label>
                  <Input id="cb-dd" value={form.phone_mobile} onChange={(e) => setForm({ ...form, phone_mobile: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cb-cq">Điện thoại cơ quan</Label>
                  <Input id="cb-cq" value={form.phone_office} onChange={(e) => setForm({ ...form, phone_office: e.target.value })} />
                  <label className="mt-1 flex items-center gap-2 text-xs">
                    <Switch checked={form.phone_office_public} onCheckedChange={(v) => setForm({ ...form, phone_office_public: v })} /> Hiện số cơ quan trên thẻ
                  </label>
                </div>
                <div>
                  <Label htmlFor="cb-slug">Đường dẫn thẻ (slug)</Label>
                  <Input id="cb-slug" className="font-mono" value={form.tuDatSlug ? form.slug : slugTuTen(form.full_name)}
                    onChange={(e) => setForm({ ...form, slug: e.target.value, tuDatSlug: true })} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {baseUrl}<b>{form.tuDatSlug ? form.slug : slugTuTen(form.full_name)}</b>{!form.id && !form.tuDatSlug ? ' — trùng tên sẽ tự thêm 6 ký tự ngẫu nhiên' : ''}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="cb-note">Ghi chú nội bộ</Label>
                  <Textarea id="cb-note" rows={2} value={form.note_internal} onChange={(e) => setForm({ ...form, note_internal: e.target.value })} />
                </div>
              </div>
              {form.id && laGiamDoc && form.employment_type === 'thue_ngoai' && (() => {
                const hienTai = ds.find((x) => x.id === form.id);
                return hienTai ? (
                  <label className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
                    <Switch checked={hienTai.wallet_override} onCheckedChange={(v) => batWallet(hienTai, v)} />
                    <span>Cho phép thẻ Wallet cho nhân sự thuê ngoài này (quyết định riêng của Giám đốc — có ghi vết)</span>
                  </label>
                ) : null;
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Hủy</Button>
            <Button onClick={luu} disabled={dangLuu}>{dangLuu ? 'Đang lưu…' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Thu hồi */}
      <Dialog open={!!thuHoi} onOpenChange={(o) => { if (!o) setThuHoi(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thu hồi thẻ của «{thuHoi?.full_name}»</DialogTitle>
            <DialogDescription>
              Một thao tác: tắt thẻ, QR/NFC đã in chuyển sang trang «đã chuyển công tác» ngay lượt quét kế tiếp. Có thể cấp lại sau.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={2} placeholder="Lý do (chuyển công tác, nghỉ việc…)" value={lyDoThuHoi} onChange={(e) => setLyDoThuHoi(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setThuHoi(null)}>Hủy</Button>
            <Button variant="destructive" disabled={!!dangXuLy} onClick={thuHoiThe}>Thu hồi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <XemTruocThe slug={xemTruoc} onDong={() => setXemTruoc(null)} />
    </div>
  );
}

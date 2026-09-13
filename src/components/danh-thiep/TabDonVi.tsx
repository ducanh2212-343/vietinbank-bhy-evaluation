/**
 * TAB 1 — TỪ ĐIỂN ĐƠN VỊ: tên và địa chỉ 6 ngôn ngữ của Ngân hàng / Chi nhánh /
 * phòng / PGD. Mỗi dòng có «Xem trước thẻ» để thấy ngay chuỗi đơn vị hiện ra
 * sao trên thẻ của một cán bộ thuộc đơn vị đó.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, Pencil, Plus, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useDonVi, useLamTuoiDanhThiep } from '@/hooks/useDanhThiep';
import { db } from '@/lib/danhThiep/db';
import { banDichDiaChi, banDichTen, type DonVi, type PayloadThe } from '@/lib/danhThiep/kieu';
import { CAC_NGON_NGU, NHAN_NGAN, ngonNguThieu } from '@/lib/danhThiep/ngonNgu';
import { HuyHieuTrangThai } from './HuyHieuTrangThai';
import {
  GIA_TRI_6_TRONG, NhapSauNgonNgu, raCotDiaChi, raCotTen, tuCotDiaChi, tuCotTen, type GiaTri6,
} from './NhapSauNgonNgu';
import { XemTruocThe } from './XemTruocThe';

interface FormDonVi {
  id: string | null;
  code: string;
  parent: string;
  sort: number;
  ten: GiaTri6;
  diaChi: GiaTri6;
  mapUrl: string;
  phone: string;
}

/** Chuỗi đơn vị từ gốc tới đơn vị này — dùng cho xem trước mẫu. */
function chuoiDonVi(ds: DonVi[], code: string): DonVi[] {
  const theoMa = new Map(ds.map((d) => [d.code, d]));
  const ket: DonVi[] = [];
  let hienTai = theoMa.get(code);
  let bao = 0;
  while (hienTai && bao < 8) {
    ket.unshift(hienTai);
    hienTai = hienTai.parent_code ? theoMa.get(hienTai.parent_code) : undefined;
    bao++;
  }
  return ket;
}

/** Thẻ mẫu (tên giả định) để xem chuỗi đơn vị + địa chỉ hiện thế nào. */
function theMau(ds: DonVi[], d: DonVi): PayloadThe {
  const chuoi = chuoiDonVi(ds, d.code);
  const coDiaChi = [...chuoi].reverse().find((u) => u.addr_vi || u.addr_en);
  return {
    status: 'preview', slug: 'mau', card_url: 'https://bachungyenone.com/card/mau', template: 'TPL_OFFICIAL',
    employment_type: 'bien_che',
    name: { vi: 'Nguyễn Văn A', latin: 'Nguyen Van A', zh: '阮文A', ko: '응우옌 반 A', ja: 'グエン・ヴァン・A' },
    title: { vi: 'Chức danh mẫu', en: 'Sample title', zh_hans: '示例职务', zh_hant: '示例職務', ko: '예시 직함', ja: '役職（例）' },
    title_source: 'external',
    units: chuoi.map((u) => ({ code: u.code, name: banDichTen(u), addr: banDichDiaChi(u), map_url: u.map_url ?? undefined, phone: u.phone ?? undefined })),
    addr: coDiaChi ? banDichDiaChi(coDiaChi) : {},
    map_url: coDiaChi?.map_url ?? undefined,
    phone_mobile: '0900 000 000', email: 'a.nv@vietinbank.vn',
    logo: true, bank_line: true, channels: [], wallet: true, nfc: true,
  };
}

export function TabDonVi() {
  const { roles, user } = useAuth();
  const laQuanTri = roles.includes('tcth_admin') || roles.includes('system_admin');
  const { data: ds = [], isLoading } = useDonVi();
  const lamTuoi = useLamTuoiDanhThiep();
  const [form, setForm] = useState<FormDonVi | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [xemTruoc, setXemTruoc] = useState<PayloadThe | null>(null);

  // Sắp theo cây: gốc trước, con theo sort_order
  const theoCay = useMemo(() => {
    const con = new Map<string | null, DonVi[]>();
    for (const d of ds) {
      const k = d.parent_code ?? null;
      con.set(k, [...(con.get(k) ?? []), d]);
    }
    const ket: Array<{ d: DonVi; muc: number }> = [];
    const di = (cha: string | null, muc: number) => {
      for (const d of (con.get(cha) ?? []).sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))) {
        ket.push({ d, muc });
        di(d.code, muc + 1);
      }
    };
    di(null, 0);
    // Dòng mồ côi (cha không tồn tại) vẫn phải hiện để sửa
    const daCo = new Set(ket.map((x) => x.d.code));
    for (const d of ds) if (!daCo.has(d.code)) ket.push({ d, muc: 0 });
    return ket;
  }, [ds]);

  const moThem = () => setForm({ id: null, code: '', parent: 'CN_BHY', sort: 0, ten: { ...GIA_TRI_6_TRONG }, diaChi: { ...GIA_TRI_6_TRONG }, mapUrl: '', phone: '' });
  const moSua = (d: DonVi) => setForm({
    id: d.id, code: d.code, parent: d.parent_code ?? '', sort: d.sort_order, ten: tuCotTen(d), diaChi: tuCotDiaChi(d),
    mapUrl: d.map_url ?? '', phone: d.phone ?? '',
  });

  const luu = async () => {
    if (!form) return;
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9_]{2,40}$/.test(code)) { toast.error('Mã chỉ gồm chữ in hoa, số, gạch dưới (2–40 ký tự)'); return; }
    if (!form.ten.vi.trim() || !form.ten.en.trim()) { toast.error('Đơn vị phải có tên tiếng Việt và tiếng Anh'); return; }
    if (form.parent && form.parent === code) { toast.error('Đơn vị không thể là cha của chính nó'); return; }
    if (form.mapUrl && !/^https:\/\//.test(form.mapUrl.trim())) { toast.error('Link bản đồ phải bắt đầu bằng https://'); return; }
    setDangLuu(true);
    const dong = {
      code, parent_code: form.parent || null, sort_order: Number(form.sort) || 0,
      ...raCotTen(form.ten), ...raCotDiaChi(form.diaChi),
      map_url: form.mapUrl.trim() || null, phone: form.phone.trim() || null,
    };
    const { error } = form.id
      ? await db.from('nc_org_unit').update(dong).eq('id', form.id)
      : await db.from('nc_org_unit').insert(dong);
    setDangLuu(false);
    if (error) { toast.error(`Không lưu được: ${error.message}`); return; }
    toast.success(form.id ? 'Đã lưu đơn vị' : 'Đã thêm đơn vị (nháp)');
    setForm(null);
    lamTuoi();
  };

  const duyet = async (d: DonVi) => {
    const { error } = await db.from('nc_org_unit')
      .update({ status: 'approved', approved_by: user?.id ?? null, approved_at: new Date().toISOString() })
      .eq('id', d.id);
    if (error) { toast.error(`Không duyệt được: ${error.message}`); return; }
    toast.success(`Đã duyệt «${d.name_vi}»`);
    lamTuoi();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Sửa một dòng ở đây là mọi thẻ thuộc đơn vị đó đổi theo. Địa chỉ là thứ khách nước ngoài dùng để tìm đường — nhập đủ 6 ngôn ngữ cho PGD.
        </p>
        {laQuanTri && <Button onClick={moThem}><Plus className="mr-1.5 h-4 w-4" /> Thêm đơn vị</Button>}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              {CAC_NGON_NGU.map((l) => <TableHead key={l}>{NHAN_NGAN[l]}</TableHead>)}
              <TableHead>Địa chỉ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Đang tải…</TableCell></TableRow>}
            {!isLoading && ds.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Chưa có đơn vị nào — chạy dữ liệu mồi hoặc thêm tay.</TableCell></TableRow>
            )}
            {theoCay.map(({ d, muc }) => {
              const thieuTen = ngonNguThieu(banDichTen(d));
              const thieuDiaChi = ngonNguThieu(banDichDiaChi(d));
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs" style={{ paddingLeft: `${12 + muc * 16}px` }}>{d.code}</TableCell>
                  {CAC_NGON_NGU.map((l) => {
                    const v = d[`name_${l}` as const];
                    return (
                      <TableCell key={l} lang={l.replace('_', '-')} className="max-w-[170px] truncate text-sm" title={v ?? ''}>
                        {v || <span className="text-amber-600" title="Thiếu bản dịch"><TriangleAlert className="inline h-3.5 w-3.5" /></span>}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-xs text-muted-foreground">
                    {d.addr_vi
                      ? (thieuDiaChi.length ? `Thiếu ${thieuDiaChi.map((l) => NHAN_NGAN[l]).join(', ')}` : 'Đủ 6 ngôn ngữ')
                      : (d.parent_code ? 'Dùng địa chỉ đơn vị cha' : '—')}
                    {thieuTen.length > 0 && thieuTen.length < 6 && <span className="block text-amber-600">Tên thiếu {thieuTen.map((l) => NHAN_NGAN[l]).join(', ')}</span>}
                  </TableCell>
                  <TableCell><HuyHieuTrangThai tt={d.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Xem trước thẻ" onClick={() => setXemTruoc(theMau(ds, d))}><Eye className="h-4 w-4" /></Button>
                      {laQuanTri && <Button size="icon" variant="ghost" title="Sửa" onClick={() => moSua(d)}><Pencil className="h-4 w-4" /></Button>}
                      {laQuanTri && d.status !== 'approved' && (
                        <Button size="icon" variant="ghost" title="Duyệt" onClick={() => duyet(d)}><ShieldCheck className="h-4 w-4 text-emerald-600" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => { if (!o) setForm(null); }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Sửa đơn vị' : 'Thêm đơn vị'}</DialogTitle>
            <DialogDescription>Tiếng Việt và tiếng Anh bắt buộc; các ngôn ngữ khác thiếu thì thẻ tự rơi về tiếng Anh.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="dv-code">Mã *</Label>
                  <Input id="dv-code" value={form.code} disabled={!!form.id} placeholder="VD: PGD_VG" onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label>Thuộc đơn vị</Label>
                  <Select value={form.parent || '__none'} onValueChange={(v) => setForm({ ...form, parent: v === '__none' ? '' : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Gốc —</SelectItem>
                      {ds.filter((d) => d.code !== form.code).map((d) => <SelectItem key={d.code} value={d.code}>{d.code} · {d.name_vi}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dv-sort">Thứ tự</Label>
                  <Input id="dv-sort" type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
                </div>
              </div>
              <NhapSauNgonNgu nhan="Tên đơn vị" idPrefix="dv-ten" giaTri={form.ten} onChange={(ten) => setForm({ ...form, ten })} />
              <NhapSauNgonNgu nhan="Địa chỉ (để trống = dùng địa chỉ đơn vị cha)" idPrefix="dv-dc" batBuocVi={false} giaTri={form.diaChi} onChange={(diaChi) => setForm({ ...form, diaChi })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="dv-map">Link Google Maps</Label>
                  <Input id="dv-map" placeholder="https://maps.app.goo.gl/…" value={form.mapUrl} onChange={(e) => setForm({ ...form, mapUrl: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="dv-phone">Điện thoại đơn vị (hiện ở trang «đã chuyển công tác»)</Label>
                  <Input id="dv-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Hủy</Button>
            <Button onClick={luu} disabled={dangLuu}>{dangLuu ? 'Đang lưu…' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <XemTruocThe slug={null} payload={xemTruoc} tieuDe="Xem trước chuỗi đơn vị trên thẻ" onDong={() => setXemTruoc(null)} />
    </div>
  );
}

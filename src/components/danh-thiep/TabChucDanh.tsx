/**
 * TAB 2 — TỪ ĐIỂN CHỨC DANH (màn Phòng TCTH dùng nhiều nhất).
 *
 * Hai scope trong cùng một bảng: nội bộ (theo QĐ bổ nhiệm, KHÔNG bao giờ lên
 * thẻ) và đối ngoại (in trên thẻ). Chức danh vai trò thị trường
 * (requires_director_approval) chỉ Giám đốc duyệt. Chức danh đang có cán bộ
 * dùng thì không xóa được — chỉ thu hồi.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, ShieldCheck, Trash2, Wand2, Archive, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useChucDanh, useLamTuoiDanhThiep, useSoCanBoTheoChucDanh } from '@/hooks/useDanhThiep';
import { db } from '@/lib/danhThiep/db';
import {
  CAC_LOAI_NHAN_SU, TEN_LOAI_NHAN_SU, type ChucDanh, type LoaiNhanSu, type PhamViChucDanh, type TrangThaiDuyet, banDichTen,
} from '@/lib/danhThiep/kieu';
import { CAC_NGON_NGU, NHAN_NGAN, ngonNguThieu, type MaNgonNgu } from '@/lib/danhThiep/ngonNgu';
import { khopTimKiem } from '@/lib/vietnamese';
import { HuyHieuTrangThai } from './HuyHieuTrangThai';
import { GIA_TRI_6_TRONG, NhapSauNgonNgu, raCotTen, sinhPhonThe, tuCotTen, type GiaTri6 } from './NhapSauNgonNgu';

interface FormChucDanh {
  id: string | null;
  code: string;
  scope: PhamViChucDanh;
  ten: GiaTri6;
  allowed: LoaiNhanSu[];
  giamDocDuyet: boolean;
  ghiChu: string;
  hieuLucTu: string;
}

const FORM_TRONG: FormChucDanh = {
  id: null, code: '', scope: 'external', ten: { ...GIA_TRI_6_TRONG },
  allowed: ['bien_che', 'hop_dong'], giamDocDuyet: false, ghiChu: '', hieuLucTu: '',
};

const TEN_SCOPE: Record<PhamViChucDanh, string> = { internal: 'Nội bộ', external: 'Đối ngoại' };
const TEN_NGAN_LOAI: Record<LoaiNhanSu, string> = {
  bien_che: 'Biên chế', hop_dong: 'Hợp đồng', thue_ngoai: 'Thuê ngoài', ctv: 'CTV', thuc_tap: 'Thực tập',
};

export function TabChucDanh() {
  const { roles, user } = useAuth();
  const laGiamDoc = roles.includes('bgd') || roles.includes('system_admin');
  const laQuanTri = roles.includes('tcth_admin') || roles.includes('system_admin');
  const { data: ds = [], isLoading } = useChucDanh();
  const { data: soCanBo = {} } = useSoCanBoTheoChucDanh();
  const lamTuoi = useLamTuoiDanhThiep();

  const [locScope, setLocScope] = useState<'all' | PhamViChucDanh>('all');
  const [locLoai, setLocLoai] = useState<'all' | LoaiNhanSu>('all');
  const [locTrangThai, setLocTrangThai] = useState<'all' | TrangThaiDuyet>('all');
  const [tim, setTim] = useState('');
  const [form, setForm] = useState<FormChucDanh | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [xoa, setXoa] = useState<ChucDanh | null>(null);
  const [dangSinh, setDangSinh] = useState(false);

  const daLoc = useMemo(() => ds.filter((c) =>
    (locScope === 'all' || c.scope === locScope)
    && (locLoai === 'all' || c.allowed_employment.includes(locLoai))
    && (locTrangThai === 'all' || c.status === locTrangThai)
    && (!tim || khopTimKiem(`${c.code} ${c.name_vi} ${c.name_en ?? ''}`, tim)),
  ), [ds, locScope, locLoai, locTrangThai, tim]);

  const moThem = () => setForm({ ...FORM_TRONG, ten: { ...GIA_TRI_6_TRONG } });
  const moSua = (c: ChucDanh) => setForm({
    id: c.id, code: c.code, scope: c.scope, ten: tuCotTen(c), allowed: [...c.allowed_employment],
    giamDocDuyet: c.requires_director_approval, ghiChu: c.note_internal ?? '', hieuLucTu: c.effective_from ?? '',
  });

  const luu = async () => {
    if (!form) return;
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9_]{2,40}$/.test(code)) { toast.error('Mã chỉ gồm chữ in hoa, số, gạch dưới (2–40 ký tự)'); return; }
    if (!form.ten.vi.trim()) { toast.error('Thiếu tên tiếng Việt'); return; }
    if (form.scope === 'external' && !form.ten.en.trim()) { toast.error('Chức danh đối ngoại phải có tên tiếng Anh'); return; }
    if (!form.allowed.length) { toast.error('Chọn ít nhất một loại nhân sự được gán'); return; }
    setDangLuu(true);
    const dong = {
      code, scope: form.scope, ...raCotTen(form.ten), allowed_employment: form.allowed,
      requires_director_approval: form.giamDocDuyet, note_internal: form.ghiChu.trim() || null,
      effective_from: form.hieuLucTu || null,
    };
    const { error } = form.id
      ? await db.from('nc_title').update(dong).eq('id', form.id)
      : await db.from('nc_title').insert(dong);
    setDangLuu(false);
    if (error) { toast.error(`Không lưu được: ${error.message}`); return; }
    toast.success(form.id ? 'Đã lưu chức danh' : 'Đã thêm chức danh (trạng thái nháp)');
    setForm(null);
    lamTuoi();
  };

  const doiTrangThai = async (c: ChucDanh, tt: TrangThaiDuyet) => {
    const dong: Record<string, unknown> = { status: tt };
    if (tt === 'approved') { dong.approved_by = user?.id ?? null; dong.approved_at = new Date().toISOString(); }
    const { error } = await db.from('nc_title').update(dong).eq('id', c.id);
    if (error) { toast.error(`Không đổi được trạng thái: ${error.message}`); return; }
    toast.success(tt === 'approved' ? `Đã duyệt «${c.name_vi}»` : tt === 'retired' ? `Đã thu hồi «${c.name_vi}»` : 'Đã cập nhật');
    lamTuoi();
  };

  const xoaHan = async () => {
    if (!xoa) return;
    const { error } = await db.from('nc_title').delete().eq('id', xoa.id);
    setXoa(null);
    if (error) { toast.error(`Không xóa được: ${error.message}`); return; }
    toast.success('Đã xóa chức danh');
    lamTuoi();
  };

  // Sinh phồn thể hàng loạt cho những dòng có giản thể mà chưa có phồn thể
  const sinhHangLoat = async () => {
    const can = ds.filter((c) => c.name_zh_hans?.trim() && !c.name_zh_hant?.trim());
    if (!can.length) { toast.info('Mọi dòng có giản thể đều đã có phồn thể'); return; }
    setDangSinh(true);
    let ok = 0;
    for (const c of can) {
      try {
        const zh = await sinhPhonThe(c.name_zh_hans!);
        const { error } = await db.from('nc_title').update({ name_zh_hant: zh }).eq('id', c.id);
        if (!error) ok++;
      } catch { /* bỏ qua dòng lỗi */ }
    }
    setDangSinh(false);
    toast.success(`Đã sinh phồn thể (nháp) cho ${ok}/${can.length} chức danh — cần người rà soát xác nhận`);
    lamTuoi();
  };

  const duyetDuoc = (c: ChucDanh) => (c.requires_director_approval ? laGiamDoc : laQuanTri || laGiamDoc);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <Label htmlFor="cd-tim" className="text-xs">Tìm</Label>
          <Input id="cd-tim" placeholder="mã, tên VI/EN…" value={tim} onChange={(e) => setTim(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Scope</Label>
          <Select value={locScope} onValueChange={(v) => setLocScope(v as typeof locScope)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="external">Đối ngoại</SelectItem>
              <SelectItem value="internal">Nội bộ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Loại nhân sự</Label>
          <Select value={locLoai} onValueChange={(v) => setLocLoai(v as typeof locLoai)}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {CAC_LOAI_NHAN_SU.map((l) => <SelectItem key={l} value={l}>{TEN_NGAN_LOAI[l]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Trạng thái</Label>
          <Select value={locTrangThai} onValueChange={(v) => setLocTrangThai(v as typeof locTrangThai)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="draft">Nháp</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="retired">Đã thu hồi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {laQuanTri && (
          <>
            <Button variant="outline" onClick={sinhHangLoat} disabled={dangSinh}>
              {dangSinh ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
              Sinh phồn thể còn thiếu
            </Button>
            <Button onClick={moThem}><Plus className="mr-1.5 h-4 w-4" /> Thêm chức danh</Button>
          </>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Scope</TableHead>
              {CAC_NGON_NGU.map((l) => <TableHead key={l}>{NHAN_NGAN[l]}</TableHead>)}
              <TableHead>Loại NS</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Số CB</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Đang tải…</TableCell></TableRow>
            )}
            {!isLoading && daLoc.length === 0 && (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Không có chức danh nào khớp bộ lọc.</TableCell></TableRow>
            )}
            {daLoc.map((c) => {
              const so = soCanBo[c.id] ?? 0;
              const thieu = c.scope === 'external' ? ngonNguThieu(banDichTen(c)) : [];
              return (
                <TableRow key={c.id} className={c.status === 'retired' ? 'opacity-60' : undefined}>
                  <TableCell className="font-mono text-xs">
                    {c.code}
                    {c.requires_director_approval && (
                      <Badge variant="outline" className="ml-1 border-amber-400 text-2xs text-amber-700" title="Vai trò thị trường — Giám đốc duyệt">GĐ</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{TEN_SCOPE[c.scope]}</TableCell>
                  {CAC_NGON_NGU.map((l) => {
                    const v = c[`name_${l}` as const];
                    return (
                      <TableCell key={l} lang={l.replace('_', '-')} className="max-w-[160px] truncate text-sm" title={v ?? ''}>
                        {v || (c.scope === 'external' && thieu.includes(l as MaNgonNgu)
                          ? <span className="text-amber-600" title="Thiếu bản dịch — thẻ sẽ rơi về ngôn ngữ khác"><TriangleAlert className="inline h-3.5 w-3.5" /></span>
                          : <span className="text-muted-foreground">—</span>)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-xs">{c.allowed_employment.map((l) => TEN_NGAN_LOAI[l]).join(', ')}</TableCell>
                  <TableCell><HuyHieuTrangThai tt={c.status} /></TableCell>
                  <TableCell className="text-right tabular-nums">{so}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {laQuanTri && (
                        <Button size="icon" variant="ghost" title="Sửa" onClick={() => moSua(c)}><Pencil className="h-4 w-4" /></Button>
                      )}
                      {(c.status === 'draft' || c.status === 'pending') && (
                        <Button size="icon" variant="ghost" title={duyetDuoc(c) ? 'Duyệt' : 'Chức danh vai trò thị trường — cần Giám đốc duyệt'}
                          disabled={!duyetDuoc(c)} onClick={() => doiTrangThai(c, 'approved')}>
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {c.status === 'approved' && laQuanTri && (
                        <Button size="icon" variant="ghost" title="Thu hồi (không xóa — giữ lịch sử)" onClick={() => doiTrangThai(c, 'retired')}>
                          <Archive className="h-4 w-4 text-amber-600" />
                        </Button>
                      )}
                      {laQuanTri && (
                        <Button size="icon" variant="ghost" title={so > 0 ? `Đang có ${so} cán bộ dùng — chỉ được thu hồi` : 'Xóa'}
                          disabled={so > 0} onClick={() => setXoa(c)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
            <DialogTitle>{form?.id ? 'Sửa chức danh' : 'Thêm chức danh'}</DialogTitle>
            <DialogDescription>
              Chức danh mới luôn ở trạng thái nháp. Sửa bản dịch ở đây là mọi thẻ đang dùng chức danh này đổi theo.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="cd-code">Mã *</Label>
                  <Input id="cd-code" value={form.code} disabled={!!form.id} placeholder="VD: RM_FDI"
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label>Scope *</Label>
                  <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as PhamViChucDanh })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external">Đối ngoại (in trên thẻ)</SelectItem>
                      <SelectItem value="internal">Nội bộ (QĐ bổ nhiệm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cd-hl">Hiệu lực từ</Label>
                  <Input id="cd-hl" type="date" value={form.hieuLucTu} onChange={(e) => setForm({ ...form, hieuLucTu: e.target.value })} />
                </div>
              </div>
              <NhapSauNgonNgu nhan="Tên chức danh" idPrefix="cd-ten" giaTri={form.ten} onChange={(ten) => setForm({ ...form, ten })} />
              <div>
                <Label>Loại nhân sự được gán *</Label>
                <div className="mt-1 grid gap-1.5 sm:grid-cols-3">
                  {CAC_LOAI_NHAN_SU.map((l) => (
                    <label key={l} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.allowed.includes(l)}
                        onCheckedChange={(v) => setForm({ ...form, allowed: v === true ? [...form.allowed, l] : form.allowed.filter((x) => x !== l) })} />
                      {TEN_LOAI_NHAN_SU[l]}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={form.giamDocDuyet} onCheckedChange={(v) => setForm({ ...form, giamDocDuyet: v })} />
                <span>Vai trò thị trường — <b>Giám đốc duyệt</b> (Head of FDI Desk, Korea/Japan Desk…)</span>
              </label>
              <div>
                <Label htmlFor="cd-ghi-chu">Ghi chú nội bộ (không hiện trên thẻ)</Label>
                <Textarea id="cd-ghi-chu" rows={2} value={form.ghiChu} onChange={(e) => setForm({ ...form, ghiChu: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Hủy</Button>
            <Button onClick={luu} disabled={dangLuu}>{dangLuu ? 'Đang lưu…' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!xoa} onOpenChange={(o) => { if (!o) setXoa(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chức danh «{xoa?.name_vi}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Chỉ xóa khi chưa cán bộ nào dùng. Chức danh đã từng lên thẻ thì nên «Thu hồi» để giữ lịch sử.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={xoaHan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

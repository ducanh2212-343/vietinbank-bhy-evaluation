import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Copy, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  TTC_NHOM_DOI_TUONG, TTC_TEN_NOI_NOP, TTC_TEN_PHU_TRACH, TTC_TEN_THIET_BI, TTC_TEN_TRANG_THAI_CT, TTC_TINH_NANG,
  TTC_TEN_VAI, duongDanChuongTrinh, nhanNgay, xepChuongTrinhCuaToi,
  type TtcChuongTrinh, type TtcDauViec, type TtcNgay, type TtcNhomDoiTuong, type TtcVai,
} from '@/lib/trainingCenter';
import { useCt2NhanSu } from '@/components/one/move2/useCt2Data';
import { TtcLoi } from './TrainingNav';
import { FormDauViec, FormNgay } from './TtcFormLoTrinh';
import { TtcCauHinhNhac } from './TtcCauHinhNhac';
import { TtcDiemDanhQuanTri } from './TtcDiemDanhQuanTri';
import {
  luuChuongTrinh, nhanBanChuongTrinh, themThanhVien, xoaDauViec, xoaNgay, xoaThanhVien,
  useTtcBoiCanh, useTtcDanhMuc, useTtcDauViec, useTtcDiemDanh, useTtcLamTuoi, useTtcNgay, useTtcQrNgay, useTtcQuyenSoan,
  type TtcChuongTrinhForm,
} from './useTrainingCenter';

/**
 * QUẢN TRỊ CHƯƠNG TRÌNH — màn của Phòng Tổng hợp (đặc tả giai đoạn 2: «TCTH tự
 * tạo được một chương trình mới mà không cần đội phát triển»). Từ 06/09 Ban
 * Giám đốc của chương trình cũng vào được để sửa nội dung (thông tin, ngày,
 * đầu việc); tạo mới, nhân bản và xếp thành viên vẫn của TCTH.
 *
 * Ba việc: tạo/sửa/nhân bản chương trình · xếp thành viên và vai · soạn ngày
 * và đầu việc. Người tạo tự thành quản trị của chương trình (trigger), nên
 * tạo xong là thêm được người ngay. Nhân bản từ chương trình mẫu là đường
 * nhanh nhất cho «chương trình 10 ngày điều chỉnh theo vị trí quy hoạch».
 */
export function TtcQuanTri() {
  const { laTcth, laVaoDuoc, soanDuoc, xepThanhVienDuoc } = useTtcQuyenSoan();
  const { data, isLoading, isError, error } = useTtcDanhMuc();
  // `?ct=` — liên kết «Sửa nội dung chương trình» từ trong chương trình mở thẳng đúng mục
  const [sp] = useSearchParams();
  const [chon, setChon] = useState<string | null>(sp.get('ct'));
  const [moTao, setMoTao] = useState(false);
  const [nhanBanTu, setNhanBanTu] = useState<TtcChuongTrinh | null>(null);

  const ds = useMemo(() => xepChuongTrinhCuaToi(data?.chuongTrinh ?? []), [data]);

  if (!laVaoDuoc) {
    return <p className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600 shadow-sm">Màn này dành cho Phòng Tổng hợp và Ban Giám đốc của chương trình.</p>;
  }
  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (isError) return <TtcLoi error={error} />;

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
      <aside className="space-y-3">
        {laTcth && <Button className="w-full" onClick={() => setMoTao(true)}><Plus className="mr-1 h-4 w-4" /> Chương trình mới</Button>}
        <div className="space-y-2">
          {ds.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChon(c.id)}
              className={`w-full rounded-xl border p-3 text-left text-sm transition ${chon === c.id ? 'border-brand-navy bg-brand-navy/5' : 'border-slate-200 bg-white hover:border-brand-navy/40'}`}
            >
              <p className="font-semibold leading-snug text-brand-navy">{c.ten}</p>
              <p className="mt-0.5 text-2xs text-slate-500">
                {TTC_TEN_TRANG_THAI_CT[c.trang_thai]} · {c.ngay_bd.split('-').reverse().slice(0, 2).join('/')}
                {c.la_mau ? ' · Mẫu' : ''}{!soanDuoc(c.id) ? ' · chỉ xem' : ''}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <div>
        {chon ? (
          <ChiTietChuongTrinh
            ctId={chon}
            suaDuoc={soanDuoc(chon)}
            xepDuoc={xepThanhVienDuoc(chon)}
            onNhanBan={laTcth ? (c) => setNhanBanTu(c) : null}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Chọn một chương trình bên trái để xếp thành viên, soạn ngày và đầu việc — hoặc tạo mới / nhân bản từ mẫu.
          </p>
        )}
      </div>

      <FormChuongTrinh open={moTao} onClose={() => setMoTao(false)} onXong={(id) => { setMoTao(false); setChon(id); }} />
      <FormNhanBan nguon={nhanBanTu} onClose={() => setNhanBanTu(null)} onXong={(id) => { setNhanBanTu(null); setChon(id); }} />
    </div>
  );
}

// ---------------------------------------------------------------------------

const FORM_TRONG = (): TtcChuongTrinhForm => ({
  ten: '', mo_ta: '', ngay_bd: '', ngay_kt: '', trang_thai: 'CHUAN_BI', nhom_doi_tuong: 'CAN_BO_MOI', loai: '', khoi_nang_luc: '', la_mau: false,
});

function FormChuongTrinh({ open, cu, onClose, onXong }: { open: boolean; cu?: TtcChuongTrinh | null; onClose: () => void; onXong: (id: string) => void }) {
  const lamTuoi = useTtcLamTuoi();
  const [f, setF] = useState<TtcChuongTrinhForm>(FORM_TRONG());
  const [dangLuu, setDangLuu] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF(cu ? {
      ten: cu.ten, mo_ta: cu.mo_ta ?? '', ngay_bd: cu.ngay_bd, ngay_kt: cu.ngay_kt, trang_thai: cu.trang_thai,
      nhom_doi_tuong: cu.nhom_doi_tuong, loai: cu.loai ?? '', khoi_nang_luc: cu.khoi_nang_luc ?? '', la_mau: cu.la_mau,
    } : FORM_TRONG());
  }, [open, cu]);
  const dat = <K extends keyof TtcChuongTrinhForm>(k: K, v: TtcChuongTrinhForm[K]) => setF((c) => ({ ...c, [k]: v }));

  const luu = async () => {
    if (f.ten.trim().length < 5) { toast.error('Tên chương trình ít nhất 5 ký tự.'); return; }
    if (!f.ngay_bd || !f.ngay_kt || f.ngay_kt < f.ngay_bd) { toast.error('Ngày kết thúc phải từ ngày bắt đầu trở đi.'); return; }
    setDangLuu(true);
    try {
      const id = await luuChuongTrinh({ ...f, ten: f.ten.trim(), mo_ta: f.mo_ta?.trim() || null, loai: f.loai?.trim() || null, khoi_nang_luc: f.khoi_nang_luc?.trim() || null }, cu?.id);
      lamTuoi();
      toast.success(cu ? 'Đã lưu chương trình.' : 'Đã tạo chương trình — anh/chị là quản trị của chương trình này.');
      onXong(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
    } finally { setDangLuu(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{cu ? 'Sửa chương trình' : 'Chương trình mới'}</DialogTitle>
          <DialogDescription>Một chương trình là tập hợp ngày; một ngày là tập hợp đầu việc có khung giờ, người phụ trách, thiết bị và nơi nộp.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div><Label>Tên chương trình</Label><Input value={f.ten} onChange={(e) => dat('ten', e.target.value)} /></div>
          <div><Label>Mô tả</Label><Textarea rows={3} value={f.mo_ta ?? ''} onChange={(e) => dat('mo_ta', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Nhóm đối tượng</Label>
              <Select value={f.nhom_doi_tuong} onValueChange={(v) => dat('nhom_doi_tuong', v as TtcNhomDoiTuong)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TTC_NHOM_DOI_TUONG.map((n) => <SelectItem key={n.ma} value={n.ma}>{n.ten}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trạng thái</Label>
              <Select value={f.trang_thai} onValueChange={(v) => dat('trang_thai', v as TtcChuongTrinhForm['trang_thai'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(TTC_TEN_TRANG_THAI_CT) as Array<keyof typeof TTC_TEN_TRANG_THAI_CT>).map((k) => <SelectItem key={k} value={k}>{TTC_TEN_TRANG_THAI_CT[k]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Ngày bắt đầu</Label><Input type="date" value={f.ngay_bd} onChange={(e) => dat('ngay_bd', e.target.value)} /></div>
            <div><Label>Ngày kết thúc</Label><Input type="date" value={f.ngay_kt} onChange={(e) => dat('ngay_kt', e.target.value)} /></div>
            <div><Label>Loại</Label><Input placeholder="10 ngày · Hội nhập 30 ngày · Chuyên đề…" value={f.loai ?? ''} onChange={(e) => dat('loai', e.target.value)} /></div>
            <div><Label>Khối năng lực</Label><Input placeholder="Tầng 1 — Quản trị bản thân…" value={f.khoi_nang_luc ?? ''} onChange={(e) => dat('khoi_nang_luc', e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.la_mau} onCheckedChange={(v) => dat('la_mau', v)} /> Là chương trình mẫu (nhân bản được)</label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button onClick={luu} disabled={dangLuu}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormNhanBan({ nguon, onClose, onXong }: { nguon: TtcChuongTrinh | null; onClose: () => void; onXong: (id: string) => void }) {
  const lamTuoi = useTtcLamTuoi();
  const [ten, setTen] = useState('');
  const [ngayBd, setNgayBd] = useState('');
  const [dangLuu, setDangLuu] = useState(false);
  useEffect(() => { if (nguon) { setTen(`${nguon.ten} (bản mới)`); setNgayBd(''); } }, [nguon]);
  const luu = async () => {
    if (!nguon) return;
    if (ten.trim().length < 5 || !ngayBd) { toast.error('Cần tên và ngày bắt đầu.'); return; }
    setDangLuu(true);
    try {
      const id = await nhanBanChuongTrinh(nguon.id, ten.trim(), ngayBd);
      lamTuoi();
      toast.success('Đã nhân bản — lịch dời theo ngày bắt đầu mới, chưa có thành viên.');
      onXong(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không nhân bản được');
    } finally { setDangLuu(false); }
  };
  return (
    <Dialog open={!!nguon} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nhân bản chương trình</DialogTitle>
          <DialogDescription>Sao chép ngày và đầu việc của «{nguon?.ten}», dời lịch theo ngày bắt đầu mới. Thành viên, tiến độ, điểm không sao chép.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div><Label>Tên chương trình mới</Label><Input value={ten} onChange={(e) => setTen(e.target.value)} /></div>
          <div><Label>Ngày bắt đầu mới</Label><Input type="date" value={ngayBd} onChange={(e) => setNgayBd(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button onClick={luu} disabled={dangLuu}><Copy className="mr-1 h-4 w-4" /> Nhân bản</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

function ChiTietChuongTrinh({ ctId, suaDuoc, xepDuoc, onNhanBan }: {
  ctId: string;
  /** Sửa thông tin, ngày, đầu việc — quản trị hoặc BGĐ của chương trình */
  suaDuoc: boolean;
  /** Xếp thành viên và vai — chỉ quản trị (khớp RLS ttc_thanh_vien) */
  xepDuoc: boolean;
  onNhanBan: ((c: TtcChuongTrinh) => void) | null;
}) {
  const bc = useTtcBoiCanh(ctId);
  const lamTuoi = useTtcLamTuoi();
  const { data: nhanSu = [] } = useCt2NhanSu();
  const { data: dsNgay = [] } = useTtcNgay(ctId);
  const ngayIds = useMemo(() => dsNgay.map((n) => n.id), [dsNgay]);
  const { data: dsViec = [] } = useTtcDauViec(ctId, ngayIds);
  const { data: dsDiemDanh = [] } = useTtcDiemDanh(ctId, ngayIds);
  const { data: dsQr = [] } = useTtcQrNgay(ctId, ngayIds, suaDuoc);

  const [moSua, setMoSua] = useState(false);
  const [nguoiMoi, setNguoiMoi] = useState('');
  const [vaiMoi, setVaiMoi] = useState<TtcVai>('hoc_vien');
  const [ngaySua, setNgaySua] = useState<Partial<TtcNgay> | null>(null);
  const [viecSua, setViecSua] = useState<Partial<TtcDauViec> | null>(null);
  const [ngayMo, setNgayMo] = useState<string | null>(null);

  const ct = bc.chuongTrinh;
  if (bc.isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!ct) return <TtcLoi error={bc.error} />;

  const them = async () => {
    if (!nguoiMoi) return;
    try { await themThanhVien(ctId, nguoiMoi, vaiMoi); lamTuoi(); setNguoiMoi(''); toast.success('Đã thêm thành viên.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không thêm được'); }
  };
  const bo = async (id: string) => {
    try { await xoaThanhVien(id); lamTuoi(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không bỏ được'); }
  };
  const boNgay = async (n: TtcNgay) => {
    if (!window.confirm(`Xoá Ngày ${n.so_thu_tu} và toàn bộ đầu việc của ngày đó?`)) return;
    try { await xoaNgay(n.id); lamTuoi(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không xoá được'); }
  };
  const boViec = async (v: TtcDauViec) => {
    if (!window.confirm('Xoá đầu việc này?')) return;
    try { await xoaDauViec(v.id); lamTuoi(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không xoá được'); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-brand-navy">{ct.ten}</h2>
            <p className="text-xs text-slate-500">
              {TTC_NHOM_DOI_TUONG.find((n) => n.ma === ct.nhom_doi_tuong)?.ten} · {TTC_TEN_TRANG_THAI_CT[ct.trang_thai]} · {ct.ngay_bd.split('-').reverse().join('/')} → {ct.ngay_kt.split('-').reverse().join('/')}{ct.loai ? ` · ${ct.loai}` : ''}
            </p>
            {ct.mo_ta && <p className="mt-2 text-sm leading-relaxed text-slate-600">{ct.mo_ta}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {suaDuoc && <Button size="sm" variant="outline" onClick={() => setMoSua(true)}><Pencil className="mr-1 h-3.5 w-3.5" /> Sửa</Button>}
            {onNhanBan && <Button size="sm" variant="outline" onClick={() => onNhanBan(ct)}><Copy className="mr-1 h-3.5 w-3.5" /> Nhân bản</Button>}
            {bc.vai && (
              <Button asChild size="sm"><Link to={duongDanChuongTrinh(ct.id)}>Mở chương trình <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
            )}
          </div>
        </div>
      </div>

      {/* Thành viên */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-navy"><Users className="h-4 w-4" /> Thành viên và vai</h3>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {bc.thanhVien.length === 0 && <li className="py-2 text-xs text-slate-500">Chưa có thành viên.</li>}
          {bc.thanhVien.map((t) => (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <span className="flex-1 text-slate-800">{t.full_name ?? t.nguoi}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-semibold text-slate-600">{TTC_TEN_VAI[t.vai]}</span>
              {xepDuoc && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => bo(t.id)} aria-label="Bỏ khỏi chương trình"><Trash2 className="h-3.5 w-3.5" /></Button>}
            </li>
          ))}
        </ul>
        {xepDuoc && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[14rem] flex-1">
              <Label className="text-xs">Cán bộ</Label>
              <Select value={nguoiMoi || 'KHONG'} onValueChange={(v) => setNguoiMoi(v === 'KHONG' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Chọn cán bộ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KHONG">— Chọn cán bộ —</SelectItem>
                  {nhanSu.filter((n) => !bc.thanhVien.some((t) => t.nguoi === n.id)).map((n) => <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <Label className="text-xs">Vai</Label>
              <Select value={vaiMoi} onValueChange={(v) => setVaiMoi(v as TtcVai)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(TTC_TEN_VAI) as TtcVai[]).map((v) => <SelectItem key={v} value={v}>{TTC_TEN_VAI[v]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={them} disabled={!nguoiMoi}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm</Button>
          </div>
        )}
      </div>

      {/* Nhắc trước giờ — báo cho ai trong lần đào tạo này */}
      <TtcCauHinhNhac ct={ct} thanhVien={bc.thanhVien} suaDuoc={suaDuoc} />

      {/* Điểm danh: cách điểm danh · tấm QR từng ngày · theo dõi và ghi hộ */}
      <TtcDiemDanhQuanTri
        ct={ct}
        dsNgay={dsNgay}
        thanhVien={bc.thanhVien}
        dsDiemDanh={dsDiemDanh}
        dsQr={dsQr}
        suaDuoc={suaDuoc}
      />

      {/* Ngày và đầu việc */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-navy">Ngày và đầu việc</h3>
          {suaDuoc && (
            <Button size="sm" variant="outline" onClick={() => setNgaySua({ chuong_trinh_id: ctId, so_thu_tu: (dsNgay.at(-1)?.so_thu_tu ?? 0) + 1 })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Thêm ngày
            </Button>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {dsNgay.length === 0 && <p className="text-xs text-slate-500">Chưa có ngày nào. Thêm ngày, hoặc nhân bản từ một chương trình mẫu để có sẵn lịch.</p>}
          {dsNgay.map((n) => {
            const viec = dsViec.filter((v) => v.ngay_id === n.id);
            const mo = ngayMo === n.id;
            return (
              <div key={n.id} className="rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setNgayMo(mo ? null : n.id)}>
                    <p className="text-sm font-semibold text-brand-navy">Ngày {n.so_thu_tu} · {nhanNgay(n.ngay)} — {n.tieu_de}</p>
                    <p className="text-2xs text-slate-500">{viec.length} đầu việc{n.khoi ? ` · ${n.khoi}` : ''}</p>
                  </button>
                  {suaDuoc && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setNgaySua(n)} aria-label="Sửa ngày"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => boNgay(n)} aria-label="Xoá ngày"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                </div>
                {mo && (
                  <div className="border-t border-slate-100 p-3">
                    <ul className="divide-y divide-slate-100 text-sm">
                      {viec.map((v) => (
                        <li key={v.id} className="flex items-start gap-2 py-1.5">
                          <span className="w-24 shrink-0 tabular-nums text-slate-500">{v.gio_bat_dau}–{v.gio_ket_thuc}</span>
                          <span className="min-w-0 flex-1">
                            <span className="text-slate-800">{v.trong_tam ? '★ ' : ''}{v.ten}</span>
                            <span className="block text-2xs text-slate-500">
                              {TTC_TEN_PHU_TRACH[v.nguoi_phu_trach]} · {TTC_TEN_THIET_BI[v.thiet_bi]} · {TTC_TEN_NOI_NOP[v.noi_nop]}
                              {v.tinh_nang.length > 0 && ` · ${v.tinh_nang.map((t) => TTC_TINH_NANG.find((x) => x.ma === t)?.ten).join(', ')}`}
                            </span>
                          </span>
                          {suaDuoc && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViecSua(v)} aria-label="Sửa"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => boViec(v)} aria-label="Xoá"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    {suaDuoc && (
                      <Button size="sm" variant="ghost" className="mt-2" onClick={() => setViecSua({ ngay_id: n.id, thu_tu: viec.length + 1, phan: 'THUC_HANH', nguoi_phu_trach: 'HOC_VIEN', thiet_bi: 'LAPTOP', noi_nop: 'TRAINING_CENTER', trong_tam: false })}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Thêm đầu việc
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <FormChuongTrinh open={moSua} cu={ct} onClose={() => setMoSua(false)} onXong={() => setMoSua(false)} />
      <FormNgay ngay={ngaySua} onClose={() => setNgaySua(null)} />
      <FormDauViec viec={viecSua} onClose={() => setViecSua(null)} />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  TTC_KIEU_MUC_CON, TTC_PHAN, TTC_TEN_AI_TICH, TTC_TEN_NOI_NOP, TTC_TEN_PHU_TRACH, TTC_TEN_THIET_BI, TTC_TINH_NANG, docTruongGhiChu, gioNgan,
  type TtcAiTich, type TtcDauViec, type TtcKieuMucCon, type TtcMucCon, type TtcNgay, type TtcTruongGhiChu,
} from '@/lib/trainingCenter';
import { luuDauViec, luuMucCon, luuNgay, useTtcLamTuoi, useTtcMucCon, xoaMucCon } from './useTrainingCenter';

/** Mục con đang soạn trong form — id rỗng là mục mới, chưa có trên máy chủ */
type MucSoan = Omit<TtcMucCon, 'id' | 'dau_viec_id'> & { id?: string };

/**
 * Hộp thoại soạn NGÀY và ĐẦU VIỆC — dùng chung cho màn Quản trị và màn Lộ trình
 * (Giám đốc 06/09: «sửa lộ trình chi tiết» ngay tại chỗ). Một form một nơi để
 * hai màn không lệch nhau khi thêm trường.
 */
export function FormNgay({ ngay, onClose }: { ngay: Partial<TtcNgay> | null; onClose: () => void }) {
  const lamTuoi = useTtcLamTuoi();
  const [f, setF] = useState<Partial<TtcNgay>>({});
  useEffect(() => { if (ngay) setF(ngay); }, [ngay]);
  const dat = (k: keyof TtcNgay, v: string | number) => setF((c) => ({ ...c, [k]: v }));
  const luu = async () => {
    if (!f.chuong_trinh_id || !f.so_thu_tu || !f.ngay || !f.tieu_de?.trim()) { toast.error('Cần số thứ tự, ngày và tiêu đề.'); return; }
    try {
      await luuNgay({
        id: f.id, chuong_trinh_id: f.chuong_trinh_id, so_thu_tu: Number(f.so_thu_tu), ngay: f.ngay, tieu_de: f.tieu_de.trim(),
        khoi: f.khoi || null, van_ban: f.van_ban || null, nhiem_vu_van_ban: f.nhiem_vu_van_ban || null,
        chuan_bi: f.chuan_bi || null, lat_cat: f.lat_cat || null, cau_hoi_tu_soi: f.cau_hoi_tu_soi || null,
      });
      lamTuoi(); onClose(); toast.success('Đã lưu ngày.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
  };
  return (
    <Dialog open={!!ngay} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{f.id ? 'Sửa ngày' : 'Thêm ngày'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><Label>Số thứ tự</Label><Input type="number" min={1} value={f.so_thu_tu ?? ''} onChange={(e) => dat('so_thu_tu', Number(e.target.value))} /></div>
          <div><Label>Ngày</Label><Input type="date" value={f.ngay ?? ''} onChange={(e) => dat('ngay', e.target.value)} /></div>
          <div className="col-span-2"><Label>Tiêu đề ngày</Label><Input value={f.tieu_de ?? ''} onChange={(e) => dat('tieu_de', e.target.value)} /></div>
          <div><Label>Khối năng lực</Label><Input value={f.khoi ?? ''} onChange={(e) => dat('khoi', e.target.value)} /></div>
          <div><Label>Thang Bloom tối thiểu</Label><Input value={f.nhiem_vu_van_ban ?? ''} onChange={(e) => dat('nhiem_vu_van_ban', e.target.value)} /></div>
          <div className="col-span-2"><Label>Văn bản của ngày</Label><Input value={f.van_ban ?? ''} onChange={(e) => dat('van_ban', e.target.value)} /></div>
          <div className="col-span-2"><Label>Chuẩn bị tối hôm trước</Label><Textarea rows={2} value={f.chuan_bi ?? ''} onChange={(e) => dat('chuan_bi', e.target.value)} /></div>
          <div><Label>Lát cắt của Cây</Label><Input value={f.lat_cat ?? ''} onChange={(e) => dat('lat_cat', e.target.value)} /></div>
          <div className="col-span-2"><Label>Câu hỏi tự soi</Label><Textarea rows={2} value={f.cau_hoi_tu_soi ?? ''} onChange={(e) => dat('cau_hoi_tu_soi', e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Huỷ</Button><Button onClick={luu}>Lưu</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FormDauViec({ viec, onClose }: { viec: Partial<TtcDauViec> | null; onClose: () => void }) {
  const lamTuoi = useTtcLamTuoi();
  const [f, setF] = useState<Partial<TtcDauViec>>({});
  const [dsMuc, setDsMuc] = useState<MucSoan[]>([]);
  const [mucBo, setMucBo] = useState<string[]>([]);
  const [truong, setTruong] = useState<TtcTruongGhiChu[]>([]);
  const [dangLuu, setDangLuu] = useState(false);
  // Mục con của đầu việc đang sửa — khoá 'form' vì hook chỉ cần một khoá cache, không cần id chương trình
  // Không đặt mặc định `= []` ở đây: mảng mới mỗi lần render làm effect dưới chạy mãi (đã va ở đợt 15)
  const { data: mucCu } = useTtcMucCon(viec?.id ? 'form' : null, viec?.id ? [viec.id] : []);
  // Cột time trả 'HH:MM:SS'; ô <input type="time"> và phép so giờ kết thúc phải sau
  // giờ bắt đầu đều làm việc với 'HH:MM', nên cắt ngay lúc nạp form
  useEffect(() => {
    if (viec) {
      setF({ ...viec, gio_bat_dau: gioNgan(viec.gio_bat_dau), gio_ket_thuc: gioNgan(viec.gio_ket_thuc) });
      setTruong(docTruongGhiChu(viec.truong_ghi_chu));
      setMucBo([]);
    }
  }, [viec]);
  useEffect(() => { setDsMuc((mucCu ?? []).map(({ id, dau_viec_id: _bo, ...m }) => ({ ...m, id }))); }, [mucCu]);
  const dat = <K extends keyof TtcDauViec>(k: K, v: TtcDauViec[K]) => setF((c) => ({ ...c, [k]: v }));
  const luu = async () => {
    if (!f.ngay_id || !f.gio_bat_dau || !f.gio_ket_thuc || (f.ten ?? '').trim().length < 5) { toast.error('Cần giờ bắt đầu, giờ kết thúc và tên việc (≥ 5 ký tự).'); return; }
    if (f.gio_ket_thuc <= f.gio_bat_dau) { toast.error('Giờ kết thúc phải sau giờ bắt đầu.'); return; }
    if (dsMuc.some((m) => m.ten.trim().length < 3)) { toast.error('Mỗi mục con cần tên (≥ 3 ký tự).'); return; }
    if (truong.some((t) => t.nhan.trim() === '')) { toast.error('Mỗi trường của mẫu ghi chú cần nhãn.'); return; }
    setDangLuu(true);
    try {
      const id = await luuDauViec({
        id: f.id, ngay_id: f.ngay_id, phan: f.phan ?? 'THUC_HANH', thu_tu: f.thu_tu ?? 0,
        gio_bat_dau: f.gio_bat_dau, gio_ket_thuc: f.gio_ket_thuc, ten: (f.ten ?? '').trim(), dau_ra: f.dau_ra || null,
        nguoi_phu_trach: f.nguoi_phu_trach ?? 'HOC_VIEN', thiet_bi: f.thiet_bi ?? 'KHONG', noi_nop: f.noi_nop ?? 'KHONG', trong_tam: !!f.trong_tam,
        tinh_nang: f.tinh_nang ?? [],
        ai_tich: f.ai_tich ?? 'HOC_VIEN', ghi_chu_nguoi_dan: f.ghi_chu_nguoi_dan?.trim() || null, nguoi_dan_ten: f.nguoi_dan_ten?.trim() || null,
        truong_ghi_chu: truong.map((t, i) => ({ ma: t.ma || `t${i + 1}`, nhan: t.nhan.trim(), ...(t.goi_y ? { goi_y: t.goi_y } : {}) })),
      });
      for (const mid of mucBo) await xoaMucCon(mid);
      for (const [i, m] of dsMuc.entries()) {
        await luuMucCon({ id: m.id, dau_viec_id: id, thu_tu: i + 1, ten: m.ten.trim(), kieu: m.kieu, gio_goi_y: m.gio_goi_y || null, yeu_cau: m.yeu_cau, bat_buoc: m.bat_buoc });
      }
      lamTuoi(); onClose(); toast.success('Đã lưu đầu việc.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
    finally { setDangLuu(false); }
  };
  const suaMuc = (i: number, phan: Partial<MucSoan>) => setDsMuc((c) => c.map((m, j) => (j === i ? { ...m, ...phan } : m)));
  const doiChoMuc = (i: number, huong: -1 | 1) => setDsMuc((c) => {
    const j = i + huong; if (j < 0 || j >= c.length) return c;
    const n = [...c]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const boMuc = (i: number) => setDsMuc((c) => { const m = c[i]; if (m.id) setMucBo((b) => [...b, m.id!]); return c.filter((_, j) => j !== i); });
  const soBatBuoc = useMemo(() => dsMuc.filter((m) => m.bat_buoc).length, [dsMuc]);
  const chon = <T extends string>(nhan: string, k: keyof TtcDauViec, ds: Record<T, string> | Array<{ ma: T; ten: string }>) => {
    const muc = Array.isArray(ds) ? ds : (Object.keys(ds) as T[]).map((ma) => ({ ma, ten: ds[ma] }));
    return (
      <div>
        <Label>{nhan}</Label>
        <Select value={(f[k] as string) ?? ''} onValueChange={(v) => dat(k, v as never)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{muc.map((m) => <SelectItem key={m.ma} value={m.ma}>{m.ten}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  };
  return (
    <Dialog open={!!viec} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? 'Sửa đầu việc' : 'Thêm đầu việc'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><Label>Giờ bắt đầu</Label><Input type="time" value={f.gio_bat_dau ?? ''} onChange={(e) => dat('gio_bat_dau', e.target.value)} /></div>
          <div><Label>Giờ kết thúc</Label><Input type="time" value={f.gio_ket_thuc ?? ''} onChange={(e) => dat('gio_ket_thuc', e.target.value)} /></div>
          <div className="col-span-2"><Label>Tên đầu việc</Label><Textarea rows={2} value={f.ten ?? ''} onChange={(e) => dat('ten', e.target.value)} /></div>
          <div className="col-span-2"><Label>Đầu ra</Label><Input value={f.dau_ra ?? ''} onChange={(e) => dat('dau_ra', e.target.value)} /></div>
          {chon('Phần', 'phan', TTC_PHAN)}
          {chon('Người phụ trách', 'nguoi_phu_trach', TTC_TEN_PHU_TRACH)}
          {chon('Thiết bị', 'thiet_bi', TTC_TEN_THIET_BI)}
          {chon('Nơi nộp', 'noi_nop', TTC_TEN_NOI_NOP)}
          <label className="col-span-2 flex items-center gap-2"><Switch checked={!!f.trong_tam} onCheckedChange={(v) => dat('trong_tam', v)} /> Đầu việc trọng tâm</label>
          <div>
            <Label>Ai tích hoàn thành</Label>
            <Select value={f.ai_tich ?? 'HOC_VIEN'} onValueChange={(v) => dat('ai_tich', v as TtcAiTich)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(TTC_TEN_AI_TICH) as TtcAiTich[]).map((k) => <SelectItem key={k} value={k}>{TTC_TEN_AI_TICH[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Người dẫn (hiển thị)</Label><Input value={f.nguoi_dan_ten ?? ''} onChange={(e) => dat('nguoi_dan_ten', e.target.value)} placeholder="VD: Anh Hoàng" /></div>
          <div className="col-span-2">
            <Label>Lời dẫn — chỉ team đào tạo thấy</Label>
            <Textarea rows={2} value={f.ghi_chu_nguoi_dan ?? ''} onChange={(e) => dat('ghi_chu_nguoi_dan', e.target.value)} placeholder="Câu dẫn, điểm cần nhấn, lưu ý khi điều phối…" />
          </div>

          {/* Mục con — Khung 1 (đợt 15) */}
          <div className="col-span-2 rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-brand-navy">Mục con của đầu việc</p>
              <span className="text-2xs text-slate-500">{dsMuc.length} mục · {soBatBuoc} bắt buộc</span>
            </div>
            <p className="text-2xs text-slate-500">Điểm dừng, sản phẩm phải nộp, tiêu chí kiểm thử. Học viên tích từng mục; đủ mục bắt buộc thì đầu việc tự hoàn thành.</p>
            <div className="mt-2 space-y-2">
              {dsMuc.map((m, i) => (
                <div key={m.id ?? `moi-${i}`} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="flex items-start gap-1">
                    <span className="mt-2 w-5 text-center text-2xs font-bold text-slate-400">{i + 1}</span>
                    <Input value={m.ten} onChange={(e) => suaMuc(i, { ten: e.target.value })} placeholder="Tên mục (VD: Dán link website đã đăng)" className="h-9 flex-1" />
                    <Button size="icon" variant="ghost" className="h-9 w-8 text-slate-400" onClick={() => doiChoMuc(i, -1)} disabled={i === 0} aria-label="Lên"><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-9 w-8 text-slate-400" onClick={() => doiChoMuc(i, 1)} disabled={i === dsMuc.length - 1} aria-label="Xuống"><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-9 w-8 text-slate-400 hover:text-red-600" onClick={() => boMuc(i)} aria-label="Bỏ mục"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-6">
                    <Select value={m.kieu} onValueChange={(v) => suaMuc(i, { kieu: v as TtcKieuMucCon })}>
                      <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{TTC_KIEU_MUC_CON.map((k) => <SelectItem key={k.ma} value={k.ma}>{k.ten}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="time" value={m.gio_goi_y ?? ''} onChange={(e) => suaMuc(i, { gio_goi_y: e.target.value || null })} className="h-8 w-28 text-xs" title="Giờ gợi ý nên xong" />
                    <label className="flex items-center gap-1.5 text-xs"><Switch checked={m.bat_buoc} onCheckedChange={(v) => suaMuc(i, { bat_buoc: v })} /> Bắt buộc</label>
                  </div>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setDsMuc((c) => [...c, { thu_tu: c.length + 1, ten: '', kieu: 'DIEM_DUNG', gio_goi_y: null, yeu_cau: [], bat_buoc: true }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Thêm mục
            </Button>
          </div>

          {/* Mẫu ghi chú có nhãn — chỉ có tác dụng khi bật «Ghi chú kết quả» */}
          <div className="col-span-2 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-brand-navy">Mẫu ghi chú kết quả (tuỳ chọn)</p>
            <p className="text-2xs text-slate-500">Bật «Ghi chú kết quả» rồi đặt nhãn từng ô — học viên trả lời theo nhãn thay vì viết tự do. Để trống = ô ghi chú thường.</p>
            <div className="mt-2 space-y-1.5">
              {truong.map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input value={t.nhan} onChange={(e) => setTruong((c) => c.map((x, j) => (j === i ? { ...x, nhan: e.target.value } : x)))} placeholder="Nhãn (VD: Khó nhất ở đâu?)" className="h-8 flex-1 text-xs" />
                  <Input value={t.goi_y ?? ''} onChange={(e) => setTruong((c) => c.map((x, j) => (j === i ? { ...x, goi_y: e.target.value } : x)))} placeholder="Gợi ý (mờ trong ô)" className="h-8 flex-1 text-xs" />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => setTruong((c) => c.filter((_, j) => j !== i))} aria-label="Bỏ trường"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setTruong((c) => [...c, { ma: `t${Date.now().toString(36)}`, nhan: '' }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Thêm trường
            </Button>
          </div>
          <div className="col-span-2 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-brand-navy">Tính năng của đầu việc</p>
            <p className="text-2xs text-slate-500">Bật thì học viên phải nộp mới tích hoàn thành được — máy chủ chặn, không chỉ giao diện.</p>
            <div className="mt-2 space-y-1.5">
              {TTC_TINH_NANG.map((t) => {
                const bat = (f.tinh_nang ?? []).includes(t.ma);
                return (
                  <label key={t.ma} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={bat}
                      onCheckedChange={(c) => dat('tinh_nang', c === true ? [...(f.tinh_nang ?? []), t.ma] : (f.tinh_nang ?? []).filter((x) => x !== t.ma))}
                      className="mt-0.5"
                    />
                    <span><span className="font-medium text-slate-800">{t.ten}</span><span className="block text-2xs text-slate-500">{t.mo}</span></span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Huỷ</Button><Button onClick={luu} disabled={dangLuu}>Lưu</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

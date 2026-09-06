import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  TTC_PHAN, TTC_TEN_NOI_NOP, TTC_TEN_PHU_TRACH, TTC_TEN_THIET_BI, TTC_TINH_NANG,
  type TtcDauViec, type TtcNgay,
} from '@/lib/trainingCenter';
import { luuDauViec, luuNgay, useTtcLamTuoi } from './useTrainingCenter';

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
  useEffect(() => { if (viec) setF(viec); }, [viec]);
  const dat = <K extends keyof TtcDauViec>(k: K, v: TtcDauViec[K]) => setF((c) => ({ ...c, [k]: v }));
  const luu = async () => {
    if (!f.ngay_id || !f.gio_bat_dau || !f.gio_ket_thuc || (f.ten ?? '').trim().length < 5) { toast.error('Cần giờ bắt đầu, giờ kết thúc và tên việc (≥ 5 ký tự).'); return; }
    if (f.gio_ket_thuc <= f.gio_bat_dau) { toast.error('Giờ kết thúc phải sau giờ bắt đầu.'); return; }
    try {
      await luuDauViec({
        id: f.id, ngay_id: f.ngay_id, phan: f.phan ?? 'THUC_HANH', thu_tu: f.thu_tu ?? 0,
        gio_bat_dau: f.gio_bat_dau, gio_ket_thuc: f.gio_ket_thuc, ten: (f.ten ?? '').trim(), dau_ra: f.dau_ra || null,
        nguoi_phu_trach: f.nguoi_phu_trach ?? 'HOC_VIEN', thiet_bi: f.thiet_bi ?? 'KHONG', noi_nop: f.noi_nop ?? 'KHONG', trong_tam: !!f.trong_tam,
        tinh_nang: f.tinh_nang ?? [],
      });
      lamTuoi(); onClose(); toast.success('Đã lưu đầu việc.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
  };
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
      <DialogContent className="max-w-lg">
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
        <DialogFooter><Button variant="ghost" onClick={onClose}>Huỷ</Button><Button onClick={luu}>Lưu</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

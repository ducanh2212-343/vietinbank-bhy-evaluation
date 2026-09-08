import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { UploadedItem } from '@/data/one/types';
import { LOAI_HOAT_DONG, THU_TU_LOAI, tachDiemNhan, type HoatDongConnect, type LoaiHoatDongConnect } from '@/lib/connect';
import type { HoatDongGhi } from './useConnectDongThoiGian';

/**
 * Hộp thoại thêm / sửa một hoạt động trên dòng thời gian Connect.
 *
 * Người dùng là Phòng KHDN / TCTH — không phải người viết mã, nên form hỏi
 * bằng ngôn ngữ nghiệp vụ: ngày, loại hoạt động, tiêu đề, vài dòng mô tả, con
 * số đắt nhất, bài đã đăng trong kho (để mượn ảnh và bài đầy đủ), ảnh riêng.
 */
interface Props {
  mo: boolean;
  hoatDong: HoatDongConnect | null;
  baiViet: UploadedItem[];
  onDong: () => void;
  onLuu: (g: HoatDongGhi) => Promise<void>;
}

const TOI_DA_ANH = 8;

function docAnh(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Không đọc được ảnh'));
    r.readAsDataURL(file);
  });
}

export function FormHoatDong({ mo, hoatDong, baiViet, onDong, onLuu }: Props) {
  const [f, setF] = useState<HoatDongGhi>(trong());
  const [diemNhanRaw, setDiemNhanRaw] = useState('');
  const [timBai, setTimBai] = useState('');
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    if (!mo) return;
    if (hoatDong) {
      setF({
        id: hoatDong.id, ngay: hoatDong.ngay, loai: hoatDong.loai, tieuDe: hoatDong.tieuDe, moTa: hoatDong.moTa ?? '',
        diemNhan: hoatDong.diemNhan, anh: hoatDong.anh, baiVietId: hoatDong.baiVietId, lienKet: hoatDong.lienKet ?? '',
        noiBat: hoatDong.noiBat, moChoKhach: hoatDong.moChoKhach,
      });
      setDiemNhanRaw(hoatDong.diemNhan.join('\n'));
    } else {
      setF(trong());
      setDiemNhanRaw('');
    }
    setTimBai('');
  }, [mo, hoatDong]);

  const dat = <K extends keyof HoatDongGhi>(k: K, v: HoatDongGhi[K]) => setF((c) => ({ ...c, [k]: v }));

  // Bài chuyên mục Connect lên đầu; gõ để lọc theo tiêu đề
  const baiGoiY = useMemo(() => {
    const q = timBai.trim().toLowerCase();
    return [...baiViet]
      .sort((a, b) => Number(b.category === 'connect') - Number(a.category === 'connect'))
      .filter((b) => !q || b.title.toLowerCase().includes(q))
      .slice(0, 12);
  }, [baiViet, timBai]);
  const baiDaChon = baiViet.find((b) => b.id === f.baiVietId);

  const themAnh = async (files: FileList | null) => {
    if (!files?.length) return;
    const con = TOI_DA_ANH - f.anh.length;
    if (con <= 0) { toast.error(`Tối đa ${TOI_DA_ANH} ảnh — bộ ảnh đầy đủ nên đăng thành bài rồi gắn vào.`); return; }
    const moi: string[] = [];
    for (const file of Array.from(files).slice(0, con)) {
      if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { toast.error('Chỉ nhận ảnh JPG, PNG hoặc WebP.'); continue; }
      moi.push(await docAnh(file));
    }
    dat('anh', [...f.anh, ...moi]);
  };

  const luu = async () => {
    const diemNhan = tachDiemNhan(diemNhanRaw);
    if (!f.ngay) { toast.error('Cần ngày diễn ra hoạt động.'); return; }
    if (f.tieuDe.trim().length < 5) { toast.error('Tiêu đề cần ít nhất 5 ký tự.'); return; }
    if (f.lienKet.trim() && !/^https?:\/\//i.test(f.lienKet.trim())) { toast.error('Liên kết phải bắt đầu bằng http:// hoặc https://'); return; }
    setDangLuu(true);
    try {
      await onLuu({ ...f, diemNhan });
      toast.success(f.id ? 'Đã cập nhật hoạt động.' : 'Đã thêm hoạt động vào dòng thời gian.');
      onDong();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Dialog open={mo} onOpenChange={(o) => !o && onDong()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{f.id ? 'Sửa hoạt động' : 'Thêm hoạt động vào dòng thời gian'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <Label>Ngày diễn ra</Label>
            <Input type="date" value={f.ngay} onChange={(e) => dat('ngay', e.target.value)} />
          </div>
          <div>
            <Label>Loại hoạt động</Label>
            <Select value={f.loai} onValueChange={(v) => dat('loai', v as LoaiHoatDongConnect)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {THU_TU_LOAI.map((l) => (
                  <SelectItem key={l} value={l}>{LOAI_HOAT_DONG[l].ten}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Tiêu đề</Label>
            <Input value={f.tieuDe} maxLength={160} placeholder="Ví dụ: Hội nghị kết nối KHDN chủ đề «Thu» 2026" onChange={(e) => dat('tieuDe', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Mô tả ngắn</Label>
            <Textarea rows={3} value={f.moTa} placeholder="Ai tham dự, kết nối được gì, thông điệp chính…" onChange={(e) => dat('moTa', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Điểm nhấn / con số — mỗi dòng một ý, tối đa 6</Label>
            <Textarea rows={3} value={diemNhanRaw} placeholder={'+795 tỷ đồng giới hạn tín dụng đã cấp\n6 khách hàng doanh nghiệp mới'} onChange={(e) => setDiemNhanRaw(e.target.value)} />
          </div>

          <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <Label>Gắn bài đã đăng trong kho tư liệu (mượn ảnh và bài đầy đủ)</Label>
            {baiDaChon ? (
              <div className="mt-2 flex items-center gap-3 rounded-lg bg-white p-2">
                {baiDaChon.imageUrl && <img src={baiDaChon.imageUrl} alt="" className="h-12 w-16 rounded object-cover" />}
                <span className="line-clamp-2 flex-1 text-xs font-semibold text-slate-700">{baiDaChon.title}</span>
                <button type="button" aria-label="Bỏ gắn bài" className="text-slate-400 hover:text-brand-red" onClick={() => dat('baiVietId', null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Input className="mt-2 bg-white" value={timBai} placeholder="Gõ để tìm theo tiêu đề bài…" onChange={(e) => setTimBai(e.target.value)} />
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {baiGoiY.map((b) => (
                    <li key={b.id}>
                      <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white" onClick={() => dat('baiVietId', b.id)}>
                        <span className={`rounded-full px-1.5 py-0.5 text-2xs font-bold ${b.category === 'connect' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>{b.date}</span>
                        <span className="line-clamp-1 flex-1 text-slate-700">{b.title}</span>
                      </button>
                    </li>
                  ))}
                  {baiGoiY.length === 0 && <li className="px-2 text-xs text-slate-500">Không có bài khớp. Đăng bài ở Học hỏi rồi quay lại gắn.</li>}
                </ul>
              </>
            )}
          </div>

          <div className="col-span-2">
            <Label>Ảnh riêng của hoạt động (tối đa {TOI_DA_ANH})</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {f.anh.map((a, i) => (
                <span key={`${i}-${a.slice(0, 24)}`} className="relative">
                  <img src={a.startsWith('data:') ? a : undefined} alt="" className="h-16 w-20 rounded-lg border bg-slate-100 object-cover" />
                  {!a.startsWith('data:') && <span className="absolute inset-0 grid place-items-center text-2xs text-slate-500">đã lưu</span>}
                  <button type="button" aria-label="Bỏ ảnh" className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-slate-500 shadow hover:text-brand-red" onClick={() => dat('anh', f.anh.filter((_, k) => k !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <label className="grid h-16 w-20 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-royal hover:text-brand-royal">
                <ImagePlus className="h-5 w-5" />
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => { void themAnh(e.target.files); e.target.value = ''; }} />
              </label>
            </div>
          </div>

          <div className="col-span-2">
            <Label>Liên kết ngoài (nếu có)</Label>
            <Input value={f.lienKet} placeholder="https://…" onChange={(e) => dat('lienKet', e.target.value)} />
          </div>

          <label className="flex items-center gap-3 rounded-xl border p-3">
            <Switch checked={f.noiBat} onCheckedChange={(v) => dat('noiBat', v)} />
            <span><span className="block font-semibold">Nổi bật</span><span className="text-xs text-slate-500">Dựng to hơn trên dòng thời gian</span></span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border p-3">
            <Switch checked={f.moChoKhach} onCheckedChange={(v) => dat('moChoKhach', v)} />
            <span><span className="block font-semibold">Mở cho khách đối tác</span><span className="text-xs text-slate-500">Khách có tài khoản mời mới thấy</span></span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onDong} disabled={dangLuu}>Huỷ</Button>
          <Button onClick={luu} disabled={dangLuu}>{dangLuu ? 'Đang lưu…' : 'Lưu'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function trong(): HoatDongGhi {
  return {
    ngay: new Date().toISOString().slice(0, 10), loai: 'ket-noi', tieuDe: '', moTa: '', diemNhan: [], anh: [],
    baiVietId: null, lienKet: '', noiBat: false, moChoKhach: false,
  };
}

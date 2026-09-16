import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, ClipboardPaste, Loader2, Search, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { TTC_TEN_VAI, type TtcVai } from '@/lib/trainingCenter';
import { khopDanhSach, locDanhBa, type DongKhop, type NguoiDanhBa } from '@/lib/ttcGhiDanh';
import { useCt2Phong } from '@/components/one/move2/useCt2Data';
import { themThanhVienHangLoat, useTtcDanhBa, useTtcLamTuoi } from './useTrainingCenter';

/**
 * THÊM NHIỀU THÀNH VIÊN MỘT LẦN — hai cách (Giám đốc 16/09, phương án 1 và 2):
 *   · Chọn từ danh bạ: gõ tên (không dấu cũng được), lọc theo phòng, tick từng
 *     người hoặc «cả phòng», một nút thêm N người.
 *   · Dán danh sách: từ Excel / Zalo / quyết định cử đi học — mỗi dòng một
 *     tên, hệ thống khớp với danh bạ và HIỆN TRƯỚC ai khớp, ai trùng tên (phải
 *     chỉ tay), ai không có; chỉ thêm khi bấm xác nhận.
 *
 * Vai mặc định là học viên. Người hướng dẫn / BGĐ / quản trị vẫn chọn được ở
 * đây nhưng phải đổi vai có chủ ý — thêm nhầm vai là giao nhầm quyền chấm.
 * Thay cho ô xổ xuống 150 tên thêm từng người (25 học viên mất ~10 phút).
 */
export function TtcThemThanhVien({ mo, onDong, ctId, daCo }: {
  mo: boolean; onDong: () => void; ctId: string;
  /** id hồ sơ đã trong lớp — ẩn khỏi danh bạ, đánh dấu «đã có» khi dán */
  daCo: Set<string>;
}) {
  const { data: danhBa = [], isLoading } = useTtcDanhBa();
  const { data: dsPhong = [] } = useCt2Phong();
  const lamTuoi = useTtcLamTuoi();
  const [vai, setVai] = useState<TtcVai>('hoc_vien');
  const [dangThem, setDangThem] = useState(false);

  // --- tab 1: chọn ---
  const [tuKhoa, setTuKhoa] = useState('');
  const [phong, setPhong] = useState<string>('TAT_CA');
  const [chon, setChon] = useState<Set<string>>(new Set());
  // --- tab 2: dán ---
  const [vanBan, setVanBan] = useState('');
  const [chonTrung, setChonTrung] = useState<Record<number, string>>({});

  const tenPhong = useMemo(() => new Map(dsPhong.map((p) => [p.id, p.name])), [dsPhong]);
  const chuaCo = useMemo(() => danhBa.filter((n) => !daCo.has(n.id)), [danhBa, daCo]);
  const hienThi = useMemo(() => {
    const theoPhong = phong === 'TAT_CA' ? chuaCo : chuaCo.filter((n) => (n.department_id ?? 'KHONG') === phong);
    return locDanhBa(theoPhong, tuKhoa);
  }, [chuaCo, phong, tuKhoa]);
  const nhomTheoPhong = useMemo(() => {
    const m = new Map<string, NguoiDanhBa[]>();
    for (const n of hienThi) { const k = n.department_id ?? 'KHONG'; m.set(k, [...(m.get(k) ?? []), n]); }
    return [...m.entries()].sort((a, b) => (tenPhong.get(a[0]) ?? 'Chưa xếp phòng').localeCompare(tenPhong.get(b[0]) ?? 'Chưa xếp phòng', 'vi'));
  }, [hienThi, tenPhong]);

  const khop = useMemo(() => khopDanhSach(vanBan, danhBa, daCo), [vanBan, danhBa, daCo]);
  const idDan = useMemo(() => {
    const ra = new Set(khop.themDuoc);
    khop.dong.forEach((d, i) => { if (d.ungVien.length > 1 && chonTrung[i] && !daCo.has(chonTrung[i])) ra.add(chonTrung[i]); });
    return [...ra];
  }, [khop, chonTrung, daCo]);

  const bat = (id: string, co: boolean) => setChon((s) => { const t = new Set(s); if (co) t.add(id); else t.delete(id); return t; });
  const batNhom = (ds: NguoiDanhBa[], co: boolean) => setChon((s) => { const t = new Set(s); ds.forEach((n) => (co ? t.add(n.id) : t.delete(n.id))); return t; });

  const them = async (ids: string[]) => {
    if (ids.length === 0) return;
    setDangThem(true);
    try {
      const n = await themThanhVienHangLoat(ctId, ids, vai);
      lamTuoi();
      toast.success(n === ids.length ? `Đã thêm ${n} người làm ${TTC_TEN_VAI[vai].toLowerCase()}.` : `Đã thêm ${n}/${ids.length} người — số còn lại đã có trong lớp hoặc không phải cán bộ nội bộ.`);
      setChon(new Set()); setVanBan(''); setChonTrung({});
      onDong();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thêm được');
    } finally { setDangThem(false); }
  };

  return (
    <Dialog open={mo} onOpenChange={(o) => !o && !dangThem && onDong()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-brand-navy" /> Thêm thành viên vào lớp</DialogTitle>
          <DialogDescription>Chọn nhiều người một lần hoặc dán danh sách từ Excel / Zalo. Người đã có trong lớp tự bỏ qua; tài khoản khách đối tác không thêm được.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2">
          <div className="w-48">
            <Label className="text-xs">Vai khi thêm</Label>
            <Select value={vai} onValueChange={(v) => setVai(v as TtcVai)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(TTC_TEN_VAI) as TtcVai[]).map((v) => <SelectItem key={v} value={v}>{TTC_TEN_VAI[v]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {vai !== 'hoc_vien' && <p className="text-2xs text-amber-700">Vai «{TTC_TEN_VAI[vai]}» có quyền chấm hoặc sửa lớp — kiểm lại danh sách trước khi thêm.</p>}
        </div>

        <Tabs defaultValue="chon">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chon" className="gap-1"><Users className="h-4 w-4" /> Chọn từ danh bạ</TabsTrigger>
            <TabsTrigger value="dan" className="gap-1"><ClipboardPaste className="h-4 w-4" /> Dán danh sách</TabsTrigger>
          </TabsList>

          <TabsContent value="chon" className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} placeholder="Gõ tên, không cần dấu…" className="h-9 pl-8" aria-label="Tìm cán bộ" autoFocus />
              </div>
              <Select value={phong} onValueChange={setPhong}>
                <SelectTrigger className="h-9 w-56"><Building2 className="mr-1 h-4 w-4 text-slate-400" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAT_CA">Tất cả các phòng</SelectItem>
                  {dsPhong.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-slate-200">
              {isLoading ? <p className="p-4 text-center text-xs text-slate-500">Đang tải danh bạ…</p>
                : hienThi.length === 0 ? <p className="p-4 text-center text-xs text-slate-500">Không có cán bộ nào khớp{daCo.size > 0 ? ' (người đã trong lớp không hiện ở đây)' : ''}.</p>
                : nhomTheoPhong.map(([pid, ds]) => {
                  const tatCa = ds.every((n) => chon.has(n.id));
                  return (
                    <div key={pid}>
                      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5">
                        <Checkbox checked={tatCa} onCheckedChange={(c) => batNhom(ds, c === true)} aria-label={`Chọn cả ${tenPhong.get(pid) ?? 'chưa xếp phòng'}`} />
                        <span className="text-xs font-semibold text-slate-700">{tenPhong.get(pid) ?? 'Chưa xếp phòng'}</span>
                        <span className="text-2xs text-slate-400">{ds.length} người · tick ô này để chọn cả phòng</span>
                      </div>
                      {ds.map((n) => (
                        <label key={n.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50">
                          <Checkbox checked={chon.has(n.id)} onCheckedChange={(c) => bat(n.id, c === true)} />
                          <span className="text-slate-800">{n.full_name}</span>
                          {n.employee_code && <span className="text-2xs text-slate-400">{n.employee_code}</span>}
                        </label>
                      ))}
                    </div>
                  );
                })}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{chon.size > 0 ? `Đã chọn ${chon.size} người` : 'Chưa chọn ai'}{chon.size > 0 && <button type="button" className="ml-2 underline" onClick={() => setChon(new Set())}>bỏ chọn</button>}</span>
              <Button onClick={() => them([...chon])} disabled={chon.size === 0 || dangThem} className="bg-brand-navy hover:bg-brand-navy/90">
                {dangThem ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />} Thêm {chon.size > 0 ? `${chon.size} người` : ''}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="dan" className="space-y-2">
            <Textarea
              value={vanBan} onChange={(e) => setVanBan(e.target.value)} rows={5}
              placeholder={'Mỗi dòng một người — tên (có dấu hay không đều được), email hoặc mã cán bộ.\nDán thẳng cột tên từ Excel cũng được, số thứ tự đầu dòng tự bỏ.'}
              className="text-sm"
            />
            {khop.dong.length > 0 && (
              <>
                <div className="max-h-[35vh] overflow-y-auto rounded-xl border border-slate-200 text-sm">
                  {khop.dong.map((d, i) => <DongXemTruoc key={i} d={d} chon={chonTrung[i]} onChon={(id) => setChonTrung((c) => ({ ...c, [i]: id }))} />)}
                </div>
                <p className="text-2xs text-slate-500">
                  {khop.themDuoc.length + (idDan.length - khop.themDuoc.length)} sẽ thêm · {khop.soDaCo} đã có · {khop.soTrungTen} trùng tên{khop.soTrungTen > 0 ? ' (chọn đúng người ở từng dòng)' : ''} · {khop.soKhongKhop} không tìm thấy trong danh bạ
                </p>
              </>
            )}
            <div className="flex justify-end">
              <Button onClick={() => them(idDan)} disabled={idDan.length === 0 || dangThem} className="bg-brand-navy hover:bg-brand-navy/90">
                {dangThem ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />} Thêm {idDan.length > 0 ? `${idDan.length} người` : ''}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function DongXemTruoc({ d, chon, onChon }: { d: DongKhop; chon?: string; onChon: (id: string) => void }) {
  if (d.ungVien.length > 1) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-amber-50 px-3 py-1.5">
        <span className="min-w-0 flex-1 truncate text-slate-700">{d.goc}</span>
        <Select value={chon ?? 'CHUA'} onValueChange={onChon}>
          <SelectTrigger className="h-8 w-64 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="CHUA">— Trùng tên, chọn đúng người —</SelectItem>
            {d.ungVien.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}{u.employee_code ? ` · ${u.employee_code}` : ''}{u.email ? ` · ${u.email}` : ''}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }
  const mau = d.daCo ? 'text-slate-400' : d.khop ? 'text-emerald-700' : 'text-red-600';
  const nhan = d.daCo ? 'đã có trong lớp' : d.khop ? `→ ${d.khop.full_name}` : 'không tìm thấy trong danh bạ';
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5">
      <span className="min-w-0 flex-1 truncate text-slate-700">{d.goc}</span>
      <span className={`shrink-0 text-xs ${mau}`}>{nhan}</span>
    </div>
  );
}

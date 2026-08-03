// Quản trị LỊCH NGHỈ LỄ của Chi nhánh.
//
// Vì sao cần nhập tay: bốn mốc lễ neo cứng vào dương lịch và hai mốc tính được
// từ âm lịch, nhưng lịch nghỉ CỤ THỂ mỗi năm — nghỉ mấy ngày, hoán đổi ngày
// nào, đi làm bù thứ Bảy nào — là do Chính phủ chốt. Máy đoán thì sai, nên máy
// chỉ nhắc trước 10 ngày còn người nhập là người quyết.
//
// Lịch nhập ở đây ảnh hưởng tới MỌI đồng hồ đếm ngày làm việc của Chi nhánh:
// tuổi chờ thẻ Kanban, tuổi chờ hồ sơ tín dụng, số ngày im lặng, và mốc phát
// thông báo. Nhập sai một ngày là cả chi nhánh cảnh báo sai một ngày.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarDays, CalendarPlus, Check, Info, Loader2, Trash2, TriangleAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLamTuoiLichNghi, useLichNghi } from '@/hooks/useLichNghi';
import { gopThanhKy, nhanKhoangNgay, type KyNghi, type LoaiNgay } from '@/lib/lichNghi';
import { conBaoNhieuNgay, mocLeTrongNam, type MocLe } from '@/lib/amLich';
import { Ct2CaiDatMocGio } from '@/components/one/move2/Ct2CaiDatMocGio';

const NGUONG_NHAC = 10;

interface FormKy {
  tu: string;
  den: string;
  ten: string;
  loai: LoaiNgay;
  ma_moc: string | null;
  ghi_chu: string;
}

const FORM_TRONG: FormKy = { tu: '', den: '', ten: '', loai: 'NGHI', ma_moc: null, ghi_chu: '' };

export default function LichNghiAdminPage() {
  const { isAdmin } = useAuth();
  const { data: ds = [], isLoading } = useLichNghi();
  const lamTuoi = useLamTuoiLichNghi();

  const [nam, setNam] = useState(() => new Date().getFullYear());
  const [form, setForm] = useState<FormKy | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [xoaNhom, setXoaNhom] = useState<KyNghi | null>(null);

  const kyNghi = useMemo(() => gopThanhKy(ds), [ds]);
  const kyTrongNam = useMemo(
    () => kyNghi.filter((k) => k.tu.startsWith(String(nam)) || k.den.startsWith(String(nam))),
    [kyNghi, nam],
  );

  // Mốc lễ của năm đang xem, kèm trạng thái đã nhập lịch chưa
  const mocLe = useMemo(() => {
    const daNhap = new Set(ds.map((n) => n.ma_moc).filter(Boolean) as string[]);
    const homNay = new Date();
    return mocLeTrongNam(nam).map((m) => ({
      ...m,
      daNhap: daNhap.has(m.ma),
      conLai: conBaoNhieuNgay(m, homNay),
    }));
  }, [ds, nam]);

  const canNhapNgay = mocLe.filter((m) => !m.daNhap && m.conLai >= 0 && m.conLai <= NGUONG_NHAC);

  const dat = <K extends keyof FormKy>(k: K, v: FormKy[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const moTuMoc = (m: MocLe) => setForm({
    ...FORM_TRONG,
    tu: m.ngay,
    den: m.ngay,
    ten: m.ten,
    ma_moc: m.ma,
    ghi_chu: m.ghiChu,
  });

  const luu = async () => {
    if (!form) return;
    if (!form.tu || !form.den) { toast.error('Chọn ngày bắt đầu và ngày kết thúc.'); return; }
    if (form.den < form.tu) { toast.error('Ngày kết thúc phải từ ngày bắt đầu trở đi.'); return; }
    if (form.ten.trim().length < 2) { toast.error('Đặt tên cho kỳ nghỉ này.'); return; }

    setDangLuu(true);
    const { data, error } = await (supabase as unknown as {
      rpc(fn: string, a: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
    }).rpc('lich_nghi_them_ky', {
      _tu: form.tu,
      _den: form.den,
      _ten: form.ten.trim(),
      _loai: form.loai,
      _ma_moc: form.ma_moc,
      _ghi_chu: form.ghi_chu.trim() || null,
    });
    setDangLuu(false);
    if (error) { toast.error(error.message ?? 'Không lưu được.'); return; }
    toast.success(`Đã lưu ${data as number} ngày.`);
    setForm(null);
    lamTuoi();
  };

  const xoa = async () => {
    if (!xoaNhom) return;
    const { error } = await (supabase as unknown as {
      rpc(fn: string, a: Record<string, unknown>): PromiseLike<{ error: { message?: string } | null }>;
    }).rpc('lich_nghi_xoa_nhom', { _nhom: xoaNhom.nhom_id });
    if (error) { toast.error(error.message ?? 'Không xóa được.'); return; }
    toast.success('Đã xóa kỳ nghỉ.');
    setXoaNhom(null);
    lamTuoi();
  };

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <CalendarDays className="h-5 w-5" /> Cài đặt ngày giờ
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Hai thứ quyết định mọi con số của Chiêu thức 2: <b>mốc giờ</b> (thế nào là đúng
          nhịp, khi nào được phép báo) và <b>lịch nghỉ</b> (ngày nào không tính là ngày làm
          việc). Đặt đúng ở đây thì tuổi chờ thẻ Kanban, tuổi chờ hồ sơ tín dụng và bảng
          tổng hợp nhịp đều đúng theo.
        </p>
      </div>

      <Ct2CaiDatMocGio />

      {canNhapNgay.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Cần nhập lịch nghỉ ngay</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1">
              {canNhapNgay.map((m) => (
                <li key={m.ma}>
                  <b>{m.ten}</b> còn {m.conLai} ngày nữa ({nhanKhoangNgay(m.ngay, m.ngay)}) mà
                  chưa có lịch nghỉ. {m.ghiChu}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Mốc lễ trong năm — bấm để nhập nhanh */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <p className="font-semibold">Mốc lễ năm {nam}</p>
            <p className="text-xs text-muted-foreground">
              Ngày gốc theo luật. Lịch nghỉ cụ thể do Chính phủ chốt — bấm vào mốc để nhập kỳ nghỉ thật.
            </p>
          </div>
          <Select value={String(nam)} onValueChange={(v) => setNam(Number(v))}>
            <SelectTrigger className="w-28" aria-label="Chọn năm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[-1, 0, 1, 2].map((d) => {
                const n = new Date().getFullYear() + d;
                return <SelectItem key={n} value={String(n)}>{n}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {mocLe.map((m) => (
            <button
              key={m.ma}
              onClick={() => moTuMoc(m)}
              className="rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted"
            >
              <p className="flex items-center gap-2 text-sm font-medium">
                {m.daNhap
                  ? <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  : <CalendarPlus className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className="flex-1">{m.ten}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {nhanKhoangNgay(m.ngay, m.ngay)}
                {m.daNhap
                  ? ' · đã có lịch nghỉ'
                  : m.conLai >= 0 ? ` · còn ${m.conLai} ngày` : ' · đã qua'}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Danh sách kỳ nghỉ đã nhập */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <p className="font-semibold">Kỳ nghỉ đã nhập cho năm {nam} ({kyTrongNam.length})</p>
          <Button size="sm" onClick={() => setForm({ ...FORM_TRONG })}>
            <CalendarPlus className="mr-1 h-4 w-4" /> Thêm kỳ nghỉ
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
            </p>
          ) : kyTrongNam.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Chưa nhập kỳ nghỉ nào cho năm {nam}. Khi chưa nhập, hệ thống chỉ trừ thứ Bảy và
              Chủ nhật — nghĩa là các kỳ nghỉ lễ sẽ bị tính nhầm thành ngày làm việc.
            </p>
          ) : (
            <div className="space-y-2">
              {kyTrongNam.map((k) => (
                <div key={k.nhom_id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {k.ten}
                      {k.loai === 'LAM_BU' && (
                        <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">Đi làm bù</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {nhanKhoangNgay(k.tu, k.den)} · {k.so_ngay} ngày
                      {k.ghi_chu ? ` · ${k.ghi_chu}` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setXoaNhom(k)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Đừng quên ngày đi làm bù</AlertTitle>
            <AlertDescription>
              Các kỳ nghỉ dài thường kèm phương án hoán đổi: nghỉ thêm ngày này, đi làm bù
              thứ Bảy khác. Nhập ngày làm bù với loại <b>«Đi làm bù»</b> để hệ thống tính
              ngày đó là ngày làm việc dù rơi vào cuối tuần.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Ô nhập */}
      <Dialog open={!!form} onOpenChange={(o) => { if (!o) setForm(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.ma_moc ? 'Nhập lịch nghỉ theo mốc lễ' : 'Thêm kỳ nghỉ'}</DialogTitle>
            <DialogDescription>
              Nhập đúng khoảng ngày Chính phủ đã công bố. Nhập đè lên ngày đã có thì hệ thống
              cập nhật, không báo lỗi.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="ln-ten">Tên kỳ nghỉ</Label>
                <Input
                  id="ln-ten" value={form.ten} onChange={(e) => dat('ten', e.target.value)}
                  placeholder="VD: Nghỉ Tết Nguyên đán Bính Ngọ"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ln-tu">Từ ngày</Label>
                  <Input id="ln-tu" type="date" value={form.tu} onChange={(e) => dat('tu', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ln-den">Đến ngày</Label>
                  <Input id="ln-den" type="date" value={form.den} onChange={(e) => dat('den', e.target.value)} />
                </div>
              </div>

              <div>
                <Label htmlFor="ln-loai">Loại</Label>
                <Select value={form.loai} onValueChange={(v) => dat('loai', v as LoaiNgay)}>
                  <SelectTrigger id="ln-loai"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGHI">Nghỉ — không tính là ngày làm việc</SelectItem>
                    <SelectItem value="LAM_BU">Đi làm bù — tính là ngày làm việc kể cả T7/CN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ln-ghichu">Ghi chú</Label>
                <Textarea
                  id="ln-ghichu" rows={2} value={form.ghi_chu}
                  onChange={(e) => dat('ghi_chu', e.target.value)}
                  placeholder="VD: Theo Thông báo của Bộ Nội vụ, hoán đổi ngày làm việc sang thứ Bảy 09/5."
                />
              </div>

              {form.tu && form.den && form.den >= form.tu && (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Sẽ ghi <b>{Math.round((Date.parse(form.den) - Date.parse(form.tu)) / 86_400_000) + 1} ngày</b>
                  {' '}({nhanKhoangNgay(form.tu, form.den)}).
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Hủy</Button>
            <Button onClick={luu} disabled={dangLuu}>
              {dangLuu && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!xoaNhom} onOpenChange={(o) => { if (!o) setXoaNhom(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa kỳ nghỉ này?</AlertDialogTitle>
            <AlertDialogDescription>
              {xoaNhom && (
                <>«{xoaNhom.ten}» ({nhanKhoangNgay(xoaNhom.tu, xoaNhom.den)}, {xoaNhom.so_ngay} ngày)
                sẽ được tính lại thành ngày làm việc bình thường. Mọi đồng hồ chờ trên toàn Chi
                nhánh sẽ đổi theo.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={xoa}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

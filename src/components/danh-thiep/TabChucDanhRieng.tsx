/**
 * TAB 3 — CHỨC DANH ĐỐI NGOẠI RIÊNG: hàng chờ duyệt của Giám đốc.
 * Cảnh báo khi chức danh đề nghị trùng ý với chức danh đã có trong từ điển
 * (so khớp mờ trên tên tiếng Anh) — tránh đẻ ra bản «riêng» của một chức danh
 * chuẩn chỉ vì cán bộ không biết từ điển đã có.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useCanBoDanhThiep, useChucDanh, useChucDanhRieng, useLamTuoiDanhThiep } from '@/hooks/useDanhThiep';
import { goiRpc } from '@/lib/danhThiep/db';
import type { ChucDanh, ChucDanhRieng } from '@/lib/danhThiep/kieu';
import { CAC_NGON_NGU, TEN_NGON_NGU } from '@/lib/danhThiep/ngonNgu';
import { boDau } from '@/lib/vietnamese';
import { HuyHieuTrangThai } from './HuyHieuTrangThai';

/** Hệ số Dice trên bigram — đủ để bắt «Head of FDI Desk» ~ «Head of FDI Banking». */
export function doGiongNhau(a: string, b: string): number {
  const bigram = (s: string) => {
    const t = boDau(s).replace(/[^a-z0-9 ]/g, '');
    const out = new Map<string, number>();
    for (let i = 0; i < t.length - 1; i++) {
      const g = t.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };
  const x = bigram(a);
  const y = bigram(b);
  if (!x.size || !y.size) return 0;
  let chung = 0;
  for (const [g, n] of x) chung += Math.min(n, y.get(g) ?? 0);
  let tongX = 0; let tongY = 0;
  for (const n of x.values()) tongX += n;
  for (const n of y.values()) tongY += n;
  return (2 * chung) / (tongX + tongY);
}

/** Chức danh trong từ điển giống với đề nghị (≥ 0,6 theo tên EN hoặc VI). */
export function chucDanhTrung(de: { name_en: string | null; name_vi: string }, tuDien: ChucDanh[]): ChucDanh[] {
  return tuDien
    .filter((c) => c.scope === 'external' && c.status !== 'retired')
    .map((c) => ({
      c,
      diem: Math.max(
        de.name_en && c.name_en ? doGiongNhau(de.name_en, c.name_en) : 0,
        doGiongNhau(de.name_vi, c.name_vi),
      ),
    }))
    .filter((x) => x.diem >= 0.6)
    .sort((a, b) => b.diem - a.diem)
    .slice(0, 3)
    .map((x) => x.c);
}

function ngayVn(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function TabChucDanhRieng() {
  const { roles } = useAuth();
  const laGiamDoc = roles.includes('bgd') || roles.includes('system_admin');
  const { data: ds = [], isLoading } = useChucDanhRieng();
  const { data: canBo = [] } = useCanBoDanhThiep();
  const { data: tuDien = [] } = useChucDanh();
  const lamTuoi = useLamTuoiDanhThiep();
  const [tuChoi, setTuChoi] = useState<ChucDanhRieng | null>(null);
  const [lyDo, setLyDo] = useState('');
  const [dangXuLy, setDangXuLy] = useState<string | null>(null);

  const tenCanBo = useMemo(() => new Map(canBo.map((c) => [c.id, c])), [canBo]);
  const choDuyet = ds.filter((d) => d.status === 'pending');
  const daXuLy = ds.filter((d) => d.status !== 'pending');

  const duyet = async (d: ChucDanhRieng, dongY: boolean, ly?: string) => {
    setDangXuLy(d.id);
    try {
      await goiRpc('nc_duyet_chuc_danh_rieng', { _id: d.id, _duyet: dongY, _ly_do: ly ?? null });
      toast.success(dongY ? 'Đã duyệt — thẻ của cán bộ đổi sang chức danh riêng ngay' : 'Đã từ chối đề nghị');
      setTuChoi(null);
      setLyDo('');
      lamTuoi();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDangXuLy(null);
    }
  };

  const The = ({ d }: { d: ChucDanhRieng }) => {
    const cb = tenCanBo.get(d.staff_id);
    const trung = d.status === 'pending' ? chucDanhTrung(d, tuDien) : [];
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{cb?.full_name ?? 'Cán bộ (không đọc được tên)'}</p>
              <p className="text-xs text-muted-foreground">
                Gửi {ngayVn(d.requested_at)}{d.expires_on ? ` · hết hạn ${ngayVn(d.expires_on)}` : ' · không thời hạn'}
              </p>
            </div>
            <HuyHieuTrangThai tt={d.status} />
          </div>
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {CAC_NGON_NGU.map((l) => {
              const v = d[`name_${l}` as const];
              return (
                <div key={l} className="flex gap-2">
                  <dt className="w-24 shrink-0 text-xs text-muted-foreground">{TEN_NGON_NGU[l]}</dt>
                  <dd lang={l.replace('_', '-')}>{v || <span className="text-muted-foreground">—</span>}</dd>
                </div>
              );
            })}
          </dl>
          <p className="text-sm"><span className="text-muted-foreground">Lý do: </span>{d.reason}</p>
          {d.reject_reason && <p className="text-sm text-destructive">Từ chối: {d.reject_reason}</p>}
          {trung.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
              <TriangleAlert className="mr-1 inline h-3.5 w-3.5" />
              Có thể trùng ý với chức danh đã có trong từ điển:{' '}
              {trung.map((c) => <Badge key={c.id} variant="outline" className="mr-1 border-amber-400">{c.code} · {c.name_en ?? c.name_vi}</Badge>)}
              — cân nhắc gán chức danh chuẩn thay vì tạo bản riêng.
            </div>
          )}
          {d.status === 'pending' && (
            <div className="flex gap-2">
              <Button size="sm" disabled={!laGiamDoc || dangXuLy === d.id} onClick={() => duyet(d, true)}
                title={laGiamDoc ? undefined : 'Chỉ Giám đốc duyệt chức danh riêng'}>
                <Check className="mr-1 h-4 w-4" /> Duyệt
              </Button>
              <Button size="sm" variant="outline" disabled={!laGiamDoc || dangXuLy === d.id} onClick={() => { setTuChoi(d); setLyDo(''); }}>
                <X className="mr-1 h-4 w-4" /> Từ chối
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      {!laGiamDoc && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Hàng chờ này do <b>Giám đốc Chi nhánh</b> duyệt. Phòng TCTH xem để theo dõi và nhắc cán bộ bổ sung bản dịch.
        </p>
      )}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Chờ duyệt ({choDuyet.length})</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
        {!isLoading && choDuyet.length === 0 && <p className="text-sm text-muted-foreground">Không có đề nghị nào đang chờ.</p>}
        <div className="grid gap-3 lg:grid-cols-2">{choDuyet.map((d) => <The key={d.id} d={d} />)}</div>
      </section>
      {daXuLy.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Đã xử lý ({daXuLy.length})</h2>
          <div className="grid gap-3 lg:grid-cols-2">{daXuLy.map((d) => <The key={d.id} d={d} />)}</div>
        </section>
      )}

      <Dialog open={!!tuChoi} onOpenChange={(o) => { if (!o) setTuChoi(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đề nghị chức danh riêng</DialogTitle>
            <DialogDescription>Lý do sẽ hiện cho cán bộ ở màn «Danh thiếp của tôi».</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: Dùng chức danh chuẩn «Korea Desk Manager» trong từ điển" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTuChoi(null)}>Hủy</Button>
            <Button variant="destructive" disabled={!lyDo.trim() || !!dangXuLy} onClick={() => tuChoi && duyet(tuChoi, false, lyDo.trim())}>Từ chối</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

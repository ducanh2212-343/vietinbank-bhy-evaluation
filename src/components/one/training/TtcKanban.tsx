import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { mucChuY, soNgayQuaHan, type Ct2DauViec } from '@/lib/ct2';
import { TTC_COT, chiaCotBangViec, huyHieuGoiDau, type TtcCot, type TtcViecGoiDau } from '@/lib/trainingCenter';
import { Ct2CardDialog } from '@/components/one/move2/Ct2CardDialog';
import { Ct2PlanDialog } from '@/components/one/move2/Ct2PlanDialog';
import { useCt2LamTuoi, useCt2NhanSu } from '@/components/one/move2/useCt2Data';
import { useTtcKanban, useTtcLamTuoi } from './useTrainingCenter';

/**
 * KANBAN HÀNG NGÀY của học viên trên Training Center.
 *
 * Thẻ ở đây là thẻ THẬT của Chiêu thức 2 — không có bảng việc thứ hai. Học viên
 * (và cán bộ được giao ba việc gối đầu) ghi nhịp ở Chiêu thức 2 như mọi người
 * trong Phòng; Training Center chỉ bày lại theo ba cột Phải làm – Đang làm –
 * Hoàn thành và gắn huy hiệu ①②③ lên đúng ba thẻ gối đầu, để Ban Giám đốc mở
 * trang chủ Training Center là thấy ngay ba việc đó đang ở cột nào.
 *
 * Mở thẻ dùng lại đúng hộp thoại của Chiêu thức 2: ai có quyền ghi nhịp thì
 * ghi được tại đây, ai chỉ xem thì thấy đủ mạch báo cáo — RLS của ct2_* quyết.
 */
export function TtcKanban({ ctId, hocVienId, dsGoiDau, gon = false }: {
  ctId: string | null;
  hocVienId: string | null;
  dsGoiDau: TtcViecGoiDau[];
  /** Bản gọn cho trang chủ: cột Hoàn thành gấp lại, không tiêu đề lớn */
  gon?: boolean;
}) {
  const { isAdmin, isManager, isPgd } = useAuth();
  const isMobile = useIsMobile();
  const lamTuoiCt2 = useCt2LamTuoi();
  const lamTuoiTtc = useTtcLamTuoi();
  const { data: dsThe = [], isLoading, isError } = useTtcKanban(ctId, hocVienId);
  const { data: nhanSu = [] } = useCt2NhanSu();

  const [theMo, setTheMo] = useState<Ct2DauViec | null>(null);
  const [theLapKeHoach, setTheLapKeHoach] = useState<Ct2DauViec | null>(null);
  const [khoiDongLuon, setKhoiDongLuon] = useState(true);
  const [moXong, setMoXong] = useState(!gon);

  const theoCot = useMemo(() => chiaCotBangViec(dsThe), [dsThe]);
  const huyHieu = useMemo(() => huyHieuGoiDau(dsGoiDau), [dsGoiDau]);
  const theDangMo = useMemo(
    () => (theMo ? dsThe.find((t) => t.id === theMo.id) ?? theMo : null),
    [theMo, dsThe],
  );
  const lamTuoi = () => { lamTuoiCt2(); lamTuoiTtc(); };

  if (isError) {
    return <p className="text-sm text-slate-500">Chưa đọc được bảng việc từ Chiêu thức 2.</p>;
  }
  if (isLoading) return <Skeleton className="h-48 rounded-2xl" />;

  const Cot = ({ ma }: { ma: TtcCot }) => {
    const cot = TTC_COT.find((c) => c.ma === ma)!;
    const ds = theoCot.get(ma) ?? [];
    const gapDuoc = ma === 'HOAN_THANH' && (isMobile || gon);
    const dangMo = !gapDuoc || moXong;
    return (
      <div className={isMobile ? '' : 'rounded-xl bg-slate-50 p-2'}>
        {gapDuoc ? (
          <button
            type="button"
            onClick={() => setMoXong((v) => !v)}
            className="flex w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600"
          >
            {cot.icon} {cot.ten} <span className="text-slate-400">({ds.length})</span>
            <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${dangMo ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <p className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600">
            {cot.icon} {cot.ten} <span className="text-slate-400">({ds.length})</span>
          </p>
        )}
        {dangMo && (
          <div className="mt-2 space-y-2">
            {ds.length === 0 && <p className="px-1 text-xs text-slate-400">Không có việc nào.</p>}
            {ds.map((t) => {
              const muc = mucChuY(t);
              const tre = soNgayQuaHan(t);
              const so = huyHieu.get(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheMo(t)}
                  className={`w-full rounded-xl border bg-white p-2.5 text-left transition hover:border-brand-navy/40 ${
                    so ? 'border-[#A8763E]/60 ring-1 ring-[#A8763E]/30' : muc === 'DO' ? 'border-red-200' : muc === 'VANG' ? 'border-amber-200' : 'border-slate-200'
                  }`}
                >
                  <span className="flex items-start gap-1.5">
                    {so ? (
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#A8763E] text-2xs font-black text-white" title={`Việc gối đầu số ${so}`}>
                        {so}
                      </span>
                    ) : (
                      <span className="shrink-0 text-sm leading-5">
                        {muc === 'DO' ? '🔴' : muc === 'VANG' ? '🟡' : muc === 'XONG' ? '✅' : '🟢'}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-800 line-clamp-2">{t.tieu_de}</span>
                  </span>
                  <span className="mt-1 block text-2xs text-slate-500">
                    {t.ma_hien_thi ? `${t.ma_hien_thi} · ` : ''}{t.phan_tram}%
                    {t.han_hoan_thanh ? ` · hạn ${t.han_hoan_thanh.slice(8, 10)}/${t.han_hoan_thanh.slice(5, 7)}` : ''}
                    {tre > 0 && <span className="font-semibold text-red-600"> · trễ {tre} ngày</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={gon ? '' : 'rounded-2xl border border-brand-navy/20 bg-white p-4 shadow-sm sm:p-5'}>
      {!gon && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-brand-red">
              <Columns3 className="h-4 w-4" /> Kanban hàng ngày
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Thẻ thật từ Chiêu thức 2 của học viên. Ba thẻ mang huy hiệu ①②③ là ba việc gối đầu giao cho cán bộ.
            </p>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link to="/one/chieu-thuc-2">Mở Chiêu thức 2 <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      )}

      {dsThe.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
          Chưa có thẻ nào. Học viên ghi việc ở Chiêu thức 2 (Ngày 5: chuyển 30 việc từ JD lên bảng) — thẻ tự hiện ở đây.
        </p>
      ) : isMobile ? (
        <div className="space-y-3">{TTC_COT.map((c) => <Cot key={c.ma} ma={c.ma} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">{TTC_COT.map((c) => <Cot key={c.ma} ma={c.ma} />)}</div>
      )}

      <Ct2CardDialog
        the={theLapKeHoach ? null : theDangMo}
        nhanSu={nhanSu}
        laLanhDao={isAdmin || isPgd || isManager}
        chuyenDen={null}
        onLapKeHoach={(deKhoiDong) => { setKhoiDongLuon(deKhoiDong); setTheLapKeHoach(theDangMo); }}
        onClose={() => setTheMo(null)}
        onXong={lamTuoi}
      />
      <Ct2PlanDialog
        the={theLapKeHoach}
        deKhoiDong={khoiDongLuon}
        onClose={() => setTheLapKeHoach(null)}
        onXong={() => { setTheLapKeHoach(null); setTheMo(null); lamTuoi(); }}
      />
    </div>
  );
}

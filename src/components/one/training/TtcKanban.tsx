import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, ChevronDown, Columns3, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { CT2_COT, cotHienThi, mucChuY, soNgayQuaHan, type Ct2DauViec } from '@/lib/ct2';
import {
  TTC_COT, chiaCotBangViec, chuyenCotPhieu, huyHieuGoiDau, nhanTrangThaiPhieu, trangThaiDiemKiem,
  type TtcCot, type TtcTrangThaiPhieu, type TtcViecGoiDau,
} from '@/lib/trainingCenter';
import { Ct2CardDialog } from '@/components/one/move2/Ct2CardDialog';
import { Ct2PlanDialog } from '@/components/one/move2/Ct2PlanDialog';
import { useCt2LamTuoi, useCt2NhanSu } from '@/components/one/move2/useCt2Data';
import { chuyenCotPhieuGiaoViec, useTtcKanban, useTtcLamTuoi } from './useTrainingCenter';

/** Cột Kanban của một phiếu giao việc — trạng thái riêng của phiếu, không mượn thẻ Chiêu thức 2 */
const COT_CUA_PHIEU: Record<TtcTrangThaiPhieu, TtcCot> = { phai_lam: 'PHAI_LAM', dang_lam: 'DANG_LAM', hoan_thanh: 'HOAN_THANH' };

/**
 * KANBAN HÀNG NGÀY của học viên trên Training Center.
 *
 * Hai loại thẻ chung ba cột Phải làm – Đang làm – Hoàn thành:
 *  - Thẻ ①②③ là ba PHIẾU GIAO VIỆC — cột do trạng thái riêng của phiếu quyết
 *    (Mục 10 bản mô tả 06/09): sang Đang làm phải đủ bảy ô và đã khoá chuẩn,
 *    sang Hoàn thành chỉ khi nghiệm thu Đạt, đã Hoàn thành thì không kéo lại.
 *    Trigger ở máy chủ chặn lần nữa; câu báo ở đây trùng từng chữ với máy chủ.
 *  - Các thẻ còn lại là thẻ THẬT của Chiêu thức 2 — không có bảng việc thứ
 *    hai. Thẻ Chiêu thức 2 đã liên kết với một phiếu không hiện thêm lần nữa;
 *    nó nằm trong thẻ phiếu dưới dạng dòng «thẻ CT2 · cột · %» bấm mở được.
 *
 * Mở thẻ dùng lại đúng hộp thoại của Chiêu thức 2: ai có quyền ghi nhịp thì
 * ghi được tại đây, ai chỉ xem thì thấy đủ mạch báo cáo — RLS của ct2_* quyết.
 */
export function TtcKanban({ ctId, hocVienId, dsGoiDau, gon = false, keoDuoc = false }: {
  ctId: string | null;
  hocVienId: string | null;
  dsGoiDau: TtcViecGoiDau[];
  /** Bản gọn cho trang chủ: cột Hoàn thành gấp lại, không tiêu đề lớn */
  gon?: boolean;
  /** Người giao việc (học viên) được chuyển cột thẻ phiếu */
  keoDuoc?: boolean;
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
  const [dangChuyen, setDangChuyen] = useState<string | null>(null);

  const huyHieu = useMemo(() => huyHieuGoiDau(dsGoiDau), [dsGoiDau]);
  // Thẻ CT2 đã gắn vào phiếu thì không bày thêm — tránh một việc hiện hai thẻ ở hai cột khác nhau
  const theoCot = useMemo(() => chiaCotBangViec(dsThe.filter((t) => !huyHieu.has(t.id))), [dsThe, huyHieu]);
  const theCt2 = useMemo(() => new Map(dsThe.map((t) => [t.id, t])), [dsThe]);
  const phieuTheoCot = useMemo(() => {
    const m = new Map<TtcCot, TtcViecGoiDau[]>();
    for (const g of [...dsGoiDau].sort((a, b) => a.so - b.so)) {
      const cot = COT_CUA_PHIEU[g.trang_thai] ?? 'PHAI_LAM';
      m.set(cot, [...(m.get(cot) ?? []), g]);
    }
    return m;
  }, [dsGoiDau]);

  const chuyenPhieu = async (g: TtcViecGoiDau, dich: TtcTrangThaiPhieu) => {
    const loi = chuyenCotPhieu(g, dich);
    if (loi) { toast.error(loi); return; }
    setDangChuyen(g.id);
    try {
      await chuyenCotPhieuGiaoViec(g.id, dich);
      lamTuoiTtc();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không chuyển được thẻ');
    } finally { setDangChuyen(null); }
  };
  const theDangMo = useMemo(
    () => (theMo ? dsThe.find((t) => t.id === theMo.id) ?? theMo : null),
    [theMo, dsThe],
  );
  const lamTuoi = () => { lamTuoiCt2(); lamTuoiTtc(); };

  if (isError) {
    return <p className="text-sm text-slate-500">Chưa đọc được bảng việc từ Chiêu thức 2.</p>;
  }
  if (isLoading) return <Skeleton className="h-48 rounded-2xl" />;

  const ThePhieu = ({ g }: { g: TtcViecGoiDau }) => {
    const lk = g.dau_viec_id ? theCt2.get(g.dau_viec_id) ?? null : null;
    const cotLk = lk ? CT2_COT.find((c) => c.ma === cotHienThi(lk.trang_thai)) : null;
    const diemKiem = g.trang_thai === 'dang_lam' ? trangThaiDiemKiem(g) : null;
    const mauDiemKiem = diemKiem?.muc === 'DO' ? 'text-red-600 font-semibold' : diemKiem?.muc === 'CANH_BAO' ? 'text-amber-700 font-semibold' : 'text-slate-500';
    return (
      <div className="rounded-xl border border-[#A8763E]/60 bg-white p-2.5 ring-1 ring-[#A8763E]/30">
        <div className="flex items-start gap-1.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#A8763E] text-2xs font-black text-white" title={`Việc gối đầu số ${g.so}`}>
            {g.so}
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-800 line-clamp-2">{g.ten}</span>
        </div>
        <p className="mt-1 text-2xs text-slate-500">{nhanTrangThaiPhieu(g)}</p>
        {diemKiem && <p className={`mt-0.5 text-2xs ${mauDiemKiem}`}>{diemKiem.chu}</p>}
        {lk && (
          <button
            type="button"
            onClick={() => setTheMo(lk)}
            className="mt-1.5 flex w-full items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-left text-2xs text-slate-600 hover:bg-slate-100"
          >
            <Link2 className="h-3 w-3 shrink-0 text-brand-navy" />
            <span className="truncate">{lk.ma_hien_thi ?? 'Thẻ CT2'} · {lk.tieu_de}</span>
            <span className="ml-auto shrink-0 font-semibold">{cotLk?.icon} {lk.phan_tram}%</span>
          </button>
        )}
        {keoDuoc && g.trang_thai !== 'hoan_thanh' && (
          <div className="mt-2 flex justify-end">
            {g.trang_thai === 'phai_lam' ? (
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={dangChuyen === g.id} onClick={() => chuyenPhieu(g, 'dang_lam')}>
                Chuyển sang Đang làm <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500" disabled={dangChuyen === g.id} onClick={() => chuyenPhieu(g, 'phai_lam')}>
                <ArrowLeft className="mr-1 h-3 w-3" /> Về Phải làm
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const Cot = ({ ma }: { ma: TtcCot }) => {
    const cot = TTC_COT.find((c) => c.ma === ma)!;
    const ds = theoCot.get(ma) ?? [];
    const dsPhieu = phieuTheoCot.get(ma) ?? [];
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
            {cot.icon} {cot.ten} <span className="text-slate-400">({dsPhieu.length + ds.length})</span>
            <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${dangMo ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <p className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600">
            {cot.icon} {cot.ten} <span className="text-slate-400">({dsPhieu.length + ds.length})</span>
          </p>
        )}
        {dangMo && (
          <div className="mt-2 space-y-2">
            {dsPhieu.length === 0 && ds.length === 0 && <p className="px-1 text-xs text-slate-400">Không có việc nào.</p>}
            {dsPhieu.map((g) => <ThePhieu key={g.id} g={g} />)}
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
              Ba thẻ mang huy hiệu ①②③ là ba phiếu giao việc; các thẻ còn lại là thẻ thật từ Chiêu thức 2 của học viên.
            </p>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link to="/one/chieu-thuc-2">Mở Chiêu thức 2 <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      )}

      {dsThe.length === 0 && dsGoiDau.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
          Chưa có thẻ nào. Lập phiếu giao việc ở Bảng việc, hoặc ghi việc ở Chiêu thức 2 — thẻ tự hiện ở đây.
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

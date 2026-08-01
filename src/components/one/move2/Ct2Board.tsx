import { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { AlertTriangle, Clock3, Handshake, Star, User2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  CT2_COT, CT2_NGUONG_TUOI_CHO, CT2_NGUONG_WIP, chuanBiQuaLau, demWip,
  sapXepThe, soNgayImLang, soNgayQuaHan, tuoiCho,
  type Ct2Co, type Ct2DauViec, type Ct2TrangThai,
} from '@/lib/ct2';
import type { Ct2NhanSu, Ct2NhipNguoi } from './useCt2Data';

/**
 * Bàn Kanban 7 cột chuẩn toàn Chi nhánh (đặc tả §4).
 *
 * Kéo–thả đổi cột; các cổng chặn (P/C/A, quyền lãnh đạo, cột chờ cần người
 * giữ) kiểm ngay tại client cho mượt — database vẫn chặn lần cuối. Viền thẻ
 * theo cờ tình trạng, KHÔNG cho tự chọn màu tùy tiện.
 */

interface Props {
  dsThe: Ct2DauViec[];
  nhanSu: Ct2NhanSu[];
  nhipNguoi: Ct2NhipNguoi[];
  laLanhDao: boolean;
  onMoThe: (the: Ct2DauViec) => void;
  /** Chuyển trạng thái cần thêm thông tin (người giữ / lý do) → mở hộp thoại */
  onKeoThe: (the: Ct2DauViec, den: Ct2TrangThai) => void;
}

const VIEN_CO: Record<Ct2Co, string> = {
  XANH: 'border-l-emerald-500',
  VANG: 'border-l-amber-500',
  DO: 'border-l-red-500',
};

export function Ct2Board({ dsThe, nhanSu, nhipNguoi, laLanhDao, onMoThe, onKeoThe }: Props) {
  const { profileId } = useAuth();
  const [locNguoi, setLocNguoi] = useState<string | null>(null);
  const [locCo, setLocCo] = useState<Ct2Co | null>(null);
  const [chiQuaHan, setChiQuaHan] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Điện thoại: chạm giữ 400ms để kéo (đặc tả §4.2), lướt dọc bình thường
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 8 } }),
  );

  const tenNguoi = useMemo(
    () => new Map(nhanSu.map((n) => [n.id, n.full_name])),
    [nhanSu],
  );
  const wip = useMemo(() => demWip(dsThe), [dsThe]);

  const daLoc = useMemo(() => dsThe.filter((t) =>
    (!locNguoi || t.nguoi_chiu_trach_nhiem === locNguoi)
    && (!locCo || t.co_tinh_trang === locCo)
    && (!chiQuaHan || soNgayQuaHan(t) > 0),
  ), [dsThe, locNguoi, locCo, chiQuaHan]);

  const theoCot = useMemo(() => {
    const m = new Map<Ct2TrangThai, Ct2DauViec[]>();
    for (const cot of CT2_COT) m.set(cot.ma, []);
    // Loại THƯỜNG TRỰC không vào luồng Kanban tiến trình (đặc tả §2.2)
    for (const t of daLoc.filter((x) => x.loai_dau_viec === 'TIEN_TRINH')) {
      m.get(t.trang_thai)?.push(t);
    }
    for (const [k, v] of m) m.set(k, sapXepThe(v));
    return m;
  }, [daLoc]);

  const thuongTruc = useMemo(
    () => daLoc.filter((x) => x.loai_dau_viec === 'THUONG_TRUC' && x.trang_thai !== 'DA_DONG'),
    [daLoc],
  );

  // Bảng nhịp hôm nay: chỉ số đầu bảng (đặc tả §7.2)
  const tongNhip = useMemo(() => {
    const coViec = nhipNguoi.filter((n) => n.ket_qua !== 'KHONG_CO_VIEC');
    const daDu = coViec.filter((n) => n.ket_qua === 'DUNG_GIO' || n.ket_qua === 'MUON').length;
    return {
      tiLe: coViec.length ? Math.round((daDu / coViec.length) * 100) : 100,
      theDo: dsThe.filter((t) => t.co_tinh_trang === 'DO' && t.trang_thai !== 'DA_DONG' && t.trang_thai !== 'DUNG_HUY').length,
      quaHan: dsThe.filter((t) => soNgayQuaHan(t) > 0).length,
      nghenCho: dsThe.filter((t) => tuoiCho(t) > CT2_NGUONG_TUOI_CHO).length,
    };
  }, [nhipNguoi, dsThe]);

  const handleDrag = (e: DragEndEvent) => {
    const the = dsThe.find((t) => t.id === e.active.id);
    const den = e.over?.id as Ct2TrangThai | undefined;
    if (!the || !den || the.trang_thai === den) return;
    const laChuThe = the.nguoi_chiu_trach_nhiem === profileId;
    if (!laLanhDao && !laChuThe) {
      toast.error('Chỉ người phụ trách hoặc lãnh đạo Phòng kéo được thẻ này.');
      return;
    }
    onKeoThe(the, den);
  };

  return (
    <div>
      {/* Dải chỉ số đầu trang */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <OSo nhan="Nhịp hôm nay" giaTri={`${tongNhip.tiLe}%`} tot={tongNhip.tiLe >= 80} />
        <OSo nhan="Thẻ 🔴 đang vướng" giaTri={String(tongNhip.theDo)} tot={tongNhip.theDo === 0} />
        <OSo nhan="Thẻ quá hạn" giaTri={String(tongNhip.quaHan)} tot={tongNhip.quaHan === 0} />
        <OSo nhan={`Nghẽn cột chờ > ${CT2_NGUONG_TUOI_CHO} ngày`} giaTri={String(tongNhip.nghenCho)} tot={tongNhip.nghenCho === 0} />
      </div>

      {/* Bộ lọc chip */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
          value={locNguoi ?? ''}
          onChange={(e) => setLocNguoi(e.target.value || null)}
          aria-label="Lọc theo người phụ trách"
        >
          <option value="">Mọi người phụ trách</option>
          {[...new Set(dsThe.map((t) => t.nguoi_chiu_trach_nhiem))].map((id) => (
            <option key={id} value={id}>{tenNguoi.get(id) ?? '—'}</option>
          ))}
        </select>
        {(['XANH', 'VANG', 'DO'] as Ct2Co[]).map((co) => (
          <Button
            key={co} size="sm" variant={locCo === co ? 'default' : 'outline'}
            className="h-8 px-2 text-xs"
            onClick={() => setLocCo(locCo === co ? null : co)}
          >
            {co === 'XANH' ? '🟢' : co === 'VANG' ? '🟡' : '🔴'}
          </Button>
        ))}
        <Button
          size="sm" variant={chiQuaHan ? 'default' : 'outline'} className="h-8 px-2 text-xs"
          onClick={() => setChiQuaHan(!chiQuaHan)}
        >
          Quá hạn
        </Button>
        {locNguoi && (wip.get(locNguoi) ?? 0) >= CT2_NGUONG_WIP && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            Đang cầm {wip.get(locNguoi)} việc «Đang làm» — vượt ngưỡng {CT2_NGUONG_WIP}
          </span>
        )}
      </div>

      {/* 7 cột Kanban — cuộn ngang trong khung riêng, trang không vỡ */}
      <DndContext sensors={sensors} onDragEnd={handleDrag}>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {CT2_COT.map((cot) => (
              <CotKanban
                key={cot.ma}
                cot={cot}
                dsThe={theoCot.get(cot.ma) ?? []}
                tenNguoi={tenNguoi}
                wip={wip}
                onMoThe={onMoThe}
              />
            ))}
          </div>
        </div>
      </DndContext>

      {/* Việc THƯỜNG TRỰC: bảng chỉ số riêng, không đòi nhịp hằng ngày */}
      {thuongTruc.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-brand-navy">
            Việc thường trực ({thuongTruc.length}) — vận hành lặp, không tính vào nhịp sáng
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {thuongTruc.map((t) => (
              <button
                key={t.id}
                onClick={() => onMoThe(t)}
                className="rounded-xl border border-slate-200 bg-white p-3 text-left text-sm hover:border-brand-navy/40"
              >
                <span className="font-medium text-slate-800">{t.tieu_de}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {tenNguoi.get(t.nguoi_chiu_trach_nhiem) ?? '—'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bảng nhịp theo người (đặc tả §7.2) */}
      {nhipNguoi.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Cán bộ</th>
                <th className="px-3 py-2 text-center">Thẻ đang chạy</th>
                <th className="px-3 py-2 text-center">Đã ghi hôm nay</th>
                <th className="px-3 py-2">Nhịp</th>
              </tr>
            </thead>
            <tbody>
              {nhipNguoi.map((n) => (
                <tr key={n.profile_id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium text-slate-800">{n.full_name}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{n.so_viec_dang_chay}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{n.so_viec_da_ghi}</td>
                  <td className="px-3 py-2">
                    {n.ket_qua === 'DUNG_GIO' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">✅ Đúng nhịp</Badge>}
                    {n.ket_qua === 'MUON' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">🟡 Nhịp muộn</Badge>}
                    {n.ket_qua === 'CHUA_DU' && <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Chưa đủ nhịp</Badge>}
                    {n.ket_qua === 'KHONG_CO_VIEC' && <span className="text-xs text-slate-400">Không có việc cần ghi</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OSo({ nhan, giaTri, tot }: { nhan: string; giaTri: string; tot: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className={`text-2xl font-bold tabular-nums ${tot ? 'text-emerald-600' : 'text-red-600'}`}>{giaTri}</p>
      <p className="mt-0.5 text-xs text-slate-500">{nhan}</p>
    </div>
  );
}

function CotKanban({ cot, dsThe, tenNguoi, wip, onMoThe }: {
  cot: (typeof CT2_COT)[number];
  dsThe: Ct2DauViec[];
  tenNguoi: Map<string, string>;
  wip: Map<string, number>;
  onMoThe: (t: Ct2DauViec) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cot.ma });
  return (
    <div
      ref={setNodeRef}
      className={`w-64 shrink-0 rounded-2xl border p-2 transition-colors ${
        isOver ? 'border-brand-navy bg-blue-50/60' : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <p className="flex items-center justify-between px-1 py-1 text-xs font-semibold text-brand-navy">
        <span>{cot.icon} {cot.ten}</span>
        <span className="tabular-nums text-slate-400">{dsThe.length}</span>
      </p>
      <div className="mt-1 flex flex-col gap-2">
        {dsThe.map((t) => (
          <TheKanban key={t.id} the={t} tenNguoi={tenNguoi} wip={wip} onMo={() => onMoThe(t)} />
        ))}
        {dsThe.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
            Trống
          </p>
        )}
      </div>
    </div>
  );
}

function TheKanban({ the, tenNguoi, wip, onMo }: {
  the: Ct2DauViec;
  tenNguoi: Map<string, string>;
  wip: Map<string, number>;
  onMo: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: the.id });
  const quaHan = soNgayQuaHan(the);
  const imLang = soNgayImLang(the);
  const cho = tuoiCho(the);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onMo}
      className={`cursor-pointer rounded-xl border border-l-4 bg-white p-2.5 text-left shadow-sm transition hover:shadow ${VIEN_CO[the.co_tinh_trang]} ${isDragging ? 'opacity-40' : ''}`}
    >
      <p className="flex items-start justify-between gap-1">
        <span className="text-2xs font-mono text-slate-400">{the.ma_hien_thi}</span>
        <span className="flex shrink-0 items-center gap-1">
          {the.muc_uu_tien === 'TRONG_DIEM_BGD' && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          {the.lien_phong && <Handshake className="h-3.5 w-3.5 text-blue-500" />}
        </span>
      </p>
      <p className="mt-0.5 line-clamp-3 text-sm font-medium leading-snug text-slate-800">{the.tieu_de}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-navy" style={{ width: `${the.phan_tram}%` }} />
      </div>
      <p className="mt-1.5 flex items-center justify-between text-2xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <User2 className="h-3 w-3" />
          {tenNguoi.get(the.nguoi_chiu_trach_nhiem) ?? '—'}
          {(wip.get(the.nguoi_chiu_trach_nhiem) ?? 0) >= CT2_NGUONG_WIP && the.trang_thai === 'DANG_LAM' && (
            <span title={`Vượt ngưỡng WIP ${CT2_NGUONG_WIP}`}>⚠️</span>
          )}
        </span>
        <span className="tabular-nums">{the.phan_tram}%</span>
      </p>
      {(quaHan > 0 || imLang >= 3 || cho > CT2_NGUONG_TUOI_CHO || chuanBiQuaLau(the)) && (
        <p className="mt-1.5 flex flex-wrap gap-1">
          {quaHan > 0 && <Nhan mau="red">Quá hạn {quaHan} ngày</Nhan>}
          {imLang >= 3 && <Nhan mau="amber">Im lặng {imLang} ngày</Nhan>}
          {cho > CT2_NGUONG_TUOI_CHO && (
            <Nhan mau="red">
              <Clock3 className="mr-0.5 inline h-3 w-3" />
              Chờ {cho} ngày — {tenNguoi.get(the.nguoi_dang_giu ?? '') ?? 'chưa rõ ai giữ'}
            </Nhan>
          )}
          {chuanBiQuaLau(the) && <Nhan mau="amber">Chưa khởi động, sắp cạn quỹ thời gian</Nhan>}
        </p>
      )}
    </div>
  );
}

function Nhan({ mau, children }: { mau: 'red' | 'amber'; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-2xs font-medium ${
      mau === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
    }`}>
      {children}
    </span>
  );
}

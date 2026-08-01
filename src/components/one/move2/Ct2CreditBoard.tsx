import { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { AlertTriangle, Banknote, CalendarClock, Plus, User2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import {
  HS_COT, HS_TEN_CAP, HS_TEN_LOAI, canhBaoHoSo, dinhDangTien, hsTuoiCho,
  sapXepHoSo, tongTheoBuoc,
  type HoSoTinDung, type HsTrangThai,
} from '@/lib/ct2TinDung';
import type { Ct2NhanSu } from './useCt2Data';
import type { HoSoSapDenHan } from './useCt2TinDung';

/**
 * Bàn Kanban Phê duyệt tín dụng — 7 cột theo đúng quy trình phê duyệt mà
 * Phòng KHDN đang chạy trên Miro, nhưng dữ liệu có cấu trúc nên tính được
 * những thứ bản Miro không tính được:
 *  · tổng dư nợ đang nằm ở từng bước (số tiền là SỐ, không phải nhãn chữ)
 *  · hạn mức sắp đến hạn mà chưa có hồ sơ tái cấp nào đang chạy
 *  · tuổi chờ ở từng cấp trình, với ngưỡng riêng cho mỗi cấp
 */

interface Props {
  dsHoSo: HoSoTinDung[];
  sapDenHan: HoSoSapDenHan[];
  nhanSu: Ct2NhanSu[];
  laLanhDao: boolean;
  dangTai: boolean;
  onMoHoSo: (h: HoSoTinDung) => void;
  onKeoHoSo: (h: HoSoTinDung, den: HsTrangThai) => void;
  onTaoMoi: () => void;
}

export function Ct2CreditBoard({
  dsHoSo, sapDenHan, nhanSu, laLanhDao, dangTai, onMoHoSo, onKeoHoSo, onTaoMoi,
}: Props) {
  const { profileId } = useAuth();
  const [locCanBo, setLocCanBo] = useState<string | null>(null);
  const [chiRuiRo, setChiRuiRo] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 8 } }),
  );

  const tenNguoi = useMemo(() => new Map(nhanSu.map((n) => [n.id, n.full_name])), [nhanSu]);

  const daLoc = useMemo(() => dsHoSo.filter((h) =>
    (!locCanBo || h.can_bo === locCanBo)
    && (!chiRuiRo || canhBaoHoSo(h).length > 0),
  ), [dsHoSo, locCanBo, chiRuiRo]);

  const theoCot = useMemo(() => {
    const m = new Map<HsTrangThai, HoSoTinDung[]>();
    for (const c of HS_COT) m.set(c.ma, []);
    for (const h of daLoc) m.get(h.trang_thai)?.push(h);
    for (const [k, v] of m) m.set(k, sapXepHoSo(v));
    return m;
  }, [daLoc]);

  const tong = useMemo(() => tongTheoBuoc(dsHoSo.filter((h) =>
    h.trang_thai !== 'HOAN_THANH' && h.trang_thai !== 'TU_CHOI')), [dsHoSo]);

  const tongTien = useMemo(
    () => [...tong.values()].reduce((s, v) => s + v.tien, 0),
    [tong],
  );
  const soRuiRo = useMemo(
    () => dsHoSo.filter((h) => canhBaoHoSo(h).some((c) => c.muc === 'DO')).length,
    [dsHoSo],
  );
  // Hạn mức sắp hết mà CHƯA có hồ sơ tái cấp nào đang chạy — nguy hiểm nhất
  const hoTrong = useMemo(() => sapDenHan.filter((s) => !s.da_co_ho_so_moi), [sapDenHan]);

  const handleDrag = (e: DragEndEvent) => {
    const h = dsHoSo.find((x) => x.id === e.active.id);
    const den = e.over?.id as HsTrangThai | undefined;
    if (!h || !den || h.trang_thai === den) return;
    if (!laLanhDao && h.can_bo !== profileId) {
      toast.error('Chỉ cán bộ phụ trách hoặc lãnh đạo Phòng chuyển được hồ sơ này.');
      return;
    }
    onKeoHoSo(h, den);
  };

  if (dangTai) {
    return <div className="grid gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>;
  }

  return (
    <div>
      {/* Dải số điều hành */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <OSo nhan="Hồ sơ đang chạy" giaTri={String([...tong.values()].reduce((s, v) => s + v.so, 0))} />
        <OSo nhan="Tổng dư nợ đang trình" giaTri={dinhDangTien(tongTien)} nhanManh />
        <OSo nhan="Hồ sơ cảnh báo đỏ" giaTri={String(soRuiRo)} xau={soRuiRo > 0} />
        <OSo nhan="Hạn mức sắp hết, chưa có hồ sơ" giaTri={String(hoTrong.length)} xau={hoTrong.length > 0} />
      </div>

      {/* Cảnh báo đường ống: hạn mức sắp hết mà chưa mở hồ sơ tái cấp */}
      {hoTrong.length > 0 && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4" />
            {hoTrong.length} khách hàng có hạn mức sắp hết mà chưa có hồ sơ tái cấp nào đang chạy
          </p>
          <div className="mt-2 space-y-1.5">
            {hoTrong.slice(0, 6).map((s) => (
              <p key={s.id} className="flex flex-wrap items-center gap-x-2 text-sm text-slate-700">
                <span className="font-medium">{s.khach_hang}</span>
                <span className="text-slate-500">{dinhDangTien(Number(s.so_tien))}</span>
                <span className={s.con_lai < 0 ? 'font-semibold text-red-700' : 'text-red-600'}>
                  {s.con_lai < 0 ? `đã hết hạn ${-s.con_lai} ngày` : `còn ${s.con_lai} ngày`}
                </span>
              </p>
            ))}
            {hoTrong.length > 6 && (
              <p className="text-xs text-slate-500">…và {hoTrong.length - 6} khách hàng khác</p>
            )}
          </div>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
          value={locCanBo ?? ''}
          onChange={(e) => setLocCanBo(e.target.value || null)}
          aria-label="Lọc theo cán bộ phụ trách"
        >
          <option value="">Mọi cán bộ</option>
          {[...new Set(dsHoSo.map((h) => h.can_bo))].map((id) => (
            <option key={id} value={id}>{tenNguoi.get(id) ?? '—'}</option>
          ))}
        </select>
        <Button size="sm" variant={chiRuiRo ? 'default' : 'outline'} className="h-8 px-2 text-xs"
          onClick={() => setChiRuiRo(!chiRuiRo)}>
          Chỉ hồ sơ có cảnh báo
        </Button>
        <Button size="sm" className="ml-auto h-8" onClick={onTaoMoi}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Mở hồ sơ
        </Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDrag}>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {HS_COT.map((cot) => {
              const ds = theoCot.get(cot.ma) ?? [];
              const so = tong.get(cot.ma);
              return (
                <CotHoSo key={cot.ma} cot={cot} dsHoSo={ds} tienCot={so?.tien ?? 0}
                  tenNguoi={tenNguoi} onMoHoSo={onMoHoSo} />
              );
            })}
          </div>
        </div>
      </DndContext>
    </div>
  );
}

function OSo({ nhan, giaTri, xau, nhanManh }: { nhan: string; giaTri: string; xau?: boolean; nhanManh?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className={`font-bold tabular-nums ${nhanManh ? 'text-xl' : 'text-2xl'} ${
        xau ? 'text-red-600' : 'text-brand-navy'
      }`}>
        {giaTri}
      </p>
      <p className="mt-0.5 text-xs leading-snug text-slate-500">{nhan}</p>
    </div>
  );
}

function CotHoSo({ cot, dsHoSo, tienCot, tenNguoi, onMoHoSo }: {
  cot: (typeof HS_COT)[number];
  dsHoSo: HoSoTinDung[];
  tienCot: number;
  tenNguoi: Map<string, string>;
  onMoHoSo: (h: HoSoTinDung) => void;
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
        <span className="tabular-nums text-slate-400">{dsHoSo.length}</span>
      </p>
      {tienCot > 0 && (
        <p className="px-1 pb-1 text-2xs font-medium tabular-nums text-slate-500">
          {dinhDangTien(tienCot)}
        </p>
      )}
      <div className="mt-1 flex flex-col gap-2">
        {dsHoSo.map((h) => (
          <TheHoSo key={h.id} hoSo={h} tenNguoi={tenNguoi} onMo={() => onMoHoSo(h)} />
        ))}
        {dsHoSo.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
            Trống
          </p>
        )}
      </div>
    </div>
  );
}

function TheHoSo({ hoSo, tenNguoi, onMo }: {
  hoSo: HoSoTinDung; tenNguoi: Map<string, string>; onMo: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: hoSo.id });
  const canhBao = canhBaoHoSo(hoSo);
  const nang = canhBao.some((c) => c.muc === 'DO');
  const tuoi = hsTuoiCho(hoSo);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onMo}
      className={`cursor-pointer rounded-xl border border-l-4 bg-white p-2.5 shadow-sm transition hover:shadow ${
        nang ? 'border-l-red-500' : canhBao.length > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <p className="flex items-start justify-between gap-1">
        <span className="font-mono text-2xs text-slate-400">{hoSo.ma_hs}</span>
        <span className="shrink-0 text-2xs font-semibold tabular-nums text-brand-navy">
          {dinhDangTien(hoSo.so_tien)}
        </span>
      </p>
      <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-slate-800">
        {hoSo.khach_hang}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-1">
        <Badge variant="outline" className="px-1 py-0 text-2xs font-normal">
          {HS_TEN_LOAI[hoSo.loai_ho_so]}
        </Badge>
        {hoSo.cap_phe_duyet === 'TSC' && (
          <Badge variant="outline" className="border-red-300 px-1 py-0 text-2xs font-normal text-red-700">
            TSC
          </Badge>
        )}
      </p>
      <p className="mt-1.5 flex items-center justify-between text-2xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <User2 className="h-3 w-3" />
          {tenNguoi.get(hoSo.can_bo) ?? '—'}
        </span>
        {tuoi > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <CalendarClock className="h-3 w-3" />
            chờ {tuoi}n
          </span>
        )}
      </p>
      {canhBao.length > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-1">
          {canhBao.slice(0, 2).map((c) => (
            <span
              key={c.noi_dung}
              className={`rounded-full px-1.5 py-0.5 text-2xs font-medium ${
                c.muc === 'DO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {c.noi_dung}
            </span>
          ))}
        </p>
      )}
      {hoSo.nguoi_dang_giu && (
        <p className="mt-1 text-2xs text-slate-500">
          Đang ở: {tenNguoi.get(hoSo.nguoi_dang_giu) ?? '—'}
        </p>
      )}
    </div>
  );
}

/** Nhãn cấp phê duyệt dùng chung cho hộp thoại chi tiết */
export function NhanCapPheDuyet({ cap }: { cap: HoSoTinDung['cap_phe_duyet'] }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
      <Banknote className="h-3.5 w-3.5" />
      {HS_TEN_CAP[cap]}
    </span>
  );
}

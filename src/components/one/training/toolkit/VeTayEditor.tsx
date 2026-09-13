import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { getStroke } from 'perfect-freehand';
import { Eraser, PenLine, Redo2, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DO_DAY_BUT, MAU_BUT, rutGonDiem, taiDiem, themNet, xoaHet,
  type DuLieuVeTay, type NetVe,
} from '@/lib/toolkit/veTay';
import { useLichSu } from './useLichSu';

/**
 * EDITOR BẢNG VẼ TAY — bút cảm ứng / ngón tay / chuột, nét mượt nhờ
 * perfect-freehand (thuật toán nét bút của tldraw / Excalidraw).
 *
 * Canvas có kích thước cố định theo dữ liệu (1600×1000) và được co vừa khung
 * bằng CSS; toạ độ chạm quy về hệ của bảng nên cùng một bản vẽ hiện y hệt trên
 * điện thoại lẫn máy tính, và ảnh xuất chính là canvas ở tỉ lệ 1:1.
 *
 * Nét đang vẽ được vẽ lên một canvas phủ riêng để không phải vẽ lại toàn bộ
 * bản ở mỗi lần di chuột — bản vẽ 100 nét vẫn mượt trên máy yếu.
 */

export interface VeTayEditorRef {
  /** PNG của cả bảng vẽ (nền + nét) */
  xuatPng(): Promise<Blob | null>;
  layDuLieu(): DuLieuVeTay;
}

type CongCu = 'BUT' | 'TAY';

export const VeTayEditor = forwardRef<VeTayEditorRef, {
  banDau: DuLieuVeTay;
  chiDoc?: boolean;
  onDoi?: (d: DuLieuVeTay) => void;
}>(function VeTayEditor({ banDau, chiDoc = false, onDoi }, ref) {
  const { hien: d, dat, hoanTac, lamLai, coHoanTac, coLamLai } = useLichSu(banDau);
  const [congCu, setCongCu] = useState<CongCu>('BUT');
  const [mau, setMau] = useState(MAU_BUT[0]);
  const [doDay, setDoDay] = useState<number>(DO_DAY_BUT[1]);
  const [tiLe, setTiLe] = useState(1);
  const khungRef = useRef<HTMLDivElement>(null);
  const vungRef = useRef<HTMLDivElement>(null);
  const nenRef = useRef<HTMLCanvasElement>(null);
  const phuRef = useRef<HTMLCanvasElement>(null);
  const netDang = useRef<{ diem: number[]; pointerId: number } | null>(null);

  useEffect(() => { onDoi?.(d); }, [d, onDoi]);

  // Co bảng vừa khung, giữ tỉ lệ
  useLayoutEffect(() => {
    const el = vungRef.current;
    if (!el) return;
    const tinh = () => setTiLe(Math.min((el.clientWidth - 8) / d.rong, (el.clientHeight - 8) / d.cao));
    tinh();
    const ro = new ResizeObserver(tinh);
    ro.observe(el);
    return () => ro.disconnect();
  }, [d.rong, d.cao]);

  // Vẽ lại toàn bộ nét khi dữ liệu đổi (thêm nét, hoàn tác…)
  useEffect(() => {
    const c = nenRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.fillStyle = d.nen;
    ctx.fillRect(0, 0, c.width, c.height);
    for (const n of d.net) veNet(ctx, n, d.nen);
  }, [d]);

  const toaDo = (e: React.PointerEvent): [number, number, number] => {
    const r = phuRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / tiLe, (e.clientY - r.top) / tiLe, e.pointerType === 'mouse' ? 0.5 : (e.pressure || 0.5)];
  };

  const onXuong = (e: React.PointerEvent) => {
    if (chiDoc || netDang.current) return;
    // Hai ngón trên điện thoại là để cuộn trang chứ không vẽ — chỉ nhận ngón đầu; bút thì luôn nhận
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    netDang.current = { diem: [...toaDo(e)], pointerId: e.pointerId };
  };
  const onDi = (e: React.PointerEvent) => {
    const n = netDang.current;
    if (!n || n.pointerId !== e.pointerId) return;
    n.diem.push(...toaDo(e));
    const ctx = phuRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, d.rong, d.cao);
    veNet(ctx, { id: '_', mau, do_day: doDay, diem: n.diem, ...(congCu === 'TAY' ? { tay: true } : {}) }, d.nen, true);
  };
  const onNha = (e: React.PointerEvent) => {
    const n = netDang.current;
    if (!n || n.pointerId !== e.pointerId) return;
    netDang.current = null;
    phuRef.current?.getContext('2d')?.clearRect(0, 0, d.rong, d.cao);
    // Chấm một điểm cũng là một nét (dấu chấm) — nhân đôi điểm để perfect-freehand có gì mà vẽ
    const diem = n.diem.length >= 6 ? rutGonDiem(n.diem) : [...n.diem, n.diem[0] + 0.1, n.diem[1] + 0.1, n.diem[2]];
    dat((c) => themNet(c, { mau, do_day: doDay, diem, ...(congCu === 'TAY' ? { tay: true } : {}) }));
  };

  const onPhim = (e: React.KeyboardEvent) => {
    if (chiDoc) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) lamLai(); else hoanTac(); }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); lamLai(); }
    if (e.key.toLowerCase() === 'e') setCongCu('TAY');
    if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'p') setCongCu('BUT');
  };

  const xuatPng = useCallback(() => new Promise<Blob | null>((ok) => {
    const c = nenRef.current;
    if (!c) return ok(null);
    c.toBlob((b) => ok(b), 'image/png');
  }), []);

  useImperativeHandle(ref, () => ({ layDuLieu: () => d, xuatPng }), [d, xuatPng]);

  return (
    <div ref={khungRef} tabIndex={0} onKeyDown={onPhim} className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-slate-100 outline-none">
      {/* Bảng vẽ chiếm phần còn lại, thanh công cụ nằm trong luồng ở dưới — thanh nổi
          đè lên bảng thì trên điện thoại che mất một phần ba chỗ vẽ */}
      <div ref={vungRef} className="flex min-h-0 flex-1 items-center justify-center">
      <div className="relative shadow-md" style={{ width: d.rong * tiLe, height: d.cao * tiLe, touchAction: 'none' }}>
        <canvas ref={nenRef} width={d.rong} height={d.cao} className="absolute inset-0 h-full w-full rounded-lg" />
        <canvas
          ref={phuRef} width={d.rong} height={d.cao}
          className="absolute inset-0 h-full w-full rounded-lg"
          style={{ cursor: chiDoc ? 'default' : 'crosshair' }}
          onPointerDown={onXuong} onPointerMove={onDi} onPointerUp={onNha} onPointerCancel={onNha}
        />
      </div>
      </div>

      {!chiDoc && (
        <div className="flex flex-wrap items-center justify-center gap-1 border-t border-slate-200 bg-white/95 p-1.5">
          <Button type="button" size="sm" variant={congCu === 'BUT' ? 'default' : 'ghost'} className={`h-9 gap-1 px-2 text-xs ${congCu === 'BUT' ? 'bg-brand-navy hover:bg-brand-navy/90' : ''}`} onClick={() => setCongCu('BUT')} title="Bút (B)"><PenLine className="h-4 w-4" /><span className="hidden sm:inline">Bút</span></Button>
          <Button type="button" size="sm" variant={congCu === 'TAY' ? 'default' : 'ghost'} className={`h-9 gap-1 px-2 text-xs ${congCu === 'TAY' ? 'bg-brand-navy hover:bg-brand-navy/90' : ''}`} onClick={() => setCongCu('TAY')} title="Tẩy (E)"><Eraser className="h-4 w-4" /><span className="hidden sm:inline">Tẩy</span></Button>
          <span className="mx-1 h-6 w-px bg-slate-200" />
          {MAU_BUT.map((m) => (
            <button key={m} type="button" aria-label={`Màu ${m}`} onClick={() => { setMau(m); setCongCu('BUT'); }}
              className={`h-7 w-7 rounded-full border-2 shadow ring-1 ring-slate-200 transition ${mau === m && congCu === 'BUT' ? 'scale-110 border-[#1F4E79]' : 'border-white'}`} style={{ background: m }} />
          ))}
          <span className="mx-1 h-6 w-px bg-slate-200" />
          {DO_DAY_BUT.map((dd) => (
            <button key={dd} type="button" aria-label={`Độ dày ${dd}`} onClick={() => setDoDay(dd)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${doDay === dd ? 'bg-slate-200' : 'hover:bg-slate-100'}`}>
              <span className="rounded-full bg-slate-800" style={{ width: dd + 2, height: dd + 2 }} />
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <Button type="button" size="sm" variant="ghost" className="h-9 px-2" title="Hoàn tác (Ctrl+Z)" disabled={!coHoanTac} onClick={hoanTac}><Undo2 className="h-4 w-4" /></Button>
          <Button type="button" size="sm" variant="ghost" className="h-9 px-2" title="Làm lại (Ctrl+Y)" disabled={!coLamLai} onClick={lamLai}><Redo2 className="h-4 w-4" /></Button>
          <Button type="button" size="sm" variant="ghost" className="h-9 px-2" title="Xoá hết" disabled={d.net.length === 0} onClick={() => dat((c) => xoaHet(c))}><Trash2 className="h-4 w-4 text-red-600" /></Button>
        </div>
      )}
    </div>
  );
});

/** Vẽ một nét lên ctx: tẩy = tô lại bằng màu nền (không dùng destination-out để nền vẫn đặc khi xuất PNG) */
function veNet(ctx: CanvasRenderingContext2D, n: NetVe, nen: string, dangVe = false) {
  const vien = getStroke(taiDiem(n.diem), {
    size: n.tay ? n.do_day * 3 : n.do_day,
    thinning: n.tay ? 0 : 0.55,
    smoothing: 0.5,
    streamline: 0.45,
    simulatePressure: n.diem.length > 2 && n.diem[2] === 0.5,
    last: !dangVe,
  });
  if (vien.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(vien[0][0], vien[0][1]);
  for (let i = 1; i < vien.length; i++) {
    const [x0, y0] = vien[i - 1]; const [x1, y1] = vien[i];
    ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  ctx.closePath();
  // Nét tẩy đang vẽ trên canvas phủ (trong suốt) thì tô nền mờ để thấy đường tẩy
  ctx.fillStyle = n.tay ? (dangVe ? 'rgba(148,163,184,0.5)' : nen) : n.mau;
  ctx.fill();
}

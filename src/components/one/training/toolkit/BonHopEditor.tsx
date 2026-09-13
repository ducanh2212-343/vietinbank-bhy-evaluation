import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { GripVertical, LayoutTemplate, Palette, Plus, Redo2, Trash2, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  MAU_BON_HOP, MAU_O, MAU_THE, apMau, chuyenThe, doiMauThe, suaThe, themThe, theTrongO, xoaThe,
  type DuLieuBonHop, type OBonHop, type TheBonHop,
} from '@/lib/toolkit/bonHop';
import { FONT_MINDMAP, chiaDong, thoatXml } from './doChu';
import { useLichSu } from './useLichSu';

/**
 * EDITOR MÔ HÌNH 4 HỘP — ma trận hai trục kiểu Eisenhower / Nỗ lực–Tác động.
 *
 * Cách dùng: gõ một việc vào ô «Thêm thẻ» → thẻ nằm ở khay bên dưới → kéo thả
 * vào ô (điện thoại: chạm thẻ rồi chạm ô). Tên trục, hai đầu trục, tên và màu
 * bốn ô đều sửa tại chỗ — nháy vào chữ là sửa. Đổi mẫu giữ nguyên thẻ.
 *
 * Bảng vẽ là HTML (grid) chứ không phải SVG vì phần này toàn ô nhập và kéo thả;
 * ảnh xuất được dựng lại thành SVG từ dữ liệu (veSvg) — cùng màu, cùng chữ, nên
 * ảnh và màn hình khớp nhau.
 */

export interface BonHopEditorRef {
  xuatSvg(): { svg: string; w: number; h: number };
  layDuLieu(): DuLieuBonHop;
}

const O_THU_TU: OBonHop[] = [0, 1, 2, 3];

export const BonHopEditor = forwardRef<BonHopEditorRef, {
  banDau: DuLieuBonHop;
  chiDoc?: boolean;
  onDoi?: (d: DuLieuBonHop) => void;
}>(function BonHopEditor({ banDau, chiDoc = false, onDoi }, ref) {
  const { hien: d, dat, hoanTac, lamLai, coHoanTac, coLamLai } = useLichSu(banDau);
  const [nhapMoi, setNhapMoi] = useState('');
  const [chon, setChon] = useState<string | null>(null);
  const [keoQua, setKeoQua] = useState<OBonHop | 'KHAY' | null>(null);
  const [dangSua, setDangSua] = useState<string | null>(null);
  const oNhapMoiRef = useRef<HTMLInputElement>(null);

  useEffect(() => { onDoi?.(d); }, [d, onDoi]);

  useImperativeHandle(ref, () => ({
    layDuLieu: () => d,
    xuatSvg: () => veSvg(d),
  }), [d]);

  const them = useCallback((o: OBonHop | null = null) => {
    const chu = nhapMoi.trim();
    if (!chu || chiDoc) return;
    dat((c) => themThe(c, chu, o).d);
    setNhapMoi('');
    oNhapMoiRef.current?.focus();
  }, [nhapMoi, chiDoc, dat]);

  // Kéo thả bằng HTML5 drag: máy tính. Điện thoại: chạm chọn thẻ rồi chạm ô đích.
  const thaVao = (o: OBonHop | null, id: string | null) => {
    if (!id || chiDoc) return;
    dat((c) => chuyenThe(c, id, o));
    setChon(null); setKeoQua(null);
  };
  const onKeoBatDau = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setChon(id);
  };
  const onThaO = (e: React.DragEvent, o: OBonHop | null) => {
    e.preventDefault();
    thaVao(o, e.dataTransfer.getData('text/plain') || chon);
  };
  const onChamO = (o: OBonHop | null) => { if (chon && !dangSua) thaVao(o, chon); };

  const onPhim = (e: React.KeyboardEvent) => {
    if (chiDoc || dangSua) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) lamLai(); else hoanTac(); }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); lamLai(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && chon && (e.target as HTMLElement).tagName !== 'INPUT') {
      e.preventDefault(); dat((c) => xoaThe(c, chon)); setChon(null);
    }
  };

  // Hàm vẽ, KHÔNG phải component con: khai báo component trong render thì mỗi
  // lần render React tạo kiểu mới → ô nhập bị gắn lại và mất tiêu điểm sau mỗi ký tự
  const veThe = (t: TheBonHop) => {
    const laChon = chon === t.id;
    return (
      <div
        draggable={!chiDoc && dangSua !== t.id}
        onDragStart={(e) => onKeoBatDau(e, t.id)}
        onDragEnd={() => setKeoQua(null)}
        onClick={(e) => { e.stopPropagation(); if (!chiDoc) setChon(laChon ? null : t.id); }}
        onDoubleClick={(e) => { e.stopPropagation(); if (!chiDoc) setDangSua(t.id); }}
        key={t.id}
        className={`group flex items-start gap-1 rounded-lg border px-2 py-1.5 text-xs leading-snug text-slate-800 shadow-sm transition ${laChon ? 'border-[#1F4E79] ring-2 ring-[#1F4E79]/30' : 'border-slate-200'} ${chiDoc ? '' : 'cursor-grab active:cursor-grabbing'}`}
        style={{ background: t.mau ?? MAU_THE[0] }}
      >
        {!chiDoc && <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />}
        {dangSua === t.id ? (
          <input
            autoFocus
            defaultValue={t.van_ban}
            onBlur={(e) => { const c = e.target.value.trim(); if (c) dat((x) => suaThe(x, t.id, c)); setDangSua(null); }}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setDangSua(null); }}
            className="w-full bg-transparent outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{t.van_ban}</span>
        )}
        {!chiDoc && (
          <button type="button" aria-label="Xoá thẻ" onClick={(e) => { e.stopPropagation(); dat((c) => xoaThe(c, t.id)); if (chon === t.id) setChon(null); }}
            className="hidden shrink-0 text-slate-400 hover:text-red-600 group-hover:block">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  const suaTruc = (truc: 'truc_x' | 'truc_y', khoa: 'ten' | 'thap' | 'cao', gt: string) =>
    dat((c) => ({ ...c, [truc]: { ...c[truc], [khoa]: gt } }));
  const suaO = (i: OBonHop, phan: Partial<{ ten: string; mau: string }>) =>
    dat((c) => { const o = [...c.o] as DuLieuBonHop['o']; o[i] = { ...o[i], ...phan }; return { ...c, o }; });

  const chuSua = (nhan: string, gt: string, onLuu: (v: string) => void, className = '') => (
    chiDoc ? <span className={className}>{gt}</span> : (
      <input
        value={gt}
        aria-label={nhan}
        onChange={(e) => onLuu(e.target.value)}
        onFocus={() => setDangSua('_truc')}
        onBlur={() => setDangSua(null)}
        onKeyDown={(e) => e.stopPropagation()}
        className={`min-w-0 max-w-full rounded bg-transparent px-1 outline-none ring-[#A8763E]/50 hover:bg-black/5 focus:bg-white focus:ring-2 ${className}`}
        style={{ width: `${Math.max(gt.length, 4) + 2}ch` }}
      />
    )
  );

  const chuaXep = theTrongO(d, null);

  return (
    <div tabIndex={0} onKeyDown={onPhim} onClick={() => setChon(null)} className="flex h-full w-full flex-col gap-2 overflow-hidden rounded-xl bg-[#FFFDF8] p-2 outline-none md:p-3">
      {/* Trục dọc + lưới */}
      <div className="grid min-h-0 flex-1 grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-1">
        {/* Cột trục dọc: cố định 2,5 rem; tên trục xoay bằng transform nên không
            chiếm chỗ theo chiều rộng (writing-mode làm cột phình và chữ bị lật) */}
        <div className="relative w-10 text-2xs text-slate-500">
          <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap">{chuSua('Đầu cao trục dọc', d.truc_y.cao, (v) => suaTruc('truc_y', 'cao', v), 'text-center')}</span>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap font-semibold text-slate-700">
            {chuSua('Tên trục dọc', d.truc_y.ten, (v) => suaTruc('truc_y', 'ten', v), 'text-center')}
          </span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap">{chuSua('Đầu thấp trục dọc', d.truc_y.thap, (v) => suaTruc('truc_y', 'thap', v), 'text-center')}</span>
        </div>

        <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-1.5">
          {O_THU_TU.map((i) => {
            const o = d.o[i];
            const ds = theTrongO(d, i);
            return (
              <div
                key={i}
                onDragOver={(e) => { e.preventDefault(); setKeoQua(i); }}
                onDragLeave={() => setKeoQua(null)}
                onDrop={(e) => onThaO(e, i)}
                onClick={(e) => { e.stopPropagation(); onChamO(i); }}
                className={`flex min-h-0 flex-col overflow-hidden rounded-xl border-2 p-2 transition ${keoQua === i ? 'border-[#1F4E79] border-dashed' : 'border-transparent'} ${chon && !chiDoc ? 'cursor-copy' : ''}`}
                style={{ background: o.mau }}
              >
                <div className="mb-1.5 flex items-center gap-1">
                  {chuSua(`Tên ô ${i + 1}`, o.ten, (v) => suaO(i, { ten: v }), 'text-sm font-semibold text-slate-800')}
                  <span className="ml-auto rounded-full bg-white/70 px-1.5 text-2xs tabular-nums text-slate-500">{ds.length}</span>
                  {!chiDoc && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" aria-label="Màu ô" onClick={(e) => e.stopPropagation()} className="rounded p-0.5 text-slate-500 hover:bg-white/70"><Palette className="h-3.5 w-3.5" /></button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          {MAU_O.map((m) => <button key={m} type="button" aria-label={`Màu ${m}`} className="h-7 w-7 rounded-full border shadow" style={{ background: m }} onClick={() => suaO(i, { mau: m })} />)}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
                  {ds.map(veThe)}
                  {ds.length === 0 && <p className="text-2xs text-slate-400/80">{chon ? 'Chạm để xếp thẻ vào đây' : 'Kéo thẻ vào đây'}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div />
        <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-1 text-2xs text-slate-500">
          {chuSua('Đầu thấp trục ngang', d.truc_x.thap, (v) => suaTruc('truc_x', 'thap', v), 'justify-self-start')}
          {chuSua('Tên trục ngang', d.truc_x.ten, (v) => suaTruc('truc_x', 'ten', v), 'text-center font-semibold text-slate-700')}
          {chuSua('Đầu cao trục ngang', d.truc_x.cao, (v) => suaTruc('truc_x', 'cao', v), 'justify-self-end text-right')}
        </div>
      </div>

      {/* Khay thẻ chưa xếp + nhập thẻ mới + công cụ */}
      <div
        onDragOver={(e) => { e.preventDefault(); setKeoQua('KHAY'); }}
        onDragLeave={() => setKeoQua(null)}
        onDrop={(e) => onThaO(e, null)}
        onClick={(e) => { e.stopPropagation(); onChamO(null); }}
        className={`rounded-xl border-2 bg-white/80 p-2 ${keoQua === 'KHAY' ? 'border-dashed border-[#1F4E79]' : 'border-slate-200'}`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {!chiDoc && (
            <form className="flex min-w-[200px] flex-1 items-center gap-1" onSubmit={(e) => { e.preventDefault(); them(); }}>
              <Input ref={oNhapMoiRef} value={nhapMoi} onChange={(e) => setNhapMoi(e.target.value)} onKeyDown={(e) => e.stopPropagation()} onFocus={() => setDangSua('_moi')} onBlur={() => setDangSua(null)} placeholder="Thêm thẻ việc rồi Enter…" className="h-9 text-sm" />
              <Button type="submit" size="sm" className="h-9 gap-1 bg-brand-navy hover:bg-brand-navy/90" disabled={!nhapMoi.trim()}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Thêm</span></Button>
            </form>
          )}
          {!chiDoc && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant="ghost" className="h-9 gap-1 px-2 text-xs" title="Đổi mẫu (giữ thẻ)"><LayoutTemplate className="h-4 w-4" /><span className="hidden sm:inline">Mẫu</span></Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-2" onClick={(e) => e.stopPropagation()}>
                  <p className="mb-1 px-1 text-2xs text-slate-500">Đổi mẫu chỉ đổi trục và tên ô — thẻ đã xếp giữ nguyên chỗ.</p>
                  <div className="space-y-0.5">
                    {MAU_BON_HOP.map((m) => (
                      <button key={m.ma} type="button" onClick={() => dat((c) => apMau(c, m.ma))} className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-100">
                        <span className="text-sm font-medium text-slate-800">{m.ten}</span>
                        <span className="block text-2xs text-slate-500">{m.moTa}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <span><Button type="button" size="sm" variant="ghost" className="h-9 px-2" title="Màu thẻ đang chọn" disabled={!chon}><Palette className="h-4 w-4" /></Button></span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1.5">
                    {MAU_THE.map((m) => <button key={m} type="button" aria-label={`Màu ${m}`} className="h-7 w-7 rounded-full border shadow" style={{ background: m }} onClick={() => chon && dat((c) => doiMauThe(c, chon, m === MAU_THE[0] ? undefined : m))} />)}
                  </div>
                </PopoverContent>
              </Popover>
              <Button type="button" size="sm" variant="ghost" className="h-9 px-2" title="Xoá thẻ đang chọn (Delete)" disabled={!chon} onClick={() => { if (chon) { dat((c) => xoaThe(c, chon)); setChon(null); } }}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              <span className="mx-1 h-6 w-px bg-slate-200" />
              <Button type="button" size="sm" variant="ghost" className="h-9 px-2" title="Hoàn tác (Ctrl+Z)" disabled={!coHoanTac} onClick={hoanTac}><Undo2 className="h-4 w-4" /></Button>
              <Button type="button" size="sm" variant="ghost" className="h-9 px-2" title="Làm lại (Ctrl+Y)" disabled={!coLamLai} onClick={lamLai}><Redo2 className="h-4 w-4" /></Button>
            </>
          )}
        </div>
        {(chuaXep.length > 0 || !chiDoc) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chuaXep.map(veThe)}
            {chuaXep.length === 0 && <p className="text-2xs text-slate-400">Khay trống — thẻ mới sẽ nằm ở đây, kéo (hoặc chạm thẻ rồi chạm ô) để xếp.</p>}
          </div>
        )}
      </div>
    </div>
  );
});

/** Dựng SVG độc lập từ dữ liệu — ảnh xuất không lệ thuộc kích thước màn hình */
function veSvg(d: DuLieuBonHop): { svg: string; w: number; h: number } {
  const W = 1400; const H = 1000;
  const LE = 90; const DAY = 70; const TREN = 30; const PHAI = 30; const KHE = 12;
  const oW = (W - LE - PHAI - KHE) / 2; const oH = (H - TREN - DAY - KHE) / 2;
  const goc = (i: OBonHop) => ({ x: LE + (i % 2) * (oW + KHE), y: TREN + Math.floor(i / 2) * (oH + KHE) });
  const chu = (x: number, y: number, s: string, co: number, dam = 400, mau = '#1F2937', anchor = 'start', them = '') =>
    `<text x="${x}" y="${y}" font-size="${co}" font-weight="${dam}" fill="${mau}" text-anchor="${anchor}" ${them}>${thoatXml(s)}</text>`;
  const p: string[] = [];
  p.push(`<rect width="${W}" height="${H}" fill="#FFFDF8"/>`);
  // Bốn ô + thẻ (thẻ xếp lưới 2 cột; quá nhiều thì ghi «+n»)
  const CO_THE = 17; const DONG = 22; const THE_W = (oW - 48) / 2; const THE_DEM = 10;
  for (const i of [0, 1, 2, 3] as OBonHop[]) {
    const { x, y } = goc(i);
    p.push(`<rect x="${x}" y="${y}" width="${oW}" height="${oH}" rx="18" fill="${d.o[i].mau}"/>`);
    p.push(chu(x + 20, y + 38, d.o[i].ten, 22, 700, '#1F2937'));
    let cy = y + 60; let cot = 0; let an = 0;
    const ds = theTrongO(d, i);
    for (let k = 0; k < ds.length; k++) {
      const t = ds[k];
      const dong = chiaDong(t.van_ban, THE_W - THE_DEM * 2, CO_THE);
      const h = dong.length * DONG + THE_DEM * 2 - 4;
      if (cy + h > y + oH - 12) {
        // Hết chỗ cột này → sang cột kế; hết cả hai cột → ghi số thẻ còn lại
        if (cot === 0) { cot = 1; cy = y + 60; } else { an = ds.length - k; break; }
      }
      const tx = x + 20 + cot * (THE_W + 8);
      p.push(`<rect x="${tx}" y="${cy}" width="${THE_W}" height="${h}" rx="10" fill="${t.mau ?? '#FFFFFF'}" stroke="#D6D3CD"/>`);
      dong.forEach((dg, j) => p.push(chu(tx + THE_DEM, cy + THE_DEM + CO_THE - 3 + j * DONG, dg, CO_THE)));
      cy += h + 8;
    }
    if (an > 0) p.push(chu(x + oW - 20, y + oH - 16, `+${an} thẻ nữa`, 14, 500, '#64748B', 'end'));
  }
  // Trục
  const midX = LE + oW + KHE / 2; const midY = TREN + oH + KHE / 2;
  p.push(chu(LE - 12, TREN + 20, d.truc_y.cao, 15, 400, '#475569', 'end'));
  p.push(chu(LE - 12, TREN + oH * 2 + KHE - 6, d.truc_y.thap, 15, 400, '#475569', 'end'));
  p.push(chu(0, 0, d.truc_y.ten, 18, 700, '#334155', 'middle', `transform="translate(${LE - 52} ${midY}) rotate(-90)"`));
  p.push(chu(LE, H - DAY + 30, d.truc_x.thap, 15, 400, '#475569', 'start'));
  p.push(chu(W - PHAI, H - DAY + 30, d.truc_x.cao, 15, 400, '#475569', 'end'));
  p.push(chu(midX, H - DAY + 52, d.truc_x.ten, 18, 700, '#334155', 'middle'));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="font-family:${FONT_MINDMAP}">${p.join('')}</svg>`;
  return { svg, w: W, h: H };
}

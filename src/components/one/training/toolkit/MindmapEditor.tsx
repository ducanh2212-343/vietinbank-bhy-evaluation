import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import {
  ChevronsDownUp, CornerDownRight, GitBranchPlus, Maximize2, Minus, Palette, Plus, Redo2, Trash2, Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  MAU_NHANH, doiCha, doiMau, gapMo, suaVanBan, themAnhEm, themCon, thuTuDoc, timNut, xepMindmap, xoaNut,
  type BoCucMindmap, type DuLieuMindmap, type NutDaXep,
} from '@/lib/toolkit/mindmap';
import { DONG_CAO, FONT_MINDMAP, fontTheoCap, taoDoChu } from './doChu';
import { useLichSu } from './useLichSu';

/**
 * EDITOR SƠ ĐỒ TƯ DUY — theo cách làm của XMind / MindNode: người dùng chỉ gõ
 * nội dung, vị trí do máy xếp.
 *
 *   Tab           thêm ý con          Enter        thêm ý cùng cấp
 *   F2 / nháy đúp sửa chữ             Delete       xoá nhánh
 *   ↑ ↓           đi qua các nút      Esc          thôi sửa / bỏ chọn
 *   Kéo nền       di chuyển           Ctrl + lăn   phóng to / thu nhỏ
 *   Kéo nút thả lên nút khác          dời cả nhánh sang cha mới
 *
 * Trên điện thoại: chạm chọn, chạm đúp sửa, một ngón kéo nền, hai ngón phóng.
 * Thanh công cụ nổi ở dưới có đủ nút cho người không dùng bàn phím.
 *
 * SVG chứ không phải canvas: chữ tiếng Việt sắc nét ở mọi độ phóng, chọn được
 * bằng phím, và xuất ảnh chỉ là sao chép cây DOM — không phải vẽ lại lần hai.
 */

export interface MindmapEditorRef {
  /** SVG độc lập (có viewBox = khung bao) để rasterize thành PNG */
  xuatSvg(): { svg: string; w: number; h: number };
  layDuLieu(): DuLieuMindmap;
}

const DEM = 40;
const K_MIN = 0.25;
const K_MAX = 3;

export const MindmapEditor = forwardRef<MindmapEditorRef, {
  banDau: DuLieuMindmap;
  chiDoc?: boolean;
  /** Gọi mỗi khi dữ liệu đổi — cha dùng để đánh dấu «chưa lưu» */
  onDoi?: (d: DuLieuMindmap) => void;
}>(function MindmapEditor({ banDau, chiDoc = false, onDoi }, ref) {
  const { hien: goc, dat, hoanTac, lamLai, coHoanTac, coLamLai } = useLichSu(banDau.goc);
  const [chon, setChon] = useState<string | null>(banDau.goc.id);
  const [dangSua, setDangSua] = useState<string | null>(null);
  const [nhap, setNhap] = useState('');
  const [keo, setKeo] = useState<{ id: string; x: number; y: number } | null>(null);
  const [nhin, setNhin] = useState({ tx: 0, ty: 0, k: 1 });
  const khungRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const oNhapRef = useRef<HTMLTextAreaElement>(null);
  const doChu = useMemo(() => taoDoChu(), []);
  const daVuaKhung = useRef(false);

  useEffect(() => { onDoi?.({ phien_ban: 1, goc }); }, [goc, onDoi]);

  const boCuc: BoCucMindmap = useMemo(() => xepMindmap({ phien_ban: 1, goc }, doChu), [goc, doChu]);
  const theoId = useMemo(() => new Map(boCuc.nut.map((n) => [n.id, n])), [boCuc]);

  // Vừa khung lúc mở — chỉ một lần, sau đó tôn trọng độ phóng người dùng đã chỉnh
  const vuaKhung = useCallback(() => {
    const el = khungRef.current;
    if (!el) return;
    const W = el.clientWidth; const H = el.clientHeight;
    const { x, y, w, h } = boCuc.khung;
    const kVua = Math.min((W - DEM * 2) / Math.max(w, 1), (H - DEM * 2 - 70) / Math.max(h, 1), 1.4);
    // Sơ đồ rộng trên điện thoại mà «vừa khung» thì chữ còn 24 % — không đọc nổi.
    // Dưới sàn 0,6 thì giữ 0,6 và đưa ý chính vào giữa, người dùng kéo xem từng nhánh.
    const k = Math.max(kVua, 0.6);
    const goc = boCuc.nut.find((n) => n.capDo === 0);
    const cx = k === kVua || !goc ? x + w / 2 : goc.x + goc.w / 2;
    const cy = k === kVua || !goc ? y + h / 2 : goc.y + goc.h / 2;
    setNhin({ k, tx: W / 2 - cx * k, ty: (H - 70) / 2 - cy * k });
  }, [boCuc.khung, boCuc.nut]);
  useLayoutEffect(() => { if (!daVuaKhung.current) { daVuaKhung.current = true; vuaKhung(); } }, [vuaKhung]);

  // ---------------- thao tác cây ----------------
  const batDauSua = useCallback((id: string) => {
    const n = timNut(goc, id);
    if (!n || chiDoc) return;
    setChon(id); setDangSua(id); setNhap(n.van_ban);
  }, [goc, chiDoc]);

  const ketThucSua = useCallback((luu: boolean) => {
    if (!dangSua) return;
    if (luu) {
      const chu = nhap.trim();
      dat((g) => suaVanBan(g, dangSua, chu || (timNut(g, dangSua)?.van_ban || 'Ý mới')));
    }
    setDangSua(null);
    khungRef.current?.focus();
  }, [dangSua, nhap, dat]);

  const themY = useCallback((kieu: 'CON' | 'ANH_EM') => {
    if (!chon || chiDoc) return;
    let idMoi = '';
    dat((g) => { const kq = kieu === 'CON' ? themCon(g, chon) : themAnhEm(g, chon); idMoi = kq.id; return kq.goc; });
    // Nút mới rỗng → mở sửa ngay, vì nút rỗng trên sơ đồ không có nghĩa gì
    setTimeout(() => { if (idMoi) { setChon(idMoi); setDangSua(idMoi); setNhap(''); } }, 0);
  }, [chon, chiDoc, dat]);

  const xoa = useCallback(() => {
    if (!chon || chiDoc || chon === goc.id) return;
    const ds = thuTuDoc(goc);
    const i = ds.indexOf(chon);
    dat((g) => xoaNut(g, chon));
    setChon(ds[Math.max(0, i - 1)] ?? goc.id);
  }, [chon, chiDoc, goc, dat]);

  const diChuyen = useCallback((huong: 1 | -1) => {
    const ds = thuTuDoc(goc);
    const i = chon ? ds.indexOf(chon) : -1;
    setChon(ds[(i + huong + ds.length) % ds.length]);
  }, [goc, chon]);

  useEffect(() => { if (dangSua) oNhapRef.current?.focus(); }, [dangSua]);

  // Nút đang chọn (vừa thêm, vừa đi tới bằng phím) mà nằm ngoài khung thì kéo nền
  // vừa đủ để thấy nó — thêm ý con ở mép phải mà phải tự kéo là mất nhịp gõ
  useEffect(() => {
    const el = khungRef.current;
    const n = chon ? theoId.get(chon) : undefined;
    if (!el || !n) return;
    setNhin((v) => {
      const W = el.clientWidth; const H = el.clientHeight - 70;
      const x1 = v.tx + n.x * v.k; const x2 = v.tx + (n.x + n.w) * v.k;
      const y1 = v.ty + n.y * v.k; const y2 = v.ty + (n.y + n.h) * v.k;
      let tx = v.tx; let ty = v.ty;
      if (x1 < DEM) tx += DEM - x1; else if (x2 > W - DEM) tx -= x2 - (W - DEM);
      if (y1 < DEM) ty += DEM - y1; else if (y2 > H - DEM) ty -= y2 - (H - DEM);
      return tx === v.tx && ty === v.ty ? v : { ...v, tx, ty };
    });
  }, [chon, theoId]);

  const onPhim = (e: React.KeyboardEvent) => {
    if (dangSua) return;
    if (chiDoc) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) lamLai(); else hoanTac(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); lamLai(); return; }
    if (!chon) return;
    switch (e.key) {
      case 'Tab': e.preventDefault(); themY('CON'); break;
      case 'Enter': e.preventDefault(); themY('ANH_EM'); break;
      case 'F2': e.preventDefault(); batDauSua(chon); break;
      case 'Delete': case 'Backspace': e.preventDefault(); xoa(); break;
      case 'ArrowDown': e.preventDefault(); diChuyen(1); break;
      case 'ArrowUp': e.preventDefault(); diChuyen(-1); break;
      case 'Escape': setChon(null); break;
      case ' ': e.preventDefault(); dat((g) => gapMo(g, chon)); break;
      default:
        // Gõ chữ thẳng vào nút đang chọn — không cần F2 trước
        if (e.key.length === 1 && !mod) { setDangSua(chon); setNhap(e.key); e.preventDefault(); }
    }
  };

  // ---------------- pan / zoom / kéo nút ----------------
  const conTro = useRef(new Map<number, { x: number; y: number }>());
  const dangPan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const keoNut = useRef<{ id: string; x0: number; y0: number; dangKeo: boolean } | null>(null);

  const toaDoThe = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    const sx = e.clientX - r.left; const sy = e.clientY - r.top;
    return { sx, sy, wx: (sx - nhin.tx) / nhin.k, wy: (sy - nhin.ty) / nhin.k };
  };

  const phongQuanh = useCallback((sx: number, sy: number, f: number) => {
    setNhin((v) => {
      const k = Math.min(K_MAX, Math.max(K_MIN, v.k * f));
      const thuc = k / v.k;
      return { k, tx: sx - (sx - v.tx) * thuc, ty: sy - (sy - v.ty) * thuc };
    });
  }, []);

  const onLan = (e: React.WheelEvent) => {
    e.preventDefault();
    const { sx, sy } = toaDoThe(e);
    if (e.ctrlKey || e.metaKey) phongQuanh(sx, sy, Math.exp(-e.deltaY * 0.0015));
    else setNhin((v) => ({ ...v, tx: v.tx - e.deltaX, ty: v.ty - e.deltaY }));
  };
  // React gắn wheel thụ động nên preventDefault không ăn — phải gắn tay để trang không cuộn theo
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []);

  const onXuongNen = (e: React.PointerEvent) => {
    conTro.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    if (conTro.current.size === 1) dangPan.current = { x: e.clientX, y: e.clientY, tx: nhin.tx, ty: nhin.ty };
    if (dangSua) ketThucSua(true);
  };
  const onDiChuyen = (e: React.PointerEvent) => {
    const cu = conTro.current.get(e.pointerId);
    if (cu) conTro.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (keoNut.current) {
      const k = keoNut.current;
      if (!k.dangKeo && Math.hypot(e.clientX - k.x0, e.clientY - k.y0) > 8) k.dangKeo = true;
      if (k.dangKeo) { const { wx, wy } = toaDoThe(e); setKeo({ id: k.id, x: wx, y: wy }); }
      return;
    }
    if (conTro.current.size === 2) {
      // Hai ngón: phóng quanh điểm giữa, đồng thời pan theo điểm giữa
      const [a, b] = [...conTro.current.values()];
      const truoc = cu ? { ...cu } : null;
      if (!truoc) return;
      const khac = a.x === e.clientX && a.y === e.clientY ? b : a;
      const dTruoc = Math.hypot(truoc.x - khac.x, truoc.y - khac.y);
      const dSau = Math.hypot(e.clientX - khac.x, e.clientY - khac.y);
      const r = svgRef.current!.getBoundingClientRect();
      const gx = (e.clientX + khac.x) / 2 - r.left; const gy = (e.clientY + khac.y) / 2 - r.top;
      if (dTruoc > 0) phongQuanh(gx, gy, dSau / dTruoc);
      setNhin((v) => ({ ...v, tx: v.tx + (e.clientX - truoc.x) / 2, ty: v.ty + (e.clientY - truoc.y) / 2 }));
      dangPan.current = null;
      return;
    }
    if (dangPan.current) {
      const p = dangPan.current;
      setNhin((v) => ({ ...v, tx: p.tx + (e.clientX - p.x), ty: p.ty + (e.clientY - p.y) }));
    }
  };
  const onNha = (e: React.PointerEvent) => {
    conTro.current.delete(e.pointerId);
    if (keoNut.current) {
      const k = keoNut.current;
      keoNut.current = null;
      if (k.dangKeo) {
        const { wx, wy } = toaDoThe(e);
        const dich = boCuc.nut.find((n) => n.id !== k.id && wx >= n.x && wx <= n.x + n.w && wy >= n.y && wy <= n.y + n.h);
        if (dich) dat((g) => doiCha(g, k.id, dich.id));
        setKeo(null);
      }
      return;
    }
    if (conTro.current.size === 0) dangPan.current = null;
  };

  const onXuongNut = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (dangSua && dangSua !== id) ketThucSua(true);
    setChon(id);
    khungRef.current?.focus();
    if (chiDoc) return;
    keoNut.current = { id, x0: e.clientX, y0: e.clientY, dangKeo: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  // ---------------- xuất ----------------
  useImperativeHandle(ref, () => ({
    layDuLieu: () => ({ phien_ban: 1, goc }),
    xuatSvg: () => {
      const { x, y, w, h } = boCuc.khung;
      const W = Math.ceil(w + DEM * 2); const H = Math.ceil(h + DEM * 2);
      const ruot = gRef.current ? new XMLSerializer().serializeToString(gRef.current).replace(/^<g[^>]*>/, '').replace(/<\/g>$/, '') : '';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="${x - DEM} ${y - DEM} ${W} ${H}" style="font-family:${FONT_MINDMAP}"><rect x="${x - DEM}" y="${y - DEM}" width="${W}" height="${H}" fill="#FFFDF8"/>${ruot}</svg>`;
      return { svg, w: W, h: H };
    },
  }), [goc, boCuc.khung]);

  const nutChon = chon ? theoId.get(chon) : undefined;
  const nutSua = dangSua ? theoId.get(dangSua) : undefined;

  return (
    <div
      ref={khungRef}
      tabIndex={0}
      onKeyDown={onPhim}
      className="relative h-full w-full select-none overflow-hidden rounded-xl bg-[#FFFDF8] outline-none ring-[#A8763E]/40 focus-visible:ring-2"
      style={{ touchAction: 'none' }}
    >
      <svg
        ref={svgRef}
        className="h-full w-full"
        style={{ fontFamily: FONT_MINDMAP, cursor: dangPan.current ? 'grabbing' : 'grab' }}
        onWheel={onLan}
        onPointerDown={onXuongNen}
        onPointerMove={onDiChuyen}
        onPointerUp={onNha}
        onPointerCancel={onNha}
      >
        <g ref={gRef} transform={`translate(${nhin.tx} ${nhin.ty}) scale(${nhin.k})`}>
          {boCuc.duong.map((d) => (
            <path key={`${d.tuId}-${d.denId}`} d={d.d} fill="none" stroke={d.mau} strokeWidth={2.2} strokeLinecap="round" opacity={0.9} />
          ))}
          {boCuc.nut.map((n) => (
            <NutSvg
              key={n.id} n={n} chon={chon === n.id} dangSua={dangSua === n.id} doChu={doChu}
              onXuong={(e) => onXuongNut(e, n.id)}
              onNhayDup={() => batDauSua(n.id)}
              onGap={() => dat((g) => gapMo(g, n.id))}
            />
          ))}
          {keo && (() => {
            const n = theoId.get(keo.id);
            return n ? <rect x={keo.x - n.w / 2} y={keo.y - n.h / 2} width={n.w} height={n.h} rx={10} fill={n.mau} opacity={0.35} pointerEvents="none" /> : null;
          })()}
        </g>
      </svg>

      {/* Ô sửa chữ đặt đè lên đúng nút — không dùng foreignObject vì Safari vẽ nó lệch khi scale */}
      {nutSua && (
        <textarea
          ref={oNhapRef}
          value={nhap}
          onChange={(e) => setNhap(e.target.value)}
          onBlur={() => ketThucSua(true)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ketThucSua(true); }
            if (e.key === 'Escape') { e.preventDefault(); ketThucSua(false); }
            if (e.key === 'Tab') { e.preventDefault(); ketThucSua(true); setTimeout(() => themY('CON'), 0); }
          }}
          className="absolute resize-none rounded-lg border-2 border-[#1F4E79] bg-white px-3 py-1.5 text-slate-800 shadow-lg outline-none"
          style={{
            left: nhin.tx + nutSua.x * nhin.k, top: nhin.ty + nutSua.y * nhin.k,
            width: Math.max(nutSua.w * nhin.k, 160), minHeight: nutSua.h * nhin.k,
            fontSize: fontTheoCap(nutSua.capDo).co * nhin.k, fontWeight: fontTheoCap(nutSua.capDo).dam, lineHeight: `${DONG_CAO * nhin.k}px`,
          }}
        />
      )}

      {/* Gợi ý phím — chỉ máy tính */}
      {!chiDoc && (
        <p className="pointer-events-none absolute left-3 top-2 hidden text-2xs text-slate-400 md:block">
          Tab thêm ý con · Enter thêm ý cùng cấp · nháy đúp sửa · Delete xoá · kéo nút thả lên nút khác để dời nhánh · Ctrl+lăn phóng
        </p>
      )}

      {/* Thanh công cụ nổi — bọc trong dải full-width vì phần tử absolute đặt left:50%
          chỉ được rộng tối đa nửa khung, thanh dài là tự gãy dòng */}
      <div className="pointer-events-none absolute inset-x-2 bottom-3 flex justify-center">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
        {!chiDoc && (
          <>
            <NutCongCu nhan="Thêm ý con (Tab)" onClick={() => themY('CON')} disabled={!chon}><GitBranchPlus className="h-4 w-4" /><span className="hidden sm:inline">Ý con</span></NutCongCu>
            <NutCongCu nhan="Thêm ý cùng cấp (Enter)" onClick={() => themY('ANH_EM')} disabled={!chon}><CornerDownRight className="h-4 w-4" /><span className="hidden sm:inline">Cùng cấp</span></NutCongCu>
            <Popover>
              <PopoverTrigger asChild>
                <span><NutCongCu nhan="Màu nhánh" disabled={!chon || chon === goc.id}><Palette className="h-4 w-4" /></NutCongCu></span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="top">
                <div className="flex flex-wrap gap-1.5">
                  {MAU_NHANH.map((m) => (
                    <button key={m} type="button" aria-label={`Màu ${m}`} className="h-7 w-7 rounded-full border-2 border-white shadow ring-1 ring-slate-200" style={{ background: m }}
                      onClick={() => chon && dat((g) => doiMau(g, chon, m))} />
                  ))}
                  <button type="button" className="h-7 rounded-full border px-2 text-2xs text-slate-600" onClick={() => chon && dat((g) => doiMau(g, chon, undefined))}>Tự động</button>
                </div>
              </PopoverContent>
            </Popover>
            <NutCongCu nhan="Gập / mở nhánh (Space)" onClick={() => chon && dat((g) => gapMo(g, chon))} disabled={!nutChon || nutChon.soCon === 0}><ChevronsDownUp className="h-4 w-4" /></NutCongCu>
            <NutCongCu nhan="Xoá nhánh (Delete)" onClick={xoa} disabled={!chon || chon === goc.id}><Trash2 className="h-4 w-4 text-red-600" /></NutCongCu>
            <span className="mx-1 h-6 w-px bg-slate-200" />
            <NutCongCu nhan="Hoàn tác (Ctrl+Z)" onClick={hoanTac} disabled={!coHoanTac}><Undo2 className="h-4 w-4" /></NutCongCu>
            <NutCongCu nhan="Làm lại (Ctrl+Y)" onClick={lamLai} disabled={!coLamLai}><Redo2 className="h-4 w-4" /></NutCongCu>
            <span className="mx-1 h-6 w-px bg-slate-200" />
          </>
        )}
        <NutCongCu nhan="Thu nhỏ" onClick={() => { const el = khungRef.current!; phongQuanh(el.clientWidth / 2, el.clientHeight / 2, 0.8); }}><Minus className="h-4 w-4" /></NutCongCu>
        <span className="hidden w-10 text-center text-2xs tabular-nums text-slate-500 sm:inline">{Math.round(nhin.k * 100)}%</span>
        <NutCongCu nhan="Phóng to" onClick={() => { const el = khungRef.current!; phongQuanh(el.clientWidth / 2, el.clientHeight / 2, 1.25); }}><Plus className="h-4 w-4" /></NutCongCu>
        <NutCongCu nhan="Vừa khung" onClick={vuaKhung}><Maximize2 className="h-4 w-4" /></NutCongCu>
      </div>
      </div>
    </div>
  );
});

function NutCongCu({ nhan, children, ...p }: React.ComponentProps<typeof Button> & { nhan: string }) {
  return (
    <Button type="button" size="sm" variant="ghost" className="h-9 gap-1 px-2 text-xs" title={nhan} aria-label={nhan} {...p}>{children}</Button>
  );
}

function NutSvg({ n, chon, dangSua, doChu, onXuong, onNhayDup, onGap }: {
  n: NutDaXep; chon: boolean; dangSua: boolean;
  doChu: (t: string, c: number) => { dong: string[] };
  onXuong: (e: React.PointerEvent) => void; onNhayDup: () => void; onGap: () => void;
}) {
  const f = fontTheoCap(n.capDo);
  const dong = doChu(n.van_ban, n.capDo).dong;
  const goc = n.capDo === 0;
  const fill = goc ? n.mau : n.capDo === 1 ? `${n.mau}22` : '#FFFFFF';
  const vien = goc ? n.mau : n.capDo === 1 ? n.mau : '#D6D3CD';
  const chu = goc ? '#FFFFFF' : '#1F2937';
  const demDoc = 8 + (goc ? 4 : 0);
  // Huy hiệu gập nằm ở mép ngoài (phía xa gốc)
  const hxGap = n.ben === 'TRAI' ? n.x - 10 : n.x + n.w + 10;
  return (
    <g style={{ cursor: 'pointer' }} onPointerDown={onXuong} onDoubleClick={onNhayDup} opacity={dangSua ? 0.25 : 1}>
      {chon && <rect x={n.x - 3} y={n.y - 3} width={n.w + 6} height={n.h + 6} rx={13} fill="none" stroke="#1F4E79" strokeWidth={2} strokeDasharray="0" />}
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={10} fill={fill} stroke={vien} strokeWidth={goc ? 0 : 1.5} />
      <text x={n.x + 14} y={n.y + demDoc + f.co - 2} fill={chu} fontSize={f.co} fontWeight={f.dam} style={{ userSelect: 'none' }}>
        {dong.map((d, i) => <tspan key={i} x={n.x + 14} dy={i === 0 ? 0 : DONG_CAO}>{d}</tspan>)}
      </text>
      {n.soCon > 0 && (
        <g onPointerDown={(e) => { e.stopPropagation(); }} onClick={(e) => { e.stopPropagation(); onGap(); }} style={{ cursor: 'pointer' }}>
          <circle cx={hxGap} cy={n.y + n.h / 2} r={n.gap ? 9 : 5} fill={n.gap ? n.mau : '#FFFFFF'} stroke={n.mau} strokeWidth={1.5} />
          {n.gap && <text x={hxGap} y={n.y + n.h / 2 + 3.5} textAnchor="middle" fontSize={10} fontWeight={600} fill="#FFFFFF">{n.soCon}</text>}
        </g>
      )}
    </g>
  );
}

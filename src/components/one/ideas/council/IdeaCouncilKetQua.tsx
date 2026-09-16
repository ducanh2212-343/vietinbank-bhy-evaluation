import React, { useMemo } from 'react';
import { CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { TANG_DE_XUAT_INFO, formatDiem, type CapXet, type DongTongHopRpc } from '@/lib/ideaCouncil';

// BẢNG KẾT QUẢ nhìn-là-thấy cho Chủ tịch Hội đồng và TCTH (16/09/2026).
//
// Bảng Phụ lục 07 bên dưới đúng mẫu biểu nhưng 14 cột, phải kéo ngang, và cột
// kết luận nằm tít bên phải — Chủ tịch muốn biết «đạt bao nhiêu, cái nào không
// đạt, vì sao» thì phải dò từng dòng. Khối này chia đôi: đạt một bên, chưa đạt
// một bên kèm lý do; số liệu lấy y nguyên từ máy chủ (ket_luan là cái ghi sổ),
// không tính lại gì ở đây.

interface Props {
  capXet: CapXet;
  items: DongTongHopRpc[];
}

const DON_GIA: Record<CapXet, number> = { 'Vươn cành': 1_000_000, 'Lan tỏa': 2_000_000 };

export const IdeaCouncilKetQua: React.FC<Props> = ({ capXet, items }) => {
  const { dat, chuaDat, theoPhong } = useMemo(() => {
    const dat = items
      .filter(d => d.ketLuanMayChu)
      .sort((a, b) => (b.tongHop.diemTbChung ?? 0) - (a.tongHop.diemTbChung ?? 0));
    const chuaDat = items
      .filter(d => !d.ketLuanMayChu)
      .sort((a, b) => (b.tongHop.diemTbChung ?? 0) - (a.tongHop.diemTbChung ?? 0));
    const phong = new Map<string, { dat: number; tong: number }>();
    for (const d of items) {
      const p = phong.get(d.departmentName) ?? { dat: 0, tong: 0 };
      p.tong += 1;
      if (d.ketLuanMayChu) p.dat += 1;
      phong.set(d.departmentName, p);
    }
    return {
      dat, chuaDat,
      theoPhong: [...phong.entries()].map(([ten, s]) => ({ ten, ...s })).sort((a, b) => b.tong - a.tong),
    };
  }, [items]);

  if (items.length === 0) return null;
  const tongTien = dat.length * DON_GIA[capXet];
  const dongY = (d: DongTongHopRpc) =>
    capXet === 'Lan tỏa' ? d.tongHop.soDongYLanToa : d.tongHop.soDongYVuonCanh;

  return (
    <div className="space-y-3">
      {/* Ba ô số */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3 text-center">
          <p className="text-2xl font-black text-emerald-700">{dat.length}</p>
          <p className="text-2xs font-bold text-emerald-800">Đạt {capXet}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-300 bg-slate-50 p-3 text-center">
          <p className="text-2xl font-black text-slate-700">{chuaDat.length}</p>
          <p className="text-2xs font-bold text-slate-600">Chưa đạt</p>
        </div>
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-center">
          <p className="text-xl font-black text-amber-700">{tongTien.toLocaleString('vi-VN')}đ</p>
          <p className="text-2xs font-bold text-amber-800 flex items-center justify-center gap-1">
            <Wallet className="h-3 w-3" /> {DON_GIA[capXet].toLocaleString('vi-VN')}đ × {dat.length}
          </p>
        </div>
      </div>

      {/* Hai cột đạt / chưa đạt */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Đạt — {TANG_DE_XUAT_INFO[capXet].thuong}
          </p>
          {dat.length === 0 && <p className="text-2xs italic text-slate-400">Chưa có ý tưởng nào đạt.</p>}
          {dat.map(d => (
            <div key={d.itemId} className="flex items-start gap-2 rounded-lg bg-emerald-50/60 px-2.5 py-1.5">
              <span className="shrink-0 font-black text-2xs text-emerald-800">{d.ideaCode.replace('BHYI-2026-', '')}</span>
              <span className="min-w-0 flex-1 text-2xs font-semibold text-slate-700">
                <span className="line-clamp-1" title={d.ideaTitle}>{d.ideaTitle}</span>
                <span className="block text-slate-400 font-medium">{d.departmentName}</span>
              </span>
              <span className="shrink-0 text-right text-2xs font-bold text-emerald-700">
                {formatDiem(d.tongHop.diemTbChung)}
                <span className="block font-medium text-slate-500">{dongY(d)}/{d.tongHop.soPhieuHopLe} đồng ý</span>
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-black text-slate-700">
            <XCircle className="h-4 w-4" /> Chưa đạt — kèm lý do theo ngưỡng
          </p>
          {chuaDat.length === 0 && <p className="text-2xs italic text-slate-400">Không có ý tưởng nào chưa đạt.</p>}
          {chuaDat.map(d => (
            <div key={d.itemId} className="rounded-lg bg-slate-50 px-2.5 py-1.5">
              <div className="flex items-start gap-2">
                <span className="shrink-0 font-black text-2xs text-slate-700">{d.ideaCode.replace('BHYI-2026-', '')}</span>
                <span className="min-w-0 flex-1 text-2xs font-semibold text-slate-700">
                  <span className="line-clamp-1" title={d.ideaTitle}>{d.ideaTitle}</span>
                  <span className="block text-slate-400 font-medium">{d.departmentName}</span>
                </span>
                <span className="shrink-0 text-right text-2xs font-bold text-slate-600">
                  {formatDiem(d.tongHop.diemTbChung)}
                  <span className="block font-medium text-slate-500">{dongY(d)}/{d.tongHop.soPhieuHopLe} đồng ý</span>
                </span>
              </div>
              {d.lyDoChuaDat.map(l => (
                <p key={l} className="mt-0.5 pl-6 text-2xs text-red-600">• {l}</p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Theo phòng — một dòng mỗi phòng */}
      <div className="flex flex-wrap gap-1.5">
        {theoPhong.map(p => (
          <span
            key={p.ten}
            className={`rounded-lg px-2 py-1 text-2xs font-bold ${p.dat === p.tong ? 'bg-emerald-100 text-emerald-800' : p.dat === 0 ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800'}`}
            title={`${p.ten}: ${p.dat} đạt / ${p.tong} trình`}
          >
            {p.ten}: {p.dat}/{p.tong}
          </span>
        ))}
      </div>
    </div>
  );
};

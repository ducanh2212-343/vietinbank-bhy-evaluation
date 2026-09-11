import React, { useState } from 'react';
import { ListPlus, Play, Square, Trash2 } from 'lucide-react';
import {
  SO_Y_TUONG_KHUYEN_NGHI,
  TRANG_THAI_PHIEN_LABELS,
  TRANG_THAI_PHIEN_MAU,
  demTheoPhien,
  sapXepPhien,
  type PhienTrinhBay,
} from '@/lib/ideaCouncilPhien';
import { useCouncilMutations, type CouncilItem, type CouncilRound } from './useIdeaCouncil';

// Khung PHIÊN TRÌNH BÀY của Phòng TCTH.
//
// Kịch bản họp thật (11/09/2026): một nhóm 1–5 ý tưởng lên trình bày, xong thì
// Hội đồng chấm ngay nhóm đó rồi mới sang nhóm sau. TCTH xếp trước các phiên,
// tới lúc họp thì bấm «Bắt đầu trình bày» cho từng phiên — màn chấm của mọi
// thành viên tự thu về đúng phiên đó trong vòng 15 giây.
//
// Xếp phiên KHÔNG đụng tới phiếu chấm: đổi phiên, xóa phiên hay bỏ ra khỏi
// phiên đều không làm mất phiếu ai đã gửi, và điểm tổng hợp vẫn tính trên toàn
// đợt. Nhờ vậy dùng được ngay giữa đợt đang chấm dở.

interface Props {
  round: CouncilRound;
  items: CouncilItem[];
  phien: PhienTrinhBay[];
}

export const IdeaCouncilPhienPanel: React.FC<Props> = ({ round, items, phien }) => {
  const { taoPhien, suaPhien, xoaPhien, xepVaoPhien, moPhien, dongPhien } = useCouncilMutations(round.id);
  const [tenMoi, setTenMoi] = useState('');

  const cacPhien = sapXepPhien(phien);
  const dem = demTheoPhien(items);
  const chuaXep = dem.get(null) ?? 0;

  const handleTao = async (e: React.FormEvent) => {
    e.preventDefault();
    const ten = tenMoi.trim() || `Phiên ${cacPhien.length + 1}`;
    if (await taoPhien(round.id, ten, cacPhien.length + 1)) setTenMoi('');
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="font-black text-slate-700 flex items-center gap-1.5">
          🎤 Phiên trình bày của đợt «{round.name}»
        </p>
        <p className="text-2xs text-slate-500 mt-0.5">
          Xếp ý tưởng thành từng nhóm trình bày. Tới lượt nhóm nào, bấm «Bắt đầu» — màn
          chấm của cả Hội đồng tự thu về đúng nhóm đó, khỏi phải dò trong {items.length} ý tưởng.
          Xếp phiên không ảnh hưởng phiếu đã chấm và không đổi cách tính điểm.
        </p>
      </div>

      <form onSubmit={handleTao} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px] space-y-1">
          <label className="font-bold text-slate-700 block">Thêm phiên</label>
          <input
            type="text"
            value={tenMoi}
            onChange={e => setTenMoi(e.target.value)}
            placeholder={`VD: Phiên ${cacPhien.length + 1} — Khối KHDN`}
            className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-semibold"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold shadow-sm transition-all cursor-pointer"
        >
          <ListPlus className="w-3.5 h-3.5" /> Tạo phiên
        </button>
      </form>

      {cacPhien.length === 0 ? (
        <p className="text-slate-400 italic text-center py-3">
          Chưa có phiên nào — cả {items.length} ý tưởng hiện trong một danh sách.
        </p>
      ) : (
        <div className="space-y-1.5">
          {cacPhien.map(p => {
            const so = dem.get(p.id) ?? 0;
            const dangTrinh = p.trangThai === 'dang_trinh';
            return (
              <div
                key={p.id}
                className={`flex flex-wrap items-center gap-2 p-2.5 rounded-xl border transition-all ${
                  dangTrinh ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    const nhap = window.prompt('Tên phiên:', p.ten);
                    if (nhap && nhap.trim() && nhap.trim() !== p.ten) void suaPhien(p.id, { ten: nhap });
                  }}
                  className="flex-1 min-w-[140px] text-left font-black text-slate-700 cursor-pointer hover:text-amber-600"
                  title="Bấm để đổi tên phiên"
                >
                  {p.ten}
                  <span className="block text-2xs text-slate-400 font-medium">
                    {so} ý tưởng
                    {so > SO_Y_TUONG_KHUYEN_NGHI && (
                      <span className="text-amber-600 font-bold">
                        {' '}· quá {SO_Y_TUONG_KHUYEN_NGHI} ý tưởng, Hội đồng dễ quên bài đầu
                      </span>
                    )}
                    {p.batDauLuc && ` · bắt đầu ${new Date(p.batDauLuc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                </button>
                <span className={`px-2 py-0.5 rounded-full text-2xs font-black ${TRANG_THAI_PHIEN_MAU[p.trangThai]}`}>
                  {TRANG_THAI_PHIEN_LABELS[p.trangThai]}
                </span>
                {dangTrinh ? (
                  <button
                    type="button"
                    onClick={() => void dongPhien(p.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-2xs transition-all cursor-pointer"
                  >
                    <Square className="w-3 h-3" /> Kết thúc
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={so === 0 || round.status !== 'open'}
                    onClick={() => void moPhien(p.id)}
                    title={
                      round.status !== 'open'
                        ? 'Mở đợt chấm trước đã'
                        : so === 0 ? 'Xếp ý tưởng vào phiên trước đã' : 'Màn chấm của Hội đồng sẽ thu về phiên này'
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-2xs transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3" /> Bắt đầu
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Xóa «${p.ten}»? ${so} ý tưởng quay về nhóm chưa xếp phiên — phiếu đã chấm KHÔNG bị ảnh hưởng.`)) {
                      void xoaPhien(p.id);
                    }
                  }}
                  className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                  title="Xóa phiên (không mất ý tưởng, không mất phiếu)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Xếp từng ý tưởng vào phiên */}
      {cacPhien.length > 0 && (
        <div className="space-y-1">
          <p className="font-bold text-slate-700">
            Xếp ý tưởng vào phiên
            {chuaXep > 0 && <span className="text-slate-400 font-medium"> · còn {chuaXep} ý tưởng chưa xếp</span>}
          </p>
          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {items.map(it => (
              <div key={it.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-slate-100 bg-white">
                <span className="font-black text-slate-700">{it.ideaCode}</span>
                <span className="flex-1 min-w-[140px] text-slate-600 font-semibold truncate" title={it.idea.title}>
                  {it.idea.title}
                </span>
                <span className="text-2xs text-slate-400">{it.idea.departmentName}</span>
                <select
                  value={it.sessionId ?? ''}
                  onChange={e => void xepVaoPhien(it.id, e.target.value || null)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-bold text-slate-700"
                >
                  <option value="">— Chưa xếp phiên —</option>
                  {cacPhien.map(p => (
                    <option key={p.id} value={p.id}>{p.ten}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { CalendarPlus, ChevronDown, ChevronUp, Gavel, Trash2, UserRound } from 'lucide-react';
import {
  DE_XUAT_LABELS,
  TIEU_CHI_HOI_DONG,
  TRANG_THAI_DOT_LABELS,
  XUNG_DOT_LABELS,
  goiYMaYTuong,
  type TangDeXuat,
  type TrangThaiDot,
} from '@/lib/ideaCouncil';
import { useIdeaOwnerProfiles } from '../useIdeaOwnerProfiles';
import {
  useCouncilCandidates,
  useCouncilMutations,
  type CouncilItem,
  type CouncilRound,
} from './useIdeaCouncil';

// Khung quản trị của Phòng TCTH: tạo/mở/chốt đợt chấm, trình ý tưởng lên Hội
// đồng (cấp mã + tầng đề xuất), xem phiếu chi tiết định danh và gạt cờ
// "tính tham khảo" cho phiếu có xung đột lợi ích theo quyết định của Hội đồng.

interface IdeaCouncilAdminProps {
  rounds: CouncilRound[];
  selectedRound: CouncilRound | null;
  items: CouncilItem[];
  onSelectRound: (id: string) => void;
}

const CHUYEN_TRANG_THAI: Record<TrangThaiDot, { next: TrangThaiDot; label: string } | null> = {
  draft: { next: 'open', label: 'Mở đợt chấm' },
  open: { next: 'closed', label: 'Chốt đợt chấm' },
  closed: null,
};

export const IdeaCouncilAdmin: React.FC<IdeaCouncilAdminProps> = ({ rounds, selectedRound, items, onSelectRound }) => {
  const { taoDot, doiTrangThaiDot, themYTuong, goYTuong, datThamKhao } = useCouncilMutations(selectedRound?.id ?? null);
  const { candidates } = useCouncilCandidates(true);
  const { owners } = useIdeaOwnerProfiles(true);

  const [tenDot, setTenDot] = useState('');
  const [ghiChuDot, setGhiChuDot] = useState('');
  const [ideaId, setIdeaId] = useState('');
  const [maYTuong, setMaYTuong] = useState('');
  const [tang, setTang] = useState<TangDeXuat>('Vươn cành');
  const [openBallots, setOpenBallots] = useState<Record<string, boolean>>({});

  // Ý tưởng đã bật cờ Hội đồng nhưng chưa nằm trong đợt đang chọn
  const ungVien = useMemo(() => {
    const daCo = new Set(items.map(it => it.idea.id));
    return candidates.filter(c => !daCo.has(c.id));
  }, [candidates, items]);

  const maGoiY = goiYMaYTuong(items, new Date().getFullYear());

  const handleTaoDot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenDot.trim()) return;
    if (await taoDot(tenDot, ghiChuDot)) {
      setTenDot('');
      setGhiChuDot('');
    }
  };

  const handleThemYTuong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRound || !ideaId) return;
    if (await themYTuong(selectedRound.id, ideaId, maYTuong.trim() || maGoiY, tang)) {
      setIdeaId('');
      setMaYTuong('');
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Tạo đợt chấm */}
      <form onSubmit={handleTaoDot} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px] space-y-1">
          <label className="font-bold text-slate-700 block">Đợt chấm mới (theo quý)</label>
          <input
            type="text"
            value={tenDot}
            onChange={e => setTenDot(e.target.value)}
            placeholder="VD: Quý III/2026"
            className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-semibold"
          />
        </div>
        <div className="flex-1 min-w-[180px] space-y-1">
          <label className="font-bold text-slate-700 block">Ghi chú</label>
          <input
            type="text"
            value={ghiChuDot}
            onChange={e => setGhiChuDot(e.target.value)}
            placeholder="Không bắt buộc"
            className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-medium"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-sm transition-all cursor-pointer"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span>Tạo đợt</span>
        </button>
      </form>

      {/* Danh sách đợt + chuyển trạng thái */}
      <div className="space-y-1.5">
        {rounds.map(r => {
          const chuyen = CHUYEN_TRANG_THAI[r.status];
          const dangChon = selectedRound?.id === r.id;
          return (
            <div
              key={r.id}
              className={`flex flex-wrap items-center gap-2 p-2.5 rounded-xl border transition-all ${dangChon ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}
            >
              <button
                type="button"
                onClick={() => onSelectRound(r.id)}
                className="flex-1 min-w-[140px] text-left font-black text-slate-700 cursor-pointer hover:text-amber-600"
              >
                {r.name}
                {r.note && <span className="block text-[10px] text-slate-400 font-medium">{r.note}</span>}
              </button>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${r.status === 'open' ? 'bg-emerald-100 text-emerald-700' : r.status === 'closed' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                {TRANG_THAI_DOT_LABELS[r.status]}
              </span>
              {chuyen && (
                <button
                  type="button"
                  onClick={() => {
                    const canhBao = chuyen.next === 'closed'
                      ? 'Chốt đợt chấm? Thành viên sẽ không gửi/sửa phiếu được nữa và bản tổng hợp được công bố cho Hội đồng.'
                      : 'Mở đợt chấm cho thành viên Hội đồng gửi phiếu?';
                    if (window.confirm(canhBao)) void doiTrangThaiDot(r.id, chuyen.next);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-[10px] transition-all cursor-pointer"
                >
                  {chuyen.label}
                </button>
              )}
            </div>
          );
        })}
        {rounds.length === 0 && (
          <p className="text-slate-400 italic text-center py-3">Chưa có đợt chấm nào — tạo đợt đầu tiên ở trên.</p>
        )}
      </div>

      {selectedRound && (
        <>
          {/* Trình ý tưởng lên Hội đồng */}
          <form onSubmit={handleThemYTuong} className="p-3 bg-violet-50/50 border border-violet-200 rounded-xl space-y-2">
            <p className="font-black text-violet-800 flex items-center gap-1.5">
              <Gavel className="w-4 h-4" />
              Trình ý tưởng vào đợt «{selectedRound.name}»
            </p>
            <p className="text-[10px] text-slate-500">
              Chỉ liệt kê ý tưởng đã bật cờ «Đề xuất Hội đồng» ở bảng theo dõi BHY Ideas.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[220px] space-y-1">
                <label className="font-bold text-slate-700 block">Ý tưởng</label>
                <select
                  value={ideaId}
                  onChange={e => setIdeaId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-violet-500 font-semibold"
                >
                  <option value="">-- Chọn ý tưởng --</option>
                  {ungVien.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.development_level}] {c.title} — {c.department_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Mã ý tưởng</label>
                <input
                  type="text"
                  value={maYTuong}
                  onChange={e => setMaYTuong(e.target.value)}
                  placeholder={maGoiY}
                  className="w-36 p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-violet-500 font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Tầng đề xuất</label>
                <select
                  value={tang}
                  onChange={e => setTang(e.target.value as TangDeXuat)}
                  className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-violet-500 font-semibold"
                >
                  <option value="Vươn cành">Vươn cành 🌳</option>
                  <option value="Lan tỏa">Lan tỏa ⭐</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={!ideaId}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-sm transition-all cursor-pointer"
              >
                Trình Hội đồng
              </button>
            </div>
          </form>

          {/* Ý tưởng trong đợt + phiếu chi tiết định danh */}
          <div className="space-y-2">
            {items.map(it => {
              const moPhieu = openBallots[it.id] ?? false;
              return (
                <div key={it.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50">
                    <span className="font-black text-slate-700">{it.ideaCode}</span>
                    <span className="flex-1 min-w-[160px] font-semibold text-slate-600 truncate">{it.idea.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${it.proposedTier === 'Lan tỏa' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {it.proposedTier}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">{it.votes.length} phiếu</span>
                    <button
                      type="button"
                      onClick={() => setOpenBallots(prev => ({ ...prev, [it.id]: !moPhieu }))}
                      className="p-1.5 rounded text-slate-500 hover:bg-slate-200 transition-all cursor-pointer"
                      title="Xem phiếu chi tiết (chỉ TCTH)"
                    >
                      {moPhieu ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Gỡ ý tưởng khỏi đợt chấm? Toàn bộ phiếu đã chấm cho ý tưởng này sẽ bị xóa.')) {
                          void goYTuong(it.id);
                        }
                      }}
                      className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                      title="Gỡ khỏi đợt chấm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {moPhieu && (
                    <div className="p-2.5 space-y-1.5 bg-white">
                      <p className="text-[10px] text-slate-400">
                        Phiếu định danh — chỉ Phòng TCTH xem để tổng hợp, không công khai.
                        Gạt «Tham khảo» để loại phiếu khỏi điểm trung bình chính thức theo quyết định của Hội đồng.
                      </p>
                      {it.votes.length === 0 && (
                        <p className="text-slate-400 italic">Chưa có phiếu nào.</p>
                      )}
                      {it.votes.map(v => (
                        <div key={v.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 p-2 rounded-lg border ${v.thamKhao ? 'bg-slate-50 border-slate-200 opacity-70' : 'border-slate-100'}`}>
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <UserRound className="w-3 h-3 text-slate-400" />
                            {owners[v.userId]?.fullName || 'Không rõ tên'}
                          </span>
                          <span className="text-[10px] text-slate-500">{XUNG_DOT_LABELS[v.xungDot]}</span>
                          <span className="text-[10px] font-semibold text-slate-600">
                            {TIEU_CHI_HOI_DONG.map(tc => v.diem[tc.key]).join(' · ')}
                          </span>
                          <span className="text-[10px] font-bold text-amber-700">{DE_XUAT_LABELS[v.deXuat]}</span>
                          {v.gopY && <span className="text-[10px] text-slate-500 italic flex-1 min-w-[140px]">“{v.gopY}”</span>}
                          <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer ml-auto">
                            <input
                              type="checkbox"
                              checked={v.thamKhao}
                              onChange={e => void datThamKhao(v.id, e.target.checked)}
                              className="accent-amber-500"
                            />
                            Tham khảo
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="text-slate-400 italic text-center py-3">Đợt này chưa có ý tưởng nào.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

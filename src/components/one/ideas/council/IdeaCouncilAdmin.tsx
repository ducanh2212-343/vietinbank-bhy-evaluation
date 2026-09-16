import React, { useMemo, useState } from 'react';
import { CalendarPlus, ChevronDown, ChevronUp, Gavel, Trash2, UserRound } from 'lucide-react';
import {
  CAP_XET_LABELS,
  DE_XUAT_LABELS,
  NGAY_TOI_THIEU_LAN_TOA,
  TANG_DE_XUAT_INFO,
  TIEU_CHI_HOI_DONG,
  TRANG_THAI_DOT_LABELS,
  goiYMaYTuong,
  type CapXet,
  type TrangThaiDot,
} from '@/lib/ideaCouncil';
import { useIdeaOwnerProfiles } from '../useIdeaOwnerProfiles';
import {
  LY_DO_KHONG_CHAM_LABELS,
  useAnonBallots,
  useCouncilMutations,
  useIdeaCouncilAccess,
  usePhienTrinhBay,
  useUngVien,
  type CouncilItem,
  type CouncilRound,
} from './useIdeaCouncil';
import { IdeaCouncilMembers } from './IdeaCouncilMembers';
import { IdeaCouncilPhienPanel } from './IdeaCouncilPhienPanel';
import { IdeaCouncilProgress } from './IdeaCouncilProgress';

// Khung quản trị của Phòng TCTH: tạo/mở/chốt đợt chấm, trình ý tưởng lên Hội
// đồng (cấp mã) và tổng hợp phiếu.
//
// HAI CẤP HỌP (16/09/2026): mỗi đợt mang một cấp xét — Vươn cành hoặc Lan tỏa.
// Đợt Lan tỏa chỉ nhận ý tưởng đã được Hội đồng công nhận Vươn cành tối thiểu
// 30 ngày; không còn tầng «xét thẳng Lan tỏa». Ứng viên do máy chủ lọc
// (bhy_ideas_hd_ung_vien), CSDL chặn lần nữa khi trình.
//
// Chốt ẩn danh 08/2026: phiếu hiển thị ở đây là bản ẨN DANH (RPC
// bhy_ideas_hd_phieu_an_danh) — TCTH/BGĐ không thấy ai chấm bao nhiêu; danh
// tính người chấm chỉ System Admin thấy (RLS chỉ mở phiếu định danh cho vai
// trò này, UI ghép tên từ đó). MỌI phiếu đều tính vào điểm — phiếu có khai
// xung đột lợi ích (A4) chỉ được đánh dấu để Hội đồng cân nhắc (mục VI.4).

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
  const { isSystemAdmin } = useIdeaCouncilAccess();
  const { taoDot, doiTrangThaiDot, datHanChot, themYTuong, rutYTuong } = useCouncilMutations(selectedRound?.id ?? null);
  const { phien } = usePhienTrinhBay(selectedRound?.id ?? null, !!selectedRound);
  const { ungVien } = useUngVien(selectedRound?.id ?? null, !!selectedRound);
  // Phiếu ẩn danh chỉ mở sau khi đợt CHỐT (System Admin xem mọi lúc) — RPC gác;
  // đang mở thì không gọi, hiển thị ghi chú khóa thay vì "chưa có phiếu"
  const phieuBiKhoa = !!selectedRound && !isSystemAdmin && selectedRound.status !== 'closed';
  const { ballotsByItem, error: loiPhieuAnDanh } = useAnonBallots(
    selectedRound?.id ?? null,
    !!selectedRound && !phieuBiKhoa,
  );
  // Hồ sơ chỉ tải cho System Admin — người duy nhất được ghép tên vào phiếu
  const { owners } = useIdeaOwnerProfiles(isSystemAdmin);

  const [tenDot, setTenDot] = useState('');
  const [ghiChuDot, setGhiChuDot] = useState('');
  const [hanChot, setHanChot] = useState('');
  const [capXetMoi, setCapXetMoi] = useState<CapXet>('Vươn cành');
  const [ideaId, setIdeaId] = useState('');
  const [maYTuong, setMaYTuong] = useState('');
  const [openBallots, setOpenBallots] = useState<Record<string, boolean>>({});

  // Danh tính người chấm — chỉ System Admin dựng được map này: RLS chỉ trả
  // phiếu định danh của người khác cho vai trò system_admin
  const tenTheoVoteId = useMemo(() => {
    const m = new Map<string, string>();
    if (!isSystemAdmin) return m;
    for (const it of items) {
      for (const v of it.votes) m.set(v.id, owners[v.userId]?.fullName || 'Không rõ tên');
    }
    return m;
  }, [isSystemAdmin, items, owners]);

  const maGoiY = goiYMaYTuong(items, new Date().getFullYear());

  const handleTaoDot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenDot.trim()) return;
    if (await taoDot(tenDot, ghiChuDot, hanChot ? new Date(hanChot).toISOString() : null, capXetMoi)) {
      setTenDot('');
      setGhiChuDot('');
      setHanChot('');
    }
  };

  const handleThemYTuong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRound || !ideaId) return;
    if (await themYTuong(selectedRound.id, ideaId, maYTuong.trim() || maGoiY, selectedRound.capXet)) {
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
        <div className="space-y-1">
          <label className="font-bold text-slate-700 block" title="Hai cấp họp tách bạch — đợt Lan tỏa chỉ nhận ý tưởng đã Vươn cành tối thiểu 30 ngày">
            Cấp xét
          </label>
          <select
            value={capXetMoi}
            onChange={e => setCapXetMoi(e.target.value as CapXet)}
            className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-semibold"
          >
            <option value="Vươn cành">🌳 Xét Vươn cành</option>
            <option value="Lan tỏa">⭐ Xét Lan tỏa</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="font-bold text-slate-700 block" title="Quá hạn hệ thống tự chốt đợt; còn ≤3 ngày sẽ tự nhắc push thành viên chưa gửi phiếu">
            Hạn gửi phiếu
          </label>
          <input
            type="datetime-local"
            value={hanChot}
            onChange={e => setHanChot(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-medium"
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
                <span className="block text-2xs text-slate-400 font-medium">
                  {r.note && <>{r.note} · </>}
                  {r.votingDeadline
                    ? `⏰ Hạn ${new Date(r.votingDeadline).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                    : 'Chưa đặt hạn gửi phiếu'}
                </span>
              </button>
              <span className={`px-2 py-0.5 rounded text-2xs font-bold ${TANG_DE_XUAT_INFO[r.capXet].badgeClass}`} title={CAP_XET_LABELS[r.capXet]}>
                {r.capXet === 'Lan tỏa' ? '⭐ Lan tỏa' : '🌳 Vươn cành'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-2xs font-black ${r.status === 'open' ? 'bg-emerald-100 text-emerald-700' : r.status === 'closed' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                {TRANG_THAI_DOT_LABELS[r.status]}
              </span>
              {r.ghiSoLuc && (
                <span className="px-2 py-0.5 rounded-full text-2xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200"
                  title={`Thưởng đã ghi sổ lúc công bố ${new Date(r.ghiSoLuc).toLocaleString('vi-VN')}`}>
                  💰 Đã ghi sổ
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-2xs font-black ${r.resultsPublished ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}
                title="Công bố/khóa kết quả do Chủ tịch Hội đồng hoặc Quản trị hệ thống bấm ở tab Kết quả tổng hợp">
                {r.resultsPublished ? '🔓 Đã công bố' : '🔒 Chưa công bố'}
              </span>
              {r.status !== 'closed' && (
                <button
                  type="button"
                  onClick={() => {
                    const nhap = window.prompt(
                      'Hạn gửi phiếu (dd/mm/yyyy hh:mm — bỏ trống để xóa hạn):',
                      r.votingDeadline
                        ? new Date(r.votingDeadline).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '',
                    );
                    if (nhap === null) return;
                    if (!nhap.trim()) { void datHanChot(r.id, null); return; }
                    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(nhap.trim());
                    if (!m) { window.alert('Định dạng chưa đúng — ví dụ: 25/09/2026 17:00'); return; }
                    const d = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
                    void datHanChot(r.id, d.toISOString());
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-2xs transition-all cursor-pointer"
                  title="Đặt/sửa hạn gửi phiếu — quá hạn hệ thống tự chốt, còn ≤3 ngày tự nhắc push"
                >
                  ⏰ Hạn
                </button>
              )}
              {chuyen && (
                <button
                  type="button"
                  onClick={() => {
                    const canhBao = chuyen.next === 'closed'
                      ? 'Chốt đợt chấm? Thành viên sẽ không gửi/sửa phiếu được nữa. Kết quả chỉ hiện với Hội đồng sau khi Chủ tịch bấm Công bố.'
                      : 'Mở đợt chấm cho thành viên Hội đồng gửi phiếu?';
                    if (window.confirm(canhBao)) void doiTrangThaiDot(r.id, chuyen.next);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-2xs transition-all cursor-pointer"
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
            <p className="text-2xs text-slate-500">
              {selectedRound.capXet === 'Vươn cành'
                ? 'Đợt xét Vươn cành — chỉ liệt kê ý tưởng đã bật cờ «Đề xuất Hội đồng» và chưa lên cấp Vươn cành.'
                : `Đợt xét Lan tỏa — chỉ liệt kê ý tưởng ĐÃ được Hội đồng công nhận Vươn cành; đủ điều kiện sau ${NGAY_TOI_THIEU_LAN_TOA} ngày triển khai. Không xét vượt cấp.`}
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
                    <option key={c.ideaId} value={c.ideaId} disabled={!c.duDieuKien}>
                      [{c.developmentLevel}] {c.title} — {c.departmentName}
                      {!c.duDieuKien && c.duDieuKienTu
                        ? ` (đủ điều kiện từ ${new Date(c.duDieuKienTu).toLocaleDateString('vi-VN')})`
                        : ''}
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
              <button
                type="submit"
                disabled={!ideaId}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-sm transition-all cursor-pointer"
              >
                Trình Hội đồng
              </button>
            </div>
            <p className="text-2xs text-slate-500">
              {TANG_DE_XUAT_INFO[selectedRound.capXet].moTa} <b className="text-slate-600">Thưởng: {TANG_DE_XUAT_INFO[selectedRound.capXet].thuong}.</b>
            </p>
            {ungVien.length === 0 && (
              <p className="text-2xs text-slate-500 italic">
                {selectedRound.capXet === 'Lan tỏa'
                  ? 'Chưa có ý tưởng nào ở cấp Vươn cành ngoài đợt này — cần một đợt xét Vươn cành công bố trước.'
                  : 'Không còn ý tưởng nào đã bật cờ «Đề xuất Hội đồng» ngoài đợt này.'}
              </p>
            )}
          </form>

          {/* Ý tưởng trong đợt + phiếu ẩn danh (danh tính chỉ System Admin thấy) */}
          <div className="space-y-2">
            {items.map(it => {
              const moPhieu = openBallots[it.id] ?? false;
              const phieu = ballotsByItem[it.id] ?? [];
              return (
                <div key={it.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50">
                    <span className="font-black text-slate-700">{it.ideaCode}</span>
                    <span className="flex-1 min-w-[160px] font-semibold text-slate-600 truncate">{it.idea.title}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-2xs font-bold ${TANG_DE_XUAT_INFO[it.proposedTier].badgeClass}`}
                      title={TANG_DE_XUAT_INFO[it.proposedTier].moTa}
                    >
                      {TANG_DE_XUAT_INFO[it.proposedTier].nhan}
                    </span>
                    <span className="text-2xs text-slate-500 font-bold">
                      {phieuBiKhoa ? '🔒' : `${phieu.length} phiếu`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenBallots(prev => ({ ...prev, [it.id]: !moPhieu }))}
                      className="p-1.5 rounded text-slate-500 hover:bg-slate-200 transition-all cursor-pointer"
                      title="Xem phiếu (bản ẩn danh)"
                    >
                      {moPhieu ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const lyDo = window.prompt(
                          `Rút «${it.ideaCode}» khỏi đợt? Phiếu đã chấm cho ý tưởng này sẽ bị xóa; chủ ý tưởng nhận thông báo kèm lý do bên dưới.\n\nLý do rút:`,
                          'Xin rút để hoàn thiện thêm',
                        );
                        if (lyDo && lyDo.trim()) void rutYTuong(it.id, lyDo);
                      }}
                      className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                      title="Rút khỏi đợt chấm (có lý do, báo chủ ý tưởng)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {moPhieu && (
                    <div className="p-2.5 space-y-1.5 bg-white">
                      <p className="text-2xs text-slate-400">
                        {isSystemAdmin
                          ? 'Bạn là Quản trị hệ thống nên thấy danh tính; với Admin TCTH và Ban Giám đốc, phiếu hiển thị ẩn danh.'
                          : 'Phiếu hiển thị ẨN DANH — không ai ngoài Quản trị hệ thống biết ai chấm bao nhiêu.'}
                        {' '}Phiếu của thành viên cùng phòng / liên phòng với ý tưởng <b>bị loại khỏi điểm và mẫu số</b> (chốt 16/09/2026,
                        đánh dấu ✖ — máy nhận diện theo danh bạ; Ban Giám đốc không áp nguyên tắc phòng); các phiếu còn lại đều tính.
                      </p>
                      {phieuBiKhoa ? (
                        <p className="text-slate-500 italic">
                          🔒 Phiếu ẩn danh chỉ xem được sau khi đợt chấm đã chốt — trong lúc chấm hãy dùng
                          mục «Tiến độ chấm» bên dưới để đôn đốc.
                        </p>
                      ) : loiPhieuAnDanh ? (
                        <p className="text-slate-500 italic">{loiPhieuAnDanh.message}</p>
                      ) : phieu.length === 0 && (
                        <p className="text-slate-400 italic">Chưa có phiếu nào.</p>
                      )}
                      {phieu.map((v, i) => (
                        <div key={v.voteId} className={`flex flex-wrap items-center gap-x-3 gap-y-1 p-2 rounded-lg border ${v.lyDoLoai ? 'bg-red-50/40 border-red-200' : 'border-slate-100'}`}>
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <UserRound className="w-3 h-3 text-slate-400" />
                            {tenTheoVoteId.get(v.voteId) ?? `Phiếu ẩn danh #${i + 1}`}
                          </span>
                          {v.lyDoLoai && (
                            <span className="text-2xs font-black text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5"
                              title={LY_DO_KHONG_CHAM_LABELS[v.lyDoLoai]}>
                              ✖ Loại — {v.lyDoLoai === 'cung_phong' ? 'cùng phòng' : v.lyDoLoai === 'lien_phong' ? 'liên phòng' : 'tự đề xuất'}
                            </span>
                          )}
                          <span className="text-2xs font-semibold text-slate-600">
                            {TIEU_CHI_HOI_DONG.map(tc => v.diem[tc.key]).join(' · ')}
                          </span>
                          <span className="text-2xs font-bold text-amber-700">{DE_XUAT_LABELS[v.deXuat]}</span>
                          {v.gopY && <span className="text-2xs text-slate-500 italic flex-1 min-w-[140px]">“{v.gopY}”</span>}
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

          {/* Phiên trình bày — nhóm 1-5 ý tưởng lên trình bày rồi chấm ngay */}
          <div className="p-3 bg-sky-50/50 border border-sky-200 rounded-xl">
            <IdeaCouncilPhienPanel round={selectedRound} items={items} phien={phien} />
          </div>

          {/* Tiến độ chấm + nhắc push — tên thật, không điểm */}
          <div className="p-3 bg-slate-50/60 border border-slate-200 rounded-xl">
            <IdeaCouncilProgress round={selectedRound} />
          </div>
        </>
      )}

      {/* Đội hình Hội đồng — mẫu số quorum, dùng chung mọi đợt */}
      <div className="p-3 bg-slate-50/60 border border-slate-200 rounded-xl">
        <IdeaCouncilMembers />
      </div>
    </div>
  );
};

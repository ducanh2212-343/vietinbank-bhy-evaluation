import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Gavel, ShieldCheck } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { useAuth } from '@/hooks/useAuth';
import { TRANG_THAI_DOT_LABELS, TANG_DE_XUAT_INFO } from '@/lib/ideaCouncil';
import {
  useCouncilMutations,
  useCouncilRoundItems,
  useCouncilRounds,
  useIdeaCouncilAccess,
  type CouncilItem,
} from '@/components/one/ideas/council/useIdeaCouncil';
import { IdeaCouncilVoteForm } from '@/components/one/ideas/council/IdeaCouncilVoteForm';
import { IdeaCouncilSummary } from '@/components/one/ideas/council/IdeaCouncilSummary';
import { IdeaCouncilAdmin } from '@/components/one/ideas/council/IdeaCouncilAdmin';

// Chấm điểm Hội đồng Bac Hung Yen Ideas — thay Google Form của Phụ lục 06.
// Phiếu định danh theo tài khoản đăng nhập (A1-A3 tự có), thông tin ý tưởng
// (B1-B4) do TCTH trình sẵn; thành viên chỉ trả lời A4, C1-C5, D1, D2.
// Ba khung nhìn: Chấm điểm (thành viên) · Tổng hợp (Phụ lục 07) · Quản trị (TCTH).

type Tab = 'cham-diem' | 'tong-hop' | 'quan-tri';

/** Thẻ một ý tưởng trong danh sách chấm: thông tin B1-B4 + nội dung + phiếu */
function ItemCard({ item, readOnly, onSubmit }: {
  item: CouncilItem;
  readOnly: boolean;
  onSubmit: (itemId: string, phieu: Parameters<ReturnType<typeof useCouncilMutations>['guiPhieu']>[1]) => Promise<boolean>;
}) {
  const [moNoiDung, setMoNoiDung] = useState(false);

  const khoiNoiDung: { label: string; value: string; icon: string }[] = [
    { label: 'Thực trạng hiện tại', value: item.idea.currentStatus, icon: '⚠️' },
    { label: 'Giải pháp đề xuất', value: item.idea.proposedSolution, icon: '💡' },
    { label: 'Lợi ích dự kiến', value: item.idea.expectedBenefits, icon: '📈' },
  ].filter(k => k.value.trim());

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* B1-B4: mã, tên, cấp, tầng đề xuất */}
      <div className="p-4 sm:p-5 border-b border-slate-100 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-white font-black text-[10px] tracking-wider">
            {item.ideaCode}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${item.idea.level === 'Nội bộ CN' ? 'bg-[#005a9c]/10 text-[#005a9c]' : 'bg-[#ed1b24]/10 text-[#ed1b24]'}`}>
            {item.idea.level}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${TANG_DE_XUAT_INFO[item.proposedTier].badgeClass}`}
            title={TANG_DE_XUAT_INFO[item.proposedTier].moTa}
          >
            {TANG_DE_XUAT_INFO[item.proposedTier].nhan}
          </span>
          {item.idea.hasDemo && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">🧪 Có Demo</span>
          )}
        </div>
        {/* Dấu hiệu nhận diện riêng cho trường hợp xét thẳng Lan tỏa (yêu cầu vận hành) */}
        {TANG_DE_XUAT_INFO[item.proposedTier].trucTiep && (
          <div className="p-2.5 rounded-lg bg-violet-50 border border-violet-300 text-[11px] text-violet-800 font-semibold">
            ⚡ Trường hợp đặc biệt: ý tưởng được trình <b>xét thẳng Cấp độ Lan tỏa</b> khi chưa qua
            Vươn cành. Nếu Hội đồng thông qua, ý tưởng được thưởng gộp cả hai mức
            (1.000.000đ Vươn cành + 2.000.000–3.000.000đ Lan tỏa).
          </div>
        )}
        <p className="text-[10px] text-slate-500 font-semibold">💰 {TANG_DE_XUAT_INFO[item.proposedTier].thuong}</p>
        <h3 className="font-black text-slate-800 text-sm sm:text-base leading-snug">{item.idea.title}</h3>
        <p className="text-[11px] text-slate-500">
          <b className="text-slate-700">{item.idea.departmentName}</b> · Đề xuất bởi <b className="text-slate-700">{item.idea.proposer}</b>
        </p>
        <button
          type="button"
          onClick={() => setMoNoiDung(o => !o)}
          className="flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
        >
          {moNoiDung ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {moNoiDung ? 'Thu gọn nội dung ý tưởng' : 'Xem nội dung ý tưởng trước khi chấm'}
        </button>
        {moNoiDung && (
          <div className="space-y-2 pt-1">
            {khoiNoiDung.map(k => (
              <div key={k.label} className="space-y-0.5">
                <p className="text-[11px] font-bold text-slate-500">{k.icon} {k.label}:</p>
                <p className="text-[11px] text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2 whitespace-pre-line">{k.value}</p>
              </div>
            ))}
            {khoiNoiDung.length === 0 && (
              <p className="text-[11px] text-slate-400 italic">Phiếu ý tưởng không có mô tả chi tiết.</p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <IdeaCouncilVoteForm
          myVote={item.myVote}
          readOnly={readOnly}
          onSubmit={phieu => onSubmit(item.id, phieu)}
        />
      </div>
    </div>
  );
}

export default function OneIdeaCouncilPage() {
  const { user } = useAuth();
  const { loading, isMember, isAdmin } = useIdeaCouncilAccess();
  const { rounds, isLoading: loadingRounds } = useCouncilRounds(isMember);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('cham-diem');

  // Mặc định chọn đợt đang mở; không có thì đợt mới nhất
  useEffect(() => {
    if (roundId || rounds.length === 0) return;
    // Thành viên thường không thấy đợt nháp có nghĩa gì — ưu tiên đợt đang mở
    const dangMo = rounds.find(r => r.status === 'open');
    setRoundId((dangMo ?? rounds[0]).id);
  }, [rounds, roundId]);

  const selectedRound = useMemo(
    () => rounds.find(r => r.id === roundId) ?? null,
    [rounds, roundId],
  );
  const { items, isLoading: loadingItems } = useCouncilRoundItems(roundId);
  const { guiPhieu } = useCouncilMutations(roundId);

  const daCham = items.filter(i => i.myVote).length;

  const tabs: { id: Tab; label: string; visible: boolean }[] = [
    { id: 'cham-diem', label: '🗳️ Chấm điểm', visible: true },
    { id: 'tong-hop', label: '📊 Kết quả tổng hợp', visible: true },
    { id: 'quan-tri', label: '⚙️ Quản trị đợt chấm', visible: isAdmin },
  ];

  return (
    <OnePageShell>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-5">
        <div className="space-y-2">
          <Link
            to="/one/y-tuong"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Về hệ thống BHY Ideas
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
            <Gavel className="w-6 h-6 text-amber-500" />
            Chấm điểm Hội đồng Bac Hung Yen Ideas
          </h1>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Hội đồng xem xét ý tưởng Cấp độ <b>Vươn cành</b> (có kết quả thực thi) và <b>Lan tỏa</b> (chuẩn
            hóa/nhân rộng) theo 5 tiêu chí thang 1-5. Phiếu chấm <b>định danh</b> theo tài khoản đăng nhập
            nhưng kết quả từng người được <b>ẩn danh với mọi thành viên, kể cả Phòng TCTH và Ban Giám đốc</b> —
            chỉ Quản trị hệ thống truy cập được phiếu định danh; Hội đồng chỉ nhận bản tổng hợp sau khi đợt chấm chốt.
          </p>
        </div>

        {loading || loadingRounds ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
          </div>
        ) : !user || !isMember ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-bold">Trang này dành cho thành viên Hội đồng Bac Hung Yen Ideas.</p>
            <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
              Hội đồng gồm Ban Giám đốc, Trưởng/Phó phụ trách phòng và lãnh đạo Phòng TCTH.
              Nếu bạn được Giám đốc bổ sung vào Hội đồng, liên hệ Phòng TCTH để được phân quyền.
            </p>
          </div>
        ) : (
          <>
            {/* Chọn đợt + tab */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-500">Đợt chấm:</span>
                <select
                  value={roundId ?? ''}
                  onChange={e => setRoundId(e.target.value || null)}
                  className="p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-bold text-slate-700"
                >
                  {rounds.length === 0 && <option value="">Chưa có đợt chấm</option>}
                  {rounds.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {TRANG_THAI_DOT_LABELS[r.status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border ml-auto">
                {tabs.filter(t => t.visible).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'cham-diem' && (
              <div className="space-y-4">
                {selectedRound?.status === 'open' && items.length > 0 && (
                  <p className="text-xs font-bold text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    Bạn đã chấm <span className="text-amber-700">{daCham}/{items.length}</span> ý tưởng trong đợt này.
                  </p>
                )}
                {selectedRound?.status === 'draft' && (
                  <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded-xl p-3">
                    Đợt chấm đang chuẩn bị — Phòng TCTH sẽ mở khi danh sách ý tưởng được chốt.
                  </p>
                )}
                {selectedRound?.status === 'closed' && (
                  <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    Đợt chấm đã chốt — xem kết quả ở tab «Kết quả tổng hợp». Phiếu đã gửi hiển thị bên dưới để đối chiếu.
                  </p>
                )}
                {loadingItems ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-10">
                    {selectedRound ? 'Đợt này chưa có ý tưởng nào được trình Hội đồng.' : 'Chưa có đợt chấm nào.'}
                  </p>
                ) : (
                  items.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      readOnly={selectedRound?.status !== 'open'}
                      onSubmit={guiPhieu}
                    />
                  ))
                )}
              </div>
            )}

            {tab === 'tong-hop' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                <IdeaCouncilSummary roundId={roundId} />
              </div>
            )}

            {tab === 'quan-tri' && isAdmin && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                <IdeaCouncilAdmin
                  rounds={rounds}
                  selectedRound={selectedRound}
                  items={items}
                  onSelectRound={setRoundId}
                />
              </div>
            )}
          </>
        )}
      </section>
    </OnePageShell>
  );
}

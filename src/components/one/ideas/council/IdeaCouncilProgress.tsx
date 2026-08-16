import React, { useState } from 'react';
import { BellRing, Crown, ListChecks } from 'lucide-react';
import { useCouncilMutations, useCouncilProgress, type CouncilRound } from './useIdeaCouncil';

// Tiến độ chấm để ĐÔN ĐỐC (TCTH + Chủ tịch) — học CouncilProgressTab của Hội
// đồng đầu mối: hiển thị TÊN THẬT + trạng thái gửi/nháp/thiếu, TUYỆT ĐỐI không
// điểm số (tách «ai đã nộp» khỏi «ai chấm bao nhiêu»). Nhắc bằng PUSH, không
// email (chốt 08/2026).

export const IdeaCouncilProgress: React.FC<{ round: CouncilRound | null }> = ({ round }) => {
  const { progress, isLoading, error } = useCouncilProgress(round?.id ?? null, !!round);
  const { nhacPush } = useCouncilMutations(round?.id ?? null);
  const [dangNhac, setDangNhac] = useState<string | null>(null);

  if (!round) return null;

  const nhac = async (profileIds?: string[]) => {
    setDangNhac(profileIds?.[0] ?? 'all');
    try {
      await nhacPush(round.id, profileIds);
    } finally {
      setDangNhac(null);
    }
  };

  const conThieu = (progress?.members ?? []).filter(m => m.submitted < m.expected);
  const duDu = (progress?.members ?? []).filter(m => m.expected > 0 && m.submitted >= m.expected);

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-black text-slate-800 flex items-center gap-1.5">
          <ListChecks className="w-4 h-4 text-amber-500" />
          Tiến độ chấm đợt «{round.name}»
        </p>
        {round.status === 'open' && conThieu.length > 0 && (
          <button
            type="button"
            disabled={dangNhac !== null}
            onClick={() => {
              if (window.confirm(`Gửi thông báo đẩy (push) nhắc ${conThieu.length} thành viên còn thiếu phiếu?`)) {
                void nhac();
              }
            }}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] shadow-sm transition-all cursor-pointer ${dangNhac ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Nhắc tất cả ({conThieu.length})</span>
          </button>
        )}
      </div>
      <p className="text-[10px] text-slate-500">
        Bảng này hiện <b>tên thật và trạng thái nộp</b> để đôn đốc (đúng mục đích quy chế:
        kiểm soát số lượt chấm, đánh giá mức độ tham gia) — <b>không kèm bất kỳ điểm số nào</b>,
        phiếu vẫn ẩn danh. Nhắc gửi qua thông báo đẩy trên thiết bị đã đăng ký.
      </p>

      {isLoading ? (
        <p className="text-slate-400 italic text-center py-3">Đang tải tiến độ…</p>
      ) : error ? (
        <p className="text-slate-500 text-center py-3">{error.message}</p>
      ) : (
        <div className="space-y-1">
          {[...conThieu, ...duDu].map(m => {
            const du = m.expected > 0 && m.submitted >= m.expected;
            return (
              <div
                key={m.profileId}
                className={`flex flex-wrap items-center gap-2 p-2 rounded-lg border ${du ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}
              >
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  {m.isChair && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  {m.fullName}
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${du ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  Đã gửi {m.submitted}/{m.expected}
                </span>
                {m.draft > 0 && (
                  <span className="text-[10px] font-bold text-slate-500">✏️ {m.draft} nháp</span>
                )}
                {m.pendingCodes.length > 0 && (
                  <span className="text-[10px] text-slate-400 flex-1 min-w-[120px]" title="Ý tưởng còn thiếu phiếu">
                    Thiếu: {m.pendingCodes.join(', ')}
                  </span>
                )}
                {round.status === 'open' && !du && (
                  <button
                    type="button"
                    disabled={dangNhac !== null}
                    onClick={() => void nhac([m.profileId])}
                    className="ml-auto p-1.5 rounded text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"
                    title={`Nhắc push riêng ${m.fullName}`}
                  >
                    <BellRing className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
          {(progress?.members ?? []).length === 0 && (
            <p className="text-slate-400 italic text-center py-3">Chưa có thành viên Hội đồng nào.</p>
          )}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { BarChart3, Lock, LockOpen, MessageSquareQuote } from 'lucide-react';
import {
  TIEU_CHI_HOI_DONG,
  TANG_DE_XUAT_INFO,
  formatDiem,
  formatTyLe,
  ketLuanDeXuat,
  type DongTongHopRpc,
  type KetLuanTang,
} from '@/lib/ideaCouncil';
import { useCouncilMutations, useCouncilSummary, type CouncilRound } from './useIdeaCouncil';

// Bảng tổng hợp kết quả chấm điểm — đúng các cột Phụ lục 07. Chỉ hiện số liệu
// tổng hợp (điểm TB, tỷ lệ đồng ý, kết luận gợi ý), không lộ điểm cá nhân.
// Phong tỏa kiểu Hội đồng đầu mối: RPC chặn khi chưa công bố (trừ Chủ tịch +
// System Admin); nút Công bố/Khóa đặt tại đây cho đúng người bấm.

const KET_LUAN_CHIP_CLASS: Record<Exclude<KetLuanTang, null>, string> = {
  vuon_canh: 'bg-emerald-100 text-emerald-700',
  lan_toa_them: 'bg-rose-100 text-rose-700',
  lan_toa_truc_tiep: 'bg-violet-100 text-violet-700 border border-violet-300',
};

const KetLuanChip: React.FC<{ dong: DongTongHopRpc }> = ({ dong }) => {
  const kq = ketLuanDeXuat(dong.tongHop, dong.proposedTier);
  if (kq.ketLuan) {
    return (
      <div className="space-y-0.5">
        <span className={`inline-block px-2 py-0.5 rounded-full text-2xs font-black ${KET_LUAN_CHIP_CLASS[kq.ketLuan]}`}>
          {kq.nhan}
        </span>
        {kq.thuong && <p className="text-2xs text-slate-500 font-semibold">{kq.thuong}</p>}
      </div>
    );
  }
  const lyDo = dong.proposedTier === 'Vươn cành' ? kq.vuonCanh.lyDo : kq.lanToa.lyDo;
  return (
    <div className="space-y-0.5">
      <span className="inline-block px-2 py-0.5 rounded-full text-2xs font-black bg-slate-100 text-slate-600">
        {kq.nhan}
      </span>
      {lyDo.map(l => (
        <p key={l} className="text-2xs text-slate-500">• {l}</p>
      ))}
    </div>
  );
};

interface IdeaCouncilSummaryProps {
  roundId: string | null;
  round: CouncilRound | null;
  /** Chủ tịch Hội đồng / System Admin — được bấm Công bố/Khóa kết quả */
  canPublish: boolean;
}

export const IdeaCouncilSummary: React.FC<IdeaCouncilSummaryProps> = ({ roundId, round, canPublish }) => {
  const { summary, isLoading, error } = useCouncilSummary(roundId, true);
  const { congBoKetQua } = useCouncilMutations(roundId);

  const nutCongBo = round && canPublish && (
    <button
      type="button"
      onClick={() => {
        const canhBao = round.resultsPublished
          ? 'Khóa kết quả lại? Thành viên Hội đồng và TCTH sẽ không xem được bản tổng hợp nữa.'
          : 'Công bố kết quả cho toàn bộ Hội đồng (gồm cả Admin TCTH)? Nên công bố sau khi đợt chấm đã chốt.';
        if (window.confirm(canhBao)) void congBoKetQua(round.id, !round.resultsPublished);
      }}
      className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-2xs shadow-sm transition-all cursor-pointer ${round.resultsPublished ? 'bg-slate-600 hover:bg-slate-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
    >
      {round.resultsPublished ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
      <span>{round.resultsPublished ? 'Khóa kết quả lại' : 'Công bố kết quả cho Hội đồng'}</span>
    </button>
  );

  if (!roundId) {
    return <p className="text-xs text-slate-500 italic py-6 text-center">Chọn một đợt chấm để xem tổng hợp.</p>;
  }
  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
        <span className="text-xs text-slate-400 mt-2 block font-medium">Đang tổng hợp kết quả…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-3">
        {nutCongBo && <div className="flex">{nutCongBo}</div>}
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed">
          <Lock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm font-semibold px-4">{error.message}</p>
        </div>
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <BarChart3 className="w-4 h-4 text-amber-500" />
        <span>
          Kết quả tổng hợp đợt <b className="text-slate-700">{summary.round.name}</b> — điểm trung bình
          tính trên phiếu đã gửi; kết luận dưới đây là <b>gợi ý theo ngưỡng</b> (yêu cầu đủ 100%
          thành viên chấm), quyết định cuối cùng thuộc Hội đồng.
        </span>
        <span className={`px-2 py-0.5 rounded-full text-2xs font-black ${summary.round.resultsPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
          {summary.round.resultsPublished ? '🔓 Đã công bố cho Hội đồng' : '🔒 Chưa công bố — chỉ Chủ tịch & QT hệ thống thấy'}
        </span>
        {nutCongBo}
      </div>

      {summary.items.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-6 text-center">Đợt này chưa có ý tưởng nào được trình.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-2xs min-w-[1080px]">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-left">
                <th className="p-2 font-black">Mã</th>
                <th className="p-2 font-black min-w-[180px]">Tên ý tưởng</th>
                <th className="p-2 font-black">Phòng đề xuất</th>
                <th className="p-2 font-black">Cấp</th>
                <th className="p-2 font-black">Tầng đề xuất</th>
                <th className="p-2 font-black text-center" title="Số phiếu đã gửi / tổng thành viên đủ điều kiện chấm — yêu cầu đủ 100% mới xét (kịch bản họp tại chỗ)">Phiếu / TV</th>
                {TIEU_CHI_HOI_DONG.map(tc => (
                  <th key={tc.key} className="p-2 font-black text-center" title={tc.cauHoi}>{tc.ten}</th>
                ))}
                <th className="p-2 font-black text-center">TB chung</th>
                <th className="p-2 font-black text-center">Đồng ý VC</th>
                <th className="p-2 font-black text-center">Đồng ý LT</th>
                <th className="p-2 font-black min-w-[170px]">Kết luận gợi ý</th>
              </tr>
            </thead>
            <tbody>
              {summary.items.map(dong => (
                <tr key={dong.itemId} className="border-t border-slate-100 align-top hover:bg-amber-50/40">
                  <td className="p-2 font-black text-slate-700 whitespace-nowrap">{dong.ideaCode}</td>
                  <td className="p-2 font-semibold text-slate-700">
                    {dong.ideaTitle}
                    <span className="block text-2xs text-slate-400 font-medium">{dong.proposer}</span>
                  </td>
                  <td className="p-2 text-slate-600 whitespace-nowrap">{dong.departmentName}</td>
                  <td className="p-2 text-slate-600 whitespace-nowrap">{dong.ideaLevel}</td>
                  <td className="p-2 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-2xs font-bold ${TANG_DE_XUAT_INFO[dong.proposedTier].badgeClass}`}
                      title={TANG_DE_XUAT_INFO[dong.proposedTier].moTa}
                    >
                      {TANG_DE_XUAT_INFO[dong.proposedTier].nhan}
                    </span>
                  </td>
                  <td className="p-2 text-center font-bold text-slate-700">
                    {dong.tongHop.soPhieuHopLe}/{dong.tongHop.tongThanhVien}
                    {dong.tongHop.soPhieuXungDot > 0 && (
                      <span
                        className="block text-2xs text-amber-600 font-semibold"
                        title="Số phiếu có khai xung đột lợi ích (A4) — Hội đồng cân nhắc khi kết luận theo mục VI.4"
                      >
                        ⚠ {dong.tongHop.soPhieuXungDot} khai XĐLI
                      </span>
                    )}
                  </td>
                  {TIEU_CHI_HOI_DONG.map(tc => (
                    <td key={tc.key} className="p-2 text-center font-semibold text-slate-700">
                      {formatDiem(dong.tongHop.diemTieuChi[tc.key])}
                    </td>
                  ))}
                  <td className="p-2 text-center font-black text-amber-700">{formatDiem(dong.tongHop.diemTbChung)}</td>
                  <td className="p-2 text-center font-semibold">{formatTyLe(dong.tongHop.soDongYVuonCanh, dong.tongHop.soPhieuHopLe)}</td>
                  <td className="p-2 text-center font-semibold">{formatTyLe(dong.tongHop.soDongYLanToa, dong.tongHop.soPhieuHopLe)}</td>
                  <td className="p-2"><KetLuanChip dong={dong} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Góp ý ẩn danh đã tổng hợp — phục vụ TCTH trình Hội đồng */}
      {summary.items.some(d => d.gopY.length > 0) && (
        <div className="space-y-2">
          <p className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
            <MessageSquareQuote className="w-4 h-4 text-amber-500" />
            Ý kiến góp ý của Hội đồng (ẩn danh)
          </p>
          {summary.items.filter(d => d.gopY.length > 0).map(d => (
            <div key={d.itemId} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
              <p className="font-black text-2xs text-slate-700">{d.ideaCode} — {d.ideaTitle}</p>
              {d.gopY.map((g, i) => (
                <p key={i} className="text-2xs text-slate-600 pl-3 border-l-2 border-amber-300">{g}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

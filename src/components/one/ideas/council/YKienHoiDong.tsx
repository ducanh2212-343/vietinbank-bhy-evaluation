import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Landmark } from 'lucide-react';
import { formatDiem } from '@/lib/ideaCouncil';
import type { YKienHoiDongYTuong } from './useIdeaCouncil';

// Khối «Ý kiến Hội đồng» trên thẻ ý tưởng — cho người NGOÀI Hội đồng: chủ ý
// tưởng, lãnh đạo phòng có ý tưởng, Ban Giám đốc, TCTH (chốt 16/09/2026).
//
// Trước đây góp ý D2 chỉ hiện ở bảng tổng hợp của Hội đồng; người viết ý tưởng
// — chính người cần đọc nhất để hoàn thiện — lại không thấy gì ngoài một dòng
// «chưa đạt». Ẩn danh giữ nguyên: không tên, không mốc giờ, không điểm từng
// phiếu; chỉ nội dung góp ý và con số tổng hợp của đợt đã công bố.

const NHAN_KET_LUAN: Record<string, { nhan: string; lop: string }> = {
  vuon_canh: { nhan: '🎉 Đạt Vươn cành', lop: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
  lan_toa: { nhan: '🎉 Đạt Lan tỏa', lop: 'border-rose-300 bg-rose-50 text-rose-900' },
  chua_dat: { nhan: 'Chưa đạt', lop: 'border-slate-300 bg-slate-50 text-slate-800' },
};

export const YKienHoiDong: React.FC<{ danhSach: YKienHoiDongYTuong[] }> = ({ danhSach }) => {
  const [mo, setMo] = useState(false);
  // Đợt mới nhất lên đầu (RPC đã sắp), tóm tắt bằng đợt mới nhất
  const moiNhat = danhSach[0];
  const kl = NHAN_KET_LUAN[moiNhat.ketLuan ?? 'chua_dat'];
  const tongGopY = danhSach.reduce((s, d) => s + d.gopY.length, 0);

  return (
    <div className={`rounded-lg border p-3 text-xs ${kl.lop}`}>
      <button
        type="button"
        onClick={() => setMo(o => !o)}
        className="flex w-full cursor-pointer items-center gap-1.5 text-left"
      >
        <Landmark className="h-3.5 w-3.5 shrink-0" />
        <span className="font-black">Hội đồng đợt «{moiNhat.roundName}»: {kl.nhan}</span>
        <span className="font-semibold">
          · TB {formatDiem(moiNhat.diemTbChung)}/5 · {moiNhat.soDongY}/{moiNhat.soPhieu} đồng ý
        </span>
        <span className="ml-auto flex items-center gap-1 text-2xs font-bold">
          💬 {tongGopY} ý kiến {mo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {mo && (
        <div className="mt-2 space-y-2">
          {danhSach.map(d => (
            <div key={d.roundId} className="space-y-1">
              {danhSach.length > 1 && (
                <p className="text-2xs font-bold">
                  Đợt «{d.roundName}» ({d.capXet}): {NHAN_KET_LUAN[d.ketLuan ?? 'chua_dat'].nhan} · TB {formatDiem(d.diemTbChung)} · {d.soDongY}/{d.soPhieu} đồng ý
                </p>
              )}
              {(d.soKhongXet > 0 || d.soCanBoSung > 0) && (
                <p className="text-2xs">
                  {d.soCanBoSung > 0 && `${d.soCanBoSung} phiếu «Cần bổ sung»`}
                  {d.soCanBoSung > 0 && d.soKhongXet > 0 && ' · '}
                  {d.soKhongXet > 0 && `${d.soKhongXet} phiếu «Không xét thưởng»`}
                </p>
              )}
              {d.gopY.length === 0 ? (
                <p className="text-2xs italic opacity-70">Hội đồng không để lại góp ý bằng chữ cho đợt này.</p>
              ) : (
                d.gopY.map((g, i) => (
                  <p key={i} className="rounded-md bg-white/70 px-2.5 py-1.5 text-2xs leading-relaxed">
                    “{g}”
                  </p>
                ))
              )}
            </div>
          ))}
          <p className="text-2xs opacity-70">
            Ý kiến ẩn danh của thành viên Hội đồng — không kèm tên, không kèm điểm từng phiếu.
          </p>
        </div>
      )}
    </div>
  );
};

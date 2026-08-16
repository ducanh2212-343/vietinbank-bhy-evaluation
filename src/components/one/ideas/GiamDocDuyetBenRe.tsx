import React, { useState } from 'react';
import { CheckCircle2, ClipboardCheck, Clock, Info, XCircle } from 'lucide-react';
import { useBenReActions, useViecCuaGiamDoc, type ViecGiamDoc } from './useBenRe';
import { useLaGiamDoc, useMyDepartmentForIdeas } from './useUomMamPicker';

// Màn "Việc của Giám đốc" — hàng chờ phê duyệt cấp Bén rễ.
//
// Quy chế: cấp Bén rễ do Giám đốc chi nhánh quyết định. TCTH trình liên tục,
// Giám đốc mở màn này là thấy ngay việc phải làm, không phải đi tìm trong
// bảng theo dõi ý tưởng.
//
// TCTH cũng xem được (chỉ xem) để biết hồ sơ mình trình đang nằm ở đâu và
// đôn đốc khi việc để lâu.

const NGAY_CANH_BAO_CHO_LAU = 7;

const ngay = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

function TheViec({ v, laGiamDoc, onQuyet }: {
  v: ViecGiamDoc;
  laGiamDoc: boolean;
  onQuyet: (ideaId: string, dongY: boolean, ghiChu: string) => Promise<void>;
}) {
  const [ghiChu, setGhiChu] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const choLau = v.soNgayCho >= NGAY_CANH_BAO_CHO_LAU;

  const quyet = async (dongY: boolean) => {
    setDangGui(true);
    try {
      await onQuyet(v.ideaId, dongY, ghiChu);
    } finally {
      setDangGui(false);
    }
  };

  return (
    <div className={`p-3 rounded-xl border space-y-2 ${choLau ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-[200px]">
          <p className="font-bold text-slate-800 leading-snug">{v.title}</p>
          <p className="text-[10px] text-slate-500">
            {v.phong} · {v.proposer} · gửi {ngay(v.createdAt)}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
            choLau ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
          }`}
          title={`TCTH trình ngày ${ngay(v.trinhLuc)}${v.nguoiTrinh ? ` — ${v.nguoiTrinh}` : ''}`}
        >
          <Clock className="w-3 h-3" />
          {v.soNgayCho === 0 ? 'Trình hôm nay' : `Chờ ${v.soNgayCho} ngày`}
        </span>
      </div>

      {v.expectedBenefits?.trim() && (
        <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2 whitespace-pre-line">
          <b className="text-slate-500">📈 Lợi ích dự kiến:</b> {v.expectedBenefits}
        </p>
      )}
      {v.ghiChu?.trim() && (
        <p className="text-[11px] text-sky-800 bg-sky-50 border border-sky-100 rounded-lg p-2">
          <b>Ý kiến TCTH:</b> {v.ghiChu}
        </p>
      )}

      {laGiamDoc && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <input
            type="text"
            value={ghiChu}
            onChange={e => setGhiChu(e.target.value)}
            placeholder="Ý kiến chỉ đạo (không bắt buộc)…"
            className="flex-1 min-w-[160px] p-2 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:border-amber-500"
          />
          <button
            type="button"
            disabled={dangGui}
            onClick={() => void quyet(true)}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Công nhận Bén rễ
          </button>
          <button
            type="button"
            disabled={dangGui}
            onClick={() => void quyet(false)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-600 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <XCircle className="w-3.5 h-3.5" /> Chưa đạt
          </button>
        </div>
      )}
    </div>
  );
}

export const GiamDocDuyetBenRe: React.FC = () => {
  const { laGiamDoc, isLoading: dangDoQuyen } = useLaGiamDoc();
  const { isAdmin } = useMyDepartmentForIdeas();
  const duocXem = laGiamDoc || isAdmin;
  const { viec, isLoading } = useViecCuaGiamDoc(duocXem);
  const { duyet } = useBenReActions();

  if (dangDoQuyen || !duocXem) return null;

  const quyet = async (ideaId: string, dongY: boolean, ghiChu: string) => {
    await duyet(ideaId, dongY, ghiChu);
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-black text-slate-800 flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-[#005a9c]" />
          {laGiamDoc ? 'Việc của Giám đốc — công nhận cấp Bén rễ' : 'Hồ sơ Bén rễ đang chờ Giám đốc'}
        </p>
        <span className={`ml-auto px-2.5 py-1 rounded-full text-[11px] font-black ${
          viec.length > 0 ? 'bg-[#005a9c]/10 text-[#005a9c]' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {viec.length > 0 ? `${viec.length} việc chờ duyệt` : 'Không còn việc chờ'}
        </span>
      </div>

      <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-[11px] text-sky-900 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Theo quy chế, cấp <b>Bén rễ</b> do <b>Giám đốc chi nhánh</b> quyết định. Phòng TCTH
          trình <b>liên tục</b> — ý tưởng chín lúc nào trình lúc đó, không chờ hết tháng.
          Ý tưởng được công nhận thì thưởng <b>300.000đ</b> và cộng bù các cấp dưới chưa
          từng được thưởng (nguyên tắc lũy kế). Chỉ khi Giám đốc duyệt, ý tưởng mới được
          tính vào <b>KPI Đổi mới sáng tạo</b>.
        </span>
      </div>

      {isLoading ? (
        <p className="text-slate-400 italic text-center py-4">Đang tải danh sách…</p>
      ) : viec.length === 0 ? (
        <p className="text-slate-400 italic text-center py-4">
          Không có hồ sơ nào đang chờ — Phòng TCTH sẽ trình khi có ý tưởng đủ điều kiện.
        </p>
      ) : (
        <div className="space-y-2">
          {viec.map(v => (
            <TheViec key={v.ideaId} v={v} laGiamDoc={laGiamDoc} onQuyet={quyet} />
          ))}
        </div>
      )}
    </div>
  );
};

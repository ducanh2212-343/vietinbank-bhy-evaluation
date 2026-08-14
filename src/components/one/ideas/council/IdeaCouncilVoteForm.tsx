import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import {
  DE_XUAT_LABELS,
  MUC_DIEM,
  TIEU_CHI_HOI_DONG,
  XUNG_DOT_LABELS,
  canGopY,
  loiPhieu,
  type DeXuatHoiDong,
  type TieuChiKey,
  type XungDotLoiIch,
} from '@/lib/ideaCouncil';
import type { CouncilVote, PhieuGui } from './useIdeaCouncil';

// Phiếu chấm điểm của thành viên Hội đồng — đúng bộ câu hỏi Phụ lục 06:
// A1-A3 (danh tính) lấy từ tài khoản đăng nhập, B1-B4 (thông tin ý tưởng) hiển
// thị từ dữ liệu TCTH trình — thành viên chỉ nhập A4, C1-C5, D1, D2.

interface IdeaCouncilVoteFormProps {
  /** Phiếu đã gửi trước đó (đổ sẵn để sửa) */
  myVote: CouncilVote | null;
  /** Đợt còn mở mới cho gửi/sửa */
  readOnly: boolean;
  onSubmit: (phieu: PhieuGui) => Promise<boolean>;
}

const XUNG_DOT_OPTIONS = Object.keys(XUNG_DOT_LABELS) as XungDotLoiIch[];
const DE_XUAT_OPTIONS = Object.keys(DE_XUAT_LABELS) as DeXuatHoiDong[];

export const IdeaCouncilVoteForm: React.FC<IdeaCouncilVoteFormProps> = ({ myVote, readOnly, onSubmit }) => {
  const [xungDot, setXungDot] = useState<XungDotLoiIch | null>(null);
  const [diem, setDiem] = useState<Partial<Record<TieuChiKey, number>>>({});
  const [deXuat, setDeXuat] = useState<DeXuatHoiDong | null>(null);
  const [gopY, setGopY] = useState('');
  const [loi, setLoi] = useState<string[]>([]);
  const [dangGui, setDangGui] = useState(false);

  // Đổ sẵn phiếu đã gửi để thành viên sửa trong thời gian đợt còn mở
  useEffect(() => {
    setXungDot(myVote?.xungDot ?? null);
    setDiem(myVote ? { ...myVote.diem } : {});
    setDeXuat(myVote?.deXuat ?? null);
    setGopY(myVote?.gopY ?? '');
    setLoi([]);
  }, [myVote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = loiPhieu({ xungDot, diem, deXuat, gopY });
    setLoi(errs);
    if (errs.length > 0) return;
    setDangGui(true);
    try {
      await onSubmit({
        xungDot: xungDot!,
        diem: diem as Record<TieuChiKey, number>,
        deXuat: deXuat!,
        gopY,
      });
    } finally {
      setDangGui(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {myVote && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>
            Bạn đã gửi phiếu ngày {new Date(myVote.updatedAt).toLocaleDateString('vi-VN')}
            {readOnly ? ' — đợt chấm đã chốt, phiếu không sửa được nữa.' : ' — có thể sửa đến khi đợt chấm chốt.'}
          </span>
        </div>
      )}

      {/* A4 — xung đột lợi ích */}
      <div className="space-y-1.5">
        <p className="font-bold text-slate-700">
          A4. Thành viên có thuộc phòng/đơn vị đề xuất ý tưởng này không? <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-col gap-1.5">
          {XUNG_DOT_OPTIONS.map(opt => (
            <label key={opt} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${xungDot === opt ? 'bg-amber-50 border-amber-300 font-bold text-slate-800' : 'border-slate-200 hover:border-amber-200'}`}>
              <input
                type="radio"
                name="xung-dot"
                checked={xungDot === opt}
                onChange={() => setXungDot(opt)}
                disabled={readOnly}
                className="accent-amber-500"
              />
              <span>{XUNG_DOT_LABELS[opt]}</span>
            </label>
          ))}
        </div>
        {xungDot && xungDot !== 'khong' && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Khai báo của bạn được ghi vào phiếu. Với ý tưởng Cấp độ Lan tỏa hoặc ảnh hưởng lớn,
            Hội đồng có thể quyết định phiếu này chỉ tính tham khảo, không vào điểm trung bình chính thức.
          </p>
        )}
      </div>

      {/* C1-C5 — 5 tiêu chí thang 1-5 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2">
          <span className="font-bold text-slate-600">Mức điểm:</span>
          {MUC_DIEM.map(m => (
            <span key={m.diem}><b className="text-slate-700">{m.diem}</b> — {m.yNghia}</span>
          ))}
        </div>
        {TIEU_CHI_HOI_DONG.map(tc => (
          <div key={tc.key} className="space-y-1">
            <p className="font-bold text-slate-700">
              {tc.ma}. {tc.ten} <span className="text-red-500">*</span>
            </p>
            <p className="text-[11px] text-slate-500">{tc.cauHoi}</p>
            <div className="flex gap-1.5">
              {MUC_DIEM.map(m => (
                <button
                  key={m.diem}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setDiem(prev => ({ ...prev, [tc.key]: m.diem }))}
                  title={`${m.diem} — ${m.yNghia}`}
                  className={`w-9 h-9 rounded-lg border font-black text-sm transition-all cursor-pointer disabled:cursor-not-allowed ${
                    diem[tc.key] === m.diem
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-600'
                  }`}
                >
                  {m.diem}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* D1 — đề xuất của thành viên */}
      <div className="space-y-1.5">
        <p className="font-bold text-slate-700">
          D1. Đề xuất của thành viên Hội đồng <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {DE_XUAT_OPTIONS.map(opt => (
            <label key={opt} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${deXuat === opt ? 'bg-amber-50 border-amber-300 font-bold text-slate-800' : 'border-slate-200 hover:border-amber-200'}`}>
              <input
                type="radio"
                name="de-xuat"
                checked={deXuat === opt}
                onChange={() => setDeXuat(opt)}
                disabled={readOnly}
                className="accent-amber-500"
              />
              <span>{DE_XUAT_LABELS[opt]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* D2 — góp ý (bắt buộc khi Không xét thưởng / Cần bổ sung) */}
      <div className="space-y-1">
        <p className="font-bold text-slate-700">
          D2. Ý kiến góp ý ngắn
          {deXuat && canGopY(deXuat) ? <span className="text-red-500"> * (bắt buộc với đề xuất đã chọn)</span> : <span className="font-medium text-slate-500"> (không bắt buộc)</span>}
        </p>
        <textarea
          value={gopY}
          onChange={e => setGopY(e.target.value)}
          disabled={readOnly}
          rows={3}
          placeholder="Điểm mạnh, điểm cần hoàn thiện, điều kiện để nhân rộng…"
          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-medium"
        />
      </div>

      {loi.length > 0 && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-200 space-y-1">
          {loi.map(l => (
            <p key={l} className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{l}</span>
            </p>
          ))}
        </div>
      )}

      {!readOnly && (
        <button
          type="submit"
          disabled={dangGui}
          className={`w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow transition-all flex items-center justify-center gap-2 cursor-pointer ${dangGui ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {dangGui ? (
            <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{myVote ? 'CẬP NHẬT PHIẾU CHẤM' : 'GỬI PHIẾU CHẤM ĐIỂM'}</span>
        </button>
      )}
    </form>
  );
};

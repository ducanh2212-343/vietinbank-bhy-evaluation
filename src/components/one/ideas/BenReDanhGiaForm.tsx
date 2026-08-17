import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  CAU_HOI_BEN_RE,
  DIEM_TOI_DA_BEN_RE,
  KET_LUAN_BEN_RE_INFO,
  MUC_DIEM_BEN_RE,
  chamPhieuBenRe,
  type PhieuBenRe,
} from '@/lib/ideaBenRe';

// Biểu mẫu chấm phiếu Bén rễ — DÙNG CHUNG cho Phòng TCTH khi trình và Giám đốc
// khi duyệt. Cùng một bộ câu hỏi cho hai vai là chủ ý: có cùng thang thì hai
// bên mới đối chiếu được, thay vì mỗi bên nhận xét theo một cách.

interface Props {
  phieu: PhieuBenRe;
  onChange: (phieu: PhieuBenRe) => void;
  /** Chỉ xem — dùng khi hiện lại phiếu TCTH cho Giám đốc đọc */
  chiXem?: boolean;
  /** Nhãn ô ghi chú, khác nhau giữa hai vai */
  nhanGhiChu?: string;
}

/** Dải kết luận gợi ý — luôn nói rõ đây là gợi ý, không phải phán quyết */
export const KetLuanBenRe: React.FC<{ phieu: PhieuBenRe; nen?: boolean }> = ({ phieu, nen = true }) => {
  const kq = chamPhieuBenRe(phieu);
  const info = KET_LUAN_BEN_RE_INFO[kq.ketLuan];
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${info.lopMau}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {kq.vuongDieuKienChan && <ShieldAlert className="h-4 w-4 shrink-0" />}
        <b className="text-sm">{nen ? 'Gợi ý: ' : ''}{info.nhan}</b>
        <span className="ml-auto font-mono text-sm font-bold tabular-nums">
          {kq.tongDiem}/{DIEM_TOI_DA_BEN_RE}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed opacity-90">{kq.dienGiai} {info.moTa}</p>
      {!kq.daChamDu && kq.soCauDaCham > 0 && (
        <p className="mt-1 flex items-center gap-1 text-xs font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" /> Chấm đủ 5 câu thì gợi ý mới chắc.
        </p>
      )}
    </div>
  );
};

export const BenReDanhGiaForm: React.FC<Props> = ({ phieu, onChange, chiXem, nhanGhiChu }) => {
  const dat = (ma: string, diem: number) => {
    if (chiXem) return;
    // Bấm lại đúng mức đang chọn thì bỏ chấm — sửa nhầm không phải tải lại trang
    onChange({ ...phieu, [ma]: phieu[ma as keyof PhieuBenRe] === diem ? undefined : diem });
  };

  return (
    <div className="space-y-2.5">
      {CAU_HOI_BEN_RE.map((c, i) => {
        const chon = phieu[c.ma];
        return (
          <div
            key={c.ma}
            className={`rounded-xl border p-3 ${
              c.laDieuKienChan && chon === 0
                ? 'border-rose-300 bg-rose-50/60'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <span className="mt-0.5 font-mono text-2xs font-bold text-slate-400">Đ{i + 1}</span>
              <div className="min-w-[180px] flex-1">
                <p className="text-sm font-bold leading-snug text-slate-800">
                  {c.tieuDe}
                  {c.laDieuKienChan && (
                    <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-2xs font-bold text-rose-700">
                      điều kiện chặn
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{c.moTa}</p>
              </div>
              <div className="flex gap-1">
                {MUC_DIEM_BEN_RE.map(m => (
                  <button
                    key={m.diem}
                    type="button"
                    disabled={chiXem}
                    onClick={() => dat(c.ma, m.diem)}
                    title={`${m.nhan} — ${m.moTa}`}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                      chon === m.diem
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    } ${chiXem ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                  >
                    {m.nhan}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <textarea
        value={phieu.ghiChu ?? ''}
        onChange={e => !chiXem && onChange({ ...phieu, ghiChu: e.target.value })}
        readOnly={chiXem}
        rows={2}
        placeholder={nhanGhiChu ?? 'Nhận xét thêm (không bắt buộc)…'}
        className={`w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-amber-500 ${
          chiXem ? 'bg-slate-50 text-slate-600' : 'bg-white'
        }`}
      />

      <KetLuanBenRe phieu={phieu} />
    </div>
  );
};

/** Bản đọc gọn phiếu của người khác — Giám đốc xem báo cáo TCTH */
export const BenReDanhGiaTomTat: React.FC<{ phieu: PhieuBenRe; tieuDe: string }> = ({ phieu, tieuDe }) => {
  const kq = chamPhieuBenRe(phieu);
  const info = KET_LUAN_BEN_RE_INFO[kq.ketLuan];
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <b className="text-xs font-bold uppercase tracking-wider text-slate-500">{tieuDe}</b>
        <span className={`rounded-full border px-2 py-0.5 text-2xs font-bold ${info.lopMau}`}>
          {info.nhan}
        </span>
        <span className="ml-auto font-mono text-sm font-bold tabular-nums text-slate-700">
          {kq.tongDiem}/{DIEM_TOI_DA_BEN_RE}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CAU_HOI_BEN_RE.map((c, i) => {
          const d = phieu[c.ma];
          const mau = d === undefined ? 'bg-slate-100 text-slate-400'
            : d === 0 ? 'bg-rose-100 text-rose-700'
            : d === 1 ? 'bg-amber-100 text-amber-800'
            : 'bg-emerald-100 text-emerald-700';
          return (
            <span
              key={c.ma}
              title={`${c.tieuDe} — ${d === undefined ? 'chưa chấm' : MUC_DIEM_BEN_RE[d].nhan}`}
              className={`rounded-md px-2 py-0.5 font-mono text-2xs font-bold ${mau}`}
            >
              Đ{i + 1} {d === undefined ? '–' : d}
            </span>
          );
        })}
      </div>
      {phieu.ghiChu?.trim() && (
        <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">
          <b className="text-slate-500">Ý kiến:</b> {phieu.ghiChu}
        </p>
      )}
    </div>
  );
};

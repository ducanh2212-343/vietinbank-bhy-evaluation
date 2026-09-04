import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Khung «bấm rồi ghi lý do rồi mới xác nhận» — dùng chung cho thu hồi, rút hồ
 * sơ, trả về bổ sung. Không dùng hộp thoại confirm() của trình duyệt: cần chỗ
 * ghi lý do (sẽ lưu vào sổ, cán bộ sẽ đọc) và cần liệt kê hệ quả ngay trước
 * mắt người bấm.
 */
export const KhungLyDo: React.FC<{
  nhan: string;
  heQua: string[];
  icon: LucideIcon;
  onXacNhan: (lyDo: string) => Promise<boolean>;
  mau?: 'amber' | 'slate' | 'orange' | 'teal';
  placeholder?: string;
  /** Ô bổ sung hiện phía trên ô lý do (VD chọn ý tưởng phối hợp) */
  themVao?: React.ReactNode;
}> = ({ nhan, heQua, icon: Icon, onXacNhan, mau = 'amber', placeholder, themVao }) => {
  const [mo, setMo] = useState(false);
  const [lyDo, setLyDo] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const xacNhan = async () => {
    setDangGui(true);
    try {
      const ok = await onXacNhan(lyDo);
      if (ok) { setMo(false); setLyDo(''); }
    } finally {
      setDangGui(false);
    }
  };

  const lopNut = {
    amber: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
    orange: 'border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100',
    teal: 'border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100',
    slate: 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
  }[mau];
  const lopKhung = {
    orange: { vien: 'border-orange-300 bg-orange-50/70', chu: 'text-orange-900', tieuDe: 'text-orange-800', nut: 'bg-orange-600 hover:bg-orange-700', o: 'border-orange-300 focus:border-orange-500' },
    teal: { vien: 'border-teal-300 bg-teal-50/70', chu: 'text-teal-900', tieuDe: 'text-teal-800', nut: 'bg-teal-600 hover:bg-teal-700', o: 'border-teal-300 focus:border-teal-500' },
    amber: { vien: 'border-amber-300 bg-amber-50/70', chu: 'text-amber-900', tieuDe: 'text-amber-800', nut: 'bg-amber-600 hover:bg-amber-700', o: 'border-amber-300 focus:border-amber-500' },
    slate: { vien: 'border-slate-300 bg-slate-50', chu: 'text-slate-800', tieuDe: 'text-slate-700', nut: 'bg-slate-700 hover:bg-slate-800', o: 'border-slate-300 focus:border-slate-500' },
  }[mau];

  if (!mo) {
    return (
      <button
        type="button"
        onClick={() => setMo(true)}
        className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-2xs font-bold transition-all ${lopNut}`}
      >
        <Icon className="h-3.5 w-3.5" /> {nhan}
      </button>
    );
  }

  return (
    <div className={`w-full space-y-2 rounded-xl border p-3 ${lopKhung.vien}`}>
      <p className={`text-2xs font-black uppercase tracking-wider ${lopKhung.tieuDe}`}>{nhan} — hệ thống sẽ:</p>
      <ul className={`list-disc space-y-0.5 pl-4 text-2xs ${lopKhung.chu}`}>
        {heQua.map(h => <li key={h}>{h}</li>)}
      </ul>
      {themVao}
      <textarea
        autoFocus
        rows={2}
        value={lyDo}
        onChange={e => setLyDo(e.target.value)}
        placeholder={placeholder ?? 'Lý do (bắt buộc, sẽ lưu vào sổ)…'}
        className={`w-full rounded-lg border bg-white p-2 text-2xs outline-none ${lopKhung.o}`}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={dangGui || !lyDo.trim()}
          onClick={() => void xacNhan()}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-2xs font-black text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${lopKhung.nut}`}
        >
          <Icon className="h-3.5 w-3.5" /> {dangGui ? 'Đang xử lý…' : `Xác nhận ${nhan.toLowerCase()}`}
        </button>
        <button
          type="button"
          onClick={() => { setMo(false); setLyDo(''); }}
          className="cursor-pointer rounded-lg px-3 py-2 text-2xs font-bold text-slate-500 hover:bg-slate-100"
        >
          Hủy
        </button>
      </div>
    </div>
  );
};

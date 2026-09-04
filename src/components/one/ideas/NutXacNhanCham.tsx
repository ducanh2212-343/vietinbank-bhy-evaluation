import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

// Nút quyết định hai nhịp có đồng hồ 3 giây.
//
// Vì sao: 03/09/2026 Giám đốc ấn nhầm «Công nhận» cho một hồ sơ đang định từ
// chối — hai nút nằm cạnh nhau, bấm một cái là xong. Nay bấm lần một chỉ mở
// nút xác nhận; nút đó KHÓA 3 giây đếm ngược rồi mới bấm được. Ba giây đủ để
// đọc lại tên hồ sơ, không đủ để thành thói quen bấm hai lần liên tiếp.
// Thu hồi vẫn có, nhưng gỡ một cú bấm nhầm tốn hơn nhiều so với chờ 3 giây.

export const GIAY_CHO_XAC_NHAN = 3;

interface Props {
  nhan: string;
  icon: LucideIcon;
  onXacNhan: () => void | Promise<void>;
  disabled?: boolean;
  /** Lớp màu của nút nhịp một — nút xác nhận luôn dùng màu cảnh báo */
  lop: string;
  /** Giây chờ — chỉ test mới đổi */
  giay?: number;
}

export const NutXacNhanCham: React.FC<Props> = ({ nhan, icon: Icon, onXacNhan, disabled, lop, giay = GIAY_CHO_XAC_NHAN }) => {
  const [mo, setMo] = useState(false);
  const [conLai, setConLai] = useState(giay);

  useEffect(() => {
    if (!mo) return;
    setConLai(giay);
    const id = window.setInterval(() => {
      setConLai(c => {
        if (c <= 1) { window.clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [mo, giay]);

  if (!mo) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setMo(true)}
        className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-2xs font-black transition-all disabled:opacity-50 ${lop}`}
      >
        <Icon className="h-3.5 w-3.5" /> {nhan}
      </button>
    );
  }

  const sanSang = conLai === 0;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={disabled || !sanSang}
        onClick={() => { void onXacNhan(); setMo(false); }}
        aria-live="polite"
        className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-2xs font-black transition-all ${
          sanSang
            ? 'cursor-pointer border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
            : 'cursor-not-allowed border-amber-300 bg-amber-50 text-amber-800'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        {sanSang ? `Xác nhận: ${nhan}` : `Đọc lại hồ sơ… ${conLai}s`}
      </button>
      <button
        type="button"
        onClick={() => setMo(false)}
        className="cursor-pointer rounded-lg px-2 py-2 text-2xs font-bold text-slate-500 hover:bg-slate-100"
      >
        Hủy
      </button>
    </span>
  );
};

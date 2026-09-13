import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

// Nút quyết định hai nhịp có đồng hồ 3 giây.
//
// Vì sao: 03/09/2026 Giám đốc ấn nhầm «Công nhận» cho một hồ sơ đang định từ
// chối — hai nút nằm cạnh nhau, bấm một cái là xong. Nay bấm lần một chỉ mở
// nút xác nhận; nút đó KHÓA 3 giây đếm ngược rồi mới bấm được. Ba giây đủ để
// đọc lại tên hồ sơ, không đủ để thành thói quen bấm hai lần liên tiếp.
// Thu hồi vẫn có, nhưng gỡ một cú bấm nhầm tốn hơn nhiều so với chờ 3 giây.
//
// 11/09/2026 dùng thêm cho nút «Gửi phiếu chấm điểm» của Hội đồng: ngồi họp,
// điện thoại trong tay, các thẻ ý tưởng trông giống nhau — gửi nhầm phiếu sang
// ý tưởng bên cạnh là chuyện đã xảy ra. Nút đó là khối lớn chứ không phải chip
// nên có thêm dạng «khoi»; luật ba giây vẫn chỉ có MỘT chỗ định nghĩa.

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
  /**
   * 'chip' (mặc định) = nút nhỏ trong dải thao tác.
   * 'khoi' = nút lớn chiếm cả hàng, dùng cho phiếu chấm của Hội đồng.
   */
  cach?: 'chip' | 'khoi';
  /**
   * Chạy trước khi mở nhịp xác nhận; trả false thì KHÔNG mở.
   * Phiếu Hội đồng dùng để kiểm tra đủ câu trả lời trước — thiếu câu thì phải
   * hiện lỗi ngay, chứ đếm ngược ba giây rồi mới báo thiếu là trêu người dùng.
   */
  truocKhiMo?: () => boolean;
  /** Chữ trên nút trong lúc chờ — mặc định hợp với hồ sơ Bén rễ */
  nhanCho?: string;
}

export const NutXacNhanCham: React.FC<Props> = ({
  nhan, icon: Icon, onXacNhan, disabled, lop, giay = GIAY_CHO_XAC_NHAN,
  cach = 'chip', truocKhiMo, nhanCho = 'Đọc lại hồ sơ…',
}) => {
  const [mo, setMo] = useState(false);
  const [conLai, setConLai] = useState(giay);
  const khoi = cach === 'khoi';

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
        onClick={() => { if (!truocKhiMo || truocKhiMo()) setMo(true); }}
        className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-black transition-all disabled:opacity-50 ${
          khoi ? 'w-full rounded-xl py-2.5 text-xs shadow' : 'px-3 py-2 text-2xs'
        } ${lop}`}
      >
        <Icon className={khoi ? 'h-4 w-4' : 'h-3.5 w-3.5'} /> {nhan}
      </button>
    );
  }

  const sanSang = conLai === 0;
  return (
    <span className={khoi ? 'flex w-full flex-wrap items-center gap-1.5' : 'inline-flex flex-wrap items-center gap-1.5'}>
      <button
        type="button"
        disabled={disabled || !sanSang}
        onClick={() => { void onXacNhan(); setMo(false); }}
        aria-live="polite"
        className={`flex items-center justify-center gap-1.5 border-2 font-black transition-all ${
          khoi ? 'flex-1 rounded-xl py-2.5 text-xs' : 'rounded-lg px-3 py-2 text-2xs'
        } ${
          sanSang
            ? 'cursor-pointer border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
            : 'cursor-not-allowed border-amber-300 bg-amber-50 text-amber-800'
        }`}
      >
        <Icon className={khoi ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        {sanSang ? `Xác nhận: ${nhan}` : `${nhanCho} ${conLai}s`}
      </button>
      <button
        type="button"
        onClick={() => setMo(false)}
        className={`cursor-pointer font-bold text-slate-500 hover:bg-slate-100 ${
          khoi ? 'rounded-xl px-4 py-2.5 text-xs' : 'rounded-lg px-2 py-2 text-2xs'
        }`}
      >
        Hủy
      </button>
    </span>
  );
};

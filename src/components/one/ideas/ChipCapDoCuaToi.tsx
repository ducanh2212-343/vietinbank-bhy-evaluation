import React from 'react';
import type { DemTheoCap } from '@/lib/ideaKpi';
import { chipTheoCap } from '@/lib/yTuongCuaToi';

/**
 * Dãy chip «2 Bén rễ · 1 Vươn cành» của chính người xem — dùng chung cho dải
 * «Ý tưởng của bạn» (trang giới thiệu) và đầu bảng tra cứu, để hai chỗ không
 * bao giờ đếm khác nhau.
 */
export const ChipCapDoCuaToi: React.FC<{ dem: DemTheoCap; nho?: boolean }> = ({ dem, nho }) => {
  const chips = chipTheoCap(dem);
  if (chips.length === 0) return null;
  return (
    <>
      {chips.map(c => (
        <span
          key={c.capDo}
          className={`rounded-full font-bold ${c.lop} ${nho ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs'}`}
          title={c.capDo === 'Ươm mầm' ? `Tổng số ý tưởng của bạn: ${c.so}` : `${c.so} ý tưởng của bạn đang ở cấp ${c.capDo}`}
        >
          {c.emoji} {c.so} {c.capDo}
        </span>
      ))}
    </>
  );
};

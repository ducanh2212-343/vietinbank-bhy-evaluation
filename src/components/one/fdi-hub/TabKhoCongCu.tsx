import React from 'react';
import { FDI_HUB_GOI_Y_KHO_CONG_CU, FDI_HUB_KHO_CONG_CU } from '@/data/one/fdiHub';
import { ChipLienKet, DaiDauTab, GoiY, LuoiThe, Pill, The, TheBieuTuong } from './dungChung';

/** Kho công cụ hỗ trợ RM — cái nào đã có (mở ngay), cái nào còn thiếu */
export function TabKhoCongCu() {
  const daCo = FDI_HUB_KHO_CONG_CU.filter((c) => c.trangThai === 'da-co').length;
  return (
    <div className="space-y-4">
      <DaiDauTab
        bieuTuong="🧰"
        tieuDe="Kho công cụ hỗ trợ RM"
        moTa={`${daCo}/${FDI_HUB_KHO_CONG_CU.length} công cụ đã sẵn sàng — tổng hợp từ kho Drive «Tài liệu VietinBank» của Tổ FDI và các tab trong cẩm nang này`}
        mau1="#0B5FA5"
        mau2="#00B8A9"
      />
      <The>
        <LuoiThe>
          {FDI_HUB_KHO_CONG_CU.map((c) => {
            const co = c.trangThai === 'da-co';
            return (
              <TheBieuTuong key={c.ten} bieuTuong={c.bieuTuong} mau={co ? '#2E7D32' : '#E5383B'} mauNhat={co ? '#E9F7EA' : '#FDECEC'} ten={c.ten}>
                <div className="flex flex-wrap gap-1.5">
                  <Pill className="bg-sky-100 text-sky-800">{c.buoc}</Pill>
                  <Pill className={co ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{co ? '✓ Đã có' : '⚠ Cần bổ sung'}</Pill>
                </div>
                <div className="mt-1.5 text-2xs text-slate-500">{c.noiLay}</div>
                {c.lienKet && (
                  <div className="mt-2">
                    <ChipLienKet lienKet={c.lienKet} />
                  </div>
                )}
              </TheBieuTuong>
            );
          })}
        </LuoiThe>
        <GoiY kieu="xanh" className="mt-4">💡 {FDI_HUB_GOI_Y_KHO_CONG_CU}</GoiY>
      </The>
    </div>
  );
}

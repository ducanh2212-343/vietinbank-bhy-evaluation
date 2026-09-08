import React from 'react';
import { cn } from '@/lib/utils';
import { FDI_HUB_KICH_BAN_GOI_DIEN, FDI_HUB_THU_CAM_ON } from '@/data/one/fdiHub';
import { DaiDauTab, NutSaoChep, The, TieuDeMuc, TieuDePhu } from './dungChung';

/** Kịch bản gọi điện lần đầu (Việt + Trung) và thư cảm ơn song ngữ cho nhánh «chưa hợp tác» */
export function TabKichBan() {
  const loiViet = FDI_HUB_KICH_BAN_GOI_DIEN.filter((l) => l.nguoiNoi === 'rm');
  const loiTrung = FDI_HUB_KICH_BAN_GOI_DIEN.filter((l) => l.nguoiNoi === 'rm-trung');

  const BongBong = ({ nhan, loi, dich, kieu }: { nhan: string; loi: string; dich?: string; kieu: 'viet' | 'trung' }) => (
    <div className={cn('max-w-[88%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed', kieu === 'viet' ? 'bg-sky-50 text-[#0A2A5E]' : 'bg-amber-50 text-amber-950')}>
      <span className="block text-2xs font-black uppercase tracking-wide opacity-70">{nhan}</span>
      {loi}
      {dich && <span className="mt-1 block text-xs italic opacity-75">{dich}</span>}
    </div>
  );

  return (
    <div className="space-y-4">
      <DaiDauTab bieuTuong="💬" tieuDe="Kịch bản mẫu" moTa="Kịch bản gọi điện & thư cảm ơn song ngữ — sẵn sàng dùng ngay" mau1="#FF6D00" mau2="#EC407A" />

      <The>
        <TieuDeMuc>☎ Kịch bản gọi điện / tiếp cận lần đầu (B2)</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">Mô phỏng hội thoại — RM có thể đọc theo hoặc điều chỉnh linh hoạt.</p>
        <div className="flex flex-col gap-2.5">
          {loiViet.map((l, i) => (
            <BongBong key={i} nhan="RM 🇻🇳" loi={l.loi} kieu="viet" />
          ))}
        </div>
        <TieuDePhu mau="#EC407A">🀄 Câu tiếng Trung cơ bản gợi ý</TieuDePhu>
        <div className="flex flex-col gap-2.5">
          {loiTrung.map((l, i) => (
            <BongBong key={i} nhan="RM 🇨🇳" loi={l.loi} dich={l.dich} kieu="trung" />
          ))}
        </div>
        <div className="mt-4">
          <NutSaoChep kieu="phu" nhan="📋 Sao chép kịch bản" vanBan={() => FDI_HUB_KICH_BAN_GOI_DIEN.map((l) => (l.dich ? `${l.loi}\n(${l.dich})` : l.loi)).join('\n\n')} />
        </div>
      </The>

      <The>
        <TieuDeMuc>💌 Thư cảm ơn &amp; xin phép duy trì liên lạc</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">Dùng khi khách hàng chưa đồng ý hợp tác — nhánh «Không» sau B2.</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <ThuMau co="🇻🇳" tieuDe="Bản tiếng Việt" mau="#C8102E" doan={FDI_HUB_THU_CAM_ON.tiengViet} />
          <ThuMau co="🇨🇳" tieuDe="中文版本" mau="#E5383B" doan={FDI_HUB_THU_CAM_ON.tiengTrung} />
        </div>
      </The>
    </div>
  );
}

function ThuMau({ co, tieuDe, mau, doan }: { co: string; tieuDe: string; mau: string; doan: string[] }) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5" style={{ borderTop: `4px solid ${mau}` }}>
      <span className="absolute right-4 top-3 text-2xl" aria-hidden>{co}</span>
      <h3 className="mb-2 text-sm font-extrabold" style={{ color: mau }}>{tieuDe}</h3>
      {doan.map((d, i) => (
        <p key={i} className="my-1.5 text-sm leading-relaxed text-slate-800">{d}</p>
      ))}
      <div className="mt-3">
        <NutSaoChep kieu="phu" nhan="📋 Sao chép thư" vanBan={doan.join('\n\n')} />
      </div>
    </div>
  );
}

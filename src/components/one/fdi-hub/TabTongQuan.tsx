import React from 'react';
import { ArrowDown } from 'lucide-react';
import { FDI_HUB_CAC_BUOC, FDI_HUB_MUC_TIEU_CHUNG, FDI_HUB_NGUYEN_TAC } from '@/data/one/fdiHub';
import { DaiDauTab, GoiY, LuoiThe, ReNhanh, The, TheBieuTuong, TieuDeMuc, TieuDePhu, useFdiHub } from './dungChung';

/** Sơ đồ luồng 6 bước với hai điểm quyết định (sau B2, sau B4) */
export function TabTongQuan() {
  const { diDenTab } = useFdiHub();
  const buoc = FDI_HUB_CAC_BUOC;

  const HangBuoc = ({ i }: { i: number }) => {
    const b = buoc[i];
    return (
      <button
        type="button"
        onClick={() => diDenTab('hanh-trinh')}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
      >
        <span className="inline-flex min-w-[64px] items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black text-white" style={{ background: b.mau }}>
          {b.bieuTuong} {b.ma}
        </span>
        <span className="text-sm text-slate-800">
          <b>{b.ten}</b> — {b.tieuDe}
        </span>
      </button>
    );
  };

  const MuiTen = () => (
    <div className="pl-8 text-slate-400" aria-hidden>
      <ArrowDown className="h-4 w-4" />
    </div>
  );

  return (
    <div className="space-y-4">
      <DaiDauTab bieuTuong="🗺️" tieuDe="Tổng quan hành trình FDI" moTa="Toàn cảnh 6 bước — từ lập danh sách khách hàng đến đồng hành dài lâu" mau1="#0A2A5E" mau2="#0B5FA5" />

      <The>
        <TieuDeMuc>Sơ đồ luồng xử lý 6 bước</TieuDeMuc>
        <p className="mb-3 text-sm leading-relaxed text-slate-700">
          Hai điểm quyết định quan trọng: khách có đồng ý gặp không (sau B2), và khách có đồng ý hợp tác không (sau B4).
          Nếu câu trả lời là «chưa», RM <b>không dừng lại</b> mà chuyển sang nhánh chăm sóc duy trì.
        </p>
        <div className="space-y-1">
          <HangBuoc i={0} />
          <MuiTen />
          <HangBuoc i={1} />
          <ReNhanh
            className="my-2"
            nhanKhong="✗ KHÔNG"
            nhanCo="✓ CÓ"
            khong="Gửi thư cảm ơn + xin phép duy trì cập nhật thông tin thị trường → Tiếp tục chăm sóc → quay lại B2"
            co="Chuyển sang B3"
          />
          <HangBuoc i={2} />
          <MuiTen />
          <HangBuoc i={3} />
          <ReNhanh
            className="my-2"
            nhanKhong="✗ CHƯA"
            nhanCo="✓ CÓ"
            khong="Tiếp tục chăm sóc (onepage, thông tin thị trường, tư vấn giải pháp) → quay lại B4"
            co="Chuyển sang B5"
          />
          <HangBuoc i={4} />
          <MuiTen />
          <HangBuoc i={5} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          👉 Xem chi tiết từng bước (việc cần làm, mẫu biểu, kịch bản) tại tab{' '}
          <button type="button" className="font-bold text-brand-royal underline" onClick={() => diDenTab('hanh-trinh')}>
            Hành trình B1–B6
          </button>
          .
        </p>
      </The>

      <The>
        <GoiY kieu="xanh">
          🎯 <b>Mục tiêu chung:</b> {FDI_HUB_MUC_TIEU_CHUNG}
        </GoiY>
        <TieuDePhu>4 nguyên tắc hành động</TieuDePhu>
        <LuoiThe className="lg:grid-cols-4">
          {FDI_HUB_NGUYEN_TAC.map((n) => (
            <TheBieuTuong key={n.ten} bieuTuong={n.bieuTuong} mau={n.mau} mauNhat={n.mauNhat} ten={n.ten} />
          ))}
        </LuoiThe>
      </The>
    </div>
  );
}

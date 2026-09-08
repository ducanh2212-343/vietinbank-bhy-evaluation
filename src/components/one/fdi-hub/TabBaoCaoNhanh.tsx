import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  FDI_HUB_AI,
  FDI_HUB_BUOC_DUNG_BAO_CAO,
  FDI_HUB_TRUONG_BAO_CAO,
  ghepPromptBaoCao,
  type GiaTriTruong,
} from '@/data/one/fdiHub';
import { DaiDauTab, KhungXemTruoc, LuoiThe, NutSaoChep, The, TheBieuTuong, TieuDeMuc, TruongVanBan, useLuuCucBo } from './dungChung';

/**
 * Báo cáo nhanh khách hàng FDI: nhập tên DN → ghép prompt chuẩn «FDI RM Skill»
 * → sao chép sang ChatGPT/Gemini. Bản nháp các ô nhập lưu trên trình duyệt để
 * RM đóng tab rồi mở lại không phải gõ lại.
 */
export function TabBaoCaoNhanh() {
  const [giaTri, datGiaTri] = useLuuCucBo<GiaTriTruong>('bao-cao-nhanh', {});
  const prompt = useMemo(() => ghepPromptBaoCao(giaTri), [giaTri]);
  const coTen = !!(giaTri.tenDoanhNghiep ?? '').trim();

  return (
    <div className="space-y-4">
      <DaiDauTab bieuTuong="🤖" tieuDe="Báo cáo nhanh khách hàng FDI (AI)" moTa="Nhập tên DN → Sao chép prompt → Dán vào ChatGPT/Gemini → Nhận báo cáo chi tiết + file tải về" mau1="#37474F" mau2="#7C4DFF" />

      <The>
        <TieuDeMuc>① Nhập thông tin doanh nghiệp</TieuDeMuc>
        <div className="grid gap-3 sm:grid-cols-2">
          {FDI_HUB_TRUONG_BAO_CAO.map((t) => (
            <TruongVanBan
              key={t.khoa}
              id={`fdi-bc-${t.khoa}`}
              nhan={t.nhan}
              goiY={t.goiY}
              batBuoc={t.batBuoc}
              giaTri={giaTri[t.khoa] ?? ''}
              onChange={(v) => datGiaTri((c) => ({ ...c, [t.khoa]: v }))}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <NutSaoChep vanBan={() => ghepPromptBaoCao(giaTri)} nhan="📋 Sao chép prompt đầy đủ" nhanXong="Đã sao chép — dán (Ctrl+V) vào ChatGPT/Gemini" disabled={!coTen} />
          <NutNgoai url={FDI_HUB_AI.chatgpt} nhan="Mở ChatGPT" />
          <NutNgoai url={FDI_HUB_AI.gemini} nhan="Mở Gemini" />
          {!coTen && <span className="text-xs text-slate-500">Nhập tên doanh nghiệp để bật nút sao chép.</span>}
        </div>
        <LuoiThe className="mt-4 lg:grid-cols-4">
          {FDI_HUB_BUOC_DUNG_BAO_CAO.map((b) => (
            <TheBieuTuong key={b.ten} bieuTuong={b.bieuTuong} mau={b.mau} mauNhat={b.mauNhat} ten={b.ten} />
          ))}
        </LuoiThe>
      </The>

      <The>
        <TieuDeMuc>② Prompt đầy đủ (tự động ghép tên DN)</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">
          Prompt chuẩn «FDI RM Skill» — vai trò Senior FDI RM, phân tích doanh nghiệp + công ty mẹ + đánh giá cơ hội bán chéo theo ngành, có yêu cầu xuất file khi dùng trên ChatGPT/Gemini.
        </p>
        <KhungXemTruoc vanBan={prompt} />
      </The>
    </div>
  );
}

export function NutNgoai({ url, nhan }: { url: string; nhan: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-brand-navy transition hover:bg-slate-50 sm:text-sm"
    >
      {nhan}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

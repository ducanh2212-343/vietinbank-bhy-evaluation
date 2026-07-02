import { MemoryTree } from './MemoryTree';

/**
 * Banner kỷ niệm 20 năm chi nhánh — dùng ở Tổng quan.
 * Nền navy định chế tài chính, cây ký ức bên phải, thông điệp chiến dịch bên trái.
 */
export function AnniversaryBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-sidebar-border bg-gradient-to-br from-[#0F172A] via-[#14224E] to-[#1E3A8A] text-white shadow-lift">
      <div className="flex items-center gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1 space-y-2">
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-widest text-blue-100">
            2006 — 2026 · 20 NĂM THÀNH LẬP CHI NHÁNH
          </span>
          <h2 className="text-lg sm:text-2xl font-bold leading-tight">
            Vun gốc bền rễ<span className="text-red-400"> · </span>Vươn tầm tương lai
          </h2>
          <p className="hidden sm:block text-sm text-blue-100/90 max-w-xl">
            Mỗi cán bộ là một "trái ngọt" trên cây ký ức — cùng vun đắp nền móng,
            tôi luyện bản lĩnh và lan tỏa niềm tự hào VietinBank Bắc Hưng Yên.
          </p>
          <p className="text-[11px] text-blue-200/80">
            #VietinBankBacHungYen · #20NamVunGocBenReVuonTamTuongLai
          </p>
        </div>
        <MemoryTree className="hidden min-[420px]:block w-28 sm:w-40 lg:w-48 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]" />
      </div>
      {/* Dải đỏ nhận diện thương hiệu ở đáy banner */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#C8102E] via-[#E11D48] to-[#C8102E]" />
    </div>
  );
}

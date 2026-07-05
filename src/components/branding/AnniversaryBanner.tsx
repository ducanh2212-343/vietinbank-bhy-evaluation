import { BrandTree, BrandBadge } from './BrandAssets';

const VALUES = ['Chính trực', 'Trí tuệ', 'Tận tâm', 'Thấu cảm', 'Thích ứng'];

/**
 * Banner kỷ niệm 20 năm — motif Cây ký ức, dùng ở đầu trang Tổng quan.
 * Nền navy thương hiệu, cây ký ức bên phải, slogan + huy hiệu + giá trị cốt lõi.
 */
export function AnniversaryBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-sidebar-border brand-navy-surface text-white shadow-lift">
      <div className="flex items-stretch gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <BrandBadge className="h-9 w-9 rounded-full bg-white/95 p-0.5 shrink-0 object-contain" />
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-widest text-blue-100">
              2006 — 2026 · KỶ NIỆM 20 NĂM THÀNH LẬP
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold leading-tight">
            Vun gốc bền rễ<span className="text-brand-orange"> · </span>Vươn tầm tương lai
          </h2>
          <p className="hidden sm:block text-sm text-blue-100/90 max-w-xl">
            Mỗi cán bộ là một "quả ngọt" trên cây ký ức — cùng vun đắp nền móng,
            tôi luyện bản lĩnh và lan tỏa niềm tự hào VietinBank Bắc Hưng Yên.
          </p>
          {/* Giá trị cốt lõi */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {VALUES.map((v) => (
              <span
                key={v}
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-blue-50"
              >
                {v}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-blue-200/80 pt-0.5">
            #VietinBankBacHungYen · #20NamVunGocBenReVuonTamTuongLai
          </p>
        </div>
        <BrandTree framed className="hidden min-[420px]:block w-28 sm:w-40 lg:w-48 shrink-0 self-center" />
      </div>
      {/* Dải đỏ nhận diện thương hiệu */}
      <div className="h-1.5 w-full brand-ribbon" />
    </div>
  );
}

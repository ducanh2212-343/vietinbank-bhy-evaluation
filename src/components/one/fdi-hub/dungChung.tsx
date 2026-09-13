import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FDI_HUB_KHOA_LUU,
  type LienKetFdiHub,
  type MaTabFdiHub,
  type MaTabTrangFdiHub,
  type NeoFdiHub,
} from '@/data/one/fdiHub';

/*
 * Mảnh giao diện dùng chung của chín tab FDI Hub.
 *
 * Bản gốc là một tệp HTML với CSS riêng (thẻ, dải màu đầu tab, chip liên kết,
 * ô «lưu ý»…). Chuyển sang cổng ONE thì dựng lại bằng Tailwind theo thang chữ
 * và bo góc của cổng, nhưng GIỮ bảng màu riêng của từng bước/nhóm (tím B1,
 * xanh B2… ) vì cán bộ Tổ FDI đã quen mắt với bản in và slide cùng màu.
 */

// ---------------------------------------------------------------------------
// Điều hướng nội bộ giữa các tab
// ---------------------------------------------------------------------------

interface DieuHuongFdiHub {
  tab: MaTabTrangFdiHub;
  diDenTab: (tab: MaTabTrangFdiHub, neo?: NeoFdiHub) => void;
}

export const FdiHubContext = createContext<DieuHuongFdiHub>({
  tab: 'tong-quan',
  diDenTab: () => {},
});

export const useFdiHub = () => useContext(FdiHubContext);

// ---------------------------------------------------------------------------
// Lưu cục bộ an toàn (trình duyệt chặn localStorage thì rơi về bộ nhớ tạm)
// ---------------------------------------------------------------------------

const boNhoTam = new Map<string, string>();

function docKhoa(khoa: string): string | null {
  try {
    return window.localStorage.getItem(khoa);
  } catch {
    return boNhoTam.get(khoa) ?? null;
  }
}

function ghiKhoa(khoa: string, giaTri: string) {
  try {
    window.localStorage.setItem(khoa, giaTri);
  } catch {
    boNhoTam.set(khoa, giaTri);
  }
}

/**
 * Trạng thái lưu trên trình duyệt này, dưới tiền tố chung của FDI Hub. Dùng
 * cho tiến độ hành trình, checklist, bản nháp form prompt — thứ cá nhân, không
 * phải hồ sơ khách hàng, nên không đưa lên máy chủ.
 */
export function useLuuCucBo<T>(khoa: string, macDinh: T): [T, (v: T | ((c: T) => T)) => void] {
  const khoaDayDu = `${FDI_HUB_KHOA_LUU}:${khoa}`;
  const [giaTri, datGiaTri] = useState<T>(() => {
    const raw = docKhoa(khoaDayDu);
    if (raw === null) return macDinh;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return macDinh;
    }
  });
  const cap = useCallback(
    (v: T | ((c: T) => T)) => {
      datGiaTri((cu) => {
        const moi = typeof v === 'function' ? (v as (c: T) => T)(cu) : v;
        ghiKhoa(khoaDayDu, JSON.stringify(moi));
        return moi;
      });
    },
    [khoaDayDu],
  );
  return [giaTri, cap];
}

// ---------------------------------------------------------------------------
// Sao chép vào bộ nhớ đệm
// ---------------------------------------------------------------------------

export async function saoChepVanBan(vanBan: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(vanBan);
      return true;
    }
  } catch {
    /* rơi xuống cách cũ */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = vanBan;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function NutSaoChep({
  vanBan,
  nhan = 'Sao chép',
  nhanXong = 'Đã sao chép ✓',
  disabled,
  className,
  kieu = 'chinh',
}: {
  vanBan: string | (() => string);
  nhan?: React.ReactNode;
  nhanXong?: string;
  disabled?: boolean;
  className?: string;
  kieu?: 'chinh' | 'phu';
}) {
  const [trangThai, datTrangThai] = useState<'cho' | 'xong' | 'loi'>('cho');
  useEffect(() => {
    if (trangThai === 'cho') return;
    const t = window.setTimeout(() => datTrangThai('cho'), 2500);
    return () => window.clearTimeout(t);
  }, [trangThai]);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={async () => {
        const ok = await saoChepVanBan(typeof vanBan === 'function' ? vanBan() : vanBan);
        datTrangThai(ok ? 'xong' : 'loi');
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm',
        kieu === 'chinh'
          ? 'bg-brand-navy text-white shadow-sm hover:bg-brand-royal'
          : 'border border-slate-300 bg-white text-brand-navy hover:bg-slate-50',
        className,
      )}
    >
      {trangThai === 'xong' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {trangThai === 'xong' ? nhanXong : trangThai === 'loi' ? 'Không sao chép được — hãy bôi đen và Ctrl+C' : nhan}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Khung, dải màu, tiêu đề
// ---------------------------------------------------------------------------

export function The({
  children,
  className,
  id,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      id={id}
      style={style}
      className={cn('scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6', className)}
    >
      {children}
    </section>
  );
}

export function TieuDeMuc({ children, mau, className }: { children: React.ReactNode; mau?: string; className?: string }) {
  return (
    <h2 className={cn('mb-3 text-lg font-black text-brand-navy sm:text-xl', className)} style={mau ? { color: mau } : undefined}>
      {children}
    </h2>
  );
}

export function TieuDePhu({ children, mau, className }: { children: React.ReactNode; mau?: string; className?: string }) {
  return (
    <h3 className={cn('mb-2 mt-5 text-sm font-extrabold text-brand-royal sm:text-[15px]', className)} style={mau ? { color: mau } : undefined}>
      {children}
    </h3>
  );
}

/** Dải màu đầu mỗi tab: biểu tượng lớn, tên tab, một câu định vị */
export function DaiDauTab({ bieuTuong, tieuDe, moTa, mau1, mau2 }: { bieuTuong: string; tieuDe: string; moTa: string; mau1: string; mau2: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-5 text-white shadow-md sm:px-6"
      style={{ background: `linear-gradient(135deg, ${mau1}, ${mau2})` }}
    >
      <span className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" aria-hidden />
      <span className="pointer-events-none absolute -bottom-12 right-10 h-24 w-24 rounded-full bg-white/10" aria-hidden />
      <div className="relative flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-3xl" aria-hidden>
          {bieuTuong}
        </span>
        <div>
          <div className="text-lg font-black sm:text-xl">{tieuDe}</div>
          <div className="text-xs text-white/90 sm:text-sm">{moTa}</div>
        </div>
      </div>
    </div>
  );
}

/** Ô ghi chú — «cam» cho lưu ý/cảnh báo, «xanh» cho gợi ý */
export function GoiY({ children, kieu = 'cam', className }: { children: React.ReactNode; kieu?: 'cam' | 'xanh'; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 text-sm leading-relaxed',
        kieu === 'cam' ? 'border-amber-400 bg-amber-50 text-amber-950' : 'border-sky-300 bg-sky-50 text-slate-800',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DanhSach({ muc, className }: { muc: React.ReactNode[]; className?: string }) {
  return (
    <ul className={cn('list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700', className)}>
      {muc.map((m, i) => (
        <li key={i}>{m}</li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Thẻ biểu tượng (lưới) và chip liên kết
// ---------------------------------------------------------------------------

export function LuoiThe({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>{children}</div>;
}

export function TheBieuTuong({
  bieuTuong,
  mau,
  mauNhat,
  ten,
  children,
  onClick,
  className,
}: {
  bieuTuong: React.ReactNode;
  mau: string;
  mauNhat: string;
  ten: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition',
        onClick && 'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal',
        className,
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: mau }} aria-hidden />
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: mauNhat }} aria-hidden>
          {bieuTuong}
        </span>
        <span className="text-sm font-extrabold leading-snug text-brand-navy">{ten}</span>
      </div>
      {children && <div className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-[13px]">{children}</div>}
    </Tag>
  );
}

/** Chip liên kết: nội bộ (đổi tab, cuộn tới neo) hoặc ngoài (Drive, YouTube…) */
export function ChipLienKet({ lienKet }: { lienKet: LienKetFdiHub }) {
  const { diDenTab } = useFdiHub();
  const lop =
    'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors';
  if (lienKet.loai === 'ngoai') {
    return (
      <a
        href={lienKet.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(lop, 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-600 hover:text-white')}
      >
        {lienKet.nhan}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => diDenTab(lienKet.tab, lienKet.neo)}
      className={cn(lop, 'border-sky-200 bg-sky-50 text-brand-royal hover:bg-brand-royal hover:text-white')}
    >
      {lienKet.nhan}
      <ArrowRight className="h-3 w-3" />
    </button>
  );
}

export function DayChip({ lienKet, className }: { lienKet: LienKetFdiHub[]; className?: string }) {
  if (!lienKet.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {lienKet.map((l, i) => (
        <ChipLienKet key={i} lienKet={l} />
      ))}
    </div>
  );
}

/** Hai ô rẽ nhánh Không / Có sau điểm quyết định */
export function ReNhanh({ khong, co, nhanKhong = '✗ KHÔNG / CHƯA', nhanCo = '✓ CÓ / ĐỒNG Ý', className }: { khong: React.ReactNode; co: React.ReactNode; nhanKhong?: string; nhanCo?: string; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      <div className="rounded-xl border-[1.5px] border-dashed border-red-400 bg-red-50 px-4 py-3 text-sm text-red-900">
        <div className="mb-1 text-xs font-black tracking-wide">{nhanKhong}</div>
        {khong}
      </div>
      <div className="rounded-xl border-[1.5px] border-dashed border-green-600 bg-green-50 px-4 py-3 text-sm text-green-900">
        <div className="mb-1 text-xs font-black tracking-wide">{nhanCo}</div>
        {co}
      </div>
    </div>
  );
}

export function ThanhTienDo({ phanTram, mau, className }: { phanTram: number; mau?: string; className?: string }) {
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-slate-200', className)} role="progressbar" aria-valuenow={Math.round(phanTram)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{
          width: `${Math.max(0, Math.min(100, phanTram))}%`,
          background: mau ?? 'linear-gradient(90deg, #7C4DFF, #2979FF, #00B8A9, #FF8A00, #E5383B, #2E7D32)',
        }}
      />
    </div>
  );
}

export function Pill({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-extrabold', className)} style={style}>
      {children}
    </span>
  );
}

/** Ô nhập / ô nhiều dòng theo khuôn form của cổng */
export function TruongVanBan({
  id,
  nhan,
  goiY,
  giaTri,
  onChange,
  nhieuDong,
  batBuoc,
  className,
}: {
  id: string;
  nhan: string;
  goiY?: string;
  giaTri: string;
  onChange: (v: string) => void;
  nhieuDong?: boolean;
  batBuoc?: boolean;
  className?: string;
}) {
  const lopO =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-brand-royal focus:outline-none focus:ring-2 focus:ring-brand-royal/30';
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="block text-xs font-bold text-brand-navy">
        {nhan}
        {batBuoc && <span className="text-red-600"> *</span>}
      </label>
      {nhieuDong ? (
        <textarea id={id} rows={3} value={giaTri} placeholder={goiY} onChange={(e) => onChange(e.target.value)} className={lopO} />
      ) : (
        <input id={id} type="text" value={giaTri} placeholder={goiY} onChange={(e) => onChange(e.target.value)} className={lopO} />
      )}
    </div>
  );
}

export function KhungXemTruoc({ vanBan, chieuCao = 'max-h-[420px]' }: { vanBan: string; chieuCao?: string }) {
  return (
    <pre className={cn('overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-xs leading-relaxed text-slate-700', chieuCao)}>
      {vanBan}
    </pre>
  );
}

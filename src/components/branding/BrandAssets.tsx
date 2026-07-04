import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { MemoryTree } from './MemoryTree';
import { AnniversaryBadge } from './AnniversaryBadge';

/**
 * Ảnh thương hiệu "Cây ký ức" — ưu tiên ảnh thật trong public/brand/,
 * tự fallback về SVG vector nếu file chưa được upload (web không bao giờ vỡ).
 *
 * File cần upload vào public/brand/ (tên đúng như sau):
 *   cay-ky-uc.png   — ảnh cây ký ức (cắt từ poster, nên vuông ~1000×1000)
 *   huy-hieu-20.png — logo/huy hiệu 20 năm (nên nền trong suốt hoặc trắng)
 *   mascot.png      — (tùy chọn) linh vật
 */

export const BRAND_ASSETS = {
  tree: '/brand/cay-ky-uc.webp',
  badge: '/brand/huy-hieu-20.webp',
  mascot: '/brand/mascot.webp',
};

interface AssetProps {
  className?: string;
  /**
   * framed: bọc ảnh trong khung bo tròn nền sáng — dùng khi đặt trên nền navy
   * (ảnh poster thường có nền xanh nhạt, không trong suốt).
   */
  framed?: boolean;
}

export function BrandTree({ className, framed = false }: AssetProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <MemoryTree className={className} />;
  const img = (
    <img
      src={BRAND_ASSETS.tree}
      alt="Cây ký ức 20 năm VietinBank Bắc Hưng Yên"
      className={framed ? 'block w-full h-auto' : className}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
  if (!framed) return img;
  return (
    <div className={`overflow-hidden rounded-2xl bg-white/95 ring-1 ring-white/30 shadow-lift ${className || ''}`}>
      {img}
    </div>
  );
}

export function BrandBadge({ className }: AssetProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <AnniversaryBadge className={className} />;
  return (
    <img
      src={BRAND_ASSETS.badge}
      alt="20 năm VietinBank Bắc Hưng Yên 2006–2026"
      className={className}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/** Linh vật — đại diện trợ lý AI. Fallback icon ✨ nếu ảnh chưa có. */
export function BrandMascot({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Sparkles className={className} />;
  return (
    <img
      src={BRAND_ASSETS.mascot}
      alt="Trợ lý AI VietinBank"
      className={className}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

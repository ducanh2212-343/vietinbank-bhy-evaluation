import { Lock } from 'lucide-react';
import { LEVEL_LABELS, GROWTH_STAGE_LABELS } from '@/lib/skillLevels';
import { SkillGrowthArt } from '@/components/SkillGrowthArt';

export type SkillArtSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<SkillArtSize, { outer: string; art: string; lock: string }> = {
  sm: { outer: 'w-6 h-6 rounded-md p-px', art: 'w-full h-full', lock: 'w-2 h-2' },
  md: { outer: 'w-10 h-10 rounded-lg p-[2px]', art: 'w-full h-full p-0.5', lock: 'w-2.5 h-2.5' },
  lg: { outer: 'w-20 h-20 rounded-xl p-[3px]', art: 'w-full h-full p-1', lock: 'w-3.5 h-3.5' },
  xl: { outer: 'w-32 h-32 rounded-2xl p-1', art: 'w-full h-full p-1.5', lock: 'w-4 h-4' },
};

// Tên class phải là chuỗi nguyên văn để Tailwind không purge rule trong @layer components
const FRAME_CLASSES: Record<number, string> = {
  1: 'skill-art-l1',
  2: 'skill-art-l2',
  3: 'skill-art-l3',
  4: 'skill-art-l4',
};

interface Props {
  /** Level 1-4 quyết định bậc khung (đồng/bạc/vàng/kim cương) */
  level: number;
  /** Ảnh riêng của skill × level (override) — ưu tiên cao nhất */
  imageUrl?: string | null;
  /** Icon riêng của skill (skill_catalog.icon_url) — compose với khung level */
  iconUrl?: string | null;
  size?: SkillArtSize;
  /** Level chưa đạt — silhouette + ổ khoá, không lộ chi tiết art */
  locked?: boolean;
  className?: string;
  alt?: string;
}

/**
 * Ảnh skill đóng khung theo level. Thứ tự ưu tiên:
 *   1. Ảnh riêng từng level (skill_level_images)
 *   2. Icon riêng của skill + khung level
 *   3. Bộ hình chung 4 nấc Cây ký ức: Ươm mầm → Bám rễ → Vươn cành → Lan tỏa
 * — mọi skill đều có hình nhất quán mà không cần upload đủ 38 × 4 ảnh.
 */
export function SkillLevelArt({
  level,
  imageUrl,
  iconUrl,
  size = 'md',
  locked = false,
  className = '',
  alt,
}: Props) {
  const s = SIZE_CLASSES[size];
  const src = imageUrl || iconUrl;
  const lvl = Math.min(Math.max(level, 1), 4);
  const frameClass = locked ? 'skill-art-locked' : FRAME_CLASSES[lvl];
  const label = alt || `Level ${level} — ${LEVEL_LABELS[level] || ''} · ${GROWTH_STAGE_LABELS[lvl]}`;

  return (
    <span className={`skill-art ${frameClass} ${s.outer} ${className}`} title={label}>
      <span className="skill-art-inner">
        {src ? (
          <img
            src={src}
            alt={label}
            loading="lazy"
            className={`w-full h-full object-contain ${locked ? 'skill-art-silhouette' : ''}`}
          />
        ) : (
          <SkillGrowthArt stage={lvl} className={`${s.art} ${locked ? 'skill-art-silhouette' : ''}`} />
        )}
      </span>
      {locked && (
        <span className="skill-art-lock">
          <Lock className={s.lock} />
        </span>
      )}
    </span>
  );
}

import { Lock, Star } from 'lucide-react';
import { LEVEL_LABELS } from '@/lib/skillLevels';

export type SkillArtSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<SkillArtSize, { outer: string; icon: string; lock: string }> = {
  sm: { outer: 'w-6 h-6 rounded-md p-px', icon: 'w-3 h-3', lock: 'w-2 h-2' },
  md: { outer: 'w-10 h-10 rounded-lg p-[2px]', icon: 'w-5 h-5', lock: 'w-2.5 h-2.5' },
  lg: { outer: 'w-20 h-20 rounded-xl p-[3px]', icon: 'w-9 h-9', lock: 'w-3.5 h-3.5' },
  xl: { outer: 'w-32 h-32 rounded-2xl p-1', icon: 'w-14 h-14', lock: 'w-4 h-4' },
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
  /** Icon chung của skill (skill_catalog.icon_url) — compose với khung level */
  iconUrl?: string | null;
  size?: SkillArtSize;
  /** Level chưa đạt — silhouette + ổ khoá, không lộ chi tiết art */
  locked?: boolean;
  className?: string;
  alt?: string;
}

/**
 * Ảnh skill đóng khung theo level. Không có art riêng thì compose icon skill
 * với khung; không có cả icon thì rơi về ngôi sao màu level — mọi skill đều
 * có hình nhất quán mà không cần upload đủ 38 × 4 ảnh.
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
  const frameClass = locked ? 'skill-art-locked' : FRAME_CLASSES[Math.min(Math.max(level, 1), 4)];
  const label = alt || `Level ${level} — ${LEVEL_LABELS[level] || ''}`;

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
          <Star className={`${s.icon} skill-art-fallback`} strokeWidth={1.5} />
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

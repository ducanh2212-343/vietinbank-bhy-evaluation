/**
 * BHY Quizzi — hằng số hiển thị huy hiệu phụ (mirror của quiz_badge_catalog).
 * Nguồn chuẩn nghiệp vụ là DB; file này chỉ map code → icon/màu cho UI.
 */
import {
  Rocket, Crosshair, Gem, Zap, Medal, Award, Trophy,
  Flame, Sprout, TreeDeciduous, type LucideIcon,
} from 'lucide-react';

export interface QuizBadgeVisual {
  icon: LucideIcon;
  /** Lớp màu Tailwind cho icon khi đã đạt */
  colorClass: string;
  /** Lớp nền nhạt cho ô huy hiệu khi đã đạt */
  bgClass: string;
}

export const QUIZ_BADGE_VISUALS: Record<string, QuizBadgeVisual> = {
  QZ_FIRST:     { icon: Rocket,        colorClass: 'text-sky-600',     bgClass: 'bg-sky-50 dark:bg-sky-950/40' },
  QZ_SHARP:     { icon: Crosshair,     colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50 dark:bg-emerald-950/40' },
  QZ_PERFECT:   { icon: Gem,           colorClass: 'text-violet-600',  bgClass: 'bg-violet-50 dark:bg-violet-950/40' },
  QZ_FLASH:     { icon: Zap,           colorClass: 'text-amber-500',   bgClass: 'bg-amber-50 dark:bg-amber-950/40' },
  QZ_PART_10:   { icon: Medal,         colorClass: 'text-orange-700',  bgClass: 'bg-orange-50 dark:bg-orange-950/40' },
  QZ_PART_25:   { icon: Award,         colorClass: 'text-slate-500',   bgClass: 'bg-slate-50 dark:bg-slate-900/40' },
  QZ_PART_50:   { icon: Trophy,        colorClass: 'text-yellow-500',  bgClass: 'bg-yellow-50 dark:bg-yellow-950/40' },
  QZ_STREAK_4:  { icon: Flame,         colorClass: 'text-orange-500',  bgClass: 'bg-orange-50 dark:bg-orange-950/40' },
  QZ_STREAK_12: { icon: Flame,         colorClass: 'text-red-500',     bgClass: 'bg-red-50 dark:bg-red-950/40' },
  QZ_STREAK_26: { icon: Flame,         colorClass: 'text-rose-600',    bgClass: 'bg-rose-50 dark:bg-rose-950/40' },
  QZ_AUTHOR_1:  { icon: Sprout,        colorClass: 'text-green-600',   bgClass: 'bg-green-50 dark:bg-green-950/40' },
  QZ_AUTHOR_10: { icon: TreeDeciduous, colorClass: 'text-teal-600',    bgClass: 'bg-teal-50 dark:bg-teal-950/40' },
};

export function getBadgeVisual(code: string): QuizBadgeVisual {
  return QUIZ_BADGE_VISUALS[code] ?? { icon: Medal, colorClass: 'text-primary', bgClass: 'bg-primary/5' };
}

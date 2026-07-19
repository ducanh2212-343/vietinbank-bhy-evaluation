import { cn } from '@/lib/utils';

const LEVEL_TITLES = [
  'L0 - Chưa hình thành',
  'L1 - Tân binh',
  'L2 - Độc lập',
  'L3 - Chuyên gia',
  'L4 - Bậc thầy',
];

interface Props {
  /** null = chưa chấm (khác L0 — không tô nút nào khi null) */
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
  ariaLabelPrefix?: string;
}

/**
 * Dãy nút chấm nhanh L0-L4 ngay trên hàng skill đóng — 1 chạm đổi level, không cần mở accordion.
 * Dùng span[role=button] thay vì <button> vì nằm trong CollapsibleTrigger vốn đã là <button>
 * (tránh button lồng nhau — cùng pattern với SkillLevelBadge).
 */
export function LevelQuickPick({ value, onChange, disabled, ariaLabelPrefix }: Props) {
  const pick = (e: React.SyntheticEvent, lvl: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (!disabled) onChange(lvl);
  };

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      {LEVEL_TITLES.map((title, lvl) => {
        const active = value === lvl;
        return (
          <span
            key={lvl}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={active}
            aria-label={`${ariaLabelPrefix ? `${ariaLabelPrefix} ` : ''}${title}`}
            title={title}
            onClick={(e) => pick(e, lvl)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') pick(e, lvl);
            }}
            className={cn(
              'inline-flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-[34px] sm:min-h-[30px] px-1 rounded-md text-xs font-semibold transition-colors select-none',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              active
                ? `level-${lvl} ring-1 ring-current/40`
                : 'text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            L{lvl}
          </span>
        );
      })}
    </span>
  );
}

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { SkillLevelArt } from '@/components/SkillLevelArt';
import { LEVEL_LABELS } from '@/lib/skillLevels';
import { useSkillLevelImages } from '@/hooks/useSkillLevelImages';

interface Props {
  level: number | null | undefined;
  imageUrl?: string | null;
  /** Khi truyền, tự resolve ảnh/icon từ cache và hiện teaser level kế tiếp */
  skillId?: string;
  className?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function SkillLevelBadge({ level, imageUrl, skillId, className = '', size = 'sm', showLabel }: Props) {
  const { getImageUrl, getIconUrl } = useSkillLevelImages();
  const lvl = level ?? 0;

  if (lvl === 0) {
    return (
      <Badge variant="outline" className={`text-[10px] bg-muted text-muted-foreground whitespace-nowrap ${className}`}>
        L0 · Chưa hình thành
      </Badge>
    );
  }

  const art = imageUrl ?? (skillId ? getImageUrl(skillId, lvl) : null);
  const icon = skillId ? getIconUrl(skillId) : null;
  const nextLvl = lvl < 4 ? lvl + 1 : null;
  const nextArt = nextLvl && skillId ? getImageUrl(skillId, nextLvl) : null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Dialog>
        {/* span thay vì button: badge hay nằm trong CollapsibleTrigger (button), tránh button lồng nhau */}
        <DialogTrigger asChild>
          <span
            role="button"
            tabIndex={0}
            className="cursor-pointer hover:opacity-80 transition-opacity inline-flex"
            onClick={(e) => e.stopPropagation()}
          >
            <SkillLevelArt level={lvl} imageUrl={art} iconUrl={icon} size={size} />
          </span>
        </DialogTrigger>
        <DialogContent className="max-w-xs p-6 flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
          <SkillLevelArt level={lvl} imageUrl={art} iconUrl={icon} size="xl" />
          <p className="text-sm font-medium">Level {lvl} — {LEVEL_LABELS[lvl]}</p>
          {nextLvl && (
            <div className="w-full flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 p-3">
              <SkillLevelArt level={nextLvl} imageUrl={nextArt} iconUrl={icon} size="md" locked />
              <div className="text-left">
                <p className="text-xs font-medium text-muted-foreground">Cấp tiếp theo</p>
                <p className="text-xs">L{nextLvl} — {LEVEL_LABELS[nextLvl]}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <span className={`level-badge level-${lvl} text-[10px]`}>L{lvl}</span>
      {showLabel && <span className="text-[10px] text-muted-foreground">{LEVEL_LABELS[lvl]}</span>}
    </span>
  );
}

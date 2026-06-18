import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ImageIcon } from 'lucide-react';

interface Props {
  level: number | null | undefined;
  imageUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const LEVEL_LABELS: Record<number, string> = {
  0: 'Chưa hình thành',
  1: 'Tân binh',
  2: 'Độc lập',
  3: 'Chuyên gia',
  4: 'Bậc thầy',
};

export function SkillLevelBadge({ level, imageUrl, className = '', size = 'sm', showLabel }: Props) {
  const lvl = level ?? 0;

  if (lvl === 0) {
    return (
      <Badge variant="outline" className={`text-[10px] bg-muted text-muted-foreground whitespace-nowrap ${className}`}>
        L0 · Chưa hình thành
      </Badge>
    );
  }

  const imgSize = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8';
  const previewSize = 'w-48 h-48';

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {imageUrl ? (
        <Dialog>
          <DialogTrigger asChild>
            <img
              src={imageUrl}
              alt={`Level ${lvl}`}
              className={`${imgSize} object-contain rounded cursor-pointer hover:opacity-80 transition-opacity`}
              loading="lazy"
            />
          </DialogTrigger>
          <DialogContent className="max-w-xs p-6 flex flex-col items-center gap-3">
            <img src={imageUrl} alt={`Level ${lvl}`} className={`${previewSize} object-contain`} />
            <p className="text-sm font-medium">Level {lvl} — {LEVEL_LABELS[lvl]}</p>
          </DialogContent>
        </Dialog>
      ) : (
        <span className={`${imgSize} rounded bg-muted flex items-center justify-center flex-shrink-0`}>
          <ImageIcon className="w-3 h-3 text-muted-foreground" />
        </span>
      )}
      <span className={`level-badge level-${lvl} text-[10px]`}>L{lvl}</span>
      {showLabel && <span className="text-[10px] text-muted-foreground">{LEVEL_LABELS[lvl]}</span>}
    </span>
  );
}

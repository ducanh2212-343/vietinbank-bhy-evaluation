import { Badge } from '@/components/ui/badge';
import { Scale } from 'lucide-react';

export interface SkillDiffItem {
  skill_id: string;
  skill_name: string;
  selfLevel: number;
  managerLevel: number;
}

export interface AttitudeDiffItem {
  id: number;
  name: string;
  selfLabel: string;
  managerLabel: string;
}

interface Props {
  agreedSkillCount: number;
  mismatchSkills: SkillDiffItem[];
  unratedSelfCount: number;
  mismatchAttitudes: AttitudeDiffItem[];
  onJumpToSkill?: (skillId: string) => void;
  /** Bản rút gọn để nhúng trong dialog xác nhận */
  compact?: boolean;
}

/** Tóm tắt duyệt-theo-ngoại-lệ: bao nhiêu đồng thuận, chỗ nào lệch — TP nhìn 1 phát biết cần tập trung đâu. */
export function ReviewDiffSummary({
  agreedSkillCount,
  mismatchSkills,
  unratedSelfCount,
  mismatchAttitudes,
  onJumpToSkill,
  compact,
}: Props) {
  const hasAnything = agreedSkillCount > 0 || mismatchSkills.length > 0 || mismatchAttitudes.length > 0 || unratedSelfCount > 0;
  if (!hasAnything) return null;

  return (
    <div className={compact ? 'space-y-1.5 text-left' : 'rounded-md border border-border bg-muted/30 p-3 space-y-1.5'}>
      {!compact && (
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5" /> Tóm tắt rà soát
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {agreedSkillCount > 0 && <>Đồng thuận với tự đánh giá: <strong className="text-foreground">{agreedSkillCount} skill</strong>. </>}
        {mismatchSkills.length > 0 && <>Bạn chấm lệch: <strong className="text-amber-700 dark:text-amber-400">{mismatchSkills.length} skill</strong>. </>}
        {mismatchAttitudes.length > 0 && <>Thái độ lệch: <strong className="text-amber-700 dark:text-amber-400">{mismatchAttitudes.length} nhóm</strong>. </>}
        {unratedSelfCount > 0 && <>Cán bộ chưa tự chấm: <strong className="text-foreground">{unratedSelfCount} skill</strong>. </>}
      </p>
      {mismatchSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mismatchSkills.slice(0, compact ? 4 : 8).map((m) =>
            onJumpToSkill && !compact ? (
              <button
                key={m.skill_id}
                type="button"
                onClick={() => onJumpToSkill(m.skill_id)}
                className="inline-flex items-center rounded-md border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                title="Mở skill này để xem lại"
              >
                {m.skill_name} · NV L{m.selfLevel} / QL L{m.managerLevel}
              </button>
            ) : (
              <Badge key={m.skill_id} variant="outline" className="text-[10px] text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10">
                {m.skill_name} · NV L{m.selfLevel} / QL L{m.managerLevel}
              </Badge>
            ),
          )}
          {mismatchSkills.length > (compact ? 4 : 8) && (
            <span className="text-[11px] text-muted-foreground self-center">
              +{mismatchSkills.length - (compact ? 4 : 8)} skill khác
            </span>
          )}
        </div>
      )}
      {mismatchAttitudes.length > 0 && !compact && (
        <p className="text-[11px] text-muted-foreground">
          Nhóm thái độ lệch: {mismatchAttitudes.map((m) => `${m.name} (NV ${m.selfLabel} / QL ${m.managerLabel})`).join(' · ')}
        </p>
      )}
    </div>
  );
}

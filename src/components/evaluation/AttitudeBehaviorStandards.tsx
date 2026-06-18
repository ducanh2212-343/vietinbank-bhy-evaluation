import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BookOpen, ChevronDown, AlertCircle } from 'lucide-react';
import { BEHAVIOR_STANDARDS, LEVEL_DESCRIPTIONS } from './attitudeBehaviorStandards';

interface Props {
  groupId: number;
  selectedLevel?: string | null; // 'can_cai_thien' | 'dat_mong_doi' | 'noi_bat'
}

type Tone = 'amber' | 'sky' | 'violet';

const TONE: Record<Tone, { border: string; bg: string; header: string; title: string; ring: string }> = {
  amber: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/60',
    header: 'bg-amber-100/80 text-amber-900',
    title: 'text-amber-900',
    ring: 'ring-2 ring-amber-400 ring-offset-1',
  },
  sky: {
    border: 'border-sky-200',
    bg: 'bg-sky-50/60',
    header: 'bg-sky-100/80 text-sky-900',
    title: 'text-sky-900',
    ring: 'ring-2 ring-sky-400 ring-offset-1',
  },
  violet: {
    border: 'border-violet-200',
    bg: 'bg-violet-50/60',
    header: 'bg-violet-100/80 text-violet-900',
    title: 'text-violet-900',
    ring: 'ring-2 ring-violet-400 ring-offset-1',
  },
};

function Card({
  tone,
  title,
  description,
  bullets,
  active,
}: {
  tone: Tone;
  title: string;
  description: string;
  bullets: string[];
  active: boolean;
}) {
  const t = TONE[tone];
  return (
    <div
      className={`rounded-md border ${t.border} ${t.bg} overflow-hidden transition-all ${
        active ? `${t.ring} shadow-sm` : 'opacity-95'
      }`}
    >
      <div className={`px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${t.header}`}>
        {title}
      </div>
      <div className="p-2.5 space-y-2">
        <p className={`text-[11px] leading-relaxed ${t.title}`}>{description}</p>
        <ul className="text-[11px] leading-relaxed text-slate-700 space-y-1 list-disc pl-4">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AttitudeBehaviorStandards({ groupId, selectedLevel, alwaysOpen }: Props & { alwaysOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const std = BEHAVIOR_STANDARDS[groupId];
  if (!std) return null;

  const cardsBlock = (
    <>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card
          tone="violet"
          title="Nổi bật"
          description={LEVEL_DESCRIPTIONS.outstanding}
          bullets={std.outstanding}
          active={selectedLevel === 'noi_bat'}
        />
        <Card
          tone="sky"
          title="Đạt mong đợi"
          description={LEVEL_DESCRIPTIONS.meeting}
          bullets={std.meeting}
          active={selectedLevel === 'dat_mong_doi'}
        />
        <Card
          tone="amber"
          title="Cần cải thiện"
          description={LEVEL_DESCRIPTIONS.failing}
          bullets={std.failing}
          active={selectedLevel === 'can_cai_thien'}
        />
      </div>
      {selectedLevel === 'noi_bat' && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-violet-200 bg-violet-50/50 px-2.5 py-1.5 text-[11px] text-violet-900">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Mức <b>Nổi bật</b> cần có minh chứng cụ thể về tác động tích cực hoặc sự lan tỏa đến người khác.
          </span>
        </div>
      )}
    </>
  );

  if (alwaysOpen) {
    return (
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <BookOpen className="w-3 h-3" /> Chuẩn hành vi tham khảo — minh hoạ từng mức
        </div>
        {cardsBlock}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" /> Chuẩn hành vi tham khảo
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>{cardsBlock}</CollapsibleContent>
    </Collapsible>
  );
}

export default AttitudeBehaviorStandards;

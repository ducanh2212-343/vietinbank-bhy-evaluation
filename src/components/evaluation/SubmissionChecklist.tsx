import { CheckCircle2, AlertCircle, Clock, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetailedValidation } from '@/lib/evaluationValidation';

interface Props extends DetailedValidation {}

type CardState = 'pass' | 'fail' | 'waiting';

interface CardProps {
  state: CardState;
  title: string;
  statusLabel: string;
  description?: string;
  missingLabels?: string[];
  warning?: string;
  hint?: string;
  anchor?: string;
}

function Card({ state, title, statusLabel, description, missingLabels, warning, hint, anchor }: CardProps) {
  const tone =
    state === 'pass'
      ? 'border-emerald-200/70 bg-emerald-50/70'
      : state === 'fail'
        ? 'border-rose-200/70 bg-rose-50/60'
        : 'border-slate-200/70 bg-white/60';

  const Icon = state === 'pass' ? CheckCircle2 : state === 'fail' ? AlertCircle : Clock;
  const iconColor =
    state === 'pass' ? 'text-emerald-600' : state === 'fail' ? 'text-rose-500' : 'text-muted-foreground';
  const statusColor =
    state === 'pass' ? 'text-emerald-700' : state === 'fail' ? 'text-rose-600' : 'text-muted-foreground';

  return (
    <div className={cn('rounded-2xl border p-3.5 text-sm shadow-soft', tone)}>
      <div className="flex items-start gap-2">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconColor)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium leading-tight">{title}</span>
            <span className={cn('text-xs font-medium shrink-0', statusColor)}>{statusLabel}</span>
          </div>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          {state === 'fail' && missingLabels && missingLabels.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Còn thiếu: {missingLabels.slice(0, 3).join(', ')}
              {missingLabels.length > 3 ? '…' : ''}
            </p>
          )}
          {state === 'fail' && warning && (
            <p className="mt-1 text-xs text-destructive">{warning}</p>
          )}
          {state === 'fail' && hint && (
            <p className="mt-1 text-xs text-muted-foreground italic">{hint}</p>
          )}
          {state === 'fail' && anchor && (
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById(anchor);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
            >
              <ArrowDown className="h-3 w-3" /> Đi tới mục
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SubmissionChecklist(props: Props) {
  const {
    canSubmit,
    coreTotal, coreMissing,
    attitudeTotal, attitudeMissing,
    gappedTotal,
    needsImprovementTotal, needsImprovementWithoutPlan,
  } = props;

  // Card 1 — Skill lõi đầy đủ
  const coreDone = coreTotal > 0 && coreMissing.length === 0;
  const card1: CardProps = coreDone
    ? {
        state: 'pass',
        title: 'Skill lõi đã đánh giá đầy đủ',
        statusLabel: `Đã đủ ${coreTotal}/${coreTotal}`,
      }
    : {
        state: 'fail',
        title: 'Skill lõi đã đánh giá đầy đủ',
        statusLabel: `Còn thiếu ${coreMissing.length} skill`,
        missingLabels: coreMissing.map((c) => c.skill_name),
        warning: 'Anh/chị cần hoàn tất đánh giá tất cả skill lõi trước khi gửi cấp trên.',
        anchor: 'section-b',
      };

  // Card 2 — 6 nhóm thái độ đầy đủ
  const attDone = attitudeMissing.length === 0;
  const card2: CardProps = attDone
    ? {
        state: 'pass',
        title: '6 nhóm thái độ đã đánh giá đầy đủ',
        statusLabel: `Đã đủ ${attitudeTotal}/${attitudeTotal}`,
      }
    : {
        state: 'fail',
        title: '6 nhóm thái độ đã đánh giá đầy đủ',
        statusLabel: `Còn thiếu ${attitudeMissing.length} nhóm`,
        missingLabels: attitudeMissing.map((a) => {
          const tag = a.reason === 'rating' ? 'thiếu mức đánh giá'
            : a.reason === 'evidence' ? 'thiếu minh chứng'
            : 'thiếu mức đánh giá & minh chứng';
          return `${a.name} (${tag})`;
        }),
        warning: 'Mỗi nhóm thái độ cần có mức tự đánh giá (Nổi bật / Đạt mong đợi / Cần cải thiện) và minh chứng/biểu hiện hiện tại.',
        anchor: 'section-c',
      };

  // Card 3 — Thái độ cần cải thiện có kế hoạch
  let card3: CardProps;
  if (!attDone) {
    card3 = {
      state: 'waiting',
      title: 'Thái độ cần cải thiện đã có kế hoạch cải thiện',
      statusLabel: 'Chờ hoàn tất đánh giá thái độ',
    };
  } else if (needsImprovementTotal === 0) {
    card3 = {
      state: 'pass',
      title: 'Thái độ cần cải thiện đã có kế hoạch cải thiện',
      statusLabel: 'Không có',
    };
  } else if (needsImprovementWithoutPlan.length > 0) {
    card3 = {
      state: 'fail',
      title: 'Thái độ cần cải thiện đã có kế hoạch cải thiện',
      statusLabel: 'Chưa có kế hoạch cải thiện',
      missingLabels: needsImprovementWithoutPlan.map((a) => a.attitude_name || 'Thái độ'),
      warning: 'Có nhóm thái độ cần cải thiện nhưng chưa có kế hoạch cải thiện. Vui lòng bổ sung hành động cải thiện trước khi gửi cấp trên.',
      anchor: 'section-c',
    };
  } else {
    card3 = {
      state: 'pass',
      title: 'Thái độ cần cải thiện đã có kế hoạch cải thiện',
      statusLabel: 'Đã có kế hoạch cải thiện',
    };
  }

  return (
    <div
      className={cn(
        'glass rounded-3xl p-4 space-y-3',
        canSubmit ? 'ring-1 ring-emerald-200/60' : 'ring-1 ring-amber-200/70',
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight">Kiểm tra trước khi gửi cấp trên</h3>
        <span
          className={cn(
            'text-xs font-medium px-2.5 py-1 rounded-full',
            canSubmit ? 'text-emerald-700 bg-emerald-100/70' : 'text-amber-700 bg-amber-100/70',
          )}
        >
          {canSubmit ? 'Sẵn sàng gửi' : 'Còn mục chưa hoàn tất'}
        </span>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        <Card {...card1} />
        <Card {...card2} />
        <Card {...card3} />
      </div>
      {coreDone && gappedTotal > 0 && (
        <p className="text-xs text-muted-foreground">
          Gợi ý: hiện có {gappedTotal} skill lõi còn GAP so với chuẩn vị trí. Anh/chị có thể tham khảo ở mục D để chọn skill up kỳ này (không bắt buộc).
        </p>
      )}
      {!canSubmit && (
        <p className="text-xs text-amber-700">
          Vui lòng hoàn tất các nội dung còn thiếu trong phần Kiểm tra trước khi gửi cấp trên.
        </p>
      )}
    </div>
  );
}


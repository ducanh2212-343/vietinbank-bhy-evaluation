import { DisplayStatus, STATUS_LABEL } from './statusMap';

interface Props {
  total: number;
  counts: Record<DisplayStatus, number>;
  notStartedEmployees: number;
  overdue?: number;
  onFilter?: (s: DisplayStatus | 'all' | 'overdue') => void;
  activeFilter?: DisplayStatus | 'all' | 'overdue';
  /** Nhãn ô tổng: "Tổng cán bộ" khi xem 1 kỳ (1 người = 1 dòng);
   *  "Tổng bản đánh giá" khi xem mọi kỳ (1 người có thể nhiều dòng). */
  totalLabel?: string;
}

const ORDER: DisplayStatus[] = [
  'in_progress', 'submitted', 'resubmitted', 'reviewed',
  'returned_employee', 'returned_manager', 'approved', 'closed',
];

export function KpiCards({ total, counts, notStartedEmployees, overdue, onFilter, activeFilter, totalLabel = 'Tổng cán bộ' }: Props) {
  const Card = ({ label, value, k }: { label: string; value: number; k: DisplayStatus | 'all' | 'overdue' }) => (
    <button
      type="button"
      onClick={() => onFilter?.(k)}
      className={`text-left rounded-lg border p-3 bg-card transition hover:border-primary/40 hover:shadow-soft ${activeFilter === k ? 'border-primary ring-1 ring-primary/30' : 'border-border'}`}
    >
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-0.5">{value}</div>
    </button>
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
      <Card label={totalLabel} value={total} k="all" />
      <Card label="Chưa bắt đầu" value={notStartedEmployees} k="not_started" />
      {ORDER.map((s) => <Card key={s} label={STATUS_LABEL[s]} value={counts[s] || 0} k={s} />)}
      {typeof overdue === 'number' && <Card label="Quá hạn" value={overdue} k="overdue" />}
    </div>
  );
}

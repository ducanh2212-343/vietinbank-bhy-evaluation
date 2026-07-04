/**
 * Tính đúng hạn / chậm nộp biểu mẫu theo mốc thời gian của kỳ đánh giá,
 * và điểm KPI bị trừ (mỗi kỳ nộp chậm so với mốc bị trừ điểm một lần).
 */

export interface CycleDeadlineSource {
  end_date: string; // 'YYYY-MM-DD'
  submission_deadline?: string | null; // ISO timestamptz, mốc do TCTH thiết đặt
  late_penalty_points?: number | null; // điểm KPI trừ khi chậm trong kỳ này
}

export type SubmissionTimingStatus =
  | 'ontime' // đã nộp, trước hoặc đúng mốc
  | 'late' // đã nộp, sau mốc
  | 'missing_overdue' // chưa nộp, đã quá mốc
  | 'pending'; // chưa nộp, chưa tới mốc

export interface SubmissionTiming {
  deadline: Date;
  status: SubmissionTimingStatus;
  /** Số mili-giây trễ so với mốc (0 nếu không trễ). Với missing_overdue tính tới `now`. */
  lateMs: number;
  /** Số ngày trễ, làm tròn lên (0 nếu không trễ). */
  daysLate: number;
  /** Điểm KPI bị trừ cho kỳ này (0 nếu đúng hạn / chưa tới mốc). */
  penalty: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Mốc nộp hiệu lực của kỳ: submission_deadline nếu đã thiết đặt, nếu không là 23:59:59 ngày end_date. */
export function getEffectiveDeadline(cycle: CycleDeadlineSource): Date {
  if (cycle.submission_deadline) return new Date(cycle.submission_deadline);
  const [y, m, d] = cycle.end_date.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
}

export function computeSubmissionTiming(
  firstSubmittedAt: string | null | undefined,
  cycle: CycleDeadlineSource,
  now: Date = new Date(),
): SubmissionTiming {
  const deadline = getEffectiveDeadline(cycle);
  const penaltyPoints = Number(cycle.late_penalty_points ?? 1) || 0;

  if (firstSubmittedAt) {
    const submitted = new Date(firstSubmittedAt);
    const lateMs = Math.max(0, submitted.getTime() - deadline.getTime());
    if (lateMs === 0) {
      return { deadline, status: 'ontime', lateMs: 0, daysLate: 0, penalty: 0 };
    }
    return {
      deadline,
      status: 'late',
      lateMs,
      daysLate: Math.ceil(lateMs / DAY_MS),
      penalty: penaltyPoints,
    };
  }

  const overdueMs = Math.max(0, now.getTime() - deadline.getTime());
  if (overdueMs === 0) {
    return { deadline, status: 'pending', lateMs: 0, daysLate: 0, penalty: 0 };
  }
  return {
    deadline,
    status: 'missing_overdue',
    lateMs: overdueMs,
    daysLate: Math.ceil(overdueMs / DAY_MS),
    penalty: penaltyPoints,
  };
}

export const TIMING_LABEL: Record<SubmissionTimingStatus, string> = {
  ontime: 'Đúng hạn',
  late: 'Nộp muộn',
  missing_overdue: 'Chưa nộp (quá hạn)',
  pending: 'Chưa nộp',
};

/** Diễn giải khoảng trễ/sớm, ví dụ "muộn 2 ngày 3 giờ" hoặc "sớm 5 giờ". */
export function formatVsDeadline(submittedAt: string, deadline: Date): string {
  const diff = new Date(submittedAt).getTime() - deadline.getTime();
  const abs = Math.abs(diff);
  const days = Math.floor(abs / DAY_MS);
  const hours = Math.floor((abs % DAY_MS) / (60 * 60 * 1000));
  const minutes = Math.floor((abs % (60 * 60 * 1000)) / 60000);
  const parts: string[] = [];
  if (days) parts.push(`${days} ngày`);
  if (hours) parts.push(`${hours} giờ`);
  if (!days && !hours) parts.push(`${Math.max(minutes, 1)} phút`);
  return `${diff > 0 ? 'muộn' : 'sớm'} ${parts.join(' ')}`;
}

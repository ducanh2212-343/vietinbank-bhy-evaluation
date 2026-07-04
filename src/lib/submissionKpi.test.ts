import { describe, it, expect } from 'vitest';
import { computeSubmissionTiming, formatVsDeadline, getEffectiveDeadline } from './submissionKpi';
import { filterQuarterCycles, nextQuarterName, pickDefaultCycle, quarterCycleOrder, quarterDateRange } from './evaluationCycles';

const cycle = {
  end_date: '2026-09-30',
  submission_deadline: '2026-10-05T10:00:00+07:00',
  late_penalty_points: 2,
};

describe('getEffectiveDeadline', () => {
  it('dùng submission_deadline khi đã thiết đặt', () => {
    expect(getEffectiveDeadline(cycle).toISOString()).toBe(new Date('2026-10-05T10:00:00+07:00').toISOString());
  });

  it('mặc định 23:59:59 ngày end_date khi chưa thiết đặt mốc', () => {
    const d = getEffectiveDeadline({ end_date: '2026-09-30' });
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(30);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });
});

describe('computeSubmissionTiming', () => {
  it('nộp trước mốc → đúng hạn, không trừ KPI', () => {
    const t = computeSubmissionTiming('2026-10-05T09:00:00+07:00', cycle);
    expect(t.status).toBe('ontime');
    expect(t.penalty).toBe(0);
    expect(t.daysLate).toBe(0);
  });

  it('nộp sau mốc → muộn, trừ điểm KPI của kỳ', () => {
    const t = computeSubmissionTiming('2026-10-07T09:00:00+07:00', cycle);
    expect(t.status).toBe('late');
    expect(t.penalty).toBe(2);
    expect(t.daysLate).toBe(2);
  });

  it('chưa nộp, chưa tới mốc → pending, chưa trừ', () => {
    const t = computeSubmissionTiming(null, cycle, new Date('2026-10-01T00:00:00+07:00'));
    expect(t.status).toBe('pending');
    expect(t.penalty).toBe(0);
  });

  it('chưa nộp, quá mốc → tính là chậm và trừ KPI', () => {
    const t = computeSubmissionTiming(null, cycle, new Date('2026-10-06T10:00:00+07:00'));
    expect(t.status).toBe('missing_overdue');
    expect(t.penalty).toBe(2);
    expect(t.daysLate).toBe(1);
  });

  it('mặc định trừ 1 điểm khi kỳ không cấu hình late_penalty_points', () => {
    const t = computeSubmissionTiming('2026-10-02T00:00:00+07:00', { end_date: '2026-09-30' });
    expect(t.status).toBe('late');
    expect(t.penalty).toBe(1);
  });
});

describe('formatVsDeadline', () => {
  const deadline = new Date('2026-10-05T10:00:00+07:00');
  it('diễn giải nộp muộn', () => {
    expect(formatVsDeadline('2026-10-07T13:30:00+07:00', deadline)).toContain('muộn 2 ngày');
  });
  it('diễn giải nộp sớm', () => {
    expect(formatVsDeadline('2026-10-05T04:00:00+07:00', deadline)).toBe('sớm 6 giờ');
  });
});

describe('quarter cycle helpers', () => {
  const cycles = [
    { id: 'c3', name: 'Quý III/2026' },
    { id: 'x', name: 'Đợt đặc biệt' },
    { id: 'c2', name: 'Quý II/2026' },
    { id: 'c1', name: 'Quý IV/2025' },
  ];

  it('lọc và sắp xếp theo năm rồi tới quý', () => {
    expect(filterQuarterCycles(cycles).map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('kỳ mặc định là kỳ mới nhất', () => {
    expect(pickDefaultCycle(filterQuarterCycles(cycles))?.id).toBe('c3');
  });

  it('quarterCycleOrder tăng dần theo thời gian', () => {
    expect(quarterCycleOrder('Quý IV/2025')).toBeLessThan(quarterCycleOrder('Quý I/2026'));
  });

  it('nextQuarterName xử lý cả chuyển năm', () => {
    expect(nextQuarterName('Quý III/2026')).toBe('Quý IV/2026');
    expect(nextQuarterName('Quý IV/2026')).toBe('Quý I/2027');
  });

  it('quarterDateRange trả về đúng khoảng ngày của quý', () => {
    expect(quarterDateRange('Quý III/2026')).toEqual({ start: '2026-07-01', end: '2026-09-30' });
    expect(quarterDateRange('Quý I/2027')).toEqual({ start: '2027-01-01', end: '2027-03-31' });
  });
});

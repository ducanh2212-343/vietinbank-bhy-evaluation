import { describe, it, expect } from 'vitest';
import {
  getVnWeekStart, prevWeek, computeStreak, questionPoints, maxScore,
  formatDurationMs, formatWeekLabel,
} from './quizzi';

describe('getVnWeekStart — ranh giới tuần theo giờ VN', () => {
  it('thứ Tư giữa tuần → thứ Hai cùng tuần', () => {
    // 2026-07-15 10:00 VN (thứ Tư) = 03:00 UTC
    expect(getVnWeekStart(new Date('2026-07-15T03:00:00Z'))).toBe('2026-07-13');
  });

  it('Chủ nhật 23:59 VN vẫn thuộc tuần cũ', () => {
    // 2026-07-19 23:59 VN = 16:59 UTC
    expect(getVnWeekStart(new Date('2026-07-19T16:59:00Z'))).toBe('2026-07-13');
  });

  it('Thứ Hai 00:01 VN sang tuần mới', () => {
    // 2026-07-20 00:01 VN = 2026-07-19 17:01 UTC
    expect(getVnWeekStart(new Date('2026-07-19T17:01:00Z'))).toBe('2026-07-20');
  });

  it('ngày UTC ≠ ngày VN (tối muộn UTC = sáng sớm VN hôm sau)', () => {
    // 2026-07-12 20:00 UTC = 2026-07-13 03:00 VN (thứ Hai) → tuần 13/07
    expect(getVnWeekStart(new Date('2026-07-12T20:00:00Z'))).toBe('2026-07-13');
  });
});

describe('prevWeek', () => {
  it('lùi đúng 7 ngày, kể cả qua tháng', () => {
    expect(prevWeek('2026-07-06')).toBe('2026-06-29');
    expect(prevWeek('2026-01-05')).toBe('2025-12-29');
  });
});

describe('computeStreak — mirror quiz_current_streak', () => {
  const wk = '2026-07-20';
  const w = (n: number) => {
    let x = wk;
    for (let i = 0; i < n; i++) x = prevWeek(x);
    return x;
  };

  it('không hoạt động tuần nào → 0', () => {
    expect(computeStreak(new Set(), wk)).toBe(0);
  });

  it('tuần hiện tại chưa làm nhưng 3 tuần trước liên tiếp → chuỗi 3 (chưa gãy)', () => {
    expect(computeStreak(new Set([w(1), w(2), w(3)]), wk)).toBe(3);
  });

  it('tuần hiện tại đã làm + 2 tuần trước → chuỗi 3', () => {
    expect(computeStreak(new Set([wk, w(1), w(2)]), wk)).toBe(3);
  });

  it('gãy chuỗi khi có khoảng trống', () => {
    expect(computeStreak(new Set([wk, w(2), w(3)]), wk)).toBe(1);
  });

  it('tuần trống được freeze phủ → chuỗi liền mạch', () => {
    // w(1) là tuần freeze (được tính là active nhờ used_week_start)
    expect(computeStreak(new Set([wk, w(1), w(2)]), wk)).toBe(3);
  });

  it('bỏ 2 tuần trở lên → chuỗi tính lại từ đầu', () => {
    expect(computeStreak(new Set([w(3), w(4)]), wk)).toBe(0);
  });
});

describe('questionPoints — mirror quiz_answer_question', () => {
  const budget = 30_000;

  it('sai hoặc hết giờ → 0 điểm', () => {
    expect(questionPoints(false, budget, 1_000)).toBe(0);
  });

  it('đúng tức thì → 150 điểm (100 + bonus tối đa 50)', () => {
    expect(questionPoints(true, budget, 0)).toBe(150);
  });

  it('đúng ở nửa thời gian → 125 điểm', () => {
    expect(questionPoints(true, budget, 15_000)).toBe(125);
  });

  it('đúng sát giờ → 100 điểm, bonus không âm', () => {
    expect(questionPoints(true, budget, 30_000)).toBe(100);
    expect(questionPoints(true, budget, 45_000)).toBe(100);
  });

  it('maxScore = 150 × số câu', () => {
    expect(maxScore(10)).toBe(1500);
  });
});

describe('format helpers', () => {
  it('formatDurationMs', () => {
    expect(formatDurationMs(45_000)).toBe('45s');
    expect(formatDurationMs(83_000)).toBe('1p23');
    expect(formatDurationMs(125_400)).toBe('2p05');
  });

  it('formatWeekLabel', () => {
    expect(formatWeekLabel('2026-07-20')).toBe('Tuần 20/07');
  });
});

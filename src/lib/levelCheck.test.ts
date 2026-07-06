import { describe, it, expect } from 'vitest';
import {
  evaluateLevel,
  pickStartLevel,
  decideNext,
  buildWizardSummary,
  type LevelCriterion,
  type AnswerValue,
} from './levelCheck';

const crit = (id: string, level: number, opts: Partial<LevelCriterion> = {}): LevelCriterion => ({
  id,
  skill_id: 's1',
  level_no: level,
  statement: `Tiêu chí ${id}`,
  is_gate: false,
  requires_evidence: false,
  weight: 1,
  sort_order: 0,
  ...opts,
});

const answers = (entries: [string, AnswerValue][]) => new Map<string, AnswerValue>(entries);

describe('evaluateLevel', () => {
  it('đạt khi điểm >= 80% và đủ gate', () => {
    const cs = [crit('a', 2, { is_gate: true }), crit('b', 2), crit('c', 2), crit('d', 2), crit('e', 2)];
    // 4/5 = 80%, gate 'a' đạt
    const r = evaluateLevel(cs, answers([['a', 1], ['b', 1], ['c', 1], ['d', 1], ['e', 0]]));
    expect(r.passed).toBe(true);
    expect(r.score).toBeCloseTo(0.8);
  });

  it('KHÔNG đạt khi đủ điểm nhưng thiếu gate', () => {
    const cs = [crit('a', 2, { is_gate: true }), crit('b', 2), crit('c', 2)];
    // b,c đạt + a một phần → điểm 2.5/3 ≈ 83% nhưng gate chỉ "một phần"
    const r = evaluateLevel(cs, answers([['a', 0.5], ['b', 1], ['c', 1]]));
    expect(r.score).toBeGreaterThan(0.8);
    expect(r.gatesMet).toBe(false);
    expect(r.passed).toBe(false);
  });

  it('KHÔNG đạt khi đủ gate nhưng dưới 80%', () => {
    const cs = [crit('a', 1, { is_gate: true }), crit('b', 1), crit('c', 1), crit('d', 1)];
    const r = evaluateLevel(cs, answers([['a', 1], ['b', 0.5], ['c', 0.5], ['d', 0]]));
    expect(r.gatesMet).toBe(true);
    expect(r.passed).toBe(false);
  });

  it('câu chưa trả lời tính 0 điểm; trọng số được tôn trọng', () => {
    const cs = [crit('a', 3, { weight: 3 }), crit('b', 3, { weight: 1 })];
    const r = evaluateLevel(cs, answers([['a', 1]])); // 3/4 = 75%
    expect(r.score).toBeCloseTo(0.75);
    expect(r.passed).toBe(false);
  });

  it('level không có tiêu chí thì không thể đạt', () => {
    const r = evaluateLevel([], answers([]));
    expect(r.passed).toBe(false);
  });
});

describe('pickStartLevel', () => {
  it('bắt đầu tại level hiện tại nếu có tiêu chí', () => {
    expect(pickStartLevel([1, 2, 3, 4], 2)).toBe(2);
  });
  it('lùi về level gần nhất phía dưới nếu level hiện tại trống tiêu chí', () => {
    expect(pickStartLevel([1, 3, 4], 2)).toBe(1);
  });
  it('cán bộ L0 bắt đầu từ level thấp nhất có tiêu chí', () => {
    expect(pickStartLevel([2, 3], 0)).toBe(2);
    expect(pickStartLevel([1, 2, 3, 4], 0)).toBe(1);
  });
});

describe('decideNext — luồng thích ứng', () => {
  it('đạt liên tiếp thì leo dần và chốt ở đỉnh', () => {
    const levels = [1, 2, 3, 4];
    const results = new Map<number, boolean>([[2, true]]);
    expect(decideNext(levels, results, 2)).toEqual({ type: 'ask', level: 3 });
    results.set(3, true);
    expect(decideNext(levels, results, 3)).toEqual({ type: 'ask', level: 4 });
    results.set(4, true);
    expect(decideNext(levels, results, 4)).toEqual({ type: 'done', suggested: 4 });
  });

  it('trượt level đầu tiên thì dò xuống xác nhận sàn', () => {
    const levels = [1, 2, 3, 4];
    const results = new Map<number, boolean>([[3, false]]);
    expect(decideNext(levels, results, 3)).toEqual({ type: 'ask', level: 2 });
    results.set(2, true);
    expect(decideNext(levels, results, 2)).toEqual({ type: 'done', suggested: 2 });
  });

  it('đang leo mà trượt thì chốt tại level đã đạt trước đó', () => {
    const levels = [1, 2, 3, 4];
    const results = new Map<number, boolean>([[2, true], [3, false]]);
    expect(decideNext(levels, results, 3)).toEqual({ type: 'done', suggested: 2 });
  });

  it('trượt tất cả thì đề xuất L0', () => {
    const levels = [1, 2];
    const results = new Map<number, boolean>([[1, false]]);
    expect(decideNext(levels, results, 1)).toEqual({ type: 'done', suggested: 0 });
  });
});

describe('buildWizardSummary', () => {
  it('ghi rõ đề xuất, điểm từng level và thiếu gate', () => {
    const s = buildWizardSummary(
      [
        { levelNo: 2, score: 0.85, gatesMet: true, passed: true, metCount: 4, total: 5 },
        { levelNo: 3, score: 0.9, gatesMet: false, passed: false, metCount: 3, total: 4 },
      ],
      2,
    );
    expect(s).toContain('Đề xuất L2');
    expect(s).toContain('L2: 85% ✓');
    expect(s).toContain('L3: 90% (thiếu gate) ✗');
  });
});

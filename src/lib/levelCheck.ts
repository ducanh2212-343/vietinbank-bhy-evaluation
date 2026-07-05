/**
 * Logic chấm level theo bộ tiêu chí (BARS + thang tích luỹ Guttman).
 * Quy tắc chốt (in trên UI wizard):
 *   Một level ĐẠT khi: điểm ≥ 80% VÀ mọi tiêu chí gate đều "Đạt".
 *   Level đề xuất = level cao nhất đã đạt trong các level được hỏi.
 * Thuần hàm — không phụ thuộc React/Supabase để test được bằng vitest.
 */

export interface LevelCriterion {
  id: string;
  skill_id: string;
  level_no: number;
  statement: string;
  is_gate: boolean;
  requires_evidence: boolean;
  weight: number;
  sort_order: number;
}

/** 1 = Đạt · 0.5 = Một phần · 0 = Chưa */
export type AnswerValue = 0 | 0.5 | 1;

export const PASS_THRESHOLD = 0.8;

export interface LevelEvalResult {
  levelNo: number;
  /** Điểm 0..1 theo trọng số (câu chưa trả lời tính 0) */
  score: number;
  gatesMet: boolean;
  passed: boolean;
  metCount: number;
  total: number;
}

export function evaluateLevel(
  criteria: LevelCriterion[],
  answers: Map<string, AnswerValue>,
): LevelEvalResult {
  const levelNo = criteria[0]?.level_no ?? 0;
  const totalWeight = criteria.reduce((s, c) => s + (c.weight || 1), 0);
  const earned = criteria.reduce((s, c) => s + (answers.get(c.id) ?? 0) * (c.weight || 1), 0);
  const score = totalWeight > 0 ? earned / totalWeight : 0;
  const gatesMet = criteria.filter((c) => c.is_gate).every((c) => answers.get(c.id) === 1);
  return {
    levelNo,
    score,
    gatesMet,
    passed: criteria.length > 0 && gatesMet && score >= PASS_THRESHOLD - 1e-9,
    metCount: criteria.filter((c) => answers.get(c.id) === 1).length,
    total: criteria.length,
  };
}

/**
 * Level bắt đầu hỏi: level hiện tại của cán bộ nếu có tiêu chí;
 * không thì level gần nhất phía dưới; thấp nhất có tiêu chí nếu chưa có level.
 */
export function pickStartLevel(levelsWithCriteria: number[], currentLevel: number): number {
  const levels = [...levelsWithCriteria].sort((a, b) => a - b);
  if (levels.length === 0) return 0;
  const atOrBelow = levels.filter((l) => l <= Math.max(currentLevel, 1));
  return atOrBelow.length > 0 ? atOrBelow[atOrBelow.length - 1] : levels[0];
}

export type WizardStep = { type: 'ask'; level: number } | { type: 'done'; suggested: number };

/**
 * Điều hướng thích ứng sau khi chấm xong level `current`:
 * - Đạt → hỏi level cao hơn kế tiếp chưa hỏi (nếu còn), hết thì chốt.
 * - Chưa đạt khi CHƯA đạt level nào → dò xuống level thấp hơn kế tiếp (xác nhận sàn).
 * - Chưa đạt khi đã có level đạt → chốt tại level cao nhất đã đạt.
 */
export function decideNext(
  levelsWithCriteria: number[],
  results: Map<number, boolean>,
  current: number,
): WizardStep {
  const levels = [...levelsWithCriteria].sort((a, b) => a - b);
  const idx = levels.indexOf(current);
  const passed = results.get(current) === true;

  if (passed) {
    for (let i = idx + 1; i < levels.length; i++) {
      // Trần đã xác lập ở level trượt phía trên — thang tích luỹ không cho leo qua
      if (results.get(levels[i]) === false) break;
      if (!results.has(levels[i])) return { type: 'ask', level: levels[i] };
    }
    return { type: 'done', suggested: highestPassed(levels, results) };
  }

  const anyPassed = [...results.values()].some(Boolean);
  if (!anyPassed) {
    for (let i = idx - 1; i >= 0; i--) {
      if (!results.has(levels[i])) return { type: 'ask', level: levels[i] };
    }
  }
  return { type: 'done', suggested: highestPassed(levels, results) };
}

function highestPassed(levels: number[], results: Map<number, boolean>): number {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (results.get(levels[i]) === true) return levels[i];
  }
  return 0;
}

/** Dòng tóm tắt ghi vào ô Minh chứng để quản lý thấy căn cứ của level tự đánh giá. */
export function buildWizardSummary(results: LevelEvalResult[], suggested: number): string {
  const parts = [...results]
    .sort((a, b) => a.levelNo - b.levelNo)
    .map((r) => `L${r.levelNo}: ${Math.round(r.score * 100)}%${r.gatesMet ? '' : ' (thiếu gate)'} ${r.passed ? '✓' : '✗'}`);
  return `[Bộ tiêu chí] Đề xuất L${suggested} — ${parts.join(' · ')}`;
}

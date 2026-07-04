/** Helper thuần túy cho kỳ đánh giá theo quý (không phụ thuộc Supabase client). */

export interface QuarterCycleOption {
  id: string;
  name: string;
}

export const QUARTER_CYCLE_NAME_REGEX = /^Quý (I|II|III|IV)\/(\d{4})$/;

const ROMAN_ORDER: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

/** Sortable numeric key for a quarter cycle name, e.g. "Quý III/2026" → 2026*10+3. */
export const quarterCycleOrder = (name: string): number => {
  const m = name.match(QUARTER_CYCLE_NAME_REGEX);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[2]) * 10 + (ROMAN_ORDER[m[1]] || 9);
};

export const filterQuarterCycles = <T extends QuarterCycleOption>(cycles: T[]): T[] =>
  cycles
    .filter((cycle) => QUARTER_CYCLE_NAME_REGEX.test(cycle.name))
    .sort((a, b) => quarterCycleOrder(a.name) - quarterCycleOrder(b.name));

/** Kỳ mặc định khi mở trang đánh giá: kỳ mới nhất (đã sắp theo quý tăng dần). */
export const pickDefaultCycle = <T extends QuarterCycleOption>(sortedCycles: T[]): T | undefined =>
  sortedCycles.length ? sortedCycles[sortedCycles.length - 1] : undefined;

/** Tên quý kế tiếp, ví dụ "Quý III/2026" → "Quý IV/2026", "Quý IV/2026" → "Quý I/2027". */
export function nextQuarterName(name: string): string | null {
  const m = name.match(QUARTER_CYCLE_NAME_REGEX);
  if (!m) return null;
  const order = ROMAN_ORDER[m[1]];
  const year = Number(m[2]);
  const ROMANS = ['I', 'II', 'III', 'IV'];
  return order === 4 ? `Quý I/${year + 1}` : `Quý ${ROMANS[order]}/${year}`;
}

/** Khoảng ngày (YYYY-MM-DD) của một quý, ví dụ "Quý III/2026" → 2026-07-01 → 2026-09-30. */
export function quarterDateRange(name: string): { start: string; end: string } | null {
  const m = name.match(QUARTER_CYCLE_NAME_REGEX);
  if (!m) return null;
  const q = ROMAN_ORDER[m[1]];
  const year = Number(m[2]);
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = q * 3;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${year}-${pad(startMonth)}-01`,
    end: `${year}-${pad(endMonth)}-${pad(lastDay)}`,
  };
}

import { describe, expect, it } from 'vitest';
import {
  buildEmployeeSkillLevels,
  computeCareerFit,
  computeSkillHolders,
  effectiveLevel,
  riskTier,
} from './skillInsights';

const row = (over: Partial<Parameters<typeof effectiveLevel>[0]> = {}) => ({
  self_assessed_level: null as number | null,
  manager_assessed_level: null as number | null,
  self_l0: false,
  manager_l0: false,
  ...over,
});

describe('effectiveLevel', () => {
  it('ưu tiên đánh giá của lãnh đạo trước tự đánh giá', () => {
    expect(effectiveLevel(row({ self_assessed_level: 3, manager_assessed_level: 2 }))).toBe(2);
  });
  it('cờ manager_l0 thắng mọi giá trị khác', () => {
    expect(effectiveLevel(row({ manager_l0: true, self_assessed_level: 4 }))).toBe(0);
  });
  it('rơi về tự đánh giá khi lãnh đạo chưa chấm', () => {
    expect(effectiveLevel(row({ self_assessed_level: 3 }))).toBe(3);
    expect(effectiveLevel(row({ self_l0: true }))).toBe(0);
    expect(effectiveLevel(row())).toBeNull();
  });
});

describe('buildEmployeeSkillLevels', () => {
  it('gom mức theo cán bộ qua form, bỏ qua form không trong map', () => {
    const formToEmp = new Map([['f1', 'e1'], ['f2', 'e2']]);
    const levels = buildEmployeeSkillLevels(formToEmp, [
      { form_id: 'f1', skill_id: 's1', ...row({ manager_assessed_level: 3 }) },
      { form_id: 'f1', skill_id: 's2', ...row({ self_assessed_level: 1 }) },
      { form_id: 'f2', skill_id: 's1', ...row({ self_assessed_level: 2 }) },
      { form_id: 'f-cu', skill_id: 's1', ...row({ self_assessed_level: 4 }) },
      { form_id: 'f1', skill_id: 's3', ...row() }, // chưa chấm → bỏ
    ]);
    expect(levels.get('e1')?.get('s1')).toBe(3);
    expect(levels.get('e1')?.get('s2')).toBe(1);
    expect(levels.get('e1')?.has('s3')).toBe(false);
    expect(levels.get('e2')?.get('s1')).toBe(2);
  });
});

describe('computeSkillHolders', () => {
  it('chỉ tính người đạt ngưỡng, xếp mức cao trước', () => {
    const levels = new Map([
      ['e1', new Map([['s1', 3], ['s2', 2]])],
      ['e2', new Map([['s1', 4]])],
      ['e3', new Map([['s1', 1]])],
    ]);
    const holders = computeSkillHolders(levels, 3);
    expect(holders.get('s1')?.map((h) => h.profileId)).toEqual(['e2', 'e1']);
    expect(holders.has('s2')).toBe(false);
  });
});

describe('riskTier', () => {
  it('phân bậc theo số chuyên gia', () => {
    expect(riskTier(0)).toBe('trong');
    expect(riskTier(1)).toBe('nguy_cap');
    expect(riskTier(2)).toBe('mong_manh');
    expect(riskTier(3)).toBe('an_toan');
  });
});

describe('computeCareerFit', () => {
  const reqs = [
    { skill_id: 's1', minimum_level: 2 },
    { skill_id: 's2', minimum_level: 3 },
    { skill_id: 's3', minimum_level: 0 }, // không yêu cầu → bỏ qua
  ];
  it('tính % đáp ứng và danh sách thiếu, gap lớn xếp trước', () => {
    const fit = computeCareerFit(new Map([['s1', 2]]), reqs);
    // s1: 2/2 = 1; s2: 0/3 = 0 → 50%
    expect(fit.pct).toBe(50);
    expect(fit.met).toBe(1);
    expect(fit.total).toBe(2);
    expect(fit.missing).toEqual([{ skill_id: 's2', current: 0, required: 3, gap: 3 }]);
  });
  it('đủ toàn bộ → 100%, không thiếu gì', () => {
    const fit = computeCareerFit(new Map([['s1', 3], ['s2', 4]]), reqs);
    expect(fit.pct).toBe(100);
    expect(fit.missing).toHaveLength(0);
  });
  it('không có yêu cầu hoặc thiếu dữ liệu cán bộ vẫn an toàn', () => {
    expect(computeCareerFit(undefined, reqs).pct).toBe(0);
    expect(computeCareerFit(new Map(), []).total).toBe(0);
  });
});

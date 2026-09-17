import { describe, it, expect } from 'vitest';
import { mergeTransferItems, countPlanActions, PLAN_LIMITS } from './planTransfer';

let n = 0;
const makeId = () => `tmp-${++n}`;

const base = () => ({
  skillPriorities: [] as any[], skillActions: [] as any[],
  attitudePriorities: [] as any[], attitudeActions: [] as any[], aiActions: [] as any[],
  previousCycleName: 'Quý II/2026',
  allSkills: [{ id: 'sk1', name: 'Skill 1', code: 'SK01', skill_group: 'G' }],
  makeId,
});

const skillItem = (i: number) => ({
  type: 'skill' as const, skill_id: 'sk1',
  action_text: `Hành động ${i}`, expected_result: '',
});
const aiItem = (i: number) => ({ type: 'ai' as const, action_text: `AI ${i}`, expected_result: '' });
const attItem = (i: number) => ({
  type: 'attitude' as const, attitude_dim_id: 1, attitude_name: 'Chủ động',
  action_text: `Thái độ ${i}`, expected_result: '',
});

describe('mergeTransferItems — giới hạn 3 upskill / 3 AI / thái độ không giới hạn', () => {
  it('cắt hành động upskill vượt 3, báo lại phần bị bỏ', () => {
    const r = mergeTransferItems({ ...base(), items: [1, 2, 3, 4, 5].map(skillItem) });
    expect(r.added.skill).toBe(3);
    expect(r.skippedOverLimit.length).toBe(2);
    expect(r.skillActions.length).toBe(3);
  });

  it('hành động upskill đã có sẵn chiếm quota', () => {
    const sp = { id: 'p1', skill_id: 'sk1' };
    const existing = [{ skill_priority_id: 'p1', action_text: 'Đang có', row_no: 1 }];
    const r = mergeTransferItems({
      ...base(), skillPriorities: [sp], skillActions: existing,
      items: [1, 2, 3].map(skillItem),
    });
    expect(r.added.skill).toBe(2);
    expect(r.skippedOverLimit.length).toBe(1);
  });

  it('AI vượt 3 bị cắt; thái độ không giới hạn', () => {
    const r = mergeTransferItems({
      ...base(),
      items: [...[1, 2, 3, 4].map(aiItem), ...[1, 2, 3, 4, 5, 6].map(attItem)],
    });
    expect(r.added.ai).toBe(PLAN_LIMITS.AI_ACTIONS);
    expect(r.added.attitude).toBe(6);
    expect(r.skippedOverLimit.length).toBe(1);
  });

  it('trùng nội dung → dedup, không tốn quota', () => {
    const r1 = mergeTransferItems({ ...base(), items: [skillItem(1), skillItem(1), aiItem(1), aiItem(1)] });
    expect(r1.added.skill).toBe(1);
    expect(r1.added.ai).toBe(1);
    expect(r1.skippedDuplicate).toBe(2);
  });

  it('không tạo quá 3 skill ưu tiên khi chuyển sang skill mới', () => {
    const pris = [1, 2, 3].map((i) => ({ id: `p${i}`, skill_id: `khac${i}` }));
    const r = mergeTransferItems({ ...base(), skillPriorities: pris, items: [skillItem(1)] });
    expect(r.skillPriorities.length).toBe(3);
    expect(r.skippedOverLimit.length).toBe(1);
  });

  it('countPlanActions chỉ đếm dòng có nội dung', () => {
    const c = countPlanActions(
      [{ action_text: 'x' }, { action_text: '  ' }],
      [{ ai_action_text: 'y' }, { ai_action_text: '' }],
    );
    expect(c).toEqual({ skill: 1, ai: 1 });
  });
});

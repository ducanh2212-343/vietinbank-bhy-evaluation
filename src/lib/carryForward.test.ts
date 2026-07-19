import { describe, it, expect, vi } from 'vitest';

// carryForward import evaluationPersistence → supabase client (cần env) — test chỉ dùng hàm thuần
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { computeSkillCarryForward, hasAnySelfAssessmentData, prevRowLevels, type PrevBundle } from './carryForward';
import type { CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';

const mkAssessment = (over: Partial<CoreSkillAssessment>): CoreSkillAssessment => ({
  skill_id: 's1',
  skill_name: 'Skill 1',
  skill_code: 'SK01',
  skill_group: 'G',
  minimum_level: 2,
  advanced_level: 3,
  self_assessed_level: null,
  manager_assessed_level: null,
  evidence: '',
  employee_comment: '',
  manager_note: '',
  ...over,
});

const mkBundle = (over: Partial<PrevBundle>): PrevBundle => ({
  prevFormId: 'prev-form',
  prevFormStatus: 'approved',
  prevSkillRows: [],
  prevSkillPriorities: [],
  prevSkillActions: [],
  reviewRows: [],
  ...over,
});

const CATALOG = [
  { id: 's1', name: 'Skill 1', code: 'SK01', skill_group: 'G' },
  { id: 's2', name: 'Skill 2', code: 'SK02', skill_group: 'G' },
  { id: 's9', name: 'Skill 9', code: 'SK09', skill_group: 'G' },
];

describe('prevRowLevels', () => {
  it('dịch cờ L0 về số 0', () => {
    expect(prevRowLevels({ self_l0: true, self_assessed_level: null, manager_l0: true, manager_assessed_level: null }))
      .toEqual({ self: 0, mgr: 0 });
  });
  it('null khi chưa chấm', () => {
    expect(prevRowLevels({ self_assessed_level: null, manager_assessed_level: null }))
      .toEqual({ self: null, mgr: null });
  });
  it('fallback current_level cho self', () => {
    expect(prevRowLevels({ self_assessed_level: null, current_level: 2, manager_assessed_level: 3 }))
      .toEqual({ self: 2, mgr: 3 });
  });
});

describe('hasAnySelfAssessmentData', () => {
  it('false khi rỗng/null', () => {
    expect(hasAnySelfAssessmentData(null)).toBe(false);
    expect(hasAnySelfAssessmentData([])).toBe(false);
    expect(hasAnySelfAssessmentData([{ self_assessed_level: null, evidence: '' }])).toBe(false);
  });
  it('bắt được hàng toàn L0 (cờ self_l0 — lỗi bản gốc BMFormPage bỏ sót)', () => {
    expect(hasAnySelfAssessmentData([{ self_assessed_level: null, self_l0: true }])).toBe(true);
    expect(hasAnySelfAssessmentData([{ manager_assessed_level: null, manager_l0: true }])).toBe(true);
  });
  it('bắt được level và evidence', () => {
    expect(hasAnySelfAssessmentData([{ self_assessed_level: 2 }])).toBe(true);
    expect(hasAnySelfAssessmentData([{ evidence: ' x ' }])).toBe(true);
  });
});

describe('computeSkillCarryForward', () => {
  it('điền ô trống bằng mức kỳ trước, ưu tiên mức quản lý duyệt', () => {
    const r = computeSkillCarryForward({
      baseCore: [mkAssessment({ skill_id: 's1' })],
      baseSupp: [],
      bundle: mkBundle({
        prevSkillRows: [{ skill_id: 's1', self_assessed_level: 2, manager_assessed_level: 3, evidence: 'bằng chứng cũ' }],
      }),
      skillCatalog: CATALOG,
    });
    expect(r.core[0].self_assessed_level).toBe(3); // ưu tiên manager
    expect(r.prefilledSkillIds.has('s1')).toBe(true);
    expect(r.prevInfo.get('s1')).toMatchObject({ level: 3, source: 'manager', approved: true, evidence: 'bằng chứng cũ' });
  });

  it('KHÔNG đè giá trị đã có (kể cả 0)', () => {
    const r = computeSkillCarryForward({
      baseCore: [mkAssessment({ skill_id: 's1', self_assessed_level: 0 })],
      baseSupp: [],
      bundle: mkBundle({
        prevSkillRows: [{ skill_id: 's1', self_assessed_level: 2, manager_assessed_level: 3 }],
      }),
      skillCatalog: CATALOG,
    });
    expect(r.core[0].self_assessed_level).toBe(0);
    expect(r.prefilledSkillIds.has('s1')).toBe(false);
  });

  it('L0 kỳ trước (cờ) prefill thành 0', () => {
    const r = computeSkillCarryForward({
      baseCore: [mkAssessment({ skill_id: 's1' })],
      baseSupp: [],
      bundle: mkBundle({
        prevSkillRows: [{ skill_id: 's1', self_l0: true, self_assessed_level: null, manager_assessed_level: null }],
      }),
      skillCatalog: CATALOG,
    });
    expect(r.core[0].self_assessed_level).toBe(0);
    expect(r.prefilledSkillIds.has('s1')).toBe(true);
  });

  it('bump lên target_level khi MỌI hành động của skill được xác nhận hoàn thành (ưu tiên CBQL)', () => {
    const r = computeSkillCarryForward({
      baseCore: [mkAssessment({ skill_id: 's1' })],
      baseSupp: [],
      bundle: mkBundle({
        prevSkillRows: [{ skill_id: 's1', self_assessed_level: 2, manager_assessed_level: 2 }],
        prevSkillPriorities: [{ id: 'sp1', skill_id: 's1', target_level: 3 }],
        prevSkillActions: [
          { id: 'a1', skill_priority_id: 'sp1', status: 'in_progress' }, // CB chưa xong…
          { id: 'a2', skill_priority_id: 'sp1', status: 'completed' },
        ],
        reviewRows: [
          { source_action_type: 'skill', source_action_id: 'a1', status: 'completed' }, // …nhưng CBQL xác nhận xong
        ],
      }),
      skillCatalog: CATALOG,
    });
    expect(r.core[0].self_assessed_level).toBe(3);
    expect(r.levelUps).toEqual([{ skill_id: 's1', skill_name: 'Skill 1', new_level: 3 }]);
  });

  it('KHÔNG bump khi còn hành động dở dang', () => {
    const r = computeSkillCarryForward({
      baseCore: [mkAssessment({ skill_id: 's1' })],
      baseSupp: [],
      bundle: mkBundle({
        prevSkillRows: [{ skill_id: 's1', self_assessed_level: 2, manager_assessed_level: null }],
        prevSkillPriorities: [{ id: 'sp1', skill_id: 's1', target_level: 3 }],
        prevSkillActions: [{ id: 'a1', skill_priority_id: 'sp1', status: 'in_progress' }],
      }),
      skillCatalog: CATALOG,
    });
    expect(r.core[0].self_assessed_level).toBe(2); // chỉ kế thừa, không bump
    expect(r.levelUps).toHaveLength(0);
  });

  it('thêm lại skill bổ trợ kỳ trước chưa có trong kỳ này', () => {
    const r = computeSkillCarryForward({
      baseCore: [mkAssessment({ skill_id: 's1', self_assessed_level: 1 })],
      baseSupp: [],
      bundle: mkBundle({
        prevSkillRows: [
          { skill_id: 's1', self_assessed_level: 1 },
          { skill_id: 's9', is_core: false, self_assessed_level: 2, manager_assessed_level: null },
        ],
      }),
      skillCatalog: CATALOG,
    });
    expect(r.supplementary).toHaveLength(1);
    expect(r.supplementary[0]).toMatchObject({ skill_id: 's9', self_assessed_level: 2 });
    expect(r.prefilledSkillIds.has('s9')).toBe(true);
  });

  it('phiếu kỳ trước chưa duyệt → prevInfo.approved=false, vẫn kế thừa self', () => {
    const r = computeSkillCarryForward({
      baseCore: [mkAssessment({ skill_id: 's1' })],
      baseSupp: [],
      bundle: mkBundle({
        prevFormStatus: 'submitted',
        prevSkillRows: [{ skill_id: 's1', self_assessed_level: 2, manager_assessed_level: null }],
      }),
      skillCatalog: CATALOG,
    });
    expect(r.core[0].self_assessed_level).toBe(2);
    expect(r.prevInfo.get('s1')).toMatchObject({ level: 2, source: 'self', approved: false });
  });
});

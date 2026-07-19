// KỊCH BẢN 2 (chặn nộp L3+ thiếu minh chứng) + KỊCH BẢN 3 (gate TP chống hình thức)
import { describe, it, expect } from 'vitest';
import { validateSubmissionDetailed, validateManagerReview, skillMismatchNeedsNote } from './evaluationValidation';
import type { CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';
import type { AttitudeAssessment } from '@/components/evaluation/EvalSectionC';
import { ATTITUDE_DIMENSIONS } from '@/components/bm/AttitudeConstants';

const mkSkill = (over: Partial<CoreSkillAssessment>): CoreSkillAssessment => ({
  skill_id: 's1',
  skill_name: 'Skill 1',
  skill_code: 'SK01',
  skill_group: 'G',
  minimum_level: 2,
  advanced_level: 3,
  self_assessed_level: 2,
  manager_assessed_level: null,
  evidence: '',
  employee_comment: '',
  manager_note: '',
  ...over,
});

const mkAttitude = (dimId: number, over: Partial<AttitudeAssessment> = {}): AttitudeAssessment =>
  ({
    attitude_dimension_id: dimId,
    attitude_name: `Nhóm ${dimId}`,
    self_status: 'dat_mong_doi',
    manager_status: 'dat_mong_doi',
    evidence_text: '',
    improvement_required: false,
    improvement_focus: [],
    improvement_focus_other: '',
    improvement_action: '',
    improvement_deadline: '',
    expected_evidence: '',
    support_needed: '',
    improvement_status: 'not_started',
    progress_note: '',
    current_status: '',
    issue_summary: '',
    desired_status: '',
    evidence: '',
    improvement_goal: '',
    employee_comment: '',
    manager_comment: '',
    ...over,
  }) as AttitudeAssessment;

const fullAttitudes = (over: Partial<AttitudeAssessment> = {}) =>
  ATTITUDE_DIMENSIONS.map((d) => mkAttitude(d.id, over));

describe('KB2 — validateSubmissionDetailed: L3+ thiếu minh chứng chặn nộp và CÓ danh sách hiển thị', () => {
  it('tự chấm L3 không minh chứng → canSubmit=false + skill nằm trong highLevelEvidenceMissing', () => {
    const d = validateSubmissionDetailed({
      coreAssessments: [mkSkill({ self_assessed_level: 3, evidence: '' })],
      attitudeAssessments: fullAttitudes(),
      skillPriorities: [],
      skillActions: [],
    });
    expect(d.canSubmit).toBe(false);
    expect(d.highLevelEvidenceMissing.map((s) => s.skill_id)).toEqual(['s1']);
  });

  it('bổ sung minh chứng → hết chặn', () => {
    const d = validateSubmissionDetailed({
      coreAssessments: [mkSkill({ self_assessed_level: 3, evidence: 'Hồ sơ ABC đã xử lý' })],
      attitudeAssessments: fullAttitudes(),
      skillPriorities: [],
      skillActions: [],
    });
    expect(d.highLevelEvidenceMissing).toHaveLength(0);
    expect(d.canSubmit).toBe(true);
  });

  it('skill bổ trợ L3+ cũng chịu luật minh chứng', () => {
    const d = validateSubmissionDetailed({
      coreAssessments: [mkSkill({})],
      supplementaryAssessments: [mkSkill({ skill_id: 's9', skill_name: 'Skill 9', self_assessed_level: 4 })],
      attitudeAssessments: fullAttitudes(),
      skillPriorities: [],
      skillActions: [],
    });
    expect(d.highLevelEvidenceMissing.map((s) => s.skill_id)).toEqual(['s9']);
  });
});

describe('KB3 — validateManagerReview: gate TP + luật chống hình thức', () => {
  const base = {
    attitudeAssessments: fullAttitudes(),
    overallFilled: true,
  };

  it('đủ điều kiện → không còn thiếu gì', () => {
    const missing = validateManagerReview({
      ...base,
      coreAssessments: [mkSkill({ manager_assessed_level: 2 })],
    });
    expect(missing).toEqual([]);
  });

  it('còn skill chưa chấm → chặn', () => {
    const missing = validateManagerReview({
      ...base,
      coreAssessments: [mkSkill({ manager_assessed_level: null })],
    });
    expect(missing.some((m) => m.includes('skill lõi chưa được'))).toBe(true);
  });

  it('CHỐNG HÌNH THỨC: chấm lệch với cán bộ mà không ghi nhận xét → chặn xác nhận rà soát', () => {
    const missing = validateManagerReview({
      ...base,
      coreAssessments: [mkSkill({ self_assessed_level: 3, manager_assessed_level: 2, manager_note: '' })],
    });
    expect(missing.some((m) => m.includes('chấm lệch') && m.includes('Skill 1'))).toBe(true);
  });

  it('chấm lệch NHƯNG có nhận xét trao đổi → qua', () => {
    const missing = validateManagerReview({
      ...base,
      coreAssessments: [
        mkSkill({
          self_assessed_level: 3,
          manager_assessed_level: 2,
          manager_note: 'Minh chứng mới đạt mức độc lập; cần thêm 2 hồ sơ tự xử lý để lên L3 — trao đổi 1-1 ngày 20/7.',
        }),
      ],
    });
    expect(missing).toEqual([]);
  });

  it('đồng thuận (manager = self) → không đòi nhận xét', () => {
    expect(skillMismatchNeedsNote(mkSkill({ self_assessed_level: 2, manager_assessed_level: 2 }))).toBe(false);
    expect(skillMismatchNeedsNote(mkSkill({ self_assessed_level: 3, manager_assessed_level: 2 }))).toBe(true);
    expect(
      skillMismatchNeedsNote(mkSkill({ self_assessed_level: 3, manager_assessed_level: 2, manager_note: 'lý do' })),
    ).toBe(false);
  });

  it('skill bổ trợ chấm lệch cũng phải có nhận xét', () => {
    const missing = validateManagerReview({
      ...base,
      coreAssessments: [mkSkill({ manager_assessed_level: 2 })],
      supplementaryAssessments: [
        mkSkill({ skill_id: 's9', skill_name: 'Skill 9', self_assessed_level: 2, manager_assessed_level: 1 }),
      ],
    });
    expect(missing.some((m) => m.includes('Skill 9'))).toBe(true);
  });

  it('thiếu nhận xét tổng thể → chặn', () => {
    const missing = validateManagerReview({
      ...base,
      overallFilled: false,
      coreAssessments: [mkSkill({ manager_assessed_level: 2 })],
    });
    expect(missing.some((m) => m.includes('nhận xét/kết luận'))).toBe(true);
  });
});

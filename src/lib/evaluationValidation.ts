import type { CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';
import type { AttitudeAssessment } from '@/components/evaluation/EvalSectionC';
import type { SkillPriority } from '@/components/bm/SkillPriorityPicker';
import type { SkillAction } from '@/components/bm/SkillActionsBlock';
import { ATTITUDE_DIMENSIONS } from '@/components/bm/AttitudeConstants';

export interface SubmitValidationInput {
  coreAssessments: CoreSkillAssessment[];
  attitudeAssessments: AttitudeAssessment[];
  skillPriorities: SkillPriority[];
  skillActions: SkillAction[];
}

/**
 * Quy tắc chặn nộp (đã cập nhật cho mục C/E mới + IDP quét theo skill lõi):
 *  1. Tất cả skill lõi phải có self_assessed_level.
 *  2. Cả 6 nhóm thái độ phải có self_status (3 mức mới) và evidence_text.
 *  3. Mỗi skill lõi có self_assessed_level < minimum_level (còn GAP so với chuẩn vị trí)
 *     phải có ≥1 hành động phát triển trong mục D (skillPriorities + skillActions).
 *  4. Mỗi nhóm thái độ có kế hoạch cải thiện (self/manager = "Cần cải thiện" HOẶC
 *     improvement_required) phải có: focus ≥1 item (hoặc 'other' + text), action không rỗng, deadline.
 */
export function validateSubmission(input: SubmitValidationInput): string[] {
  const d = validateSubmissionDetailed(input);
  return d.errors;
}

function hasPlan(a: AttitudeAssessment): boolean {
  return !!(
    a.self_status === 'can_cai_thien' ||
    a.manager_status === 'can_cai_thien' ||
    a.improvement_required
  );
}

function planComplete(a: AttitudeAssessment): boolean {
  const focus = a.improvement_focus || [];
  const focusOk = focus.length > 0 && (!focus.includes('other') || (a.improvement_focus_other || '').trim().length > 0);
  return focusOk && !!(a.improvement_action || '').trim() && !!a.improvement_deadline;
}

export type GappedSkillMissingField = 'action_type' | 'action_text' | 'deadline' | 'expected_result';
export interface GappedSkillIssue {
  skill_id: string;
  skill_name: string;
  reason: 'no_priority' | 'no_action' | 'invalid_action';
  missing_fields: GappedSkillMissingField[];
}

export interface DetailedValidation {
  canSubmit: boolean;
  errors: string[];
  coreTotal: number;
  coreMissing: CoreSkillAssessment[];
  attitudeTotal: number;
  attitudeMissing: { id: number; name: string; reason: 'rating' | 'evidence' | 'both' }[];
  gappedTotal: number;
  gappedSkillsWithoutAction: CoreSkillAssessment[];
  gappedSkillIssues: GappedSkillIssue[];
  needsImprovementTotal: number;
  needsImprovementWithoutPlan: AttitudeAssessment[];
}

export function validateSubmissionDetailed(input: SubmitValidationInput): DetailedValidation {
  const { coreAssessments, attitudeAssessments, skillPriorities, skillActions } = input;
  const errors: string[] = [];

  // 1. Skill lõi chưa đánh giá
  const coreMissing = coreAssessments.filter(
    c => c.self_assessed_level === null || c.self_assessed_level === undefined,
  );
  if (coreMissing.length > 0) {
    errors.push(`Còn ${coreMissing.length} skill lõi chưa tự đánh giá: ${coreMissing.slice(0, 3).map(c => c.skill_name).join(', ')}${coreMissing.length > 3 ? '…' : ''}`);
  }

  // 2. Thái độ — đủ 6 nhóm có self_status + evidence_text
  type AttMissing = { id: number; name: string; reason: 'rating' | 'evidence' | 'both' };
  const attitudeMissing: AttMissing[] = [];
  for (const d of ATTITUDE_DIMENSIONS) {
    const a = attitudeAssessments.find(x => x.attitude_dimension_id === d.id);
    const noRating = !a?.self_status;
    const noEvidence = !(a?.evidence_text || '').trim();
    if (!noRating && !noEvidence) continue;
    const reason: AttMissing['reason'] = noRating && noEvidence ? 'both' : noRating ? 'rating' : 'evidence';
    attitudeMissing.push({ id: d.id, name: d.name, reason });
  }
  if (attitudeMissing.length > 0) {
    errors.push(`Còn ${attitudeMissing.length}/6 nhóm thái độ chưa hoàn tất (thiếu mức tự đánh giá hoặc minh chứng): ${attitudeMissing.map(d => d.name).join(', ')}`);
  }

  // 3. Skill lõi còn GAP — chỉ tính để hiển thị gợi ý, KHÔNG chặn nộp.
  //    Cán bộ tự chọn skill up kỳ này theo thực tiễn công việc.
  void skillPriorities; void skillActions;
  const gappedCoreSkills = coreAssessments.filter(c => {
    const lvl = c.self_assessed_level;
    if (lvl === null || lvl === undefined) return false;
    const min = c.minimum_level ?? 0;
    return lvl < min;
  });
  const gappedSkillsWithoutAction: CoreSkillAssessment[] = [];
  const gappedSkillIssues: GappedSkillIssue[] = [];



  // 4. Thái độ có kế hoạch cải thiện — phải đầy đủ focus + action + deadline
  const needsImprovement = attitudeAssessments.filter(hasPlan);
  const needsImprovementWithoutPlan = needsImprovement.filter(a => !planComplete(a));
  if (needsImprovementWithoutPlan.length > 0) {
    errors.push(`Còn ${needsImprovementWithoutPlan.length} nhóm thái độ có kế hoạch cải thiện nhưng chưa nhập đủ (điểm cần cải thiện / hành động / thời hạn): ${needsImprovementWithoutPlan.map(a => a.attitude_name).join(', ')}`);
  }

  return {
    canSubmit: errors.length === 0,
    errors,
    coreTotal: coreAssessments.length,
    coreMissing,
    attitudeTotal: ATTITUDE_DIMENSIONS.length,
    attitudeMissing,
    gappedTotal: gappedCoreSkills.length,
    gappedSkillIssues,
    gappedSkillsWithoutAction,
    needsImprovementTotal: needsImprovement.length,
    needsImprovementWithoutPlan,
  };
}

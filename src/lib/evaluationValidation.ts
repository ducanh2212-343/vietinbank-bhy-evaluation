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
  /** Skill bổ trợ (nếu có) — cùng chịu quy tắc minh chứng khi tự chấm level cao */
  supplementaryAssessments?: CoreSkillAssessment[];
}

/** Tự chấm từ level này trở lên phải kèm minh chứng cụ thể (evidence-based leveling) */
export const EVIDENCE_REQUIRED_LEVEL = 3;

/** Skill tự chấm L3+ nhưng chưa có minh chứng? */
export function skillNeedsEvidence(a: CoreSkillAssessment): boolean {
  return (a.self_assessed_level ?? 0) >= EVIDENCE_REQUIRED_LEVEL && !(a.evidence || '').trim();
}

/**
 * Quy tắc chặn nộp (mục C thái độ):
 *  1. Tất cả skill lõi phải có self_assessed_level.
 *  2. Cả 6 nhóm thái độ phải có self_status (Nổi bật / Đạt mong đợi / Cần cải thiện).
 *  3. Minh chứng (evidence_text) CHỈ bắt buộc khi:
 *     - self_status = 'noi_bat', HOẶC
 *     - self_status = 'can_cai_thien', HOẶC
 *     - improvement_required = true.
 *     Nhóm chọn "Đạt mong đợi" không bắt buộc minh chứng.
 *  4. Nhóm có kế hoạch cải thiện (self_status = 'can_cai_thien' hoặc improvement_required)
 *     phải có: focus ≥1 lựa chọn (nếu chọn 'other' thì phải nhập nội dung),
 *     hành động cải thiện không rỗng, thời hạn không rỗng.
 */
export function validateSubmission(input: SubmitValidationInput): string[] {
  const d = validateSubmissionDetailed(input);
  return d.errors;
}

/** Nhóm thái độ có kế hoạch cải thiện bắt buộc? */
export function attitudeNeedsPlan(a: AttitudeAssessment): boolean {
  return a.self_status === 'can_cai_thien' || !!a.improvement_required;
}

/** Nhóm thái độ bắt buộc minh chứng? */
export function attitudeNeedsEvidence(a: AttitudeAssessment): boolean {
  return a.self_status === 'noi_bat' || a.self_status === 'can_cai_thien' || !!a.improvement_required;
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

export interface AttitudeItemRef {
  id: number;
  name: string;
}

export interface DetailedValidation {
  canSubmit: boolean;
  errors: string[];
  coreTotal: number;
  coreMissing: CoreSkillAssessment[];
  attitudeTotal: number;
  /** Nhóm chưa chọn mức tự đánh giá */
  attitudeRatingMissing: AttitudeItemRef[];
  /** Nhóm bắt buộc minh chứng (nổi bật / cần cải thiện / có KH cải thiện) nhưng chưa nhập */
  attitudeEvidenceMissing: AttitudeItemRef[];
  gappedTotal: number;
  gappedSkillsWithoutAction: CoreSkillAssessment[];
  gappedSkillIssues: GappedSkillIssue[];
  needsImprovementTotal: number;
  needsImprovementWithoutPlan: AttitudeAssessment[];
  /** Skill (lõi + bổ trợ) tự chấm L3+ nhưng chưa nhập minh chứng */
  highLevelEvidenceMissing: CoreSkillAssessment[];
}

export function validateSubmissionDetailed(input: SubmitValidationInput): DetailedValidation {
  const { coreAssessments, attitudeAssessments, skillPriorities, skillActions, supplementaryAssessments = [] } = input;
  const errors: string[] = [];

  // 1. Skill lõi chưa đánh giá
  const coreMissing = coreAssessments.filter(
    c => c.self_assessed_level === null || c.self_assessed_level === undefined,
  );
  if (coreMissing.length > 0) {
    errors.push(`Còn ${coreMissing.length} skill lõi chưa tự đánh giá: ${coreMissing.slice(0, 3).map(c => c.skill_name).join(', ')}${coreMissing.length > 3 ? '…' : ''}`);
  }

  // 2. Thái độ — đủ 6 nhóm có mức tự đánh giá (self_status)
  const attitudeRatingMissing: AttitudeItemRef[] = [];
  const attitudeEvidenceMissing: AttitudeItemRef[] = [];
  for (const d of ATTITUDE_DIMENSIONS) {
    const a = attitudeAssessments.find(x => x.attitude_dimension_id === d.id);
    if (!a?.self_status) {
      attitudeRatingMissing.push({ id: d.id, name: d.name });
      continue;
    }
    // 3. Minh chứng chỉ bắt buộc với nhóm nổi bật / cần cải thiện / có KH cải thiện
    if (attitudeNeedsEvidence(a) && !(a.evidence_text || '').trim()) {
      attitudeEvidenceMissing.push({ id: d.id, name: d.name });
    }
  }
  if (attitudeRatingMissing.length > 0) {
    errors.push(`Còn ${attitudeRatingMissing.length}/6 nhóm thái độ chưa chọn mức tự đánh giá: ${attitudeRatingMissing.map(d => d.name).join(', ')}`);
  }
  if (attitudeEvidenceMissing.length > 0) {
    errors.push(`Còn ${attitudeEvidenceMissing.length} nhóm thái độ (Nổi bật/Cần cải thiện) chưa nhập minh chứng: ${attitudeEvidenceMissing.map(d => d.name).join(', ')}`);
  }

  // 4. Skill lõi còn GAP — chỉ tính để hiển thị gợi ý, KHÔNG chặn nộp.
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

  // 4b. Tự chấm level cao (L3+ Chuyên gia/Bậc thầy) phải có minh chứng —
  //     level cần được "kiếm" bằng bằng chứng thật, không chỉ dropdown chủ quan.
  const highLevelEvidenceMissing = [...coreAssessments, ...supplementaryAssessments].filter(skillNeedsEvidence);
  if (highLevelEvidenceMissing.length > 0) {
    errors.push(`Còn ${highLevelEvidenceMissing.length} skill tự chấm L${EVIDENCE_REQUIRED_LEVEL}+ nhưng chưa nhập minh chứng: ${highLevelEvidenceMissing.slice(0, 3).map(c => c.skill_name).join(', ')}${highLevelEvidenceMissing.length > 3 ? '…' : ''}`);
  }

  // 5. Thái độ có kế hoạch cải thiện — phải đầy đủ focus + hành động + thời hạn
  const needsImprovement = attitudeAssessments.filter(attitudeNeedsPlan);
  const needsImprovementWithoutPlan = needsImprovement.filter(a => !planComplete(a));
  if (needsImprovementWithoutPlan.length > 0) {
    errors.push(`Còn ${needsImprovementWithoutPlan.length} nhóm thái độ cần cải thiện nhưng chưa nhập đủ kế hoạch (điểm cần cải thiện / hành động / thời hạn): ${needsImprovementWithoutPlan.map(a => a.attitude_name).join(', ')}`);
  }

  return {
    canSubmit: errors.length === 0,
    errors,
    coreTotal: coreAssessments.length,
    coreMissing,
    attitudeTotal: ATTITUDE_DIMENSIONS.length,
    attitudeRatingMissing,
    attitudeEvidenceMissing,
    gappedTotal: gappedCoreSkills.length,
    gappedSkillIssues,
    gappedSkillsWithoutAction,
    needsImprovementTotal: needsImprovement.length,
    needsImprovementWithoutPlan,
    highLevelEvidenceMissing,
  };
}

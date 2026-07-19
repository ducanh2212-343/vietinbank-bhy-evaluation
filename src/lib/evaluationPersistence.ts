import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';

export {
  QUARTER_CYCLE_NAME_REGEX,
  filterQuarterCycles,
  pickDefaultCycle,
  pickActiveCycle,
  quarterCycleOrder,
  type QuarterCycleOption,
} from '@/lib/evaluationCycles';

export interface QuarterFormSummary {
  id: string;
  cycle_id: string;
  status: Tables<'form_submissions'>['status'];
  manager_comment: string | null;
  submitted_at: string | null;
  one_on_one_enabled?: boolean | null;
  one_on_one_answers?: any;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  pgd_comment?: string | null;
  pgd_review_status?: string | null;
  pgd_reviewed_at?: string | null;
  return_reason?: string | null;
  returned_by?: string | null;
  updated_at?: string | null;
}

const FORM_SUBMISSION_SELECT =
  'id, cycle_id, status, manager_comment, submitted_at, one_on_one_enabled, one_on_one_answers, reviewer_id, reviewed_at, pgd_comment, pgd_review_status, pgd_reviewed_at, return_reason, returned_by, updated_at';

export async function getQuarterFormSubmission(params: {
  employeeId: string;
  cycleId: string;
  createIfMissing?: boolean;
  reviewerId?: string | null;
}) {
  const { employeeId, cycleId, createIfMissing = false, reviewerId = null } = params;

  const { data, error } = await supabase
    .from('form_submissions')
    .select(FORM_SUBMISSION_SELECT)
    .eq('employee_id', employeeId)
    .eq('cycle_id', cycleId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  const existing = data?.[0] as QuarterFormSummary | undefined;
  if (existing) return existing;

  if (!createIfMissing) return null;

  const { data: created, error: createError } = await supabase
    .from('form_submissions')
    .insert({
      cycle_id: cycleId,
      employee_id: employeeId,
      status: 'draft',
      reviewer_id: reviewerId,
    })
    .select(FORM_SUBMISSION_SELECT)
    .single();

  if (createError) {
    // UNIQUE (employee_id, cycle_id): 2 tab/autosave đua nhau tạo phiếu — lấy bản đã có thay vì lỗi.
    if ((createError as any).code === '23505') {
      const { data: raced, error: refetchError } = await supabase
        .from('form_submissions')
        .select(FORM_SUBMISSION_SELECT)
        .eq('employee_id', employeeId)
        .eq('cycle_id', cycleId)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (refetchError) throw refetchError;
      const winner = raced?.[0] as QuarterFormSummary | undefined;
      if (winner) return winner;
    }
    throw createError;
  }

  return created as QuarterFormSummary;
}

function applySavedRow(base: CoreSkillAssessment, saved: any): CoreSkillAssessment {
  const selfL0 = saved.self_l0 === true;
  const mgrL0 = saved.manager_l0 === true;
  return {
    ...base,
    self_assessed_level: selfL0 ? 0 : (saved.self_assessed_level ?? saved.current_level),
    manager_assessed_level: mgrL0 ? 0 : saved.manager_assessed_level,
    evidence: saved.evidence || '',
    employee_comment: saved.employee_comment || '',
    manager_note: saved.manager_note || '',
  };
}

function buildSupplementaryFromSkill(skillId: string, sk: any): CoreSkillAssessment {
  return {
    skill_id: skillId,
    skill_name: sk?.name || '—',
    skill_code: sk?.code || null,
    skill_group: sk?.skill_group || '',
    minimum_level: 0,
    advanced_level: 0,
    self_assessed_level: null,
    manager_assessed_level: null,
    evidence: '',
    employee_comment: '',
    manager_note: '',
    description: sk?.description ?? null,
    level1_description: sk?.level1_description ?? null,
    level2_description: sk?.level2_description ?? null,
    level3_description: sk?.level3_description ?? null,
    level4_description: sk?.level4_description ?? null,
    upskill_l0_l1: sk?.upskill_l0_l1 ?? null,
    upskill_l1_l2: sk?.upskill_l1_l2 ?? null,
    upskill_l2_l3: sk?.upskill_l2_l3 ?? null,
    upskill_l3_l4: sk?.upskill_l3_l4 ?? null,
  };
}

/** Legacy: merge core only. Kept for backward compatibility. */
export function mergeCoreSkillAssessments(
  baseAssessments: CoreSkillAssessment[],
  savedRows: Tables<'skill_assessments'>[] | null | undefined,
) {
  if (!savedRows?.length) return baseAssessments;
  const savedMap = new Map(
    savedRows.filter((r: any) => r.is_core !== false).map((row) => [row.skill_id, row]),
  );
  return baseAssessments.map((a) => {
    const saved = savedMap.get(a.skill_id);
    return saved ? applySavedRow(a, saved) : a;
  });
}

/** Split saved rows into core (merged onto baseCore) and supplementary (built from catalog). */
export function mergeAllSkillAssessments(
  baseCore: CoreSkillAssessment[],
  savedRows: Tables<'skill_assessments'>[] | null | undefined,
  skillCatalog: any[] | null | undefined,
): { core: CoreSkillAssessment[]; supplementary: CoreSkillAssessment[] } {
  const rows = savedRows || [];
  const catalogMap = new Map((skillCatalog || []).map((s: any) => [s.id, s]));
  const coreIds = new Set(baseCore.map((c) => c.skill_id));

  const coreRows = rows.filter((r: any) => r.is_core !== false || coreIds.has(r.skill_id));
  const suppRows = rows.filter((r: any) => r.is_core === false && !coreIds.has(r.skill_id));

  const coreSavedMap = new Map(coreRows.map((row) => [row.skill_id, row]));
  const core = baseCore.map((a) => {
    const saved = coreSavedMap.get(a.skill_id);
    return saved ? applySavedRow(a, saved) : a;
  });

  const supplementary = suppRows.map((row: any) => {
    const sk = catalogMap.get(row.skill_id);
    const base = buildSupplementaryFromSkill(row.skill_id, sk);
    return applySavedRow(base, row);
  });

  return { core, supplementary };
}

export function makeSupplementaryAssessment(skillId: string, skillCatalog: any[]): CoreSkillAssessment | null {
  const sk = skillCatalog.find((s: any) => s.id === skillId);
  if (!sk) return null;
  return buildSupplementaryFromSkill(skillId, sk);
}

function buildSkillRow(formId: string, assessment: CoreSkillAssessment, isCore: boolean) {
  const selfLvl = assessment.self_assessed_level;
  const mgrLvl = assessment.manager_assessed_level;
  const selfL0 = selfLvl === 0;
  const mgrL0 = mgrLvl === 0;
  return {
    form_id: formId,
    skill_id: assessment.skill_id,
    is_core: isCore,
    current_level: selfL0 ? null : selfLvl,
    self_assessed_level: selfL0 ? null : selfLvl,
    manager_assessed_level: mgrL0 ? null : mgrLvl,
    self_l0: selfL0,
    manager_l0: mgrL0,
    required_level: isCore ? assessment.minimum_level : null,
    evidence: assessment.evidence || null,
    employee_comment: assessment.employee_comment || null,
    manager_note: assessment.manager_note || null,
  } as any;
}

/** Build skill_assessments rows (core + supplementary) cho payload RPC lưu phiếu. */
export function buildSkillAssessmentRows(
  coreAssessments: CoreSkillAssessment[],
  supplementaryAssessments: CoreSkillAssessment[] = [],
) {
  return [
    ...coreAssessments.map((a) => buildSkillRow('', a, true)),
    ...supplementaryAssessments.map((a) => buildSkillRow('', a, false)),
  ];
}

export interface EvaluationChildrenPayload {
  skillAssessments?: any[];
  skillPriorities?: any[];
  skillActions?: any[];
  attitudePriorities?: any[];
  attitudeActions?: any[];
  aiActions?: any[];
}

/**
 * Lưu toàn bộ bảng con của phiếu trong MỘT giao dịch qua RPC save_evaluation_children.
 * Ưu điểm so với delete-all + reinsert: (1) atomic — lỗi giữa chừng tự rollback, không mất dữ liệu;
 * (2) giữ nguyên UUID của hành động → thẻ Kanban không bị reset tiến độ mỗi lần lưu.
 * Quy ước payload: priorities tham chiếu cha bằng KHÓA TỰ NHIÊN (skill_id / attitude_dimension_id);
 * actions gửi kèm id cũ (nếu có) để cập-nhật-tại-chỗ, và natural key của cha để RPC nối FK.
 */
export async function saveEvaluationChildren(formId: string, p: EvaluationChildrenPayload) {
  const { error } = await (supabase as any).rpc('save_evaluation_children', {
    p_form_id: formId,
    p_skill_assessments: p.skillAssessments ?? [],
    p_skill_priorities: p.skillPriorities ?? [],
    p_skill_actions: p.skillActions ?? [],
    p_attitude_priorities: p.attitudePriorities ?? [],
    p_attitude_actions: p.attitudeActions ?? [],
    p_ai_actions: p.aiActions ?? [],
  });
  if (error) throw error;
}

/** Replace all skill assessments (core + optional supplementary) for a form. */
export async function replaceCoreSkillAssessments(
  formId: string,
  coreAssessments: CoreSkillAssessment[],
  supplementaryAssessments: CoreSkillAssessment[] = [],
) {
  const { error: deleteError } = await supabase.from('skill_assessments').delete().eq('form_id', formId);
  if (deleteError) throw deleteError;

  const rows = [
    ...coreAssessments.map((a) => buildSkillRow(formId, a, true)),
    ...supplementaryAssessments.map((a) => buildSkillRow(formId, a, false)),
  ];
  if (!rows.length) return;

  const { error: insertError } = await supabase.from('skill_assessments').insert(rows);
  if (insertError) throw insertError;
}

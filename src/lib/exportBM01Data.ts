// Thu thập dữ liệu bổ sung cho biểu mẫu Word từ form_submissions theo formId:
// nhận xét/đánh giá tổng thể của lãnh đạo, rà soát hành động kỳ trước,
// câu hỏi 1-1 và các mốc ký theo quy trình (CB nộp → lãnh đạo duyệt → PGĐ duyệt).
import { supabase } from '@/integrations/supabase/client';
import type { BM01ExportExtras, BM01PlanExport, OverallReviewExport, PlanActionExport, PreviousActionExportItem } from '@/lib/exportBM01';
import { ACTION_STATUS_LABEL, SKILL_ACTION_TYPE_LABEL } from '@/lib/exportBM01Labels';

const OVERALL_FIELD_LABELS: { key: string; label: string }[] = [
  { key: 'strengths', label: 'Điểm mạnh cần phát huy' },
  { key: 'improvements', label: 'Điểm cần cải thiện' },
  { key: 'next_focus', label: 'Trọng tâm phát triển kỳ tới' },
  { key: 'upskill_note', label: 'Ý kiến về lộ trình upskill' },
  { key: 'attitude_note', label: 'Nhận xét thái độ / tinh thần phối hợp' },
  { key: 'support_note', label: 'Hỗ trợ / định hướng từ lãnh đạo' },
  { key: 'conclusion', label: 'Kết luận / định hướng phát triển' },
];

const PREV_TYPE_LABEL: Record<string, string> = { skill: 'Skill', attitude: 'Thái độ', ai: 'AI' };
const PREV_STATUS_LABEL = ACTION_STATUS_LABEL;

/** Gom dữ liệu kế hoạch phát triển kỳ tới (mục D/E/F trên web) của một phiếu */
async function fetchPlan(formId: string): Promise<BM01PlanExport> {
  const [spRes, sActRes, apRes, aActRes, aiRes] = await Promise.all([
    supabase.from('form_skill_priorities').select('id, skill_id, current_level, target_level, priority_order, reason_text, skill_catalog(name, code)').eq('form_id', formId).order('priority_order'),
    supabase.from('form_skill_actions').select('skill_priority_id, row_no, action_type, action_text, expected_result, deadline, requested_support, status').eq('form_id', formId).order('row_no'),
    supabase.from('form_attitude_priorities').select('id, attitude_dimension_id, attitude_name, issue_summary, improvement_goal, priority_order').eq('form_id', formId).order('priority_order'),
    supabase.from('form_attitude_actions').select('attitude_priority_id, row_no, action_text, expected_evidence, deadline, requested_support, status').eq('form_id', formId).order('row_no'),
    supabase.from('form_ai_actions_v2').select('row_no, ai_action_text, expected_result, deadline, requested_support, status, linked_skill_priority_id, linked_attitude_priority_id, unlinked_reason').eq('form_id', formId).order('row_no'),
  ]);

  const toAction = (a: {
    action_text?: string | null; expected_result?: string | null; expected_evidence?: string | null;
    deadline?: string | null; requested_support?: string | null; status?: string | null; action_type?: string | null;
  }): PlanActionExport => ({
    typeLabel: a.action_type ? (SKILL_ACTION_TYPE_LABEL[a.action_type] || a.action_type) : '',
    actionText: a.action_text || '',
    expectedResult: a.expected_result || a.expected_evidence || '',
    deadline: a.deadline || '',
    support: a.requested_support || '',
    statusLabel: a.status ? (ACTION_STATUS_LABEL[a.status] || a.status) : '',
  });

  const skills = (spRes.data || []).map((s) => ({
    skillLabel: `${s.skill_catalog?.code ? s.skill_catalog.code + '. ' : ''}${s.skill_catalog?.name || ''}`,
    currentLevel: s.current_level,
    targetLevel: s.target_level,
    reason: s.reason_text || '',
    actions: (sActRes.data || []).filter((a) => a.skill_priority_id === s.id).map(toAction),
  }));

  // Chỉ các nhóm thái độ được chọn vào kế hoạch cải thiện (có mục tiêu / vấn đề)
  const attitudes = (apRes.data || [])
    .filter((a) => (a.improvement_goal || '').trim() || (a.issue_summary || '').trim())
    .map((a) => ({
      name: a.attitude_name || '',
      issue: a.issue_summary || '',
      goal: a.improvement_goal || '',
      actions: (aActRes.data || []).filter((x) => x.attitude_priority_id === a.id).map(toAction),
    }));

  const spNameById = new Map((spRes.data || []).map((s) => [s.id, s.skill_catalog?.name || '']));
  const apNameById = new Map((apRes.data || []).map((a) => [a.id, a.attitude_name || '']));
  const ai = (aiRes.data || []).map((a) => ({
    ...toAction({ action_text: a.ai_action_text, expected_result: a.expected_result, deadline: a.deadline, requested_support: a.requested_support, status: a.status }),
    linkedLabel: a.linked_skill_priority_id
      ? `Skill: ${spNameById.get(a.linked_skill_priority_id) || ''}`
      : a.linked_attitude_priority_id
        ? `Thái độ: ${apNameById.get(a.linked_attitude_priority_id) || ''}`
        : (a.unlinked_reason ? `Độc lập (${a.unlinked_reason})` : ''),
  }));

  return { skills, attitudes, ai };
}

function toOverallExport(title: string, raw: unknown): OverallReviewExport | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const fields = OVERALL_FIELD_LABELS
    .map(({ key, label }) => ({ label, value: typeof obj[key] === 'string' ? (obj[key] as string).trim() : '' }))
    .filter((f) => f.value);
  if (!fields.length) return null;
  return { title, fields };
}

export async function fetchBM01Extras(params: {
  formId: string;
  employeeName?: string;
  pgdName?: string;
  previousCycleName?: string;
}): Promise<BM01ExportExtras> {
  const { formId } = params;

  const [formRes, prevRes, plan] = await Promise.all([
    supabase
      .from('form_submissions')
      .select('cycle_id, status, reviewer_id, employee_comment, manager_comment, pgd_comment, manager_overall_review, pgd_overall_review, director_overall_review, one_on_one_enabled, one_on_one_answers, submitted_at, reviewed_at, pgd_reviewed_at, first_submitted_at, first_reviewed_at, first_approved_at')
      .eq('id', formId)
      .maybeSingle(),
    supabase
      .from('form_previous_action_reviews')
      .select('source_action_type, is_extra, action_text, expected_result, actual_result, self_status, status, evidence, employee_note, manager_note, row_no')
      .eq('form_id', formId)
      .order('row_no'),
    fetchPlan(formId),
  ]);

  const form = formRes.data;
  let reviewerName = '';
  if (form?.reviewer_id) {
    const { data: rv } = await supabase.from('profiles').select('full_name').eq('id', form.reviewer_id).maybeSingle();
    reviewerName = rv?.full_name || '';
  }

  // Bộ câu hỏi 1-1 quản trị theo kỳ của phiếu
  const { loadOneOnOneQuestions } = await import('@/lib/oneOnOneQuestions');
  const oneOnOneQuestions = await loadOneOnOneQuestions(form?.cycle_id);

  const previousActions: PreviousActionExportItem[] = (prevRes.data || []).map((r) => ({
    typeLabel: `${PREV_TYPE_LABEL[r.source_action_type] || r.source_action_type}${r.is_extra ? ' (ngoài KH)' : ''}`,
    actionText: r.action_text || '',
    expectedResult: r.expected_result || '',
    actualResult: r.actual_result || '',
    selfStatusLabel: PREV_STATUS_LABEL[r.self_status] || r.self_status || '',
    managerStatusLabel: PREV_STATUS_LABEL[r.status] || r.status || '',
    evidence: r.evidence || '',
    employeeNote: r.employee_note || '',
    managerNote: r.manager_note || '',
  }));

  const overallReviews = [
    toOverallExport('Đánh giá tổng thể của Trưởng phòng / người đánh giá', form?.manager_overall_review),
    toOverallExport('Đánh giá tổng thể của Phó Giám đốc phụ trách', form?.pgd_overall_review),
    toOverallExport('Đánh giá tổng thể của Giám đốc', form?.director_overall_review),
  ].filter((r): r is OverallReviewExport => !!r);

  const oneOnOneAnswers = (form?.one_on_one_answers || {}) as Record<string, { employee?: string; manager?: string }>;
  const hasOneOnOne = form?.one_on_one_enabled || Object.values(oneOnOneAnswers).some(
    (a) => (a?.employee || '').trim() || (a?.manager || '').trim(),
  );

  return {
    plan,
    formStatus: form?.status || undefined,
    formCode: formId,
    previousActions: previousActions.length ? { cycleName: params.previousCycleName, items: previousActions } : undefined,
    oneOnOne: hasOneOnOne
      ? {
          enabled: true,
          answers: Object.fromEntries(
            Object.entries(oneOnOneAnswers).map(([k, v]) => [k, { employee: v?.employee || '', manager: v?.manager || '' }]),
          ),
        }
      : undefined,
    oneOnOneQuestions,
    overallReviews,
    comments: {
      employee: form?.employee_comment || '',
      manager: form?.manager_comment || '',
      pgd: form?.pgd_comment || '',
    },
    signatures: {
      employee: { name: params.employeeName || '', date: form?.first_submitted_at || form?.submitted_at || null },
      reviewer: { name: reviewerName, date: form?.first_reviewed_at || form?.reviewed_at || null },
      // Không có PGĐ phụ trách (luồng rút gọn: PGĐ do GĐ duyệt, GĐCN tự phê duyệt)
      // → người phê duyệt chính là người đánh giá được chỉ định
      approver: { name: params.pgdName || reviewerName || '', date: form?.first_approved_at || form?.pgd_reviewed_at || null },
    },
  };
}

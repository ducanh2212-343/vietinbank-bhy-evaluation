/**
 * Gộp hành động chưa hoàn thành kỳ trước vào kế hoạch kỳ này — CÓ GIỚI HẠN.
 *
 * Nguyên tắc Giám đốc chốt 27/07: tối đa 3 hành động upskill (mục D), tối đa 3 hành
 * động AI (mục F); hành động gắn thái độ (mục E) KHÔNG giới hạn. Trước đây mỗi lần
 * CBQL bấm "Lưu rà soát" là TOÀN BỘ hành động chưa hoàn thành bị đẩy sang kỳ này
 * không giới hạn — kỳ trước làm dở nhiều thì kế hoạch kỳ này phình to, mất trọng tâm.
 *
 * Logic trích từ handler onTransferIncomplete trong StaffEvaluation (giữ nguyên
 * semantics dedup theo nội dung + gắn "Tiếp tục từ <kỳ trước>"), thêm: đếm quota
 * theo hành động CÓ NỘI DUNG hiện có, bỏ qua phần vượt và báo lại để người dùng
 * chọn lọc chủ đích thay vì nhận cả rổ.
 */

export const PLAN_LIMITS = {
  /** Mục D — hành động upskill (tổng, không phải mỗi skill) */
  SKILL_ACTIONS: 3,
  /** Mục D.1 — số skill ưu tiên (đã hiển thị "tối đa 3" trên UI từ trước) */
  SKILL_PRIORITIES: 3,
  /** Mục F — hành động AI */
  AI_ACTIONS: 3,
} as const;

export interface TransferItemLike {
  type: 'skill' | 'attitude' | 'ai';
  action_text: string;
  expected_result: string;
  skill_id?: string | null;
  attitude_dim_id?: number | null;
  attitude_name?: string | null;
  label?: string;
}

export interface MergeTransferParams {
  items: TransferItemLike[];
  skillPriorities: any[];
  skillActions: any[];
  attitudePriorities: any[];
  attitudeActions: any[];
  aiActions: any[];
  previousCycleName: string;
  /** Tra cứu tên/mã skill khi phải tạo priority mới */
  allSkills: any[];
  makeId?: () => string;
}

export interface MergeTransferResult {
  skillPriorities: any[];
  skillActions: any[];
  attitudePriorities: any[];
  attitudeActions: any[];
  aiActions: any[];
  added: { skill: number; attitude: number; ai: number };
  /** Bị bỏ qua vì vượt giới hạn 3 upskill / 3 AI / 3 skill ưu tiên */
  skippedOverLimit: TransferItemLike[];
  /** Bị bỏ qua vì đã có hành động trùng nội dung */
  skippedDuplicate: number;
}

const norm = (s: string) => (s || '').trim().toLowerCase();
const hasText = (s: any) => !!String(s || '').trim();

export function countPlanActions(skillActions: any[], aiActions: any[]) {
  return {
    skill: skillActions.filter((a) => hasText(a.action_text)).length,
    ai: aiActions.filter((a) => hasText(a.ai_action_text)).length,
  };
}

export function mergeTransferItems(params: MergeTransferParams): MergeTransferResult {
  const {
    items, previousCycleName, allSkills,
    makeId = () => `tmp-${crypto.randomUUID()}`,
  } = params;
  const newSkillPriorities = [...params.skillPriorities];
  const newSkillActions = [...params.skillActions];
  const newAttPriorities = [...params.attitudePriorities];
  const newAttActions = [...params.attitudeActions];
  const newAiActions = [...params.aiActions];

  const added = { skill: 0, attitude: 0, ai: 0 };
  const skippedOverLimit: TransferItemLike[] = [];
  let skippedDuplicate = 0;

  let skillCount = countPlanActions(newSkillActions, newAiActions).skill;
  let aiCount = countPlanActions(newSkillActions, newAiActions).ai;

  for (const it of items) {
    const text = norm(it.action_text);
    if (!text) continue;

    if (it.type === 'skill' && it.skill_id) {
      // Dedup TRƯỚC khi tính quota — hành động đã có không tốn suất
      let sp = newSkillPriorities.find((p) => p.skill_id === it.skill_id);
      if (sp && newSkillActions.some((a) => a.skill_priority_id === sp!.id && norm(a.action_text) === text)) {
        skippedDuplicate++;
        continue;
      }
      if (skillCount >= PLAN_LIMITS.SKILL_ACTIONS) { skippedOverLimit.push(it); continue; }
      if (!sp) {
        if (newSkillPriorities.length >= PLAN_LIMITS.SKILL_PRIORITIES) { skippedOverLimit.push(it); continue; }
        const sk: any = allSkills.find((s: any) => s.id === it.skill_id);
        sp = {
          id: makeId(),
          skill_id: it.skill_id,
          current_level: null,
          target_level: null,
          priority_order: newSkillPriorities.length + 1,
          reason_text: `Tiếp tục từ ${previousCycleName}`,
          source_type: 'core_skill',
          status: 'planned',
          skill_name: sk?.name,
          skill_code: sk?.code,
          skill_group: sk?.skill_group,
        };
        newSkillPriorities.push(sp);
      }
      newSkillActions.push({
        skill_priority_id: sp.id,
        row_no: newSkillActions.filter((a) => a.skill_priority_id === sp!.id).length + 1,
        action_type: '70', action_text: it.action_text,
        expected_result: it.expected_result || '', deadline: '', requested_support: '',
        evidence_expected: '', status: 'planned', actual_result: '',
        manager_review: `Tiếp tục từ ${previousCycleName}`,
      });
      skillCount++; added.skill++;
    } else if (it.type === 'attitude' && it.attitude_dim_id) {
      // Thái độ: KHÔNG giới hạn số lượng (nguyên tắc 27/07)
      let ap = newAttPriorities.find((p) => p.attitude_dimension_id === it.attitude_dim_id);
      if (ap && newAttActions.some((a) => a.attitude_priority_id === ap!.id && norm(a.action_text) === text)) {
        skippedDuplicate++;
        continue;
      }
      if (!ap) {
        ap = {
          id: makeId(),
          attitude_dimension_id: it.attitude_dim_id,
          attitude_name: it.attitude_name || it.label || 'Thái độ',
          current_status: '', desired_status: '', issue_summary: '',
          improvement_goal: `Tiếp tục từ ${previousCycleName}`,
          priority_order: newAttPriorities.length + 1, status: 'planned',
        };
        newAttPriorities.push(ap);
      }
      newAttActions.push({
        attitude_priority_id: ap.id,
        row_no: newAttActions.filter((a) => a.attitude_priority_id === ap!.id).length + 1,
        action_text: it.action_text, expected_evidence: it.expected_result || '',
        deadline: '', requested_support: '', status: 'planned', actual_result: '',
        manager_review: `Tiếp tục từ ${previousCycleName}`,
      });
      added.attitude++;
    } else if (it.type === 'ai') {
      if (newAiActions.some((a) => norm(a.ai_action_text) === text)) { skippedDuplicate++; continue; }
      if (aiCount >= PLAN_LIMITS.AI_ACTIONS) { skippedOverLimit.push(it); continue; }
      newAiActions.push({
        linked_skill_priority_id: '', linked_attitude_priority_id: '',
        row_no: newAiActions.length + 1, ai_action_text: it.action_text,
        expected_result: it.expected_result || '', deadline: '', requested_support: '',
        evidence_expected: '', status: 'planned', actual_result: '',
        manager_review: `Tiếp tục từ ${previousCycleName}`, unlinked_reason: '',
      });
      aiCount++; added.ai++;
    }
  }

  return {
    skillPriorities: newSkillPriorities,
    skillActions: newSkillActions,
    attitudePriorities: newAttPriorities,
    attitudeActions: newAttActions,
    aiActions: newAiActions,
    added, skippedOverLimit, skippedDuplicate,
  };
}

/**
 * Đóng gói kế hoạch D/E/F trên màn hình thành payload đề xuất sửa (plan_change_requests).
 * Dòng có id thật giữ id (RPC update — thẻ Kanban giữ nguyên lịch sử); dòng tmp- thành
 * insert mới, tham chiếu priority bằng token 'spN'/'apN' để RPC map sau khi insert.
 */
export function buildPlanChangePayload(s: {
  skillPriorities: any[]; skillActions: any[];
  attitudePriorities: any[]; attitudeActions: any[]; aiActions: any[];
}) {
  const isReal = (id: any) => !!id && !String(id).startsWith('tmp-');
  const refOf = new Map<string, string>();

  const skill_priorities = s.skillPriorities.map((p, i) => {
    const token = isReal(p.id) ? String(p.id) : `sp${i}`;
    if (p.id != null) refOf.set(String(p.id), token);
    return {
      id: isReal(p.id) ? p.id : null,
      ref: isReal(p.id) ? null : token,
      skill_id: p.skill_id,
      current_level: p.current_level ?? null,
      target_level: p.target_level ?? null,
      priority_order: p.priority_order ?? i + 1,
      reason_text: p.reason_text ?? '',
      source_type: p.source_type ?? 'core_skill',
      status: p.status ?? 'planned',
    };
  });

  const attitude_priorities = s.attitudePriorities.map((p, i) => {
    const token = isReal(p.id) ? String(p.id) : `ap${i}`;
    if (p.id != null) refOf.set(String(p.id), token);
    return {
      id: isReal(p.id) ? p.id : null,
      ref: isReal(p.id) ? null : token,
      attitude_dimension_id: p.attitude_dimension_id,
      attitude_name: p.attitude_name ?? '',
      current_status: p.current_status ?? '',
      desired_status: p.desired_status ?? '',
      issue_summary: p.issue_summary ?? '',
      improvement_goal: p.improvement_goal ?? '',
      priority_order: p.priority_order ?? i + 1,
      status: p.status ?? 'planned',
    };
  });

  const skill_actions = s.skillActions
    .filter((a) => hasText(a.action_text))
    .map((a, i) => ({
      id: isReal(a.id) ? a.id : null,
      priority_ref: refOf.get(String(a.skill_priority_id)) ?? a.skill_priority_id,
      row_no: a.row_no ?? i + 1,
      action_type: a.action_type ?? '70',
      action_text: a.action_text ?? '',
      expected_result: a.expected_result ?? '',
      deadline: a.deadline ?? '',
      requested_support: a.requested_support ?? '',
      evidence_expected: a.evidence_expected ?? '',
      status: a.status ?? 'planned',
      manager_review: a.manager_review ?? '',
    }));

  const attitude_actions = s.attitudeActions
    .filter((a) => hasText(a.action_text))
    .map((a, i) => ({
      id: isReal(a.id) ? a.id : null,
      priority_ref: refOf.get(String(a.attitude_priority_id)) ?? a.attitude_priority_id,
      row_no: a.row_no ?? i + 1,
      action_text: a.action_text ?? '',
      expected_evidence: a.expected_evidence ?? '',
      deadline: a.deadline ?? '',
      requested_support: a.requested_support ?? '',
      status: a.status ?? 'planned',
      manager_review: a.manager_review ?? '',
    }));

  const ai_actions = s.aiActions
    .filter((a) => hasText(a.ai_action_text))
    .map((a, i) => ({
      id: isReal(a.id) ? a.id : null,
      row_no: a.row_no ?? i + 1,
      ai_action_text: a.ai_action_text ?? '',
      expected_result: a.expected_result ?? '',
      deadline: a.deadline ?? '',
      requested_support: a.requested_support ?? '',
      evidence_expected: a.evidence_expected ?? '',
      status: a.status ?? 'planned',
      manager_review: a.manager_review ?? '',
      linked_skill_priority_ref: a.linked_skill_priority_id ? (refOf.get(String(a.linked_skill_priority_id)) ?? a.linked_skill_priority_id) : '',
      linked_attitude_priority_ref: a.linked_attitude_priority_id ? (refOf.get(String(a.linked_attitude_priority_id)) ?? a.linked_attitude_priority_id) : '',
      unlinked_reason: a.unlinked_reason ?? '',
    }));

  return { skill_priorities, attitude_priorities, skill_actions, attitude_actions, ai_actions };
}

/** Thông điệp kết quả chuyển — dùng chung cho toast ở các trang. */
export function describeMergeResult(r: MergeTransferResult): string {
  const parts: string[] = [];
  const tot = r.added.skill + r.added.attitude + r.added.ai;
  parts.push(`Đã chuyển ${tot} hành động (${r.added.skill} upskill · ${r.added.attitude} thái độ · ${r.added.ai} AI)`);
  if (r.skippedOverLimit.length > 0) {
    parts.push(`bỏ qua ${r.skippedOverLimit.length} hành động vì vượt giới hạn ${PLAN_LIMITS.SKILL_ACTIONS} upskill / ${PLAN_LIMITS.AI_ACTIONS} AI — hãy chọn lọc việc trọng tâm`);
  }
  if (r.skippedDuplicate > 0) parts.push(`${r.skippedDuplicate} hành động đã có sẵn`);
  return parts.join(' · ');
}

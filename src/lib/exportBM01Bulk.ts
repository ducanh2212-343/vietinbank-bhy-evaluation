// Gom toàn bộ phiếu ĐÃ PHÊ DUYỆT của một kỳ thành danh sách BM01ExportData để
// in gộp một file PDF lưu hồ sơ nhân sự (mỗi phiếu bắt đầu ở trang mới).
// Chỉ lấy phiếu đã qua duyệt (reviewed/approved/closed) — bản nháp không đưa vào hồ sơ.
import { supabase } from '@/integrations/supabase/client';
import type { BM01ExportData } from '@/lib/exportBM01';
import type { CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';
import type { AttitudeAssessment } from '@/components/evaluation/EvalSectionC';
import { ATTITUDE_DIMENSIONS } from '@/components/bm/AttitudeConstants';
import { STATUS_FROM_DB, sanitizeRating } from '@/components/evaluation/attitudeFocusOptions';
import { APPROVED_STATUSES } from '@/lib/approvedForm';
import { mergeAllSkillAssessments } from '@/lib/evaluationPersistence';
import { fetchBM01Extras } from '@/lib/exportBM01Data';

/** Tách focus cải thiện từ issue_summary (JSON mới hoặc format pipe cũ) */
function parseFocus(raw: string): { focus: string[]; other: string } {
  if (!raw) return { focus: [], other: '' };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.focus)) return { focus: parsed.focus, other: parsed.other || '' };
  } catch {
    const focus: string[] = [];
    let other = '';
    raw.split('|').filter(Boolean).forEach((p) => {
      if (p.startsWith('other:')) { other = p.slice('other:'.length); focus.push('other'); }
      else focus.push(p);
    });
    return { focus, other };
  }
  return { focus: [], other: '' };
}

export interface BulkExportResult {
  cycleName: string;
  items: BM01ExportData[];
}

/**
 * Nạp dữ liệu in của toàn bộ phiếu đã phê duyệt trong một kỳ.
 * onProgress báo tiến độ (đã nạp / tổng) để hiển thị trên nút.
 */
export async function loadApprovedFormsForCycle(
  cycleId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<BulkExportResult> {
  const [cycleRes, formsRes, skillsRes] = await Promise.all([
    supabase.from('evaluation_cycles').select('name').eq('id', cycleId).maybeSingle(),
    supabase
      .from('form_submissions')
      .select('id, employee_id, status')
      .eq('cycle_id', cycleId)
      .in('status', APPROVED_STATUSES),
    supabase.from('skill_catalog').select('*').eq('is_active', true).order('sort_order'),
  ]);
  const cycleName = cycleRes.data?.name || 'Kỳ đánh giá';
  const forms = formsRes.data || [];
  const skillCatalog = skillsRes.data || [];
  if (!forms.length) return { cycleName, items: [] };

  const formIds = forms.map((f) => f.id);
  const employeeIds = [...new Set(forms.map((f) => f.employee_id))];

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('*, departments!profiles_department_id_fkey(name), positions!profiles_position_id_fkey(name)')
    .in('id', employeeIds);
  const profiles = new Map((profilesData || []).map((p) => [p.id, p]));

  // Tên quản lý / PGĐ phụ trách — gom một lượt
  const superiorIds = [...new Set((profilesData || []).flatMap((p) => [p.manager_id, p.pgd_id]).filter(Boolean))] as string[];
  const { data: superiors } = superiorIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', superiorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const superiorName = new Map((superiors || []).map((s) => [s.id, s.full_name]));

  // Chuẩn kỹ năng lõi theo vị trí — gom một lượt
  const positionIds = [...new Set((profilesData || []).map((p) => p.position_id).filter(Boolean))] as string[];
  type PcsRow = { position_id: string; skill_id: string; minimum_level: number; advanced_level: number; sort_order: number };
  const { data: pcsData } = positionIds.length
    ? await supabase
        .from('position_core_skills')
        .select('position_id, skill_id, minimum_level, advanced_level, sort_order')
        .in('position_id', positionIds)
        .order('sort_order')
    : { data: [] as PcsRow[] };
  const coreByPosition = new Map<string, PcsRow[]>();
  (pcsData || []).forEach((r) => {
    const list = coreByPosition.get(r.position_id) || [];
    list.push(r);
    coreByPosition.set(r.position_id, list);
  });

  // Điểm kỹ năng + thái độ của toàn bộ phiếu — gom một lượt
  const [saRes, apRes, aActRes] = await Promise.all([
    supabase.from('skill_assessments').select('*').in('form_id', formIds),
    supabase.from('form_attitude_priorities').select('*').in('form_id', formIds),
    supabase
      .from('form_attitude_actions')
      .select('form_id, attitude_priority_id, action_text, deadline, expected_evidence, requested_support, status')
      .in('form_id', formIds),
  ]);
  const saByForm = new Map<string, NonNullable<typeof saRes.data>>();
  (saRes.data || []).forEach((r) => {
    const list = saByForm.get(r.form_id) || [];
    list.push(r);
    saByForm.set(r.form_id, list);
  });
  const apByForm = new Map<string, NonNullable<typeof apRes.data>>();
  (apRes.data || []).forEach((r) => {
    const list = apByForm.get(r.form_id) || [];
    list.push(r);
    apByForm.set(r.form_id, list);
  });
  const aActByForm = new Map<string, NonNullable<typeof aActRes.data>>();
  (aActRes.data || []).forEach((r) => {
    const list = aActByForm.get(r.form_id) || [];
    list.push(r);
    aActByForm.set(r.form_id, list);
  });

  const skillMap = new Map(skillCatalog.map((s) => [s.id, s]));

  // Sắp xếp theo phòng rồi tên để hồ sơ in ra dễ kẹp theo đơn vị
  const sorted = [...forms].sort((a, b) => {
    const pa = profiles.get(a.employee_id);
    const pb = profiles.get(b.employee_id);
    const d = (pa?.departments?.name || '').localeCompare(pb?.departments?.name || '', 'vi');
    return d !== 0 ? d : (pa?.full_name || '').localeCompare(pb?.full_name || '', 'vi');
  });

  const items: BM01ExportData[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const form = sorted[i];
    const prof = profiles.get(form.employee_id);
    if (!prof) { onProgress?.(i + 1, sorted.length); continue; }

    // A. Kỹ năng: khung chuẩn vị trí + điểm đã lưu (lõi và bổ trợ)
    const coreConfigs = (prof.position_id ? coreByPosition.get(prof.position_id) : []) || [];
    const baseCore: CoreSkillAssessment[] = coreConfigs.map((cs) => {
      const sk = skillMap.get(cs.skill_id);
      return {
        skill_id: cs.skill_id,
        skill_name: sk?.name || '—',
        skill_code: sk?.code || null,
        skill_group: sk?.skill_group || '',
        minimum_level: cs.minimum_level,
        advanced_level: cs.advanced_level,
        self_assessed_level: null,
        manager_assessed_level: null,
        evidence: '',
        employee_comment: '',
        manager_note: '',
      } as CoreSkillAssessment;
    });
    const merged = mergeAllSkillAssessments(baseCore, saByForm.get(form.id), skillCatalog);

    // B. Thái độ: đủ 6 nhóm chuẩn, phủ dữ liệu đã lưu (kể cả focus/hạn/hỗ trợ từ action)
    const apRows = apByForm.get(form.id) || [];
    const apMap = new Map(apRows.map((a) => [a.attitude_dimension_id, a]));
    const apIdToDim = new Map(apRows.map((a) => [a.id, a.attitude_dimension_id]));
    const attitudes: AttitudeAssessment[] = ATTITUDE_DIMENSIONS.map((d) => {
      const saved = apMap.get(d.id);
      const focus = parseFocus(saved?.issue_summary || '');
      return {
        attitude_dimension_id: d.id,
        attitude_name: d.name,
        self_status: sanitizeRating(saved?.self_status),
        manager_status: sanitizeRating(saved?.manager_status),
        evidence_text: saved?.evidence || '',
        current_status: saved?.current_status || '',
        improvement_focus: focus.focus,
        improvement_focus_other: focus.other,
        improvement_action: saved?.improvement_goal || '',
        improvement_goal: saved?.improvement_goal || '',
        improvement_deadline: '',
        expected_evidence: '',
        support_needed: '',
        improvement_status: saved?.status ? STATUS_FROM_DB[saved.status] : undefined,
        employee_comment: saved?.employee_comment || '',
        manager_comment: saved?.manager_comment || '',
      } as AttitudeAssessment;
    });
    (aActByForm.get(form.id) || []).forEach((act) => {
      const dimId = apIdToDim.get(act.attitude_priority_id);
      const ia = attitudes.find((x) => x.attitude_dimension_id === dimId);
      if (!ia) return;
      if (act.action_text && act.action_text !== 'Chưa nhập') ia.improvement_action = act.action_text;
      if (act.deadline) ia.improvement_deadline = act.deadline;
      if (act.expected_evidence) ia.expected_evidence = act.expected_evidence;
      if (act.requested_support) ia.support_needed = act.requested_support;
      if (act.status) ia.improvement_status = STATUS_FROM_DB[act.status] || ia.improvement_status;
    });

    const pgdName = prof.pgd_id ? superiorName.get(prof.pgd_id) || '' : '';
    const extras = await fetchBM01Extras({
      formId: form.id,
      employeeName: prof.full_name,
      pgdName,
    });

    items.push({
      profile: {
        full_name: prof.full_name,
        employee_code: prof.employee_code || undefined,
        pos_name: prof.positions?.name || prof.position || '',
        dept_name: prof.departments?.name || '',
        manager_name: prof.manager_id ? superiorName.get(prof.manager_id) || '' : '',
        pgd_name: pgdName,
      },
      cycleName,
      coreAssessments: merged.core,
      supplementaryAssessments: merged.supplementary,
      attitudeAssessments: attitudes,
      extras,
    });
    onProgress?.(i + 1, sorted.length);
  }

  return { cycleName, items };
}

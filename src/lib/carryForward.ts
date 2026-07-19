import { supabase } from '@/integrations/supabase/client';
import { makeSupplementaryAssessment } from '@/lib/evaluationPersistence';
import type { CoreSkillAssessment, PrevSkillInfo } from '@/components/evaluation/EvalSectionB';

/**
 * Kế thừa mục B từ phiếu kỳ trước — trích từ engine trong BMFormPage.tsx (kênh BM01/02/03 đã ẩn)
 * để dùng cho luồng chuẩn Tự đánh giá. Semantics giữ nguyên bản gốc:
 *  - Skill có KH phát triển kỳ trước mà MỌI hành động được xác nhận hoàn thành → "bump" lên target_level.
 *  - Ô chưa chấm (null) được điền bằng mức kỳ trước, ưu tiên mức quản lý duyệt hơn tự chấm.
 *  - Skill bổ trợ kỳ trước chưa có trong kỳ này → tự thêm lại.
 *  - Minh chứng KHÔNG tự copy (tránh minh chứng rác lặp qua các quý) — chỉ đưa vào prevInfo
 *    để người dùng chèn lại chủ đích 1 click.
 * Khác bản gốc: sửa lỗi kiểm tra "phiếu trống" bỏ sót cờ self_l0/manager_l0 (L0 lưu bằng cờ, level=null).
 */

export interface PrevBundle {
  prevFormId: string;
  prevFormStatus: string;
  /** skill_assessments kỳ trước — raw rows (L0 nằm trong cờ self_l0/manager_l0) */
  prevSkillRows: any[];
  prevSkillPriorities: any[];
  prevSkillActions: any[];
  /** form_previous_action_reviews của phiếu HIỆN TẠI trỏ về phiếu kỳ trước (đánh giá của CBQL) */
  reviewRows: any[];
}

export interface CarryForwardResult {
  core: CoreSkillAssessment[];
  supplementary: CoreSkillAssessment[];
  levelUps: { skill_id: string; skill_name: string; new_level: number }[];
  /** Các skill được điền level từ kỳ trước (kể cả bump) */
  prefilledSkillIds: Set<string>;
  /** Tham chiếu kỳ trước theo skill_id — badge + chèn minh chứng cũ */
  prevInfo: Map<string, PrevSkillInfo>;
}

/** Đọc level từ raw row kỳ trước, dịch cờ L0 về số 0 (null = chưa chấm). */
export function prevRowLevels(row: any): { self: number | null; mgr: number | null } {
  const self = row.self_l0 === true ? 0 : (row.self_assessed_level ?? row.current_level ?? null);
  const mgr = row.manager_l0 === true ? 0 : (row.manager_assessed_level ?? null);
  return { self, mgr };
}

/**
 * Phiếu hiện tại đã có dữ liệu mục B chưa? Dùng để quyết định có chạy prefill hay không.
 * PHẢI xét cả cờ L0: hàng "toàn L0" có mọi cột level = null nhưng self_l0=true —
 * bản kiểm tra cũ trong BMFormPage bỏ sót trường hợp này.
 */
export function hasAnySelfAssessmentData(rows: any[] | null | undefined): boolean {
  return (rows || []).some(
    (a: any) =>
      a.self_assessed_level != null ||
      a.manager_assessed_level != null ||
      a.self_l0 === true ||
      a.manager_l0 === true ||
      (a.evidence && String(a.evidence).trim()),
  );
}

export async function fetchPreviousFormBundle(
  previousFormId: string,
  currentFormId: string | null,
): Promise<PrevBundle> {
  const [statusRes, saRes, spRes, actRes, rvRes] = await Promise.all([
    supabase.from('form_submissions').select('status').eq('id', previousFormId).maybeSingle(),
    supabase.from('skill_assessments').select('*').eq('form_id', previousFormId),
    supabase.from('form_skill_priorities').select('*').eq('form_id', previousFormId),
    supabase.from('form_skill_actions').select('*').eq('form_id', previousFormId),
    currentFormId
      ? supabase
          .from('form_previous_action_reviews')
          .select('source_action_id, source_action_type, status')
          .eq('form_id', currentFormId)
          .eq('source_form_id', previousFormId)
      : Promise.resolve({ data: [] as any[] } as any),
  ]);
  return {
    prevFormId: previousFormId,
    prevFormStatus: (statusRes.data as any)?.status || '',
    prevSkillRows: saRes.data || [],
    prevSkillPriorities: spRes.data || [],
    prevSkillActions: actRes.data || [],
    reviewRows: (rvRes as any).data || [],
  };
}

/** Thuần túy (unit-test được): áp kế thừa kỳ trước lên bộ assessment đã merge của kỳ này. */
export function computeSkillCarryForward(params: {
  baseCore: CoreSkillAssessment[];
  baseSupp: CoreSkillAssessment[];
  bundle: PrevBundle;
  skillCatalog: any[];
}): CarryForwardResult {
  const { baseCore, baseSupp, bundle, skillCatalog } = params;
  const { prevSkillRows, prevSkillPriorities, prevSkillActions, reviewRows, prevFormStatus } = bundle;
  const prevApproved = prevFormStatus === 'approved' || prevFormStatus === 'closed';

  // Bump map: mọi hành động của skill-priority kỳ trước hoàn thành
  // (ưu tiên trạng thái CBQL chấm trong form_previous_action_reviews) → lên target_level
  const reviewMap = new Map<string, string>();
  reviewRows.forEach((r: any) => {
    if (r.source_action_type === 'skill' && r.source_action_id) reviewMap.set(r.source_action_id, r.status);
  });
  const actsBySp = new Map<string, any[]>();
  prevSkillActions.forEach((a: any) => {
    const arr = actsBySp.get(a.skill_priority_id) || [];
    arr.push(a);
    actsBySp.set(a.skill_priority_id, arr);
  });
  const bumpMap = new Map<string, number>();
  prevSkillPriorities.forEach((sp: any) => {
    const acts = actsBySp.get(sp.id) || [];
    const allCompleted =
      acts.length > 0 &&
      acts.every((a: any) => {
        const mgr = reviewMap.get(a.id);
        return mgr === 'completed' || (!mgr && a.status === 'completed');
      });
    if (allCompleted && sp.target_level != null) bumpMap.set(sp.skill_id, sp.target_level);
  });

  const prevMap = new Map<string, any>(prevSkillRows.map((r: any) => [r.skill_id, r]));

  const prevInfo = new Map<string, PrevSkillInfo>();
  prevSkillRows.forEach((r: any) => {
    const { self, mgr } = prevRowLevels(r);
    const level = mgr ?? self;
    if (level == null) return;
    prevInfo.set(r.skill_id, {
      level,
      source: mgr != null ? 'manager' : 'self',
      approved: prevApproved && mgr != null,
      evidence: String(r.evidence || '').trim(),
    });
  });

  const prefilledSkillIds = new Set<string>();
  const levelUps: CarryForwardResult['levelUps'] = [];

  const applyRow = (a: CoreSkillAssessment): CoreSkillAssessment => {
    const bump = bumpMap.get(a.skill_id);
    if (bump != null && (a.self_assessed_level ?? 0) < bump) {
      prefilledSkillIds.add(a.skill_id);
      levelUps.push({ skill_id: a.skill_id, skill_name: a.skill_name, new_level: bump });
      return { ...a, self_assessed_level: bump };
    }
    if (a.self_assessed_level != null) return a; // không đè giá trị đã có (kể cả 0)
    const prev = prevMap.get(a.skill_id);
    if (!prev) return a;
    const { self, mgr } = prevRowLevels(prev);
    const inherited = mgr ?? self;
    if (inherited == null) return a;
    prefilledSkillIds.add(a.skill_id);
    return { ...a, self_assessed_level: inherited };
  };

  const core = baseCore.map(applyRow);
  let supplementary = baseSupp.map(applyRow);

  // Skill bổ trợ kỳ trước chưa có trong kỳ này → thêm lại kèm level kế thừa
  const existing = new Set<string>([
    ...core.map((a) => a.skill_id),
    ...supplementary.map((a) => a.skill_id),
  ]);
  prevSkillRows.forEach((r: any) => {
    if (existing.has(r.skill_id)) return;
    const created = makeSupplementaryAssessment(r.skill_id, skillCatalog);
    if (!created) return;
    const bump = bumpMap.get(r.skill_id);
    const { self, mgr } = prevRowLevels(r);
    const inherited = bump ?? mgr ?? self;
    if (inherited != null) {
      created.self_assessed_level = inherited;
      prefilledSkillIds.add(r.skill_id);
      if (bump != null && (mgr ?? self ?? 0) < bump) {
        levelUps.push({ skill_id: r.skill_id, skill_name: created.skill_name, new_level: bump });
      }
    }
    supplementary = [...supplementary, created];
    existing.add(r.skill_id);
  });

  return { core, supplementary, levelUps, prefilledSkillIds, prevInfo };
}

import { supabase } from '@/integrations/supabase/client';

/** Một tiêu chí trong trình soạn thảo — id rỗng = dòng mới chưa lưu. */
export interface CriterionDraft {
  id?: string;
  level_no: number;
  statement: string;
  is_gate: boolean;
  requires_evidence: boolean;
  sort_order: number;
  /** Dòng do AI sinh, chưa lưu — hiển thị badge "Nháp AI" */
  isDraft?: boolean;
  /** Đánh dấu xoá — khi lưu sẽ set is_active=false (giữ lịch sử) */
  deleted?: boolean;
}

export interface CriterionRow {
  id: string;
  skill_id: string;
  level_no: number;
  statement: string;
  is_gate: boolean;
  requires_evidence: boolean;
  sort_order: number;
}

export async function fetchAllCriteria(): Promise<CriterionRow[]> {
  const { data } = await supabase
    .from('skill_level_criteria')
    .select('id, skill_id, level_no, statement, is_gate, requires_evidence, sort_order')
    .eq('is_active', true)
    .order('level_no')
    .order('sort_order');
  return (data || []) as CriterionRow[];
}

/**
 * Lưu thay đổi của một skill: thêm dòng mới, cập nhật dòng sửa,
 * tắt (is_active=false) dòng bị xoá. Trả về lỗi đầu tiên gặp phải (nếu có).
 */
export async function saveCriteriaChanges(
  skillId: string,
  drafts: CriterionDraft[],
  snapshot: Map<string, CriterionRow>,
): Promise<string | null> {
  const inserts = drafts
    .filter((d) => !d.id && !d.deleted && d.statement.trim())
    .map((d) => ({
      skill_id: skillId,
      level_no: d.level_no,
      statement: d.statement.trim(),
      is_gate: d.is_gate,
      requires_evidence: d.requires_evidence,
      sort_order: d.sort_order,
    }));

  const updates = drafts.filter((d) => {
    if (!d.id || d.deleted) return false;
    const old = snapshot.get(d.id);
    if (!old) return false;
    return (
      old.statement !== d.statement.trim() ||
      old.is_gate !== d.is_gate ||
      old.requires_evidence !== d.requires_evidence ||
      old.sort_order !== d.sort_order
    );
  });

  const deletedIds = drafts.filter((d) => d.id && d.deleted).map((d) => d.id!) ;

  if (inserts.length > 0) {
    const { error } = await supabase.from('skill_level_criteria').insert(inserts);
    if (error) return error.message;
  }
  for (const u of updates) {
    const { error } = await supabase
      .from('skill_level_criteria')
      .update({
        statement: u.statement.trim(),
        is_gate: u.is_gate,
        requires_evidence: u.requires_evidence,
        sort_order: u.sort_order,
      })
      .eq('id', u.id!);
    if (error) return error.message;
  }
  if (deletedIds.length > 0) {
    const { error } = await supabase
      .from('skill_level_criteria')
      .update({ is_active: false })
      .in('id', deletedIds);
    if (error) return error.message;
  }
  return null;
}

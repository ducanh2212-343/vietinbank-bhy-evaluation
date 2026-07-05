import { supabase } from '@/integrations/supabase/client';

interface SkillRow {
  skill_id: string;
  is_core: boolean;
  required_level: number | null;
  self_assessed_level: number | null;
  manager_assessed_level: number | null;
  skill_catalog: { code: string | null; name: string; skill_group: string; sort_order: number } | null;
}

export interface CollectionItem {
  skillId: string;
  code: string;
  name: string;
  group: string;
  isCore: boolean;
  level: number;
  required: number;
  metStandard: boolean;
}

/** Đọc toàn bộ skill của một phiếu thành danh sách item bộ sưu tập (đã sort). */
export async function fetchCollectionItems(formId: string): Promise<CollectionItem[]> {
  const { data } = await supabase
    .from('skill_assessments')
    .select('skill_id, is_core, required_level, self_assessed_level, manager_assessed_level, skill_catalog(code, name, skill_group, sort_order)')
    .eq('form_id', formId);
  const rows = (data || []) as SkillRow[];
  rows.sort((a, b) => {
    if (a.is_core !== b.is_core) return a.is_core ? -1 : 1;
    return (a.skill_catalog?.sort_order || 0) - (b.skill_catalog?.sort_order || 0);
  });
  return rows.map((r) => {
    const level = r.manager_assessed_level ?? r.self_assessed_level ?? 0;
    const required = r.required_level ?? 0;
    return {
      skillId: r.skill_id,
      code: r.skill_catalog?.code || '',
      name: r.skill_catalog?.name || '',
      group: r.skill_catalog?.skill_group || '',
      isCore: r.is_core,
      level,
      required,
      metStandard: required > 0 && level >= required,
    };
  });
}

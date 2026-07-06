import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssessedLevelEntry {
  skill_id: string;
  current_level: number | null;
}

/**
 * Level gần nhất của từng skill mà cán bộ đã được đánh giá qua các phiếu trước
 * (ưu tiên mức tự đánh giá, thiếu thì lấy mức trưởng phòng chấm).
 * Dùng làm nguồn tự điền "Level hiện tại" ở mục D cho các skill không nằm
 * trong mục B của phiếu đang mở — tránh cán bộ phải tự nhập lại, dễ sai.
 */
export function useHistoricalSkillLevels(employeeId: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ['historical-skill-levels', employeeId],
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: forms, error: formsErr } = await supabase
        .from('form_submissions')
        .select('id')
        .eq('employee_id', employeeId!)
        .order('updated_at', { ascending: false })
        .limit(8);
      if (formsErr) throw formsErr;
      const formIds = (forms ?? []).map(f => f.id);
      if (!formIds.length) return {} as Record<string, number>;

      const { data: rows, error: rowsErr } = await supabase
        .from('skill_assessments')
        .select('form_id, skill_id, self_assessed_level, manager_assessed_level')
        .in('form_id', formIds);
      if (rowsErr) throw rowsErr;

      // formIds đã xếp mới → cũ; giữ level từ phiếu mới nhất có dữ liệu
      const rank = new Map(formIds.map((id, i) => [id, i]));
      const best = new Map<string, { level: number; rank: number }>();
      for (const r of rows ?? []) {
        const level = r.self_assessed_level ?? r.manager_assessed_level;
        if (level == null || !r.skill_id) continue;
        const rk = rank.get(r.form_id) ?? Number.MAX_SAFE_INTEGER;
        const cur = best.get(r.skill_id);
        if (!cur || rk < cur.rank) best.set(r.skill_id, { level, rank: rk });
      }
      const map: Record<string, number> = {};
      for (const [skillId, v] of best) map[skillId] = v.level;
      return map;
    },
  });
  return data ?? {};
}

/**
 * Gộp level cho mục D: mục B của phiếu đang mở (đang nhập trực tiếp) luôn thắng;
 * skill chưa có trong mục B thì lấy level gần nhất từ các phiếu trước.
 */
export function mergeAssessedLevels(
  current: AssessedLevelEntry[],
  historical: Record<string, number>,
): AssessedLevelEntry[] {
  const merged = new Map<string, number | null>();
  for (const [skillId, level] of Object.entries(historical)) merged.set(skillId, level);
  for (const c of current) {
    if (c.current_level != null) merged.set(c.skill_id, c.current_level);
    else if (!merged.has(c.skill_id)) merged.set(c.skill_id, null);
  }
  return Array.from(merged, ([skill_id, current_level]) => ({ skill_id, current_level }));
}

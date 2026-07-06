import { supabase } from '@/integrations/supabase/client';
import { filterQuarterCycles, pickDefaultCycle } from '@/lib/evaluationCycles';

/**
 * Nguồn dữ liệu xếp sao DÙNG CHUNG cho mọi trang tổng hợp (Tổng quan, Phân nhóm cán bộ,
 * Đội ngũ phòng ban, Danh sách cán bộ) — đọc từ bảng chuẩn `staff_star_classifications`,
 * lọc theo MỘT kỳ, và chọn bản ghi ưu tiên GIỐNG HỆT trang Báo cáo. Nhờ đó số liệu 4 nhóm
 * sao đồng nhất giữa các trang (không còn cảnh mỗi trang một con số do đọc bảng cũ admin_evaluations).
 */

export const STAR_GROUP_KEYS = ['sao_mai', 'sao_khue', 'sao_bang', 'sao_hom'] as const;

export const STAR_LABEL: Record<string, string> = {
  sao_mai: 'Sao Mai',
  sao_khue: 'Sao Khuê',
  sao_bang: 'Sao Băng',
  sao_hom: 'Sao Hôm',
};

export const STAR_CSS: Record<string, string> = {
  sao_mai: 'star-mai',
  sao_khue: 'star-khue',
  sao_bang: 'star-bang',
  sao_hom: 'star-hom',
};

/** Kỳ đánh giá mặc định để hiển thị xếp sao: quý mới nhất. Null nếu chưa có kỳ hợp lệ. */
export async function fetchDefaultCycle(): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase.from('evaluation_cycles').select('id, name');
  if (error || !data) return null;
  const picked = pickDefaultCycle(filterQuarterCycles(data as { id: string; name: string }[]));
  return picked ? { id: picked.id, name: picked.name } : null;
}

/**
 * Bản đồ xếp sao theo cán bộ cho MỘT kỳ. Ưu tiên bản ghi đã duyệt và cấp đánh giá cao nhất
 * (GĐ > PGĐ > TP) — trùng khớp logic starByEmp của ReportsPage để đồng nhất số liệu.
 * Trả Map<employee_id, star_group_key>.
 */
export async function fetchStarByEmployee(cycleId: string): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('staff_star_classifications')
    .select('employee_id, star_group, approval_status, evaluator_level')
    .eq('cycle_id', cycleId);
  if (error || !data) return new Map();

  const rank = (r: { approval_status?: string | null; evaluator_level?: string | null }) =>
    (r.approval_status === 'approved' ? 100 : 0) +
    (r.evaluator_level === 'director' ? 3 : r.evaluator_level === 'pgd' ? 2 : 1);

  const best = new Map<string, { group: string; score: number }>();
  for (const r of data as any[]) {
    if (!r.star_group) continue;
    const score = rank(r);
    const cur = best.get(r.employee_id);
    if (!cur || score > cur.score) best.set(r.employee_id, { group: r.star_group, score });
  }
  return new Map([...best.entries()].map(([k, v]) => [k, v.group]));
}

/**
 * Helper thuần túy cho nhóm tính năng quản trị năng lực chiến lược:
 * - Bản đồ rủi ro năng lực (bus factor theo kỹ năng × phòng ban)
 * - Con đường sự nghiệp (% đáp ứng yêu cầu vị trí)
 * - Mô phỏng điều chuyển nhân sự (what-if)
 * Không phụ thuộc Supabase client — nhận dữ liệu thô, trả kết quả tính toán.
 */

export interface SkillAssessmentRow {
  form_id: string;
  skill_id: string;
  self_assessed_level: number | null;
  manager_assessed_level: number | null;
  self_l0: boolean;
  manager_l0: boolean;
}

/** Mức hiệu lực: ưu tiên đánh giá của lãnh đạo, sau đó tự đánh giá; cờ l0 = mức 0 (cùng quy tắc với ReportsPage). */
export const effectiveLevel = (r: Pick<SkillAssessmentRow,
  'self_assessed_level' | 'manager_assessed_level' | 'self_l0' | 'manager_l0'>): number | null => {
  if (r.manager_l0) return 0;
  if (r.manager_assessed_level != null) return r.manager_assessed_level;
  if (r.self_l0) return 0;
  return r.self_assessed_level;
};

/**
 * Gom mức kỹ năng hiệu lực theo cán bộ: employeeId → (skillId → level).
 * @param formToEmployee map form_id → employee_id (chỉ chứa form mới nhất của mỗi cán bộ trong kỳ)
 */
export function buildEmployeeSkillLevels(
  formToEmployee: Map<string, string>,
  rows: SkillAssessmentRow[],
): Map<string, Map<string, number>> {
  const byEmp = new Map<string, Map<string, number>>();
  rows.forEach((r) => {
    const empId = formToEmployee.get(r.form_id);
    if (!empId) return;
    const lv = effectiveLevel(r);
    if (lv == null) return;
    let m = byEmp.get(empId);
    if (!m) { m = new Map(); byEmp.set(empId, m); }
    // Nếu trùng skill (dữ liệu bẩn), giữ mức cao nhất
    m.set(r.skill_id, Math.max(m.get(r.skill_id) ?? 0, lv));
  });
  return byEmp;
}

export interface HolderInfo {
  profileId: string;
  level: number;
}

/** Danh sách người nắm giữ kỹ năng ở mức >= expertLevel, theo skillId. */
export function computeSkillHolders(
  levelsByEmployee: Map<string, Map<string, number>>,
  expertLevel: number,
): Map<string, HolderInfo[]> {
  const holders = new Map<string, HolderInfo[]>();
  levelsByEmployee.forEach((skills, profileId) => {
    skills.forEach((level, skillId) => {
      if (level >= expertLevel) {
        const list = holders.get(skillId) || [];
        list.push({ profileId, level });
        holders.set(skillId, list);
      }
    });
  });
  holders.forEach((list) => list.sort((a, b) => b.level - a.level));
  return holders;
}

export type RiskTier = 'trong' | 'nguy_cap' | 'mong_manh' | 'an_toan';

export const RISK_TIER_LABELS: Record<RiskTier, string> = {
  trong: 'Trống (0 người)',
  nguy_cap: 'Nguy cấp (1 người)',
  mong_manh: 'Mong manh (2 người)',
  an_toan: 'An toàn (≥3 người)',
};

export const riskTier = (expertCount: number): RiskTier => {
  if (expertCount <= 0) return 'trong';
  if (expertCount === 1) return 'nguy_cap';
  if (expertCount === 2) return 'mong_manh';
  return 'an_toan';
};

export interface CareerFitRequirement {
  skill_id: string;
  minimum_level: number;
}

export interface CareerFitGap {
  skill_id: string;
  current: number;
  required: number;
  gap: number;
}

export interface CareerFitResult {
  /** % đáp ứng: trung bình min(current/required, 1) trên các kỹ năng có yêu cầu > 0 */
  pct: number;
  /** Số kỹ năng đạt yêu cầu tối thiểu */
  met: number;
  total: number;
  missing: CareerFitGap[];
}

/** Độ khớp của một cán bộ với một vị trí, dựa trên yêu cầu tối thiểu của vị trí. */
export function computeCareerFit(
  levels: Map<string, number> | undefined,
  requirements: CareerFitRequirement[],
): CareerFitResult {
  const reqs = requirements.filter((r) => r.minimum_level > 0);
  if (!reqs.length) return { pct: 0, met: 0, total: 0, missing: [] };
  let met = 0;
  let scoreSum = 0;
  const missing: CareerFitGap[] = [];
  reqs.forEach((r) => {
    const current = levels?.get(r.skill_id) ?? 0;
    scoreSum += Math.min(current / r.minimum_level, 1);
    if (current >= r.minimum_level) {
      met++;
    } else {
      missing.push({ skill_id: r.skill_id, current, required: r.minimum_level, gap: r.minimum_level - current });
    }
  });
  missing.sort((a, b) => b.gap - a.gap);
  return { pct: Math.round((scoreSum / reqs.length) * 100), met, total: reqs.length, missing };
}

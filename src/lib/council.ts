// Đánh giá năng lực thực thi đầu mối chi nhánh — logic trọng số & xếp loại.
// Căn cứ "Cơ chế đánh giá Hội đồng đối với công tác đầu mối":
//   Đầu mối cấp PGĐ : GĐCN 20% | PGĐ còn lại 15% | thành viên khác 65%
//   Đầu mối cấp TP  : GĐCN 20% | PGĐ phụ trách 10% | PGĐ còn lại 15% | thành viên khác 55%
// Điểm nhóm = trung bình cộng "điểm TB thô" của các phiếu trong nhóm;
// Điểm quy thang 100 = Σ(điểm nhóm × trọng số) / Σ(trọng số các nhóm có phiếu) × 10.

export type CouncilMemberGroup = 'giam_doc' | 'pho_giam_doc' | 'thanh_vien';
export type CouncilSubjectLevel = 'pgd' | 'truong_phong';
export type CouncilRoundStatus = 'draft' | 'open' | 'closed';
export type CouncilSection = 'nang_luc' | 'hieu_qua';

export type WeightBucket = 'giam_doc' | 'pgd_phu_trach' | 'pgd_khac' | 'thanh_vien';

export const MEMBER_GROUP_LABELS: Record<CouncilMemberGroup, string> = {
  giam_doc: 'Giám đốc Chi nhánh',
  pho_giam_doc: 'Phó Giám đốc',
  thanh_vien: 'Thành viên Hội đồng (Trưởng phòng & khác)',
};

export const WEIGHT_BUCKET_LABELS: Record<WeightBucket, string> = {
  giam_doc: 'Giám đốc Chi nhánh',
  pgd_phu_trach: 'Phó Giám đốc phụ trách',
  pgd_khac: 'Phó Giám đốc khác',
  thanh_vien: 'Thành viên Hội đồng (Trưởng phòng & khác)',
};

export const SECTION_LABELS: Record<CouncilSection, string> = {
  nang_luc: 'Phần I — Năng lực triển khai công tác đầu mối',
  hieu_qua: 'Phần II — Hiệu quả công tác đầu mối',
};

export const ROUND_STATUS_LABELS: Record<CouncilRoundStatus, string> = {
  draft: 'Chưa mở',
  open: 'Đang mở',
  closed: 'Đã chốt',
};

export const SUBJECT_LEVEL_LABELS: Record<CouncilSubjectLevel, string> = {
  pgd: 'Cấp Phó Giám đốc',
  truong_phong: 'Cấp Trưởng phòng',
};

// Trọng số mặc định theo cấp cán bộ được đánh giá (tỷ lệ 0-1)
export const WEIGHT_SCHEMES: Record<CouncilSubjectLevel, Partial<Record<WeightBucket, number>>> = {
  pgd: { giam_doc: 0.2, pgd_khac: 0.15, thanh_vien: 0.65 },
  truong_phong: { giam_doc: 0.2, pgd_phu_trach: 0.1, pgd_khac: 0.15, thanh_vien: 0.55 },
};

// Cấu hình trọng số tùy chỉnh theo kỳ (council_rounds.weight_config), đơn vị %.
// Thiếu/không hợp lệ ở đâu thì rơi về mặc định ở đó.
export type CouncilWeightConfig = Partial<
  Record<CouncilSubjectLevel, Partial<Record<WeightBucket, number>>>
>;

export const DEFAULT_WEIGHT_CONFIG_PERCENT: Record<CouncilSubjectLevel, Partial<Record<WeightBucket, number>>> = {
  pgd: { giam_doc: 20, pgd_khac: 15, thanh_vien: 65 },
  truong_phong: { giam_doc: 20, pgd_phu_trach: 10, pgd_khac: 15, thanh_vien: 55 },
};

/** Trả về bảng trọng số (tỷ lệ 0-1) cho một cấp đánh giá, ưu tiên cấu hình của kỳ. */
export function resolveWeightScheme(
  level: CouncilSubjectLevel,
  config?: CouncilWeightConfig | null,
): Partial<Record<WeightBucket, number>> {
  const custom = config?.[level];
  if (!custom) return WEIGHT_SCHEMES[level];
  const resolved: Partial<Record<WeightBucket, number>> = {};
  let valid = false;
  for (const bucket of Object.keys(WEIGHT_SCHEMES[level]) as WeightBucket[]) {
    const pct = custom[bucket];
    if (typeof pct === 'number' && Number.isFinite(pct) && pct >= 0) {
      resolved[bucket] = pct / 100;
      if (pct > 0) valid = true;
    } else {
      resolved[bucket] = WEIGHT_SCHEMES[level][bucket];
      if ((WEIGHT_SCHEMES[level][bucket] || 0) > 0) valid = true;
    }
  }
  return valid ? resolved : WEIGHT_SCHEMES[level];
}

// Thang điểm chấm chi tiết: 10 nấc rời rạc từ 1 đến 10 (theo mẫu khảo sát ẩn danh)
export const SCORE_SCALE: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Điểm chấm rất cao/rất thấp phải kèm minh chứng (Cơ chế đánh giá, mục I.3)
export const EXTREME_HIGH = 10;
export const EXTREME_LOW = 3;

// Ngưỡng diễn giải điểm từng tiêu chí (thang 10 nấc), neo theo 5 mốc chuẩn hành vi:
//   9-10 → mức 10đ · 7-8 → mức 8đ · 5-6 → mức 6đ · 2-4 → mức 3đ · 1 → mức 0đ
export interface CriterionScoreBand {
  min: number;          // điểm tối thiểu thuộc dải
  anchorScore: number;  // mốc chuẩn hành vi tương ứng (10/8/6/3/0)
  label: string;
  rangeLabel: string;   // nhãn dải nấc hiển thị
  badgeClass: string;   // màu hiển thị
}

export const CRITERION_SCORE_BANDS: CriterionScoreBand[] = [
  { min: 9, anchorScore: 10, label: 'Xuất sắc', rangeLabel: '9–10', badgeClass: 'bg-emerald-600 hover:bg-emerald-600 text-white' },
  { min: 7, anchorScore: 8, label: 'Tốt', rangeLabel: '7–8', badgeClass: 'bg-sky-600 hover:bg-sky-600 text-white' },
  { min: 5, anchorScore: 6, label: 'Đạt', rangeLabel: '5–6', badgeClass: 'bg-slate-500 hover:bg-slate-500 text-white' },
  { min: 2, anchorScore: 3, label: 'Cần cải thiện', rangeLabel: '2–4', badgeClass: 'bg-amber-600 hover:bg-amber-600 text-white' },
  { min: 0, anchorScore: 0, label: 'Không đạt', rangeLabel: '1', badgeClass: 'bg-red-600 hover:bg-red-600 text-white' },
];

export function scoreBandOf(score: number): CriterionScoreBand {
  return CRITERION_SCORE_BANDS.find((b) => score >= b.min) ?? CRITERION_SCORE_BANDS[CRITERION_SCORE_BANDS.length - 1];
}

export interface ReportEvaluationRow {
  anon_code: string;
  member_group: CouncilMemberGroup;
  is_supervisor: boolean;
  scores: Record<string, number>;     // criterion_id -> điểm
  evidences?: Record<string, string>; // criterion_id -> minh chứng (điểm rất cao/rất thấp)
  strengths: string | null;
  weaknesses: string | null;
  suggestions: string | null;
  evidence: string | null; // minh chứng chung (dữ liệu cũ, giữ để tương thích)
}

export function weightBucketOf(row: Pick<ReportEvaluationRow, 'member_group' | 'is_supervisor'>, level: CouncilSubjectLevel): WeightBucket {
  if (row.member_group === 'giam_doc') return 'giam_doc';
  if (row.member_group === 'pho_giam_doc') {
    return level === 'truong_phong' && row.is_supervisor ? 'pgd_phu_trach' : 'pgd_khac';
  }
  return 'thanh_vien';
}

/** Điểm TB thô của một phiếu = trung bình các tiêu chí đang hiệu lực đã chấm. */
export function rawAverage(scores: Record<string, number>, activeCriterionIds: string[]): number | null {
  const vals = activeCriterionIds
    .map((id) => scores[id])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export interface BucketSummary {
  bucket: WeightBucket;
  label: string;
  votes: number;
  rawAvg: number;      // điểm TB nhóm thô (thang 10)
  weight: number;      // trọng số áp dụng
  contribution: number; // điểm thành phần có trọng số (thang 10)
}

export interface CouncilReportSummary {
  buckets: BucketSummary[];
  totalWeightPresent: number; // tổng trọng số các nhóm đã bỏ phiếu
  score100: number | null;    // điểm quy thang 100 (đã chuẩn hóa theo trọng số hiện có)
  rowAverages: Map<string, number>; // anon_code -> điểm TB thô của phiếu
}

/** Tổng hợp kết quả có trọng số theo nhóm vị trí (mục III của báo cáo). */
export function computeCouncilReport(
  rows: ReportEvaluationRow[],
  activeCriterionIds: string[],
  level: CouncilSubjectLevel,
  weightConfig?: CouncilWeightConfig | null,
): CouncilReportSummary {
  const scheme = resolveWeightScheme(level, weightConfig);
  const grouped = new Map<WeightBucket, number[]>();
  const rowAverages = new Map<string, number>();

  for (const row of rows) {
    const avg = rawAverage(row.scores, activeCriterionIds);
    if (avg == null) continue;
    rowAverages.set(row.anon_code, avg);
    const bucket = weightBucketOf(row, level);
    if (!grouped.has(bucket)) grouped.set(bucket, []);
    grouped.get(bucket)!.push(avg);
  }

  const bucketOrder: WeightBucket[] = ['giam_doc', 'pgd_phu_trach', 'pgd_khac', 'thanh_vien'];
  const buckets: BucketSummary[] = [];
  let totalWeightPresent = 0;
  let weightedSum = 0;

  for (const bucket of bucketOrder) {
    const weight = scheme[bucket];
    if (weight == null) continue;
    const avgs = grouped.get(bucket) || [];
    if (avgs.length === 0) {
      buckets.push({ bucket, label: WEIGHT_BUCKET_LABELS[bucket], votes: 0, rawAvg: 0, weight, contribution: 0 });
      continue;
    }
    const rawAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    const contribution = rawAvg * weight;
    totalWeightPresent += weight;
    weightedSum += contribution;
    buckets.push({ bucket, label: WEIGHT_BUCKET_LABELS[bucket], votes: avgs.length, rawAvg, weight, contribution });
  }

  const score100 = totalWeightPresent > 0 ? (weightedSum / totalWeightPresent) * 10 : null;
  return { buckets, totalWeightPresent, score100, rowAverages };
}

/** Điểm trung bình từng tiêu chí của một tập phiếu (cho radar/phân tích). */
export function computeCriterionAverages(
  rows: ReportEvaluationRow[],
  criterionIds: string[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const id of criterionIds) {
    const vals = rows
      .map((r) => r.scores[id])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (vals.length > 0) out.set(id, vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return out;
}

/** Các tiêu chí chấm rất cao/rất thấp — bắt buộc kèm nhận xét & minh chứng. */
export function extremeScoreCriteria(
  scores: Record<string, number>,
  activeCriterionIds: string[],
): string[] {
  return activeCriterionIds.filter((id) => {
    const v = scores[id];
    return typeof v === 'number' && (v >= EXTREME_HIGH || v <= EXTREME_LOW);
  });
}

export function formatScore(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatPercent(w: number): string {
  // Giữ tối đa 1 chữ số lẻ để hiển thị đúng trọng số chia đều (VD 15%/2 phiếu = 7,5%)
  return `${(w * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}

/**
 * Trọng số THỰC của một phiếu = trọng số nhóm chia đều cho số phiếu trong nhóm.
 * VD đầu mối cấp PGĐ: nhóm "PGĐ khác" 15% có 2 phiếu → mỗi phiếu 7,5%.
 * (Tương đương toán học với cách tính điểm nhóm = trung bình phiếu × trọng số nhóm.)
 */
export function effectiveRowWeight(
  row: Pick<ReportEvaluationRow, 'member_group' | 'is_supervisor'>,
  level: CouncilSubjectLevel,
  buckets: BucketSummary[],
  weightConfig?: CouncilWeightConfig | null,
): number {
  const bucket = weightBucketOf(row, level);
  const groupWeight = resolveWeightScheme(level, weightConfig)[bucket] ?? 0;
  const b = buckets.find((x) => x.bucket === bucket);
  return b && b.votes > 0 ? groupWeight / b.votes : groupWeight;
}

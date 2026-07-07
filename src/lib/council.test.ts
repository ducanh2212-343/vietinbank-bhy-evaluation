import { describe, expect, it } from 'vitest';
import {
  computeCouncilReport,
  computeCriterionAverages,
  effectiveRowWeight,
  extremeScoreCriteria,
  rawAverage,
  resolveWeightScheme,
  sectionAverage,
  weightBucketOf,
  type ReportEvaluationRow,
} from './council';

const CRITERIA = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'];

const scoresOf = (vals: number[]): Record<string, number> =>
  Object.fromEntries(CRITERIA.map((id, i) => [id, vals[i]]));

const row = (
  anon: string,
  group: ReportEvaluationRow['member_group'],
  vals: number[],
  isSupervisor = false,
): ReportEvaluationRow => ({
  anon_code: anon,
  member_group: group,
  is_supervisor: isSupervisor,
  scores: scoresOf(vals),
  strengths: null,
  weaknesses: null,
  suggestions: null,
  evidence: null,
});

describe('computeCouncilReport — khớp mẫu báo cáo Quý 1/2026 (PGĐ Nguyễn Thị Thùy Linh)', () => {
  // Số liệu lấy nguyên trạng từ "Báo cáo kết quả đánh giá chi tiết cán bộ đầu mối (xử lý trọng số)"
  const rows: ReportEvaluationRow[] = [
    row('#566', 'giam_doc', [9, 9.5, 9, 9, 8.5, 7, 8, 9, 9.5, 9]),          // TB 8.75
    row('#643', 'pho_giam_doc', [9, 8.5, 9.5, 8, 7.5, 7, 8, 8, 9.5, 9]),    // TB 8.40
    row('#633', 'pho_giam_doc', [9, 8.5, 9.5, 8, 7.5, 8, 8, 8, 8.5, 9]),    // TB 8.40
    row('#680', 'pho_giam_doc', [8.5, 9, 9.5, 8.5, 7.5, 8, 8, 9, 9, 8.5]),  // TB 8.55
    row('#487', 'thanh_vien', [8, 8, 9.5, 7.5, 8, 7, 7, 8, 9.5, 9]),        // TB 8.15
    row('#581', 'thanh_vien', [7.5, 8, 8.5, 8.5, 7.5, 6.5, 7, 9, 9.5, 8.5]),// TB 8.05
    row('#924', 'thanh_vien', [8, 8, 8, 8.5, 8, 7, 7.5, 8, 9, 8]),          // TB 8.00
    row('#229', 'thanh_vien', [8, 9.5, 8.5, 8, 7, 7.5, 7, 9, 8.5, 8.5]),    // TB 8.15
    row('#515', 'thanh_vien', [8, 8.5, 9, 8, 8, 7.5, 8, 9, 8.5, 8]),        // TB 8.25
    row('#402', 'thanh_vien', [7.5, 8, 8.5, 9, 7, 7.5, 8, 8.5, 9, 8]),      // TB 8.10
  ];

  it('tính đúng điểm TB thô từng phiếu', () => {
    expect(rawAverage(rows[0].scores, CRITERIA)).toBeCloseTo(8.75, 2);
    expect(rawAverage(rows[1].scores, CRITERIA)).toBeCloseTo(8.4, 2);
    expect(rawAverage(rows[4].scores, CRITERIA)).toBeCloseTo(8.15, 2);
  });

  it('tính đúng điểm nhóm, điểm thành phần và điểm quy thang 100 (82.93)', () => {
    const r = computeCouncilReport(rows, CRITERIA, 'pgd');
    const byBucket = Object.fromEntries(r.buckets.map((b) => [b.bucket, b]));
    expect(byBucket.giam_doc.rawAvg).toBeCloseTo(8.75, 2);
    expect(byBucket.giam_doc.contribution).toBeCloseTo(1.75, 3);
    expect(byBucket.pgd_khac.rawAvg).toBeCloseTo(8.45, 2);
    expect(byBucket.pgd_khac.contribution).toBeCloseTo(1.2675, 3);
    expect(byBucket.thanh_vien.rawAvg).toBeCloseTo(8.1167, 3);
    expect(byBucket.thanh_vien.contribution).toBeCloseTo(5.2758, 3);
    expect(r.totalWeightPresent).toBeCloseTo(1, 5);
    expect(r.score100).toBeCloseTo(82.93, 1);
  });

  it('chuẩn hóa theo tổng trọng số hiện có khi một nhóm chưa bỏ phiếu', () => {
    const noDirector = rows.filter((x) => x.member_group !== 'giam_doc');
    const r = computeCouncilReport(noDirector, CRITERIA, 'pgd');
    expect(r.totalWeightPresent).toBeCloseTo(0.8, 5);
    // (1.2675 + 5.2758) / 0.8 * 10
    expect(r.score100).toBeCloseTo(81.79, 1);
  });
});

describe('weightBucketOf — trọng số theo cấp đánh giá', () => {
  it('đầu mối cấp TP: PGĐ phụ trách tách khỏi PGĐ còn lại', () => {
    expect(weightBucketOf({ member_group: 'pho_giam_doc', is_supervisor: true }, 'truong_phong')).toBe('pgd_phu_trach');
    expect(weightBucketOf({ member_group: 'pho_giam_doc', is_supervisor: false }, 'truong_phong')).toBe('pgd_khac');
  });
  it('đầu mối cấp PGĐ: mọi PGĐ đều thuộc nhóm PGĐ còn lại', () => {
    expect(weightBucketOf({ member_group: 'pho_giam_doc', is_supervisor: true }, 'pgd')).toBe('pgd_khac');
  });
});

describe('điểm cấp TP dùng scheme 20/10/15/55', () => {
  it('tính đúng khi đủ 4 nhóm', () => {
    const rows: ReportEvaluationRow[] = [
      row('#1', 'giam_doc', Array(10).fill(9)),
      row('#2', 'pho_giam_doc', Array(10).fill(8), true),   // PGĐ phụ trách
      row('#3', 'pho_giam_doc', Array(10).fill(7)),
      row('#4', 'thanh_vien', Array(10).fill(6)),
    ];
    const r = computeCouncilReport(rows, CRITERIA, 'truong_phong');
    // 9*0.2 + 8*0.1 + 7*0.15 + 6*0.55 = 1.8 + 0.8 + 1.05 + 3.3 = 6.95 → 69.5
    expect(r.score100).toBeCloseTo(69.5, 2);
  });
});

describe('trọng số tùy chỉnh theo kỳ (weight_config)', () => {
  const rows: ReportEvaluationRow[] = [
    row('#1', 'giam_doc', Array(10).fill(9)),
    row('#2', 'pho_giam_doc', Array(10).fill(8)),
    row('#3', 'thanh_vien', Array(10).fill(7)),
  ];

  it('áp dụng cấu hình % của kỳ thay cho mặc định', () => {
    const r = computeCouncilReport(rows, CRITERIA, 'pgd', {
      pgd: { giam_doc: 30, pgd_khac: 20, thanh_vien: 50 },
    });
    // 9*0.3 + 8*0.2 + 7*0.5 = 2.7 + 1.6 + 3.5 = 7.8 → 78
    expect(r.score100).toBeCloseTo(78, 2);
  });

  it('không có cấu hình thì dùng mặc định 20/15/65', () => {
    const r = computeCouncilReport(rows, CRITERIA, 'pgd', null);
    // 9*0.2 + 8*0.15 + 7*0.65 = 7.55 → 75.5
    expect(r.score100).toBeCloseTo(75.5, 2);
  });

  it('cấu hình thiếu nhóm nào thì nhóm đó rơi về mặc định', () => {
    const scheme = resolveWeightScheme('truong_phong', { truong_phong: { giam_doc: 25 } });
    expect(scheme.giam_doc).toBeCloseTo(0.25, 5);
    expect(scheme.pgd_phu_trach).toBeCloseTo(0.1, 5);
    expect(scheme.thanh_vien).toBeCloseTo(0.55, 5);
  });
});

describe('kịch bản đối chiếu chéo với SQL trên database (06-07/07/2026)', () => {
  // Cùng bộ số đã bơm vào DB thật và tính độc lập bằng SQL: kết quả SQL = 74.8750.
  // Test này bảo đảm thư viện của app cho ra ĐÚNG con số đó.
  const alt = (a: number, b: number) => [a, b, a, b, a, b, a, b, a, b];
  const rows: ReportEvaluationRow[] = [
    row('#gd', 'giam_doc', alt(9, 9)),                    // GĐ: TB 9.0
    row('#sup', 'pho_giam_doc', alt(8, 9), true),         // PGĐ phụ trách: TB 8.5
    row('#pgd1', 'pho_giam_doc', alt(7, 7)),              // PGĐ khác: 7.0
    row('#pgd2', 'pho_giam_doc', alt(8, 8)),              // PGĐ khác: 8.0 -> nhóm 7.5
    row('#tv1', 'thanh_vien', alt(6, 7)),                 // TV: 6.5
    row('#tv2', 'thanh_vien', alt(7, 7)),                 // TV: 7.0 -> nhóm 6.75
  ];

  it('khớp kết quả SQL độc lập: 74.875 điểm (9*20% + 8.5*10% + 7.5*15% + 6.75*55%)', () => {
    const r = computeCouncilReport(rows, CRITERIA, 'truong_phong');
    const byBucket = Object.fromEntries(r.buckets.map((b) => [b.bucket, b]));
    expect(byBucket.giam_doc.rawAvg).toBeCloseTo(9, 5);
    expect(byBucket.pgd_phu_trach.rawAvg).toBeCloseTo(8.5, 5);
    expect(byBucket.pgd_khac.rawAvg).toBeCloseTo(7.5, 5);
    expect(byBucket.thanh_vien.rawAvg).toBeCloseTo(6.75, 5);
    expect(r.totalWeightPresent).toBeCloseTo(1, 5);
    expect(r.score100).toBeCloseTo(74.875, 4);
  });

  it('phiếu thiếu điểm một tiêu chí: TB thô tính trên các tiêu chí ĐÃ chấm', () => {
    const partial: ReportEvaluationRow = {
      ...row('#p', 'thanh_vien', Array(10).fill(8)),
      scores: { c1: 10, c2: 6 }, // chỉ chấm 2/10 tiêu chí
    };
    expect(rawAverage(partial.scores, CRITERIA)).toBeCloseTo(8, 5);
  });

  it('tiêu chí đã ẩn (inactive) bị loại khỏi tính điểm', () => {
    const r1 = computeCouncilReport(rows, CRITERIA, 'truong_phong');
    // Nếu tiêu chí c10 bị ẩn thì chỉ tính trên 9 tiêu chí còn lại
    const r2 = computeCouncilReport(rows, CRITERIA.slice(0, 9), 'truong_phong');
    // Với dữ liệu xen kẽ a,b: bỏ c10 (giá trị b) làm TB thay đổi khi a != b
    expect(r2.score100).not.toBeNull();
    expect(r1.score100).not.toBeCloseTo(r2.score100!, 4);
  });
});

describe('khái niệm "PGĐ khác": 2 PGĐ tổng 15% — mỗi người 7,5%', () => {
  // Đánh giá 1 PGĐ, còn 2 PGĐ khác bỏ phiếu với điểm khác nhau (8 và 6)
  const rows: ReportEvaluationRow[] = [
    row('#gd', 'giam_doc', Array(10).fill(9)),
    row('#pgd-a', 'pho_giam_doc', Array(10).fill(8)),
    row('#pgd-b', 'pho_giam_doc', Array(10).fill(6)),
    row('#tv', 'thanh_vien', Array(10).fill(7)),
  ];

  it('điểm nhóm × 15% ≡ mỗi phiếu PGĐ × 7,5% (tương đương toán học)', () => {
    const r = computeCouncilReport(rows, CRITERIA, 'pgd');
    const pgdGroup = r.buckets.find((b) => b.bucket === 'pgd_khac')!;
    // Cách 1 (app đang dùng): trung bình nhóm (8+6)/2 = 7 rồi × 15%
    expect(pgdGroup.rawAvg).toBeCloseTo(7, 5);
    expect(pgdGroup.contribution).toBeCloseTo(7 * 0.15, 5);
    // Cách 2 (khái niệm mỗi người 7,5%): 8×7,5% + 6×7,5% = 1.05 — phải bằng nhau
    expect(pgdGroup.contribution).toBeCloseTo(8 * 0.075 + 6 * 0.075, 10);
    // Tổng: 9×20% + 7×15% + 7×65% = 1.8 + 1.05 + 4.55 = 7.4 → 74
    expect(r.score100).toBeCloseTo(74, 5);
  });

  it('effectiveRowWeight: trọng số thực mỗi phiếu PGĐ = 15%/2 = 7,5%', () => {
    const r = computeCouncilReport(rows, CRITERIA, 'pgd');
    expect(effectiveRowWeight(rows[1], 'pgd', r.buckets)).toBeCloseTo(0.075, 10);
    expect(effectiveRowWeight(rows[2], 'pgd', r.buckets)).toBeCloseTo(0.075, 10);
    // GĐ 1 phiếu giữ nguyên 20%; thành viên 1 phiếu giữ nguyên 65%
    expect(effectiveRowWeight(rows[0], 'pgd', r.buckets)).toBeCloseTo(0.2, 10);
    expect(effectiveRowWeight(rows[3], 'pgd', r.buckets)).toBeCloseTo(0.65, 10);
  });

  it('tổng trọng số thực của mọi phiếu = 100% khi đủ các nhóm', () => {
    const r = computeCouncilReport(rows, CRITERIA, 'pgd');
    const total = rows.reduce((acc, x) => acc + effectiveRowWeight(x, 'pgd', r.buckets), 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe('sectionAverage — điểm TB theo Phần (Năng lực / Hiệu quả)', () => {
  it('lấy TB các tiêu chí thuộc phần, bỏ tiêu chí chưa chấm', () => {
    const rows: ReportEvaluationRow[] = [
      row('#1', 'giam_doc', [9, 7, 5, 3, 1, 8, 8, 8, 8, 8]),
      row('#2', 'thanh_vien', [7, 9, 5, 5, 3, 6, 6, 6, 6, 6]),
    ];
    // Phần I = c1..c5: TB từng TC = 8,8,5,4,2 -> TB phần = (8+8+5+4+2)/5 = 5.4
    expect(sectionAverage(rows, ['c1', 'c2', 'c3', 'c4', 'c5'])).toBeCloseTo(5.4, 5);
    // Phần II = c6..c10: TB từng TC = 7,7,7,7,7 -> 7
    expect(sectionAverage(rows, ['c6', 'c7', 'c8', 'c9', 'c10'])).toBeCloseTo(7, 5);
  });
  it('trả null khi không có tiêu chí nào được chấm', () => {
    expect(sectionAverage([], ['c1', 'c2'])).toBeNull();
  });
});

describe('computeCriterionAverages — điểm TB từng tiêu chí (radar/phân tích)', () => {
  it('tính TB theo tiêu chí và bỏ qua tiêu chí chưa ai chấm', () => {
    const rows: ReportEvaluationRow[] = [
      row('#1', 'giam_doc', [9, 7, 5, 3, 1, 9, 7, 5, 3, 1]),
      row('#2', 'thanh_vien', [7, 9, 5, 5, 3, 7, 9, 5, 5, 3]),
    ];
    const avgs = computeCriterionAverages(rows, [...CRITERIA, 'c_moi']);
    expect(avgs.get('c1')).toBeCloseTo(8, 5);
    expect(avgs.get('c2')).toBeCloseTo(8, 5);
    expect(avgs.get('c5')).toBeCloseTo(2, 5);
    expect(avgs.has('c_moi')).toBe(false);
  });
});

describe('extremeScoreCriteria — chấm rất cao/rất thấp phải kèm minh chứng', () => {
  it('bắt các tiêu chí chấm 10 hoặc <= 3 (thang 10 nấc)', () => {
    const scores = { c1: 10, c2: 3, c3: 8, c4: 9, c5: 1 };
    expect(extremeScoreCriteria(scores, ['c1', 'c2', 'c3', 'c4', 'c5'])).toEqual(['c1', 'c2', 'c5']);
  });
});

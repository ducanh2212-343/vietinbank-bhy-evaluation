import { describe, expect, it } from 'vitest';
import {
  computeCouncilReport,
  extremeScoreCriteria,
  rawAverage,
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

describe('extremeScoreCriteria — chấm rất cao/rất thấp phải kèm minh chứng', () => {
  it('bắt các tiêu chí chấm 10 hoặc <= 3 (thang 10 nấc)', () => {
    const scores = { c1: 10, c2: 3, c3: 8, c4: 9, c5: 1 };
    expect(extremeScoreCriteria(scores, ['c1', 'c2', 'c3', 'c4', 'c5'])).toEqual(['c1', 'c2', 'c5']);
  });
});

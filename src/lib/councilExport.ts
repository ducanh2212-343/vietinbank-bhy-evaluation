// Xuất Excel kết quả đánh giá đầu mối: sheet Tổng hợp (mỗi đầu mối một dòng)
// + sheet Chi tiết (mỗi phiếu ẩn danh một dòng). Lazy-import xlsx như các trang khác.
import {
  MEMBER_GROUP_LABELS, WEIGHT_BUCKET_LABELS, formatPercent, resolveWeightScheme, weightBucketOf,
  type CouncilReportSummary, type CouncilSubjectLevel, type CouncilWeightConfig,
  type ReportEvaluationRow, type WeightBucket,
} from '@/lib/council';

const BUCKET_ORDER: WeightBucket[] = ['giam_doc', 'pgd_phu_trach', 'pgd_khac', 'thanh_vien'];

export interface CouncilExportItem {
  subjectName: string;
  position: string | null;
  subjectLevel: CouncilSubjectLevel;
  submittedCount: number;
  totalMembers: number;
  evaluations: ReportEvaluationRow[];
  summary: CouncilReportSummary;
}

export interface CouncilExportCriterion { id: string; title: string; }

const round2 = (v: number | null | undefined): number | string =>
  v == null || !Number.isFinite(v) ? '' : Math.round(v * 100) / 100;

export async function exportCouncilExcel(
  roundName: string,
  criteria: CouncilExportCriterion[],
  items: CouncilExportItem[],
  weightConfig: CouncilWeightConfig | null,
): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Tổng hợp theo đầu mối (cột nhóm cố định để trộn được cấp PGĐ và cấp TP)
  const summaryRows: (string | number)[][] = [
    [`BIÊN BẢN TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ CÔNG TÁC ĐẦU MỐI — KỲ ${roundName.toUpperCase()}`],
    [],
    ['STT', 'Cán bộ đầu mối', 'Chức vụ', 'Số phiếu', 'Điểm quy thang 100', 'Tổng trọng số hiện có',
      ...BUCKET_ORDER.map((b) => `Điểm nhóm: ${WEIGHT_BUCKET_LABELS[b]}`)],
  ];
  items.forEach((item, i) => {
    summaryRows.push([
      i + 1,
      item.subjectName,
      item.position || '',
      `${item.submittedCount}/${item.totalMembers}`,
      round2(item.summary.score100),
      formatPercent(item.summary.totalWeightPresent),
      ...BUCKET_ORDER.map((bucket) => {
        const b = item.summary.buckets.find((x) => x.bucket === bucket);
        return b && b.votes > 0 ? round2(b.rawAvg) : '';
      }),
    ]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1['!cols'] = [{ wch: 5 }, { wch: 26 }, { wch: 26 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, ...BUCKET_ORDER.map(() => ({ wch: 26 }))];
  XLSX.utils.book_append_sheet(wb, ws1, 'Tổng hợp');

  // Sheet 2 — Chi tiết từng phiếu (ẩn danh)
  const detailHeader = [
    'Cán bộ đầu mối', 'Mã phiếu ẩn danh', 'Nhóm đánh giá', 'Trọng số',
    ...criteria.map((_, i) => `TC${i + 1}`),
    'TB thô', 'Ưu điểm', 'Hạn chế', 'Đề xuất', 'Minh chứng',
  ];
  const detailRows: (string | number)[][] = [detailHeader];
  for (const item of items) {
    const scheme = resolveWeightScheme(item.subjectLevel, weightConfig);
    for (const ev of item.evaluations) {
      const evidence = [
        ...criteria.map((c, i) => (ev.evidences?.[c.id] ? `TC${i + 1}: ${ev.evidences[c.id]}` : null)).filter(Boolean),
        ev.evidence,
      ].filter(Boolean).join(' | ');
      detailRows.push([
        item.subjectName,
        ev.anon_code,
        MEMBER_GROUP_LABELS[ev.member_group] + (ev.is_supervisor ? ' (PGĐ phụ trách)' : ''),
        formatPercent(scheme[weightBucketOf(ev, item.subjectLevel)] ?? 0),
        ...criteria.map((c) => (ev.scores[c.id] != null ? Number(ev.scores[c.id]) : '')),
        round2(item.summary.rowAverages.get(ev.anon_code)),
        ev.strengths || '',
        ev.weaknesses || '',
        ev.suggestions || '',
        evidence,
      ]);
    }
  }
  const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
  ws2['!cols'] = [
    { wch: 24 }, { wch: 12 }, { wch: 30 }, { wch: 9 },
    ...criteria.map(() => ({ wch: 5 })),
    { wch: 8 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Chi tiết phiếu');

  // Sheet 3 — Danh mục tiêu chí (để tra cứu TC1..TCn)
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['Mã', 'Tên tiêu chí'],
    ...criteria.map((c, i) => [`TC${i + 1}`, c.title]),
  ]);
  ws3['!cols'] = [{ wch: 6 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Tiêu chí');

  const safeName = roundName.replace(/[^\p{L}\p{N}]+/gu, '-');
  XLSX.writeFile(wb, `danh-gia-dau-moi-${safeName}.xlsx`);
}

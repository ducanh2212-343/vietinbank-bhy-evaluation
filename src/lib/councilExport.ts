// Xuất Excel kết quả đánh giá đầu mối — ẩn danh toàn diện:
// KHÔNG xuất điểm từng phiếu hay điểm theo nhóm vị trí (tránh lộ ai chấm bao nhiêu).
// Chỉ xuất: điểm thang 100, điểm TB theo từng tiêu chí (tổng hợp), và nhận xét gộp.
import {
  computeCriterionAverages, formatPercent,
  type CouncilReportSummary, type CouncilSubjectLevel,
  type ReportEvaluationRow,
} from '@/lib/council';

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
): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const critIds = criteria.map((c) => c.id);
  const idxOf = new Map(criteria.map((c, i) => [c.id, i]));

  // Sheet 1 — Tổng hợp: điểm thang 100 + điểm TB từng tiêu chí (ẩn danh)
  const header1 = [
    'STT', 'Cán bộ đầu mối', 'Chức vụ', 'Số phiếu', 'Điểm quy thang 100', 'Tổng trọng số hiện có',
    ...criteria.map((_, i) => `TC${i + 1}`),
  ];
  const summaryRows: (string | number)[][] = [
    [`BẢNG TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ CÔNG TÁC ĐẦU MỐI — KỲ ${roundName.toUpperCase()}`],
    ['Điểm chấm của từng thành viên/nhóm được ẩn danh; chỉ hiển thị điểm trung bình tổng hợp.'],
    [],
    header1,
  ];
  items.forEach((item, i) => {
    const avgs = computeCriterionAverages(item.evaluations, critIds);
    summaryRows.push([
      i + 1,
      item.subjectName,
      item.position || '',
      `${item.submittedCount}/${item.totalMembers}`,
      round2(item.summary.score100),
      formatPercent(item.summary.totalWeightPresent),
      ...criteria.map((c) => (avgs.has(c.id) ? round2(avgs.get(c.id)) : '')),
    ]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1['!cols'] = [{ wch: 5 }, { wch: 26 }, { wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, ...criteria.map(() => ({ wch: 6 }))];
  XLSX.utils.book_append_sheet(wb, ws1, 'Tổng hợp');

  // Sheet 2 — Nhận xét & góp ý gộp (ẩn danh, không gắn người chấm)
  const detailRows: (string | number)[][] = [['Cán bộ đầu mối', 'Ưu điểm nổi bật', 'Mặt hạn chế', 'Đề xuất phát triển', 'Minh chứng ghi nhận']];
  for (const item of items) {
    const s: string[] = [], w: string[] = [], g: string[] = [], e: string[] = [];
    for (const ev of item.evaluations) {
      if (ev.strengths?.trim()) s.push(`• ${ev.strengths.trim()}`);
      if (ev.weaknesses?.trim()) w.push(`• ${ev.weaknesses.trim()}`);
      if (ev.suggestions?.trim()) g.push(`• ${ev.suggestions.trim()}`);
      if (ev.evidences) {
        for (const [cid, txt] of Object.entries(ev.evidences)) {
          if (txt?.trim()) e.push(`• TC${(idxOf.get(cid) ?? 0) + 1}: ${txt.trim()}`);
        }
      }
      if (ev.evidence?.trim()) e.push(`• ${ev.evidence.trim()}`);
    }
    detailRows.push([item.subjectName, s.join('\n'), w.join('\n'), g.join('\n'), e.join('\n')]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
  ws2['!cols'] = [{ wch: 24 }, { wch: 45 }, { wch: 45 }, { wch: 45 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Nhận xét tổng hợp');

  // Sheet 3 — Danh mục tiêu chí (tra cứu TC1..TCn)
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['Mã', 'Tên tiêu chí'],
    ...criteria.map((c, i) => [`TC${i + 1}`, c.title]),
  ]);
  ws3['!cols'] = [{ wch: 6 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Tiêu chí');

  const safeName = roundName.replace(/[^\p{L}\p{N}]+/gu, '-');
  XLSX.writeFile(wb, `danh-gia-dau-moi-${safeName}.xlsx`);
}

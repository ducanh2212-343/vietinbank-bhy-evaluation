// Xuất biểu mẫu BM01 tự đánh giá ra Word
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType, PageOrientation } from 'docx';
import { saveAs } from 'file-saver';
import type { CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';
import type { AttitudeAssessment } from '@/components/evaluation/EvalSectionC';
import { ATTITUDE_FOCUS_OPTIONS } from '@/components/evaluation/attitudeFocusOptions';

const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const cellBorders = { top: border, bottom: border, left: border, right: border };

const ONE_ON_ONE_QUESTIONS_EXPORT: { key: string; text: string }[] = [
  { key: 'q1', text: 'Đâu là công việc bạn đã làm tốt nhất từ đầu năm đến nay?' },
  { key: 'q2', text: 'Đâu là công việc bạn nghĩ mình có thể làm tốt hơn những gì đã thực hiện từ đầu năm đến nay? Lý do?' },
  { key: 'q3', text: 'Đâu là công việc/năng lực bạn nghĩ trong 5 tháng vừa qua mình đã có sự tiến bộ so với các năm trước? Tại sao bạn đánh giá như vậy?' },
  { key: 'q4', text: 'Bạn đã làm gì để hỗ trợ cho đồng nghiệp hoặc cho cả nhóm đạt được kết quả công việc tốt hơn?' },
  { key: 'q5', text: 'Đâu là năng lực (kiến thức, kỹ năng, khả năng, tố chất) mà bạn cho rằng đó là thế mạnh của mình? Bạn mong muốn được phát huy thế mạnh nào hơn nữa trong công việc hiện tại? Bạn cần sự hỗ trợ gì của lãnh đạo để phát huy được năng lực đó?' },
  { key: 'q6', text: 'Đâu là những năng lực mà bạn cho rằng mình cần cải thiện để làm tốt hơn vị trí công việc hiện tại và/hoặc đạt được vị trí công việc mà bạn mơ ước? Bạn cần sự hỗ trợ gì của lãnh đạo để cải thiện được năng lực đó?' },
  { key: 'q7', text: 'Bạn có đề xuất gì để phòng/nhóm của bạn làm việc hiệu quả hơn?' },
  { key: 'q8', text: 'Mục tiêu công việc của bạn trong 3-5 năm tới là gì? Bạn cần lãnh đạo hỗ trợ gì để đạt được mục tiêu đó?' },
];

const ATTITUDE_LABEL: Record<string, string> = {
  noi_bat: 'Nổi bật',
  dat_mong_doi: 'Đạt mong đợi',
  can_cai_thien: 'Cần cải thiện',
  // legacy
  dat: 'Đạt',
  chua_dat: 'Chưa đạt',
};

const IMPROVEMENT_STATUS_LABEL: Record<string, string> = {
  not_started: 'Chưa bắt đầu',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn thành',
};

function focusLabels(dimId: number, codes: string[] | undefined, other: string | undefined): string {
  if (!codes || codes.length === 0) return '';
  const opts = ATTITUDE_FOCUS_OPTIONS[dimId] || [];
  return codes
    .map(c => (c === 'other' ? (other?.trim() || 'Khác') : (opts.find(o => o.code === c)?.label || c)))
    .join(' • ');
}

function p(text: string, opts: { bold?: boolean; size?: number; align?: any } = {}) {
  return new Paragraph({
    alignment: opts.align,
    children: [new TextRun({ text: text || '', bold: opts.bold, size: opts.size ?? 22 })],
  });
}

function cell(text: string, opts: { bold?: boolean; shade?: string; width?: number; align?: any } = {}) {
  return new TableCell({
    borders: cellBorders,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shade ? { fill: opts.shade, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [p(text, { bold: opts.bold, align: opts.align })],
  });
}

export interface BM01ExportData {
  profile: {
    full_name?: string;
    employee_code?: string;
    pos_name?: string;
    dept_name?: string;
    manager_name?: string;
  };
  cycleName: string;
  coreAssessments: CoreSkillAssessment[];
  supplementaryAssessments?: CoreSkillAssessment[];
  attitudeAssessments: AttitudeAssessment[];
  isManagerView?: boolean;
  oneOnOne?: {
    enabled: boolean;
    answers: Record<string, { employee: string; manager: string }>;
  };
}

export async function exportBM01ToWord(data: BM01ExportData) {
  const { profile, cycleName, coreAssessments, attitudeAssessments } = data;
  const supplementaryAssessments = data.supplementaryAssessments || [];

  const skillRows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell('TT', { bold: true, shade: 'E7E6E6', width: 500, align: AlignmentType.CENTER }),
        cell('Skill lõi', { bold: true, shade: 'E7E6E6', width: 3200 }),
        cell('L_min', { bold: true, shade: 'E7E6E6', width: 700, align: AlignmentType.CENTER }),
        cell('L_adv', { bold: true, shade: 'E7E6E6', width: 700, align: AlignmentType.CENTER }),
        cell('Tự ĐG', { bold: true, shade: 'E7E6E6', width: 800, align: AlignmentType.CENTER }),
        cell('QL ĐG', { bold: true, shade: 'E7E6E6', width: 800, align: AlignmentType.CENTER }),
        cell('Minh chứng', { bold: true, shade: 'E7E6E6', width: 2560 }),
        cell('Nhận xét NV', { bold: true, shade: 'E7E6E6', width: 2550 }),
        cell('Nhận xét QL', { bold: true, shade: 'E7E6E6', width: 2550 }),
      ],
    }),
    ...coreAssessments.map((a, i) => new TableRow({
      children: [
        cell(String(i + 1), { align: AlignmentType.CENTER }),
        cell(`${a.skill_code ? a.skill_code + '. ' : ''}${a.skill_name}`),
        cell(`L${a.minimum_level}`, { align: AlignmentType.CENTER }),
        cell(`L${a.advanced_level}`, { align: AlignmentType.CENTER }),
        cell(a.self_assessed_level == null ? '—' : `L${a.self_assessed_level}`, { align: AlignmentType.CENTER }),
        cell(a.manager_assessed_level == null ? '—' : `L${a.manager_assessed_level}`, { align: AlignmentType.CENTER }),
        cell(a.evidence || ''),
        cell(a.employee_comment || ''),
        cell(a.manager_note || ''),
      ],
    })),
  ];

  const suppRows = supplementaryAssessments.length ? [
    new TableRow({
      tableHeader: true,
      children: [
        cell('TT', { bold: true, shade: 'EDE7F6', width: 500, align: AlignmentType.CENTER }),
        cell('Skill bổ trợ (ngoài chuẩn vị trí)', { bold: true, shade: 'EDE7F6', width: 3800 }),
        cell('Tự ĐG', { bold: true, shade: 'EDE7F6', width: 800, align: AlignmentType.CENTER }),
        cell('QL ĐG', { bold: true, shade: 'EDE7F6', width: 800, align: AlignmentType.CENTER }),
        cell('Minh chứng', { bold: true, shade: 'EDE7F6', width: 3000 }),
        cell('Nhận xét NV', { bold: true, shade: 'EDE7F6', width: 2730 }),
        cell('Nhận xét QL', { bold: true, shade: 'EDE7F6', width: 2730 }),
      ],
    }),
    ...supplementaryAssessments.map((a, i) => new TableRow({
      children: [
        cell(String(i + 1), { align: AlignmentType.CENTER }),
        cell(`${a.skill_code ? a.skill_code + '. ' : ''}${a.skill_name}`),
        cell(a.self_assessed_level == null ? '—' : `L${a.self_assessed_level}`, { align: AlignmentType.CENTER }),
        cell(a.manager_assessed_level == null ? '—' : `L${a.manager_assessed_level}`, { align: AlignmentType.CENTER }),
        cell(a.evidence || ''),
        cell(a.employee_comment || ''),
        cell(a.manager_note || ''),
      ],
    })),
  ] : [];


  const attitudeRows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell('TT', { bold: true, shade: 'E7E6E6', width: 500, align: AlignmentType.CENTER }),
        cell('Nhóm thái độ', { bold: true, shade: 'E7E6E6', width: 2400 }),
        cell('Tự ĐG', { bold: true, shade: 'E7E6E6', width: 1000, align: AlignmentType.CENTER }),
        cell('QL ĐG', { bold: true, shade: 'E7E6E6', width: 1000, align: AlignmentType.CENTER }),
        cell('Minh chứng / biểu hiện hiện tại', { bold: true, shade: 'E7E6E6', width: 2600 }),
        cell('Điểm cần cải thiện chính', { bold: true, shade: 'E7E6E6', width: 2000 }),
        cell('Hành động cải thiện', { bold: true, shade: 'E7E6E6', width: 2200 }),
        cell('Thời hạn', { bold: true, shade: 'E7E6E6', width: 800, align: AlignmentType.CENTER }),
        cell('Kết quả/Bằng chứng', { bold: true, shade: 'E7E6E6', width: 1860 }),
      ],
    }),
    ...attitudeAssessments.map((a, i) => new TableRow({
      children: [
        cell(String(i + 1), { align: AlignmentType.CENTER }),
        cell(a.attitude_name),
        cell(ATTITUDE_LABEL[a.self_status] || '—', { align: AlignmentType.CENTER }),
        cell(ATTITUDE_LABEL[a.manager_status] || '—', { align: AlignmentType.CENTER }),
        cell(a.evidence_text || a.current_status || ''),
        cell(focusLabels(a.attitude_dimension_id, a.improvement_focus, a.improvement_focus_other)),
        cell(a.improvement_action || a.improvement_goal || ''),
        cell(a.improvement_deadline || '', { align: AlignmentType.CENTER }),
        cell([
          a.expected_evidence || '',
          a.support_needed ? `Hỗ trợ: ${a.support_needed}` : '',
          a.improvement_status ? `Trạng thái: ${IMPROVEMENT_STATUS_LABEL[a.improvement_status] || a.improvement_status}` : '',
        ].filter(Boolean).join('\n')),
      ],
    })),
  ];


  // Build 1-1 Q&A appendix children (only if enabled)
  const oneOnOneChildren: any[] = [];
  if (data.oneOnOne?.enabled) {
    oneOnOneChildren.push(
      new Paragraph({ children: [new TextRun({ text: '' })] }),
      p('PHỤ LỤC — CÂU HỎI TRAO ĐỔI 1-1', { bold: true, size: 24 }),
    );
    ONE_ON_ONE_QUESTIONS_EXPORT.forEach((q, idx) => {
      const ans = data.oneOnOne!.answers[q.key] || { employee: '', manager: '' };
      oneOnOneChildren.push(
        new Table({
          width: { size: 14360, type: WidthType.DXA },
          columnWidths: [7180, 7180],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({
                  borders: cellBorders,
                  shading: { fill: 'E7E6E6', type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  columnSpan: 2,
                  width: { size: 14360, type: WidthType.DXA },
                  children: [p(`${idx + 1}. ${q.text}`, { bold: true })],
                }),
              ],
            }),
            new TableRow({
              children: [
                cell('Đánh giá của cán bộ', { bold: true, shade: 'F2F2F2', width: 7180 }),
                cell('Ý kiến của CBQL/lãnh đạo', { bold: true, shade: 'F2F2F2', width: 7180 }),
              ],
            }),
            new TableRow({
              children: [
                cell(ans.employee || '—', { width: 7180 }),
                cell(ans.manager || '—', { width: 7180 }),
              ],
            }),
          ],
        }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
      );
    });
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 15840, height: 12240, orientation: PageOrientation.LANDSCAPE },
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'BM01 — TỰ ĐÁNH GIÁ NĂNG LỰC', bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: cycleName, italics: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        p(`Họ tên: ${profile.full_name || ''}     Mã CB: ${profile.employee_code || ''}`),
        p(`Vị trí: ${profile.pos_name || ''}     Đơn vị: ${profile.dept_name || ''}`),
        p(`Quản lý trực tiếp: ${profile.manager_name || ''}`),
        new Paragraph({ children: [new TextRun({ text: '' })] }),

        p('A. ĐÁNH GIÁ KỸ NĂNG LÕI THEO VỊ TRÍ', { bold: true, size: 24 }),
        new Table({
          width: { size: 14360, type: WidthType.DXA },
          columnWidths: [500, 3200, 700, 700, 800, 800, 2560, 2550, 2550],
          rows: skillRows,
        }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),

        ...(suppRows.length ? [
          p('A2. SKILL BỔ TRỢ (NGOÀI CHUẨN VỊ TRÍ)', { bold: true, size: 24 }),
          new Table({
            width: { size: 14360, type: WidthType.DXA },
            columnWidths: [500, 3800, 800, 800, 3000, 2730, 2730],
            rows: suppRows,
          }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
        ] : []),

        p('B. ĐÁNH GIÁ 6 NHÓM THÁI ĐỘ', { bold: true, size: 24 }),
        new Table({
          width: { size: 14360, type: WidthType.DXA },
          columnWidths: [500, 2400, 1000, 1000, 2600, 2000, 2200, 800, 1860],
          rows: attitudeRows,
        }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),

        ...oneOnOneChildren,

        new Paragraph({ children: [new TextRun({ text: '' })] }),



        new Table({
          width: { size: 14360, type: WidthType.DXA },
          columnWidths: [7180, 7180],
          rows: [new TableRow({ children: [
            new TableCell({ borders: cellBorders, margins: { top: 600, bottom: 600, left: 120, right: 120 },
              children: [p('Người tự đánh giá', { bold: true, align: AlignmentType.CENTER }), p('(Ký, ghi rõ họ tên)', { align: AlignmentType.CENTER })] }),
            new TableCell({ borders: cellBorders, margins: { top: 600, bottom: 600, left: 120, right: 120 },
              children: [p('Quản lý trực tiếp', { bold: true, align: AlignmentType.CENTER }), p('(Ký, ghi rõ họ tên)', { align: AlignmentType.CENTER })] }),
          ] })],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBlob(doc);
  const safeName = (profile.full_name || 'CanBo').replace(/\s+/g, '_');
  const safeCycle = cycleName.replace(/[\/\s]+/g, '_');
  saveAs(buffer, `BM01_${safeName}_${safeCycle}.docx`);
}

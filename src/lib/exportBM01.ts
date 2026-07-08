// Xuất biểu mẫu đánh giá năng lực ra Word — dạng MẪU IN đầy đủ theo quy trình:
// luôn hiển thị đủ các mục (trống thì chừa chỗ ghi tay), trường văn bản dài
// được bố trí khối rộng toàn trang thay vì cột hẹp.
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType, PageOrientation, TableLayoutType } from 'docx';
import { saveAs } from 'file-saver';
import type { CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';
import type { AttitudeAssessment } from '@/components/evaluation/EvalSectionC';
import { DEFAULT_ONE_ON_ONE_QUESTIONS, type OneOnOneQuestion } from '@/lib/oneOnOneDefaults';
import { LEVEL_LABELS } from '@/lib/skillLevels';
import { ATTITUDE_LABEL, IMPROVEMENT_STATUS_LABEL, focusLabels, fmtSignDate } from '@/lib/exportBM01Labels';

const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const cellBorders = { top: border, bottom: border, left: border, right: border };

// Khổ A4 nằm ngang: 16838 x 11906 DXA, lề 1cm (567) mỗi bên → vùng in ≈ 15704.
// Giữ bảng ở 15300 để luôn còn lề an toàn, tránh tràn/cắt cột phải khi in.
const PAGE_A4_LANDSCAPE_W = 16838;
const PAGE_A4_LANDSCAPE_H = 11906;
const PAGE_MARGIN = 567;
const PAGE_W = 15300; // bề rộng nội dung bảng (DXA) — nhỏ hơn vùng in để chừa lề an toàn

/** Mức năng lực dạng chữ rõ nghĩa cho bản in (thay cho ký hiệu L1/L2…) */
const fmtLevel = (n: number | null | undefined) => (n == null ? '' : `Mức ${n}`);

function p(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({
    alignment: opts.align,
    children: [new TextRun({ text: text || '', bold: opts.bold, italics: opts.italics, size: opts.size ?? 22 })],
  });
}

function cell(text: string, opts: { bold?: boolean; shade?: string; width?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; columnSpan?: number } = {}) {
  return new TableCell({
    borders: cellBorders,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shade ? { fill: opts.shade, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    columnSpan: opts.columnSpan,
    children: [p(text, { bold: opts.bold, align: opts.align })],
  });
}

/** Dòng "Nhãn: giá trị" — giá trị trống thì chừa 1 dòng trống để ghi tay */
function labeledParas(label: string, value: string | undefined | null): Paragraph[] {
  const v = (value || '').trim();
  const head = new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: v, size: 22 }),
    ],
  });
  return v ? [head] : [head, p('')];
}

/** Ô giá trị thuần: có nội dung thì in, trống thì chừa 2 dòng để ghi tay */
const valueParas = (value: string | undefined | null): Paragraph[] =>
  (value || '').trim() ? [p((value || '').trim())] : [p(''), p('')];

/** Ô khối văn bản rộng (columnSpan) chứa nhiều dòng nhãn */
function detailCell(paras: Paragraph[], columnSpan: number, width: number, shade?: string) {
  return new TableCell({
    borders: cellBorders,
    columnSpan,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: paras.length ? paras : [p('')],
  });
}

export interface OverallReviewExport {
  title: string;
  fields: { label: string; value: string }[];
}

export interface PreviousActionExportItem {
  typeLabel: string;
  actionText: string;
  expectedResult: string;
  actualResult: string;
  selfStatusLabel: string;
  managerStatusLabel: string;
  evidence: string;
  employeeNote: string;
  managerNote: string;
}

export interface SignatureInfo {
  name?: string;
  /** ISO — thời điểm thao tác tương ứng trên hệ thống (nộp / duyệt) */
  date?: string | null;
}

/** Một hành động trong kế hoạch phát triển kỳ tới */
export interface PlanActionExport {
  typeLabel: string;
  actionText: string;
  expectedResult: string;
  deadline: string;
  support: string;
  statusLabel: string;
}

export interface PlanSkillExport {
  skillLabel: string;
  currentLevel: number | null;
  targetLevel: number | null;
  reason: string;
  actions: PlanActionExport[];
}

export interface PlanAttitudeExport {
  name: string;
  issue: string;
  goal: string;
  actions: PlanActionExport[];
}

export interface PlanAiExport extends PlanActionExport {
  linkedLabel: string;
}

/** Kế hoạch phát triển kỳ tới (mục D/E/F trên web) */
export interface BM01PlanExport {
  skills: PlanSkillExport[];
  attitudes: PlanAttitudeExport[];
  ai: PlanAiExport[];
}

/** Dữ liệu bổ sung lấy từ form_submissions (xem lib/exportBM01Data.ts) */
export interface BM01ExportExtras {
  previousActions?: { cycleName?: string; items: PreviousActionExportItem[] };
  oneOnOne?: {
    enabled: boolean;
    answers: Record<string, { employee: string; manager: string }>;
  };
  /** Bộ câu hỏi 1-1 của kỳ (quản trị theo kỳ); thiếu thì dùng bộ mặc định */
  oneOnOneQuestions?: OneOnOneQuestion[];
  /** Kế hoạch phát triển kỳ tới (skill / thái độ / AI) */
  plan?: BM01PlanExport;
  /** Trạng thái phiếu tại thời điểm xuất (draft/submitted/reviewed/approved/closed…) */
  formStatus?: string;
  /** Mã tham chiếu phiếu (formId) để đối chiếu hồ sơ giấy ↔ hệ thống */
  formCode?: string;
  overallReviews?: OverallReviewExport[];
  comments?: { employee?: string; manager?: string; pgd?: string };
  signatures?: {
    employee: SignatureInfo;
    reviewer: SignatureInfo;
    approver: SignatureInfo;
  };
}

export interface BM01ExportData {
  profile: {
    full_name?: string;
    employee_code?: string;
    pos_name?: string;
    dept_name?: string;
    manager_name?: string;
    pgd_name?: string;
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
  extras?: BM01ExportExtras;
}

/** Ô chữ ký: chức danh + hướng dẫn ký + khoảng trống + họ tên + dấu thời gian hệ thống (nếu có) */
function signatureCell(title: string, sig: SignatureInfo | undefined, systemLabel: string, width: number) {
  const children: Paragraph[] = [
    p(title, { bold: true, align: AlignmentType.CENTER }),
    p('(Ký, ghi rõ họ tên)', { align: AlignmentType.CENTER }),
    p('', {}), p('', {}), p('', {}),
    p(sig?.name || '', { bold: true, align: AlignmentType.CENTER }),
  ];
  if (sig?.date) {
    children.push(p(`${systemLabel}: ${fmtSignDate(sig.date)}`, { align: AlignmentType.CENTER, size: 18 }));
  }
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 200, bottom: 200, left: 120, right: 120 },
    children,
  });
}

const spacer = () => new Paragraph({ children: [new TextRun({ text: '' })] });

export async function exportBM01ToWord(data: BM01ExportData) {
  const { profile, cycleName, coreAssessments, attitudeAssessments } = data;
  const supplementaryAssessments = data.supplementaryAssessments || [];
  const extras = data.extras;

  // ===== A. Kỹ năng: mỗi kỹ năng = 1 dòng mức điểm + 1 khối chữ rộng =====
  // Grid: TT 700 | Kỹ năng 8600 | Mức tối thiểu 1500 | Mức mục tiêu 1500 | Tự ĐG 1500 | LĐ ĐG 1500
  const SKILL_GRID = [700, 8600, 1500, 1500, 1500, 1500];
  const skillHeader = new TableRow({
    tableHeader: true,
    children: [
      cell('TT', { bold: true, shade: 'E7E6E6', width: 700, align: AlignmentType.CENTER }),
      cell('Kỹ năng', { bold: true, shade: 'E7E6E6', width: 8600 }),
      cell('Mức tối thiểu', { bold: true, shade: 'E7E6E6', width: 1500, align: AlignmentType.CENTER }),
      cell('Mức mục tiêu', { bold: true, shade: 'E7E6E6', width: 1500, align: AlignmentType.CENTER }),
      cell('Tự đánh giá', { bold: true, shade: 'E7E6E6', width: 1500, align: AlignmentType.CENTER }),
      cell('Lãnh đạo đánh giá', { bold: true, shade: 'E7E6E6', width: 1500, align: AlignmentType.CENTER }),
    ],
  });
  const skillRowsOf = (list: CoreSkillAssessment[], hasLevels: boolean) =>
    list.flatMap((a, i) => [
      new TableRow({
        children: [
          cell(String(i + 1), { align: AlignmentType.CENTER }),
          cell(`${a.skill_code ? a.skill_code + '. ' : ''}${a.skill_name}`, { bold: true }),
          cell(hasLevels ? fmtLevel(a.minimum_level) : '—', { align: AlignmentType.CENTER }),
          cell(hasLevels ? fmtLevel(a.advanced_level) : '—', { align: AlignmentType.CENTER }),
          cell(fmtLevel(a.self_assessed_level), { align: AlignmentType.CENTER }),
          cell(fmtLevel(a.manager_assessed_level), { align: AlignmentType.CENTER }),
        ],
      }),
      new TableRow({
        children: [
          cell('', { width: 700 }),
          detailCell([
            ...labeledParas('Minh chứng', a.evidence),
            ...labeledParas('Nhận xét của cán bộ', a.employee_comment),
            ...labeledParas('Nhận xét của lãnh đạo', a.manager_note),
          ], 5, PAGE_W - 700),
        ],
      }),
    ]);

  // ===== B. Thái độ: dòng chấm + khối kế hoạch cải thiện rộng =====
  const ATT_GRID = [700, 10600, 2000, 2000];
  const attitudeHeader = new TableRow({
    tableHeader: true,
    children: [
      cell('TT', { bold: true, shade: 'E7E6E6', width: 700, align: AlignmentType.CENTER }),
      cell('Nhóm thái độ', { bold: true, shade: 'E7E6E6', width: 10600 }),
      cell('Tự đánh giá', { bold: true, shade: 'E7E6E6', width: 2000, align: AlignmentType.CENTER }),
      cell('Lãnh đạo đánh giá', { bold: true, shade: 'E7E6E6', width: 2000, align: AlignmentType.CENTER }),
    ],
  });
  const attitudeRows = attitudeAssessments.flatMap((a, i) => [
    new TableRow({
      children: [
        cell(String(i + 1), { align: AlignmentType.CENTER }),
        cell(a.attitude_name, { bold: true }),
        cell(ATTITUDE_LABEL[a.self_status] || '', { align: AlignmentType.CENTER }),
        cell(ATTITUDE_LABEL[a.manager_status] || '', { align: AlignmentType.CENTER }),
      ],
    }),
    new TableRow({
      children: [
        cell('', { width: 700 }),
        detailCell([
          ...labeledParas('Minh chứng / biểu hiện hiện tại', a.evidence_text || a.current_status),
          ...labeledParas('Điểm cần cải thiện chính', focusLabels(a.attitude_dimension_id, a.improvement_focus, a.improvement_focus_other)),
          ...labeledParas('Hành động cải thiện', a.improvement_action || a.improvement_goal),
          ...labeledParas('Thời hạn', a.improvement_deadline),
          ...labeledParas('Kết quả / bằng chứng mong đợi', a.expected_evidence),
          ...labeledParas('Hỗ trợ cần thiết', a.support_needed),
          ...labeledParas('Trạng thái thực hiện', a.improvement_status ? (IMPROVEMENT_STATUS_LABEL[a.improvement_status] || a.improvement_status) : ''),
        ], 3, PAGE_W - 700),
      ],
    }),
  ]);

  // ===== C. Rà soát kế hoạch hành động kỳ trước (luôn hiển thị) =====
  const prevItems: PreviousActionExportItem[] = extras?.previousActions?.items.length
    ? extras.previousActions.items
    : Array.from({ length: 3 }, () => ({
        typeLabel: '', actionText: '', expectedResult: '', actualResult: '',
        selfStatusLabel: '', managerStatusLabel: '', evidence: '', employeeNote: '', managerNote: '',
      }));
  const prevHeader = new TableRow({
    tableHeader: true,
    children: [
      cell('TT', { bold: true, shade: 'E7E6E6', width: 700, align: AlignmentType.CENTER }),
      cell('Hành động đã cam kết kỳ trước', { bold: true, shade: 'E7E6E6', width: 10600 }),
      cell('Tự đánh giá', { bold: true, shade: 'E7E6E6', width: 2000, align: AlignmentType.CENTER }),
      cell('Lãnh đạo đánh giá', { bold: true, shade: 'E7E6E6', width: 2000, align: AlignmentType.CENTER }),
    ],
  });
  const prevRows = prevItems.flatMap((it, i) => [
    new TableRow({
      children: [
        cell(String(i + 1), { align: AlignmentType.CENTER }),
        cell(`${it.typeLabel ? `[${it.typeLabel}] ` : ''}${it.actionText}`, { bold: !!it.actionText }),
        cell(it.selfStatusLabel, { align: AlignmentType.CENTER }),
        cell(it.managerStatusLabel, { align: AlignmentType.CENTER }),
      ],
    }),
    new TableRow({
      children: [
        cell('', { width: 700 }),
        detailCell([
          ...labeledParas('Kết quả mong đợi', it.expectedResult),
          ...labeledParas('Kết quả thực tế', it.actualResult),
          ...labeledParas('Bằng chứng', it.evidence),
          ...labeledParas('Ghi chú của cán bộ', it.employeeNote),
          ...labeledParas('Nhận xét của lãnh đạo', it.managerNote),
        ], 3, PAGE_W - 700),
      ],
    }),
  ]);

  // ===== D. Nhận xét & đánh giá tổng thể của lãnh đạo (luôn hiển thị) =====
  const comments = extras?.comments;
  const commentTable = new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [3600, PAGE_W - 3600],
    rows: [
      new TableRow({ children: [
        cell('Ý kiến của cán bộ', { bold: true, shade: 'F2F2F2', width: 3600 }),
        detailCell(valueParas(comments?.employee), 1, PAGE_W - 3600),
      ] }),
      new TableRow({ children: [
        cell('Nhận xét của Trưởng phòng / người đánh giá', { bold: true, shade: 'F2F2F2', width: 3600 }),
        detailCell(valueParas(comments?.manager), 1, PAGE_W - 3600),
      ] }),
      new TableRow({ children: [
        cell('Ý kiến của Phó Giám đốc phụ trách', { bold: true, shade: 'F2F2F2', width: 3600 }),
        detailCell(valueParas(comments?.pgd), 1, PAGE_W - 3600),
      ] }),
    ],
  });

  const OVERALL_FIELD_LABELS = [
    'Điểm mạnh cần phát huy',
    'Điểm cần cải thiện',
    'Trọng tâm phát triển kỳ tới',
    'Ý kiến về lộ trình upskill',
    'Nhận xét thái độ / tinh thần phối hợp',
    'Hỗ trợ / định hướng từ lãnh đạo',
    'Kết luận / định hướng phát triển',
  ];
  const overallByTitle = new Map((extras?.overallReviews || []).map(r => [r.title, r]));
  const defaultOverallTitles = [
    'Đánh giá tổng thể của Trưởng phòng / người đánh giá',
    'Đánh giá tổng thể của Phó Giám đốc phụ trách',
  ];
  // Luôn in bảng của TP và PGĐ; bảng Giám đốc chỉ in khi có nội dung
  const overallTitles = [
    ...defaultOverallTitles,
    ...(extras?.overallReviews || []).map(r => r.title).filter(t => !defaultOverallTitles.includes(t)),
  ];
  const overallTables = overallTitles.flatMap((title) => {
    const rv = overallByTitle.get(title);
    const valueOf = (label: string) => rv?.fields.find(f => f.label === label)?.value || '';
    return [
      new Table({
        width: { size: PAGE_W, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: [3600, PAGE_W - 3600],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [new TableCell({
              borders: cellBorders,
              shading: { fill: 'E7E6E6', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              columnSpan: 2,
              width: { size: PAGE_W, type: WidthType.DXA },
              children: [p(title, { bold: true })],
            })],
          }),
          ...OVERALL_FIELD_LABELS.map((label) => new TableRow({
            children: [
              cell(label, { bold: true, shade: 'F2F2F2', width: 3600 }),
              detailCell(valueParas(valueOf(label)), 1, PAGE_W - 3600),
            ],
          })),
        ],
      }),
      spacer(),
    ];
  });

  // ===== E. Câu hỏi trao đổi 1-1 (luôn hiển thị đủ bộ câu hỏi của kỳ) =====
  const oneOnOne = extras?.oneOnOne || data.oneOnOne;
  const oneOnOneQuestions = extras?.oneOnOneQuestions?.length ? extras.oneOnOneQuestions : DEFAULT_ONE_ON_ONE_QUESTIONS;
  const oneOnOneChildren: (Paragraph | Table)[] = [
    p('E. CÂU HỎI TRAO ĐỔI 1-1 (CÁN BỘ ↔ LÃNH ĐẠO)', { bold: true, size: 24 }),
  ];
  oneOnOneQuestions.forEach((q, idx) => {
    const ans = oneOnOne?.answers?.[q.key] || { employee: '', manager: '' };
    oneOnOneChildren.push(
      new Table({
        width: { size: PAGE_W, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: [PAGE_W / 2, PAGE_W / 2],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                shading: { fill: 'E7E6E6', type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                columnSpan: 2,
                width: { size: PAGE_W, type: WidthType.DXA },
                children: [p(`${idx + 1}. ${q.text}`, { bold: true })],
              }),
            ],
          }),
          new TableRow({
            children: [
              cell('Trả lời của cán bộ', { bold: true, shade: 'F2F2F2', width: PAGE_W / 2 }),
              cell('Ý kiến của lãnh đạo', { bold: true, shade: 'F2F2F2', width: PAGE_W / 2 }),
            ],
          }),
          new TableRow({
            children: [
              detailCell(ans.employee ? [p(ans.employee)] : [p(''), p('')], 1, PAGE_W / 2),
              detailCell(ans.manager ? [p(ans.manager)] : [p(''), p('')], 1, PAGE_W / 2),
            ],
          }),
        ],
      }),
      spacer(),
    );
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_A4_LANDSCAPE_W, height: PAGE_A4_LANDSCAPE_H, orientation: PageOrientation.LANDSCAPE },
          margin: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
        },
      },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'PHIẾU ĐÁNH GIÁ NĂNG LỰC CÁN BỘ (BM01)', bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Kỳ đánh giá: ${cycleName}`, italics: true, size: 24 })] }),
        spacer(),
        p(`Họ tên: ${profile.full_name || ''}${profile.employee_code ? `     Mã cán bộ: ${profile.employee_code}` : ''}`),
        p(`Vị trí: ${profile.pos_name || ''}     Đơn vị: ${profile.dept_name || ''}`),
        p(`Người đánh giá (lãnh đạo trực tiếp): ${extras?.signatures?.reviewer.name || profile.manager_name || ''}`),
        p(`Phó Giám đốc phụ trách: ${extras?.signatures?.approver.name || profile.pgd_name || ''}`),
        spacer(),

        p('A. ĐÁNH GIÁ KỸ NĂNG LÕI THEO VỊ TRÍ', { bold: true, size: 24 }),
        p(`Chú thích mức năng lực: ${[1, 2, 3, 4].map((n) => `Mức ${n} – ${LEVEL_LABELS[n]}`).join(' · ')}. Mức tối thiểu = yêu cầu của vị trí; Mức mục tiêu = mức nâng cao cần hướng tới.`, { italics: true, size: 18 }),
        new Table({
          width: { size: PAGE_W, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: SKILL_GRID,
          rows: [skillHeader, ...skillRowsOf(coreAssessments, true)],
        }),
        spacer(),

        ...(supplementaryAssessments.length ? [
          p('A2. SKILL BỔ TRỢ (NGOÀI CHUẨN VỊ TRÍ)', { bold: true, size: 24 }),
          new Table({
            width: { size: PAGE_W, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            columnWidths: SKILL_GRID,
            rows: [skillHeader, ...skillRowsOf(supplementaryAssessments, false)],
          }),
          spacer(),
        ] : []),

        p('B. ĐÁNH GIÁ 6 NHÓM THÁI ĐỘ & KẾ HOẠCH CẢI THIỆN', { bold: true, size: 24 }),
        new Table({
          width: { size: PAGE_W, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: ATT_GRID,
          rows: [attitudeHeader, ...attitudeRows],
        }),
        spacer(),

        p(`C. RÀ SOÁT KẾ HOẠCH HÀNH ĐỘNG KỲ TRƯỚC${extras?.previousActions?.cycleName ? ` (${extras.previousActions.cycleName})` : ''}`, { bold: true, size: 24 }),
        new Table({
          width: { size: PAGE_W, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: ATT_GRID,
          rows: [prevHeader, ...prevRows],
        }),
        spacer(),

        p('D. NHẬN XÉT & ĐÁNH GIÁ TỔNG THỂ CỦA LÃNH ĐẠO', { bold: true, size: 24 }),
        commentTable,
        spacer(),
        ...overallTables,

        ...oneOnOneChildren,

        spacer(),

        // Thành phần ký theo quy trình: CB tự đánh giá → lãnh đạo đánh giá → PGĐ phê duyệt
        new Table({
          width: { size: PAGE_W, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: [5100, 5100, 5100],
          rows: [new TableRow({ children: [
            signatureCell(
              'CÁN BỘ TỰ ĐÁNH GIÁ',
              { name: extras?.signatures?.employee.name || profile.full_name, date: extras?.signatures?.employee.date },
              'Đã nộp trên hệ thống',
              5100,
            ),
            signatureCell(
              'LÃNH ĐẠO ĐÁNH GIÁ',
              { name: extras?.signatures?.reviewer.name || profile.manager_name, date: extras?.signatures?.reviewer.date },
              'Đã duyệt trên hệ thống',
              5100,
            ),
            signatureCell(
              'PHÓ GIÁM ĐỐC PHÊ DUYỆT',
              { name: extras?.signatures?.approver.name || profile.pgd_name, date: extras?.signatures?.approver.date },
              'Đã phê duyệt trên hệ thống',
              5100,
            ),
          ] })],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBlob(doc);
  const safeName = (profile.full_name || 'CanBo').replace(/\s+/g, '_');
  const safeCycle = cycleName.replace(/[/\s]+/g, '_');
  saveAs(buffer, `BM01_${safeName}_${safeCycle}.docx`);
}

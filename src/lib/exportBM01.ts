// Xuất biểu mẫu đánh giá năng lực ra Word (.docx) — bản in lưu hồ sơ nhân sự:
// luôn hiển thị đủ các mục (trống thì chừa chỗ ghi tay), theo thể thức văn bản
// hành chính (quốc hiệu/tiêu ngữ, số trang), có WATERMARK theo trạng thái phiếu
// (bản nháp/chờ duyệt/trả lại có dấu chìm; chỉ phiếu đã phê duyệt mới in sạch để
// ký chính thức). File .docx nhẹ (KB) nên tải/gộp cả kỳ đều nhanh.
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, PageOrientation, TableLayoutType, Header, Footer, ImageRun,
  PageNumber, HorizontalPositionAlign, VerticalPositionAlign, HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom, type ISectionOptions,
} from 'docx';
import { saveAs } from 'file-saver';
import type { CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';
import type { AttitudeAssessment } from '@/components/evaluation/EvalSectionC';
import { DEFAULT_ONE_ON_ONE_QUESTIONS, type OneOnOneQuestion } from '@/lib/oneOnOneDefaults';
import { LEVEL_LABELS } from '@/lib/skillLevels';
import {
  ATTITUDE_LABEL, IMPROVEMENT_STATUS_LABEL, FORM_STATUS_PRINT_LABEL,
  focusLabels, fmtSignDate, isApprovedFormStatus,
} from '@/lib/exportBM01Labels';

const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const cellBorders = { top: border, bottom: border, left: border, right: border };

// Khổ A4: cạnh ngắn 11906, cạnh dài 16838 DXA. LƯU Ý: thư viện docx TỰ TRÁO
// width/height khi orientation = LANDSCAPE, nên ta phải truyền kích thước khổ DỌC
// (width = cạnh ngắn, height = cạnh dài); sau khi tráo mới ra landscape thật
// (w:w=16838, w:h=11906). Nếu truyền ngược sẽ thành khổ dọc → bảng tràn ra ngoài.
const A4_SHORT = 11906;
const A4_LONG = 16838;
const PAGE_MARGIN = 567; // lề ~1cm mỗi bên → vùng in ngang ≈ 16838 - 1134 = 15704
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

// ===== Lưới cột dùng chung (tổng = PAGE_W = 15300) =====
const SKILL_GRID = [700, 8600, 1500, 1500, 1500, 1500];
const FOUR_GRID = [700, 10600, 2000, 2000];
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const;
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const rutGonMa = (code?: string) => (code || '').replace(/-/g, '').slice(0, 8).toUpperCase();

/** Ô không viền (quốc hiệu, tóm tắt) */
function plainCell(paras: Paragraph[], width: number, align?: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  return new TableCell({
    borders: noBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 20, bottom: 20, left: 40, right: 40 },
    children: paras.length ? paras.map((x) => x) : [p('')],
    verticalAlign: undefined,
  });
}

const sectionTitle = (text: string) => p(text, { bold: true, size: 24 });

// ===== Watermark theo trạng thái phiếu =====
/** Chữ watermark theo trạng thái — dùng chữ NGẮN để không che nội dung khi đọc.
 *  Trả null nếu phiếu đã phê duyệt (in sạch để ký chính thức). */
function watermarkTextForStatus(status?: string): string | null {
  if (isApprovedFormStatus(status)) return null;
  switch (status) {
    case 'submitted': return 'CHỜ DUYỆT';
    case 'returned': return 'TRẢ LẠI';
    default: return 'DRAFT';
  }
}

const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};
// PNG 1×1 trong suốt — fallback khi môi trường không có canvas (test/SSR)
const TRANSPARENT_PNG = b64ToBytes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');

/** Vẽ chữ watermark chéo thành ảnh PNG trong suốt (đỏ nhạt) để nhúng vào header */
function watermarkPng(text: string): Uint8Array {
  try {
    const c = document.createElement('canvas');
    c.width = 1800; c.height = 1100;
    const ctx = c.getContext('2d');
    if (!ctx) return TRANSPARENT_PNG;
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(-Math.atan2(c.height, c.width));
    const size = text.length > 14 ? 120 : 200;
    ctx.font = `bold ${size}px "Times New Roman", serif`;
    ctx.fillStyle = 'rgba(200, 40, 40, 0.10)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    return b64ToBytes(c.toDataURL('image/png').split(',')[1]);
  } catch {
    return TRANSPARENT_PNG;
  }
}

/** Header chứa ảnh watermark chìm sau chữ (lặp mọi trang) — chỉ khi phiếu chưa phê duyệt */
function makeHeader(status?: string): Header | undefined {
  const text = watermarkTextForStatus(status);
  if (!text) return undefined;
  return new Header({
    children: [new Paragraph({
      children: [new ImageRun({
        type: 'png',
        data: watermarkPng(text),
        transformation: { width: 900, height: 550 },
        floating: {
          horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.CENTER },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.CENTER },
          behindDocument: true,
          allowOverlap: true,
        },
      })],
    })],
  });
}

/** Footer: tên biểu mẫu · cán bộ · kỳ · mã phiếu · Trang x/y (đánh lại theo từng phiếu) */
function makeFooter(footerLabel: string): Footer {
  const t = (text: string) => new TextRun({ text, size: 16, color: '666666' });
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        t(`${footerLabel} · Trang `),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '666666' }),
        t('/'),
        new TextRun({ children: [PageNumber.TOTAL_PAGES_IN_SECTION], size: 16, color: '666666' }),
      ],
    })],
  });
}

// ===== Các khối nội dung =====
function headerChildren(data: BM01ExportData, exportedAtText: string): (Paragraph | Table)[] {
  const { profile, cycleName, extras } = data;
  const statusLabel = extras?.formStatus
    ? (FORM_STATUS_PRINT_LABEL[extras.formStatus] || extras.formStatus)
    : 'Chưa lưu trên hệ thống';
  const code = rutGonMa(extras?.formCode);

  // Tóm tắt kết quả
  const skills = data.coreAssessments;
  const assessedOf = (a: CoreSkillAssessment) => a.manager_assessed_level ?? a.self_assessed_level;
  const rated = skills.filter((a) => assessedOf(a) != null);
  const passMin = rated.filter((a) => (assessedOf(a) as number) >= a.minimum_level).length;
  const passAdv = rated.filter((a) => (assessedOf(a) as number) >= a.advanced_level).length;
  const attOf = (a: AttitudeAssessment) => a.manager_status || a.self_status;
  const attCount = (k: string) => data.attitudeAssessments.filter((a) => attOf(a) === k).length;
  const plan = extras?.plan;
  const planActions = plan
    ? plan.skills.reduce((n, s) => n + s.actions.length, 0)
      + plan.attitudes.reduce((n, s) => n + s.actions.length, 0) + plan.ai.length
    : 0;

  const bl = (label: string, value: string) =>
    new Paragraph({ children: [new TextRun({ text: `${label}: `, size: 20 }), new TextRun({ text: value, bold: true, size: 20 })] });

  const quocHieu = new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [PAGE_W / 2, PAGE_W / 2],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [new TableRow({ children: [
      plainCell([
        p('NGÂN HÀNG TMCP CÔNG THƯƠNG VIỆT NAM', { bold: true, align: AlignmentType.CENTER, size: 20 }),
        p('CHI NHÁNH BẮC HƯNG YÊN', { align: AlignmentType.CENTER, size: 20 }),
      ], PAGE_W / 2),
      plainCell([
        p('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { bold: true, align: AlignmentType.CENTER, size: 20 }),
        p('Độc lập - Tự do - Hạnh phúc', { bold: true, align: AlignmentType.CENTER, size: 20 }),
      ], PAGE_W / 2),
    ] })],
  });

  const summary = new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [PAGE_W],
    rows: [new TableRow({ children: [new TableCell({
      borders: cellBorders,
      shading: { fill: 'FAFAFA', type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 160, right: 160 },
      children: [
        p('KẾT QUẢ TỔNG HỢP', { bold: true, size: 20 }),
        new Paragraph({ children: [
          new TextRun({ text: 'Kỹ năng lõi: ', size: 20 }),
          new TextRun({ text: `${passMin}/${skills.length}`, bold: true, size: 20 }),
          new TextRun({ text: ' đạt chuẩn tối thiểu · ', size: 20 }),
          new TextRun({ text: `${passAdv}`, bold: true, size: 20 }),
          new TextRun({ text: ` đạt mức mục tiêu${rated.length < skills.length ? ` · ${skills.length - rated.length} chưa chấm` : ''}`, size: 20 }),
        ] }),
        new Paragraph({ children: [
          new TextRun({ text: 'Thái độ: ', size: 20 }),
          new TextRun({ text: `${attCount('noi_bat')}`, bold: true, size: 20 }),
          new TextRun({ text: ' Nổi bật · ', size: 20 }),
          new TextRun({ text: `${attCount('dat_mong_doi')}`, bold: true, size: 20 }),
          new TextRun({ text: ' Đạt mong đợi · ', size: 20 }),
          new TextRun({ text: `${attCount('can_cai_thien')}`, bold: true, size: 20 }),
          new TextRun({ text: ' Cần cải thiện', size: 20 }),
        ] }),
        new Paragraph({ children: [
          new TextRun({ text: 'Kế hoạch kỳ tới: ', size: 20 }),
          new TextRun({ text: `${plan ? plan.skills.length : 0}`, bold: true, size: 20 }),
          new TextRun({ text: ' kỹ năng ưu tiên · ', size: 20 }),
          new TextRun({ text: `${plan ? plan.attitudes.length : 0}`, bold: true, size: 20 }),
          new TextRun({ text: ' nhóm thái độ · ', size: 20 }),
          new TextRun({ text: `${planActions}`, bold: true, size: 20 }),
          new TextRun({ text: ' hành động cam kết', size: 20 }),
        ] }),
      ],
    })] })],
  });

  return [
    quocHieu,
    new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'PHIẾU ĐÁNH GIÁ NĂNG LỰC CÁN BỘ (BM01)', bold: true, size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Kỳ đánh giá: ${cycleName}`, italics: true, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({
      text: `Mã phiếu: ${code || '—'}  ·  Trạng thái phiếu: ${statusLabel}  ·  Xuất từ hệ thống lúc: ${exportedAtText}`,
      size: 18, color: '333333',
    })] }),
    spacer(),
    bl('Họ tên', `${profile.full_name || ''}${profile.employee_code ? `     Mã cán bộ: ${profile.employee_code}` : ''}`),
    bl('Vị trí', `${profile.pos_name || ''}     Đơn vị: ${profile.dept_name || ''}`),
    bl('Người đánh giá (lãnh đạo trực tiếp)', extras?.signatures?.reviewer.name || profile.manager_name || ''),
    bl('Phó Giám đốc phụ trách', extras?.signatures?.approver.name || profile.pgd_name || ''),
    spacer(),
    summary,
    spacer(),
  ];
}

function skillHeaderRow(): TableRow {
  return new TableRow({
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
}

function skillSection(heading: string, list: CoreSkillAssessment[], hasLevels: boolean, legend?: string): (Paragraph | Table)[] {
  const rows = list.flatMap((a, i) => [
    new TableRow({ children: [
      cell(String(i + 1), { align: AlignmentType.CENTER }),
      cell(`${a.skill_code ? a.skill_code + '. ' : ''}${a.skill_name}`, { bold: true }),
      cell(hasLevels ? fmtLevel(a.minimum_level) : '—', { align: AlignmentType.CENTER }),
      cell(hasLevels ? fmtLevel(a.advanced_level) : '—', { align: AlignmentType.CENTER }),
      cell(fmtLevel(a.self_assessed_level), { align: AlignmentType.CENTER }),
      cell(fmtLevel(a.manager_assessed_level), { align: AlignmentType.CENTER }),
    ] }),
    new TableRow({ children: [
      cell('', { width: 700 }),
      detailCell([
        ...labeledParas('Minh chứng', a.evidence),
        ...labeledParas('Nhận xét của cán bộ', a.employee_comment),
        ...labeledParas('Nhận xét của lãnh đạo', a.manager_note),
      ], 5, PAGE_W - 700),
    ] }),
  ]);
  return [
    sectionTitle(heading),
    ...(legend ? [p(legend, { italics: true, size: 18 })] : []),
    new Table({ width: { size: PAGE_W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: SKILL_GRID, rows: [skillHeaderRow(), ...rows] }),
    spacer(),
  ];
}

function fourColHeader(c2: string): TableRow {
  return new TableRow({
    tableHeader: true,
    children: [
      cell('TT', { bold: true, shade: 'E7E6E6', width: 700, align: AlignmentType.CENTER }),
      cell(c2, { bold: true, shade: 'E7E6E6', width: 10600 }),
      cell('Tự đánh giá', { bold: true, shade: 'E7E6E6', width: 2000, align: AlignmentType.CENTER }),
      cell('Lãnh đạo đánh giá', { bold: true, shade: 'E7E6E6', width: 2000, align: AlignmentType.CENTER }),
    ],
  });
}

function attitudeSection(list: AttitudeAssessment[]): (Paragraph | Table)[] {
  const rows = list.flatMap((a, i) => [
    new TableRow({ children: [
      cell(String(i + 1), { align: AlignmentType.CENTER }),
      cell(a.attitude_name, { bold: true }),
      cell(ATTITUDE_LABEL[a.self_status] || '', { align: AlignmentType.CENTER }),
      cell(ATTITUDE_LABEL[a.manager_status] || '', { align: AlignmentType.CENTER }),
    ] }),
    new TableRow({ children: [
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
    ] }),
  ]);
  return [
    sectionTitle('B. ĐÁNH GIÁ 6 NHÓM THÁI ĐỘ & KẾ HOẠCH CẢI THIỆN'),
    new Table({ width: { size: PAGE_W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: FOUR_GRID, rows: [fourColHeader('Nhóm thái độ'), ...rows] }),
    spacer(),
  ];
}

function prevSection(data: BM01ExportData): (Paragraph | Table)[] {
  const prev = data.extras?.previousActions;
  const items: PreviousActionExportItem[] = prev?.items.length
    ? prev.items
    : Array.from({ length: 3 }, () => ({
        typeLabel: '', actionText: '', expectedResult: '', actualResult: '',
        selfStatusLabel: '', managerStatusLabel: '', evidence: '', employeeNote: '', managerNote: '',
      }));
  const rows = items.flatMap((it, i) => [
    new TableRow({ children: [
      cell(String(i + 1), { align: AlignmentType.CENTER }),
      cell(`${it.typeLabel ? `[${it.typeLabel}] ` : ''}${it.actionText}`, { bold: !!it.actionText }),
      cell(it.selfStatusLabel, { align: AlignmentType.CENTER }),
      cell(it.managerStatusLabel, { align: AlignmentType.CENTER }),
    ] }),
    new TableRow({ children: [
      cell('', { width: 700 }),
      detailCell([
        ...labeledParas('Kết quả mong đợi', it.expectedResult),
        ...labeledParas('Kết quả thực tế', it.actualResult),
        ...labeledParas('Bằng chứng', it.evidence),
        ...labeledParas('Ghi chú của cán bộ', it.employeeNote),
        ...labeledParas('Nhận xét của lãnh đạo', it.managerNote),
      ], 3, PAGE_W - 700),
    ] }),
  ]);
  return [
    sectionTitle(`C. RÀ SOÁT KẾ HOẠCH HÀNH ĐỘNG KỲ TRƯỚC${prev?.cycleName ? ` (${prev.cycleName})` : ''}`),
    new Table({ width: { size: PAGE_W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: FOUR_GRID, rows: [fourColHeader('Hành động đã cam kết kỳ trước'), ...rows] }),
    spacer(),
  ];
}

/** Các dòng hành động của kế hoạch (mỗi hành động = 1 gạch đầu dòng + 1 dòng chi tiết) */
function planActionParas(actions: PlanActionExport[]): Paragraph[] {
  if (!actions.length) return [p('Hành động: '), p('')];
  return actions.flatMap((a) => {
    const parts = [
      a.expectedResult ? `Kết quả/minh chứng: ${a.expectedResult}` : '',
      a.deadline ? `Hạn: ${a.deadline}` : '',
      a.support ? `Hỗ trợ: ${a.support}` : '',
      a.statusLabel ? `Trạng thái: ${a.statusLabel}` : '',
    ].filter(Boolean).join(' · ');
    const first = new Paragraph({ children: [
      new TextRun({ text: '• ', size: 22 }),
      ...(a.typeLabel ? [new TextRun({ text: `[${a.typeLabel}] `, bold: true, size: 22 })] : []),
      new TextRun({ text: a.actionText, size: 22 }),
    ] });
    return parts ? [first, p(parts, { italics: true, size: 20 })] : [first];
  });
}

function planSkillSection(plan?: BM01PlanExport): (Paragraph | Table)[] {
  const items = plan?.skills.length ? plan.skills
    : Array.from({ length: 2 }, () => ({ skillLabel: '', currentLevel: null, targetLevel: null, reason: '', actions: [] as PlanActionExport[] }));
  const header = new TableRow({ tableHeader: true, children: [
    cell('TT', { bold: true, shade: 'E7E6E6', width: 700, align: AlignmentType.CENTER }),
    cell('Kỹ năng ưu tiên phát triển', { bold: true, shade: 'E7E6E6', width: 10600 }),
    cell('Mức hiện tại', { bold: true, shade: 'E7E6E6', width: 2000, align: AlignmentType.CENTER }),
    cell('Mức mục tiêu', { bold: true, shade: 'E7E6E6', width: 2000, align: AlignmentType.CENTER }),
  ] });
  const rows = items.flatMap((s, i) => [
    new TableRow({ children: [
      cell(String(i + 1), { align: AlignmentType.CENTER }),
      cell(s.skillLabel, { bold: !!s.skillLabel }),
      cell(fmtLevel(s.currentLevel), { align: AlignmentType.CENTER }),
      cell(fmtLevel(s.targetLevel), { align: AlignmentType.CENTER }),
    ] }),
    new TableRow({ children: [
      cell('', { width: 700 }),
      detailCell([
        ...labeledParas('Lý do chọn', s.reason),
        p('Hành động (70-20-10):', { bold: true }),
        ...planActionParas(s.actions),
      ], 3, PAGE_W - 700),
    ] }),
  ]);
  return [
    sectionTitle('D. KẾ HOẠCH PHÁT TRIỂN KỸ NĂNG QUÝ TỚI (TỐI ĐA 3 KỸ NĂNG)'),
    new Table({ width: { size: PAGE_W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: FOUR_GRID, rows: [header, ...rows] }),
    spacer(),
  ];
}

function planAttitudeSection(plan?: BM01PlanExport): (Paragraph | Table)[] {
  const items = plan?.attitudes.length ? plan.attitudes
    : Array.from({ length: 2 }, () => ({ name: '', issue: '', goal: '', actions: [] as PlanActionExport[] }));
  const header = new TableRow({ tableHeader: true, children: [
    cell('TT', { bold: true, shade: 'E7E6E6', width: 700, align: AlignmentType.CENTER }),
    cell('Nhóm thái độ ưu tiên cải thiện', { bold: true, shade: 'E7E6E6', width: 10600 }),
    cell('Mục tiêu cải thiện', { bold: true, shade: 'E7E6E6', width: 4000, align: AlignmentType.CENTER, columnSpan: 2 }),
  ] });
  const rows = items.flatMap((s, i) => [
    new TableRow({ children: [
      cell(String(i + 1), { align: AlignmentType.CENTER }),
      cell(s.name, { bold: !!s.name }),
      new TableCell({ borders: cellBorders, columnSpan: 2, width: { size: 4000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: valueParas(s.goal) }),
    ] }),
    new TableRow({ children: [
      cell('', { width: 700 }),
      detailCell([
        ...labeledParas('Vấn đề hiện tại', s.issue),
        p('Hành động cải thiện:', { bold: true }),
        ...planActionParas(s.actions),
      ], 3, PAGE_W - 700),
    ] }),
  ]);
  return [
    sectionTitle('E. KẾ HOẠCH CẢI THIỆN THÁI ĐỘ QUÝ TỚI'),
    new Table({ width: { size: PAGE_W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: FOUR_GRID, rows: [header, ...rows] }),
    spacer(),
  ];
}

function planAiSection(plan?: BM01PlanExport): (Paragraph | Table)[] {
  const items = plan?.ai.length ? plan.ai
    : Array.from({ length: 2 }, () => ({ typeLabel: '', actionText: '', expectedResult: '', deadline: '', support: '', statusLabel: '', linkedLabel: '' }));
  const header = new TableRow({ tableHeader: true, children: [
    cell('TT', { bold: true, shade: 'E7E6E6', width: 700, align: AlignmentType.CENTER }),
    cell('Hành động ứng dụng AI', { bold: true, shade: 'E7E6E6', width: 10600 }),
    cell('Gắn với ưu tiên', { bold: true, shade: 'E7E6E6', width: 2000, align: AlignmentType.CENTER }),
    cell('Trạng thái', { bold: true, shade: 'E7E6E6', width: 2000, align: AlignmentType.CENTER }),
  ] });
  const rows = items.flatMap((a, i) => [
    new TableRow({ children: [
      cell(String(i + 1), { align: AlignmentType.CENTER }),
      cell(a.actionText, { bold: !!a.actionText }),
      cell(a.linkedLabel, { align: AlignmentType.CENTER }),
      cell(a.statusLabel, { align: AlignmentType.CENTER }),
    ] }),
    new TableRow({ children: [
      cell('', { width: 700 }),
      detailCell([
        ...labeledParas('Kết quả mong đợi', a.expectedResult),
        ...labeledParas('Thời hạn', a.deadline),
        ...labeledParas('Hỗ trợ cần thiết', a.support),
      ], 3, PAGE_W - 700),
    ] }),
  ]);
  return [
    sectionTitle('F. HÀNH ĐỘNG ỨNG DỤNG AI TRONG CÔNG VIỆC'),
    new Table({ width: { size: PAGE_W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: FOUR_GRID, rows: [header, ...rows] }),
    spacer(),
  ];
}

function overallSection(data: BM01ExportData): (Paragraph | Table)[] {
  const comments = data.extras?.comments;
  const commentTable = new Table({
    width: { size: PAGE_W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [3600, PAGE_W - 3600],
    rows: [
      new TableRow({ children: [cell('Ý kiến của cán bộ', { bold: true, shade: 'F2F2F2', width: 3600 }), detailCell(valueParas(comments?.employee), 1, PAGE_W - 3600)] }),
      new TableRow({ children: [cell('Nhận xét của Trưởng phòng / người đánh giá', { bold: true, shade: 'F2F2F2', width: 3600 }), detailCell(valueParas(comments?.manager), 1, PAGE_W - 3600)] }),
      new TableRow({ children: [cell('Ý kiến của Phó Giám đốc phụ trách', { bold: true, shade: 'F2F2F2', width: 3600 }), detailCell(valueParas(comments?.pgd), 1, PAGE_W - 3600)] }),
    ],
  });

  const OVERALL_FIELD_LABELS = [
    'Điểm mạnh cần phát huy', 'Điểm cần cải thiện', 'Trọng tâm phát triển kỳ tới',
    'Ý kiến về lộ trình upskill', 'Nhận xét thái độ / tinh thần phối hợp',
    'Hỗ trợ / định hướng từ lãnh đạo', 'Kết luận / định hướng phát triển',
  ];
  const byTitle = new Map((data.extras?.overallReviews || []).map((r) => [r.title, r]));
  const defaultTitles = [
    'Đánh giá tổng thể của Trưởng phòng / người đánh giá',
    'Đánh giá tổng thể của Phó Giám đốc phụ trách',
  ];
  const titles = [
    ...defaultTitles,
    ...(data.extras?.overallReviews || []).map((r) => r.title).filter((t) => !defaultTitles.includes(t)),
  ];
  const overallTables = titles.flatMap((title) => {
    const rv = byTitle.get(title);
    const valueOf = (label: string) => rv?.fields.find((f) => f.label === label)?.value || '';
    return [
      new Table({
        width: { size: PAGE_W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [3600, PAGE_W - 3600],
        rows: [
          new TableRow({ tableHeader: true, children: [new TableCell({
            borders: cellBorders, shading: { fill: 'E7E6E6', type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 }, columnSpan: 2,
            width: { size: PAGE_W, type: WidthType.DXA }, children: [p(title, { bold: true })],
          })] }),
          ...OVERALL_FIELD_LABELS.map((label) => new TableRow({ children: [
            cell(label, { bold: true, shade: 'F2F2F2', width: 3600 }),
            detailCell(valueParas(valueOf(label)), 1, PAGE_W - 3600),
          ] })),
        ],
      }),
      spacer(),
    ];
  });

  return [sectionTitle('G. NHẬN XÉT & ĐÁNH GIÁ TỔNG THỂ CỦA LÃNH ĐẠO'), commentTable, spacer(), ...overallTables];
}

function oneOnOneSection(data: BM01ExportData): (Paragraph | Table)[] {
  const oneOnOne = data.extras?.oneOnOne || data.oneOnOne;
  const questions = data.extras?.oneOnOneQuestions?.length ? data.extras.oneOnOneQuestions : DEFAULT_ONE_ON_ONE_QUESTIONS;
  const out: (Paragraph | Table)[] = [sectionTitle('H. CÂU HỎI TRAO ĐỔI 1-1 (CÁN BỘ ↔ LÃNH ĐẠO)')];
  questions.forEach((q, idx) => {
    const ans = oneOnOne?.answers?.[q.key] || { employee: '', manager: '' };
    out.push(new Table({
      width: { size: PAGE_W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [PAGE_W / 2, PAGE_W / 2],
      rows: [
        new TableRow({ tableHeader: true, children: [new TableCell({
          borders: cellBorders, shading: { fill: 'E7E6E6', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 }, columnSpan: 2,
          width: { size: PAGE_W, type: WidthType.DXA }, children: [p(`${idx + 1}. ${q.text}`, { bold: true })],
        })] }),
        new TableRow({ children: [
          cell('Trả lời của cán bộ', { bold: true, shade: 'F2F2F2', width: PAGE_W / 2 }),
          cell('Ý kiến của lãnh đạo', { bold: true, shade: 'F2F2F2', width: PAGE_W / 2 }),
        ] }),
        new TableRow({ children: [
          detailCell(ans.employee ? [p(ans.employee)] : [p(''), p('')], 1, PAGE_W / 2),
          detailCell(ans.manager ? [p(ans.manager)] : [p(''), p('')], 1, PAGE_W / 2),
        ] }),
      ],
    }), spacer());
  });
  return out;
}

function signatureSection(data: BM01ExportData): (Paragraph | Table)[] {
  const { profile, extras } = data;
  return [
    p('Bắc Hưng Yên, ngày ......... tháng ......... năm 20.....', { italics: true, align: AlignmentType.RIGHT }),
    spacer(),
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [5100, 5100, 5100],
      rows: [new TableRow({ children: [
        signatureCell('CÁN BỘ TỰ ĐÁNH GIÁ', { name: extras?.signatures?.employee.name || profile.full_name, date: extras?.signatures?.employee.date }, 'Đã nộp trên hệ thống', 5100),
        signatureCell('LÃNH ĐẠO ĐÁNH GIÁ', { name: extras?.signatures?.reviewer.name || profile.manager_name, date: extras?.signatures?.reviewer.date }, 'Đã duyệt trên hệ thống', 5100),
        signatureCell('PHÓ GIÁM ĐỐC PHÊ DUYỆT', { name: extras?.signatures?.approver.name || profile.pgd_name, date: extras?.signatures?.approver.date }, 'Đã phê duyệt trên hệ thống', 5100),
      ] })],
    }),
  ];
}

/** Toàn bộ nội dung thân của MỘT phiếu (theo thứ tự mục A → ký) */
function formBodyChildren(data: BM01ExportData, exportedAtText: string): (Paragraph | Table)[] {
  const supp = data.supplementaryAssessments || [];
  const legend = `Chú thích mức năng lực: ${[1, 2, 3, 4].map((n) => `Mức ${n} – ${LEVEL_LABELS[n]}`).join(' · ')}. `
    + `Mức tối thiểu = yêu cầu của vị trí; Mức mục tiêu = mức nâng cao cần hướng tới.`;
  return [
    ...headerChildren(data, exportedAtText),
    ...skillSection('A. ĐÁNH GIÁ KỸ NĂNG LÕI THEO VỊ TRÍ', data.coreAssessments, true, legend),
    ...(supp.length ? skillSection('A2. SKILL BỔ TRỢ (NGOÀI CHUẨN VỊ TRÍ)', supp, false) : []),
    ...attitudeSection(data.attitudeAssessments),
    ...prevSection(data),
    ...planSkillSection(data.extras?.plan),
    ...planAttitudeSection(data.extras?.plan),
    ...planAiSection(data.extras?.plan),
    ...overallSection(data),
    ...oneOnOneSection(data),
    ...signatureSection(data),
  ];
}

const fmtExportedAt = () => new Date().toLocaleString('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

/** Dựng Document Word chứa 1 hoặc nhiều phiếu — mỗi phiếu là một section (trang mới, watermark + số trang riêng). */
export function buildBM01WordDoc(items: BM01ExportData[], exportedAtText = fmtExportedAt()): Document {
  const sections: ISectionOptions[] = items.map((data) => {
    const code = rutGonMa(data.extras?.formCode);
    const footerLabel = `Biểu mẫu BM01 · ${data.profile.full_name || ''} · Kỳ: ${data.cycleName}${code ? ` · Mã: ${code}` : ''}`;
    const header = makeHeader(data.extras?.formStatus);
    return {
      properties: {
        page: {
          // Truyền khổ DỌC + orientation LANDSCAPE → docx tráo thành w:w=16838 (ngang thật)
          size: { width: A4_SHORT, height: A4_LONG, orientation: PageOrientation.LANDSCAPE },
          margin: { top: PAGE_MARGIN, bottom: 900, left: PAGE_MARGIN, right: PAGE_MARGIN },
          pageNumbers: { start: 1 },
        },
      },
      headers: header ? { default: header } : undefined,
      footers: { default: makeFooter(footerLabel) },
      children: formBodyChildren(data, exportedAtText),
    };
  });

  return new Document({
    styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
    sections: sections.length ? sections : [{ children: [p('')] }],
  });
}

const safeFilePart = (s: string) => s.replace(/[/\s]+/g, '_');

/** Xuất một phiếu ra file Word (.docx) và tải xuống. */
export async function exportBM01ToWord(data: BM01ExportData) {
  const doc = buildBM01WordDoc([data]);
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `BM01_${safeFilePart(data.profile.full_name || 'CanBo')}_${safeFilePart(data.cycleName)}.docx`);
}

/** Gộp nhiều phiếu của một kỳ thành MỘT file Word để in lưu hồ sơ. */
export async function exportBM01BatchToWord(items: BM01ExportData[], fileName: string) {
  if (!items.length) throw new Error('Không có phiếu nào để xuất.');
  const doc = buildBM01WordDoc(items);
  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}

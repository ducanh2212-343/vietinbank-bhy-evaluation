// Xuất biểu mẫu đánh giá năng lực ra PDF (bản in cố định để lưu hồ sơ nhân sự) —
// mọi chỉnh sửa/trao đổi vẫn thực hiện trong web. Dàn trang theo thể thức văn bản
// hành chính (quốc hiệu/tiêu ngữ, mã phiếu, số trang) tham chiếu mẫu báo cáo Hội đồng.
//
// Kỹ thuật: dựng bản in bằng HTML khổ A4 nằm ngang trong iframe ẩn, mỗi đơn vị nội
// dung (từng kỹ năng, từng nhóm thái độ, từng câu hỏi…) là một khối `.blk`; chụp
// html2canvas rồi CẮT TRANG TẠI RANH GIỚI KHỐI (không bao giờ đứt giữa dòng chữ),
// ghép vào jsPDF A4 ngang, đóng chân trang số trang từng trang và watermark
// "BẢN NHÁP" nếu phiếu chưa được phê duyệt.
import type jsPDF from 'jspdf';
import type { BM01ExportData, BM01PlanExport, PlanActionExport, SignatureInfo } from '@/lib/exportBM01';
import {
  ATTITUDE_LABEL,
  IMPROVEMENT_STATUS_LABEL,
  FORM_STATUS_PRINT_LABEL,
  focusLabels,
  fmtSignDate,
  isApprovedFormStatus,
} from '@/lib/exportBM01Labels';
import { LEVEL_LABELS } from '@/lib/skillLevels';
import { DEFAULT_ONE_ON_ONE_QUESTIONS } from '@/lib/oneOnOneDefaults';

const OVERALL_FIELD_LABELS = [
  'Điểm mạnh cần phát huy',
  'Điểm cần cải thiện',
  'Trọng tâm phát triển kỳ tới',
  'Ý kiến về lộ trình upskill',
  'Nhận xét thái độ / tinh thần phối hợp',
  'Hỗ trợ / định hướng từ lãnh đạo',
  'Kết luận / định hướng phát triển',
];

const DEFAULT_OVERALL_TITLES = [
  'Đánh giá tổng thể của Trưởng phòng / người đánh giá',
  'Đánh giá tổng thể của Phó Giám đốc phụ trách',
];

// ===== Kích thước trang (mm) và bố cục chụp =====
const PAGE_W_MM = 297; // A4 nằm ngang
const PAGE_H_MM = 210;
const MARGIN_X_MM = 8;
const MARGIN_TOP_MM = 8;
const MARGIN_BOTTOM_MM = 13; // gồm vùng chân trang
const CONTENT_W_MM = PAGE_W_MM - MARGIN_X_MM * 2; // 281
const CONTENT_H_MM = PAGE_H_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM; // 189

// Bề rộng bố cục (px CSS) khi dựng bản in để chụp — ánh xạ 1:1 sang CONTENT_W_MM.
const LAYOUT_WIDTH_PX = 1400;
const CSS_PX_PER_MM = LAYOUT_WIDTH_PX / CONTENT_W_MM;
const PAGE_CAP_CSS = Math.floor(CONTENT_H_MM * CSS_PX_PER_MM); // sức chứa 1 trang (px CSS)

/** Escape HTML + xuống dòng thành <br> để giữ nguyên nội dung người dùng nhập */
function esc(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

const fmtLevel = (n: number | null | undefined) => (n == null ? '' : `Mức ${n}`);

/** Ô giá trị: có nội dung thì in, trống thì chừa khoảng để ghi tay */
const blank = (v: string | null | undefined, min = '&nbsp;') => {
  const s = (v || '').trim();
  return s ? esc(s) : min;
};

/** Dòng "Nhãn: giá trị" trong khối chi tiết */
const labeled = (label: string, value: string | null | undefined) =>
  `<div class="lbl"><b>${esc(label)}:</b> ${blank(value)}</div>`;

/** Khối phân trang: nội dung bên trong không bao giờ bị cắt ngang giữa dòng */
const blk = (inner: string, cont = false) => `<div class="blk${cont ? ' cont' : ''}">${inner}</div>`;

const rutGonMa = (formCode: string | null | undefined) =>
  (formCode || '').replace(/-/g, '').slice(0, 8).toUpperCase();

// ===== Khối đầu phiếu: quốc hiệu + tiêu đề + định danh + tóm tắt kết quả =====
function headerBlock(data: BM01ExportData, exportedAtText: string): string {
  const { profile, cycleName } = data;
  const statusLabel = data.extras?.formStatus
    ? (FORM_STATUS_PRINT_LABEL[data.extras.formStatus] || data.extras.formStatus)
    : 'Chưa lưu trên hệ thống';
  const code = rutGonMa(data.extras?.formCode);

  // Tóm tắt kết quả đầu phiếu — người xem hồ sơ nắm kết quả không cần đọc cả phiếu
  const skills = [...data.coreAssessments];
  const assessedOf = (a: (typeof skills)[number]) => a.manager_assessed_level ?? a.self_assessed_level;
  const rated = skills.filter((a) => assessedOf(a) != null);
  const passMin = rated.filter((a) => (assessedOf(a) as number) >= a.minimum_level).length;
  const passAdv = rated.filter((a) => (assessedOf(a) as number) >= a.advanced_level).length;
  const attOf = (a: BM01ExportData['attitudeAssessments'][number]) => a.manager_status || a.self_status;
  const attCount = (k: string) => data.attitudeAssessments.filter((a) => attOf(a) === k).length;
  const plan = data.extras?.plan;
  const planActions = plan
    ? plan.skills.reduce((n, s) => n + s.actions.length, 0)
      + plan.attitudes.reduce((n, s) => n + s.actions.length, 0)
      + plan.ai.length
    : 0;

  const summaryLines = [
    `Kỹ năng lõi: <b>${passMin}/${skills.length}</b> đạt chuẩn tối thiểu · <b>${passAdv}</b> đạt mức mục tiêu${rated.length < skills.length ? ` · ${skills.length - rated.length} chưa chấm` : ''}`,
    `Thái độ: <b>${attCount('noi_bat')}</b> Nổi bật · <b>${attCount('dat_mong_doi')}</b> Đạt mong đợi · <b>${attCount('can_cai_thien')}</b> Cần cải thiện`,
    `Kế hoạch kỳ tới: <b>${plan ? plan.skills.length : 0}</b> kỹ năng ưu tiên · <b>${plan ? plan.attitudes.length : 0}</b> nhóm thái độ · <b>${planActions}</b> hành động cam kết`,
  ];

  return blk(`
    <div class="natl">
      <div>
        <div><b>NGÂN HÀNG TMCP CÔNG THƯƠNG VIỆT NAM</b></div>
        <div>CHI NHÁNH BẮC HƯNG YÊN</div>
      </div>
      <div>
        <div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b></div>
        <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
      </div>
    </div>
    <h1>PHIẾU ĐÁNH GIÁ NĂNG LỰC CÁN BỘ (BM01)</h1>
    <div class="subtitle">Kỳ đánh giá: ${esc(cycleName)}</div>
    <div class="refline">Mã phiếu: <b>${code || '—'}</b> · Trạng thái phiếu: <b>${esc(statusLabel)}</b> · Xuất từ hệ thống lúc: ${esc(exportedAtText)}</div>
    <div class="meta">
      <div>Họ tên: <b>${esc(profile.full_name)}</b>${profile.employee_code ? `&nbsp;&nbsp;&nbsp;&nbsp;Mã cán bộ: ${esc(profile.employee_code)}` : ''}</div>
      <div>Vị trí: ${esc(profile.pos_name)}&nbsp;&nbsp;&nbsp;&nbsp;Đơn vị: ${esc(profile.dept_name)}</div>
      <div>Người đánh giá (lãnh đạo trực tiếp): ${esc(data.extras?.signatures?.reviewer.name || profile.manager_name)}</div>
      <div>Phó Giám đốc phụ trách: ${esc(data.extras?.signatures?.approver.name || profile.pgd_name)}</div>
    </div>
    <div class="summary">
      <div class="summary-title">KẾT QUẢ TỔNG HỢP</div>
      ${summaryLines.map((l) => `<div class="summary-line">${l}</div>`).join('')}
    </div>`);
}

// ===== A / A2. Kỹ năng — mỗi kỹ năng là một khối =====
const SKILL_COLS = `<colgroup>
  <col style="width:5%"><col style="width:47%"><col style="width:12%">
  <col style="width:12%"><col style="width:12%"><col style="width:12%">
</colgroup>`;

function skillBlocks(heading: string, legend: string, list: BM01ExportData['coreAssessments'], hasLevels: boolean): string[] {
  const head = `<thead><tr>
    <th>TT</th><th>Kỹ năng</th><th>Mức tối thiểu</th><th>Mức mục tiêu</th>
    <th>Tự đánh giá</th><th>Lãnh đạo đánh giá</th>
  </tr></thead>`;
  return list.map((a, i) => {
    const detail = [
      labeled('Minh chứng', a.evidence),
      labeled('Nhận xét của cán bộ', a.employee_comment),
      labeled('Nhận xét của lãnh đạo', a.manager_note),
    ].join('');
    const table = `<table>${SKILL_COLS}${i === 0 ? head : ''}<tbody>
      <tr>
        <td class="c">${i + 1}</td>
        <td><b>${esc(`${a.skill_code ? a.skill_code + '. ' : ''}${a.skill_name}`)}</b></td>
        <td class="c">${hasLevels ? esc(fmtLevel(a.minimum_level)) : '—'}</td>
        <td class="c">${hasLevels ? esc(fmtLevel(a.advanced_level)) : '—'}</td>
        <td class="c">${blank(fmtLevel(a.self_assessed_level))}</td>
        <td class="c">${blank(fmtLevel(a.manager_assessed_level))}</td>
      </tr>
      <tr><td></td><td colspan="5" class="detail">${detail}</td></tr>
    </tbody></table>`;
    const intro = i === 0 ? `<div class="sec">${esc(heading)}</div>${legend ? `<div class="legend">${esc(legend)}</div>` : ''}` : '';
    return blk(intro + table, i > 0);
  });
}

// ===== B. Thái độ — mỗi nhóm là một khối =====
const FOUR_COLS = `<colgroup><col style="width:5%"><col style="width:63%"><col style="width:16%"><col style="width:16%"></colgroup>`;

function attitudeBlocks(list: BM01ExportData['attitudeAssessments']): string[] {
  const head = `<thead><tr><th>TT</th><th>Nhóm thái độ</th><th>Tự đánh giá</th><th>Lãnh đạo đánh giá</th></tr></thead>`;
  return list.map((a, i) => {
    const detail = [
      labeled('Minh chứng / biểu hiện hiện tại', a.evidence_text || a.current_status),
      labeled('Điểm cần cải thiện chính', focusLabels(a.attitude_dimension_id, a.improvement_focus, a.improvement_focus_other)),
      labeled('Hành động cải thiện', a.improvement_action || a.improvement_goal),
      labeled('Thời hạn', a.improvement_deadline),
      labeled('Kết quả / bằng chứng mong đợi', a.expected_evidence),
      labeled('Hỗ trợ cần thiết', a.support_needed),
      labeled('Trạng thái thực hiện', a.improvement_status ? (IMPROVEMENT_STATUS_LABEL[a.improvement_status] || a.improvement_status) : ''),
    ].join('');
    const table = `<table>${FOUR_COLS}${i === 0 ? head : ''}<tbody>
      <tr>
        <td class="c">${i + 1}</td>
        <td><b>${esc(a.attitude_name)}</b></td>
        <td class="c">${blank(ATTITUDE_LABEL[a.self_status] || '')}</td>
        <td class="c">${blank(ATTITUDE_LABEL[a.manager_status] || '')}</td>
      </tr>
      <tr><td></td><td colspan="3" class="detail">${detail}</td></tr>
    </tbody></table>`;
    const intro = i === 0 ? `<div class="sec">B. ĐÁNH GIÁ 6 NHÓM THÁI ĐỘ &amp; KẾ HOẠCH CẢI THIỆN</div>` : '';
    return blk(intro + table, i > 0);
  });
}

// ===== C. Rà soát kế hoạch hành động kỳ trước =====
function previousActionsBlocks(data: BM01ExportData): string[] {
  const prev = data.extras?.previousActions;
  const items = prev?.items.length
    ? prev.items
    : Array.from({ length: 3 }, () => ({
        typeLabel: '', actionText: '', expectedResult: '', actualResult: '',
        selfStatusLabel: '', managerStatusLabel: '', evidence: '', employeeNote: '', managerNote: '',
      }));
  const head = `<thead><tr><th>TT</th><th>Hành động đã cam kết kỳ trước</th><th>Tự đánh giá</th><th>Lãnh đạo đánh giá</th></tr></thead>`;
  const cycle = prev?.cycleName ? ` (${prev.cycleName})` : '';
  return items.map((it, i) => {
    const detail = [
      labeled('Kết quả mong đợi', it.expectedResult),
      labeled('Kết quả thực tế', it.actualResult),
      labeled('Bằng chứng', it.evidence),
      labeled('Ghi chú của cán bộ', it.employeeNote),
      labeled('Nhận xét của lãnh đạo', it.managerNote),
    ].join('');
    const table = `<table>${FOUR_COLS}${i === 0 ? head : ''}<tbody>
      <tr>
        <td class="c">${i + 1}</td>
        <td>${it.actionText ? `<b>${esc(`${it.typeLabel ? `[${it.typeLabel}] ` : ''}${it.actionText}`)}</b>` : '&nbsp;'}</td>
        <td class="c">${blank(it.selfStatusLabel)}</td>
        <td class="c">${blank(it.managerStatusLabel)}</td>
      </tr>
      <tr><td></td><td colspan="3" class="detail">${detail}</td></tr>
    </tbody></table>`;
    const intro = i === 0 ? `<div class="sec">C. RÀ SOÁT KẾ HOẠCH HÀNH ĐỘNG KỲ TRƯỚC${esc(cycle)}</div>` : '';
    return blk(intro + table, i > 0);
  });
}

// ===== D/E/F. Kế hoạch phát triển kỳ tới =====
const planActionLines = (actions: PlanActionExport[]): string => {
  if (!actions.length) return `<div class="lbl"><b>Hành động:</b> &nbsp;</div><div class="lbl">&nbsp;</div>`;
  return actions
    .map((a) => {
      const parts = [
        a.expectedResult ? `Kết quả/minh chứng: ${a.expectedResult}` : '',
        a.deadline ? `Hạn: ${a.deadline}` : '',
        a.support ? `Hỗ trợ: ${a.support}` : '',
        a.statusLabel ? `Trạng thái: ${a.statusLabel}` : '',
      ].filter(Boolean).join(' · ');
      return `<div class="lbl">• ${a.typeLabel ? `<b>[${esc(a.typeLabel)}]</b> ` : ''}${esc(a.actionText)}${parts ? `<br><span class="sub">${esc(parts)}</span>` : ''}</div>`;
    })
    .join('');
};

function planSkillBlocks(plan: BM01PlanExport | undefined): string[] {
  const head = `<thead><tr><th>TT</th><th>Kỹ năng ưu tiên phát triển</th><th>Mức hiện tại</th><th>Mức mục tiêu</th></tr></thead>`;
  const items = plan?.skills.length
    ? plan.skills
    : Array.from({ length: 2 }, () => ({ skillLabel: '', currentLevel: null, targetLevel: null, reason: '', actions: [] as PlanActionExport[] }));
  return items.map((s, i) => {
    const table = `<table>${FOUR_COLS}${i === 0 ? head : ''}<tbody>
      <tr>
        <td class="c">${i + 1}</td>
        <td>${s.skillLabel ? `<b>${esc(s.skillLabel)}</b>` : '&nbsp;'}</td>
        <td class="c">${blank(fmtLevel(s.currentLevel))}</td>
        <td class="c">${blank(fmtLevel(s.targetLevel))}</td>
      </tr>
      <tr><td></td><td colspan="3" class="detail">
        ${labeled('Lý do chọn', s.reason)}
        <div class="lbl"><b>Hành động (70-20-10):</b></div>
        ${planActionLines(s.actions)}
      </td></tr>
    </tbody></table>`;
    const intro = i === 0 ? `<div class="sec">D. KẾ HOẠCH PHÁT TRIỂN KỸ NĂNG QUÝ TỚI (TỐI ĐA 3 KỸ NĂNG)</div>` : '';
    return blk(intro + table, i > 0);
  });
}

function planAttitudeBlocks(plan: BM01PlanExport | undefined): string[] {
  const head = `<thead><tr><th>TT</th><th>Nhóm thái độ ưu tiên cải thiện</th><th colspan="2">Mục tiêu cải thiện</th></tr></thead>`;
  const items = plan?.attitudes.length
    ? plan.attitudes
    : Array.from({ length: 2 }, () => ({ name: '', issue: '', goal: '', actions: [] as PlanActionExport[] }));
  return items.map((s, i) => {
    const table = `<table>${FOUR_COLS}${i === 0 ? head : ''}<tbody>
      <tr>
        <td class="c">${i + 1}</td>
        <td>${s.name ? `<b>${esc(s.name)}</b>` : '&nbsp;'}</td>
        <td colspan="2">${blank(s.goal)}</td>
      </tr>
      <tr><td></td><td colspan="3" class="detail">
        ${labeled('Vấn đề hiện tại', s.issue)}
        <div class="lbl"><b>Hành động cải thiện:</b></div>
        ${planActionLines(s.actions)}
      </td></tr>
    </tbody></table>`;
    const intro = i === 0 ? `<div class="sec">E. KẾ HOẠCH CẢI THIỆN THÁI ĐỘ QUÝ TỚI</div>` : '';
    return blk(intro + table, i > 0);
  });
}

function planAiBlocks(plan: BM01PlanExport | undefined): string[] {
  const head = `<thead><tr><th>TT</th><th>Hành động ứng dụng AI</th><th>Gắn với ưu tiên</th><th>Trạng thái</th></tr></thead>`;
  const items = plan?.ai.length
    ? plan.ai
    : Array.from({ length: 2 }, () => ({
        typeLabel: '', actionText: '', expectedResult: '', deadline: '', support: '', statusLabel: '', linkedLabel: '',
      }));
  return items.map((a, i) => {
    const table = `<table>${FOUR_COLS}${i === 0 ? head : ''}<tbody>
      <tr>
        <td class="c">${i + 1}</td>
        <td>${a.actionText ? `<b>${esc(a.actionText)}</b>` : '&nbsp;'}</td>
        <td class="c">${blank(a.linkedLabel)}</td>
        <td class="c">${blank(a.statusLabel)}</td>
      </tr>
      <tr><td></td><td colspan="3" class="detail">
        ${labeled('Kết quả mong đợi', a.expectedResult)}
        ${labeled('Thời hạn', a.deadline)}
        ${labeled('Hỗ trợ cần thiết', a.support)}
      </td></tr>
    </tbody></table>`;
    const intro = i === 0 ? `<div class="sec">F. HÀNH ĐỘNG ỨNG DỤNG AI TRONG CÔNG VIỆC</div>` : '';
    return blk(intro + table, i > 0);
  });
}

// ===== G. Nhận xét & đánh giá tổng thể =====
const TWO_COLS = `<colgroup><col style="width:25%"><col style="width:75%"></colgroup>`;

function overallBlocks(data: BM01ExportData): string[] {
  const c = data.extras?.comments;
  const commentTable = `<table>${TWO_COLS}<tbody>
    <tr><th class="l">Ý kiến của cán bộ</th><td>${blank(c?.employee)}</td></tr>
    <tr><th class="l">Nhận xét của Trưởng phòng / người đánh giá</th><td>${blank(c?.manager)}</td></tr>
    <tr><th class="l">Ý kiến của Phó Giám đốc phụ trách</th><td>${blank(c?.pgd)}</td></tr>
  </tbody></table>`;

  const byTitle = new Map((data.extras?.overallReviews || []).map((r) => [r.title, r]));
  const titles = [
    ...DEFAULT_OVERALL_TITLES,
    ...(data.extras?.overallReviews || []).map((r) => r.title).filter((t) => !DEFAULT_OVERALL_TITLES.includes(t)),
  ];
  const overallTables = titles.map((title) => {
    const rv = byTitle.get(title);
    const valueOf = (label: string) => rv?.fields.find((f) => f.label === label)?.value || '';
    const rows = OVERALL_FIELD_LABELS
      .map((label) => `<tr><th class="l">${esc(label)}</th><td>${blank(valueOf(label))}</td></tr>`)
      .join('');
    return blk(`<table class="mt">${TWO_COLS}<thead><tr><th colspan="2">${esc(title)}</th></tr></thead><tbody>${rows}</tbody></table>`);
  });

  return [
    blk(`<div class="sec">G. NHẬN XÉT &amp; ĐÁNH GIÁ TỔNG THỂ CỦA LÃNH ĐẠO</div>${commentTable}`),
    ...overallTables,
  ];
}

// ===== H. Câu hỏi trao đổi 1-1 — mỗi câu hỏi là một khối =====
function oneOnOneBlocks(data: BM01ExportData): string[] {
  const oneOnOne = data.extras?.oneOnOne || data.oneOnOne;
  const questions = data.extras?.oneOnOneQuestions?.length ? data.extras.oneOnOneQuestions : DEFAULT_ONE_ON_ONE_QUESTIONS;
  return questions.map((q, idx) => {
    const ans = oneOnOne?.answers?.[q.key] || { employee: '', manager: '' };
    const table = `<table class="mt">
      <colgroup><col style="width:50%"><col style="width:50%"></colgroup>
      <thead>
        <tr><th colspan="2">${idx + 1}. ${esc(q.text)}</th></tr>
        <tr><th class="l">Trả lời của cán bộ</th><th class="l">Ý kiến của lãnh đạo</th></tr>
      </thead>
      <tbody><tr><td>${blank(ans.employee)}</td><td>${blank(ans.manager)}</td></tr></tbody>
    </table>`;
    const intro = idx === 0 ? `<div class="sec">H. CÂU HỎI TRAO ĐỔI 1-1 (CÁN BỘ ↔ LÃNH ĐẠO)</div>` : '';
    return blk(intro + table);
  });
}

// ===== Ký xác nhận =====
function signatureBlock(data: BM01ExportData): string {
  const s = data.extras?.signatures;
  const p = data.profile;
  const cellFor = (title: string, sig: SignatureInfo | undefined, hint: string, systemLabel: string) => `
    <td class="sign">
      <div class="sign-title"><b>${esc(title)}</b></div>
      <div class="sign-hint">${esc(hint)}</div>
      <div class="sign-space">&nbsp;</div>
      <div class="sign-name"><b>${esc(sig?.name || '')}</b></div>
      ${sig?.date ? `<div class="sign-date">${esc(systemLabel)}: ${esc(fmtSignDate(sig.date))}</div>` : ''}
    </td>`;
  return blk(`
    <div class="dateline">Bắc Hưng Yên, ngày &nbsp;&nbsp;.....&nbsp;&nbsp; tháng &nbsp;&nbsp;.....&nbsp;&nbsp; năm 20.....</div>
    <table class="sign-table">
      <colgroup><col style="width:33.33%"><col style="width:33.33%"><col style="width:33.34%"></colgroup>
      <tbody><tr>
        ${cellFor('CÁN BỘ TỰ ĐÁNH GIÁ', { name: s?.employee.name || p.full_name, date: s?.employee.date }, '(Ký, ghi rõ họ tên)', 'Đã nộp trên hệ thống')}
        ${cellFor('LÃNH ĐẠO ĐÁNH GIÁ', { name: s?.reviewer.name || p.manager_name, date: s?.reviewer.date }, '(Ký, ghi rõ họ tên)', 'Đã duyệt trên hệ thống')}
        ${cellFor('PHÓ GIÁM ĐỐC PHÊ DUYỆT', { name: s?.approver.name || p.pgd_name, date: s?.approver.date }, '(Ký, ghi rõ họ tên, đóng dấu khi lưu hồ sơ)', 'Đã phê duyệt trên hệ thống')}
      </tr></tbody>
    </table>`);
}

export function buildBM01PrintHtml(data: BM01ExportData, docTitle = 'BM01', exportedAtText = ''): string {
  const supp = data.supplementaryAssessments || [];
  const legend = `Chú thích mức năng lực: ${[1, 2, 3, 4].map((n) => `Mức ${n} – ${LEVEL_LABELS[n]}`).join(' · ')}. `
    + `Mức tối thiểu = yêu cầu của vị trí; Mức mục tiêu = mức nâng cao cần hướng tới.`;

  const blocks = [
    headerBlock(data, exportedAtText),
    ...skillBlocks('A. ĐÁNH GIÁ KỸ NĂNG LÕI THEO VỊ TRÍ', legend, data.coreAssessments, true),
    ...(supp.length ? skillBlocks('A2. SKILL BỔ TRỢ (NGOÀI CHUẨN VỊ TRÍ)', '', supp, false) : []),
    ...attitudeBlocks(data.attitudeAssessments),
    ...previousActionsBlocks(data),
    ...planSkillBlocks(data.extras?.plan),
    ...planAttitudeBlocks(data.extras?.plan),
    ...planAiBlocks(data.extras?.plan),
    ...overallBlocks(data),
    ...oneOnOneBlocks(data),
    signatureBlock(data),
  ];

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>${esc(docTitle)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12px; color: #000; line-height: 1.35; }
  .natl { display: flex; justify-content: space-between; gap: 24px; text-align: center; font-size: 11.5px; text-transform: uppercase; }
  .natl .motto { text-transform: none; border-bottom: 1px solid #000; display: inline-block; padding: 0 6px 1px; }
  h1 { text-align: center; font-size: 18px; margin: 14px 0 4px; }
  .subtitle { text-align: center; font-style: italic; font-size: 13px; margin-bottom: 2px; }
  .refline { text-align: center; font-size: 10.5px; color: #333; margin-bottom: 8px; }
  .meta { margin-bottom: 8px; }
  .meta div { margin: 1px 0; }
  .summary { border: 1px solid #999; background: #fafafa; padding: 6px 10px; margin-bottom: 4px; }
  .summary-title { font-weight: bold; font-size: 11px; letter-spacing: 0.4px; margin-bottom: 2px; }
  .summary-line { margin: 1px 0; }
  .sec { font-weight: bold; font-size: 14px; margin: 12px 0 4px; }
  .legend { font-style: italic; font-size: 10px; margin-bottom: 4px; }
  .blk.cont { margin-top: -1px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.mt { margin-top: 8px; }
  th, td { border: 1px solid #999; padding: 4px 6px; vertical-align: top; text-align: left; word-wrap: break-word; overflow-wrap: anywhere; }
  th { background: #e7e6e6; font-weight: bold; }
  th.l { background: #f2f2f2; }
  td.c, th.c { text-align: center; }
  td.detail { background: #fcfcfc; }
  td.detail .lbl { margin: 1px 0; }
  td.detail .sub { color: #333; font-size: 11px; }
  .dateline { text-align: right; font-style: italic; margin: 14px 8px 6px 0; }
  .sign { text-align: center; padding: 8px 6px 24px; }
  .sign-title { margin-bottom: 2px; }
  .sign-hint { font-style: italic; font-size: 11px; }
  .sign-space { height: 46px; }
  .sign-name { min-height: 16px; }
  .sign-date { font-size: 10px; }
</style></head>
<body>${blocks.join('')}</body></html>`;
}

// ===== Dựng PDF =====

/** Dựng HTML bản in trong iframe ẩn, đợi layout ổn định, trả về iframe đã sẵn sàng chụp. */
function renderInHiddenIframe(html: string): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = `${LAYOUT_WIDTH_PX}px`;
    iframe.style.height = '1000px';
    iframe.style.border = '0';
    iframe.style.background = '#ffffff';
    document.body.appendChild(iframe);

    iframe.onload = () => {
      // Đợi 1 nhịp để trình duyệt hoàn tất layout/độ cao thực tế
      setTimeout(() => resolve(iframe), 200);
    };
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      reject(new Error('Không khởi tạo được khung in.'));
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
  });
}

/** Chia trang tại ranh giới khối .blk — khối chỉ bị cắt cứng khi cao hơn cả một trang. */
function paginate(blocks: { top: number; height: number }[], totalHeight: number): { start: number; end: number }[] {
  const pages: { start: number; end: number }[] = [];
  let start = 0;
  for (const b of blocks) {
    const end = b.top + b.height;
    if (end - start <= PAGE_CAP_CSS) continue;
    if (b.height > PAGE_CAP_CSS) {
      if (b.top > start) {
        pages.push({ start, end: b.top });
        start = b.top;
      }
      while (end - start > PAGE_CAP_CSS) {
        pages.push({ start, end: start + PAGE_CAP_CSS });
        start += PAGE_CAP_CSS;
      }
    } else {
      pages.push({ start, end: b.top });
      start = b.top;
    }
  }
  if (totalHeight > start) pages.push({ start, end: Math.min(totalHeight, start + PAGE_CAP_CSS) });
  return pages;
}

/** Cắt một dải ngang của canvas gốc thành ảnh JPEG cho một trang */
function cropSlice(src: HTMLCanvasElement, syCss: number, shCss: number, scale: number): { img: string; hMm: number } {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = Math.max(1, Math.round(shCss * scale));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, 0, Math.round(syCss * scale), src.width, c.height, 0, 0, src.width, c.height);
  return { img: c.toDataURL('image/jpeg', 0.92), hMm: shCss / CSS_PX_PER_MM };
}

/** Vẽ chuỗi tiếng Việt thành ảnh (canvas 2D hỗ trợ Unicode; font PDF mặc định thì không) */
function textToImage(text: string, opts: { font: string; color: string; pad?: number }): { img: string; w: number; h: number } {
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = opts.font;
  const pad = opts.pad ?? 4;
  const m = measure.measureText(text);
  const w = Math.ceil(m.width) + pad * 2;
  const h = Math.ceil((m.actualBoundingBoxAscent || 20) + (m.actualBoundingBoxDescent || 8)) + pad * 2;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.font = opts.font;
  ctx.fillStyle = opts.color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, pad, pad);
  return { img: c.toDataURL('image/png'), w, h };
}

/** Ảnh watermark chéo "BẢN NHÁP — CHƯA PHÊ DUYỆT" phủ giữa trang */
function draftWatermarkImage(): string {
  const c = document.createElement('canvas');
  c.width = 1400;
  c.height = 900;
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((-18 * Math.PI) / 180);
  ctx.font = 'bold 96px "Times New Roman", serif';
  ctx.fillStyle = 'rgba(190, 30, 30, 0.10)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BẢN NHÁP — CHƯA PHÊ DUYỆT', 0, 0);
  return c.toDataURL('image/png');
}

interface PageMeta {
  footerLeft: string;
  footerRight: string;
  watermark: boolean;
}

/**
 * Dựng jsPDF chứa một hoặc nhiều phiếu (mỗi phiếu bắt đầu ở trang mới).
 * Trả về đối tượng jsPDF để nơi gọi save()/output() tuỳ mục đích (tải 1 phiếu
 * hoặc gộp cả kỳ thành một file lưu hồ sơ).
 */
export async function buildBM01PdfDoc(
  items: BM01ExportData[],
  onProgress?: (done: number, total: number) => void,
): Promise<jsPDF> {
  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const pdf = new JsPDF('l', 'mm', 'a4');
  const pageMetas: PageMeta[] = [];
  const exportedAtText = new Date().toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  for (let i = 0; i < items.length; i++) {
    const data = items[i];
    const html = buildBM01PrintHtml(data, 'BM01', exportedAtText);
    const iframe = await renderInHiddenIframe(html);
    try {
      const body = iframe.contentDocument?.body;
      if (!body) throw new Error('Không dựng được nội dung bản in.');
      iframe.style.height = `${body.scrollHeight + 40}px`;

      const bodyRect = body.getBoundingClientRect();
      const blocks = Array.from(iframe.contentDocument!.querySelectorAll('.blk')).map((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return { top: r.top - bodyRect.top, height: r.height };
      });

      const canvas = await html2canvas(body, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        windowWidth: LAYOUT_WIDTH_PX,
        width: LAYOUT_WIDTH_PX,
      });
      const scale = canvas.width / LAYOUT_WIDTH_PX;

      const pages = paginate(blocks, body.scrollHeight);
      const watermark = !isApprovedFormStatus(data.extras?.formStatus);
      const code = rutGonMa(data.extras?.formCode);
      const footerLeft = `Biểu mẫu BM01 · ${data.profile.full_name || ''} · Kỳ: ${data.cycleName}`;
      const footerRight = `Mã phiếu: ${code || '—'} · Xuất lúc: ${exportedAtText}`;

      pages.forEach((pg) => {
        if (pageMetas.length > 0) pdf.addPage(); // jsPDF khởi tạo đã có sẵn trang 1
        const { img, hMm } = cropSlice(canvas, pg.start, pg.end - pg.start, scale);
        pdf.addImage(img, 'JPEG', MARGIN_X_MM, MARGIN_TOP_MM, CONTENT_W_MM, hMm);
        pageMetas.push({ footerLeft, footerRight, watermark });
      });
    } finally {
      iframe.remove();
    }
    onProgress?.(i + 1, items.length);
  }

  // Chân trang + watermark — vẽ sau cùng khi đã biết tổng số trang
  const total = pageMetas.length;
  const wmImg = pageMetas.some((m) => m.watermark) ? draftWatermarkImage() : null;
  const footerY = PAGE_H_MM - 6.5;
  pageMetas.forEach((meta, idx) => {
    pdf.setPage(idx + 1);
    if (meta.watermark && wmImg) {
      // Phủ giữa vùng nội dung, giữ tỉ lệ 1400x900
      const wMm = 200;
      const hMm = (wMm * 900) / 1400;
      pdf.addImage(wmImg, 'PNG', (PAGE_W_MM - wMm) / 2, (PAGE_H_MM - hMm) / 2, wMm, hMm);
    }
    const left = textToImage(`${meta.footerLeft} · Trang ${idx + 1}/${total}`, { font: '26px "Times New Roman", serif', color: '#555555' });
    const right = textToImage(meta.footerRight, { font: '26px "Times New Roman", serif', color: '#555555' });
    const scaleMm = 2.6 / left.h; // cao ~2.6mm
    pdf.addImage(left.img, 'PNG', MARGIN_X_MM, footerY, left.w * scaleMm, left.h * scaleMm);
    const rScale = 2.6 / right.h;
    pdf.addImage(right.img, 'PNG', PAGE_W_MM - MARGIN_X_MM - right.w * rScale, footerY, right.w * rScale, right.h * rScale);
  });

  return pdf;
}

const safeFilePart = (s: string) => s.replace(/[/\s]+/g, '_');

/** Xuất một phiếu ra file PDF và tải xuống trực tiếp (một chạm). */
export async function exportBM01ToPdf(data: BM01ExportData): Promise<void> {
  const pdf = await buildBM01PdfDoc([data]);
  const name = `BM01_${safeFilePart(data.profile.full_name || 'CanBo')}_${safeFilePart(data.cycleName)}.pdf`;
  pdf.save(name);
}

/** Gộp nhiều phiếu (đã phê duyệt) của một kỳ thành MỘT file PDF để in lưu hồ sơ. */
export async function exportBM01BatchToPdf(
  items: BM01ExportData[],
  fileName: string,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  if (!items.length) throw new Error('Không có phiếu nào để xuất.');
  const pdf = await buildBM01PdfDoc(items, onProgress);
  pdf.save(fileName);
}

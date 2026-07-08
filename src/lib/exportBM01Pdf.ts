// Xuất biểu mẫu đánh giá năng lực ra PDF (bản in cố định, không chỉnh sửa) —
// mọi việc chỉnh sửa/trao đổi vẫn thực hiện trong web. Bản in dựng bằng HTML
// khổ A4 nằm ngang với bảng table-layout:fixed + break-inside:avoid nên KHÔNG
// bao giờ tràn ngang hay cắt ngang giữa dòng khi in / lưu PDF.
import type { BM01ExportData, SignatureInfo } from '@/lib/exportBM01';
import { ATTITUDE_LABEL, IMPROVEMENT_STATUS_LABEL, focusLabels, fmtSignDate } from '@/lib/exportBM01Labels';
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

function skillSection(
  title: string,
  list: BM01ExportData['coreAssessments'],
  hasLevels: boolean,
): string {
  if (!list.length) return '';
  const rows = list
    .map((a, i) => {
      const detail = [
        labeled('Minh chứng', a.evidence),
        labeled('Nhận xét của cán bộ', a.employee_comment),
        labeled('Nhận xét của lãnh đạo', a.manager_note),
      ].join('');
      return `
      <tr>
        <td class="c">${i + 1}</td>
        <td><b>${esc(`${a.skill_code ? a.skill_code + '. ' : ''}${a.skill_name}`)}</b></td>
        <td class="c">${hasLevels ? esc(fmtLevel(a.minimum_level)) : '—'}</td>
        <td class="c">${hasLevels ? esc(fmtLevel(a.advanced_level)) : '—'}</td>
        <td class="c">${blank(fmtLevel(a.self_assessed_level))}</td>
        <td class="c">${blank(fmtLevel(a.manager_assessed_level))}</td>
      </tr>
      <tr><td></td><td colspan="5" class="detail">${detail}</td></tr>`;
    })
    .join('');
  const titleHtml = title ? `<div class="sec">${esc(title)}</div>` : '';
  return `
    ${titleHtml}
    <table>
      <colgroup>
        <col style="width:5%"><col style="width:47%"><col style="width:12%">
        <col style="width:12%"><col style="width:12%"><col style="width:12%">
      </colgroup>
      <thead><tr>
        <th>TT</th><th>Kỹ năng</th><th>Mức tối thiểu</th><th>Mức mục tiêu</th>
        <th>Tự đánh giá</th><th>Lãnh đạo đánh giá</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function attitudeSection(list: BM01ExportData['attitudeAssessments']): string {
  const rows = list
    .map((a, i) => {
      const detail = [
        labeled('Minh chứng / biểu hiện hiện tại', a.evidence_text || a.current_status),
        labeled('Điểm cần cải thiện chính', focusLabels(a.attitude_dimension_id, a.improvement_focus, a.improvement_focus_other)),
        labeled('Hành động cải thiện', a.improvement_action || a.improvement_goal),
        labeled('Thời hạn', a.improvement_deadline),
        labeled('Kết quả / bằng chứng mong đợi', a.expected_evidence),
        labeled('Hỗ trợ cần thiết', a.support_needed),
        labeled('Trạng thái thực hiện', a.improvement_status ? (IMPROVEMENT_STATUS_LABEL[a.improvement_status] || a.improvement_status) : ''),
      ].join('');
      return `
      <tr>
        <td class="c">${i + 1}</td>
        <td><b>${esc(a.attitude_name)}</b></td>
        <td class="c">${blank(ATTITUDE_LABEL[a.self_status] || '')}</td>
        <td class="c">${blank(ATTITUDE_LABEL[a.manager_status] || '')}</td>
      </tr>
      <tr><td></td><td colspan="3" class="detail">${detail}</td></tr>`;
    })
    .join('');
  return `
    <div class="sec">B. ĐÁNH GIÁ 6 NHÓM THÁI ĐỘ &amp; KẾ HOẠCH CẢI THIỆN</div>
    <table>
      <colgroup><col style="width:5%"><col style="width:63%"><col style="width:16%"><col style="width:16%"></colgroup>
      <thead><tr><th>TT</th><th>Nhóm thái độ</th><th>Tự đánh giá</th><th>Lãnh đạo đánh giá</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function previousActionsSection(data: BM01ExportData): string {
  const prev = data.extras?.previousActions;
  const items = prev?.items.length
    ? prev.items
    : Array.from({ length: 3 }, () => ({
        typeLabel: '', actionText: '', expectedResult: '', actualResult: '',
        selfStatusLabel: '', managerStatusLabel: '', evidence: '', employeeNote: '', managerNote: '',
      }));
  const rows = items
    .map((it, i) => {
      const detail = [
        labeled('Kết quả mong đợi', it.expectedResult),
        labeled('Kết quả thực tế', it.actualResult),
        labeled('Bằng chứng', it.evidence),
        labeled('Ghi chú của cán bộ', it.employeeNote),
        labeled('Nhận xét của lãnh đạo', it.managerNote),
      ].join('');
      return `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${it.actionText ? `<b>${esc(`${it.typeLabel ? `[${it.typeLabel}] ` : ''}${it.actionText}`)}</b>` : '&nbsp;'}</td>
        <td class="c">${blank(it.selfStatusLabel)}</td>
        <td class="c">${blank(it.managerStatusLabel)}</td>
      </tr>
      <tr><td></td><td colspan="3" class="detail">${detail}</td></tr>`;
    })
    .join('');
  const cycle = prev?.cycleName ? ` (${prev.cycleName})` : '';
  return `
    <div class="sec">C. RÀ SOÁT KẾ HOẠCH HÀNH ĐỘNG KỲ TRƯỚC${esc(cycle)}</div>
    <table>
      <colgroup><col style="width:5%"><col style="width:63%"><col style="width:16%"><col style="width:16%"></colgroup>
      <thead><tr><th>TT</th><th>Hành động đã cam kết kỳ trước</th><th>Tự đánh giá</th><th>Lãnh đạo đánh giá</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function overallSection(data: BM01ExportData): string {
  const c = data.extras?.comments;
  const commentTable = `
    <table>
      <colgroup><col style="width:25%"><col style="width:75%"></colgroup>
      <tbody>
        <tr><th class="l">Ý kiến của cán bộ</th><td>${blank(c?.employee)}</td></tr>
        <tr><th class="l">Nhận xét của Trưởng phòng / người đánh giá</th><td>${blank(c?.manager)}</td></tr>
        <tr><th class="l">Ý kiến của Phó Giám đốc phụ trách</th><td>${blank(c?.pgd)}</td></tr>
      </tbody>
    </table>`;

  const byTitle = new Map((data.extras?.overallReviews || []).map(r => [r.title, r]));
  const titles = [
    ...DEFAULT_OVERALL_TITLES,
    ...(data.extras?.overallReviews || []).map(r => r.title).filter(t => !DEFAULT_OVERALL_TITLES.includes(t)),
  ];
  const overallTables = titles
    .map((title) => {
      const rv = byTitle.get(title);
      const valueOf = (label: string) => rv?.fields.find(f => f.label === label)?.value || '';
      const rows = OVERALL_FIELD_LABELS
        .map(label => `<tr><th class="l">${esc(label)}</th><td>${blank(valueOf(label))}</td></tr>`)
        .join('');
      return `
      <table class="mt">
        <colgroup><col style="width:25%"><col style="width:75%"></colgroup>
        <thead><tr><th colspan="2">${esc(title)}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    })
    .join('');

  return `<div class="sec">D. NHẬN XÉT &amp; ĐÁNH GIÁ TỔNG THỂ CỦA LÃNH ĐẠO</div>${commentTable}${overallTables}`;
}

function oneOnOneSection(data: BM01ExportData): string {
  const oneOnOne = data.extras?.oneOnOne || data.oneOnOne;
  const questions = data.extras?.oneOnOneQuestions?.length ? data.extras.oneOnOneQuestions : DEFAULT_ONE_ON_ONE_QUESTIONS;
  const tables = questions
    .map((q, idx) => {
      const ans = oneOnOne?.answers?.[q.key] || { employee: '', manager: '' };
      return `
      <table class="mt">
        <colgroup><col style="width:50%"><col style="width:50%"></colgroup>
        <thead>
          <tr><th colspan="2">${idx + 1}. ${esc(q.text)}</th></tr>
          <tr><th class="l">Trả lời của cán bộ</th><th class="l">Ý kiến của lãnh đạo</th></tr>
        </thead>
        <tbody><tr><td>${blank(ans.employee)}</td><td>${blank(ans.manager)}</td></tr></tbody>
      </table>`;
    })
    .join('');
  return `<div class="sec">E. CÂU HỎI TRAO ĐỔI 1-1 (CÁN BỘ ↔ LÃNH ĐẠO)</div>${tables}`;
}

function signatureSection(data: BM01ExportData): string {
  const s = data.extras?.signatures;
  const p = data.profile;
  const cellFor = (title: string, sig: SignatureInfo | undefined, systemLabel: string) => `
    <td class="sign">
      <div class="sign-title"><b>${esc(title)}</b></div>
      <div class="sign-hint">(Ký, ghi rõ họ tên)</div>
      <div class="sign-space">&nbsp;</div>
      <div class="sign-name"><b>${esc(sig?.name || '')}</b></div>
      ${sig?.date ? `<div class="sign-date">${esc(systemLabel)}: ${esc(fmtSignDate(sig.date))}</div>` : ''}
    </td>`;
  return `
    <table class="mt sign-table">
      <colgroup><col style="width:33.33%"><col style="width:33.33%"><col style="width:33.34%"></colgroup>
      <tbody><tr>
        ${cellFor('CÁN BỘ TỰ ĐÁNH GIÁ', { name: s?.employee.name || p.full_name, date: s?.employee.date }, 'Đã nộp trên hệ thống')}
        ${cellFor('LÃNH ĐẠO ĐÁNH GIÁ', { name: s?.reviewer.name || p.manager_name, date: s?.reviewer.date }, 'Đã duyệt trên hệ thống')}
        ${cellFor('PHÓ GIÁM ĐỐC PHÊ DUYỆT', { name: s?.approver.name || p.pgd_name, date: s?.approver.date }, 'Đã phê duyệt trên hệ thống')}
      </tr></tbody>
    </table>`;
}

export function buildBM01PrintHtml(data: BM01ExportData, docTitle = 'BM01'): string {
  const { profile, cycleName } = data;
  const supp = data.supplementaryAssessments || [];
  const legend = `Chú thích mức năng lực: ${[1, 2, 3, 4].map(n => `Mức ${n} – ${LEVEL_LABELS[n]}`).join(' · ')}. `
    + `Mức tối thiểu = yêu cầu của vị trí; Mức mục tiêu = mức nâng cao cần hướng tới.`;

  const body = `
    <h1>PHIẾU ĐÁNH GIÁ NĂNG LỰC CÁN BỘ (BM01)</h1>
    <div class="subtitle">Kỳ đánh giá: ${esc(cycleName)}</div>
    <div class="meta">
      <div>Họ tên: <b>${esc(profile.full_name)}</b>${profile.employee_code ? `&nbsp;&nbsp;&nbsp;&nbsp;Mã cán bộ: ${esc(profile.employee_code)}` : ''}</div>
      <div>Vị trí: ${esc(profile.pos_name)}&nbsp;&nbsp;&nbsp;&nbsp;Đơn vị: ${esc(profile.dept_name)}</div>
      <div>Người đánh giá (lãnh đạo trực tiếp): ${esc(data.extras?.signatures?.reviewer.name || profile.manager_name)}</div>
      <div>Phó Giám đốc phụ trách: ${esc(data.extras?.signatures?.approver.name || profile.pgd_name)}</div>
    </div>

    <div class="sec">A. ĐÁNH GIÁ KỸ NĂNG LÕI THEO VỊ TRÍ</div>
    <div class="legend">${esc(legend)}</div>
    ${skillSection('', data.coreAssessments, true)}
    ${supp.length ? skillSection('A2. SKILL BỔ TRỢ (NGOÀI CHUẨN VỊ TRÍ)', supp, false) : ''}
    ${attitudeSection(data.attitudeAssessments)}
    ${previousActionsSection(data)}
    ${overallSection(data)}
    ${oneOnOneSection(data)}
    ${signatureSection(data)}`;

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>${esc(docTitle)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12px; color: #000; line-height: 1.35; }
  h1 { text-align: center; font-size: 18px; margin: 0 0 4px; }
  .subtitle { text-align: center; font-style: italic; font-size: 13px; margin-bottom: 8px; }
  .meta { margin-bottom: 10px; }
  .meta div { margin: 1px 0; }
  .sec { font-weight: bold; font-size: 14px; margin: 12px 0 4px; }
  .legend { font-style: italic; font-size: 10px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.mt { margin-top: 8px; }
  th, td { border: 1px solid #999; padding: 4px 6px; vertical-align: top; text-align: left; word-wrap: break-word; overflow-wrap: anywhere; }
  th { background: #e7e6e6; font-weight: bold; }
  th.l { background: #f2f2f2; }
  td.c, th.c { text-align: center; }
  td.detail { background: #fcfcfc; }
  td.detail .lbl { margin: 1px 0; }
  tr, table.mt, .sign-table { break-inside: avoid; page-break-inside: avoid; }
  .sign { text-align: center; padding: 8px 6px 24px; }
  .sign-title { margin-bottom: 2px; }
  .sign-hint { font-style: italic; font-size: 11px; }
  .sign-space { height: 46px; }
  .sign-name { min-height: 16px; }
  .sign-date { font-size: 10px; }
</style></head>
<body>${body}</body></html>`;
}

// Bề rộng bố cục (px) khi dựng bản in để chụp — tỉ lệ ~ A4 ngang, cho chữ đủ rộng.
const LAYOUT_WIDTH_PX = 1400;

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

/**
 * Xuất biểu mẫu ra file PDF và tải xuống trực tiếp (một chạm, không qua hộp thoại in).
 * Dựng bản in HTML khổ A4 ngang trong iframe ẩn → chụp bằng html2canvas → ghép vào
 * jsPDF A4 ngang đa trang. Bản in do ta kiểm soát nên không tràn ngang / cắt cột.
 */
export async function exportBM01ToPdf(data: BM01ExportData): Promise<void> {
  const safeName = (data.profile.full_name || 'CanBo').replace(/\s+/g, '_');
  const safeCycle = data.cycleName.replace(/[/\s]+/g, '_');
  const docTitle = `BM01_${safeName}_${safeCycle}`;
  const html = buildBM01PrintHtml(data, docTitle);

  const iframe = await renderInHiddenIframe(html);
  try {
    const body = iframe.contentDocument?.body;
    if (!body) throw new Error('Không dựng được nội dung bản in.');
    // Cho iframe cao bằng nội dung để html2canvas chụp trọn vẹn
    iframe.style.height = `${body.scrollHeight + 40}px`;

    const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(body, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth: LAYOUT_WIDTH_PX,
      width: LAYOUT_WIDTH_PX,
    });

    const pdf = new JsPDF('l', 'mm', 'a4'); // khổ A4 nằm ngang
    const margin = 8; // lề trái/phải 8mm — bản chụp fit vừa bề ngang, không tràn
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const contentW = pw - margin * 2;
    const imgH = (canvas.height * contentW) / canvas.width;
    const img = canvas.toDataURL('image/jpeg', 0.92);

    // Ghép ảnh cao vào nhiều trang: mỗi trang là một "cửa sổ" cao ph nhìn vào ảnh.
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(img, 'JPEG', margin, position, contentW, imgH);
    heightLeft -= ph;
    while (heightLeft > 0) {
      position -= ph;
      pdf.addPage();
      pdf.addImage(img, 'JPEG', margin, position, contentW, imgH);
      heightLeft -= ph;
    }
    pdf.save(`${docTitle}.pdf`);
  } finally {
    iframe.remove();
  }
}

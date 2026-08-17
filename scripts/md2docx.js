/**
 * Chuyển tài liệu đặc tả Markdown sang Word (.docx).
 * Hỗ trợ đúng tập cú pháp dùng trong docs/: tiêu đề, đoạn văn, bảng pipe,
 * khối mã, trích dẫn, danh sách, đường kẻ ngang, và định dạng nội dòng.
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  TableOfContents, PageBreak, Header, Footer, PageNumber, LevelFormat,
  convertMillimetersToTwip,
} = require('docx');

// ---- Bảng màu thương hiệu Bắc Hưng Yên ONE (src/index.css) ----
const NAVY = '003A8C';
const ROYAL = '0057B8';
const SKY = '1E88E5';
const RED = 'E60012';
const INK = '1A1A1A';
const MUTED = '5A5A5A';
const RULE = 'C8D3E4';
const CODE_BG = 'F2F5F9';
const QUOTE_BG = 'FFF8E6';
const QUOTE_BAR = 'D9A400';
const HEAD_BG = 'E8EEF7';

const BODY_FONT = 'Times New Roman';
const HEAD_FONT = 'Arial';
const MONO_FONT = 'Courier New';

const PAGE_W = 11906;              // A4 dọc (dxa)
const MARGIN_X = 1021;             // 1,8cm — nới ngang để bảng nhiều cột thở được
const CONTENT_W = PAGE_W - MARGIN_X * 2;

// ============================ ĐỊNH DẠNG NỘI DÒNG ============================
// Dựng TextRun sau khi loại các khóa rỗng — cho phép `override` tắt một thuộc
// tính (vd: bỏ nền của đoạn `mã` khi nó nằm trong tiêu đề hoặc ô tiêu đề bảng).
function mkRun(opts) {
  const clean = {};
  for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== null) clean[k] = v;
  return new TextRun(clean);
}

// Quét lần lượt tìm mẫu khớp sớm nhất: `mã`, **đậm**, *nghiêng*, [chữ](đích).
// `base`  — định dạng nền, phần nào cũng có thể bị mẫu nội dòng ghi đè.
// `override` — áp CUỐI CÙNG cho mọi run, kể cả run mã. Bắt buộc phải đi đường
// này: TextRun không phơi ra `options` nên không thể sửa run sau khi đã dựng
// (đọc `r.options` trả về undefined và làm mất sạch phần chữ).
function inlineRuns(text, base = {}, override = {}) {
  const runs = [];
  let rest = text;

  const PATTERNS = [
    { re: /`([^`]+)`/, kind: 'code' },
    { re: /\*\*([^*]+)\*\*/, kind: 'bold' },
    { re: /\*([^*]+)\*/, kind: 'italic' },
    { re: /\[([^\]]+)\]\(([^)]+)\)/, kind: 'link' },
  ];

  const push = (t, extra = {}) => {
    if (t === '') return;
    // Gỡ ký tự thoát Markdown (\< \> \* \| …) — chỉ ở chữ thường, KHÔNG ở đoạn
    // `mã` vì trong mã dấu gạch chéo là ký tự thật.
    const text = t.replace(/\\([\\`*_{}[\]()#+\-.!<>|~])/g, '$1');
    runs.push(mkRun({
      text, font: BODY_FONT, size: 22, color: INK, ...base, ...extra, ...override,
    }));
  };

  while (rest.length) {
    let best = null;
    for (const p of PATTERNS) {
      const m = p.re.exec(rest);
      if (m && (best === null || m.index < best.m.index)) best = { m, kind: p.kind };
    }
    if (!best) { push(rest); break; }

    push(rest.slice(0, best.m.index));
    const inner = best.m[1];

    if (best.kind === 'code') {
      runs.push(mkRun({
        text: inner, font: MONO_FONT, size: 19, color: NAVY,
        shading: { type: ShadingType.CLEAR, fill: CODE_BG }, ...base, ...override,
      }));
    } else if (best.kind === 'bold' || best.kind === 'italic') {
      // Đệ quy: phần đậm/nghiêng có thể còn lồng `mã` bên trong
      // (vd **`criterion_id`**) — không đệ quy thì backtick bị in ra thành chữ.
      const mark = best.kind === 'bold' ? { bold: true } : { italics: true };
      runs.push(...inlineRuns(inner, { ...base, ...mark }, override));
    } else if (best.kind === 'link') {
      // Nhãn link cũng có thể là `mã` (vd [`tệp.md`](./tệp.md)) nên phải đệ quy.
      // Đích link bị bỏ: toàn bộ link trong tài liệu là đường dẫn tương đối
      // trong kho mã, mở từ Word cũng không tới đâu.
      runs.push(...inlineRuns(inner, { ...base, color: ROYAL, underline: {} }, override));
    }
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return runs;
}

// ================================ KHỐI NỘI DUNG ================================
const para = (text, opts = {}) => new Paragraph({
  children: inlineRuns(text, opts.runProps || {}),
  spacing: { before: opts.before ?? 0, after: opts.after ?? 120, line: 288 },
  alignment: opts.alignment,
  indent: opts.indent,
  ...(opts.paraProps || {}),
});

function heading(text, level) {
  const spec = {
    1: { size: 34, color: NAVY, before: 0, after: 200, hl: HeadingLevel.HEADING_1 },
    2: { size: 28, color: NAVY, before: 360, after: 160, hl: HeadingLevel.HEADING_2 },
    3: { size: 24, color: ROYAL, before: 280, after: 120, hl: HeadingLevel.HEADING_3 },
    4: { size: 22, color: ROYAL, before: 240, after: 100, hl: HeadingLevel.HEADING_4 },
  }[level];

  return new Paragraph({
    heading: spec.hl,
    spacing: { before: spec.before, after: spec.after },
    keepNext: true,
    ...(level <= 2 ? {
      border: { bottom: { style: BorderStyle.SINGLE, size: level === 1 ? 12 : 6, color: level === 1 ? NAVY : RULE, space: 6 } },
    } : {}),
    children: inlineRuns(text, {}, {
      font: HEAD_FONT, size: spec.size, bold: true, color: spec.color, shading: null,
    }),
  });
}

const hr = () => new Paragraph({
  text: '',
  spacing: { before: 160, after: 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 1 } },
});

// Khối mã: nền xám nhạt + thanh nhấn trái.
// KHÔNG dùng khung bao bốn cạnh: docx-js phát <w:pBdr> theo thứ tự
// top → bottom → left → right, trong khi lược đồ CT_PBdr đòi
// top → left → bottom → right, nên hễ một đoạn có cả `bottom` lẫn `left`
// là tệp hỏng (Word/LibreOffice từ chối mở). Nền + thanh trái đã đủ tách khối.
function codeBlock(lines) {
  return lines.map((ln, i) => new Paragraph({
    children: [new TextRun({ text: ln === '' ? ' ' : ln, font: MONO_FONT, size: 17, color: '20303F' })],
    shading: { type: ShadingType.CLEAR, fill: CODE_BG },
    spacing: { before: i === 0 ? 140 : 0, after: i === lines.length - 1 ? 180 : 0, line: 240 },
    indent: { left: 170, right: 170 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: SKY, space: 8 } },
  }));
}

function quoteBlock(lines) {
  const out = [];
  const flushPara = (buf) => {
    if (!buf.length) return;
    out.push(new Paragraph({
      children: inlineRuns(buf.join(' ')),
      shading: { type: ShadingType.CLEAR, fill: QUOTE_BG },
      spacing: { before: 60, after: 60, line: 276 },
      indent: { left: 230, right: 170 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: QUOTE_BAR, space: 10 } },
    }));
    buf.length = 0;
  };

  let buf = [];
  for (const raw of lines) {
    const ln = raw.replace(/^>\s?/, '');
    if (ln.trim() === '') { flushPara(buf); continue; }
    const num = /^(\d+)\.\s+(.*)$/.exec(ln);
    const bul = /^[-*]\s+(.*)$/.exec(ln);
    if (num || bul) {
      flushPara(buf);
      out.push(new Paragraph({
        children: inlineRuns((num ? `${num[1]}.  ` : '•  ') + (num ? num[2] : bul[1])),
        shading: { type: ShadingType.CLEAR, fill: QUOTE_BG },
        spacing: { before: 40, after: 40, line: 276 },
        indent: { left: 520, hanging: 230, right: 170 },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: QUOTE_BAR, space: 10 } },
      }));
    } else {
      buf.push(ln);
    }
  }
  flushPara(buf);
  return out;
}

function listItem(text, ordered, marker) {
  return new Paragraph({
    children: inlineRuns((ordered ? `${marker}.  ` : '•  ') + text),
    spacing: { before: 40, after: 40, line: 276 },
    indent: { left: 400, hanging: 230 },
  });
}

// ==================================== BẢNG ====================================
const splitRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

function buildTable(rawRows) {
  const header = splitRow(rawRows[0]);
  const body = rawRows.slice(2).map(splitRow);
  const nCol = header.length;
  const norm = (r) => (r.length >= nCol ? r.slice(0, nCol) : [...r, ...Array(nCol - r.length).fill('')]);
  const rows = body.map(norm);

  // Bề rộng cột theo độ dài nội dung thực tế, có chặn trên/dưới để cột ngắn
  // không bị bóp nát và cột dài không nuốt hết bảng.
  const weights = header.map((h, i) => {
    const lens = [h.replace(/[*`]/g, '').length * 1.15, ...rows.map((r) => r[i].replace(/[*`]/g, '').length)];
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    const max = Math.max(...lens);
    return Math.min(Math.max(avg * 0.65 + max * 0.35, 7), 64);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.max(Math.round((w / total) * CONTENT_W), 700));
  // Bù sai số làm tròn vào cột rộng nhất để tổng khớp đúng bề ngang bảng.
  const drift = CONTENT_W - widths.reduce((a, b) => a + b, 0);
  widths[widths.indexOf(Math.max(...widths))] += drift;

  const edge = (color, size) => ({ style: BorderStyle.SINGLE, size, color });
  // Thứ tự khóa phải đúng lược đồ CT_TcBorders: top → left → bottom → right.
  const cellBorders = {
    top: edge(RULE, 2), left: edge(RULE, 2), bottom: edge(RULE, 2), right: edge(RULE, 2),
  };

  const mkCell = (text, i, isHeader, zebra) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: isHeader ? NAVY : (zebra ? 'F7F9FC' : 'FFFFFF') },
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    borders: cellBorders,
    children: [new Paragraph({
      spacing: { before: 0, after: 0, line: 264 },
      // Ô tiêu đề luôn chữ trắng đậm trên nền navy, kể cả đoạn vốn là `mã`
      // hay **đậm** — nên định dạng đó phải áp ở tầng override.
      children: inlineRuns(
        text,
        {},
        isHeader ? { color: 'FFFFFF', bold: true, shading: null, font: HEAD_FONT, size: 20 } : {},
      ),
    })],
  });

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    layout: 'fixed',
    rows: [
      new TableRow({
        tableHeader: true,
        children: header.map((h, i) => mkCell(h, i, true, false)),
      }),
      ...rows.map((r, ri) => new TableRow({
        children: r.map((c, i) => mkCell(c, i, false, ri % 2 === 1)),
      })),
    ],
  });
}

// ================================ BỘ PHÂN TÍCH ================================
function parse(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  let paraBuf = [];

  const flushPara = () => {
    if (!paraBuf.length) return;
    out.push(para(paraBuf.join(' ')));
    paraBuf = [];
  };

  while (i < lines.length) {
    const ln = lines[i];
    const t = ln.trim();

    if (t === '') { flushPara(); i++; continue; }

    // Khối mã
    if (t.startsWith('```')) {
      flushPara();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(...codeBlock(buf));
      continue;
    }

    // Đường kẻ ngang — bỏ qua vì tiêu đề đã có kẻ chân riêng
    if (/^---+$/.test(t)) { flushPara(); i++; continue; }

    // Tiêu đề
    const h = /^(#{1,4})\s+(.*)$/.exec(t);
    if (h) { flushPara(); out.push(heading(h[2], h[1].length)); i++; continue; }

    // Trích dẫn
    if (t.startsWith('>')) {
      flushPara();
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) buf.push(lines[i++].trim());
      out.push(...quoteBlock(buf));
      continue;
    }

    // Bảng
    if (t.startsWith('|')) {
      flushPara();
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) buf.push(lines[i++]);
      if (buf.length >= 2 && /^\|[\s:|-]+\|$/.test(buf[1].trim())) {
        out.push(buildTable(buf));
        out.push(new Paragraph({ text: '', spacing: { after: 160 } }));
      } else {
        buf.forEach((b) => out.push(para(b)));
      }
      continue;
    }

    // Danh sách
    const num = /^(\d+)\.\s+(.*)$/.exec(t);
    const bul = /^[-*]\s+(.*)$/.exec(t);
    if (num || bul) {
      flushPara();
      // Dòng nối tiếp của cùng một mục (thụt lề) được gộp vào mục đó
      let text = num ? num[2] : bul[1];
      i++;
      while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*\d]/.test(lines[i])) {
        text += ' ' + lines[i].trim();
        i++;
      }
      out.push(listItem(text, !!num, num ? num[1] : null));
      continue;
    }

    paraBuf.push(t);
    i++;
  }
  flushPara();
  return out;
}

// ================================ TRANG BÌA ================================
function coverPage(meta) {
  const line = (text, opts) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: opts.spacing,
    children: [new TextRun({
      text, font: HEAD_FONT, size: opts.size, bold: opts.bold, color: opts.color,
      ...(opts.caps ? { allCaps: true } : {}),
    })],
  });

  return [
    new Paragraph({ text: '', spacing: { before: 1500 } }),
    line('VietinBank — Chi nhánh Bắc Hưng Yên', { size: 24, bold: true, color: RED, spacing: { after: 80 } }),
    line('Cổng nội bộ Bắc Hưng Yên ONE', { size: 22, bold: false, color: MUTED, spacing: { after: 700 } }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      border: { top: { style: BorderStyle.SINGLE, size: 18, color: NAVY, space: 14 } },
      children: [new TextRun({ text: 'ĐẶC TẢ BỘ TIÊU CHÍ ĐÁNH GIÁ', font: HEAD_FONT, size: 40, bold: true, color: NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 260 },
      children: [new TextRun({ text: 'Hội đồng đánh giá đầu mối', font: HEAD_FONT, size: 32, bold: true, color: ROYAL })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 900 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: NAVY, space: 14 } },
      children: [new TextRun({ text: 'Khu 4 — Chiêu thức 3: Phát triển nhân sự', font: HEAD_FONT, size: 24, bold: false, color: MUTED })],
    }),

    ...[
      ['Phiên bản', meta.version],
      ['Ngày ban hành', meta.date],
      ['Đầu mối vận hành', meta.owner],
      ['Phạm vi', meta.scope],
    ].map(([k, v]) => new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 70 },
      children: [
        new TextRun({ text: `${k}:  `, font: HEAD_FONT, size: 21, color: MUTED }),
        new TextRun({ text: v, font: HEAD_FONT, size: 21, bold: true, color: INK }),
      ],
    })),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ================================== DỰNG FILE ==================================
const srcPath = process.argv[2];
const outPath = process.argv[3];
let md = fs.readFileSync(srcPath, 'utf8');

// Bỏ khối tiêu đề + siêu dữ liệu đầu tệp: đã dựng thành trang bìa riêng.
md = md.replace(/^[\s\S]*?\*\*Phạm vi tài liệu:\*\*[^\n]*\n/, '');

const body = parse(md);

const doc = new Document({
  creator: 'VietinBank Bắc Hưng Yên — Cổng nội bộ ONE',
  title: 'Đặc tả bộ tiêu chí đánh giá Hội đồng đầu mối',
  description: 'Đặc tả bộ câu hỏi định hướng của Hội đồng đánh giá đầu mối — Chiêu thức 3',
  styles: {
    default: {
      document: { run: { font: BODY_FONT, size: 22, color: INK } },
    },
  },
  numbering: { config: [] },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: 16838 },
        margin: { top: 1134, right: MARGIN_X, bottom: 1134, left: MARGIN_X, header: 567, footer: 567 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 60 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
          children: [new TextRun({
            text: 'Đặc tả bộ tiêu chí — Hội đồng đánh giá đầu mối',
            font: HEAD_FONT, size: 16, color: MUTED,
          })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Trang ', font: HEAD_FONT, size: 16, color: MUTED }),
            new TextRun({ children: [PageNumber.CURRENT], font: HEAD_FONT, size: 16, color: MUTED, bold: true }),
            new TextRun({ text: ' / ', font: HEAD_FONT, size: 16, color: MUTED }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: HEAD_FONT, size: 16, color: MUTED }),
          ],
        })],
      }),
    },
    children: [
      ...coverPage({
        version: 'v1.0',
        date: '17/08/2026',
        owner: 'Phòng Tổ chức Tổng hợp (TCTH)',
        scope: 'Bộ tiêu chí (bộ câu hỏi định hướng)',
      }),
      heading('Mục lục', 2),
      new TableOfContents('Mục lục', { hyperlink: true, headingStyleRange: '2-3' }),
      new Paragraph({ children: [new PageBreak()] }),
      ...body,
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log(`Đã tạo ${outPath} — ${(buf.length / 1024).toFixed(0)} KB, ${body.length} khối nội dung`);
});

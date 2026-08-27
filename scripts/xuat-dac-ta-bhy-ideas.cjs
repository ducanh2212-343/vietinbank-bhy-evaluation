// Xuất đặc tả toàn phần phân hệ Bắc Hưng Yên Ideas ra file Word (.docx).
//
// Chạy từ thư mục gốc dự án (cần node_modules để require được 'docx'):
//   node scripts/xuat-dac-ta-bhy-ideas.cjs duong-dan-file-ra.docx
//
// Nội dung lấy từ docs/tong-the-bhy-ideas-va-van-de-can-quyet-2026-08.md và từ
// chính mã nguồn phân hệ (ideaBenRe.ts, ideaCouncil.ts, ideaKpi.ts,
// ideaRewards.ts). Sửa số liệu hay câu chữ thì sửa ở đây rồi chạy lại — không
// sửa tay vào file .docx, vì lần xuất sau sẽ ghi đè.

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  TableOfContents, PageBreak, LevelFormat, Footer, PageNumber, convertInchesToTwip,
} = require('docx');

const NAVY = '00365f';
const BLUE = '005a9c';
const GREY = '5b6b7b';

// ---- helpers -------------------------------------------------------------
const P = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 276 },
  alignment: o.align,
  indent: o.indent,
  children: [new TextRun({ text, bold: o.bold, italics: o.italics, color: o.color, size: o.size ?? 21 })],
});

// Đoạn nhiều đoạn chữ, dùng cho câu có phần in đậm giữa dòng
const PR = (runs, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 120, line: 276 },
  indent: o.indent,
  children: runs.map(r => typeof r === 'string'
    ? new TextRun({ text: r, size: 21 })
    : new TextRun({ text: r.t, bold: r.b, italics: r.i, color: r.c, size: 21 })),
});

const H = (text, level) => new Paragraph({
  heading: level,
  spacing: { before: level === HeadingLevel.HEADING_1 ? 320 : 240, after: 140 },
  children: [new TextRun({ text, bold: true, color: level === HeadingLevel.HEADING_1 ? NAVY : BLUE,
    size: level === HeadingLevel.HEADING_1 ? 30 : level === HeadingLevel.HEADING_2 ? 25 : 22 })],
});
const H1 = t => H(t, HeadingLevel.HEADING_1);
const H2 = t => H(t, HeadingLevel.HEADING_2);
const H3 = t => H(t, HeadingLevel.HEADING_3);

const BUL = (text, o = {}) => new Paragraph({
  numbering: { reference: 'cham', level: 0 },
  spacing: { after: 60, line: 276 },
  children: [new TextRun({ text, size: 21, bold: o.bold })],
});
const NUM = text => new Paragraph({
  numbering: { reference: 'so', level: 0 },
  spacing: { after: 60, line: 276 },
  children: [new TextRun({ text, size: 21 })],
});

// Khối trích dẫn — viền trái, nền nhạt
const QUOTE = lines => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  borders: {
    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE },
    insideVertical: { style: BorderStyle.NONE },
    left: { style: BorderStyle.SINGLE, size: 18, color: BLUE },
  },
  rows: [new TableRow({ children: [new TableCell({
    width: { size: 9360, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children: lines.map((l, i) => P(l, { after: i === lines.length - 1 ? 0 : 80 })),
  })] })],
});

// Bảng: hàng đầu là tiêu đề. widths tính theo DXA, tổng 9360.
function TBL(header, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (txt, w, o) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: o.head ? { type: ShadingType.CLEAR, fill: NAVY }
           : o.zebra ? { type: ShadingType.CLEAR, fill: 'F6F8FA' } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: String(txt).split('\n').map((line, i, arr) => new Paragraph({
      spacing: { after: i === arr.length - 1 ? 0 : 40, line: 264 },
      alignment: o.right ? AlignmentType.RIGHT : undefined,
      children: [new TextRun({
        text: line, bold: o.head || o.bold, size: 19,
        color: o.head ? 'FFFFFF' : undefined,
      })],
    })),
  });
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2DD' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2DD' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2DD' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2DD' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'DDE5EE' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'DDE5EE' },
    },
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], { head: true })) }),
      ...rows.map((r, ri) => new TableRow({
        children: r.map((c, i) => cell(c, widths[i], {
          zebra: ri % 2 === 1,
          right: (opts.right || []).includes(i),
          bold: (opts.boldCol || []).includes(i),
        })),
      })),
    ],
  });
}

const SPACE = (h = 120) => new Paragraph({ spacing: { after: h }, children: [] });
const BREAK = () => new Paragraph({ children: [new PageBreak()] });

// ---- nội dung ------------------------------------------------------------
const body = [];
const add = (...x) => body.push(...x);

// Trang bìa
add(
  new Paragraph({ spacing: { before: 1800, after: 160 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'NGÂN HÀNG TMCP CÔNG THƯƠNG VIỆT NAM', bold: true, size: 22, color: GREY })] }),
  new Paragraph({ spacing: { after: 700 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'CHI NHÁNH BẮC HƯNG YÊN', bold: true, size: 26, color: NAVY })] }),
  new Paragraph({ spacing: { after: 100 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'ĐẶC TẢ TOÀN PHẦN', bold: true, size: 34, color: NAVY })] }),
  new Paragraph({ spacing: { after: 500 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'PHÂN HỆ BẮC HƯNG YÊN IDEAS', bold: true, size: 48, color: BLUE })] }),
  new Paragraph({ spacing: { after: 1200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Chương trình ý tưởng, sáng kiến — cơ chế, quy trình,\nphân quyền, dữ liệu và các vấn đề còn phải quyết'.replace('\n', ' '), italics: true, size: 22, color: GREY })] }),
);
add(TBL(
  ['Hạng mục', 'Nội dung'],
  [
    ['Phạm vi tài liệu', 'Toàn bộ phân hệ Bắc Hưng Yên Ideas trong hệ thống Bắc Hưng Yên One'],
    ['Chu kỳ chương trình', '01/06/2026 – 31/12/2026'],
    ['Số liệu chốt tới', '14/08/2026'],
    ['Trạng thái KPI', 'Đang TẠM DỪNG ÁP theo chỉ đạo — cấu trúc giữ nguyên, bật lại bằng một dòng cấu hình'],
    ['Căn cứ', 'Quy chế Bắc Hưng Yên Ideas · Thẻ điểm KPI 25/06/2026 (Phụ lục 1B) · Phụ lục 05, 06 · Chỉ đạo vận hành 08/2026 và 10/2026'],
  ],
  [2200, 7160],
  { boldCol: [0] },
));

add(BREAK(), H1('Mục lục'),
  new TableOfContents('Mục lục', { hyperlink: true, headingStyleRange: '1-3' }),
  BREAK());

// ===== 1 =====
add(H1('1. Chương trình là gì'));
add(P('Bắc Hưng Yên Ideas là chương trình ý tưởng, sáng kiến của Chi nhánh: cán bộ gửi ý tưởng cải tiến công việc, Chi nhánh sàng lọc qua bốn cấp độ, ý tưởng đi tới đâu thì được ghi nhận và thưởng tới đó. Phân hệ phần mềm mô tả trong tài liệu này là nơi toàn bộ vòng đời đó diễn ra — từ lúc cán bộ bấm Gửi tới lúc Hội đồng công bố kết quả và kế toán có căn cứ chi tiền.'));
add(H2('1.1. Ba việc phân hệ phải làm'));
add(BUL('Thu ý tưởng và giữ dấu vết — ai gửi, gửi lúc nào, phòng nào, thuộc nhóm lĩnh vực gì.'));
add(BUL('Đưa ý tưởng qua đúng cấp có thẩm quyền — Trưởng phòng, Phòng TCTH, Giám đốc, Hội đồng, Trụ sở chính — và ghi lại ai quyết cái gì.'));
add(BUL('Sinh ra hai con số không được lẫn nhau: số liệu ghi nhận KPI và số tiền thưởng.'));
add(H2('1.2. Nguyên tắc gốc, chi phối toàn bộ thiết kế'));
add(QUOTE([
  '«Mọi tác động đến KPI cần phải tuân thủ rất đúng, không sai; tiền thưởng thì có thể khuyến khích nhưng KPI thì không.»',
  '— Chỉ đạo vận hành 08/2026',
]));
add(SPACE(160));
add(P('Câu này quyết định kiến trúc dữ liệu: mỗi lần công nhận sinh ra hai thuộc tính tách rời, không suy ra nhau. Xem mục 3.'));

add(H2('1.3. Hiện trạng số liệu'));
add(P('Ý tưởng đầu tiên vào hệ thống 01/07/2026, mới nhất 14/08/2026 — chương trình mới thực chạy khoảng sáu tuần rưỡi dù chu kỳ tính từ 01/06.'));
add(TBL(['Chỉ số', 'Giá trị'], [
  ['Ý tưởng đã gửi', '134'],
  ['Phòng, tổ có ý tưởng', '11'],
  ['Đang được tính KPI', '20 — toàn bộ là Bén rễ do TSC đồng ý triển khai'],
  ['Tiền thưởng đã cam kết', '19.400.000đ / 100.000.000đ'],
  ['Vươn cành · Lan tỏa', '0 · 0'],
  ['Đợt chấm Hội đồng', '0 (21 ý tưởng đang chờ)'],
  ['Ghi trạng thái SMP', '20/134'],
  ['Đánh dấu khoán gọn', '0 người'],
], [4200, 5160], { boldCol: [0] }));
add(SPACE(200));
add(H3('Theo phòng, tổ'));
add(TBL(
  ['Phòng, tổ', 'Ý tưởng', 'Ươm mầm', 'Bén rễ', 'CB tính KPI', 'Chỉ tiêu Ươm mầm\ntheo đầu người'],
  [
    ['Phòng HTTD', '25', '23', '2', '6', '72'],
    ['Phòng KHDN', '24', '19', '5', '15', '180'],
    ['PGD Văn Lâm', '24', '21', '3', '10', '120'],
    ['Phòng DVKH', '15', '15', '0', '13', '156'],
    ['Phòng TCTH', '15', '12', '3', '8', '96'],
    ['PGD Văn Giang', '8', '4', '4', '10', '120'],
    ['Phòng KHBL', '8', '6', '2', '8', '96'],
    ['PGD Khoái Châu', '7', '7', '0', '9', '108'],
    ['PGD Ân Thi', '4', '3', '1', '8', '96'],
    ['PGD Yên Mỹ', '2', '2', '0', '9', '108'],
    ['Ban Giám đốc', '2', '2', '0', '4', '48'],
  ],
  [2160, 1200, 1400, 1200, 1600, 1800],
  { right: [1, 2, 3, 4, 5], boldCol: [0] },
));
add(SPACE(120));
add(P('Chỉ tiêu theo Thẻ điểm KPI 25/06/2026 (12 Ươm mầm mỗi cán bộ), chưa trừ khoán gọn vì hồ sơ chưa ai được đánh dấu.', { italics: true, color: GREY, size: 19 }));

// ===== 2 =====
add(BREAK(), H1('2. Bốn cấp độ phát triển'));
add(P('Trục xương sống của chương trình. Một ý tưởng đi lên từng cấp; mỗi cấp có người quyết riêng, nhịp riêng và mức thưởng riêng.'));
add(TBL(
  ['Cấp độ', 'Ai quyết', 'Nhịp', 'Thưởng', 'Ràng buộc'],
  [
    ['Ươm mầm', 'TCTH chốt với Trưởng phòng', 'Theo tuần', '100.000đ', 'Tối đa 02/tuần/phòng'],
    ['Bén rễ', 'TCTH trình → Giám đốc duyệt,\nhoặc TSC đồng ý trên SMP', 'Liên tục', '300.000đ', 'Không hạn mức'],
    ['Vươn cành', 'Hội đồng BHY Ideas', 'Theo quý', '1.000.000đ', 'Điểm TB ≥ 3,5'],
    ['Lan tỏa', 'Hội đồng BHY Ideas', 'Kỳ riêng quý IV', '2.000.000 – 3.000.000đ', 'Điểm TB ≥ 4,0'],
  ],
  [1500, 2560, 1500, 1900, 1900],
  { boldCol: [0] },
));
add(SPACE(200));
add(H2('2.1. Thời gian tối thiểu trước khi xét cấp cao'));
add(P('Ươm mầm và Bén rễ không đặt mốc thời gian: hai bước này sàng lọc trên giấy, chưa đòi bằng chứng vận hành. Hai cấp trên đòi ý tưởng đã chạy thật nên có mốc tối thiểu, suy từ Phụ lục 05.'));
add(TBL(['Cấp độ', 'Số ngày tối thiểu kể từ mốc gần nhất'], [
  ['Ươm mầm', '0'], ['Bén rễ', '0'], ['Vươn cành', '30 ngày'], ['Lan tỏa', '60 ngày'],
], [3000, 6360], { boldCol: [0] }));
add(SPACE(120));
add(P('Hệ thống cảnh báo chứ không chặn — mốc này suy từ phụ lục, chưa được văn bản khẳng định (vấn đề B4).', { italics: true, color: GREY, size: 19 }));

// ===== 3 =====
add(BREAK(), H1('3. Hai trục không suy ra nhau: KPI và tiền'));
add(P('Đây là quyết định thiết kế quan trọng nhất của phân hệ. Mỗi lần công nhận ghi vào sổ hai thuộc tính độc lập:'));
add(TBL(
  ['Thuộc tính', 'Cột trong sổ', 'Tính chất'],
  [
    ['Ghi nhận KPI', 'ghi_nhan_kpi', 'CHẶT. Chịu hạn mức 02/tuần/phòng, chặn ở tầng CSDL bằng trigger — tài khoản admin cũng không nới được. Đang tạm dừng theo chỉ đạo 10/2026.'],
    ['Tiền thưởng', 'muc_thuong', 'LINH HOẠT. Có thể hồi tố, khuyến khích ngoài hạn mức, hoặc chuyển kỳ xét sau.'],
  ],
  [1900, 1900, 5560],
  { boldCol: [0] },
));
add(SPACE(200));
add(P('Không bao giờ suy một trục từ trục kia. Ý tưởng vượt hạn mức tuần vẫn có thể được thưởng khuyến khích mà không được tính KPI; ngược lại một ý tưởng được ghi nhận KPI mà kỳ đó hết ngân sách thì chuyển kỳ sau, KPI vẫn giữ.'));

add(H2('3.1. Thưởng lũy kế khi vượt cấp'));
add(P('Công nhận cấp nào thì trả bù các cấp dưới mà ý tưởng chưa từng được thưởng. Ví dụ ý tưởng lên thẳng Vươn cành mà chưa từng nhận tiền: trả 100.000 + 300.000 + 1.000.000 = 1.400.000đ. Trần một ý tưởng theo cách tính này là 4.400.000đ (Lan tỏa mức cao nhất).'));
add(P('Khóa UNIQUE(idea_id, cap_do) ở tầng dữ liệu chống trả trùng: cùng một ý tưởng, cùng một cấp thì không thể tồn tại hai dòng thưởng.'));

add(H2('3.2. Ngân sách'));
add(TBL(['Tham số', 'Giá trị'], [
  ['Ngân sách chu kỳ', '100.000.000đ'],
  ['Ngưỡng cảnh báo', '80% đã cam kết'],
  ['Đã cam kết hiện tại', '19.400.000đ'],
  ['Mốc hồi tố thưởng', '16/08/2026 — ý tưởng gửi trước mốc được trả khuyến khích'],
], [3000, 6360], { boldCol: [0] }));
add(SPACE(120));
add(P('Thanh ngân sách cảnh báo từ 80% nhưng không chặn duyệt: quyết định chi vượt hay chuyển kỳ sau thuộc về Ban Giám đốc và Hội đồng TĐKT, không thuộc phần mềm.'));

// ===== 4 =====
add(BREAK(), H1('4. Quy trình từng cấp'));

add(H2('4.1. Ươm mầm — TCTH chốt theo tuần'));
add(NUM('Cán bộ gửi ý tưởng ở màn Gửi & tra cứu.'));
add(NUM('Phòng TCTH mở màn Vận hành, xem danh sách ý tưởng trong tuần theo từng phòng.'));
add(NUM('TCTH chốt với Trưởng phòng và chọn tối đa 02 ý tưởng mỗi phòng mỗi tuần.'));
add(NUM('Hệ thống lập dòng ghi nhận: ghi_nhan_kpi = true, muc_thuong = 100.000đ.'));
add(SPACE(80));
add(PR([
  { t: 'Thẩm quyền hiện đặt ở TCTH', b: true },
  ' theo chỉ đạo, không đặt ở Trưởng phòng. Đây là một công tắc cấu hình (bhy_ideas_cau_hinh.ai_chon_uom_mam) chứ không phải mã cứng, nên trả quyền về Trưởng phòng chỉ là đổi một dòng. Mọi lần chốt đều lưu dấu vết đã trao đổi với Trưởng phòng nào.',
]));
add(P('Hệ thống KHÔNG tự áp cấp Ươm mầm cho các ý tưởng gửi sớm nhất. Việc chọn là của người, phần mềm chỉ bày danh sách và đếm suất còn lại.', { bold: true }));

add(H2('4.2. Bén rễ — hai đường lên, chạy liên tục'));
add(P('Quy chế mục 4 mở hai đường. Đây là luồng liên tục, không theo tháng: TCTH đánh giá xong ý tưởng nào thì trình ngay ý tưởng đó.'));
add(TBL(
  ['', 'Đường 1 — Chi nhánh thử nghiệm', 'Đường 2 — Trụ sở chính đồng ý'],
  [
    ['Căn cứ', 'Ý tưởng có khả năng thử nghiệm tại Chi nhánh', 'TSC duyệt «Đồng ý» hoặc «Đồng ý một phần» trên SMP'],
    ['Ai quyết', 'TCTH đánh giá bằng phiếu 5 câu → Giám đốc duyệt', 'TCTH khớp số liệu SMP, hệ thống tự ghi nhận — không cần qua Giám đốc'],
    ['Cờ trong sổ', 'duyet_cn', 'duyet_tsc'],
    ['Hạn mức', 'Không chiếm hạn mức tuần', 'Không chiếm hạn mức tuần'],
    ['Thực tế', 'Chưa có hồ sơ nào', '20/20 ý tưởng Bén rễ hiện có'],
  ],
  [1500, 3930, 3930],
  { boldCol: [0] },
));
add(SPACE(160));
add(PR([
  'Hai cờ ',
  { t: 'độc lập và có thể cùng bật', b: true },
  ' — một ý tưởng vừa được TSC duyệt vừa được Chi nhánh duyệt thì bật cả hai, nhưng ghi nhận KPI và tiền thưởng vẫn chỉ một lần.',
]));

add(H2('4.3. Vươn cành và Lan tỏa — Hội đồng chấm theo đợt'));
add(NUM('Phòng TCTH đưa ý tưởng vào đợt chấm. Chỉ TCTH có quyền đề xuất hai cấp này.'));
add(NUM('Chủ tịch mở đợt, đặt hạn nộp phiếu. Hệ thống nhắc tự động bằng lịch chạy nền.'));
add(NUM('14 thành viên chấm 5 tiêu chí, thang 1–5. Phiếu ẩn danh.'));
add(NUM('Đạt quorum thì Chủ tịch chốt và công bố; hệ thống lập dòng ghi nhận và tính tiền lũy kế.'));

// ===== 5 =====
add(BREAK(), H1('5. Hai bộ câu hỏi đánh giá'));
add(P('Phân hệ có hai bộ câu hỏi, cố ý đặt ở hai mức khác nhau vì hỏi hai câu hỏi khác nhau.'));
add(TBL(
  ['', 'Phiếu Bén rễ (TCTH & Giám đốc)', 'Phiếu Hội đồng (Vươn cành · Lan tỏa)'],
  [
    ['Thang', '5 câu × 0–2, tối đa 10 điểm', '5 tiêu chí × 1–5'],
    ['Ngưỡng gợi ý', 'Tổng ≥ 6/10 (60%)', 'TB ≥ 3,5 (Vươn cành) · ≥ 4,0 (Lan tỏa)'],
    ['Điều kiện chặn', 'Câu Đ4 «Không tạo rủi ro mới» ≥ 1', 'An toàn/rủi ro ≥ 3/5; Lan tỏa thêm Nhân rộng ≥ 4/5'],
    ['Hỏi điều gì', 'CÓ THỂ làm thử không', 'ĐÃ làm rồi, kết quả ra sao'],
    ['Tính chất', 'Tham khảo — chỉ gợi ý, không chặn', 'Ràng buộc — không đạt ngưỡng thì không lên cấp'],
    ['Ẩn danh', 'Không', 'Có, kể cả với TCTH và Ban Giám đốc'],
  ],
  [1700, 3830, 3830],
  { boldCol: [0] },
));
add(SPACE(200));
add(P('Thang Bén rễ đặt thấp hơn có chủ ý: quy chế định nghĩa Bén rễ là «có khả năng thử nghiệm tại Chi nhánh», chưa đòi bằng chứng kết quả. Lấy thang Hội đồng áp cho Bén rễ thì gần như không ý tưởng nào qua được cửa đầu tiên của cả hành trình.'));

add(H2('5.1. Phiếu tham khảo cấp Bén rễ'));
add(P('Phiếu này chính là báo cáo TCTH trình Giám đốc. Giám đốc đọc phiếu của TCTH, có thể chấm phiếu của mình theo cùng bộ câu hỏi để hai bên đối chiếu, rồi quyết.'));
add(TBL(
  ['Mã', 'Tiêu đề', 'Nội dung đánh giá'],
  [
    ['Đ1', 'Vấn đề có thật', 'Thực trạng nêu trong phiếu là bất cập đang thực sự xảy ra tại Chi nhánh, không phải giả định.'],
    ['Đ2', 'Giải pháp đủ rõ để làm thử', 'Mô tả cụ thể tới mức giao được cho người thực hiện, không dừng ở mong muốn chung chung.'],
    ['Đ3', 'Làm được bằng nguồn lực sẵn có', 'Thử nghiệm được ngay tại Chi nhánh, không phải chờ đầu tư lớn hay xin cơ chế mới từ Trụ sở chính.'],
    ['Đ4', 'Không tạo rủi ro mới\n(điều kiện chặn)', 'Không trái quy định hiện hành, không phát sinh rủi ro tác nghiệp hay tuân thủ đáng kể.'],
    ['Đ5', 'Có ích cho ít nhất một bộ phận', 'Nếu chạy được thì giảm thời gian, chi phí, sai sót, hoặc tăng trải nghiệm khách hàng.'],
  ],
  [700, 2660, 6000],
  { boldCol: [0, 1] },
));
add(SPACE(160));
add(H3('Thang điểm và kết luận'));
add(TBL(['Điểm', 'Nhãn', 'Ý nghĩa'], [
  ['0', 'Không', 'Chưa đáp ứng'],
  ['1', 'Một phần', 'Đáp ứng được phần nào'],
  ['2', 'Có', 'Đáp ứng rõ ràng'],
], [1200, 2200, 5960], { boldCol: [0] }));
add(SPACE(160));
add(TBL(['Kết luận hệ thống gợi ý', 'Điều kiện'], [
  ['Chưa nên trình', 'Đ4 = 0 (vướng điều kiện chặn), hoặc tổng < 4/10'],
  ['Cân nhắc', 'Tổng từ 4 đến dưới 6/10'],
  ['Nên trình', 'Tổng ≥ 6/10 và Đ4 ≥ 1'],
], [3400, 5960], { boldCol: [0] }));
add(SPACE(160));
add(P('Đây là phiếu tham khảo, không phải bộ gác. TCTH vẫn trình được ý tưởng điểm thấp nếu có lý do (hệ thống nhắc ghi rõ lý do vào ô ý kiến), Giám đốc vẫn duyệt hoặc từ chối theo thẩm quyền bất kể điểm bao nhiêu. Quyền quyết định thuộc về người; phần mềm chỉ dọn sẵn thông tin để hai bên nói cùng một ngôn ngữ.', { bold: true }));

add(H2('5.2. Phiếu Hội đồng — năm tiêu chí'));
add(TBL(
  ['Mã', 'Tiêu chí', 'Câu hỏi đánh giá'],
  [
    ['C1', 'Đúng vấn đề', 'Ý tưởng có giải quyết một vấn đề thực tế, rõ ràng, đáng xử lý trong hoạt động của phòng/Chi nhánh không?'],
    ['C2', 'Hiệu quả/kết quả', 'Ý tưởng có bằng chứng tạo hiệu quả hoặc có khả năng tạo hiệu quả rõ ràng không?'],
    ['C3', 'Khả thi', 'Ý tưởng có thể triển khai, duy trì hoặc tiếp tục thử nghiệm trong điều kiện thực tế của Chi nhánh không?'],
    ['C4', 'An toàn/rủi ro', 'Ý tưởng có bảo đảm tuân thủ quy định, bảo mật thông tin, an toàn vận hành và kiểm soát rủi ro không?'],
    ['C5', 'Nhân rộng/chuẩn hóa', 'Ý tưởng có thể chuẩn hóa thành checklist, mẫu biểu, hướng dẫn, quy trình, công cụ hoặc nhân rộng cho phòng/PGD khác không?'],
  ],
  [700, 2160, 6500],
  { boldCol: [0, 1] },
));
add(SPACE(160));
add(TBL(['Điểm', 'Ý nghĩa'], [
  ['1', 'Không đạt'], ['2', 'Còn yếu, cần làm rõ nhiều'], ['3', 'Đạt mức tối thiểu'],
  ['4', 'Tốt'], ['5', 'Rất tốt, nên ưu tiên'],
], [1200, 8160], { boldCol: [0] }));
add(SPACE(160));
add(H3('Ngưỡng công nhận'));
add(TBL(['Cấp độ', 'Điều kiện đồng thời'], [
  ['Vươn cành', 'Điểm TB chung ≥ 3,5  ·  Điểm An toàn/rủi ro (C4) ≥ 3'],
  ['Lan tỏa', 'Điểm TB chung ≥ 4,0  ·  Điểm Nhân rộng (C5) ≥ 4  ·  Điểm An toàn/rủi ro (C4) ≥ 3'],
], [1900, 7460], { boldCol: [0] }));

add(H2('5.3. Cơ chế Hội đồng'));
add(TBL(['Nội dung', 'Quy định trong phân hệ'], [
  ['Thành phần', '14 thành viên, 1 Chủ tịch'],
  ['Ẩn danh', 'Phiếu định danh theo tài khoản nhưng ẩn danh với cả TCTH và Ban Giám đốc. Chỉ System Admin truy cập phiếu định danh. Hội đồng nhận bản tổng hợp sau khi Chủ tịch công bố.'],
  ['Quorum', 'Hiện đặt 100% số thành viên hợp lệ, theo chỉ đạo — hợp kịch bản họp tại chỗ. Có thể hạ về 2/3 nếu văn bản quy định khác (vấn đề B5).'],
  ['Chống tự chấm', 'Chặn hai lớp: theo tài khoản người gửi và theo họ tên trong nhóm đề xuất. Người bị chặn được trừ khỏi mẫu số quorum.'],
  ['Hai pha bỏ phiếu', 'Chấm điểm từng tiêu chí, sau đó biểu quyết công nhận cấp. Tỷ lệ 2/3 áp cho pha biểu quyết.'],
  ['Nhắc hạn', 'Lịch chạy nền tự nhắc thành viên chưa nộp phiếu trước hạn.'],
], [1900, 7460], { boldCol: [0] }));

// ===== 6 =====
add(BREAK(), H1('6. KPI và hệ số quy đổi'));
add(QUOTE([
  'TRẠNG THÁI HIỆN TẠI: đang TẠM DỪNG ÁP KPI theo chỉ đạo 10/2026, để tập trung khuyến khích sáng tạo và phân nhóm lĩnh vực.',
  'Cụ thể: trần 02 ý tưởng/tuần/phòng không còn chặn, màn hình bỏ ngôn ngữ KPI, nhưng sổ vẫn ghi đủ. Bật lại chỉ là đổi cờ bhy_ideas_cau_hinh.dang_ap_kpi.',
  'Mục này mô tả cơ chế khi áp KPI trở lại.',
]));
add(SPACE(200));
add(H2('6.1. Hệ số quy đổi (Phụ lục 1B)'));
add(TBL(['Cấp độ', 'Quy đổi ra điểm Bén rễ'], [
  ['Ươm mầm', '0 — không quy đổi'],
  ['Bén rễ', '1'],
  ['Vươn cành', '2'],
  ['Lan tỏa', '3'],
], [3000, 6360], { boldCol: [0] }));
add(SPACE(160));
add(P('Hệ số này là của riêng KPI, khác hẳn phép cộng dồn tiền thưởng lũy kế: quy đổi NHÂN SỐ ĐẾM cho chỉ tiêu, lũy kế CỘNG ĐƠN GIÁ các cấp chưa từng nhận. Hai phép tính không được lẫn vào nhau.', { bold: true }));
add(P('Chốt vận hành 16/08/2026: hệ số áp cho toàn bộ chỉ tiêu, bao gồm cả chỉ tiêu Bén rễ của lãnh đạo. Bản trước đếm mỗi ý tưởng cấp cao chỉ bằng 1 «đã qua Bén rễ» — đếm thiếu, thiệt cho lãnh đạo có ý tưởng được nhân rộng. Ví dụ một Phó phòng quản 5 cán bộ, có 3 ý tưởng Vươn cành: cách cũ tính 3/5 = 60% (dưới ngưỡng, thành 0 điểm); cách đúng tính 6/5 = 120% (đạt). Module ideaKpi.ts đã sửa và khóa bằng test tự động.'));

add(H2('6.2. Chỉ tiêu và ngưỡng'));
add(TBL(['Tham số', 'Giá trị'], [
  ['Chỉ tiêu Ươm mầm mỗi cán bộ', '12 ý tưởng'],
  ['Chỉ tiêu Bén rễ quy đổi mỗi cán bộ', '6 điểm'],
  ['Ngưỡng đạt của chỉ tiêu Bén rễ', '90% — dưới ngưỡng tính 0 điểm, không chia theo tỷ lệ'],
  ['Trần phần trăm hoàn thành', '130%'],
], [4600, 4760], { boldCol: [0] }));
add(SPACE(160));
add(H3('Trọng số ĐMST trong Thẻ điểm'));
add(TBL(['Nhóm chức danh', 'Trọng số'], [
  ['Trưởng phòng đầu mối', '20'],
  ['Trưởng phòng giao dịch', '30'],
  ['Phó phòng', '30'],
  ['Cán bộ', '20'],
  ['Ban Giám đốc', 'Không đặt trọng số'],
  ['Khối back — Phòng TCTH', '5'],
  ['Khối back — Phòng HTTD', '10'],
], [4600, 4760], { boldCol: [0], right: [1] }));
add(SPACE(160));
add(P('Nhân viên khoán gọn được trừ khỏi mẫu số chỉ tiêu lãnh đạo. Cột profiles.khoan_gon và hàm bhy_ideas_so_cb_tinh_kpi đã sẵn sàng; hiện chưa ai được đánh dấu nên mọi mẫu số đang tính thừa (vấn đề A2).'));

// ===== 7 =====
add(BREAK(), H1('7. Nhóm lĩnh vực — trục phân loại thứ tư'));
add(P('Ba trục cũ không trả lời được câu «Chi nhánh đang sáng tạo về chuyện gì»: cấp đề xuất nói nơi duyệt, phạm vi áp dụng nói ảnh hưởng tới đâu, cấp độ phát triển nói đi được bao xa. Trục thứ tư trả lời câu đó.'));
add(TBL(['Nhóm lĩnh vực', 'Bao gồm'], [
  ['Quy trình nghiệp vụ', 'Rút gọn bước, gộp biểu mẫu, sắp lại luồng xử lý hồ sơ'],
  ['Công nghệ số & AI', 'Công cụ, tự động hóa, khai thác dữ liệu, ứng dụng AI'],
  ['Trải nghiệm khách hàng', 'Giảm thời gian chờ, cải thiện tiếp xúc, chăm sóc sau bán'],
  ['Tiết giảm chi phí', 'Giảm chi phí vận hành, văn phòng phẩm, thời gian công'],
  ['An toàn & tuân thủ', 'Kiểm soát rủi ro tác nghiệp, bảo mật, tuân thủ quy định'],
  ['Quản trị nội bộ', 'Phối hợp giữa phòng, đào tạo, môi trường làm việc'],
  ['Khác', 'Nhóm hứng phần còn lại — đứng cuối danh sách, không phải lựa chọn đầu tiên'],
], [3000, 6360], { boldCol: [0] }));
add(SPACE(160));
add(P('Cán bộ chọn nhóm khi gửi. TCTH phân nhóm hàng loạt cho 134 phiếu cũ ở màn Vận hành. Dải «Chi nhánh đang sáng tạo về chuyện gì» ở trang giới thiệu hiện đủ cả 7 nhóm kể cả nhóm trống — mảng trắng chính là chỗ đợt phát động tới có dư địa nhất.'));
add(P('Danh sách nhóm nằm ở hai nơi (hằng số TypeScript và ràng buộc CHECK của cột portal_ideas.linh_vuc). Có test tự động quét thẳng file migration để hai bên không trôi khỏi nhau — lệch một chữ là cán bộ chọn được trên màn hình nhưng CSDL từ chối ghi.', { italics: true, color: GREY, size: 19 }));

// ===== 8 =====
add(BREAK(), H1('8. Màn hình và phân quyền'));
add(TBL(
  ['Đường dẫn', 'Dành cho', 'Việc chính'],
  [
    ['/one/y-tuong', 'Mọi người đã đăng nhập', 'Giới thiệu chương trình, bốn cấp độ, tổng quan các mục, bức tranh lĩnh vực, cách Hội đồng chấm. Giám đốc thấy thêm dải việc đang chờ mình duyệt.'],
    ['/one/y-tuong/gui', 'Mọi cán bộ', 'Gửi ý tưởng (kèm chọn nhóm lĩnh vực), tra bảng theo dõi toàn Chi nhánh'],
    ['/one/y-tuong/hoi-dong', 'Thành viên Hội đồng', 'Chấm 5 tiêu chí, xem tổng hợp, quản trị đợt (Chủ tịch)'],
    ['/one/y-tuong/van-hanh', 'Ban Giám đốc, Phòng TCTH', 'Giám đốc duyệt Bén rễ · TCTH đánh giá & trình · chốt Ươm mầm · phân nhóm lĩnh vực · đối chiếu SMP · xuất dự toán ngân sách'],
  ],
  [2200, 2000, 5160],
  { boldCol: [0] },
));
add(SPACE(200));
add(H2('8.1. Vị trí trong menu'));
add(P('Bắc Hưng Yên Ideas nằm trong cụm BHY Ways, dưới dạng một thư mục có bốn mục con. Cùng cụm còn Sharing, Connect, Sao Xứng Đáng, Credit 360 và thư mục Quizzi. Cấu trúc menu do một nguồn duy nhất sinh ra (src/lib/navigation.ts), dùng chung cho thanh trên, thanh bên, tab điện thoại và bảng lệnh ⌘K — nên thêm hay đổi một mục là sửa đúng một chỗ.'));
add(H2('8.2. Nguyên tắc phân quyền'));
add(BUL('Trang giới thiệu và trang gửi: mọi tài khoản đã đăng nhập. Không mở cho khách chưa đăng nhập.'));
add(BUL('Màn Hội đồng: chỉ thành viên Hội đồng; chức năng quản trị đợt chỉ Chủ tịch.'));
add(BUL('Màn Vận hành: vai trò quản trị (TCTH) và Ban Giám đốc. Các khối con còn phân biệt tiếp — khối duyệt Bén rễ chỉ Giám đốc thao tác, khối trình và chốt hạn mức chỉ TCTH.'));
add(BUL('Phiếu chấm định danh của Hội đồng: chỉ System Admin, kể cả Ban Giám đốc cũng không xem được.'));

// ===== 9 =====
add(BREAK(), H1('9. Đặc tả kỹ thuật'));
add(H2('9.1. Nền tảng'));
add(TBL(['Lớp', 'Công nghệ'], [
  ['Giao diện', 'Vite · React 18 · TypeScript · Tailwind CSS · shadcn/ui'],
  ['Trạng thái, dữ liệu', 'TanStack Query'],
  ['Máy chủ, cơ sở dữ liệu', 'Supabase — PostgreSQL, RLS, Edge Functions, pg_cron, Vault'],
  ['Kiểm thử', 'Vitest — 783 test, 47 file, toàn bộ đang xanh'],
  ['Xuất báo cáo', 'ExcelJS (dự toán ngân sách)'],
], [2600, 6760], { boldCol: [0] }));
add(SPACE(200));

add(H2('9.2. Quy mô mã nguồn'));
add(TBL(['Thành phần', 'Số lượng'], [
  ['Migration cơ sở dữ liệu của phân hệ', '11 file'],
  ['Module nghiệp vụ thuần (ideaBenRe, ideaCouncil, ideaKpi, ideaRewards)', '4 file · 2.135 dòng kể cả test'],
  ['Thành phần giao diện', '24 file · 5.466 dòng'],
  ['Trang', '4 file · 677 dòng'],
  ['Bảng dữ liệu', '10'],
  ['Hàm RPC bhy_ideas_*', '22'],
], [6200, 3160], { boldCol: [0] }));
add(SPACE(200));

add(H2('9.3. Các bảng chính'));
add(TBL(['Bảng', 'Vai trò'], [
  ['portal_ideas', 'Phiếu ý tưởng gốc — nội dung, người gửi, phòng, nhóm lĩnh vực, cấp độ phát triển, trạng thái SMP'],
  ['portal_idea_awards', 'Sổ ghi nhận và thưởng — cấp độ, ghi_nhan_kpi, muc_thuong, duyet_cn, duyet_tsc, người duyệt, ghi chú. 26 cột, 4 chính sách RLS, 2 trigger, 8 ràng buộc CHECK'],
  ['portal_idea_council_rounds', 'Đợt chấm của Hội đồng — hạn nộp, trạng thái, người mở'],
  ['portal_idea_council_votes', 'Phiếu chấm định danh, ẩn danh với mọi vai trò trừ System Admin. 15 cột, 5 chính sách RLS, 3 trigger, 9 ràng buộc CHECK'],
  ['portal_idea_comments', 'Trao đổi trên từng ý tưởng'],
  ['bhy_ideas_cau_hinh', 'Bảng cấu hình một dòng — ai_chon_uom_mam, tran_uom_mam_moi_tuan, dang_ap_kpi'],
  ['profiles.khoan_gon', 'Cột đánh dấu nhân viên khoán gọn, trừ khỏi mẫu số chỉ tiêu'],
], [2600, 6760], { boldCol: [0] }));
add(SPACE(200));

add(H2('9.4. Các ràng buộc đặt ở tầng dữ liệu'));
add(P('Đặt ở tầng cơ sở dữ liệu chứ không ở giao diện, để không thể lách bằng gọi thẳng API:'));
add(BUL('Trigger hạn mức: chặn ghi nhận KPI quá 02 ý tưởng/tuần/phòng. Trigger đọc cờ dang_ap_kpi — tạm dừng thì không chặn nữa nhưng vẫn ghi sổ đủ.'));
add(BUL('UNIQUE(idea_id, cap_do) trên sổ thưởng: một ý tưởng, một cấp, không thể trả tiền hai lần.'));
add(BUL('CHECK trên portal_ideas.linh_vuc: chỉ nhận đúng 7 nhóm lĩnh vực.'));
add(BUL('Chính sách RLS trên phiếu chấm: kể cả tài khoản Ban Giám đốc cũng không đọc được phiếu định danh.'));
add(BUL('Chặn tự chấm hai lớp trên phiếu Hội đồng, theo tài khoản gửi và theo họ tên trong nhóm đề xuất.'));
add(SPACE(120));
add(P('Riêng cấp độ phát triển của ý tưởng do một trigger bảo vệ (cột chỉ admin sửa được). Luồng Giám đốc duyệt Bén rễ đi qua một cửa thoát có kiểm soát ở mức giao dịch, chỉ mở trong đúng giao dịch của hàm duyệt và không gọi được từ ngoài qua API.', { italics: true, color: GREY, size: 19 }));
add(SPACE(120));

add(H2('9.5. Tự động hóa nền'));
add(BUL('Lịch chạy nền nhắc thành viên Hội đồng chưa nộp phiếu trước hạn.'));
add(BUL('Edge Function gửi thông báo mở đợt chấm tới thành viên Hội đồng.'));
add(BUL('Xuất dự toán ngân sách ra Excel cho kế toán.'));

// ===== 10 =====
add(BREAK(), H1('10. Nút thắt lớn nhất: hạn mức và chỉ tiêu KPI mâu thuẫn'));
add(P('Hai văn bản của cùng Chi nhánh đo cùng một việc bằng hai đơn vị khác nhau:'));
add(BUL('Quy chế Ideas giới hạn theo phòng và tuần: 02 ý tưởng/tuần/phòng.'));
add(BUL('Thẻ điểm KPI giao chỉ tiêu theo đầu người: 12 Ươm mầm hoặc 6 Bén rễ mỗi cán bộ.'));
add(SPACE(120));
add(TBL(['Con số', 'Giá trị'], [
  ['Chỉ tiêu KPI cần (100 CB × 12)', '1.200'],
  ['Hạn mức quy chế cả chu kỳ (11 phòng × 2 × 31 tuần)', '682'],
  ['Thực tế đã gửi', '134'],
  ['Được ghi nhận nếu áp đúng hạn mức', '55'],
], [6200, 3160], { boldCol: [0], right: [1] }));
add(SPACE(160));
add(PR([
  { t: 'Hệ quả: ', b: true },
  'áp đúng hạn mức thì ',
  { t: '79/134 ý tưởng (59%) không bao giờ được tính KPI', b: true },
  ' — không phải vì kém mà vì phòng đó tuần ấy gửi nhiều hơn hai. Đã có 18/31 tuần-phòng vượt trần, 9/11 phòng từng vượt, tuần cao nhất một phòng gửi 15 ý tưởng.',
]));
add(P('Ngay cả khi mọi phòng dùng hết hạn mức suốt 31 tuần, cả Chi nhánh chỉ đạt 682 — bằng 57% chỉ tiêu.'));

add(H2('10.1. Hệ số quy đổi có cứu được không?'));
add(P('Chỉ tiêu cán bộ có hai đường độc lập, và trần tuần chỉ chặn một:'));
add(TBL(['Đường', 'Chỉ tiêu toàn CN', 'Trần tuần', 'Hiện trạng'], [
  ['Ươm mầm', '1.200 ý tưởng', 'Bị chặn — tối đa 682', '0 điểm KPI'],
  ['Bén rễ quy đổi', '600 điểm', 'Không chịu trần', '20/600 điểm (3,3%)'],
], [2100, 2400, 2400, 2460], { boldCol: [0] }));
add(SPACE(160));
add(P('Đường thứ hai nhờ hệ số quy đổi mà có đòn bẩy thật: 1 Lan tỏa = 3 điểm, nên về lý thuyết 200 ý tưởng Lan tỏa (hoặc 300 Vươn cành, hoặc hỗn hợp) là đủ 600 điểm toàn Chi nhánh mà không đụng trần nào. Nhưng hiện trạng: 20 điểm đều là Bén rễ nạp sẵn, chưa có Vươn cành hay Lan tỏa nào để nhân hệ số, và mỗi điểm đều phải qua phê duyệt.'));
add(P('Kết luận chính xác: mâu thuẫn trần–chỉ tiêu nằm ở đường Ươm mầm; đường quy đổi là lối thoát hợp lệ theo đúng văn bản, nhưng chỉ quay khi Hội đồng bắt đầu chấm — thêm một lý do để mở đợt chấm đầu tiên sớm.', { bold: true }));

// ===== 11 =====
add(BREAK(), H1('11. Các vấn đề còn phải quyết'));
add(P('17 vấn đề, chia bốn nhóm theo mức độ chặn. Cột «Đang tạm xử lý» mô tả cách phân hệ đang chạy trong khi chờ quyết định — không phải cách giải quyết vấn đề.'));

add(H2('11.1. Nhóm A — Vấn đề chặn, cần quyết trước khi chốt KPI'));
add(H3('A1. Hạn mức theo phòng và chỉ tiêu theo đầu người không quy đổi được'));
add(P('Phòng KHDN 15 người cần 180 ý tưởng, hạn mức cả chu kỳ cho 62.'));
add(PR([{ t: 'Cần quyết: ', b: true }, 'nâng hạn mức theo quy mô phòng; hạ chỉ tiêu KPI về mức hạn mức cho phép; hoặc đổi chỉ tiêu từ «số ý tưởng được ghi nhận» sang «số ý tưởng đã gửi».']));
add(PR([{ t: 'Đang tạm xử lý: ', b: true }, 'ghi nhận KPI bám đúng hạn mức, không nới; tiền tách riêng nên cán bộ vẫn được khuyến khích. Đây là cách giữ số liệu trung thực, không phải cách giải quyết mâu thuẫn.']));
add(H3('A2. Chưa có danh sách nhân viên khoán gọn'));
add(P('Hồ sơ nhân sự chưa đánh dấu một ai nên mọi mẫu số chỉ tiêu lãnh đạo đang tính thừa.'));
add(PR([{ t: 'Cần quyết: ', b: true }, 'ai lập, ai duyệt, cập nhật theo nhịp nào.']));
add(PR([{ t: 'Đang tạm xử lý: ', b: true }, 'cột profiles.khoan_gon đã có, hàm bhy_ideas_so_cb_tinh_kpi đã trừ sẵn. Chỉ còn khâu nhập.']));
add(H3('A3. Chưa có ý tưởng nào đạt Vươn cành hay Lan tỏa'));
add(P('Thẻ điểm đặt điều kiện cần cho KPI ĐMST của Trưởng phòng và Phó phòng. Hiện 0 Vươn cành, 0 Lan tỏa nên toàn bộ TP/PP ở mức 0 điểm — dưới ngưỡng thì tính 0 chứ không chia theo tỷ lệ.'));
add(PR([{ t: 'Cần quyết: ', b: true }, 'mở đợt chấm Hội đồng đầu tiên trước thời điểm nào.']));
add(PR([{ t: 'Đang tạm xử lý: ', b: true }, 'màn chấm điểm, hạn nộp, nhắc tự động, bản tổng hợp đã sẵn sàng; 21 ý tưởng đang chờ.']));

add(H2('11.2. Nhóm B — Đang chạy theo chỉ đạo, chưa có căn cứ văn bản'));
add(TBL(['Mã', 'Nội dung', 'Cần quyết', 'Đang tạm xử lý'], [
  ['B1', 'Thưởng lũy kế khi vượt cấp', 'Ban hành thành văn, kèm trần một ý tưởng (hiện tối đa 4,4 triệu)', 'Trả bù đúng cấp chưa có tiền, khóa chống trùng ở tầng dữ liệu'],
  ['B2', 'Mốc hồi tố 16/08/2026 (13,4 triệu cho 134 ý tưởng)', 'Ra thông báo để kế toán có căn cứ', 'Mốc đã vào hệ thống, biên ngày neo theo giờ Việt Nam cả hai phía'],
  ['B3', 'Kỳ xét Lan tỏa riêng', 'Chốt mốc cụ thể, mỗi năm mấy kỳ', 'Mở đợt bất kỳ lúc nào, có 3 tầng đề xuất gồm Lan tỏa trực tiếp'],
  ['B4', 'Thời gian tối thiểu xét cấp cao', 'Xác nhận hoặc sửa mốc 30 ngày (Vươn cành) và 60 ngày (Lan tỏa)', 'Suy từ Phụ lục 05; hệ thống cảnh báo chứ không chặn'],
  ['B5', 'Quorum Hội đồng', 'Xác nhận 100% hay hạ về 2/3', 'Đặt 100% theo chỉ đạo, hợp kịch bản họp tại chỗ'],
  ['B6', 'Ai được đề xuất Vươn cành và Lan tỏa', 'Ghi vào quy chế, kèm kênh để cán bộ đề nghị TCTH', 'Chỉ TCTH đưa vào đợt; chưa có kênh đề nghị'],
  ['B7', 'TCTH tạm giữ quyền chốt Ươm mầm', 'Tạm thời hay lâu dài, khi nào trả về Trưởng phòng', 'Để dạng công tắc cấu hình, có lưu dấu vết chốt với Trưởng phòng'],
], [600, 2360, 3200, 3200], { boldCol: [0] }));

add(SPACE(200));
add(H2('11.3. Nhóm C — Quy chế có nhưng chưa đủ chi tiết'));
add(TBL(['Mã', 'Nội dung', 'Cần quyết', 'Đang tạm xử lý'], [
  ['C1', 'Lan tỏa là khoảng 2–3 triệu', 'Căn cứ chọn mức, ai quyết', 'Lấy mức tối thiểu 2 triệu khi tính lũy kế và dự toán'],
  ['C2', '«Chuyển kỳ xét sau» nhưng chu kỳ hết 31/12', 'Ý tưởng tồn cuối kỳ xử lý ra sao', 'Thanh ngân sách cảnh báo từ 80%, không chặn duyệt'],
  ['C3', 'Nút «Đề xuất Hội đồng» không đồng nghĩa Bén rễ', 'Khẳng định rõ trong văn bản', 'Đã rà: quy chế không quy định tự động Bén rễ; hệ thống giữ hai việc tách rời'],
  ['C4', 'Khai xung đột lợi ích rồi thì sao', 'Vẫn tính, giảm trọng số, hay loại phiếu', 'Mọi phiếu đều tính; số phiếu có khai hiện trên bản tổng hợp'],
  ['C5', 'Hai phòng gửi trùng một ý tưởng', 'Ghi cho phòng gửi trước, chia đôi, hay cả hai', 'Chưa có quy tắc; chỉ hỗ trợ phòng ngừa bằng ô tra cứu toàn Chi nhánh'],
  ['C6', 'Quy trình đối chiếu SMP', 'Giao đầu mối và nhịp đối chiếu', 'Màn đối chiếu đã có; ghi «Đồng ý» là tự lập dòng Bén rễ, không chiếm hạn mức. Đây là đường công nhận đang dùng thật — 20/20 ý tưởng Bén rễ hiện có đều lên cấp bằng đường này'],
  ['C7', 'Ý tưởng của người đã chuyển công tác hoặc nghỉ việc', 'Tính cho phòng nào, còn được thưởng không', 'Sổ chốt tên phòng tại thời điểm ghi nhận; phần tiền chưa có quy tắc'],
], [600, 2360, 3000, 3400], { boldCol: [0] }));

add(SPACE(200));
add(H2('11.4. Nhóm D — Đã có công cụ, chưa khởi động'));
add(TBL(['Việc', 'Hiện trạng', 'Ảnh hưởng nếu chậm'], [
  ['Mở đợt chấm Hội đồng đầu tiên', '0 đợt, 21 ý tưởng chờ', 'Trưởng phòng và Phó phòng không có điểm ĐMST'],
  ['Tạm dừng áp KPI', 'Đã tắt trần theo chỉ đạo', 'Không — có chủ ý, bật lại bằng một dòng cấu hình'],
  ['Đánh dấu nhân viên khoán gọn', '0 người', 'Mẫu số chỉ tiêu lãnh đạo tính thừa'],
  ['Đối chiếu kết quả SMP', '20/134 đã ghi', 'Bỏ sót đường ghi nhận không chiếm hạn mức'],
  ['TCTH chốt Ươm mầm với các Trưởng phòng', '20 dòng KPI, đều là Bén rễ nạp sẵn', 'Không phòng nào có Ươm mầm tính KPI'],
  ['Phân nhóm lĩnh vực cho phiếu cũ', '114/134 chưa có nhóm', 'Bức tranh sáng tạo chưa phản ánh đúng'],
], [3000, 2800, 3560], { boldCol: [0] }));

// ===== 12 =====
add(BREAK(), H1('12. Đề xuất thứ tự xử lý'));
add(NUM('Quyết A1 trước tiên — việc duy nhất càng để lâu càng khó sửa; mỗi tuần trôi qua lại thêm một loạt ý tưởng rơi ngoài hạn mức, không ghi nhận bù về sau được.'));
add(NUM('Nhập danh sách khoán gọn (A2) — hành chính, làm ngay được; không có thì mọi mẫu số KPI đều sai.'));
add(NUM('Mở đợt chấm Hội đồng đầu tiên (A3) với 21 ý tưởng đang chờ — cũng là cách duy nhất làm quay đường quy đổi.'));
add(NUM('Gom nhóm B thành một văn bản bổ sung quy chế — bảy nội dung đều đã chạy thực tế nên chỉ là ghi lại điều đang làm.'));
add(NUM('Nhóm C xử lý dần khi phát sinh; riêng C6 (đầu mối SMP) nên giao ngay vì đây là đường công nhận đang dùng thật.'));
add(SPACE(200));

add(H2('12.1. Nhận định để cân nhắc'));
add(QUOTE([
  'Phần lớn các vấn đề trên có chung một gốc: quy chế Ideas được viết như một chương trình phong trào — khuyến khích, có thưởng, có hạn mức giữ ngân sách — rồi sau đó được gắn thêm vai trò làm thước đo KPI. Hai vai này đòi hai thứ khác nhau: phong trào cần mở, thước đo cần chặt và ổn định.',
  '',
  'Nếu Chi nhánh xác định Ideas là thước đo KPI, nên sửa quy chế theo hướng bỏ hạn mức ghi nhận và chuyển việc kiểm soát ngân sách sang khâu xét thưởng thay vì khâu ghi nhận.',
]));

// ---- xuất file -----------------------------------------------------------
const doc = new Document({
  creator: 'VietinBank Bắc Hưng Yên',
  title: 'Đặc tả phân hệ Bắc Hưng Yên Ideas',
  description: 'Đặc tả toàn phần chương trình Bắc Hưng Yên Ideas',
  styles: {
    default: {
      document: { run: { font: 'Times New Roman', size: 21 } },
      heading1: { run: { font: 'Times New Roman' } },
      heading2: { run: { font: 'Times New Roman' } },
      heading3: { run: { font: 'Times New Roman' } },
    },
  },
  numbering: {
    config: [
      { reference: 'cham', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.2) } } } }] },
      { reference: 'so', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.25) } } } }] },
    ],
  },
  features: { updateFields: true },
  sections: [{
    properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1200 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Đặc tả phân hệ Bắc Hưng Yên Ideas  ·  ', size: 17, color: GREY }),
                   new TextRun({ children: [PageNumber.CURRENT], size: 17, color: GREY })],
      })] }),
    },
    children: body,
  }],
});

Packer.toBuffer(doc).then(b => {
  fs.writeFileSync(process.argv[2], b);
  console.log('Đã ghi', process.argv[2], b.length, 'bytes');
});

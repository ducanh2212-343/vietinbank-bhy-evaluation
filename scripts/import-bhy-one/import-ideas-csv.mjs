// Chuyển file kết xuất CSV của cổng BHY Ideas cũ
// (TONG_HOP_Y_TUONG_SANG_KIEN_BHY_<ngày>.csv — nút "Kết xuất Excel") thành gói JSON
// cho hàm `public.admin_import_ideas_csv(jsonb)` (migration 20260817090000).
//
//   node scripts/import-bhy-one/import-ideas-csv.mjs <duong-dan.csv> > payload.json
//
// Nạp gói JSON vào cơ sở dữ liệu (SQL Editor của Supabase, dán nội dung payload.json):
//   SELECT public.admin_import_ideas_csv($json$  ...dán...  $json$::jsonb);
// Hàm trả về số ý tưởng/bình luận đã ghi. Chạy lại cùng file không tạo bản trùng.
//
// Khác import-ideas.mjs (đọc bản dump Firestore, cần service role key): script này chỉ
// đọc file CSV cán bộ tải về, không gọi mạng, không cần khoá.
//
// Quy ước dữ liệu:
//   - legacy_id = 'bhy-ideas-csv:<thời điểm gửi>' — mỗi phiếu một mốc giây riêng và mốc
//     này không đổi giữa các lần kết xuất, nên chạy lại chỉ cập nhật (idempotent).
//   - Cột "Ngay gui" là giờ Việt Nam (toLocaleString vi-VN) → quy về ISO +07:00.
//   - Bình luận dạng '[Tên (tài khoản)]: nội dung' tách thành một dòng bình luận.
//   - CSV không có cột lượt thích/không thích → seed_likes/seed_unlikes để 0.
//   - Chủ sở hữu phiếu do hàm SQL quyết định, ưu tiên TÊN người đề xuất rồi mới đến
//     email người gửi (nhiều phiếu gửi bằng tài khoản dùng chung của phòng) — xem
//     migration 20260820090000. Script chỉ giữ nguyên hai trường này của file gốc.

import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Cách dùng: node import-ideas-csv.mjs <duong-dan.csv> > payload.json');
  process.exit(1);
}

/** Tách CSV chuẩn RFC 4180 (giá trị nhiều dòng, nháy kép nhân đôi), bỏ BOM đầu file */
function parseCsv(text) {
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** 'HH:mm:ss d/M/yyyy' (giờ Việt Nam) → ISO có offset +07:00 */
function parseVnDateTime(raw) {
  const m = /^(\d{1,2}):(\d{2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(raw).trim());
  if (!m) return null;
  const [, hh, mi, ss, d, mo, y] = m;
  const p = (v) => String(v).padStart(2, '0');
  return `${y}-${p(mo)}-${p(d)}T${p(hh)}:${mi}:${ss}+07:00`;
}

const LEVELS = ['Nội bộ CN', 'Đề xuất TSC'];
const APPLICABILITIES = ['Cấp Phòng', 'Cấp Chi nhánh', 'Toàn hàng'];
const DEV_LEVELS = ['Ươm mầm', 'Bén rễ', 'Vươn cành', 'Lan tỏa'];
// Cổng cũ tồn tại song song hai hệ tên phòng — chuẩn hoá về hệ IDEA_DEPARTMENTS
const DEPT_MAP = {
  'Ban giám đốc': 'Ban Giám Đốc',
  'Phòng bán lẻ': 'Phòng KHBL',
  'Phòng Bán lẻ': 'Phòng KHBL',
};

const rows = parseCsv(readFileSync(file, 'utf8'));
const header = rows[0] ?? [];
const at = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`CSV thiếu cột "${name}"`);
  return i;
};
const C = {
  level: at('Cấp đề xuất'),
  applicability: at('Có thể thử/áp dụng ở đâu?'),
  title: at('Tên ý tưởng/vấn đề?'),
  currentStatus: at('Thực trạng hiện tại (Khó khăn, bất cập):'),
  proposedSolution: at('Đề xuất cách làm mới / giải pháp:'),
  expectedBenefits: at('Lợi ích dự kiến mang lại:'),
  department: at('Khai báo thông tin Phòng/Ban:'),
  hasDemo: at('Xác nhận có sản phẩm Demo?'),
  proposer: at('Cán bộ / Nhóm đề xuất:'),
  sentAt: at('Ngay gui'),
  email: at('Email nguoi gui'),
  devLevel: at('Cap Do Phat Trien'),
  council: at('De xuat Hoi dong'),
  comment: at('Y kien binh luan'),
};

const warnings = [];
const ideas = [];
const comments = [];
const seen = new Set();

rows.slice(1).forEach((r, i) => {
  const stt = i + 1;
  // Chuẩn hoá NFC: vài ô trong file kết xuất để dấu tiếng Việt ở dạng tách rời (NFD),
  // nhìn giống hệt nhau nhưng khác chuỗi byte → gộp về một dạng cho khớp phần còn lại.
  const txt = (idx) => String(r[idx] ?? '').normalize('NFC').trim();
  const sentAt = parseVnDateTime(r[C.sentAt] ?? '');
  if (!sentAt) {
    warnings.push(`STT ${stt}: không đọc được "Ngay gui" = "${r[C.sentAt]}" → bỏ dòng`);
    return;
  }
  const legacyId = `bhy-ideas-csv:${sentAt.slice(0, 19).replace(/[-:]/g, '')}`;
  if (seen.has(legacyId)) {
    warnings.push(`STT ${stt}: trùng thời điểm gửi ${r[C.sentAt]} với phiếu trước → bỏ dòng`);
    return;
  }
  seen.add(legacyId);

  const pick = (val, allowed, fallback, label) => {
    if (allowed.includes(val)) return val;
    warnings.push(`STT ${stt}: ${label} lạ "${val}" → dùng "${fallback}"`);
    return fallback;
  };
  const dept = DEPT_MAP[txt(C.department)] ?? txt(C.department);

  ideas.push({
    legacy_id: legacyId,
    level: pick(txt(C.level), LEVELS, 'Nội bộ CN', 'Cấp đề xuất'),
    applicability: pick(txt(C.applicability), APPLICABILITIES, 'Cấp Chi nhánh', 'Áp dụng ở đâu'),
    title: txt(C.title) || '(không tiêu đề)',
    current_status: txt(C.currentStatus) || null,
    proposed_solution: txt(C.proposedSolution) || null,
    expected_benefits: txt(C.expectedBenefits) || null,
    department_name: dept || 'Bộ phận khác',
    has_demo: txt(C.hasDemo) === 'Có',
    proposer: txt(C.proposer) || 'Ẩn danh',
    development_level: pick(txt(C.devLevel), DEV_LEVELS, 'Ươm mầm', 'Cấp độ phát triển'),
    council_proposal: txt(C.council).includes('Đề xuất Hội đồng'),
    creator_email: /@/.test(txt(C.email)) ? txt(C.email).toLowerCase() : null,
    created_at: sentAt,
  });

  // '[Tên hiển thị (tài khoản)]: nội dung'. Bản kết xuất của cổng mới chỉ ghi
  // 'N bình luận' — không phục hồi được nội dung nên bỏ qua.
  const raw = txt(C.comment);
  const m = /^\[([^\]]+)\]:\s*([\s\S]+)$/.exec(raw);
  if (raw && !m) {
    warnings.push(`STT ${stt}: cột bình luận không đúng dạng "[Tên]: nội dung" → bỏ qua`);
  } else if (m) {
    const label = m[1].trim().normalize('NFC');
    comments.push({
      legacy_id: `${legacyId}#1`,
      idea_legacy_id: legacyId,
      // tài khoản cổng cũ (vd 'phuongnt5151089') — dò hồ sơ cán bộ để hiện tên thật
      account: /\(([^)]+)\)/.exec(label)?.[1]?.trim() ?? null,
      user_name: label,
      body: m[2].trim().normalize('NFC'),
      created_at: sentAt,
    });
  }
});

process.stdout.write(JSON.stringify({
  source: file.split('/').pop(),
  ideas,
  comments,
}, null, 1) + '\n');

if (warnings.length) {
  console.error(`⚠ ${warnings.length} cảnh báo:`);
  for (const w of warnings) console.error('  - ' + w);
}
console.error(`✔ ${ideas.length} ý tưởng, ${comments.length} bình luận.`);

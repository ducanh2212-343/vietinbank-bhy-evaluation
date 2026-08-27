#!/usr/bin/env node
/**
 * Cổng chặn: PR đổi thứ cán bộ nhìn thấy thì PHẢI kèm một mục lịch sử phiên bản.
 *
 *   node scripts/kiem-tra-changelog.mjs [base]      # base mặc định: origin/main
 *
 * Vì sao cần: kiểm thử `lichSuPhienBan.test.ts` chỉ soi các mục ĐÃ CÓ — nó
 * không biết mục nào THIẾU. Mà thiếu mới đúng là cách bản cũ chết: không ai
 * bắt buộc nên 45 ngày không ai thêm dòng nào. Nhiều phiên làm việc song song
 * thì càng không có ai đứng ra rà.
 *
 * Cửa thoát: PR thuần kỹ thuật (dọn mã, đổi test, đổi cấu hình build, nhập dữ
 * liệu) ghi `[khong-can-changelog]` vào một commit message hoặc đặt biến môi
 * trường KHONG_CAN_CHANGELOG=1. Cửa thoát phải để lại VẾT trong lịch sử git —
 * bỏ qua có lý do thì được, bỏ qua im lặng thì không.
 */
import { execFileSync } from 'node:child_process';

const base = process.argv[2] || 'origin/main';
const THU_MUC_MUC = 'src/data/changelog/';

function git(...thamSo) {
  return execFileSync('git', thamSo, { encoding: 'utf8' }).trim();
}

/** Đường dẫn có phải thứ cán bộ nhìn thấy / thao tác được không. */
function anhHuongNguoiDung(duongDan) {
  if (duongDan.startsWith(THU_MUC_MUC)) return false;
  // Kiểm thử, tài liệu, script nội bộ: không ai ngoài đội kỹ thuật thấy
  if (/(^|\/)__tests__\//.test(duongDan)) return false;
  if (/\.test\.[cm]?[jt]sx?$/.test(duongDan)) return false;
  if (duongDan.startsWith('src/test/')) return false;
  if (duongDan.startsWith('docs/')) return false;
  if (duongDan.startsWith('scripts/')) return false;

  return duongDan.startsWith('src/')
    || duongDan.startsWith('supabase/functions/')
    || duongDan.startsWith('supabase/migrations/')
    || duongDan.startsWith('public/')
    || duongDan === 'index.html';
}

let diff;
try {
  diff = git('diff', '--name-status', `${base}...HEAD`);
} catch {
  console.error(`✗ Không đọc được thay đổi so với ${base}. Chạy: git fetch origin main`);
  process.exit(1);
}

const dong = diff.split('\n').filter(Boolean).map((d) => d.split('\t'));
const mucMoi = dong.filter(([tt, f]) => tt.startsWith('A') && f.startsWith(THU_MUC_MUC) && f.endsWith('.ts'));
const anhHuong = dong.map(([, f]) => f).filter(anhHuongNguoiDung);

if (anhHuong.length === 0) {
  console.log('✓ PR không đổi thứ cán bộ nhìn thấy — không cần mục lịch sử phiên bản.');
  process.exit(0);
}

if (mucMoi.length > 0) {
  console.log(`✓ Có ${mucMoi.length} mục lịch sử phiên bản mới:`);
  for (const [, f] of mucMoi) console.log(`  · ${f}`);
  process.exit(0);
}

const nhatKy = (() => {
  try { return git('log', '--format=%B', `${base}..HEAD`); } catch { return ''; }
})();
if (process.env.KHONG_CAN_CHANGELOG === '1' || nhatKy.includes('[khong-can-changelog]')) {
  console.log('✓ Đã khai báo [khong-can-changelog] — bỏ qua cổng chặn (có vết trong lịch sử git).');
  process.exit(0);
}

console.error('✗ PR này đổi thứ cán bộ nhìn thấy nhưng KHÔNG thêm mục lịch sử phiên bản.\n');
console.error('  Các file đã đổi:');
for (const f of anhHuong.slice(0, 12)) console.error(`  · ${f}`);
if (anhHuong.length > 12) console.error(`  · … và ${anhHuong.length - 12} file khác`);
console.error('\n  Thêm mục (một lần cập nhật = một file mới, không sửa file nào đang có):');
console.error('    npm run phien-ban -- ten-ngan-khong-dau --loai=tinh-nang --phan-he=chieu-thuc-2');
console.error('\n  loai:    lon | tinh-nang | sua-loi');
console.error('  phan-he: one-home | cay-ky-uc | bhy-ways | chieu-thuc-2 | hr-343 | user-admin | nen-tang');
console.error('\n  PR thuần kỹ thuật (dọn mã, đổi cấu hình build, nhập dữ liệu):');
console.error('  ghi [khong-can-changelog] vào commit message.\n');
console.error('  Quy ước đầy đủ: docs/lich-su-phien-ban-va-bao-tin-moi-2026-08.md');
process.exit(1);

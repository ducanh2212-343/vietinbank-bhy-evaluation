// Import phiếu Sao Xứng Đáng từ bản export Firestore (document siteSettings/starRecords,
// field records[]) vào bảng star_records. Idempotent: xóa toàn bộ dòng source='import'
// rồi ghi lại (phiếu gửi từ form — source='form' — giữ nguyên).
//
// Cách chạy:
//   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-bhy-one/import-star-records.mjs [đường/dẫn/firestore-export.json]

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://whlysprzsguehxmrjwha.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error('Thiếu SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, KEY);

const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? join(here, 'firestore-export.json');
const dump = JSON.parse(readFileSync(file, 'utf8'));
const doc = (dump.collections?.siteSettings ?? []).find((d) => d.id === 'starRecords');
const records = doc?.data?.records ?? [];
if (!records.length) {
  console.error('Không thấy siteSettings/starRecords.records trong file export');
  process.exit(1);
}

// Phát hiện phiếu tập thể — quy tắc ĐÃ SỬA so với bản gốc: chỉ match các cụm rõ ràng,
// không match trần "phòng"/"tổ " (bản gốc xếp nhầm cá nhân "... - Phòng X" thành tập thể).
const isCollectiveName = (name) => /tập thể|ban giám đốc|bgđ|chi nhánh|tổ fdi/i.test(name ?? '');

const toIsoDate = (v, warn) => {
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(v.trim()); // dd/mm/yyyy
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  if (typeof v === 'number' && v > 25569) {
    // serial Excel còn sót lại trong dữ liệu cũ
    return new Date(Math.round((v - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
  }
  warn(`ngày không đọc được "${v}" → dùng 2026-01-01`);
  return '2026-01-01';
};

const warnings = [];
const rows = records.map((r, i) => {
  const warn = (msg) => warnings.push(`dòng ${i + 1} (${r.name ?? '?'}): ${msg}`);
  let stars = Number(r.stars);
  if (!Number.isFinite(stars) || stars <= 0) {
    warn(`số sao lạ "${r.stars}" → dùng 1`);
    stars = 1;
  }
  return {
    name: (r.name ?? '').trim() || 'Cán bộ ẩn danh',
    department: (r.department ?? '').trim() || 'Phòng KHDN',
    stars,
    reason: r.reason || null,
    result: r.result || null,
    awarded_on: toIsoDate(r.date, warn),
    sender: r.sender || null,
    serial: r.serial != null ? String(r.serial) : null,
    is_collective: isCollectiveName(r.name),
    source: 'import',
  };
});

const { error: delErr } = await supabase.from('star_records').delete().eq('source', 'import');
if (delErr) throw new Error(`xóa dữ liệu import cũ: ${delErr.message}`);

for (let i = 0; i < rows.length; i += 200) {
  const { error } = await supabase.from('star_records').insert(rows.slice(i, i + 200));
  if (error) throw new Error(`insert lô ${i / 200 + 1}: ${error.message}`);
}

const collective = rows.filter((r) => r.is_collective).length;
console.log(`✔ ${rows.length} phiếu sao (${collective} phiếu tập thể, ${rows.length - collective} phiếu cá nhân)`);
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} cảnh báo:`);
  for (const w of warnings) console.log('  - ' + w);
}
console.log('Xong.');

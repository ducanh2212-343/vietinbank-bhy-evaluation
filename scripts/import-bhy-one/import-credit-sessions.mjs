// Import phiên họp Credit 360 từ bản export Firestore (collection bhy_credit_sessions)
// vào portal_credit_sessions. Idempotent: upsert theo legacy_id.
//
// Cách chạy:
//   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-bhy-one/import-credit-sessions.mjs [đường/dẫn/firestore-export.json]

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
const docs = dump.collections?.bhy_credit_sessions ?? [];
if (!docs.length) {
  console.error('Không thấy collection bhy_credit_sessions trong file export');
  process.exit(1);
}

const DEPT_MAP = {
  'Ban giám đốc': 'Ban Giám Đốc',
  'Phòng bán lẻ': 'Phòng KHBL',
  'Phòng Bán lẻ': 'Phòng KHBL',
};
const KNOWN = new Set([
  'sessionDate', 'department', 'customerName', 'businessField', 'actualRevenue',
  'creditLimit', 'underwriter', 'deptLeader', 'createdAt', 'updatedAt',
  'userId', 'userName', 'userEmail',
]);

// created_by bắt buộc — gán tài khoản system_admin (uid Firebase không map được)
const { data: adminRole, error: adminErr } = await supabase
  .from('user_roles').select('user_id').eq('role', 'system_admin').limit(1).single();
if (adminErr) throw new Error(`Không tìm được tài khoản system_admin: ${adminErr.message}`);

const warnings = [];
const rows = docs.map((doc) => {
  const d = doc.data ?? {};
  const custom = {};
  for (const [k, v] of Object.entries(d)) {
    if (!KNOWN.has(k) && v !== null && v !== undefined && v !== '') custom[k] = v;
  }
  let sessionDate = null;
  if (typeof d.sessionDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d.sessionDate)) {
    sessionDate = d.sessionDate.slice(0, 10);
  } else if (d.sessionDate) {
    warnings.push(`${doc.id}: ngày họp lạ "${d.sessionDate}" → để trống (giữ trong custom_values)`);
    custom._sessionDate = d.sessionDate;
  }
  const creditLimit = Number(d.creditLimit);
  return {
    legacy_id: doc.id,
    session_date: sessionDate,
    department_name: DEPT_MAP[d.department] ?? d.department ?? null,
    customer_name: d.customerName || null,
    business_field: d.businessField || null,
    actual_revenue: d.actualRevenue != null ? String(d.actualRevenue) : null,
    credit_limit: Number.isFinite(creditLimit) ? creditLimit : null,
    underwriter: d.underwriter || null,
    dept_leader: d.deptLeader || null,
    custom_values: Object.keys(custom).length ? custom : null,
    created_by: adminRole.user_id,
    creator_name: d.userName || 'Thành viên',
    created_at: d.createdAt || new Date().toISOString(),
  };
});

const { error } = await supabase.from('portal_credit_sessions')
  .upsert(rows, { onConflict: 'legacy_id' });
if (error) throw new Error(error.message);

console.log(`✔ ${rows.length} phiên họp Credit 360`);
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} cảnh báo:`);
  for (const w of warnings) console.log('  - ' + w);
}
console.log('Xong.');

// Import 92 ý tưởng BHY Ideas từ bản export Firestore (collection bhy_ideas)
// vào portal_ideas + portal_idea_comments. Idempotent: upsert theo legacy_id;
// bình luận import cũ (legacy_id ≠ null) được thay thế mỗi lần chạy.
//
// Cách chạy (khi đã có firestore-export.json — xem hướng dẫn xuất trong hội thoại):
//   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-bhy-one/import-ideas.mjs [đường/dẫn/firestore-export.json]
//
// Mặc định đọc scripts/import-bhy-one/firestore-export.json. KHÔNG commit file export/key vào repo.

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
const docs = dump.collections?.bhy_ideas ?? [];
if (!docs.length) {
  console.error('Không thấy collection bhy_ideas trong file export');
  process.exit(1);
}

// Chuẩn hóa về 1 hệ tên phòng (bản gốc tồn tại song song 2 hệ)
const DEPT_MAP = {
  'Ban giám đốc': 'Ban Giám Đốc',
  'Phòng bán lẻ': 'Phòng KHBL',
  'Phòng Bán lẻ': 'Phòng KHBL',
};
const LEVELS = ['Nội bộ CN', 'Đề xuất TSC'];
const APPLICABILITIES = ['Cấp Phòng', 'Cấp Chi nhánh', 'Toàn hàng'];
const DEV_LEVELS = ['Ươm mầm', 'Bén rễ', 'Vươn cành', 'Lan tỏa'];
// Các field đã có cột riêng — phần còn lại rơi vào custom_values
const KNOWN = new Set([
  'level', 'applicability', 'title', 'currentStatus', 'proposedSolution',
  'expectedBenefits', 'department', 'hasDemo', 'proposer', 'developmentLevel',
  'councilProposal', 'likes', 'unlikes', 'comments', 'createdAt', 'updatedAt',
  'userId', 'userEmail',
]);

// created_by bắt buộc — gán tài khoản system_admin (như import Kho Dữ Liệu đợt 2)
const { data: adminRole, error: adminErr } = await supabase
  .from('user_roles').select('user_id').eq('role', 'system_admin').limit(1).single();
if (adminErr) throw new Error(`Không tìm được tài khoản system_admin: ${adminErr.message}`);
const ADMIN_ID = adminRole.user_id;

const warnings = [];
const rows = [];
const commentsByLegacy = new Map();

for (const doc of docs) {
  const d = doc.data ?? {};
  const pick = (val, allowed, fallback, label) => {
    if (allowed.includes(val)) return val;
    warnings.push(`${doc.id}: ${label} lạ "${val}" → dùng "${fallback}" (giá trị gốc giữ trong custom_values)`);
    return fallback;
  };
  const custom = {};
  for (const [k, v] of Object.entries(d)) {
    if (!KNOWN.has(k) && v !== null && v !== undefined && v !== '') custom[k] = v;
  }
  const level = pick(d.level, LEVELS, 'Nội bộ CN', 'level');
  if (level !== d.level) custom._level = d.level;
  const applicability = pick(d.applicability, APPLICABILITIES, 'Cấp Chi nhánh', 'applicability');
  if (applicability !== d.applicability) custom._applicability = d.applicability;
  const devLevel = pick(d.developmentLevel ?? 'Ươm mầm', DEV_LEVELS, 'Ươm mầm', 'developmentLevel');

  rows.push({
    legacy_id: doc.id,
    level,
    applicability,
    title: d.title || '(không tiêu đề)',
    current_status: d.currentStatus || null,
    proposed_solution: d.proposedSolution || null,
    expected_benefits: d.expectedBenefits || null,
    department_name: DEPT_MAP[d.department] ?? d.department ?? 'Bộ phận khác',
    has_demo: d.hasDemo === 'Có' || d.hasDemo === true,
    proposer: d.proposer || 'Ẩn danh',
    development_level: devLevel,
    // Bản gốc lưu chuỗi ('Đề xuất Hội đồng'/'Không') qua handleUpdateCouncilProposal
    council_proposal: d.councilProposal === true || String(d.councilProposal ?? '').includes('Đề xuất'),
    custom_values: Object.keys(custom).length ? custom : null,
    seed_likes: Array.isArray(d.likes) ? d.likes.length : 0,
    seed_unlikes: Array.isArray(d.unlikes) ? d.unlikes.length : 0,
    created_by: ADMIN_ID,
    creator_email: d.userEmail && d.userEmail !== 'anonymous' ? d.userEmail : null,
    created_at: d.createdAt || new Date().toISOString(),
  });

  // Bình luận: array field `comments` (hoặc subcollection nếu có)
  const comments = [
    ...(Array.isArray(d.comments) ? d.comments : []),
    ...((doc.sub?.comments ?? []).map((c) => ({ id: c.id, ...c.data }))),
  ];
  if (comments.length) commentsByLegacy.set(doc.id, comments);
}

for (let i = 0; i < rows.length; i += 100) {
  const { error } = await supabase.from('portal_ideas')
    .upsert(rows.slice(i, i + 100), { onConflict: 'legacy_id' });
  if (error) throw new Error(`upsert ý tưởng lô ${i / 100 + 1}: ${error.message}`);
}
console.log(`✔ ${rows.length} ý tưởng`);

// Map legacy_id → id để gắn bình luận
const { data: idMap, error: mapErr } = await supabase
  .from('portal_ideas').select('id, legacy_id').not('legacy_id', 'is', null);
if (mapErr) throw new Error(mapErr.message);
const byLegacy = new Map(idMap.map((r) => [r.legacy_id, r.id]));

// Thay thế toàn bộ bình luận import cũ rồi ghi lại (idempotent)
const { error: delErr } = await supabase
  .from('portal_idea_comments').delete().not('legacy_id', 'is', null);
if (delErr) throw new Error(delErr.message);

const commentRows = [];
for (const [legacyId, comments] of commentsByLegacy) {
  const ideaId = byLegacy.get(legacyId);
  if (!ideaId) continue;
  for (const c of comments) {
    if (!c.text?.trim()) continue;
    commentRows.push({
      idea_id: ideaId,
      legacy_id: `${legacyId}:${c.id}`,
      user_id: null, // uid Firebase không map được sang tài khoản Supabase
      user_name: c.userName || 'Đồng nghiệp',
      body: c.text.trim(),
      created_at: c.createdAt || new Date().toISOString(),
    });
  }
}
for (let i = 0; i < commentRows.length; i += 200) {
  const { error } = await supabase.from('portal_idea_comments').insert(commentRows.slice(i, i + 200));
  if (error) throw new Error(`insert bình luận: ${error.message}`);
}
console.log(`✔ ${commentRows.length} bình luận`);

if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} cảnh báo:`);
  for (const w of warnings) console.log('  - ' + w);
}
console.log('Xong.');

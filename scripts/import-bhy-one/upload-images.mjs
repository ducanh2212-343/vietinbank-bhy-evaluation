// Bổ sung ảnh base64 từ bản export Firebase vào bucket bhy-one và cập nhật portal_uploads.
// Phần metadata (10 bài) + 2 ảnh link ibb.co đã được import sẵn (29/07/2026) — script này
// chỉ upload các ảnh dataURL còn thiếu. Idempotent: chạy lại không tạo trùng (upsert theo path).
//
// Cách chạy:
//   SUPABASE_SERVICE_ROLE_KEY=<service_role_key> node scripts/import-bhy-one/upload-images.mjs
//
// Lấy service role key: Supabase Dashboard → Project Settings → API keys (project whlysprzsguehxmrjwha).
// TUYỆT ĐỐI không commit key vào repo.

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
const data = JSON.parse(readFileSync(join(here, 'BHY_Du_Lieu_20260729.json'), 'utf8'));

function parseDataUrl(src) {
  const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/s.exec(src || '');
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  return { bytes: Buffer.from(m[2], 'base64'), ext, mime: `image/${m[1]}` };
}

let uploaded = 0;
for (const item of data.uploadedItems) {
  // Gộp imageUrl + imageUrls, bỏ trùng, imageUrl đứng đầu làm ảnh đại diện
  const sources = [];
  if (item.imageUrl) sources.push(item.imageUrl);
  for (const u of item.imageUrls ?? []) if (u && !sources.includes(u)) sources.push(u);

  const dataUrls = sources.filter((s) => s.startsWith('data:'));
  if (!dataUrls.length) continue; // ảnh link http đã import sẵn

  const paths = [];
  for (let i = 0; i < dataUrls.length; i++) {
    const img = parseDataUrl(dataUrls[i]);
    if (!img) {
      console.warn(`  bỏ qua ảnh hỏng: ${item.id}[${i}]`);
      continue;
    }
    const path = `staff/import/${item.id}-${i}.${img.ext}`;
    const { error } = await supabase.storage
      .from('bhy-one')
      .upload(path, img.bytes, { contentType: img.mime, upsert: true });
    if (error) throw new Error(`${item.id}: ${error.message}`);
    paths.push(path);
    uploaded++;
  }
  if (!paths.length) continue;

  const { error } = await supabase
    .from('portal_uploads')
    .update({ image_path: paths[0], image_paths: paths.slice(1) })
    .eq('legacy_id', item.id);
  if (error) throw new Error(`update ${item.id}: ${error.message}`);
  console.log(`✔ ${item.id}: ${paths.length} ảnh`);
}
console.log(`Xong — đã upload ${uploaded} ảnh.`);

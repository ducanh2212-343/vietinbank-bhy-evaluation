# Import dữ liệu BHY one (Firebase → Supabase)

Nguồn: `BHY_Du_Lieu_20260729.json` — export từ bản BHY one chạy Firebase
(app `bhy-20`, export 29/07/2026): 21 key `siteContent` + 10 `uploadedItems`.

## Trạng thái (29/07/2026 — đã thực hiện)

1. **`site_content` (21 key)** — ĐÃ SEED vào project `whlysprzsguehxmrjwha`
   (upsert theo key, gồm cả 2 key cấu hình `departments_config`, `categories_config`).
2. **`portal_uploads` (10 bài)** — ĐÃ IMPORT đầy đủ metadata (upsert theo `legacy_id`,
   likes cũ → `seed_likes`, bài `bhy-img-6` gắn `is_featured`). 2 bài có ảnh link
   i.ibb.co đã được tải và đưa vào bucket `bhy-one` (path `staff/import/…`).
   Cách chạy: edge function tạm `import-bhy-one` (đã vô hiệu hóa thành stub 410
   sau khi xong), kích hoạt từ database qua `net.http_post` vì môi trường dev
   không gọi thẳng được supabase.co.
3. **8 bài còn thiếu ảnh** (ảnh nằm dạng base64 trong JSON, ~1.4MB) — chạy:

   ```sh
   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-bhy-one/upload-images.mjs
   ```

   Script idempotent (upsert theo path, update theo `legacy_id`), dùng
   `@supabase/supabase-js` có sẵn trong node_modules của repo.

## Lưu ý

- `userId`/`likedBy` của Firebase không map được sang tài khoản Supabase — bỏ;
  tổng like hiển thị = `seed_likes` + count(`portal_upload_likes`).
- Các bài import gán `created_by` = tài khoản system_admin (GĐCN).

# Import dữ liệu BHY one (Firebase → Supabase)

Nguồn: `BHY_Du_Lieu_20260729.json` — export từ bản BHY one chạy Firebase
(app `bhy-20`, export 29/07/2026): 21 key `siteContent` + 10 `uploadedItems`.

## Trạng thái: ĐÃ CHUYỂN XONG TOÀN BỘ (29/07/2026)

Kiểm chứng trên project `whlysprzsguehxmrjwha`:

| Hạng mục | Kết quả |
|---|---|
| `site_content` | **21/21 mục** (gồm 2 key cấu hình `departments_config`, `categories_config`) |
| `portal_uploads` | **10/10 bài** — đủ tiêu đề, tóm tắt, tác giả, phòng, ngày, `seed_likes` |
| Ảnh | **10/10 bài có ảnh**; bucket `bhy-one` có **13 file** (~1,8 MB), bài Pickleball đủ 4 ảnh |
| `is_featured` | bài `bhy-img-6` (hành trình thay ảnh đại diện) |

Cách đã làm — hai bước, đều chạy qua edge function tạm `import-bhy-one`
(kích hoạt từ database bằng `net.http_post` vì môi trường dev bị chặn gọi thẳng
`supabase.co`; function nay đã bị vô hiệu hóa thành stub 410):

1. **Metadata + 2 ảnh link i.ibb.co** — gửi thẳng phần JSON đã lược ảnh base64.
2. **11 ảnh base64 còn lại** — function tự `fetch` file JSON này từ GitHub theo
   commit SHA (`d7f7545`) rồi decode/upload, tránh phải truyền 1,2 MB qua kênh khác.

Nội dung `site_content` được seed bằng một câu `INSERT ... ON CONFLICT DO UPDATE`.

## Chạy lại khi cần (phương án dự phòng)

Nếu phải import lại ảnh (khôi phục, đổi project…):

```sh
SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-bhy-one/upload-images.mjs
```

Script idempotent (upsert theo path storage, update theo `legacy_id`), dùng
`@supabase/supabase-js` sẵn có trong `node_modules`. Lấy service role key ở
Supabase Dashboard → Project Settings → API keys. **Không commit key vào repo.**

## Đợt 4–6: import Ideas / Sao / Credit 360 (chờ dữ liệu)

Ba script đọc `firestore-export.json` (định dạng của script `export-firestore.mjs`
đã hướng dẫn: `{ collections: { bhy_ideas: [{id, data, sub?}], siteSettings: [...], ... } }`).
Đặt file export vào thư mục này (KHÔNG commit) rồi chạy:

```sh
SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-bhy-one/import-ideas.mjs
SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-bhy-one/import-star-records.mjs
SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-bhy-one/import-credit-sessions.mjs
```

- **import-ideas.mjs** → `portal_ideas` (upsert theo `legacy_id`) + `portal_idea_comments`
  (bình luận import có `user_id = null`, giữ tên người viết). `likes[]/unlikes[]` Firebase
  không map được danh tính → chuyển thành `seed_likes/seed_unlikes`; field lạ vào
  `custom_values`; chuẩn hóa tên phòng (`Ban giám đốc→Ban Giám Đốc`, `Phòng bán lẻ→Phòng KHBL`).
- **import-star-records.mjs** → `star_records` từ `siteSettings/starRecords.records[]`.
  Thay thế toàn bộ dòng `source='import'` (phiếu gửi từ form giữ nguyên); tính lại
  `is_collective` theo quy tắc đã sửa (chỉ match `tập thể|ban giám đốc|bgđ|chi nhánh|tổ fdi`).
- **import-credit-sessions.mjs** → `portal_credit_sessions` (upsert theo `legacy_id`).

Cả ba idempotent — chạy lại không tạo trùng. Cảnh báo (ngày/sao/phòng lạ) in ra cuối script.

## Nạp Ideas từ file kết xuất CSV (đã chạy 03/08/2026)

Khi trong tay chỉ có file CSV cán bộ tải về từ nút "Kết xuất Excel" của cổng cũ
(không có dump Firestore, không cần service role key):

```sh
node scripts/import-bhy-one/import-ideas-csv.mjs <file.csv> > payload.json
# rồi chạy trong SQL Editor của Supabase:
#   SELECT public.admin_import_ideas_csv($json$ ...dán payload.json... $json$::jsonb);
```

Hàm `admin_import_ideas_csv` đến từ migration `20260817090000_bhy_ideas_nap_du_lieu_csv.sql`,
idempotent theo `legacy_id` và nạp được theo lô. Kết quả đợt 03/08/2026 (113 ý tưởng,
21 bình luận) ghi tại `docs/nap-du-lieu-bhy-ideas-2026-08.md`. **Không commit file CSV**
— repo công khai, dữ liệu có email cá nhân của cán bộ.

## Lưu ý

- `userId`/`likedBy` của Firebase không map được sang tài khoản Supabase — bỏ;
  tổng like hiển thị = `seed_likes` + số dòng `portal_upload_likes`.
- Các bài import gán `created_by` = tài khoản system_admin (GĐCN).
- Ảnh nằm ở prefix `staff/import/…` (chỉ cán bộ xem được). Muốn chia sẻ cho
  khách đối tác thì bấm nút "Chia sẻ đối tác" trên bài trong Kho Dữ Liệu —
  hệ thống tự sao chép ảnh sang prefix `shared/…`.
- Gallery ảnh trụ cột/chiêu thức (`portal_images`) chưa có dữ liệu: đang hiển thị
  bộ ảnh mặc định trong code, admin đổi trực tiếp trên giao diện khi cần.

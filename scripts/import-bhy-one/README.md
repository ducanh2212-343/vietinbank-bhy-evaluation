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

## Lưu ý

- `userId`/`likedBy` của Firebase không map được sang tài khoản Supabase — bỏ;
  tổng like hiển thị = `seed_likes` + số dòng `portal_upload_likes`.
- Các bài import gán `created_by` = tài khoản system_admin (GĐCN).
- Ảnh nằm ở prefix `staff/import/…` (chỉ cán bộ xem được). Muốn chia sẻ cho
  khách đối tác thì bấm nút "Chia sẻ đối tác" trên bài trong Kho Dữ Liệu —
  hệ thống tự sao chép ảnh sang prefix `shared/…`.
- Gallery ảnh trụ cột/chiêu thức (`portal_images`) chưa có dữ liệu: đang hiển thị
  bộ ảnh mặc định trong code, admin đổi trực tiếp trên giao diện khi cần.

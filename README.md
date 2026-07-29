# 343 Phát triển nhân sự — VietinBank Bắc Hưng Yên

Hệ thống quản trị năng lực nhân sự: tự đánh giá 38 kỹ năng theo 4 cấp độ,
quy trình duyệt 3 cấp, kế hoạch phát triển IDP 70/20/10 và trợ lý AI.

## Nhóm tính năng quản trị chiến lược (07/2026)

- **Chiến lược nhân sự** (BGĐ + Phòng TCTH — hook `useStrategicHrAccess`):
  - `/ban-do-rui-ro-nang-luc` — heatmap bus-factor kỹ năng × phòng ban (kỹ năng chỉ 0–2 người đạt L3+)
  - `/con-duong-su-nghiep` — xếp hạng vị trí theo % kỹ năng đáp ứng của từng cán bộ
  - `/mo-phong-dieu-chuyen` — what-if điều chuyển: gap cá nhân + ảnh hưởng phòng cũ/mới
- **Kèm cặp nội bộ** — gợi ý mentor trong khối IDP (bảng `mentorship_pairs`,
  RPC `suggest_skill_mentors`, tối đa 2 mentee/mentor/kỳ)
- **Minh chứng cho level cao** — tự chấm L3+ bắt buộc minh chứng, có AI thẩm định
  (mode `evidence_review`)
- **Trợ lý 1-1** — trang chuẩn bị phiên 1-1 cho quản lý tại Chi tiết cán bộ (mode `one_on_one_prep`)
- **Bản tin quý** — `/ban-tin-quy` (admin): AI viết thư tổng kết cá nhân, duyệt rồi gửi email
  (mode `quarterly_letter` + edge function `send-hr-notification`)
- **Nhắc nộp biểu mẫu** — nút nhắc email trong Báo cáo nộp biểu mẫu, chống gửi trùng theo ngày
- **Chiến dịch học tập tập thể** — `/chien-dich-hoc-tap` (bảng `learning_campaigns`,
  RPC `get_campaign_progress`)

- **Production:** https://chieuthuc3.com (domain Cloudflare, 07/2026) — app chạy trên
  **Cloudflare Worker** `343-noi-bo` (đường dự phòng: https://343-noi-bo.ducanh2212.workers.dev).
  Domain cũ `343skill.com` không còn truy cập được — xem mục "Chuyển domain" trong
  `docs/quan-tri-email-2026-07.md`.
- **Backend:** Supabase — project `whlysprzsguehxmrjwha` (chieuthuc3-bachungyen)
- **Stack:** Vite + React + TypeScript + Tailwind + shadcn/ui

## Chạy local

```sh
npm install
cp .env.example .env   # điền VITE_SUPABASE_PUBLISHABLE_KEY (anon key của project)
npm run dev
```

Lệnh khác: `npm run test` (vitest), `npm run build`, `npm run lint`.

## Deploy & database

- Vercel build bằng `npm run build`; `vercel.json` rewrite mọi route về
  `index.html` cho SPA. Nhớ khai báo các biến `VITE_SUPABASE_*` trong
  Environment Variables của Vercel.
- Migration nằm ở `supabase/migrations/` — áp thủ công vào project Supabase
  (SQL Editor hoặc `supabase db push`), Vercel không tự áp.
  Các migration đến `20260705170000_ai_mode_templates.sql` **đã được áp** vào
  project `whlysprzsguehxmrjwha` (05/07/2026), kèm regenerate
  `src/integrations/supabase/types.ts`.
- Edge function `send-hr-notification` **đã deploy**; `ai-advisor` **đã deploy
  lại bản mới nhất (v9, 15/07/2026)** — provider registry + bỏ tiền tố model +
  đo token/chi phí. Hai migration `20260706130000_ai_provider_flexible.sql` và
  `20260706140000_ai_cost_management.sql` **đã áp** vào project (15/07/2026).
- **Nhà cung cấp AI linh hoạt (07/2026):** ngoài Lovable/Gemini/OpenAI còn có
  **DeepSeek** và Gateway tùy chỉnh (OpenAI-compatible — OpenRouter, Groq...).
  Thêm provider mới = 1 entry `PROVIDER_PRESETS` trong
  `supabase/functions/ai-advisor/index.ts` + 1 entry `PROVIDER_OPTIONS` trong
  `src/pages/AIPromptsAdmin.tsx`. Cần áp migration
  `20260706130000_ai_provider_flexible.sql` (nới CHECK `ai_settings.provider`)
  và deploy lại `ai-advisor` trước khi chuyển sang DeepSeek.
- **Quản trị chi phí AI (07/2026):** đo token thực (đọc `usage` từ provider, có
  tee stream cho chat), bảng giá model `ai_model_pricing`, ngân sách tháng trong
  `ai_settings` (`monthly_budget`/`budget_enforce`), dashboard token+tiền trong
  màn hình Quản trị AI (component `AICostPanel`, RPC `get_ai_usage_summary`).
  Cần áp migration `20260706140000_ai_cost_management.sql` và deploy lại
  `ai-advisor`. **Giá seed chỉ là tham khảo — admin phải cập nhật theo bảng giá
  chính thức của nhà cung cấp** (đơn vị mặc định USD, chỉnh ở ô "Đơn vị tiền").

Tài liệu thiết kế gamification mục skill: `docs/nghien-cuu-gamification-muc-anh-skill.md`.

Quy trình vận hành Kanban "Hành động phát triển" & kế hoạch hành động quý:
`docs/nghien-cuu-quy-trinh-van-hanh-kanban-2026-07.md`.

## Cổng BHY one (07/2026)

Website "BHY one" (bachungyen20, trước chạy Google AI Studio + Firebase) đã được
gộp vào app này thành cổng thông tin thương hiệu sau đăng nhập:

- **Trang:** `/one` (trang chủ + cây văn hóa 20 năm), `/one/dac-trung` (6 đặc trưng
  riêng có — Quizzi là card dẫn sang `/quizzi` thật), `/one/chieu-thuc` (Bộ 3 chiêu
  thức + 38 skill + Sao Xứng Đáng 2026), `/one/khung-hinh`, `/one/kho-du-lieu`.
  Nhóm sidebar "BHY one"; dải `OneStripCard` trên Tổng quan. Code: `src/pages/one/`,
  `src/components/one/`, `src/data/one/`.
- **Nội dung sửa inline:** bảng `site_content` — chỉ `tcth_admin`/`system_admin`
  thấy nút sửa (EditableText), fallback `src/data/one/siteContent.ts`.
- **Kho Dữ Liệu:** bảng `portal_uploads` + `portal_upload_likes` (mỗi người 1 like,
  cộng dồn `seed_likes` mang từ Firebase), ảnh trong bucket **private** `bhy-one`
  (render qua signed URL — helper `src/lib/oneStorage.ts`). Gallery trụ cột/chiêu
  thức: bảng `portal_images` (slot `pillar.*`/`move.*`), admin đổi ảnh tại chỗ.
- Migration `20260803090000_bhy_one_content_and_uploads.sql` **đã áp** vào project
  `whlysprzsguehxmrjwha` (29/07/2026), kèm seed 21 key nội dung + import 10 tư liệu
  thật từ Firebase (xem `scripts/import-bhy-one/README.md`; còn bước
  `upload-images.mjs` bổ sung 8 ảnh base64 cần service role key).
- **Khách đối tác (guest, 07/2026):** role `guest` + bảng `guest_access`
  (hạn theo ngày). Guest đăng nhập rơi vào `/one`, chỉ thấy nhóm sidebar BHY one,
  ngoài allowlist `/one`, `/one/*`, `/doi-mat-khau` bị `GuestGate` đưa về `/one`
  (`src/components/AdminRoute.tsx`). **RLS là hàng rào thật**: helper
  `is_guest()`/`guest_active()`/`is_staff()`; toàn bộ policy `USING (true)`
  cũ (28 bảng danh mục) đã siết về `is_staff()` — guest query PostgREST trả 0
  dòng (đã kiểm chứng bằng mô phỏng JWT); guest chỉ đọc `site_content`,
  `portal_images`, và `portal_uploads` có `is_shared_with_guests` (ảnh path
  `shared/…`). Admin: trang `/quan-tri-khach` (tạo/gia hạn/thu hồi — edge
  function `create-guest-user` **đã deploy**), nút "Chia sẻ đối tác" trên từng
  bài Kho Dữ Liệu (tự sao chép ảnh sang `shared/…`). Migrations
  `20260803100000` + `20260803110000` **đã áp** (29/07/2026). Hết hạn: client
  đăng xuất + RLS chặn (không cần cron).

## Kỳ Quý II/2026 — BM02 đánh giá lại từ đầu (07/2026)

- Quý I/2026 thực hiện BM01 trên **bản Word/PDF** (không nhập app). Các kế hoạch
  hành động Quý I được trích xuất và nhập lại vào database (cycle "Quý I/2026",
  phiếu có marker `[IMPORT-BM01-Q1]` trong `manager_comment`) — xem
  `scripts/import-bm01-q1/README.md`.
- BM02 đặt `autoCarryOver: false` (`src/pages/BM02Page.tsx`): KHÔNG tự kéo kế
  hoạch/level từ kỳ trước — cán bộ đánh giá lại toàn bộ 38 skill (Mục B) và
  nhóm thái độ (Mục C) từ đầu. Hành động Quý I hiển thị ở mục "Rà soát hành
  động kỳ trước" để PDCA và chuyển tay hành động chưa hoàn thành sang Quý III.
  BM03 giữ nguyên auto carry-over.

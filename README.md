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

- **Production:** https://343skill.com — deploy qua **Vercel** (domain mua qua Lovable)
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
- Edge function `send-hr-notification` **đã deploy**; `ai-advisor` trên server
  là bản cũ nhưng 3 mode mới chạy qua template trong `ai_prompts.content`
  (fallback code trong repo sẽ có hiệu lực ở lần deploy function kế tiếp).
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

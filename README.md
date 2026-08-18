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
  `whlysprzsguehxmrjwha` (29/07/2026). **Dữ liệu BHY one cũ đã chuyển xong toàn bộ**:
  21 mục nội dung, 10 bài tư liệu, 13 ảnh trong bucket (xem
  `scripts/import-bhy-one/README.md`).
- **Khách đối tác (guest, 07/2026):** role `guest` + bảng `guest_access`
  (hạn theo ngày). Guest đăng nhập rơi vào `/one`; ngoài các màn hình được mở cho
  chính tài khoản đó (và `/doi-mat-khau`) đều bị `GuestGate` đưa về `/one`
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
- **Cấp tài khoản khách KHÔNG cần email (08/2026):** màn `/quan-tri-khach` chỉ hỏi
  **tên công ty / tên người dùng** + hạn truy cập rồi cấp ngay (tên đăng nhập tự suy
  ra từ tên, sửa tay được);
  Supabase Auth vẫn cần một email nên hệ thống ghép email nội bộ
  `<user>@khach.343skill.com` (`src/lib/taiKhoanKhach.ts`, bản máy chủ
  `supabase/functions/_shared/guestLogin.ts` — hai bản phải giữ y hệt). Ô đăng nhập
  (`src/pages/Login.tsx`) nhận chuỗi không có `@` và tự ghép miền, nên đã đổi khỏi
  `type="email"`. Địa chỉ nội bộ không có hòm thư thật ⇒ khách **không** tự đặt lại
  mật khẩu qua email: nút «Mật khẩu» ở bảng danh sách gọi `create-guest-user` với
  `reset_password: true` để cấp lại mật khẩu tạm. Tài khoản khách cấp trước đợt này
  (email thật) vẫn dùng và gia hạn bình thường. **Đã áp lên project
  `whlysprzsguehxmrjwha` ngày 18/08/2026**: migration `man_hinh_mo_cho_khach` +
  `create-guest-user` phiên bản 3. Bài học vận hành: màn hình lên bản mới mà edge
  function còn bản cũ thì lỗi trả về là "Email không hợp lệ" trên một màn hình
  không có ô email nào — `dienGiaiLoiKhach()` (`src/lib/invokeError.ts`) nay dịch
  lỗi ấy thành đúng việc phải làm.
- **Màn hình mở cho khách chọn theo từng tài khoản (08/2026):** cột
  `guest_access.allowed_screens` (migration `20260927090000_man_hinh_mo_cho_khach.sql`)
  giữ mã các màn hình đối tác được vào; danh mục 9 màn hình nằm ở
  `src/lib/manHinhKhach.ts` (bản máy chủ: `supabase/functions/_shared/guestScreens.ts`,
  ràng buộc `CHECK` của bảng). Phòng TCTH tự tick ở `/quan-tri-khach` — cả khi cấp
  mới lẫn sửa cho khách đang có; trước đây danh sách này đóng cứng trong cây điều
  hướng nên mở thêm một màn cho một đối tác là mở cho **mọi** khách và phải phát
  hành bản mới. Mặc định giữ nguyên bộ cũ (Trang chủ · Tin tức · Sharing ·
  Connect); Trang chủ là cửa vào nên không tắt được. Cùng một danh sách chi phối
  `GuestGate`, cây menu (`guestScreen` trên mục lá) và dải thẻ BHY Ways ở Trang chủ.
  Riêng Cây Ký Ức còn cần RLS: helper `guest_screen_allowed()` mở
  `ky_yeu_an_pham` + bucket `ky-yeu` đúng cho khách được bật màn này.

## Góp ý cải thiện hệ thống BHY One (08/2026)

Nút «Góp ý» (biểu tượng bong bóng thoại) trên thanh điều hướng — hiện ở **mọi
trang** cho mọi cán bộ: form tick chọn menu/tính năng liên quan (mục của trang
đang mở được tick sẵn, danh sách tick lấy từ cây điều hướng đã lọc theo quyền)
+ nội dung tự do; bên dưới là góp ý đã gửi của chính mình kèm trạng thái.
Người tiếp nhận: **Phòng TCTH (tcth_admin) + Giám đốc Chi nhánh (bgd)** — trang
`/gop-y-he-thong` (menu Quản trị chung → Nội dung cổng) tích «Đã xem xét» /
«Đã xử lý» từng góp ý và **tải Excel** (2 sheet: danh sách + tổng quan).
Code: `src/components/one/feedback/`, `src/pages/GopYAdminPage.tsx`.
Bảng `portal_gop_y` — người gửi chỉ thấy góp ý của mình, người duyệt thấy tất
cả; đổi trạng thái qua RPC `gop_y_cap_nhat_trang_thai` (không có policy UPDATE
để người duyệt không sửa được lời người gửi). Migration
`20260827090000_gop_y_bhy_one.sql` **đã áp** vào project `whlysprzsguehxmrjwha`
(05/08/2026), kèm cập nhật `types.ts`.

## Chiêu thức 2 — Kanban 5W2H + PDCA (08/2026)

Trang `/one/chieu-thuc-2` được dựng lại theo đặc tả đầy đủ
(`docs/dac-ta-chieu-thuc-2-kanban-5w2h-pdca.md`): đầu việc 5W2H có duy nhất
01 người chịu trách nhiệm, Kanban 7 cột với cổng chặn PDCA (P trước Đang làm,
C + 100% trước Hoàn thành, A trước Đã đóng), nhật ký nhịp append-only, chấm
giờ nhịp sáng 8h00/8h30 tại database, M1 «Việc của tôi» + Ghi nhịp nhanh,
M2 «Bảng của Phòng» + bảng nhịp theo người.
**Nhập theo hai cổng** (08/2026): ghi việc chỉ 3 trường (việc gì · ai làm · xong
khi nào), 5W2H hỏi ở Cổng 2 lúc bấm «Bắt đầu làm» — nghiên cứu người dùng và
căn cứ thiết kế: `docs/nghien-cuu-cach-nhap-kanban-cho-can-bo-2026-08.md`. Bản
`action_plans` tối giản cũ ngừng dùng trên UI. Migration
`20260806090000_ct2_kanban_5w2h_pdca.sql` **đã áp** vào project
`whlysprzsguehxmrjwha` (01/08/2026) — kèm migration bổ trợ
`ct2_prerequisite_helpers` (3 hàm `is_dept_manager`,
`can_view_all_action_plans`, `is_my_scope_department`) vì các migration
quizzi/action_plans trong repo **chưa từng được áp** vào database này.
Chi tiết triển khai + thiết kế chịu tải 150 người dùng khung 7h50–8h30:
`docs/trien-khai-chieu-thuc-2-kanban-2026-08.md`.

**Hiển thị (08/2026):** khối «Nhịp sáng nay» của Chiêu thức 2 nằm ngay đầu
trang chủ ONE (`Ct2HomeStrip`) kèm dải ảnh đại diện cả phòng — vòng xanh/vàng/
xám cho biết ai đã ghi nhịp, thay cho «thấy đồng nghiệp online» của Miro. Bảng
của Phòng có chế độ **«Toàn cảnh»** (mặc định trên điện thoại): mỗi thẻ là một ô
màu, cả bảng lọt một màn hình 5 inch. Tự làm tươi 30s/lần chỉ trong khung
6h45–8h45 ngày làm việc (`trongKhungNhip`), ngoài khung tắt hẳn.

**Điều hành của Ban Giám đốc (08/2026):** khối `Ct2DieuHanhBgd` trên trang chủ
gộp ba tầng cho BGĐ/PGĐ — (1) việc đang chờ chính mình kèm tuổi chờ, gộp cả đầu
việc Chiêu thức 2 lẫn hồ sơ tín dụng đang trình (phần đặc tả §7.4 yêu cầu mà
trước đây thiếu hoàn toàn); (2) nhịp hôm nay của các phòng phụ trách; (3) dấu ấn
Bắc Hưng Yên Mark tuần này. **Không thêm nhịp mới** — dấu ấn vốn đã dùng chung
nhịp tuần Kanban; chỉ đổi câu hỏi tuần thành «tuần này có thêm bằng chứng gì?»,
mỗi tuần bồi một mẩu vào STAR (bảng `ct2_bang_chung_dau_an`, append-only) để
cuối kỳ STAR tự đầy. Tư vấn + thiết kế:
`docs/nhip-dieu-hanh-ban-giam-doc-2026-08.md`. Migration
`20260810090000_ct2_dieu_hanh_bgd.sql` **đã áp**.

**Kanban Phê duyệt tín dụng (PDTD)** — bàn thứ hai, tab riêng chỉ hiện với phòng
có trong `ct2_phong_pdtd` (đã bật: KHDN, Bán lẻ, HTTD). Đơn vị theo dõi là hồ sơ
tín dụng của một khách hàng: 7 cột theo quy trình phê duyệt, số tiền là numeric
nên cộng được tổng dư nợ đang trình, «đến hạn GHTD» là trường ngày (không phải
cột trạng thái) nên cảnh báo được khách sắp hết hạn mức mà chưa mở hồ sơ tái
cấp, ngưỡng chờ riêng cho từng cấp trình (LĐP 2 ngày · LĐCN 3 · TSC 5).
Thiết kế rút từ board Miro thật của Phòng KHDN (47 hồ sơ) — phân tích 6 lỗi dữ
liệu và cách khắc phục: `docs/kanban-phe-duyet-tin-dung-2026-08.md`. Migration
`20260808090000_ct2_kanban_phe_duyet_tin_dung.sql` **đã áp**.

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

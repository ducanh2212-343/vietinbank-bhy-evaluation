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

- **Production:** https://bachungyenone.com (domain Cloudflare, 08/2026) — app chạy trên
  **Cloudflare Worker** `343-noi-bo` (đường dự phòng: https://343-noi-bo.ducanh2212.workers.dev).
  Domain cũ `chieuthuc3.com` giữ lại trỏ về cùng Worker trong giai đoạn chuyển tiếp;
  `343skill.com` đã ngừng. Hướng dẫn chuyển domain từng bước:
  `docs/chuyen-domain-bachungyenone-2026-08.md` (lịch sử lần trước: mục "Chuyển domain"
  trong `docs/quan-tri-email-2026-07.md`).
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

- **Sao Xứng Đáng — sổ sao theo số serial (08–09/2026):** tặng sao ngay trên cổng,
  số serial chọn từ pool đã bàn giao và bị khóa trong giao dịch (RPC `award_star`)
  nên không trùng được; Phòng TCTH khai báo lô in, bàn giao dải số theo quý, quản
  danh mục tổ / tập thể nhỏ ở `/one/ghi-nhan`. **Đã áp lên project
  `whlysprzsguehxmrjwha`**: `20260829043218_star_serial_registry_and_award_rpcs`,
  `20260829043235_seed_star_serials_from_records`,
  `20260829120000_star_rpcs_thu_hoi_quyen_anon_va_khoa_search_path`,
  `20260829130000_phong_yen_my_doi_ten_pgd_ocean_city` (29/08) và
  `20260904090000_tap_the_nho_va_ban_giam_doc` (04/09). Đường nhập Excel cũ đang
  khóa (`starImportLock.ts`); bài học: bản khóa nằm trên nhánh chưa merge thì
  production vẫn nhập đè được — bảng phiếu đã bị ghi đè hai lần trong tháng 8.
  Đối chiếu văn bản và quyết định thiết kế:
  `docs/doi-chieu-van-ban-va-tinh-nang-sao-2026-08.md`.

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

**Đính kèm ảnh chụp lỗi (08/2026)** — hai cán bộ cùng đề nghị ngay trong hòm
góp ý ("tải ảnh báo lỗi để Admin nhìn cho rõ"). Tối đa 3 ảnh/phiếu, **nén tại
máy người dùng** trước khi tải lên (1600px / JPEG 0.75 — rộng hơn mức 800px của
Kho Dữ Liệu vì ảnh chụp màn hình phải đọc được chữ trong bảng Kanban); ảnh gốc
> 10MB bị chặn ngay tại client. Ước lượng tải: ~11 MB/tháng, tức 0,16% hạn mức
Storage của gói Pro sau một năm — không đáng kể.

Ảnh nằm ở bucket **riêng** `bhy-gop-y` (private, trần 3MB/file, chỉ nhận
jpeg/png/webp) chứ KHÔNG dùng chung `bhy-one`: policy đọc của `bhy-one` là
`is_staff()` cho mọi object, trong khi ảnh chụp lỗi Kanban PDTD chứa tên khách
hàng và hạn mức tín dụng. Đường dẫn `<user_id>/<uuid>.jpg` nên thư mục cấp 1 là
chủ ảnh — policy chỉ cho **người gửi + người duyệt** đọc/xoá. Xoá góp ý thì xoá
luôn ảnh (Storage không cascade theo dòng bảng). Helper:
`src/components/one/feedback/anhGopY.ts`. Migration
`20260929090000_gop_y_dinh_kem_anh.sql` **đã áp** (20/08/2026) — nhân tiện đặt
trần 10MB cho bucket `bhy-one` vốn đang để không giới hạn.

- **BHY Ideas — sổ ghi nhận Bén rễ (08–09/2026):** migration `20260924090000` (chấm điểm
  Hội đồng), `20260926090000` (sổ ghi nhận, khoán gọn), `20260928090000_bhy_ideas_danh_gia_ben_re`,
  `20260930090000_bhy_ideas_tam_dung_kpi_va_nhom_linh_vuc`, `20261002090000_bhy_ideas_sua_nguon_cong_nhan_ben_re`,
  `20261003090000_bhy_ideas_ung_vien_kem_cap_de_xuat` **đã áp** (27/08/2026), và
  `20261004090000_bhy_ideas_thu_hoi_quyet_dinh_va_hien_demo` **đã áp** (03/09/2026) — thu hồi
  quyết định Bén rễ, đảo ngược đường TSC, sửa điểm 0 giả; `20261005090000_bhy_ideas_tra_ve_bo_sung_va_so_ben_re`
  **đã áp** (03/09/2026) — trả về bổ sung, gửi lại, sổ Bén rễ. Tin đẩy `IDEA_TRA_VE` đi qua hàng đợi
  `ct2_thong_bao`; đường dẫn mở tin thêm ở cả `src/lib/ct2.ts` lẫn `supabase/functions/notify-ct2` —
  `20261006090000_bhy_ideas_ket_luan_tcth_va_bao_chu_y_tuong` **đã áp** (03/09/2026) — kết luận
  TCTH (nuôi dưỡng / dừng), báo chủ ý tưởng ở mọi bước qua mã `IDEA_TIEN_TRINH` (mức NHE/KHEN) và
  `IDEA_TRA_VE` (mức DO), hàm sổ đầy đủ để kết xuất; `20261007090000_bhy_ideas_so_ben_re_kem_noi_dung` **đã áp** (03/09/2026) —
  sổ Bén rễ trả kèm nội dung ý tưởng để thao tác tại chỗ; `20261023090000_bhy_ideas_hd_phien_trinh_bay`
  **đã áp** (11/09/2026) — phiên trình bày trong đợt chấm Hội đồng (bảng `portal_idea_council_sessions`,
  hai cột `phien_id`/`thu_tu` trên `portal_idea_council_items`, hàm `bhy_ideas_hd_mo_phien` /
  `bhy_ideas_hd_dong_phien`). Đợt «Tháng 6,7,8» đang chấm dở lúc áp nên migration này **chỉ cộng thêm**:
  không sửa, không xóa dòng nào; phiếu chấm, điểm tổng hợp và quorum giữ nguyên. `notify-ct2`
  **đã deploy lại** (04/09/2026, bản 16). Tên file mang số thứ tự tăng dần
  chứ không phải ngày lịch (chuỗi Ideas đã vượt quá ngày thật từ 08/2026); mỗi file đều có
  bản gỡ ở `supabase/rollbacks/`.

**Bản tin sáng báo góp ý mới (08/2026)** — trước đó ba người tiếp nhận chỉ biết
có góp ý khi tự mở trang, nên có phiếu nằm «Mới gửi» nhiều ngày. Nay cron
`gop-y-ban-tin-sang` chạy **9h10 thứ 2–6** (`10 2 * * 1-5` giờ UTC) gọi
`gop_y_ban_tin_sang()`: gộp mọi phiếu `bao_luc IS NULL` thành MỘT tin, đặt vào
hàng đợi `ct2_thong_bao` mã `GOP_Y` cho đúng nhóm `la_nguoi_duyet_gop_y`, rồi
đóng dấu `bao_luc`. Chuông trong app là nguồn sự thật, push chỉ là kênh phát.

Chốt 9h (không phải 7h00 như tin hoãn khác) là yêu cầu nghiệp vụ: chờ cán bộ
nhập xong đầu giờ sáng. Ngày nghỉ thì **bỏ qua hẳn** thay vì dùng
`ct2_moc_phat_gan_nhat()` — hàm đó đẩy tin về 7h00, sớm hơn mốc đã chốt.
Thân tin **cắt cứng 3 dòng** + «… và N phiếu khác» nên không bao giờ dài: chạy
thử trên 14 phiếu dồn lại chỉ 271 ký tự. Chèn thẳng vào hàng đợi (không qua
`ct2_dat_thong_bao`) theo lối của tin `PHIEN_BAN` — bản tin ngày một lần không
được rơi vào trần 3 tin NHE/người/ngày.

Mã `GOP_Y` phải có nhánh đường dẫn ở **cả hai bản**: `duongDanThongBao()`
(`src/lib/ct2.ts`) và `duongDan()` (`supabase/functions/notify-ct2/index.ts`) —
thiếu là bấm vào tin rơi về Kanban. Migration
`20260930090000_gop_y_ban_tin_sang.sql` **đã áp** (21/08/2026, có backfill
`bao_luc` cho 14 phiếu cũ để sáng hôm sau không dội một bản tin 14 phiếu);
`notify-ct2` **đã deploy lại (v14)** — bản này mang theo cả nhánh `PHIEN_BAN`
vốn đang chờ deploy, vô hại vì migration lịch sử phiên bản chưa áp nên chưa có
tin `PHIEN_BAN` nào phát sinh.

## Rà soát bảo mật & chống bot đăng nhập (24/08/2026)

Báo cáo đầy đủ, viết cho người không chuyên: `docs/kiem-tra-bao-mat-toan-dien-2026-08.md`.

**Đã áp vào project `whlysprzsguehxmrjwha` ngày 24/08/2026:**

- `20261001090000_va_chot_chan_viet_nguoc_va_thu_hoi_quyen_anon.sql` **đã áp**.
  Bốn hàm SECURITY DEFINER dùng chung một chốt chặn VIẾT NGƯỢC
  (`IF auth.uid() IS NOT NULL AND NOT (là_quản_trị)`) — với khách vãng lai thì
  `auth.uid()` là NULL nên cả điều kiện sai và **không ai bị chặn**. Ba trong bốn
  hàm còn quyền `anon` (`ct2_khen_chuoi_moc` mở tới tận PUBLIC), tức là chỉ cần
  anon key vốn nằm sẵn trong mã trang là gọi được: lấy **họ tên cán bộ**, lấy
  **tiêu đề đầu việc đang nợ**, ghi `ct2_thong_bao` và **bắn push giả**.
  Vá hai lớp: thu hồi quyền (hàng rào cứng) + đổi chiều chốt chặn qua hàm phụ
  `ct2_can_kiem_quyen()`. Đã kiểm sau khi áp: người lạ nhận `permission denied`,
  đường cron (không có JWT) chạy khô vẫn thoát bình thường.
- `20261001090100_bit_view_bo_qua_rls_va_gioi_han_kho_anh.sql` **đã áp**.
  Hai view `ct2_suc_khoe_kho_cau` / `ct2_hieu_qua_theo_nhom` chạy bằng quyền chủ
  view nên đọc xuyên RLS — người lạ đọc được 11 và 7 dòng; nay cắt hẳn quyền
  (không màn hình nào dùng nên không đổi hành vi). Kho `avatars` và
  `skill-images` được đặt trần 5 MB + danh sách định dạng ảnh, **có giữ
  heic/heif** cho ảnh iPhone.

- `20261001090200_khoi_phuc_thu_hoi_quyen_public_bi_dat_lai.sql` **đã áp**.
  Đợt vá 15/08 (`20260815090000`) từng thu hồi quyền người lạ trên
  `suggest_skill_mentors` và `get_campaign_progress`, nhưng quyền **đã quay lại**:
  `CREATE OR REPLACE` giữ quyền, còn `DROP` + `CREATE` thì đặt lại về mặc định
  PUBLIC — một migration sau đó tạo lại hàm theo cách thứ hai là đủ lặng lẽ mở
  cửa mà diff không thấy gì. **Quy ước từ nay: hễ DROP rồi CREATE lại một hàm
  SECURITY DEFINER thì viết lại cặp REVOKE/GRANT ngay dưới nó trong cùng
  migration.** Đã kiểm sau khi áp: người lạ nhận `permission denied`, cán bộ đã
  đăng nhập vẫn gọi được cả ba hàm.

**Đối chiếu khách quan bằng Supabase advisors:** lỗi mức ERROR **2 → 0**, tổng
cảnh báo 142 → 133, số hàm người lạ chạy được 34 → 25.

**Edge function:** `doi-mat-khau` **đã deploy (v1, verify_jwt = true)**. Đây là
nơi DUY NHẤT hạ được cờ `must_change_password` ở `app_metadata`, và nó chỉ hạ khi
đã thực sự đặt mật khẩu mới — trước đây cờ nằm ở `user_metadata` nên người cầm
mật khẩu tạm tự gỡ được bằng một câu lệnh trong console. Deploy hàm này TRƯỚC là
cố ý: các hàm cấp tài khoản (đặt cờ) deploy sau lúc nào cũng an toàn.

### Trạng thái deploy edge function (cập nhật 24/08/2026)

**Đã deploy và đã kiểm chứng** (mỗi hàm gọi thử bằng service_role qua `pg_net`, phải
trả về đúng nhánh lỗi của chính mã ta viết chứ không phải lỗi boot 500):

| Hàm | Bản | Kết quả gọi thử |
| --- | --- | --- |
| `doi-mat-khau` | v1 | ACTIVE (hàm mới) |
| `approve-registration` | v12 | 400 `{"error":"Unauthorized"}` |
| `create-guest-user` | v10 | 401 `{"error":"Phiên đăng nhập không hợp lệ"}` |
| `create-staff-user` | v20 | 401 — kèm đối chiếu đọc ngược toàn bộ tệp, khớp từng ký tự |
| `bulk-create-staff-users` | v20 | 401 |
| `reset-staff-password` | v17 | 401 |

Sau đợt này, cờ `must_change_password` mới thực sự được ghi vào `app_metadata` cho
**tài khoản cấp MỚI**. Tài khoản cũ (107 tài khoản) vẫn chỉ có cờ ở `user_metadata` —
không hồi quy, vì `useAuth` đọc cả hai nơi; chỉ là chúng vẫn còn đường tự gỡ cờ cho tới
khi được cấp lại mật khẩu.

**CHƯA deploy, có lý do:**

- `ai-advisor` — tệp 57 KB, là hàm AI cán bộ đang dùng thật. Lợi ích của bản mới chỉ là
  hiển thị 4 số cuối khóa API và tránh ghi dòng rác vào `ai_usage_log`; không phải vá
  bảo mật. Chép tay 57 KB qua kênh công cụ để deploy một hàm đang chạy là đánh đổi sai.
  Deploy bằng CLI: `supabase functions deploy ai-advisor --project-ref whlysprzsguehxmrjwha`
- `send-transactional-email` — **phát hiện trong lúc deploy: hàm này CHƯA TỪNG được
  deploy** (`get_edge_function` trả về *Function not found*). Nghĩa là thư duyệt/từ chối
  đăng ký lâu nay âm thầm không gửi được — `approve-registration` gọi nó trong `try/catch`
  nên không ai thấy lỗi. Chưa deploy vì làm vậy là **bật một đường gửi email đang tắt**,
  đó là quyết định nghiệp vụ chứ không phải kỹ thuật. Lưu ý: vì hàm không tồn tại nên
  hiện KHÔNG có rủi ro gửi thư tới địa chỉ tuỳ ý; bản trong repo đã siết sẵn cho ngày
  bật lên.

**Chờ phát hành (chưa deploy):** các hàm còn lại đã sửa trong nhánh —
`send-transactional-email` (không còn gửi tới địa chỉ tuỳ ý), `ai-advisor`
(thêm mode `trang_thai_khoa`), `reset-staff-password`, `approve-registration`,
`create-guest-user`, `_shared/staff.ts`.

**THỨ TỰ DEPLOY — đọc trước khi phát hành:**

1. `doi-mat-khau` **đã deploy sẵn**, nên các hàm cấp tài khoản
   (`create-staff-user` qua `_shared/staff.ts`, `reset-staff-password`,
   `approve-registration`, `create-guest-user`) deploy lúc nào cũng an toàn: cờ
   `must_change_password` ở `app_metadata` luôn có nơi hạ xuống.
2. **`ai-advisor` phải deploy CÙNG hoặc TRƯỚC bản web mới.** Trang quản lý prompt
   gọi mode mới `trang_thai_khoa`; bản `ai-advisor` cũ không biết mode này sẽ đi
   tiếp tới khối đếm lượt và **ghi một dòng rác vào `ai_usage_log`** mỗi lần mở
   trang. Không hỏng tính năng (client bắt lỗi, chỉ mất dòng hiện 4 số cuối)
   nhưng làm bẩn số liệu chi phí AI.
3. `send-transactional-email` deploy kèm là đủ; `approve-registration` vẫn gọi
   nó bằng tham số cũ (`recipientEmail`) và đường tương thích đã giữ cho cả thư
   duyệt lẫn thư từ chối chạy được.

**Turnstile site key đã điền sẵn** trong `src/lib/turnstile.ts`
(`SITE_KEY_DU_PHONG`, đã kiểm là có mặt trong bundle sau `npm run build`). Site key
là khoá CÔNG KHAI — nó nằm trong HTML mà ai xem nguồn trang cũng đọc được — nên để
thẳng trong mã đúng khuôn anon key. Thứ phải giữ kín là secret key và nó chỉ nằm ở
Supabase. Vẫn có thể ghi đè bằng biến môi trường `VITE_TURNSTILE_SITE_KEY`.

**SỰ CỐ 24/08 — GHI LẠI ĐỂ KHÔNG LẶP:** bật kiểm captcha ở Supabase Auth TRƯỚC khi
bản web biết gửi token đã làm **toàn bộ cán bộ không đăng nhập được**
(`captcha protection: request disallowed (no captcha_token found)`). Công tắc đó có
hiệu lực NGAY, không chờ deploy. Trình tự đúng luôn là: **deploy web trước → thử
đăng nhập → rồi mới bật captcha**. Gửi token khi captcha đang tắt là vô hại (máy chủ
bỏ qua), nên bật/tắt lúc nào cũng có đường lùi trong một phút.

**Việc phải làm tay trên Supabase (sau khi deploy):** bật lại *Enable Captcha
protection*, bật MFA cho nhóm quản trị, bật *Leaked password protection*, tắt tự
đăng ký.

## Lịch sử phiên bản & báo tính năng mới (08/2026)

Trang **«Có gì mới»** (`/co-gi-moi`, mục đầu tiên của Trang chủ) — mở cho **mọi
cán bộ**, không phải chỉ quản trị như màn Cài đặt trước đây. Nút hình tia sáng
cạnh chuông thông báo mang chấm đỏ khi có mục chưa đọc; sau đợt cập nhật đáng kể
có một hộp giới thiệu ngắn hiện đúng một lần.

**Nguồn sự thật là mã nguồn, mỗi lần cập nhật một FILE**:
`src/data/changelog/<YYYY-MM-DD>-<slug>.ts`. Thêm mục = thêm file, không sửa file
nào đang có ⇒ hai nhánh `claude/*` chạy song song không bao giờ xung đột ở đây —
đây chính là thứ đã làm bản cũ đứng yên từ 05/07 tới 18/08/2026 (mảng
`VERSION_HISTORY` chèn ở đầu file, xung đột thì mục của một bên biến mất im lặng).

```sh
npm run phien-ban -- ten-ngan-khong-dau --loai=tinh-nang --phan-he=chieu-thuc-2
```

- **Số phiên bản do hệ thống tự tính** (`src/lib/lichSuPhienBan.ts`) từ trường
  `loai` của từng mục, xếp theo `(ngày, mã)`: `lon` → X, `tinh-nang` → Y,
  `sua-loi` → Z. Người viết KHÔNG đặt tay số phiên bản — nếu đặt tay thì hai
  phiên làm việc song song sẽ cùng chọn một số rồi phải sửa lúc gộp nhánh.
  Chín mục trước 07/2026 giữ số cũ bằng `phienBanCoDinh` trong file lưu trữ.
- **PR nào đổi thứ cán bộ nhìn thấy hoặc thao tác thì phải kèm một file
  changelog** (kể cả PR sửa lỗi — ghi `sua-loi`). Đổi tài liệu / test / cấu hình
  build thì không cần.
- **Ba lớp giữ cho quy ước không rơi giữa các phiên làm việc**: `CLAUDE.md` ở
  gốc repo (Claude Code đọc mỗi phiên) → `.github/pull_request_template.md`
  (ô tick) → `.github/workflows/kiem-tra.yml` chạy `scripts/kiem-tra-changelog.mjs`
  (PR đổi `src/**` · `supabase/functions|migrations/**` · `public/**` ·
  `index.html` mà không thêm file changelog nào thì **đỏ**; cửa thoát cho PR
  thuần kỹ thuật: ghi `[khong-can-changelog]` vào commit message).
  Tự kiểm trước khi mở PR: `npm run phien-ban:kiem-tra -- origin/main`.
- `src/lib/__tests__/lichSuPhienBan.test.ts` canh quy ước: mã trùng, mã lệch tên
  file, thiếu trường, tiêu đề quá 80 ký tự, mục mới đặt tay số phiên bản, số
  phiên bản trùng… đều làm `npm run test` đỏ.
- **Báo cho cán bộ là một NÚT BẤM, không tự động**: `/cai-dat` → «Công bố phiên
  bản cho cán bộ» gộp mọi mục chưa báo thành MỘT tin (tách riêng nhóm chỉ dành
  quản trị), xem trước tin, chọn có push hay không, hoặc «đánh dấu đã báo, không
  gửi tin» cho phần tồn đọng. Chỉ `lon`/`tinh-nang` mới báo — `sua-loi` vào lịch
  sử nhưng im lặng. Tin đi qua đúng hàng đợi `ct2_thong_bao` (mã `PHIEN_BAN`) nên
  hưởng nguyên luật im lặng ngoài giờ và bấm vào mở thẳng `/co-gi-moi`.
- Bảng `phien_ban_da_xem` (mốc đã xem theo người) + `phien_ban_cong_bo` (sổ đợt
  đã báo, khoá chính là mã mục nên bấm hai lần cũng chỉ ra một tin) — migration
  `20260928090000_lich_su_phien_ban.sql` **chưa áp** vào project
  `whlysprzsguehxmrjwha`; chưa áp thì trang vẫn chạy, mốc đã xem rơi về trình
  duyệt từng máy. `notify-ct2` **đã deploy lại v14** (21/08/2026) nên nhánh
  `PHIEN_BAN` đã có sẵn trên máy chủ — chỉ còn chờ áp migration.

Nghiên cứu đầy đủ (có nên push mỗi khi lên tính năng mới, ba phương án đã cân,
chính sách kênh theo mức thay đổi): `docs/lich-su-phien-ban-va-bao-tin-moi-2026-08.md`.

## Bắc Hưng Yên FDI Hub (09/2026)

Cẩm nang và kho công cụ tiếp cận khách hàng FDI của Phòng KHDN – Tổ FDI (bản
«FDI 343 HUB» 07/2026, trước là tệp HTML gửi tay) — thương hiệu thứ tám trong
Bắc Hưng Yên Ways, đường dẫn `/one/fdi-hub`, **một trang chín tab** ghi trên
`?tab=` (tổng quan · hành trình B1–B6 · checklist · RM Hoa ngữ & văn hóa · quà
tặng · kho công cụ · báo cáo nhanh · kịch bản · trợ lý AI). Mở cho **mọi cán
bộ**, không mở cho khách đối tác (có giá quà, liên hệ nhà cung cấp, quy trình đón
tiếp nội bộ). Nội dung là dữ liệu thuần ở `src/data/one/fdiHub.ts`; ảnh
infographic ở `public/fdi-hub/`; mã QR video eFAST sinh lúc chạy từ link. Tiến
độ hành trình, checklist, bản nháp prompt lưu trên trình duyệt (tiền tố
`fdihub:`) — không có bảng cho phần cẩm nang. Nghiên cứu và bước tiếp theo:
`docs/tich-hop-fdi-hub-vao-bhy-ways-2026-09.md`.

**Thống kê sử dụng theo phòng (10/09/2026).** Mỗi lần cán bộ mở một tab là một
dòng trong `fdi_hub_luot_xem` (ghi qua RPC `fdi_hub_ghi_luot_xem`, chống trùng
10 phút, chụp phòng tại thời điểm mở; không ai SELECT thẳng bảng). Tab «Thống
kê sử dụng» (`?tab=thong-ke`) chỉ lãnh đạo phòng / PGĐ / BGĐ / TCTH thấy, đọc
qua RPC `fdi_hub_thong_ke(_tu, _den)` — gác quyền ở SQL, trả số theo PHÒNG,
không trả tên người; Phòng giao dịch xếp nhóm riêng, phòng chưa dùng vẫn hiện.
Migration `20261022090000_fdi_hub_luot_xem.sql` **chưa áp**; file gỡ cùng tên
trong `supabase/rollbacks/`. Chưa áp thì cẩm nang vẫn chạy bình thường (hook
ghi lượt nuốt lỗi «hàm chưa có»), tab Thống kê hiện dòng nhắc chưa áp.

## Bắc Hưng Yên Training Center (09/2026)

Trung tâm NHIỀU chương trình đào tạo và rèn luyện — thương hiệu thứ bảy trong
Bắc Hưng Yên Ways (đặc tả 1.0 ngày 06/09/2026). Tầng trung tâm:
`/one/training-center` (danh mục theo bốn nhóm đối tượng, «chương trình của
tôi») và `/one/training-center/quan-tri` (Phòng TCTH tạo, nhân bản từ mẫu, xếp
thành viên, soạn ngày và đầu việc). Tầng chương trình:
`/one/training-center/chuong-trinh/:id` + `lo-trinh` · `bang-viec` · `tu-soi` ·
`lich-bgd`; một chương trình có nhiều học viên, người hướng dẫn/BGĐ chọn học
viên đang xem bằng `?hv=`. Vai đọc từ **bảng thành viên chương trình**
`ttc_thanh_vien` (học viên · người hướng dẫn · BGĐ · quản trị), không từ vai
trò đăng nhập; người tạo chương trình tự thành quản trị của nó. Danh mục mở
cho mọi cán bộ (RLS), lịch/tiến độ/điểm chỉ thành viên. Ba việc gối đầu («3
việc lựa chọn với cán bộ») nhập ở Chiêu thức 2 và hiện trên Kanban hàng ngày
của chương trình qua RPC `ttc_kanban_hoc_vien`. Tự soi và tự suy ngẫm của học
viên chỉ chính học viên đọc được — RLS, không phải giao diện. Bốn mốc thông
báo (`TTC_*`) đi qua hàng đợi `ct2_thong_bao`; hai cron
`ttc-nhac-sap-trinh-bay` (15:10) và `ttc-nhac-con-viec` (17:00). Migration
`20261008090000_bhy_training_center.sql` (nạp chương trình 10 ngày TP KHDN làm
mẫu + ba chương trình dự kiến ở trạng thái Chuẩn bị; thành viên gán theo họ
tên: Trần Đức Anh · Nguyễn Đức Thái Hoàng · Đỗ Việt Anh · Vũ Thị Thu Hà) **đã
áp** vào project `whlysprzsguehxmrjwha` (06/09/2026) qua ba đợt
`bhy_training_center_1_bang_va_rls` · `_2_kanban_thong_bao_cron` ·
`_3_seed_chuong_trinh_10_ngay` — nội dung trùng file trong repo (bản bỏ chú
thích), đã đối chiếu checksum 102 đầu việc với bản chạy thử cục bộ; 4 thành
viên gán đúng người, 2 cron đã đăng ký. Cần **deploy lại `notify-ct2`** để push
mở đúng Lộ trình. Đã chạy thử trọn migration + file gỡ trên Postgres cục bộ
(kịch bản 11 bước). Nghiên cứu tích hợp, phân quyền, phần để lại giai đoạn 3:
`docs/tich-hop-bhy-training-center-2026-09.md`.

**Phiếu giao việc bảy ô (06/09/2026):** ba việc gối đầu chuyển sang phiếu
tiếng Việt VÌ SAO · VIỆC GÌ · AI LÀM · ĐẠT CHUẨN · HẠN NỘP · ĐIỂM KIỂM · MỨC
GIAO, khoá chuẩn khi «Giao việc», nghiệm thu Đạt/Chưa đạt, thẻ ①②③ trên Kanban
đi theo trạng thái riêng của phiếu. Ban Giám đốc của chương trình sửa được nội
dung (thông tin, ngày, đầu việc) như quản trị; tạo mới, nhân bản, xếp thành
viên vẫn của TCTH. Migration `20261009090000_ttc_phieu_giao_viec_bay_o.sql`
**đã áp** vào `whlysprzsguehxmrjwha` (06/09/2026, tên
`ttc_phieu_giao_viec_bay_o`; kiểm sau áp: 13 cột mới, 2 trigger, 3 policy đổi,
0 phiếu cũ nên không phải chuyển dữ liệu). File gỡ:
`supabase/rollbacks/20261009090000_ttc_phieu_giao_viec_bay_o_down.sql`. Chi
tiết rà soát và đối chiếu nghiệm thu: mục 8 của tài liệu trên.

**Sửa lộ trình tại chỗ · nộp tệp · nhắc trước giờ (06/09/2026, đợt 3):** BGĐ và
TCTH sửa ngày/đầu việc ngay trên màn Lộ trình; mỗi đầu việc bật được «nộp tệp
đính kèm / ghi chú / đường dẫn» (bucket riêng tư `bhy-training`, chưa nộp thì
chưa tích được — trigger chặn); cấu hình «Nhắc trước giờ — báo cho ai» theo từng
lần đào tạo, cron `ttc-nhac-theo-lich` mỗi 5 phút gửi hai mã tin mới
`TTC_SAP_BAT_DAU_NGAY` / `TTC_SAP_HET_PHAN`; route `/one/training-center/lo-trinh`
(đích của push TTC_*) tự chuyển sang chương trình đang chạy. Migration
`20261010090000_ttc_lo_trinh_nop_tep_va_nhac.sql` **đã áp** vào
`whlysprzsguehxmrjwha` (06/09/2026, tên `ttc_lo_trinh_nop_tep_va_nhac`); file gỡ
cùng tên trong `supabase/rollbacks/`. Chi tiết: mục 9 của tài liệu trên.

**Điểm danh hai luồng (06/09/2026, đợt 4):** học viên bấm nút trên điện thoại
(máy chủ tính khoảng cách Haversine tới toạ độ phòng học, so bán kính) hoặc quét
tấm QR **riêng của từng ngày** do TCTH in ra (`/one/training-center/diem-danh?ma=`).
Mã gắn với một ngày, cấp lại thì mã cũ chết; tấm in xuất PNG hoặc PDF A5 kèm
châm ngôn EQ theo ngày. TCTH đặt toạ độ bằng nút «Lấy toạ độ tại đây», theo dõi
theo ngày và ghi hộ có lý do. Thêm phụ thuộc `qrcode` (nạp động, chỉ tải khi mở
tấm in). Migration `20261011090000_ttc_diem_danh.sql` **đã áp** vào
`whlysprzsguehxmrjwha` (06/09/2026, tên `ttc_diem_danh`); file gỡ cùng tên trong
`supabase/rollbacks/`. **Không thêm loại push nào.** Chi tiết: mục 10 của tài
liệu trên.

**Thẩm định định vị trước khi mở (06/09/2026, đợt 5):** mỗi lớp tự chọn luồng;
lớp mới mặc định **chỉ QR**. Mở thêm luồng định vị phải đo thử tại phòng học
(`ttc_thu_dinh_vi`) đủ **3 lần gần nhất đều trong bán kính** — trigger
`ttc_chuong_trinh_truoc_sua` chặn ở tầng dữ liệu, không chỉ làm mờ nút. Hệ thống
đề xuất bán kính = chỗ xa nhất + sai số máy báo, làm tròn lên bội 50. Danh sách
chương trình hiện luồng đang mở của từng lớp. Migration
`20261012090000_ttc_tham_dinh_dinh_vi.sql` **đã áp** vào `whlysprzsguehxmrjwha`
(06/09/2026, tên `ttc_tham_dinh_dinh_vi`); lớp 10 ngày đã tự về chỉ QR vì toạ độ
hiện tại vẫn là toạ độ tạm tính. Chi tiết: mục 11 của tài liệu trên.

**Thay toàn bộ lộ trình 10 ngày (06/09/2026, đợt 6):** lịch mười ngày được thay
bằng bản nội dung mới nhất và xếp lại vào giờ làm việc thật — sáng 08:00–11:30,
chiều 13:30 và muộn nhất 18:00 (bản cũ có ngày bắt đầu 07:30). Tổng **122 đầu
việc**, giữ nguyên `lat_cat` và `cau_hoi_tu_soi`; bốn buổi pickleball vẫn ở
18:00–19:30. Migration `20261013090000_ttc_lo_trinh_ban_moi.sql` **đã áp** vào
`whlysprzsguehxmrjwha` (06/09/2026), chia bốn lần vì file 52 KB:
`ttc_lo_trinh_ban_moi_1_ngay` · `…_2_dau_viec_1_4` · `…_3_dau_viec_5_7` ·
`…_4_dau_viec_8_10`. Trước khi xoá, nguyên trạng được chụp vào
`ttc_luu_lo_trinh_20261013` và `ttc_luu_ngay_20261013` (đã bật RLS, `REVOKE ALL
FROM anon, authenticated`); file gỡ cùng tên trong `supabase/rollbacks/` khôi
phục từ hai bảng này rồi tự xoá chúng. Chi tiết: mục 12 của tài liệu trên.

**Bỏ nhắc theo giờ, báo cả lớp khi tích hoàn thành (06/09/2026, đợt 7):** bốn
loại tin tính mốc theo `gio_bat_dau`/`gio_ket_thuc` (sắp bắt đầu ngày · sắp hết
phần · sắp trình bày · 17h còn việc) đã **gỡ hẳn** — cả ba cron `ttc-nhac*` lẫn
bốn hàm — vì giờ trong lộ trình nay chỉ là gợi ý, nhắc theo nó thì tin luôn sai
lúc. Thay bằng `TTC_HOAN_THANH`: học viên tích một đầu việc → **toàn bộ thành
viên khóa học** nhận tin kèm con số N/M của ngày. `TTC_DU_NGAY` bỏ (tin mới đã
mang N/M). Còn đúng hai mã tin TTC: `TTC_HOAN_THANH` và `TTC_CUNG_CO`. Tin còn
chờ phát được **gộp theo ngày lộ trình** để việc làm bù buổi tối không dội cả
chục tin lúc 7h00. Cấu hình `ttc_chuong_trinh.nhac` đổi khuôn thành
`{"khi_hoan_thanh":{"bat","nguoi"}}`, `nguoi` rỗng = cả lớp. Migration
`20261015090000_ttc_bao_khi_hoan_thanh.sql` **đã áp** vào `whlysprzsguehxmrjwha`
(06/09/2026, tên `ttc_bao_khi_hoan_thanh`); file gỡ cùng tên trong
`supabase/rollbacks/`. Chi tiết: mục 13 của tài liệu trên.

**Lịch ngày gom thành buổi (06/09/2026, đợt 8):** lịch một ngày còn hai mục
**Buổi sáng** và **Buổi chiều** (pickleball tách «Sau giờ làm việc») thay cho năm
mục theo loại việc; mỗi buổi ghi khung giờ khuyến nghị và tổng thời lượng, mỗi
đầu việc ghi số phút thay cho hai mốc giờ. **Không thêm cột `buoi`** — buổi suy
thẳng từ `gio_bat_dau`, thêm cột là đẻ nơi thứ hai nói cùng một chuyện. Dữ liệu
giờ giữ nguyên. Thêm `gioNgan()` cắt `HH:MM:SS` → `HH:MM`, sửa lỗi hiển thị
«08:00:00» ở lịch BGĐ, màn Quản trị, trang chủ, và hai chỗ so giờ khác dạng
(trang chủ, form sửa đầu việc). **Không có migration.** Chi tiết: mục 14 của tài
liệu trên.

**Sửa hai lỗi chặn người dùng (07/09/2026, đợt 9):** (1) học viên tích hoàn thành
thì lỗi khoá ngoại `ct2_thong_bao_dau_viec_id_fkey` làm huỷ cả lệnh ghi tiến độ —
`ct2_thong_bao.dau_viec_id` trỏ `ct2_dau_viec` của Chiêu thức 2, không phải
`ttc_dau_viec`; tin TTC nay để `NULL` ở cột đó và gộp bằng hai dòng đầu thân tin.
(2) Không tạo được mã QR (`ttc_qr_ngay` 0 dòng) — `gen_random_bytes` của pgcrypto
nằm ở schema `extensions` còn hàm khai `search_path = public`; đổi thành
`public, extensions`. Cả hai lọt lưới vì cụm cục bộ khác database thật: stub
thiếu khoá ngoại, và pgcrypto cục bộ cài vào `public`. Migration
`20261016090000_sua_tin_hoan_thanh_khoa_ngoai.sql` và
`20261017090000_sua_cap_ma_qr_pgcrypto.sql` **đã áp**; file gỡ cùng tên trong
`supabase/rollbacks/` (ghi rõ chúng khôi phục bản có lỗi). Chi tiết: mục 15 của
tài liệu trên.

**Tích được đầu việc đã nộp tệp + tin báo liệt kê việc đã xong (07/09/2026, đợt
10):** đầu việc bật `NOP_TEP` đã đính kèm tệp vẫn báo «còn thiếu tệp» — client
tích bằng upsert không gửi lại `tep`, mà Postgres chạy `BEFORE INSERT` **trước
khi** phát hiện xung đột nên trigger thấy `NEW.tep` rỗng. Nay nhánh INSERT mượn
`tep`/`ghi_chu`/`duong_dan` từ hàng đang có rồi mới kiểm; **cổng chặn không nới
lỏng** (chưa nộp gì vẫn bị chặn). Cái bẫy này áp cho **mọi trigger `BEFORE INSERT`
kiểm ràng buộc trên bảng ghi bằng upsert**. Cùng đợt: tin `TTC_HOAN_THANH` liệt kê
từng đầu việc đã xong, đánh số theo thứ tự lộ trình, trần 8 dòng. Migration
`20261018090000_sua_tich_khi_da_nop_va_liet_ke_viec.sql` **đã áp**; file gỡ cùng
tên trong `supabase/rollbacks/`. Chi tiết: mục 16 của tài liệu trên.

**Tài liệu của ngày (07/09/2026, đợt 11):** mỗi ngày học có một bộ tệp riêng do
Phòng TCTH và BGĐ phát cho học viên — cột `ttc_ngay.tai_lieu` jsonb, khối «Tài
liệu của ngày» ở đầu màn Lộ trình. **Ngược chiều với `ttc_tien_do.tep`** (bài học
viên nộp lên). **Không thêm policy nào**: `ttc_ngay` đã đúng phân quyền (đọc =
thành viên, ghi = `ttc_sua_duoc_noi_dung`), và đường dẫn
`<ct>/<user_id>/<ngay_id>/<uuid>` khớp ba policy sẵn có của kho `bhy-training`
vốn chỉ gác hai cấp thư mục đầu. Cổng chặn thật ở tầng dữ liệu, không ở kho tệp.
Trần 10 tệp/ngày chặn bằng trigger `f_ttc_ngay_truoc_ghi`. Nhân bản chương trình
**không** mang tài liệu sang (đường dẫn thuộc chương trình cũ nên đợt mới không
đọc được). Migration `20261019090000_ttc_tai_lieu_cua_ngay.sql` **đã áp**; file
gỡ cùng tên trong `supabase/rollbacks/` (chụp lại danh sách trước khi xoá cột).
Chi tiết: mục 17 của tài liệu trên.

**Tin ngắn lại + mở quyền định vị + đóng sổ lịch sử (07/09/2026, đợt 12):** tin
`TTC_HOAN_THANH` trở về **4 dòng / ≤ 168 ký tự** để màn hình khoá điện thoại hiện
đủ — bản liệt kê từng việc đúng nội dung nhưng sai phương tiện, đẩy khuất dòng
mang con số N/M; danh sách chi tiết vẫn ở màn Lộ trình. `layViTri` ném `LoiViTri`
mang mã (`TU_CHOI`/`HET_GIO`/…) để phân biệt **bị chặn quyền** với **bắt sóng
chậm**; khối `KhoiMoDinhVi` hiện các bước bật lại đúng iOS / Android / máy tính
kèm nút bấm lại tại chỗ (web không tự bật quyền hộ được — chốt an toàn của hệ
điều hành). `nenTangThietBi` xét `maxTouchPoints` vì **iPad đời mới báo userAgent
như máy Mac**. Migration `20261020090000_tin_hoan_thanh_ngan_gon.sql` **đã áp**.
Đã **đóng sổ 70 mục** lịch sử vào `phien_ban_cong_bo` với `kenh='{}'` — đánh dấu
đã báo mà **không sinh tin nào**, để nút «Công bố» sau này chỉ gửi đúng mục mới.
Chi tiết: mục 18 của tài liệu trên.

## Kênh Zalo OA & Quản trị Push (09/2026)

**Mục tiêu:** đẩy tin Sao Xứng Đáng từ cổng vào nhóm Zalo GMF «343 - Bắc Hưng Yên
One» qua Zalo Official Account «VietinBank Bắc Hưng Yên» (App ID 298836022005112891,
OA ID 3852871198450053653, gói Tăng trưởng, 100 request/phút). Zalo là kênh cả
chi nhánh đọc; push của cổng chỉ một phần cán bộ bật.

**Đợt 1 — nền kết nối + hai trang quản trị (12/09/2026):**

- Bảng `zalo_token` (một dòng, chỉ service_role — KHÔNG policy nào cho cán bộ),
  `zalo_cau_hinh` (OA ID, nhóm GMF, công tắc, gói cước — quản trị đọc/sửa),
  `zalo_nhat_ky` (mọi lần gọi Zalo). Secret Key nằm ở Vault `zalo_app_secret_key`,
  nạp từ trang Quản trị Zalo (RPC `zalo_dat_bi_mat`, chỉ system_admin).
- Edge function **`zalo-oa`** (v2, đã deploy, đã gọi thử `trang_thai` bằng
  service_role qua pg_net) — cửa duy nhất nói chuyện với Zalo: `doi_ma` (kèm
  `code_verifier` vì Zalo dùng PKCE), `nap_token` (dán refresh token lấy từ API
  Explorer — cách 2 trong tài liệu Zalo; hệ thống đổi ngay lấy cặp mới của riêng
  nó), `gia_han`, `trang_thai`, `liet_ke_nhom`, `luu_nhom`, `gui_thu`. Thư viện
  `supabase/functions/_shared/zalo.ts`. Trang Quản trị Zalo tự tạo cặp PKCE
  (verifier 43 ký tự, challenge = base64url(SHA-256)) và nhận `?code=` khi Zalo
  gọi về callback `/quan-tri-zalo`.
- **Refresh token của Zalo chỉ dùng được MỘT lần**: mỗi lần gia hạn nhận cặp mới
  và ghi đè ngay xuống `zalo_token`; khóa mềm `zalo_giu_khoa_gia_han()` chặn hai
  lần gia hạn song song; lỗi 2 lần liên tiếp → `zalo_canh_bao_quan_tri` đẩy tin
  `ZALO_LOI` (mức DO: push + chuông + email) tới TCTH/quản trị hệ thống.
- Cron `zalo-gia-han-token` `0 */6 * * *` (đã đăng ký) — hàm chỉ gọi Zalo khi
  access token còn dưới 7 giờ; cron tự bỏ qua khi chưa có token.
- Trang **Quản trị Push** `/quan-tri-push` (RPC `push_thong_ke`, chỉ số đếm — không
  đọc nội dung/người nhận tin) và **Quản trị Zalo** `/quan-tri-zalo` (RPC
  `zalo_tong_quan`, `zalo_co_bi_mat`), cả hai trong khu Hệ thống, minRole admin.
- Migration `20261024090000_zalo_oa_ket_noi.sql` **đã áp** vào `whlysprzsguehxmrjwha`
  (12/09/2026, tên `zalo_oa_ket_noi`; kiểm sau áp: 3 bảng, 7 hàm, 1 cron). File gỡ:
  `supabase/rollbacks/20261024090000_zalo_oa_ket_noi_down.sql`.

**Đợt 3 — tab Kết nối (13/09/2026):** App ID và callback URL vào `zalo_cau_hinh`
(migration `20261027090000_zalo_app_id_va_callback.sql` **đã áp**, chỉ nạp dữ
liệu; callback mặc định `https://bachungyenone.com` — trước đó trang lấy domain
đang chạy, mở từ workers.dev là Zalo báo -14003). **Cách 3** dán đường dẫn Zalo
trả về (tự tách `code`/`oa_id`, che mã, chặn khi sai OA), nút «Mở trang cấp quyền»
dựng từ cấu hình. Lỗi OAuth dịch tiếng Việt kèm cách sửa (`dienGiaiLoiOAuth`
trong `_shared/zalo.ts`). Nhật ký ghi người thực hiện + 4 ký tự đầu của mã.
`HomeRedirect` ở `/` giữ `?code=&oa_id=` chuyển sang `/quan-tri-zalo`. Khối
«Hướng dẫn vận hành» thu gọn ở đầu tab. `zalo-oa` v3, `zalo-gui-sao` v2 (cùng
`_shared/zalo.ts`).

**Sự cố đầu tiên khi chạy thật (13/09/2026, 09:52–09:58):** ba lần «Nạp và đổi
lấy cặp mới» đều bị Zalo trả `-14004 Invalid secret key`. Tra Vault (chỉ độ dài,
không đọc giá trị): chuỗi nạp vào ô Secret key dài 427 ký tự — Giám đốc đã dán
**Access token** từ API Explorer vào ô Secret key. Sửa: ô Secret key chặn chuỗi
dài hơn 64 ký tự hoặc có ký tự lạ; `zalo_co_bi_mat()` nay trả jsonb (đã nạp,
độ dài, có thuần chữ-số không — migration `20261028090000_zalo_bi_mat_do_dai.sql`
**đã áp**) để trang cảnh báo đỏ khi chuỗi đang nạp không phải Secret key;
`nap_token` trả đúng câu lỗi Zalo thay vì «loi»; -14004 ánh xạ về Secret key.
Secret key thật lấy ở developers.zalo.me → ứng dụng → Cài đặt → «Khóa bí mật
của ứng dụng» → Hiện → copy (~20 ký tự). `zalo-oa` v4.

**Bước 1–4 hoàn tất (13/09/2026, 10:20):** Secret key nạp đúng, Refresh token
từ API Explorer đổi thành công, API thông tin OA trả về đúng «VietinBank Bắc
Hưng Yên». Đường liệt kê nhóm trong tài liệu cũ (`group/listgroup`) đã bị Zalo
gỡ — 15 biến thể đều 404; đường đúng lấy từ API Explorer:
`GET /v3.0/oa/group/getgroupsofoa?offset&count`. Nhóm «343 - Bắc Hưng Yên One»
group_id `4a9bada229cec09099df` (5 thành viên) đã lưu vào cấu hình. Gửi tin:
`POST /v3.0/oa/group/message` — tin thử đã lên nhóm (message_id
`705efa85665a0d03544c`). `zalo-oa` v5 (`zalo-gui-sao` v2 giữ nguyên — hàm này không liệt kê nhóm, đường gửi tin đã đúng). GĐ xác nhận tin thử đã
lên nhóm lúc 10:25 → công tắc `bat_sao_xung_dang` **đã BẬT** (13/09/2026, qua SQL,
có dòng nhật ký `cong_tac`). Ngay sau đó GĐ yêu cầu
đẩy tức thì: thêm công tắc `tiet_kiem_tin` (migration
`20261029090000_zalo_cong_tac_tiet_kiem_tin.sql` **đã áp**, file gỡ cùng tên) —
**đang TẮT**: trigger xếp hàng với mốc sẵn sàng = ngay và gọi luôn `zalo-gui-sao`
qua pg_net (`zalo_kich_hoat_gui_sao`), cron mỗi phút chỉ còn là lưới vớt. Bật lên
thì quay về gom `gom_phut` (2). Switch ở tab Tin Sao.

**Gói cước (bảng giá Zalo OA áp dụng 01/06/2026, gồm VAT — migration
`20261025090000_zalo_goi_cuoc_bang_gia.sql` **đã áp**, chỉ nạp dữ liệu vào
`zalo_cau_hinh`, file gỡ cùng tên trong `supabase/rollbacks/`):** Gói Tăng
trưởng 1.400.000đ/6 tháng hoặc 2.500.000đ/năm; **tin OA → nhóm chat miễn phí tới
31/12/2026** (trang quản trị nhắc trước 45 ngày); 1 nhóm GMF-100 kèm gói (thêm
nhóm: 75.000đ/tháng); API 100 request/phút; **OA chỉ ủy quyền được 1 ứng dụng** —
ủy quyền app khác là BHY ONE mất token; 500 tin tư vấn 1-1/tháng (không liên
quan tin nhóm). Hết hạn gói không gia hạn → OA về gói Cơ bản, API ngừng.

**Đợt 2 — tin Sao Xứng Đáng lên nhóm (12/09/2026, mẫu tin GĐ duyệt cùng ngày):**
lý do nguyên văn (cắt 300 ký tự), kèm sao tích lũy + mốc quà, **mỗi người nhận
một tin riêng** (chế độ gộp theo người tặng để trong cấu hình), chân tin là link
về cổng. Cơ chế: trigger `sao_xep_hang_zalo` sau khi ghi phiếu chỉ xếp vào
`zalo_hang_doi` với mốc sẵn sàng = lúc ghi + `gom_phut` (2); cron `zalo-gui-sao`
mỗi phút (chỉ gọi khi có dòng tới mốc) → edge function **`zalo-gui-sao`** (v1,
đã deploy) gom theo người nhận, soạn tin bằng hàm thuần
`_shared/zaloSaoMau.ts` (có kiểm thử), gửi, đóng dấu; lỗi thì lùi dần 2/4/8/16
phút, quá 5 lần → đánh dấu lỗi + cảnh báo quản trị. Phiếu gỡ trước khi gửi thì
rút khỏi hàng; phiếu nhập bù không vào hàng. Tab **Tin Sao** trên Quản trị Zalo:
xem trước/gửi thử với phiếu thật, cài đặt gom, hàng đợi, gửi lại tin lỗi.
Migration `20261026090000_zalo_tin_sao_xung_dang.sql` **đã áp** (bảng
`zalo_hang_doi`, 2 trigger, 4 hàm, 1 cron; file gỡ cùng tên). Công tắc
`bat_sao_xung_dang` **đang tắt** — bật trên tab Nhóm sau khi tin thử lên nhóm.
Không đưa tên khách hàng, số tài khoản, dữ liệu tín dụng vào tin Zalo.

**Chạy lần đầu (trên cổng, không cần kỹ thuật):** Quản trị Zalo → tab Kết nối →
(1) dán Secret Key → (2) **cách nhanh:** API Explorer trên Zalo for Developers →
OA Access Token → chép refresh token → dán vào «Cách 2» (hoặc cách 1: «Tạo mã
PKCE», dán code_challenge + callback `https://bachungyenone.com/quan-tri-zalo`
vào phần thiết lập đường dẫn cấp quyền của ứng dụng, mở đường dẫn, «Cho phép»,
quay về trang là mã tự điền, bấm «Đổi mã lấy token») → tab Nhóm → (3) «Tìm và
lưu nhóm» → (4) «Gửi tin thử» rồi xác nhận trên Zalo.

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

**Bắc Hưng Yên Connect — dòng thời gian kết nối (08/09/2026):** trang
`/one/bhy-connect` dựng lại theo cấu trúc chương trình (Onepage «Kết nối kinh
doanh» + Thư ngỏ) với hình tượng chòm sao nối thành đồng tiền VietinBank. Mỗi
hoạt động (hội nghị, diễn đàn, kết nối, thư viện, dấu mốc) là một dòng trong
bảng `connect_dong_thoi_gian`; ghi được bởi cán bộ **Phòng KHDN, Phòng TCTH**
(xét theo mã phòng của hồ sơ, hàm `connect_soan_duoc`), admin nội dung và BGĐ;
khách đối tác chỉ thấy dòng bật «mở cho khách». Một dòng gắn được bài trong
`portal_uploads` để mượn ảnh và bài đầy đủ; ảnh riêng đặt dưới `shared/` của
kho `bhy-one`. Migration `20261021090000_bhy_connect_dong_thoi_gian.sql`
(kèm nạp 6 mốc 10/2024 → 08/2026, gắn bài «Chạm AI» theo tiêu đề) **chưa áp**
vào `whlysprzsguehxmrjwha`; trước khi áp, trang hiện bản nạp sẵn trong mã
(`src/data/one/connectDongThoiGian.ts`, trùng nội dung) và khoá nút thêm. File
gỡ: `supabase/rollbacks/20261021090000_bhy_connect_dong_thoi_gian_down.sql`.
Kèm sửa lỗi hộp đăng bài đọc cấu hình chuyên mục/phòng ban dạng JSON
(`src/lib/chuyenMuc.ts`).

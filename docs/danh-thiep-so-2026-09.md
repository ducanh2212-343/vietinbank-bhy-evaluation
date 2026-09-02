# Bắc Hưng Yên VCard — danh thiếp số đa ngôn ngữ, giai đoạn 1 (09/2026)

Bản triển khai đặc tả **«Module danh thiếp số đa ngôn ngữ — BHY ONE» v1.0 (02/09/2026)**
của Giám đốc Chi nhánh. Tài liệu này ghi lại: đã làm gì, làm KHÁC đặc tả ở đâu và
vì sao, phải làm gì khi triển khai, và những điểm cần Giám đốc quyết.

## 1. Đã làm (theo Mục 12 «Việc cần làm đầu tiên»)

| # | Việc | Kết quả |
|---|---|---|
| 1 | Schema + RLS + `nc_resolve_card(slug)` | `supabase/migrations/20261004090000_danh_thiep_so_nen_tang.sql` (+ rollback). **Chưa áp** vào project. Kèm `20261004090200_..._tu_tao_ban_nhap.sql` (dựng nháp từ hồ sơ 343, mục 5b). |
| 2 | Dữ liệu mồi Mục 11, toàn bộ `draft` | `supabase/migrations/20261004090100_danh_thiep_so_du_lieu_moi.sql` (+ rollback). Phồn thể sinh máy bằng OpenCC s2twp. **Chưa áp**. |
| 3 | Trang `/card/<slug>` + đo ngân sách | Entry riêng `card.html`; đo trên bản build: **~58 KB gzip / 180 KB thô** lần tải đầu (chưa tính font), **LCP 964 ms** ở 4G + CPU chậm ×4 — dưới trần 300 KB / 1,5 s. |
| 4 | Tab 2 từ điển chức danh | `/quan-tri-vcard/chuc-danh` — kèm luôn Tab 1, 3, 4 và màn tự phục vụ vì không có chúng thì không phát hành nổi một tấm thẻ để nghiệm thu. |
| 5 | Google Wallet | **Chưa làm** — đúng thứ tự đặc tả (sau khi 1–4 chạy được). Cột `google_object_id`, `wallet_override` đã có sẵn. |

Ngoài ra: vCard 6 ngôn ngữ (edge function `danh-thiep-vcard`), QR mức H có logo
(PNG 1024 + SVG), nhật ký quét ẩn danh, audit, job hằng ngày thu hồi chức danh
riêng hết hạn, thu hồi thẻ một thao tác → trang 410.

## 2. Những chỗ làm KHÁC đặc tả — và lý do

Đặc tả viết cho Next.js (App Router, SSR). Repo thật là **Vite + React SPA** chạy
trên Cloudflare Worker tĩnh, backend Supabase. Nguyên tắc «bám đúng stack hiện
có» của chính đặc tả được ưu tiên hơn từng chi tiết kỹ thuật:

| Đặc tả | Đã làm | Vì sao |
|---|---|---|
| `GET /card/[slug]` là Server Component SSR, cache 60 s | **Entry tĩnh riêng `card.html`** (không phải route trong SPA), dữ liệu đọc bằng `fetch` thuần tới RPC `nc_resolve_card`. Cloudflare ánh xạ `/card/*` → `card.html` bằng `public/_redirects` (mã 200 = proxy, giữ URL); Vercel bằng `vercel.json`; `vite dev/preview` bằng middleware trong `vite.config.ts`. SPA có route `/card/*` làm lưới đỡ: nếu nền tảng không áp `_redirects`, chuyển tiếp sang `card.html?s=<slug>`. | Vỏ ứng dụng nội bộ nặng gấp nhiều lần ngân sách 300 KB và `index.html` tự nhận là «cổng quản trị nội bộ». Không có máy chủ SSR để chạy. |
| Đọc `Accept-Language` ở máy chủ | Đọc `navigator.languages` trên trình duyệt (cùng nguồn dữ liệu), `?lang=` ghi đè | Trang tĩnh không có header. Luật zh-TW/HK/MO → phồn thể giữ nguyên (`src/lib/danhThiep/ngonNgu.ts`). |
| `GET /api/card/[slug]/vcard` | **Edge function** `danh-thiep-vcard` (`verify_jwt = false`) trả `text/vcard; charset=utf-8`, `Content-Disposition: inline` | iOS chỉ mở thẳng màn «Thêm liên hệ» khi tải một URL thật; Blob tạo trên máy khi mở khi không. |
| Self-host 4 font CJK subset theo `unicode-range` | Be Vietnam Pro qua Google Fonts (CSP đã cho phép); font CJK nạp **đúng ngôn ngữ đang xem và đúng những ký tự có trên thẻ** (`text=` của Google Fonts) — vài KB thay vì vài MB | Không có cách sinh subset font trong pipeline build hiện tại; máy khách Trung/Hàn/Nhật vốn có font hệ thống nên đây chỉ là lớp làm đẹp (`display=swap`). Muốn self-host thật sự: việc riêng ở GĐ2. |
| Rate limit 60 req/phút/IP ở edge | **Chưa có** trong mã — cần đặt **Cloudflare Rate Limiting rule** cho `bachungyenone.com/card/*` khi triển khai (mục 4). Trong CSDL có trần chống dội 120 dòng/phút/thẻ cho nhật ký quét. | Worker hiện thuần tĩnh, không có script để đếm. |
| Vai trò `director` duyệt chức danh riêng, vai trò thị trường, Wallet thuê ngoài | Helper **`nc_la_nguoi_duyet()`** = `bgd` **hoặc** TCTH admin (`tcth_admin` / `system_admin`) | Quyết định của Giám đốc 02/09/2026: «GĐ hoặc TCTH admin duyệt» — để không tắc việc khi Giám đốc vắng. Hiện chỉ Giám đốc mang `bgd` (Phó GĐ mang `pgd`). |
| Dòng «VietinBank – Chi nhánh Bắc Hưng Yên» | Thẻ hiện đơn vị của cán bộ (PGD/phòng) và dòng **`VietinBank – <tên Chi nhánh theo ngôn ngữ khách>`** (hàm `dongToChuc()`); tên pháp lý đầy đủ của Ngân hàng KHÔNG hiện trên thẻ nhưng vẫn là thành phần đầu của ORG trong tệp .vcf | Quyết định của Giám đốc 02/09/2026. Tên đầy đủ có «for Industry and Trade» được giữ ở nơi khách tra cứu lâu dài (danh bạ). |
| Ràng buộc 1: `external_title_id` phải trỏ chức danh `approved` | Chức danh phải đúng scope + đúng loại nhân sự **luôn luôn**; điều kiện «đã duyệt» bắt buộc khi **hồ sơ cán bộ `approved` hoặc bật thẻ** | Để TCTH soạn hồ sơ song song với rà soát từ điển. Bất biến quan trọng vẫn giữ: **không thẻ nào phát hành với chức danh chưa duyệt** (đã kiểm thử). |
| Tab 1 «sửa inline» | Sửa qua hộp thoại (6 tên + 6 địa chỉ + bản đồ + điện thoại) | Địa chỉ dài, sửa inline trong bảng 12 cột không dùng được trên màn nhỏ. |
| Job hết hạn chức danh riêng «gửi thông báo cho cán bộ và TCTH» | Job thu hồi chạy 0h30 hằng ngày, thẻ tự lùi về chức danh chuẩn; **không phát push** — cột cảnh báo «hết hạn sau N ngày» ở Tab 4 | Quyết định của Giám đốc 02/09/2026: chỉ cảnh báo ở màn quản trị (cán bộ đã nhận 21+ loại push). |
| Đường dẫn quản trị `/admin/danh-thiep/...`, tự phục vụ `/toi/danh-thiep` | `/quan-tri-vcard/{don-vi,chuc-danh,chuc-danh-rieng,can-bo}` và `/vcard` — gom thành thư mục **Bắc Hưng Yên VCard** trong menu Trang chủ — tiện ích nhỏ cho mọi cán bộ, không phải một cách vận hành nên không đứng trong Bắc Hưng Yên Ways (chốt 02/09/2026) | Theo quy ước đường dẫn tiếng Việt của cổng (`/quan-tri-khach`, `/quan-tri-ky-yeu`…). |

## 3. Mô hình dữ liệu và luật ở tầng CSDL

Bảng tiền tố `nc_` (đúng đặc tả) + ba bảng thêm: `nc_audit` (Mục 9.5), `nc_cau_hinh`
(`logo_enabled`, `card_base_url`, `lien_he_khi_thu_hoi` — Mục 9.6), và cột
`nc_staff.profile_id` nối với hồ sơ nhân sự 343 (không bắt buộc — thuê ngoài không có hồ sơ).

Luật thực thi bằng trigger/hàm, **không phải giao diện**:

- `nc_kiem_can_bo()` — ràng buộc 1–3 của Mục 3, NT2 (không rơi về chức danh nội bộ),
  NT3 (nhóm ngoài biên chế không được email @vietinbank.vn), chức danh riêng chỉ cho
  biên chế/hợp đồng, Wallet cho thuê ngoài chỉ Giám đốc bật (có ghi vết).
- `nc_chan_cot_cua_can_bo()` — cán bộ tự sửa chỉ được: số di động, ảnh, tên CJK.
- `nc_resolve_card(slug, xem_truoc)` — payload đã lọc theo **ma trận Mục 5**: logo,
  dòng ngân hàng, email, kênh chat, Wallet, NFC quyết định ở đây theo `employment_type`.
  Thu hồi → `{status:'revoked', contact}` (trang 410), chưa phát hành → `not_found`.
- `nc_phat_hanh_the()` / `nc_thu_hoi_the()` — một thao tác, một giao dịch.
- `nc_duyet_chuc_danh_rieng()` — chỉ Giám đốc; giữ luật «một bản approved/cán bộ».
- `nc_thu_hoi_chuc_danh_het_han()` — cron `nc-thu-hoi-chuc-danh-het-han` 17:30 UTC.
- `nc_ghi_nhat_ky_quet()` — anon gọi được; không IP; trần 120 dòng/phút/thẻ.

Kho ảnh `nc-danh-thiep` **công khai** (khách quét không đăng nhập), đường dẫn
`<nc_staff.id>/anh.jpg`, `<id>/qr-wechat.png`, `<id>/qr-kakaotalk.png`; ghi chỉ cho
chủ thẻ hoặc TCTH.

### Đã chạy khô trên CSDL thật (rollback, 02/09/2026)

Cả hai migration + 27 kịch bản chạy trong một giao dịch rồi ROLLBACK, **27/27 đạt**:
slug tự sinh và đuôi ngẫu nhiên khi trùng tên · chặn duyệt hồ sơ khi chức danh còn
nháp · phát hành thẻ đúng mẫu · resolver trả đủ chuỗi đơn vị + địa chỉ PGD · thẻ chưa
phát hành = không tồn tại · nhật ký quét bỏ giá trị lạ · thuê ngoài: chặn email
vietinbank, mẫu PARTNER, không logo/kênh/Wallet, chặn gán chức danh ngân hàng · TCTH
không bật được Wallet, Giám đốc bật được và có vết · TCTH không duyệt được chức danh
riêng, Giám đốc duyệt được, trigger chặn bản hết hạn · resolver ưu tiên chức danh
riêng rồi lùi về chuẩn sau khi job thu hồi · thu hồi thẻ → `revoked` kèm liên hệ Chi
nhánh · cán bộ sửa được SĐT, không sửa được chức danh · audit có vết · cron đăng ký.

## 4. Việc phải làm khi triển khai (theo thứ tự)

1. **Áp migration** `20261004090000_danh_thiep_so_nen_tang.sql`, `20261004090100_danh_thiep_so_du_lieu_moi.sql`
   rồi `20261004090200_danh_thiep_so_tu_tao_ban_nhap.sql` vào project `whlysprzsguehxmrjwha`
   (SQL Editor). Ghi lại vào README. Regenerate `src/integrations/supabase/types.ts`
   (sau đó có thể đổi `db` trong `src/lib/danhThiep/db.ts` về `supabase`).
2. **Deploy edge function** `danh-thiep-vcard` (`config.toml` đã khai `verify_jwt = false`).
   Kiểm: `curl -I "https://whlysprzsguehxmrjwha.supabase.co/functions/v1/danh-thiep-vcard?slug=abc"` → 404 (chưa có thẻ) chứ không phải 401/500.
3. **Phát hành bản web** (Cloudflare Workers Builds). Kiểm định tuyến:
   `curl -s https://bachungyenone.com/card/abc | grep -c card-` phải > 0 (nhận `card.html`,
   không phải `index.html`). Nếu không, lưới đỡ trong SPA vẫn chuyển tiếp được nhưng chậm hơn.
4. **Cloudflare Rate Limiting rule**: `bachungyenone.com/card/*` 60 req/phút/IP (Mục 9.2).
5. **Rà soát bản ngữ** toàn bộ dữ liệu mồi (đang `draft`), rồi duyệt ở Tab 1/Tab 2.
   Ghi chú đặc tả: dùng 营业部 cho PGD (không dùng 交易所), tên tiếng Anh Ngân hàng có
   đủ «for Industry and Trade».
6. Tab 4: tạo hồ sơ 10 cán bộ nghiệm thu (Ban GĐ + Trưởng phòng) từ hồ sơ 343, gán
   chức danh, duyệt, phát hành, tải QR. Kiểm quét ở 30 cm / 200 lux với bản in 2,5 cm.
7. **Xin ý kiến Trụ sở chính** về phạm vi dùng logo trên thẻ số / QR (Mục 9.6);
   công tắc «Logo VietinBank trên thẻ» ở nút Cấu hình tắt được ngay nếu cần.

## 5. Quyết định của Giám đốc (02/09/2026) và cách đã áp dụng

| # | Câu hỏi | Quyết định | Đã áp dụng |
|---|---|---|---|
| 1 | Thông báo khi chức danh riêng hết hạn | Chỉ cảnh báo ở màn quản trị | Không mở loại push mới; cột cảnh báo ở Tab 4 báo trước 30 ngày và sau khi job thu hồi. |
| 2 | Ai duyệt khi Giám đốc vắng | Giám đốc **hoặc** TCTH admin | `nc_la_nguoi_duyet()` = `bgd` hoặc `tcth_admin`/`system_admin`; áp cho chức danh riêng, vai trò thị trường và công tắc Wallet thuê ngoài (cả ba đều ghi vết người duyệt). Nhân viên thường vẫn bị chặn (kiểm thử khô). |
| 3 | Dòng tổ chức trên thẻ | «VietinBank – Chi nhánh Bắc Hưng Yên» | Hàm `dongToChuc()` ghép thương hiệu + tên Chi nhánh theo ngôn ngữ khách; tên pháp lý đầy đủ chỉ còn trong tệp .vcf. |
| 4 | Địa chỉ đầy đủ và hotline Chi nhánh cho trang «đã chuyển công tác» | (chưa có số cụ thể) | Dữ liệu mồi tạm ghi «Đường Nguyễn Văn Linh, phường Mỹ Hào, tỉnh Hưng Yên» (6 ngôn ngữ) theo danh bạ mạng lưới công khai — **TCTH bổ sung số nhà và số điện thoại trực** ở Tab 1 trước khi duyệt đơn vị `CN_BHY`. Không đưa hotline chưa kiểm chứng vào dữ liệu. |
| 5 | CTV / thực tập sinh có chức danh không | Có, TCTH nhập theo từng thời kỳ | Không cần đổi mã: Tab 2 cho tick «Cộng tác viên» / «Thực tập sinh» ở «Loại nhân sự được gán»; thẻ hiện chức danh đó nhưng vẫn không logo, không email VietinBank, chỉ Zalo (CTV) theo ma trận. |

## 5b. Cán bộ thấy NGAY thẻ của mình (bổ sung 02/09/2026)

Vấn đề Giám đốc nêu khi thử bản preview: mở «Danh thiếp số của tôi» chỉ thấy «Phòng
TCTH chưa tạo hồ sơ», và trang tải chậm.

- **Chậm** vì migration chưa áp: truy vấn bảng `nc_staff` lỗi «không có bảng», React
  Query thử lại 3 lần (~7 giây) rồi mới hiện câu trên. Nay mọi truy vấn `nc_*` không
  thử lại khi gặp lỗi này và màn hình nói thẳng «phân hệ chưa kích hoạt».
- **Thấy ngay**: migration `20261004090200_danh_thiep_so_tu_tao_ban_nhap.sql` thêm
  `nc_tao_ban_nhap_tu_343()` (cán bộ tự dựng bản nháp từ hồ sơ 343 của mình, một nút
  bấm) và `nc_dong_bo_hang_loat_tu_343()` (TCTH dựng nháp cho toàn bộ cán bộ chưa có).
  Phòng 343 → đơn vị, chức danh 343 → chức danh đối ngoại qua hai hàm ánh xạ
  `nc_anh_xa_don_vi_343()` / `nc_anh_xa_chuc_danh_343()`. Thẻ hiện ngay ở đầu màn
  tự phục vụ (6 ngôn ngữ) qua `nc_resolve_card(slug, xem_truoc = true)` — vẫn **chưa
  công khai** cho tới khi TCTH duyệt và phát hành, nên NT1/NT2 không đổi.
- Đối chiếu trên 100 hồ sơ 343 đang hoạt động (02/09/2026): **100/100 ánh xạ được**
  chức danh đối ngoại — RM_BL 23, GDV 20, Chuyên viên (CV) 13, RM_KHDN 8, Phó GĐ PGD 7,
  Phó phòng 7, GĐ PGD 5, Trưởng phòng 5, RM_FDI 3, Thủ quỹ 3, Phó GĐ CN 3, KSV 2, GĐ 1.
  Ba mã `PGD_PGD`, `CV`, `TQ` được thêm vào dữ liệu mồi (nháp) để ánh xạ đủ. Lưu ý dữ
  liệu 343: 98/100 chưa có ảnh, 96/100 chưa có số di động — cán bộ tự bổ sung ở màn
  tự phục vụ.

## 6. Còn lại cho GĐ2–GĐ3

Google Wallet (Generic pass, cập nhật PATCH, thu hồi EXPIRED), Apple Wallet, NFC vật lý,
dashboard lượt quét theo cán bộ/ngôn ngữ/thời điểm (bảng `nc_scan_log` đã sẵn), self-host
font CJK, đồng bộ HRM.

## 7. Bản đồ mã nguồn

- CSDL: `supabase/migrations/20261004090000_*.sql`, `20261004090100_*.sql` + `supabase/rollbacks/`.
- Trang công khai: `card.html`, `src/danh-thiep-cong-khai/` (`main.tsx`, `TheDanhThiep.tsx` — dùng chung
  cho xem trước ở quản trị, `chuoi.ts` 6 ngôn ngữ, `the.css`, `api.ts`).
- Dùng chung: `src/lib/danhThiep/` (`ngonNgu.ts` luật rơi về, `kieu.ts`, `vcard.ts`, `qr.ts`, `slug.ts`, `db.ts`).
  Bản sao cho edge function: `supabase/functions/_shared/danhThiepNgonNgu.ts`, `_shared/vcard.ts`
  (kiểm thử so hai tệp từng byte).
- Edge function: `supabase/functions/danh-thiep-vcard/index.ts`.
- Menu: thư mục «Bắc Hưng Yên VCard» trong khu Trang chủ (`src/lib/navigation.ts`).
- Quản trị: `src/pages/DanhThiepAdminPage.tsx`, `src/components/danh-thiep/Tab*.tsx`, `XemTruocThe.tsx`,
  `NhapSauNgonNgu.tsx`; tự phục vụ: `src/pages/DanhThiepCuaToiPage.tsx`; hook `src/hooks/useDanhThiep.ts`.
- Định tuyến `/card/*`: `public/_redirects`, `vercel.json`, middleware trong `vite.config.ts`, lưới đỡ trong `App.tsx`.
- Logo: `public/brand/logo-cn-bhy.svg`.

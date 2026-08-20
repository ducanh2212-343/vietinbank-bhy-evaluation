# Hướng dẫn chuyển domain: `chieuthuc3.com` → `bachungyenone.com` (08/2026)

> Viết cho người **không rành công nghệ**. Cứ làm tuần tự từ Bước 1 đến Bước 7,
> mỗi bước đều có "Làm gì" → "Bấm ở đâu" → "Cách biết là đã xong".
> Tổng thời gian: **60–90 phút**, trong đó có ~15 phút chỉ ngồi chờ.
>
> **Quan trọng: KHÔNG xoá, KHÔNG huỷ domain `chieuthuc3.com`.** Giữ nguyên và trỏ
> song song trong ít nhất 1–2 tháng. Xoá sớm sẽ làm gãy link trong các email đã gửi
> và làm cán bộ không vào được web.

---

## Bước 0. Hiểu bức tranh: đổi domain là đổi ở 4 nơi

Website này không nằm ở một chỗ duy nhất. Tên miền cũ đang được nhắc tới ở 4 nơi,
và phải đổi **đủ cả 4** thì mới xong:

| # | Nơi | Nó lo việc gì | Không đổi thì sao |
|---|-----|----------------|-------------------|
| 1 | **Cloudflare** (Workers) | Gõ `bachungyenone.com` thì ra web | Gõ domain mới báo lỗi / không vào được |
| 2 | **Resend** + DNS Cloudflare | Email gửi đi từ `noreply@bachungyenone.com` | Email không gửi được, hoặc rơi vào Spam |
| 3 | **Supabase** (Secrets + Auth) | Link bên trong email trỏ về đâu; link "Quên mật khẩu" có mở được không | Bấm link trong email bị lỗi / về domain cũ |
| 4 | **Mã nguồn (GitHub)** | Chữ hiển thị & giá trị mặc định | Chữ trên web vẫn ghi tên cũ (đã sửa sẵn ở lần thay đổi này) |

Việc số 4 **đã làm xong trong repo** (xem mục "Phần code đã sửa sẵn" ở cuối).
Anh/chị chỉ cần làm việc 1, 2, 3 — đều là bấm chuột trên web, không phải gõ lệnh.

**Thứ tự bắt buộc: 1 → 2 → 3 → deploy.** Làm đúng thứ tự này thì email không bao giờ
bị ngắt quãng giữa chừng.

---

## Bước 1. Cho tên miền mới chạy được website (~10 phút)

**Làm gì:** gắn `bachungyenone.com` vào Cloudflare Worker đang chạy web (`343-noi-bo`).

**Bấm ở đâu:**

1. Vào https://dash.cloudflare.com → đăng nhập.
2. Menu trái, chọn **Compute (Workers)** → **Workers & Pages**.
3. Trong danh sách, bấm vào worker tên **`343-noi-bo`**.
4. Chọn tab **Settings** → mục **Domains & Routes**.
5. Bấm **+ Add** → chọn **Custom Domain**.
6. Gõ `bachungyenone.com` → bấm **Add domain**.
7. Làm lại bước 5–6 một lần nữa với `www.bachungyenone.com` (để ai gõ có "www" cũng vào được).
8. **Giữ nguyên `chieuthuc3.com` đang có trong danh sách** — không xoá.

Vì tên miền mua ngay trên Cloudflare nên phần DNS và chứng chỉ bảo mật (ổ khoá HTTPS)
Cloudflare tự làm hộ, thường mất **1–5 phút**. Nếu thấy trạng thái "Initializing
certificate", cứ chờ.

**Cách biết là đã xong:**

- [ ] Mở trình duyệt gõ `https://bachungyenone.com` → hiện trang đăng nhập của cổng.
- [ ] Có **ổ khoá** ở thanh địa chỉ, không có cảnh báo "Not secure".
- [ ] Gõ thẳng `https://bachungyenone.com/dat-lai-mat-khau` → hiện form, **không báo 404**.
      (Đây là phép thử quan trọng: nếu 404 nghĩa là Worker chưa nhận domain đúng.)
- [ ] `https://chieuthuc3.com` vẫn vào được như cũ.

> Nếu sau 15 phút vẫn báo lỗi SSL: quay lại **Websites** → `bachungyenone.com` → **SSL/TLS**
> → đặt chế độ **Full (strict)**, rồi chờ thêm 10 phút.

---

## Bước 2. Cho email gửi đi từ tên miền mới (~20 phút + chờ)

Email hệ thống (đặt lại mật khẩu, nhắc việc, duyệt đăng ký) đang gửi qua **Resend**.
Muốn gửi từ `noreply@bachungyenone.com` thì Resend phải "xác minh" tên miền mới.

**Bấm ở đâu:**

1. Vào https://resend.com → đăng nhập → menu trái **Domains** → bấm **Add Domain**.
2. Gõ `bachungyenone.com` → chọn Region **giống hệt** domain cũ đang dùng
   (mở `chieuthuc3.com` trong danh sách để xem nó đang ở region nào) → **Add**.
3. Resend hiện một **bảng các bản ghi DNS** (thường 3–4 dòng: 1 dòng MX, 1–2 dòng TXT
   loại SPF/DKIM). **Để nguyên tab này**, mở thêm một tab Cloudflare.
4. Ở Cloudflare: **Websites** → bấm `bachungyenone.com` → menu trái **DNS** → **Records**.
5. Với **từng dòng** Resend đưa: bấm **+ Add record** ở Cloudflare rồi điền:
   - **Type**: đúng loại Resend ghi (MX / TXT / CNAME).
   - **Name**: copy y hệt phần Resend ghi (ví dụ `send`, hoặc `resend._domainkey`).
     *Nếu Resend ghi cả đuôi `send.bachungyenone.com` thì ở Cloudflare chỉ cần gõ `send`.*
   - **Value / Content**: copy **nguyên văn**, không thêm bớt dấu cách hay dấu nháy.
   - **Priority** (chỉ với dòng MX): copy đúng số Resend ghi (thường là `10`).
   - **Proxy status**: nếu có nút đám mây màu cam, **bấm cho nó xám lại (DNS only)**.
   - **Save**.
6. Thêm **1 bản ghi nữa** mà Resend không nhắc nhưng nên có (giúp email không vào Spam):
   - Type `TXT` — Name: `_dmarc` — Content:
     `v=DMARC1; p=none; rua=mailto:ducanh2212@gmail.com`
7. Quay lại Resend → bấm **Verify DNS Records**. Chờ 1–10 phút, bấm lại vài lần
   cho đến khi **tất cả các dòng đều xanh / "Verified"**.

**Cách biết là đã xong:**

- [ ] Trong Resend, `bachungyenone.com` có trạng thái **Verified** (xanh).
- [ ] **KHÔNG xoá** domain `chieuthuc3.com` khỏi Resend (để còn đường lui).

> ⚠️ **Bẫy đã từng dính lần trước — đọc kỹ:** API key của Resend có thể bị "khoá theo
> domain cũ", làm email đầu tiên từ domain mới báo lỗi
> *"The associated domain with your API key is not verified"*.
> Phòng trước cho chắc: Resend → **API Keys** → **Create API Key** → đặt tên
> `bhy-one-full` → quyền **Full access** → copy chuỗi key (chỉ hiện 1 lần, dán tạm vào
> Notes). Sẽ dùng ở Bước 3. Key cũ cứ để đó, vài tuần sau ổn định rồi hãy xoá.

---

## Bước 3. Báo cho hệ thống biết địa chỉ mới (~10 phút)

Đây là nơi quyết định **link bên trong email trỏ về đâu**.

### 3a. Đổi các "Secrets" ở Supabase

1. Vào https://supabase.com/dashboard → chọn project **`chieuthuc3-bachungyen`**
   (mã `whlysprzsguehxmrjwha`).
2. Menu trái: **Edge Functions** → tab **Secrets** (một số bản ghi là
   *Project Settings → Edge Functions → Secrets*).
3. Thêm/sửa cho đúng bảng này (có sẵn thì bấm sửa, chưa có thì **Add new secret**):

   | Tên secret | Giá trị |
   |---|---|
   | `APP_URL` | `https://bachungyenone.com` |
   | `EMAIL_FROM_DOMAIN` | `bachungyenone.com` |
   | `EMAIL_SENDER_DOMAIN` | *(xoá đi, hoặc để trống — hệ thống tự tính)* |
   | `EMAIL_FROM_NAME` | *(không cần đặt — sau Bước 4 tên người gửi mặc định đã là `BHY ONE`. Chỉ đặt khi muốn một tên khác)* |
   | `RESEND_API_KEY` | dán key **Full access** vừa tạo ở Bước 2 |

   Lưu ý: `APP_URL` **không có dấu `/` ở cuối**.

### 3b. Đổi địa chỉ đăng nhập / đặt lại mật khẩu

1. Vẫn trong Supabase, menu trái: **Authentication** → **URL Configuration**.
2. **Site URL**: sửa thành `https://bachungyenone.com`.
3. **Redirect URLs**: bấm **Add URL** và thêm đủ 4 dòng dưới đây (giữ cả dòng cũ):
   - `https://bachungyenone.com/dat-lai-mat-khau`
   - `https://www.bachungyenone.com/dat-lai-mat-khau`
   - `https://chieuthuc3.com/dat-lai-mat-khau`  ← giữ, để email cũ vẫn bấm được
   - `https://343-noi-bo.ducanh2212.workers.dev/dat-lai-mat-khau` ← đường lui khẩn cấp
4. Bấm **Save**.

**Cách biết là đã xong:** các ô đã lưu đúng chữ, không thừa dấu cách, không thừa `/`.

---

## Bước 4. Cập nhật lại phần mềm (~5 phút, cần người kỹ thuật hoặc Claude)

Phần code đã sửa sẵn trong repo, nhưng phải "đẩy lên chạy thật" thì mới có tác dụng.

**Việc A — Website:** merge nhánh `claude/cloudflare-domain-change-0dptld` vào `main`.
Cloudflare tự build lại và cập nhật web sau vài phút (Workers Builds). Không cần làm gì thêm.

**Việc B — Các function gửi email.** Điều quan trọng phải hiểu trước: **sau Bước 3 thì
việc chuyển tên miền đã xong về mặt chức năng.** Mã đang chạy trên Supabase đọc secret
`APP_URL` / `EMAIL_FROM_DOMAIN` ngay khi bấm Save, nên email đã gửi từ
`noreply@bachungyenone.com` với link về tên miền mới mà không cần deploy gì.

Deploy ở bước này chỉ để đổi **tên hiển thị người gửi** và **nhãn cấu phần** — không gấp,
và nên làm sau khi đã nghiệm thu Bước 5.

| Hàm | Vì sao deploy | Mức cấp thiết |
|---|---|---|
| `send-reminders` | tên người gửi + nhãn `[CT3]` cho nhắc việc hằng ngày | cao (chạy 08:00 mỗi ngày) |
| `auth-email-hook` | tên người gửi + 6 tiêu đề email xác thực | cao (đặt lại mật khẩu) |
| `ct2-nhip-bao-cao` | tên người gửi cho email nhịp tuần | vừa (chiều thứ Sáu) |
| `weekly-kanban-digest` | tên người gửi | vừa |
| `send-hr-notification` | tên người gửi + nhãn `[CT3]` | thấp (không dùng từ 07/2026) |
| `send-feature-tip-push`, `quiz-reminders` | nhãn `[Mẹo]`, `[Quizzi]` | thấp |
| `ai-advisor` | chữ ký thư AI | thấp |

**Không cần deploy:** `create-staff-user`, `bulk-create-staff-users`,
`reset-staff-password` — chúng lấy địa chỉ từ secret `APP_URL`, đã đúng sẵn.

> **Bài học vận hành (20/08):** trước khi deploy phải `git fetch origin main` và hợp nhất.
> Nhánh làm việc lần này chậm **120 commit** so với `main`; deploy thẳng từ nhánh cũ sẽ
> đẩy bản cũ đè lên máy chủ và xoá mất phần nhãn phân hệ `[CT2]/[CT3]/[Dấu ấn]` mà `main`
> đã làm ngày 11–12/08. Đã hợp nhất, nay repo và máy chủ khớp nhau.

---|---|---|
> | `notify-ct2` | 02/08 | **12/08** |
> | `notify-kanban-update` | 03/08 | **11/08** |
> | `weekly-kanban-digest` | 03/08 | **11/08** |
> | `send-reminders` | 03/08 | **10/08** |
> | `nhac-lich-nghi` | 02/08 | **10/08** |
>
> Đã kiểm chứng bằng `notify-ct2`: bản máy chủ có hàm `nhanPhanHe()` gắn nhãn
> `[CT2]/[CT3]/[Dấu ấn]` mà bản repo hoàn toàn không có. Deploy đè bản repo là **xoá mất
> một tuần công việc** và làm push mất nhãn phân hệ.
>
> **Cách làm đúng cho 5 hàm này:** tải mã đang chạy từ Supabase về → vá thêm phần đổi
> tên miền/thương hiệu lên trên → deploy → commit bản đã hợp nhất vào repo. Claude làm
> được việc này ở Bước 4; đừng chạy `supabase functions deploy` thẳng từ repo.

Các hàm còn lại (repo mới hơn hoặc bằng máy chủ) thì deploy bình thường bằng
`supabase functions deploy <tên-function>`, hoặc nhắn cho Claude làm.

> ⏱ **Chỉ deploy SAU khi Bước 2 đã xanh hết.** Deploy sớm quá thì email sẽ cố gửi từ
> một tên miền Resend chưa xác minh → lỗi.

---

## Bước 5. Nghiệm thu — 6 phép thử (~10 phút)

Làm lần lượt, tick vào ô khi đạt:

- [ ] **1. Web mở được:** `https://bachungyenone.com` hiện trang đăng nhập, có ổ khoá.
- [ ] **2. Không 404:** `https://bachungyenone.com/hanh-dong-phat-trien` mở thẳng vẫn ra trang.
- [ ] **3. Đăng nhập được** bằng tài khoản admin của anh/chị trên domain mới.
- [ ] **4. Email gửi được:** vào **Quản trị Email** trong cổng → gửi 1 email test →
      kiểm tra hộp thư: người gửi phải là **`BHY ONE <noreply@bachungyenone.com>`**,
      và **vào Inbox** (nếu vào Spam, xem Bước 6).
- [ ] **5. Quên mật khẩu chạy đúng:** ở màn hình đăng nhập bấm "Quên mật khẩu" với email
      của chính mình → mở email → link phải chứa `bachungyenone.com` → bấm vào ra đúng
      form đặt lại mật khẩu (không báo "link hết hạn / không hợp lệ").
- [ ] **6. Sáng hôm sau, ~08:00:** email nhắc việc tự động vẫn về, người gửi là domain mới.
      (Đây là phép thử cuối cùng, phải chờ sang ngày hôm sau.)

Nếu cả 6 ô đều tick → **xong**.

---

## Bước 6. Gặp trục trặc thì làm gì

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Gõ domain mới ra lỗi SSL / "Not secure" | Chứng chỉ chưa cấp xong | Chờ 15 phút; vẫn lỗi thì Cloudflare → SSL/TLS → **Full (strict)** |
| Vào trang chủ OK nhưng mở link con báo **404** | Worker chưa nhận domain đúng cách | Bước 1, xoá custom domain rồi thêm lại |
| Resend không chịu **Verify** | Bản ghi DNS gõ sai, hoặc để đám mây **cam** | Đối chiếu từng ký tự với bảng Resend; bấm cho đám mây **xám (DNS only)**; chờ thêm 10 phút |
| Email lỗi *"domain with your API key is not verified"* | API key Resend khoá theo domain cũ | Tạo key **Full access** mới → dán vào secret `RESEND_API_KEY` (có hiệu lực ngay, **không cần deploy lại**) |
| Email vào **Spam** | Tên miền mới chưa có "uy tín gửi" | Bình thường trong 1–2 tuần đầu. Dặn cán bộ mở Spam bấm **"Not spam"**. Ổn định rồi thì sửa TXT `_dmarc` từ `p=none` lên `p=quarantine` |
| Link trong email vẫn ra domain cũ | Chưa deploy lại function, hoặc `APP_URL` sai | Kiểm tra secret `APP_URL`, rồi làm lại Bước 4 việc B |
| Cán bộ báo "bị đăng xuất, phải đăng nhập lại" | Bình thường — xem Bước 7 | Trấn an, hướng dẫn đăng nhập lại |

### Nút lùi khẩn cấp (nếu email hỏng và cần chữa trong 1 phút)

Vào Supabase → Edge Functions → Secrets, đặt:

- `EMAIL_FROM_DOMAIN` = `chieuthuc3.com`
- `EMAIL_SENDER_DOMAIN` = `notify.chieuthuc3.com`

Có hiệu lực **ngay**, không cần deploy lại. Email quay về gửi từ tên miền cũ, còn web
vẫn chạy ở tên miền mới. Sửa xong Resend thì đổi lại như Bước 3a.

---

## Bước 7. Việc cần dặn cán bộ (đừng bỏ qua)

Trình duyệt coi `chieuthuc3.com` và `bachungyenone.com` là **hai nơi hoàn toàn khác nhau**,
nên có mấy thứ mọi người phải làm lại **một lần duy nhất**:

1. **Phải đăng nhập lại** ở địa chỉ mới (phiên đăng nhập cũ không đi theo sang).
2. **Sửa dấu trang (bookmark)** và link đã ghim trên Zalo nhóm sang `bachungyenone.com`.
3. **Ai đã cài app ra màn hình điện thoại** (biểu tượng BHY ONE): xoá biểu tượng cũ,
   mở `bachungyenone.com` rồi cài lại ("Thêm vào màn hình chính").
4. **Ai đã bật thông báo đẩy**: thông báo đã đăng ký ở `chieuthuc3.com` **vẫn chạy bình
   thường, không mất** (xem mục dưới). Chỉ khi muốn nhận thông báo *ở địa chỉ mới* thì
   vào cài đặt trong cổng bật lại một lần — nếu bật cả hai nơi sẽ nhận **2 thông báo trùng
   nhau**, khi đó tắt bớt ở địa chỉ cũ.

Mẫu tin nhắn gửi nhóm:

> Kính gửi anh/chị, từ hôm nay cổng nội bộ chuyển sang địa chỉ mới:
> **https://bachungyenone.com** (địa chỉ cũ chieuthuc3.com vẫn vào được nhưng anh/chị
> vui lòng chuyển sang dùng địa chỉ mới). Lần đầu vào anh/chị **đăng nhập lại** như bình
> thường, và nhớ **cập nhật lại dấu trang**. Ai đã cài biểu tượng ngoài màn hình điện
> thoại thì xoá biểu tượng cũ và cài lại từ địa chỉ mới. Email hệ thống từ nay gửi từ
> **noreply@bachungyenone.com** — vài tuần đầu có thể rơi vào Spam, anh/chị mở Spam và
> bấm **"Not spam"** giúp. Trân trọng.

---

## Thông báo đẩy (push): GIỮ NGUYÊN theo `chieuthuc3.com` — không đụng vào

**Nguyên tắc:** đổi domain **không được** làm gãy các đăng ký thông báo đẩy đã có ở
`chieuthuc3.com`. Cụ thể:

- **Không đổi VAPID key** (`src/lib/pushNotifications.ts` và các function `notify-*`,
  `send-*-push`). Đổi key = toàn bộ đăng ký cũ chết ngay lập tức.
- **Không đổi `tag`** trong `public/sw.js` (`chieuthuc3-reminder`) và trong các function
  gửi push. `tag` chỉ là mã gộp thông báo trùng chủ đề — đổi tên miền không liên quan.
- **`url` trong payload push luôn là đường dẫn TƯƠNG ĐỐI** (`/tong-quan`, `/quizzi`,
  `/hanh-dong-phat-trien?view=team`…), **tuyệt đối không ghép `APP_URL`**. Service worker
  mở link theo đúng domain mà thiết bị đã đăng ký, nên máy nào subscribe ở
  `chieuthuc3.com` thì bấm thông báo vẫn mở `chieuthuc3.com` (đang đăng nhập sẵn), máy nào
  subscribe ở `bachungyenone.com` thì mở `bachungyenone.com`. Một dòng code duy nhất còn
  ghép `APP_URL` (`quiz-reminders`) đã được sửa về tương đối trong lần thay đổi này.
- **Điều kiện để đăng ký cũ tiếp tục sống:** `chieuthuc3.com` phải **còn gắn vào Worker
  `343-noi-bo`** (Bước 1 đã dặn giữ). Còn gắn thì `sw.js` ở domain cũ vẫn tải được và
  thông báo vẫn về bình thường; gỡ domain cũ ra thì các đăng ký đó mới hỏng.
- Bảng `push_subscriptions` **không cần sửa gì** — mỗi dòng lưu `endpoint` do trình duyệt
  cấp, không phụ thuộc tên miền của mình.

Tóm lại: phần push **không nằm trong việc chuyển domain**. Ai đang nhận thông báo cứ nhận
tiếp; ai muốn nhận ở địa chỉ mới thì bật thêm một lần (và nên tắt bên cũ để khỏi trùng).

## Biên bản rà soát toàn bộ luồng email & push (20/08/2026)

Rà soát trước cutover để chắc chắn **không luồng nào bị đổi hành vi ngoài tên miền**.

### Email — 5 luồng đang chạy thật (đối chiếu `email_send_log` 120 ngày)

| Template | Hàm phát | Sau cutover đổi gì |
|---|---|---|
| `reminder_digest` (nhắc việc 08:00 hằng ngày) | `send-reminders` | chỉ domain ở From + link |
| `leadership-digest` | `send-reminders` | chỉ domain ở From + link |
| `recovery` (đặt lại mật khẩu) | `auth-email-hook` | chỉ domain ở From + redirect |
| `kanban-weekly-digest` | `weekly-kanban-digest` | chỉ domain ở From + link |
| `ct2-nhip-tuan` | `ct2-nhip-bao-cao` ⚠ | chỉ domain — **nhưng xem cảnh báo bên dưới** |

Ngưng dùng từ 07/2026, không cần quan tâm: `council-report`, `council-vote-reminder`,
`quarterly-letter`, `dmarc_test`, `resend_test`.

Toàn bộ email đều đi qua một cửa duy nhất là `process-email-queue` → Resend. Hàm này
**không hardcode tên miền nào** — nó gửi đúng `from` mà hàm phát đã đặt.

### Push — 6 hàm, tất cả đều an toàn

`notify-ct2`, `notify-kanban-update`, `weekly-kanban-digest`, `send-reminders`,
`send-feature-tip-push`, `quiz-reminders`. Đã kiểm từng payload: **mọi `url` đều là
đường dẫn tương đối** (`/tong-quan`, `/hanh-dong-phat-trien`, `/one/chieu-thuc-2`…),
kể cả 2 chỗ sinh động (`duongDan()` của CT2 và `cta_url` của Mẹo tính năng — đã kiểm
8/8 bản ghi trong CSDL đều tương đối). VAPID key, `tag`, `public/sw.js`,
bảng `push_subscriptions`: **không sửa gì**.

### Những thứ tuyệt đối không đụng — đã xác nhận còn nguyên

- **Email đăng nhập của cán bộ**: 102 tài khoản `@gmail.com`, 1 `@vietinbank.vn`,
  2 tài khoản khách `@khach.343skill.com`. Đây chỉ là **định danh đăng nhập**, không
  phải hộp thư — đổi tên miền không ảnh hưởng, và **không được sửa** thành tên miền mới
  (sửa là 2 tài khoản khách mất đường đăng nhập).
- **Lịch cron** (12 job): tất cả gọi `whlysprzsguehxmrjwha.supabase.co`, không dính
  tên miền của mình → giờ giấc và tần suất giữ nguyên.
- **Dữ liệu cũ trong CSDL** có chứa chữ `chieuthuc3`/`343skill`: chỉ nằm ở
  `audit_logs`, `email_send_log`, `kanban_card_logs`, `skill_assessments`, `guest_access`
  — đều là **nhật ký lịch sử**, để nguyên.
- **Tên người gửi email** giữ nguyên `chieuthuc3` (xem mục dưới).

### Hai việc phát hiện thêm, cần biết

1. ✅ **`ct2-nhip-bao-cao` trước đây chạy trên Supabase nhưng KHÔNG có trong repo** —
   đã chép mã từ máy chủ về `supabase/functions/ct2-nhip-bao-cao/index.ts` và sửa
   `SITE_NAME` sang `FROM_NAME` để email nhịp tuần cũng mang tên `BHY ONE`. Bản chép này
   **phải đối chiếu lại với bản trên máy chủ ngay trước khi deploy** (Bước 4) rồi mới đẩy.
2. **Cron `bhy-ideas-hoi-dong-nhac` (02:00 các ngày làm việc) gọi hàm
   `notify-idea-council` — hàm này không tồn tại trên Supabase.** Job này đang lỗi âm
   thầm từ trước, không liên quan đổi tên miền. Cần xử lý riêng: hoặc deploy hàm, hoặc
   xoá job.

### Một thay đổi tôi đã tự rút lại

Bản đầu tôi đổi tên hiển thị người gửi từ `chieuthuc3` sang `BHY ONE`. Theo yêu cầu
"không có sự thay đổi ngoài tên miền", **mặc định đã trả về `chieuthuc3`** — email sau
cutover hiện `BHY ONE <noreply@bachungyenone.com>`, đúng như hôm nay chỉ khác phần
tên miền. Khi nào muốn đổi tên hiển thị, chỉ cần thêm secret `EMAIL_FROM_NAME` = `BHY ONE`
— **có hiệu lực ngay, không cần sửa code, không cần deploy lại**. Lưu ý khi đổi: hàm
`ct2-nhip-bao-cao` (ngoài repo) vẫn hardcode `chieuthuc3`, nên muốn đồng bộ hoàn toàn
thì phải xử lý việc số 1 ở trên trước.

## Thương hiệu BHY ONE & nhãn cấu phần trong lời nhắc

### 1. Một thương hiệu duy nhất: Bắc Hưng Yên ONE / BHY ONE

Trước đây cổng mang **bốn** cái tên khác nhau tuỳ chỗ. Nay gom hết về một:

| Chỗ | Tên cũ | Tên mới |
|---|---|---|
| Người gửi email (5 luồng) | `chieuthuc3` | `BHY ONE` |
| Email xác thực: người gửi + 6 tiêu đề | `343 Phát triển nhân sự` | `BHY ONE` |
| Email nhân sự: đầu thư, chân thư, 4 tiêu đề | `343 Phát triển nhân sự` | `BHY ONE` |
| Thư duyệt/từ chối đăng ký | `SKILL LEVEL 38` | `BHY ONE` |
| Tin nhắn bàn giao tài khoản | `343 Phát triển nhân sự` | `Bắc Hưng Yên ONE` |
| Màn Cài đặt → Ứng dụng | `343 Phát triển nhân sự` | `Bắc Hưng Yên ONE` |
| Chữ ký thư AI (bản tin quý) | `Hệ thống 343 Phát triển nhân sự` | `Hệ thống Bắc Hưng Yên ONE` |
| Tiêu đề push dự phòng (`sw.js`) | `343 Nội bộ` | `BHY ONE` |
| Ví dụ email trên form đăng nhập | `bhy001@343skill.com` | `bhy001@gmail.com` |

Tên người gửi email nằm ở **một chỗ duy nhất**: secret `EMAIL_FROM_NAME` (mặc định
`BHY ONE`). Đổi lần sau chỉ sửa secret.

**Cố ý KHÔNG đổi:** các khoá lưu trong trình duyệt (`343skill:last-activity`,
`343skill:nep-tot-quick-note-draft`). Đây là mã kỹ thuật người dùng không nhìn thấy —
đổi tên là **đăng xuất toàn bộ cán bộ và xoá mọi bản nháp ghi nhanh đang dở**.

### 2. Nhãn cấu phần: nhìn thông báo là biết của phân hệ nào

Quy ước thống nhất — nhãn đứng ngay sau biểu tượng mức, trước tiêu đề:

```
⛔ [CT2] Đầu việc quá hạn 3 ngày          ← push màn hình khoá
[CT3] ⏰ Nhắc nộp phiếu đánh giá — BHY ONE ← tiêu đề email
```

| Nhãn | Cấu phần | Ai gắn |
|---|---|---|
| `[CT2]` | Chiêu thức 2 — đầu việc, nhịp, phê duyệt tín dụng | `notify-ct2` (tự suy từ thân tin) |
| `[CT3]` | Chiêu thức 3 — hành động phát triển, đánh giá, biểu mẫu | `notify-ct2`, `send-hr-notification` |
| `[Dấu ấn]` | Dấu ấn BHY Mark | `notify-ct2` |
| `[Quizzi]` | BHY Quizzi | `quiz-reminders` |
| `[Mẹo]` | Mẹo tính năng toàn cổng | `send-feature-tip-push` |
| *(không nhãn)* | Tin hạ tầng toàn cổng: lịch nghỉ, email xác thực | — |

**Kết quả rà soát — 3 chỗ đang lệch, đã xử lý 2:**

1. ✅ **Chuông trong ứng dụng không có nhãn, trong khi push thì có.** Bản `notify-ct2`
   đang chạy gắn `[CT2]/[CT3]/[Dấu ấn]` theo nhãn dòng đầu của thân tin, nhưng chuông
   trong app chỉ hiện biểu tượng mức — cùng một tin, hai nơi hiển thị khác nhau. Đã thêm
   `moduleThongBao()` vào `src/lib/ct2.ts` (trùng luật với `nhanPhanHe()` của
   `notify-ct2`, có kiểm thử) và hiện nhãn trong chuông.
2. ✅ **Mức KHEN 🔥 chỉ có ở push.** Chuông hiện 🔔 cho tin khen chuỗi đúng giờ trong khi
   push hiện 🔥. Đã bổ sung `KHEN: '🔥'` vào `CT2_DAU_MUC` ở client.
3. ⏳ **Ba hàm gửi thẳng chưa có nhãn**: `send-reminders` (nhắc việc, chấm điểm đầu mối,
   toàn cảnh), `weekly-kanban-digest`, `notify-kanban-update` — đều thuộc **CT3**. Chưa
   sửa vì đây đúng 3 hàm mà **repo đang cũ hơn máy chủ** (xem cảnh báo ở Bước 4); sẽ gắn
   `[CT3]` khi hợp nhất mã từ máy chủ lúc deploy.

## Phần code đã sửa sẵn (dành cho người kỹ thuật)

Nhánh `claude/cloudflare-domain-change-0dptld`:

- `supabase/functions/_shared/email-config.ts` — mặc định `APP_URL` →
  `https://bachungyenone.com`, `FROM_DOMAIN` → `bachungyenone.com`; thêm `FROM_NAME`
  (secret `EMAIL_FROM_NAME`, mặc định **`BHY ONE`**).
- `supabase/functions/_shared/staff.ts` — fallback `resolveSiteUrl()` → domain mới.
- `send-reminders`, `weekly-kanban-digest`, `send-hr-notification`,
  `send-transactional-email`, `ct2-nhip-bao-cao` — `SITE_NAME` hết hardcode `'chieuthuc3'`,
  nay lấy từ `FROM_NAME` (đổi tên hiển thị bằng secret, không cần sửa code).
- `supabase/functions/ct2-nhip-bao-cao/` — **mới đưa vào repo**, chép từ bản đang chạy
  trên Supabase (trước đó chỉ tồn tại trên máy chủ). Cần đối chiếu với bản máy chủ trước
  khi deploy.
- `src/lib/handoverMessage.ts` — fallback link đăng nhập → domain mới (đường chính vẫn là
  `window.location.origin`).
- `src/pages/EmailAdmin.tsx`, `src/pages/AddStaff.tsx` — chữ hiển thị cho người dùng.
- `README.md` — mục Production.
- `quiz-reminders` — `url` của push chuyển từ `${APP_URL}/quizzi` về `/quizzi` (tương đối),
  để đăng ký push ở domain cũ không bị đá sang domain mới. **Không** đổi VAPID key, không
  đổi `tag`, không sửa `public/sw.js`, không sửa `notify-kanban-update` / `notify-ct2` /
  `send-feature-tip-push` / phần push của `send-reminders` — các chỗ đó vốn đã dùng đường
  dẫn tương đối.

Nguyên tắc giữ nguyên: **domain là cấu hình, không phải code**. Mọi giá trị trên đều bị
secret ở Supabase ghi đè, nên lần đổi domain sau chỉ cần sửa secret + Bước 1, 2, 3.

Lịch sử lần chuyển trước (`343skill.com` → `chieuthuc3.com`, 14/07/2026) ở
`docs/quan-tri-email-2026-07.md` mục 0.

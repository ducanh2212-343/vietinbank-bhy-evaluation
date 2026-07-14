# Quản trị Email — Luồng tổng thể & Sổ tay vận hành

**Ngày:** 05/07/2026 — **cập nhật 14/07/2026: chuyển domain sang `chieuthuc3.com` (mục 0)**.
Gửi qua **Resend** riêng, không còn phụ thuộc Lovable ở đường gửi.

## 0. Chuyển domain sang chieuthuc3.com (14/07/2026)

**Bối cảnh:** `343skill.com` không còn truy cập được (web chết); app chạy tạm tại
`https://343-noi-bo.ducanh2212.workers.dev` (Cloudflare Worker `343-noi-bo`). Đường GỬI
email domain cũ lúc đó vẫn sống (nhắc việc về Inbox đều 08:00 hằng ngày 08–14/07) nhưng
phụ thuộc DNS của domain đã mất kiểm soát → chuyển hẳn sang domain mới **`chieuthuc3.com`**
(mua trên Cloudflare): cả link đích trong email lẫn địa chỉ gửi
(`noreply@343skill.com` → `noreply@chieuthuc3.com`).

**Code (đã sửa trong repo):** cấu hình domain tập trung ở
`supabase/functions/_shared/email-config.ts` — đọc secret `APP_URL` /
`EMAIL_FROM_DOMAIN` / `EMAIL_SENDER_DOMAIN`, fallback `chieuthuc3.com`. Các function
`auth-email-hook`, `send-reminders`, `send-hr-notification`, `send-transactional-email`,
`reset-staff-password` (+ `resolveSiteUrl` trong `_shared/staff.ts`) dùng chung config này.
Frontend: tin nhắn bàn giao lấy `window.location.origin` (hết hardcode domain).

**Runbook cutover (thứ tự an toàn — làm đúng thứ tự thì email không bao giờ ngừng gửi):**

1. **Gắn domain vào app:** Cloudflare → Workers & Pages → worker `343-noi-bo` → Settings →
   **Domains & Routes** → *Add* → **Custom Domain** → `chieuthuc3.com` (thêm cả
   `www.chieuthuc3.com` nếu muốn). Domain cùng tài khoản Cloudflare nên DNS + chứng chỉ
   tự cấu hình sau ~1 phút. Kiểm tra: mở `https://chieuthuc3.com` thấy app; mở thẳng
   `https://chieuthuc3.com/dat-lai-mat-khau` không bị 404 (SPA fallback của Worker).
2. **Verify Resend:** Resend → Domains → Add `chieuthuc3.com` → copy đủ các bản ghi
   (SPF TXT, DKIM, MX của return-path — thường trên `send`/`notify` subdomain) vào
   Cloudflare DNS (**DNS only — tắt đám mây cam** cho các bản ghi này) → thêm TXT
   `_dmarc.chieuthuc3.com` = `v=DMARC1; p=none; rua=mailto:ducanh2212@gmail.com`
   → bấm Verify tới khi tất cả xanh.
3. **Supabase:** Edge Functions → Secrets → `APP_URL = https://chieuthuc3.com`.
   Authentication → URL Configuration → **Site URL** = `https://chieuthuc3.com`;
   **Redirect URLs** thêm `https://chieuthuc3.com/dat-lai-mat-khau` và
   `https://343-noi-bo.ducanh2212.workers.dev/dat-lai-mat-khau` (đường lui khi cần
   vào bằng workers.dev).
4. **Deploy** các function: `auth-email-hook`, `send-reminders`, `send-hr-notification`,
   `send-transactional-email`, `reset-staff-password`, `create-staff-user`,
   `bulk-create-staff-users`, `approve-registration`. (Chỉ deploy SAU khi bước 2 xanh.)
5. **Kiểm chứng:** gửi email test → from `noreply@chieuthuc3.com`, vào Inbox, link trỏ
   `https://chieuthuc3.com`; Quên mật khẩu → email mới có
   `redirect_to=https://chieuthuc3.com/dat-lai-mat-khau` → bấm vào đúng form;
   sáng hôm sau email nhắc việc 08:00 mang from + link domain mới.

**Bài học khi cutover thật (14/07):**
- **API key Resend bị scope theo domain cũ** → lần gửi đầu từ `@chieuthuc3.com` lỗi
  `Resend 400: The associated domain with your API key is not verified`. Xử lý: tạo API key
  mới **Full access** (Resend → API Keys) → thay secret `RESEND_API_KEY` ở Supabase (hiệu
  lực ngay, không cần deploy). Key cũ scoped-343skill nên xóa sau khi ổn định.
- `sender_domain` trong payload email **không ảnh hưởng đường Resend** (chỉ đường Lovable
  cũ dùng) — Resend tự chọn return-path theo domain đã verify (`send.chieuthuc3.com`).
- **Đã kiểm chứng 14/07:** email test từ `noreply@chieuthuc3.com` vào **Inbox** Gmail
  (message "sent" trong `email_send_log`, không vào Spam).

**Rollback khẩn cấp** (Resend domain mới trục trặc): set secret
`EMAIL_FROM_DOMAIN=343skill.com` (+ `EMAIL_SENDER_DOMAIN=notify.343skill.com`) — có hiệu
lực ngay, không cần deploy lại; link đích giữ nguyên `APP_URL`. (Key Full access mới gửi
được cả 2 domain nên rollback không vướng.)

**Lưu ý sau chuyển:**
- Domain mới chưa có "uy tín gửi" → 1–2 tuần đầu email có thể vào Spam; dặn người dùng
  kiểm tra Spam + bấm "Not spam"; theo dõi trang Quản trị Email. DMARC giữ `p=none`
  giai đoạn đầu, ổn định rồi nâng `p=quarantine` (sửa TXT `_dmarc` ở Cloudflare).
- **Tài khoản đăng nhập dạng `...@343skill.com` KHÔNG bị ảnh hưởng** — email đăng nhập chỉ
  là định danh tài khoản, không phải hộp thư nhận.
- Link trong các email CŨ đã gửi vẫn trỏ domain cũ (không sửa được); email mới sẽ đúng.
- Các mốc "343skill.com" trong các mục dưới đây là lịch sử cấu hình cũ (giữ để tra cứu).

## 1. Bản đồ luồng email (4 đường)

```
┌─ 1. EMAIL XÁC THỰC (Auth) ──────────────────────────────────────────────┐
│ Quên mật khẩu / link đặt mật khẩu khi cấp tài khoản / đổi email          │
│ Supabase Auth ──Send Email Hook──▶ auth-email-hook (verify chữ ký)       │
│   ──▶ hàng đợi auth_emails (ưu tiên cao)                                 │
│   ──▶ process-email-queue (cron 30s) ──▶ Resend ──▶ noreply@343skill.com │
│ ⚠ Cần BẬT hook trên Dashboard (mục 4) — chưa bật thì Auth dùng SMTP      │
│   mặc định của Supabase (mail.app.supabase.io, giới hạn ~2-4 email/giờ). │
└──────────────────────────────────────────────────────────────────────────┘

┌─ 2. MẬT KHẨU TẠM (không bao giờ gửi mật khẩu qua email) ─────────────────┐
│ Thêm cán bộ / Nhập nhanh / Upload / Cấp lại mật khẩu / Duyệt đăng ký     │
│ Server sinh ngẫu nhiên 16 ký tự ──▶ hiện 1 LẦN cho admin                 │
│   ──▶ bàn giao riêng (Zalo/SMS, có tin nhắn soạn sẵn)                    │
│   ──▶ bắt buộc đổi mật khẩu ở lần đăng nhập đầu (must_change_password)   │
│                                                                          │
│ Cấp lại mật khẩu (Sửa cán bộ / Chi tiết cán bộ) có 2 lựa chọn:           │
│  • Sinh mã tạm (mặc định) — hiện mã để admin bàn giao tay.               │
│  • "Gửi email link cho cán bộ" — gửi LINK đặt lại (đường 1 qua Resend),  │
│    cán bộ tự đặt mật khẩu, admin KHÔNG thấy; mật khẩu cũ vẫn dùng được   │
│    tới khi cán bộ đặt lại. Ghi audit reset_staff_password_email.         │
└──────────────────────────────────────────────────────────────────────────┘

┌─ 3. EMAIL THÔNG BÁO ────────────────────────────────────────────────────┐
│ • Nhắc việc hằng ngày 08:00 (send-reminders, cron send-reminders-daily) │
│ • Duyệt/từ chối đăng ký (send-transactional-email, có unsubscribe)      │
│ Tất cả ──▶ hàng đợi transactional_emails ──▶ dispatcher ──▶ Resend      │
└──────────────────────────────────────────────────────────────────────────┘

┌─ 4. QUẢN TRỊ ───────────────────────────────────────────────────────────┐
│ Trang "Quản trị Email" (sidebar → Cấu hình/Hệ thống, chỉ admin):        │
│ 30 email gần nhất, lỗi 7 ngày, hàng đợi + DLQ, trạng thái cron,          │
│ số địa chỉ bị chặn. RPC admin_email_overview() — chặn non-admin.         │
└──────────────────────────────────────────────────────────────────────────┘
```

Tính bền của pipeline (đã có sẵn, dùng chung mọi đường):
- **Retry + rate-limit**: lỗi 429/403 tạm dừng theo `retry_after`, thử lại tự động.
- **Idempotency**: mỗi email có khóa chống gửi trùng (chạy lại không gửi 2 lần).
- **DLQ**: thất bại nhiều lần → chuyển hàng đợi lỗi (`*_dlq`) để soi, không kẹt hàng đợi chính.
- **Suppression**: người bấm unsubscribe không nhận tiếp email thông báo (đường 3).

## 2. Kết quả rà soát 05/07 & đã sửa

| Phát hiện | Mức | Đã xử lý |
|---|---|---|
| Email reset mật khẩu đi qua SMTP mặc định Supabase (kiểm chứng bằng log Auth: `mail_from: noreply@mail.app.supabase.io`) — giới hạn ~2-4 email/giờ, dễ vào spam | 🔴 | Viết lại `auth-email-hook` theo chuẩn Send Email Hook (chữ ký standardwebhooks), tiếng Việt, đi qua Resend. **Chờ bạn bật hook (mục 4)** |
| `auth-email-hook` cũ là mã chết + khóa chữ ký Lovable (`LOVABLE_API_KEY`) | 🔴 | Đã thay bằng bản mới, hết phụ thuộc Lovable |
| Duyệt đăng ký: mật khẩu tạm = 8 số cuối SĐT (đoán được), email còn ghi gợi ý | 🔴 | Server tự sinh ngẫu nhiên, hiện 1 lần cho người duyệt kèm tin nhắn bàn giao; email không còn chứa gợi ý mật khẩu; thêm audit log duyệt/từ chối |
| Không có nơi nào cho admin thấy email gửi thành công/lỗi | 🟡 | Trang **Quản trị Email** + RPC `admin_email_overview()` (đã kiểm chứng: admin xem được, employee bị chặn) |
| Tiêu đề email Auth bằng tiếng Anh ("Reset your password") | 🟢 | Đã Việt hóa toàn bộ tiêu đề |

Thiết kế mật khẩu tạm hiện tại (giữ nguyên — đúng chuẩn):
sinh ngẫu nhiên phía server → hiện 1 lần → bàn giao ngoài luồng email → bắt đổi ngay lần đầu.
Trang Quên mật khẩu (`/quen-mat-khau`) + trang đặt lại (`/dat-lai-mat-khau`) hoạt động sẵn.

## 3. Vận hành hằng ngày (runbook)

- **Xem sức khỏe email**: Sidebar → *Quản trị Email*. Nhìn 3 thứ:
  1. "Lỗi 7 ngày" > 0 → xem cột Lỗi của bảng 30 email gần nhất.
  2. Cảnh báo DLQ đỏ → email hỏng lặp lại (thường do `RESEND_API_KEY` hết hạn / địa chỉ sai).
  3. Cron "Bộ gửi email" phải *Đang bật* + *Lần cuối: OK*.
- **Tạm dừng nhắc việc**: SQL Editor → `select cron.unschedule('send-reminders-daily');`
  (bật lại theo `supabase/migrations/20260705140000_send_reminders_cron_enable_notes.sql`).
- **Xem trước nhắc việc sẽ gửi cho ai** (không gửi): gọi function `send-reminders`
  body `{"dry_run": true}` bằng tài khoản admin.
- **Đổi RESEND_API_KEY** (rotate định kỳ / lộ key): Resend → tạo key mới → Supabase →
  Edge Functions → Secrets → cập nhật `RESEND_API_KEY` → xóa key cũ ở Resend. Không cần deploy lại.
- **DMARC**: sau 1–2 tuần chạy ổn, nâng TXT `_dmarc` từ `p=none` lên `p=quarantine` (ở Vercel DNS).

## 4. Bật Send Email Hook — ĐÃ HOÀN TẤT 05/07/2026 ✅

Đã làm (ghi lại để tra cứu / làm lại khi cần):
1. Edge Functions → `auth-email-hook` → tắt "Enforce JWT verification"
   (Auth gọi hook bằng chữ ký standardwebhooks, không phải JWT).
2. Authentication → Hooks → "Send Email hook" → Enable → HTTPS →
   URL `https://whlysprzsguehxmrjwha.supabase.co/functions/v1/auth-email-hook` → Generate secret.
3. Edge Functions → Secrets → `SEND_EMAIL_HOOK_SECRET` = secret ở bước 2.
4. Authentication → URL Configuration → Redirect URLs: thêm
   `https://343skill.com/dat-lai-mat-khau` và `https://www.343skill.com/dat-lai-mat-khau`.
5. **Đã kiểm chứng end-to-end**: Quên mật khẩu → email tiếng Việt từ
   `343 Phát triển nhân sự <noreply@343skill.com>` (log: pending → sent qua Resend) →
   bấm link → vào form Đặt lại mật khẩu → đổi mật khẩu thành công.

Lưới an toàn trong app (`useAuth`): mọi phiên vào bằng link đặt-lại-mật-khẩu đều bị ép
chuyển về `/dat-lai-mat-khau`, kể cả khi Auth trả về trang chủ (redirect_to thiếu/ngoài allow-list).

**Việc dọn dẹp cuối (khuyến nghị):** xóa secret `LOVABLE_API_KEY` ở Supabase → Edge
Functions → Secrets — không còn mã nào dùng; xóa xong là thoát Lovable 100%.
Nếu cần quay về SMTP mặc định khẩn cấp: Authentication → Hooks → tắt "Send Email hook".

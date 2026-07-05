# Quản trị Email — Luồng tổng thể & Sổ tay vận hành

**Ngày:** 05/07/2026. Domain `343skill.com` (đã transfer về Vercel), gửi qua **Resend** riêng
(SPF/DKIM/DMARC = PASS), không còn phụ thuộc Lovable ở đường gửi.

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
│ Tùy chọn "gửi email" khi thêm cán bộ = gửi LINK đặt mật khẩu (đường 1),  │
│ không phải mật khẩu.                                                     │
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

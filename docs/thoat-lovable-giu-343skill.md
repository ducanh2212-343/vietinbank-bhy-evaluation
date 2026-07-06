# Thoát Lovable, GIỮ tên miền 343skill.com (phương án A)

Mục tiêu: web ở Vercel (đã xong), **domain do bạn tự sở hữu**, **email qua Resend của riêng bạn** —
không còn phụ thuộc Lovable. KHÔNG cần domain mới.

## Còn dính Lovable ở đâu
1. **Đăng ký/quản lý domain** `343skill.com` qua Lovable → cần TRANSFER ra ngoài.
2. **Gửi email** qua dịch vụ Lovable (`@lovable.dev/email-js`, `LOVABLE_API_KEY`) → cần chuyển sang Resend.
   (Hosting đã ở Vercel, độc lập rồi.)

## Phần BẠN làm

### 1. Transfer domain 343skill.com sang nhà đăng ký độc lập
- Chọn nhà đăng ký: **Cloudflare Registrar** (rẻ, DNS miễn phí) hoặc nhà đăng ký VN.
- Trong Lovable: mở khóa domain (unlock) + lấy **mã EPP/Auth code**.
- Ở nhà đăng ký mới: nhập domain + EPP code để nhận transfer. Duyệt email xác nhận.
- Lưu ý: ICANN khóa transfer 60 ngày kể từ khi mua/transfer gần nhất — nếu chưa đủ thì chờ.
- Giữ **nameservers vẫn trỏ Vercel** (ns1/ns2.vercel-dns.com) để web không gián đoạn — chỉ đổi CHỦ SỞ HỮU domain, không đổi nơi trỏ web.

### 2. Mở Resend + verify domain
- Đăng ký https://resend.com (gói free ~3.000 email/tháng — đủ cho 110 người).
- Add domain `343skill.com`. Resend hiện ra các bản ghi DNS (SPF/DKIM, và MX/return-path cho subdomain gửi).
- **Thêm các bản ghi đó Ở NƠI QUẢN DNS** — hiện là **Vercel** (Domain → DNS Records → Add). Đúng Type/Name/Value.
- Thêm **DMARC** (TXT `_dmarc.343skill.com`): `v=DMARC1; p=none; rua=mailto:email-cua-ban@343skill.com` (giám sát 1–2 tuần rồi nâng `p=quarantine`).
- Bấm Verify trong Resend đến khi xanh.
- Lấy **RESEND_API_KEY** (API Keys → Create).

### 3. Cắt sang Resend (không gãy)
- Vào **Supabase → Project Settings → Edge Functions → Secrets**, thêm secret `RESEND_API_KEY = <key của bạn>`.
- Báo mình → mình **deploy lại hàm `process-email-queue`** (đã sửa sẵn trong code) để kích hoạt đường Resend.
- (Tùy chọn) sau khi chạy ổn, xóa secret `LOVABLE_API_KEY` để dứt hẳn Lovable.

## Phần MÌNH đã làm sẵn (trong code)
- Sửa `supabase/functions/process-email-queue/index.ts`: thêm đường gửi qua **Resend**.
  - Nếu có `RESEND_API_KEY` → gửi qua Resend; nếu chưa → vẫn dùng Lovable như cũ.
  - **Cutover không gãy**: chưa set key thì mọi email chạy y như hiện tại; set key + deploy lại là tự chuyển.
  - Giữ nguyên logic retry/rate-limit (429/403), idempotency (gửi kèm `Idempotency-Key`).
- Không thay đổi `343skill.com` / `notify.343skill.com` / `APP_URL` (giữ tên miền cũ theo phương án A).

## Thứ tự an toàn (tóm tắt)
1. Transfer domain (giữ NS Vercel) — có thể làm song song.
2. Verify `343skill.com` trong Resend + thêm SPF/DKIM/DMARC **ở Vercel**.
3. Set secret `RESEND_API_KEY` ở Supabase → báo mình deploy lại `process-email-queue`.
4. Gửi 1 email test cho chính bạn → kiểm tra **SPF/DKIM/DMARC = pass**, vào Inbox.
5. Ổn → bật cron `send-reminders` (mục 4.4 của `docs/cai-tien-dot-4-2026-07.md`).
6. (Tùy chọn) xóa `LOVABLE_API_KEY`.

## Kiểm chứng đã "thoát Lovable"
- Email header `Received`/`DKIM-Signature` là của **resend / amazonses**, không phải lovable.
- Domain WHOIS trỏ nhà đăng ký mới của bạn.
- Web vẫn phục vụ bởi Vercel như cũ.

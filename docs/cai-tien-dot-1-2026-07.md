# ĐỢT CẢI TIẾN 1 — Vá nhanh trước triển khai chính thức

**Ngày:** 05/07/2026
**Bối cảnh:** 110 cán bộ, chưa mở rộng cho nhiều người. Ưu tiên chặn các rủi ro mất dữ liệu, đứt quy trình và lỗ hổng truy cập trước khi dùng chính thức.
**Kết quả kỹ thuật:** TypeScript sạch, build thành công, 17/17 unit test pass.

---

## A. Sửa mã nguồn (nhánh `claude/banking-hr-digital-review-ivbny9`)

| # | Vấn đề gốc | Đã sửa | File |
|---|-----------|--------|------|
| 1 | Lưu Tự đánh giá gây lỗi khóa ngoại → **mất sạch hành động AI (mục F)** | Remap liên kết `linked_attitude_priority_id` qua ánh xạ *id priority cũ → dimension → id priority mới* (bắt ở thời điểm load bằng `useRef`); không khớp thì để `null` thay vì để vỡ FK | `src/pages/SelfAssessmentPage.tsx` |
| 2 | Trưởng phòng **sửa được cột tự đánh giá / minh chứng / nhận xét của cán bộ** — không dấu vết, sai liêm chính | Vô hiệu hóa (disable) toàn bộ ô thuộc về cán bộ khi ở chế độ Trưởng phòng (mức tự đánh giá, minh chứng, nhận xét NV ở cả skill và thái độ) | `src/components/evaluation/EvalSectionB.tsx`, `EvalSectionC.tsx` |
| 3 | "Xác nhận rà soát" vẫn **chuyển phiếu cho PGĐ dù lưu nội dung thất bại** | `handleSave` trả về `true/false`; chỉ chuyển trạng thái `reviewed` khi lưu thành công, ngược lại báo lỗi và dừng | `src/pages/StaffEvaluation.tsx` |
| 4 | Cán bộ **không thấy lý do bị trả phiếu** trên trang Tự đánh giá | Nạp `return_reason`/`returned_by` và hiển thị đúng lý do trả lại; nếu người duyệt chưa ghi lý do thì hiện hướng dẫn liên hệ | `src/lib/evaluationPersistence.ts`, `src/pages/SelfAssessmentPage.tsx` |
| 5 | **Cán bộ nghỉ việc (status ≠ active) vẫn đăng nhập được** | Kiểm tra `profiles.status` khi xác thực; nếu không còn `active` thì tự đăng xuất + thông báo, chặn vào hệ thống | `src/hooks/useAuth.tsx` |

## B. Vá bảo mật & toàn vẹn dữ liệu (đã áp dụng trên CSDL production + có migration trong repo)

Migration: `supabase/migrations/20260704180000_security_hardening_revoke_anon_and_form_unique.sql`

1. **Thu hồi quyền gọi REST API của các hàm nhạy cảm với người CHƯA đăng nhập (anon):**
   - 4 hàm hàng đợi email (`enqueue_email`, `delete_email`, `read_email_batch`, `move_to_dlq`) → chỉ còn edge function (service_role) gọi được.
   - 6 hàm Kanban (`move_kanban_card`, `update_kanban_progress`, `request_kanban_completion`, `confirm_kanban_completion`, `return_kanban_card`, `kanban_upsert_card`) → chặn anon; 5 hàm client vẫn dùng được cho người đã đăng nhập.
   - 11 hàm trigger nội bộ → gỡ hoàn toàn khỏi API.
   - **Đã kiểm chứng:** 13/13 hàm nhạy cảm không còn gọi được bởi anon; 5/5 hàm Kanban của client vẫn hoạt động cho `authenticated`.
2. **Cố định `search_path`** cho 4 hàm email (dọn cảnh báo mutable search_path).
3. **Ràng buộc `UNIQUE(employee_id, cycle_id)`** trên `form_submissions` → chống sinh 2 phiếu cho cùng cán bộ cùng quý (đã kiểm tra không có bản trùng hiện tại).

Kết quả: các cảnh báo bảo mật nguy hiểm nhất (26 hàm anon-callable dạng thao tác dữ liệu) đã được xử lý. Còn lại là nhóm hàm helper phục vụ RLS (bắt buộc để signed-in user chạy được truy vấn — giữ nguyên) và 2 mục cấu hình trên Dashboard (mục C).

## C. Cần bật thủ công trên Supabase Dashboard (không làm được bằng SQL)

- **Bật Leaked Password Protection** (Auth → Policies): chặn mật khẩu đã lộ theo HaveIBeenPwned.
- **Siết quyền liệt kê 2 bucket public** (`avatars`, `skill-images`): bỏ policy SELECT rộng cho phép liệt kê toàn bộ file (truy cập ảnh qua URL trực tiếp vẫn hoạt động bình thường).
- Cân nhắc bật **MFA** cho tài khoản `system_admin`/BGĐ.

---

## Các hạng mục P0/P1 lớn hơn còn lại (đề xuất đợt 2)

Những việc này cần thay đổi kiến trúc/nhiều thời gian hơn, không đưa vào đợt vá nhanh:

1. **Chuyển tầng lưu phiếu sang RPC transaction** (thay `delete-all + reinsert` rời rạc) — chấm dứt tận gốc rủi ro mất dữ liệu khi lưu và việc reset tiến độ Kanban mỗi lần lưu phiếu.
2. **Màn hình duyệt Kanban cho quản lý** (RLS/RPC backend đã sẵn sàng) — khép khâu "chờ QL xác nhận".
3. **Khóa lạc quan + RLS bảng con theo trạng thái phiếu** — chống ghi đè từ tab cũ / 2 người sửa.
4. **Hợp nhất nguồn dữ liệu xếp sao** về `staff_star_classifications` + lọc theo kỳ.
5. **Đồng bộ email khi sửa** + gói "Bàn giao nhân sự" khi chuyển phòng/nghỉ việc + lưu trữ trước khi xóa.

(Chi tiết đầy đủ: `docs/bao-cao-ra-soat-toan-dien-2026-07.md`.)

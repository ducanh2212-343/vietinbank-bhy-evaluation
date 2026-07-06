# ĐỢT CẢI TIẾN 2 — Khép vòng phát triển & chống mất dữ liệu tận gốc

**Ngày:** 05/07/2026
**Kết quả kỹ thuật:** TypeScript sạch, build thành công, 17/17 unit test pass. RPC đã kiểm chứng ở tầng SQL (test round-trip có rollback).

---

## A. Màn hình duyệt Kanban cho quản lý (khép khâu "chờ xác nhận")

**File:** `src/components/kanban/TeamReviewPanel.tsx` (mới), `src/pages/PersonalKanbanPage.tsx`, `src/components/kanban/CardDetailDialog.tsx`

- Trang "Hành động phát triển" nay có 2 tab cho quản lý (TP/PGĐ/BGĐ/admin): **"Của tôi"** (giữ nguyên) và **"Đội ngũ"**.
- Tab "Đội ngũ": tải cán bộ trong phạm vi (`scope` all/block/department), tải thẻ Kanban theo lô 100, **kiểm tra lỗi mọi truy vấn** (không nuốt lỗi).
  - **Hàng đợi "Chờ xác nhận"** trên cùng: thẻ `waiting_manager_confirmation`, mỗi dòng có nút "Xem & duyệt" → mở dialog có nút **Xác nhận hoàn thành / Yêu cầu làm tiếp** (trước đây không có đường nào tới các nút này → thẻ treo vĩnh viễn).
  - Tổng quan theo cán bộ (accordion): đếm todo/doing/done, quá hạn, chờ duyệt; chỉ xem — không kéo-thả/sửa thẻ người khác.
- Backend (RLS theo `can_view_profile`, RPC `confirm_kanban_completion`/`return_kanban_card` chặn tự xác nhận) đã có sẵn — chỉ bổ sung UI, không sửa DB.

## B. Lưu phiếu ATOMIC + giữ tiến độ Kanban (RPC `save_evaluation_children`)

**File:** `supabase/migrations/20260705090000_save_evaluation_children_atomic_rpc.sql` (đã áp dụng production), `src/lib/evaluationPersistence.ts`, `src/pages/SelfAssessmentPage.tsx`

Nguyên nhân gốc đã xử lý:
- **Mất dữ liệu khi lưu lỗi giữa chừng**: trước đây mỗi lần lưu là chuỗi `delete-toàn-bộ + insert lại` rời rạc; lỗi sau bước delete → mất sạch. Nay gói trong **một RPC chạy trong giao dịch** → lỗi tự rollback, không mất gì.
- **Reset tiến độ Kanban mỗi lần lưu phiếu**: thẻ Kanban gắn theo `source_action_id`; trước đây hành động bị xóa-tạo-lại với UUID mới → thẻ cũ bị archive, thẻ mới về 0%. RPC nay **UPSERT hành động theo id** (giữ UUID) và **UPSERT priority theo khóa tự nhiên** (`form_id, skill_id` / `form_id, attitude_dimension_id`) → thẻ Kanban giữ nguyên tiến độ/lịch sử.
- **Lỗi FK làm mất mục AI** và **nhận xét TP bị xóa khi cán bộ lưu**: RPC resolve liên kết AI theo khóa tự nhiên (không còn id cũ mồ côi); trang Tự đánh giá nay gửi kèm id + nhận xét TP đã load nên **không ghi đè mất nhận xét/ dòng hành động do TP thêm**.

Thuộc tính an toàn của RPC:
- **`SECURITY INVOKER`** → chạy dưới quyền người gọi, **RLS từng bảng con vẫn áp dụng** (không mở thêm quyền); `anon` không gọi được.
- **Chống null-out**: cột `NOT NULL` trên đường UPDATE luôn `COALESCE` về giá trị cũ → payload thiếu trường không bao giờ ghi null đè lên dữ liệu đang có.
- **Đã kiểm chứng** (test round-trip có rollback trên phiếu thật): UUID hành động được giữ, UUID priority được giữ, không mất dòng, và payload thiếu trường không gây lỗi.

Kiểm chứng bảo mật kèm theo: RPC `save_evaluation_children` cũng đã `REVOKE ... FROM anon`, chỉ `authenticated` gọi được.

---

## C. Trạng thái triển khai & việc cần làm

- **Đã LIVE trên CSDL production** (an toàn, chỉ thêm hàm — không hàm nào tự chạy cho tới khi frontend mới deploy): RPC `save_evaluation_children`.
- **Trên nhánh, chờ deploy**: UI Kanban đội ngũ + trang Tự đánh giá gọi RPC.

**Cần kiểm thử trên preview trước khi deploy production** (đường lưu phiếu là lõi dữ liệu):
1. Cán bộ tạo phiếu, nhập skill/thái độ/hành động, **Lưu nháp** → mở lại thấy đủ.
2. Thêm 1 hành động phát triển → thẻ Kanban xuất hiện; cập nhật tiến độ 50% trên Kanban.
3. Quay lại phiếu sửa 1 chữ, **Lưu nháp** lại → **thẻ Kanban vẫn 50%** (không reset về 0%).
4. TP mở phiếu, thêm nhận xét vào 1 hành động → cán bộ lưu lại → **nhận xét TP còn nguyên**.
5. Quản lý mở tab "Đội ngũ" → duyệt thẻ "Chờ xác nhận" của cấp dưới.

**Bước tiếp theo (đợt 3):** áp dụng cùng RPC cho **trang Đánh giá cán bộ (Trưởng phòng)** và **BM01/02/03**. Cho tới khi đó, **thao tác lưu của Trưởng phòng vẫn theo cơ chế cũ** (vẫn có thể reset Kanban khi TP lưu) — không gây mất/hỏng dữ liệu, chỉ chưa giữ tiến độ Kanban. Nên wiring nốt sau khi đã xác thực đường cán bộ trên preview.

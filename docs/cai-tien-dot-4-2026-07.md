# ĐỢT CẢI TIẾN 4 — Các hạng mục còn lại từ báo cáo rà soát

**Ngày:** 05/07/2026. TypeScript sạch, build OK, 17/17 test pass ở mỗi bước.

## 4.1. Hợp nhất nguồn dữ liệu xếp sao (đã xong)

**Vấn đề:** Báo cáo đọc bảng chuẩn `staff_star_classifications`, còn Tổng quan / Phân nhóm cán bộ / Đội ngũ phòng ban / Danh sách cán bộ / Chi tiết cán bộ đọc bảng cũ `admin_evaluations.classification`, KHÔNG lọc theo kỳ → số liệu 4 nhóm sao lệch nhau giữa các trang; ma trận cộng dồn nhiều kỳ (1 cán bộ xuất hiện nhiều nhóm), tile "Chưa phân nhóm" có thể âm.

**Sửa:**
- Thêm helper dùng chung `src/lib/starClassification.ts`:
  - `fetchDefaultCycle()` — kỳ quý mới nhất.
  - `fetchStarByEmployee(cycleId)` — bản đồ xếp sao/cán bộ, chọn bản ghi ưu tiên **giống hệt logic của Báo cáo** (đã duyệt trước, cấp GĐ > PGĐ > TP) → đảm bảo mọi trang ra cùng con số.
  - Hằng số nhãn/màu nhóm sao dùng chung.
- Chuyển 5 trang sang nguồn chuẩn, lọc theo **kỳ mới nhất**: `Overview` (đếm mỗi cán bộ tối đa 1 lần → hết âm "Chưa phân nhóm"), `StaffGrouping` (lọc `status='active'`, hiển thị tên kỳ, hết cộng dồn nhiều kỳ), `StaffList`, `TeamOverview` (cột "Nhóm"), `StaffDetail` (badge nhóm).
- Không đổi bảng/ghi dữ liệu — chỉ đổi đường ĐỌC hiển thị. Các cột legacy khác (mức skill, completion_status) tạm giữ nguyên (ngoài phạm vi hợp nhất xếp sao).

**Lưu ý:** Hiện cả hai bảng đều rỗng (đang pilot) nên chưa thấy khác biệt trực quan; đây là sửa PHÒNG NGỪA để khi bắt đầu xếp sao kỳ tới, số liệu đồng nhất mọi trang.

## 4.2. Khóa lạc quan chống ghi đè từ tab cũ / 2 người cùng sửa (đã xong)

**Vấn đề (P1-9):** cán bộ mở phiếu ở 2 tab; tab 1 nộp lại → TP duyệt (phiếu thành reviewed/approved). Tab 2 (state cũ) bấm Lưu → bảng con bị ghi đè bằng dữ liệu cũ (RLS bảng con không khóa theo trạng thái), còn update form_submissions bị RLS chặn 0 dòng im lặng → toast "Đã lưu" nhưng thực chất ghi đè phiếu đã duyệt.

**Sửa:** thêm kiểm tra lạc quan (read-only, không đụng quyền) ở `SelfAssessmentPage` và `StaffEvaluation`:
- Ghi lại mốc `updated_at` của phiếu tại thời điểm MỞ (ref).
- Khi Lưu, đọc lại `updated_at` hiện tại; nếu KHÁC mốc lúc mở → phiếu đã bị thay đổi ở nơi khác → **dừng ngay, không ghi bất kỳ bảng con nào**, hiện thông báo "Phiếu đã được cập nhật ở nơi khác… vui lòng tải lại trang".
- Sau mỗi lần lưu thành công, `loadData()` làm mới mốc → các lần lưu liên tiếp của cùng người không bị báo nhầm.

Ưu điểm: chỉ đọc nên chạy cho MỌI vai trò (kể cả bgd/tcth_admin), không vướng vấn đề RLS-chặn-im-lặng. Còn khoảng TOCTOU rất nhỏ (chấp nhận được ở quy mô hiện tại). BM01/02/03 chưa gắn (ít khi chỉnh đồng thời) — có thể bổ sung sau nếu cần.

## 4.3. Cảnh báo bàn giao khi chuyển phòng / nghỉ việc (đã xong)

Khi sửa hồ sơ mà cán bộ đó ĐỔI PHÒNG hoặc chuyển sang NGHỈ VIỆC, `EditStaff` kiểm tra
xem họ có đang là Quản lý trực tiếp / PGĐ phụ trách của cán bộ active nào không. Nếu có →
hiện hộp thoại LIỆT KÊ các cán bộ bị ảnh hưởng (mỗi dòng là link mở hồ sơ để gán lại quản lý),
yêu cầu xác nhận trước khi lưu. Chỉ PHÁT HIỆN + xác nhận (không tự ghi đè hồ sơ ai) → an toàn,
tránh việc dây quản lý bị đứt âm thầm khiến phiếu kỳ tới đi lạc người.

## 4.4. Email nhắc việc (đã dựng + deploy, CHƯA bật lịch tự động)

Edge function `send-reminders` (đã deploy lên production) gom digest theo người nhận:
phiếu chờ TP rà soát, phiếu chờ PGĐ phê duyệt, thẻ Kanban chờ quản lý xác nhận — enqueue
vào hàng đợi email có sẵn (`transactional_emails`, do pg_cron xử lý mỗi 5 giây).

**An toàn khi triển khai:**
- `dry_run` MẶC ĐỊNH = true → chỉ trả về danh sách sẽ gửi, KHÔNG gửi. (Đã kiểm chứng logic
  digest ở tầng SQL: đúng người nhận, đúng số việc.)
- Quyền gọi: service_role (cron) hoặc user admin. `anon` không gọi được.
- Idempotency theo ngày (`reminder:<profile>:<YYYY-MM-DD>`) → chạy lại cùng ngày không gửi trùng.
- CHƯA lên lịch cron → không tự gửi cho tới khi bạn bật.

**Cách bật (khi đã sẵn sàng):**
1. Xem trước (không gửi): gọi function `send-reminders` với body `{"dry_run": true}` (hoặc rỗng)
   bằng tài khoản admin → xem `digests` sẽ gửi cho ai.
2. Gửi thật 1 lần: gọi với body `{"dry_run": false}` → kiểm tra email nhận được, định dạng OK.
3. Lên lịch hằng ngày (ví dụ 8h sáng) bằng pg_cron (chạy 1 lần trong SQL editor):
   ```sql
   select cron.schedule('send-reminders-daily', '0 1 * * *',  -- 01:00 UTC = 08:00 giờ VN
     $$ select net.http_post(
          url := 'https://whlysprzsguehxmrjwha.supabase.co/functions/v1/send-reminders',
          headers := jsonb_build_object('Authorization','Bearer <SERVICE_ROLE_KEY>','Content-Type','application/json'),
          body := '{"dry_run": false}'::jsonb) $$);
   -- Gỡ lịch: select cron.unschedule('send-reminders-daily');
   ```
   (Cần extension `pg_net` cho `net.http_post` — hạ tầng email đã bật pg_cron sẵn.)

**Lưu ý:** cần đảm bảo API key nhà cung cấp email đã cấu hình ở prod (bạn xác nhận email đang gửi được).
Nếu muốn, có thể thêm nút "Gửi nhắc việc ngay" trong trang Cài đặt cho admin (chưa làm — báo nếu cần).

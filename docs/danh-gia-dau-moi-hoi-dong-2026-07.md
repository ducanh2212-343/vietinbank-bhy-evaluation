# Đánh giá năng lực thực thi đầu mối chi nhánh (Hội đồng đánh giá) — 07/2026

Tính năng được xây dựng theo 4 tài liệu Chi nhánh cung cấp: **Cơ chế đánh giá Hội đồng đối với công tác
đầu mối**, **Phụ lục 1C — Bảng tổng hợp nhiệm vụ công tác đầu mối** (Thông báo ngày 25/06/2026),
**Mẫu phiếu đánh giá, chấm điểm thành viên Hội đồng** (10 tiêu chí, thang 10) và **Mẫu Báo cáo kết quả
đánh giá chi tiết có xử lý trọng số** (bản Quý 1/2026 của PGĐ Nguyễn Thị Thùy Linh).

## 1. Tính năng đã triển khai

| Trang | Đường dẫn | Ai dùng |
| --- | --- | --- |
| Đánh giá đầu mối (chấm điểm) | `/danh-gia-dau-moi` | Thành viên Hội đồng |
| Báo cáo đầu mối (xử lý trọng số, in được) | `/bao-cao-dau-moi` | Admin (BGĐ/TCTH/System) + cán bộ đầu mối xem kết quả của chính mình |
| Quản trị Hội đồng đầu mối | `/quan-tri-hoi-dong-dau-moi` | Admin |

- **Kỳ đánh giá:** đã khởi tạo sẵn 3 kỳ **Quý II/2026 (đang mở)**, **Quý III/2026**, **Quý IV/2026** (chưa mở).
  Admin mở/chốt kỳ tại tab *Kỳ đánh giá*; chỉ kỳ "Đang mở" nhận phiếu; kỳ "Đã chốt" khóa chỉnh sửa.
- **Bộ câu hỏi định hướng:** 10 tiêu chí × 2 phần (Phần I Năng lực triển khai TC1–TC5, Phần II Hiệu quả TC6–TC10),
  kèm đầy đủ **chuẩn hành vi tham chiếu 5 mốc điểm (10/8/6/3/0)**. Chỉnh sửa được **theo từng kỳ** tại tab
  *Bộ câu hỏi* (thêm/sửa/đổi thứ tự/ẩn/xóa, sao chép từ kỳ khác, khởi tạo lại từ bộ mặc định). Điểm đã chấm
  gắn theo tiêu chí nên sửa nội dung/đổi thứ tự không mất điểm; xóa tiêu chí sẽ xóa điểm chấm theo (có cảnh báo).
- **Danh sách đầu mối:** 6 cán bộ theo Phụ lục 1C được nạp sẵn cho cả 3 kỳ (3 PGĐ + TP KHDN + PTP Bán lẻ +
  PTP DVKH), kèm nhiệm vụ trọng tâm và phương thức đo lường. Đầu mối chưa có tài khoản vẫn được đánh giá bình thường.
- **Thành viên Hội đồng:** quản lý tại tab *Thành viên HĐ*, mỗi người thuộc một nhóm trọng số
  (Giám đốc / Phó Giám đốc / Thành viên khác). Đã nạp sẵn từ hồ sơ hiện có: GĐ Trần Đức Anh; 3 PGĐ
  (Thùy Linh, Thái Hoàng, Minh Hải); TP Đỗ Việt Anh; TP Vũ Thị Thu Hà; **bà Nguyễn Thị Phượng (đầu mối KPI)**.
- **Phiếu chấm điểm:** chọn kỳ → chọn đầu mối → chấm 10 tiêu chí (0–10, bước 0,5; nút nhanh 10/8/6/3/0 kèm
  tooltip chuẩn hành vi) → nhận xét 3 mục theo Mẫu phiếu (ưu điểm/hạn chế/đề xuất) + minh chứng ghi nhận →
  Lưu nháp hoặc Gửi. **Không tự chấm bản thân** (ẩn khỏi danh sách + chặn ở tầng CSDL). Đúng cơ chế mục I.3:
  điểm **≥ 9,5 hoặc ≤ 3 bắt buộc kèm nhận xét và minh chứng** mới gửi được. Phiếu đã gửi vẫn sửa được khi kỳ còn mở.
- **Báo cáo trọng số:** đúng bố cục mẫu — bảng chi tiết từng phiếu (người chấm **ẩn danh** dạng "Thành viên
  ẩn danh #xxx", trọng số, TC1–TC10, TB thô, ý kiến, minh chứng), bảng phân tích nhóm theo trọng số, điểm quy
  thang 100, xếp loại, khối ký xác nhận, nút **In báo cáo**.

## 2. Trọng số và công thức (đã kiểm chứng bằng unit test)

Theo mục III của Cơ chế đánh giá:

| Đầu mối được đánh giá | GĐCN | PGĐ phụ trách | PGĐ còn lại | Thành viên khác |
| --- | --- | --- | --- | --- |
| Cấp Phó Giám đốc | 20% | — | 15% | 65% |
| Cấp Trưởng phòng | 20% | 10% | 15% | 55% |

- Điểm TB thô mỗi phiếu = trung bình 10 tiêu chí. Điểm nhóm = trung bình các phiếu trong nhóm.
- **Điểm thang 100 = Σ(điểm nhóm × trọng số) ÷ Σ(trọng số các nhóm đã bỏ phiếu) × 10** — nhóm chưa bỏ phiếu
  được chuẩn hóa lại đúng như dòng "Tổng trọng số bỏ phiếu hiện có" của mẫu báo cáo.
- Unit test `src/lib/council.test.ts` tái lập chính xác số liệu mẫu Quý 1/2026: nhóm 8,75/8,45/8,12 → **82,93 điểm → Loại A**.
- **Ngưỡng xếp loại (giả định, cần Chi nhánh xác nhận):** ≥80 Hoàn thành Xuất sắc (A); 65–79,99 Hoàn thành Tốt (B);
  50–64,99 Hoàn thành (C); <50 Chưa hoàn thành (D). Mẫu báo cáo chỉ thể hiện 82,93 → Loại A nên các mốc còn lại
  được suy luận theo thông lệ xếp hạng — chỉnh tại `classifyCouncilScore` trong `src/lib/council.ts` nếu Quy chế khác.

## 3. Phân quyền & bảo mật

- Thành viên Hội đồng chỉ đọc/ghi **phiếu của chính mình**; chặn tự đánh giá và chặn ghi khi kỳ không mở —
  tất cả cưỡng chế bằng RLS phía server, không chỉ ẩn trên giao diện.
- Báo cáo tổng hợp trả về qua hàm RPC `get_council_subject_report` (SECURITY DEFINER): chỉ admin
  (bgd/tcth_admin/system_admin) hoặc chính cán bộ được đánh giá gọi được; danh tính người chấm được ẩn danh
  bằng mã ổn định sinh từ id phiếu (không lộ qua API).
- Tab *Tiến độ* cho admin chỉ hiển thị **ai đã gửi phiếu** (phục vụ đôn đốc), không hiển thị điểm.
- Lưu ý sẵn có của hệ thống: vai trò `bgd` đang được cấp cho cả 3 PGĐ → các PGĐ đều là admin và xem được mọi
  báo cáo (ẩn danh). Nếu muốn chỉ GĐ + TCTH xem báo cáo của người khác thì cần tách vai trò riêng — đề xuất ở mục 5.

## 4. Việc Chi nhánh cần làm ngay khi đưa vào sử dụng

1. **Tạo tài khoản cho 2 đầu mối chưa có hồ sơ trên hệ thống: ông Mai Hải Quân (PTP Bán lẻ) và bà
   Nguyễn Thị Huyền (PTP DVKH)** — sau đó vào *Quản trị Hội đồng đầu mối → Đầu mối* liên kết tài khoản
   (để họ không tự chấm mình và xem được báo cáo), và *→ Thành viên HĐ* thêm họ vào Hội đồng nếu họ đồng thời là thành viên.
2. **Rà soát đủ thành viên Hội đồng:** cơ chế nêu nhóm "thành viên khác" có 10–11 cán bộ, hệ thống mới nạp được
   7 người có tài khoản. Trưởng/Phó phụ trách các phòng còn lại (DVKH, Bán lẻ, HTTD, các PGD…) cần được tạo tài
   khoản rồi thêm vào Hội đồng để trọng số 55/65% phản ánh đúng số phiếu.
3. **Kiểm tra "PGĐ phụ trách"** của 3 đầu mối cấp TP (đã gán sẵn: Bán lẻ→PGĐ Thùy Linh, KHDN→PGĐ Thái Hoàng,
   DVKH→PGĐ Minh Hải) — sửa tại tab *Đầu mối* nếu phân công thực tế khác.
4. **Quy trình khuyến nghị mỗi quý:** đầu mối trình bày slide tại phiên họp Hội đồng → admin mở kỳ →
   thành viên chấm trong/ngay sau phiên họp → admin theo dõi tab *Tiến độ*, đôn đốc → đủ phiếu thì **chốt kỳ**
   → in báo cáo trình ký, lưu hồ sơ KPI. (Quý III/2026 và IV/2026 chỉ cần bấm mở kỳ khi đến hạn — dữ liệu đã sẵn.)

## 5. Đề xuất phát triển tiếp (chưa làm, chờ Chi nhánh quyết)

- **Xuất Excel/PDF báo cáo** (hiện có In trình duyệt; xuất file phục vụ lưu trữ hồ sơ giấy tốt hơn).
- **Email nhắc thành viên chưa gửi phiếu** trước hạn chốt kỳ (tận dụng hạ tầng email sẵn có của hệ thống).
- **Đính kèm báo cáo tự đánh giá/hồ sơ minh chứng của đầu mối** vào phiếu để Hội đồng tra cứu khi chấm.
- **Tách quyền xem báo cáo** khỏi vai trò `bgd` nếu muốn giới hạn chỉ GĐ + Thư ký Hội đồng.
- **Trang lịch sử qua các kỳ** (so sánh điểm Quý II→III→IV của từng đầu mối, xu hướng cải thiện).
- Khi có Quy chế xếp hạng chính thức: cập nhật ngưỡng A/B/C/D tại `src/lib/council.ts`.

## 6. Ghi chú kỹ thuật

- Migration: `supabase/migrations/20260706150000_council_focal_point_evaluation.sql` (đã áp dụng lên project
  `whlysprzsguehxmrjwha`): 6 bảng `council_rounds/members/subjects/criteria/evaluations/evaluation_scores`,
  hàm `is_council_member()`, RPC `get_council_subject_report()`, RLS đầy đủ, seed 3 kỳ + 10 tiêu chí + 6 đầu mối + 7 thành viên.
- Logic trọng số thuần túy ở `src/lib/council.ts` (unit test kèm theo); bộ tiêu chí mặc định ở `src/lib/councilDefaults.ts`.
- Quyền truy cập menu: hook `src/hooks/useCouncilAccess.ts` (thành viên HĐ thấy "Đánh giá đầu mối"; admin/đầu mối thấy "Báo cáo đầu mối").
- `src/integrations/supabase/types.ts` đã được tạo lại từ schema mới.

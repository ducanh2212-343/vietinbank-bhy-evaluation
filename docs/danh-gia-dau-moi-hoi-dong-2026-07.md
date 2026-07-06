# Đánh giá năng lực thực thi đầu mối chi nhánh (Hội đồng đánh giá) — 07/2026

Tính năng được xây dựng theo 4 tài liệu Chi nhánh cung cấp: **Cơ chế đánh giá Hội đồng đối với công tác
đầu mối**, **Phụ lục 1C — Bảng tổng hợp nhiệm vụ công tác đầu mối** (Thông báo ngày 25/06/2026),
**Mẫu phiếu đánh giá, chấm điểm thành viên Hội đồng** (10 tiêu chí, thang 10) và **Mẫu Báo cáo kết quả
đánh giá chi tiết có xử lý trọng số** (bản Quý 1/2026 của PGĐ Nguyễn Thị Thùy Linh).

## 1. Tính năng đã triển khai

| Trang | Đường dẫn | Ai dùng |
| --- | --- | --- |
| Đánh giá đầu mối (chấm điểm) | `/danh-gia-dau-moi` | Thành viên Hội đồng |
| Báo cáo đầu mối (xử lý trọng số, in + Excel + biên bản toàn kỳ) | `/bao-cao-dau-moi` | Admin (BGĐ/TCTH/System) + cán bộ đầu mối xem kết quả của chính mình |
| Phân tích đầu mối (xu hướng, so sánh, radar) | `/phan-tich-dau-moi` | Admin |
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
- **Phiếu chấm điểm:** chọn kỳ → chọn đầu mối → với mỗi tiêu chí, **5 mô tả chuẩn hành vi hiển thị trước**;
  người chấm **bấm vào mô tả sát thực tế nhất → hệ thống tự điền mốc điểm tương ứng** (mức 10đ→nấc 10,
  8đ→8, 6đ→6, 3đ→3, 0đ→nấc 1), rồi tinh chỉnh trên **thang chi tiết 10 nấc từ 1 đến 10**. Mô tả hành vi
  ứng với dải điểm đang chọn được tô sáng; điểm hiện màu theo dải diễn giải. Bấm lại nấc đang chọn để bỏ chấm.
  Sau đó nhập nhận xét 3 mục theo Mẫu phiếu (ưu điểm/hạn chế/đề xuất) → Lưu nháp hoặc Gửi.
  **Không tự chấm bản thân** (ẩn khỏi danh sách + chặn ở tầng CSDL). Đúng cơ chế mục I.3: tiêu chí chấm
  **10 điểm hoặc ≤ 3 điểm bắt buộc nhập minh chứng ngay tại tiêu chí đó** mới gửi được (ô minh chứng hiện ra
  dưới từng câu hỏi khi chấm điểm rất cao/rất thấp). Phiếu đã gửi vẫn sửa được khi kỳ còn mở.
- **Xóa phiếu (xóa vĩnh viễn, cascade điểm + minh chứng):** phiếu **đã gửi** chỉ admin xóa được
  (nút xóa ở tab *Tiến độ*); bản **nháp** thì chính người chấm tự xóa được khi kỳ đang mở
  (nút "Xóa nháp" trên phiếu chấm) — nháp chưa vào báo cáo nên là giấy nháp cá nhân.
  Cưỡng chế bằng RLS. Báo cáo/phân tích luôn tính từ dữ liệu hiện tại nên kết quả cập nhật ngay sau khi xóa.
- **Trọng số điều chỉnh được theo kỳ:** tab *Kỳ đánh giá* → nút *Trọng số* của từng kỳ: chỉnh % của
  Giám đốc / PGĐ phụ trách / PGĐ khác / Thành viên cho cả 2 cấp đánh giá (tổng mỗi cấp phải bằng 100%);
  có nút khôi phục mặc định theo Cơ chế. Trọng số áp dụng ngay khi tính báo cáo, kể cả phiếu đã chấm.
- **Gửi email kết quả:** trên trang *Báo cáo đầu mối*, admin bấm "Gửi email kết quả" — hệ thống gửi cho
  chính cán bộ được đánh giá (theo email hồ sơ): điểm thang 100, bảng nhóm trọng số, link xem báo cáo chi
  tiết; tôn trọng chặn thư/hủy đăng ký và chống gửi trùng trong ngày (gửi lại được khi điểm thay đổi).
  Yêu cầu đầu mối đã liên kết tài khoản.
- **Phân tích đầu mối** (`/phan-tich-dau-moi`, admin): biểu đồ điểm thang 100 qua các kỳ, bảng so sánh
  đầu mối × kỳ kèm mức tăng/giảm so kỳ trước, radar 10 tiêu chí của từng đầu mối đối chiếu mặt bằng
  chung trong kỳ (palette đã kiểm định an toàn mù màu, hỗ trợ dark mode).
- **Hạn bỏ phiếu + tự động hóa:** mỗi kỳ đặt được "Hạn bỏ phiếu" (tab *Kỳ đánh giá*). Cron
  `send-reminders` hàng ngày: (a) kỳ quá hạn tự chuyển "Đã chốt"; (b) còn ≤3 ngày đến hạn thì email nhắc
  các thành viên còn phiếu chưa gửi (1 lần/ngày/kỳ/người). Tab *Tiến độ* có nút nhắc tay từng người +
  "Nhắc tất cả chưa gửi" — dùng chung khóa chống trùng với nhắc tự động nên không gửi đúp trong ngày.
- **Biên bản toàn kỳ + Xuất Excel:** trên *Báo cáo đầu mối*, admin chọn "📋 Biên bản toàn kỳ" để in một
  trang tổng hợp tất cả đầu mối (điểm nhóm GĐ/PGĐ/TV, điểm thang 100, chữ ký Thư ký + BGĐ); nút
  "Xuất Excel" tạo file 3 sheet: Tổng hợp / Chi tiết phiếu ẩn danh / Danh mục tiêu chí.
- **Báo cáo trọng số:** đúng bố cục mẫu — bảng chi tiết từng phiếu (người chấm **ẩn danh** dạng "Thành viên
  ẩn danh #xxx", trọng số, TC1–TC10, TB thô, ý kiến, minh chứng theo tiêu chí), bảng phân tích nhóm theo
  trọng số, điểm quy thang 100, khối ký xác nhận (Thư ký Hội đồng + Đại diện BGĐ — **đã bỏ phần ký của
  cán bộ được đánh giá** theo yêu cầu 07/2026), nút **In báo cáo**. Ý kiến/minh chứng dài tự xuống dòng,
  tách mục Ưu điểm/Hạn chế/Đề xuất, không phá bố cục bảng. (Không hiển thị xếp loại A/B/C/D — chỉ thể hiện điểm.)

## 2. Trọng số và công thức (đã kiểm chứng bằng unit test)

Theo mục III của Cơ chế đánh giá:

| Đầu mối được đánh giá | GĐCN | PGĐ phụ trách | PGĐ còn lại | Thành viên khác |
| --- | --- | --- | --- | --- |
| Cấp Phó Giám đốc | 20% | — | 15% | 65% |
| Cấp Trưởng phòng | 20% | 10% | 15% | 55% |

- Điểm TB thô mỗi phiếu = trung bình 10 tiêu chí. Điểm nhóm = trung bình các phiếu trong nhóm.
- **Điểm thang 100 = Σ(điểm nhóm × trọng số) ÷ Σ(trọng số các nhóm đã bỏ phiếu) × 10** — nhóm chưa bỏ phiếu
  được chuẩn hóa lại đúng như dòng "Tổng trọng số bỏ phiếu hiện có" của mẫu báo cáo.
- Unit test `src/lib/council.test.ts` tái lập chính xác số liệu mẫu Quý 1/2026: nhóm 8,75/8,45/8,12 → **82,93 điểm**.
- Báo cáo chỉ thể hiện điểm quy thang 100, **không xếp loại A/B/C/D** (bỏ theo yêu cầu Chi nhánh 07/2026);
  việc phân loại do Hội đồng quyết định ngoài hệ thống.

### Ngưỡng điểm khuyến nghị (neo theo 5 mốc chuẩn hành vi của Mẫu phiếu)

**Từng tiêu chí (thang 10 nấc)** — đang áp dụng trên phiếu chấm (màu badge + tô sáng hành vi):

| Nấc | Mốc hành vi | Diễn giải | Ràng buộc |
| --- | --- | --- | --- |
| 9–10 | Mức 10đ | Xuất sắc | chấm 10 bắt buộc minh chứng |
| 7–8 | Mức 8đ | Tốt | |
| 5–6 | Mức 6đ | Đạt | |
| 2–4 | Mức 3đ | Cần cải thiện | ≤3 bắt buộc minh chứng |
| 1 | Mức 0đ | Không đạt | bắt buộc minh chứng |

**Tổng hợp thang 100 (khuyến nghị tham khảo, chưa hiển thị trên báo cáo vì Chi nhánh đã bỏ xếp loại):**
≥ 80 Xuất sắc (khớp mẫu Quý 1: 82,93 → Loại A) · 65–79 Tốt · 50–64 Đạt · < 50 Chưa đạt.
Khi Chi nhánh chốt, bật lại hiển thị bằng cách thêm bảng ngưỡng vào `src/lib/council.ts`.

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

## 6. Ghi chú kỹ thuật

- Migration: `supabase/migrations/20260706150000_council_focal_point_evaluation.sql` (đã áp dụng lên project
  `whlysprzsguehxmrjwha`): 6 bảng `council_rounds/members/subjects/criteria/evaluations/evaluation_scores`,
  hàm `is_council_member()`, RPC `get_council_subject_report()`, RLS đầy đủ, seed 3 kỳ + 10 tiêu chí + 6 đầu mối + 7 thành viên.
- Logic trọng số thuần túy ở `src/lib/council.ts` (unit test kèm theo); bộ tiêu chí mặc định ở `src/lib/councilDefaults.ts`.
- Quyền truy cập menu: hook `src/hooks/useCouncilAccess.ts` (thành viên HĐ thấy "Đánh giá đầu mối"; admin/đầu mối thấy "Báo cáo đầu mối").
- `src/integrations/supabase/types.ts` đã được tạo lại từ schema mới.

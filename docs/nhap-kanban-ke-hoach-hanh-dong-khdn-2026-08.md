# Nhập Kanban Kế hoạch hành động Phòng KHDN

08/2026. Nguồn: bản export Markdown board Miro «Kanban KẾ HOẠCH HÀNH ĐỘNG»,
21 thẻ. Áp khung `phan-tich-kanban` (§B2 phân loại → §B3 phép kiểm → §B5 báo
cáo theo ngoại lệ). Đây là board **thứ hai** của Phòng KHDN, khác bàn PDTD:
không có rủi ro tài chính nên **không áp §B4**.

---

## 1. Rà soát trước khi nhập

21 thẻ, 11 cán bộ, **7 hoàn thành (33%)**.

**Hai điểm làm tốt, cần giữ:** không ai giữ quá 2 việc đang chạy — không nghẽn
WIP theo người (§B3 #4); và 7/7 thẻ Done đều có ngày kết thúc trong quá khứ —
không có thẻ nào «xong trước khi tới hạn» (§B3 #6).

### Cảnh báo theo mức nghiêm trọng

| Mức | Phát hiện |
|---|---|
| 1 | **«KHAI THÁC NGUỒN VỐN KHCN BIG4» vô chủ** — Priority High, hạn 07/08, không có Assignee. 20/21 thẻ khác đều có chủ, riêng thẻ đánh dấu quan trọng nhất thì không |
| 2 | **«Tiếp cận BQL các CTGT…» (Phan Thế Huynh) quá hạn 125 ngày mà vẫn ở To do** — chưa bắt đầu nặng hơn đang làm dở. Kèm «Bàn giao báo cáo TF» (Đào Quang Vinh, High) quá 44 ngày và «Liên hệ CT tư vấn BH ngành giấy» (Đỗ Việt Anh) quá 38 ngày |
| 3 | **Lỗi phân loại §A3** — xem mục 2 |
| 4 | **3 thẻ tiến trình không có hạn**, trong đó «Lên kế hoạch tổ chức chương trình giới thiệu AI cho KHDN» có Start Date 28/07 nhưng **không có End Date**: đã bấm giờ bắt đầu mà không đặt đích |

Không phải cảnh báo: «Lên kế hoạch tặng bánh trung thu» quá hạn 3 ngày, nhưng
tra lịch âm thì Trung thu 2026 rơi vào **25/09** — còn 53 ngày, sự kiện chưa
vào vùng nguy hiểm (§B3 #7).

## 2. Lỗi phân loại Tiến trình / Thường trực

Quy chế §A3 nêu đích danh hai ví dụ, và cả hai đang nằm trên board:

- **«Cập nhật văn bản KHDN mới hàng tuần phân phối edoc»** (Lê Văn Trưởng) ở
  cột **Done**. Việc lặp hàng tuần không bao giờ «xong» — tuần sau nó lại chưa
  xong. Nhập vào hệ thống với `loai_dau_viec = THUONG_TRUC`, ra khỏi luồng
  Kanban tiến trình.
- **«Quản lý LS theo Nim tiền vay mục tiêu (tối thiểu 1,5%) - T6»** (Phan Thế
  Huynh) In Progress, hạn 18/03 — quá 138 ngày. Nhưng đây là chỉ số vận hành,
  con số «quá hạn» đó **vô nghĩa**. Cũng vào `THUONG_TRUC`. Tên thẻ ghi T6 mà
  hạn là 18/03 — lệch giữa tên và ngày, **cần Phòng xác minh**, không suy đoán.

Hai thẻ nữa nghi cùng nhóm, **để nguyên TIẾN_TRÌNH cho tới khi Phòng xác nhận**
(phân loại sai theo hướng ngược lại thì mất luôn cảnh báo): «Phát triển KH
mainbank» và «Rà soát nhu cầu BH gián đoạn đối với KH tái tục VBI».

## 3. Điểm mù không đánh giá được

Bản export MD **không có dữ liệu comment và không có mốc cập nhật gần nhất**,
nên §B3 #8 (tỷ lệ comment buổi sáng) và tuổi thẻ không cập nhật (§A4) **không
đo được** — dù ảnh chụp board cho thấy hầu hết thẻ có biểu tượng comment. Đúng
khoảng trống mà hệ thống lấp được, giống hệt trường hợp PDTD.

## 4. Cái gì KHÔNG được bịa

| Thiếu | Số thẻ | Vì sao không điền đại |
|---|---|---|
| Người chịu trách nhiệm | 1 | Bịa một cái tên là **gán trách nhiệm cho người không nhận** — còn tệ hơn số tiền bịa ở bàn PDTD |
| Hạn hoàn thành | 4 | Không có hạn thì không đo được đúng hẹn; đặt hạn giả làm hỏng luôn thước đo |
| Ngày bắt đầu | 18 | |
| Lãnh đạo theo dõi | 21 | Board này **không có cột lãnh đạo nào** |

Chọn **để trống và hiện thành cảnh báo**. Hàng rào không mất đi, nó chuyển
chỗ: từ `NOT NULL` sang trigger `f_ct2_truoc_tao_dau_viec`, chỉ áp khi có
người thật đang thao tác. Việc ghi mới trong ứng dụng vẫn bắt buộc đủ người +
hạn + ngày bắt đầu + lãnh đạo theo dõi.

Thêm chốt: không ai được **bỏ trống** người phụ trách hay hạn đã có. Đổi sang
người khác, dời hạn thì được.

## 5. Một vấn đề thật lộ ra khi kiểm bằng trình duyệt

Thẻ quá hạn 125 ngày vẫn **viền xanh**. Truy ra: `co_tinh_trang` là cờ **cán bộ
tự đánh giá**, không có trigger nào tự tính lại, và thẻ nhập vào mặc định
`XANH`. Viền xanh trên một thẻ quá hạn 125 ngày là đang nói dối.

Không sửa bằng cách đặt cờ hộ cán bộ lúc nhập — đó lại là bịa một đánh giá.
Sửa bằng cách cho **viền thẻ đọc theo `mucChuY()`** (đã gộp quá hạn + cờ + im
lặng + thiếu trường) thay vì cờ trần. Chế độ «Toàn cảnh» vốn đã dùng `mucChuY`;
để cột dùng thước khác là cùng một thẻ hai màu ở hai màn.

## 6. Ô trống hiện ở đâu

- **Trên thẻ Kanban**: nhãn vàng «Thiếu: Ai làm», «Thiếu: Xong khi nào»… ngay
  cạnh nhãn quá hạn — không phải mở hộp thoại mới thấy.
- **Trong hộp thoại chi tiết**: khối vàng đếm «Thẻ còn thiếu N thông tin bắt buộc».
- **Màu viền**: thiếu trường bắt buộc là **VÀNG**, dứt khoát không XANH — xanh
  nghĩa là «ổn», mà một thẻ vô chủ thì không ổn. Chưa phải ĐỎ vì cái thiếu là
  dữ liệu, chưa phải rủi ro tiến độ đã xảy ra.
- Việc **THƯỜNG TRỰC không bị đòi hạn** — đòi hạn ở đó là sai loại thước.
- Thẻ vô chủ **không cộng vào WIP của ai** — cộng vào một nhóm «không rõ ai»
  chỉ làm sai con số nghẽn của người thật.

## 7. Đã kiểm chứng

534 test pass (thêm 15), build sạch, lint sạch.

Test đáng giá nhất: **«xếp được cả cột thẻ chưa có hạn — không được ném lỗi»**.
Đúng dòng `han_hoan_thanh.localeCompare(...)` này ở bàn PDTD đã làm **trắng cả
màn** ngày 03/08/2026. Bàn đầu việc có y hệt dòng đó — bịt **trước khi** nhập.

Trình duyệt thật 1280px với dữ liệu đúng hình dạng board: không vỡ màn, thẻ vô
chủ hiện «chưa có người» màu hổ phách, thẻ quá hạn 125 ngày viền đỏ, việc
thường trực tách xuống khu riêng.

## 8. Thứ tự triển khai

Theo đúng yêu cầu và đúng bài học lần trước:

1. ✅ Viết mã + test + kiểm trình duyệt
2. ⏳ **Triển khai mã lên production**
3. ⏳ Áp migration `20260817090000`
4. ⏳ Nhập 21 thẻ

Bước 3–4 **chưa làm**, chờ bước 2 xong.

## 9. Việc Phòng KHDN cần làm sau khi nhập

1. **Gán chủ cho thẻ BIG4** — High, đang vô chủ.
2. **Hỏi Phan Thế Huynh về thẻ BQL các CTGT** — 125 ngày ở To do thường nghĩa
   là việc đã đổi hướng hoặc không còn cần; nếu vậy nên đóng kèm lý do.
3. **Xác nhận 2 thẻ nghi thường trực** ở mục 2.
4. **Đặt hạn cho 3 thẻ còn thiếu**, ưu tiên thẻ AI cho KHDN đã có ngày bắt đầu.
5. **Chỉ lãnh đạo theo dõi** cho 21 thẻ — board Miro không có trường này.

# Nhập Kanban Phòng Bán lẻ

08/2026. Nguồn: frame «Kanban view» trên board Miro của Phòng Bán lẻ.
Áp quy chế `phan-tich-kanban`.

## 1. Tổng quan

**31 thẻ**, không có dòng trùng — bản xuất sạch hơn hẳn hai board TCTH.
Vào Kanban chung của Phòng Bán lẻ (phòng chưa lập bảng mảng riêng).

| Cột | Số thẻ |
| --- | ---: |
| Chuẩn bị | 4 |
| Đang làm | 9 |
| Hoàn thành | 18 |

Chín người trên board đều khớp danh bạ, **không phải đoán tên nào**.

## 2. Cảnh báo, xếp theo mức

### 2.1 Tám trong chín việc «Đang làm» đã quá hạn

Đây là con số nặng nhất của board này — 89% việc đang chạy đã trôi qua mốc hẹn:

| Việc | Người | Quá hạn |
| --- | --- | ---: |
| Hệ thống CRM: ban hành quy định gắn CRM với quy trình | Nguyễn Khánh Phương | **36 ngày** |
| CỜ ĐỎ MIRO | Nguyễn Thị Mai | **21 ngày** |
| Rà soát khoản vay, tiền gửi NIM thấp | Phạm Thị Hòa | 15 ngày |
| Thẻ TDQT sai thông tin TSBĐ | Nguyễn Khánh Phương | 7 ngày |
| Trần Đình Tuấn · Rà soát thẻ TD giao dịch khống · Rà soát thẻ TDQT không sử dụng · POS | Hòa, Mai, Linh, Thảo | 5 ngày |

Ba thẻ đầu đều mang cờ **Ưu tiên: Cao** trên Miro — việc được đánh dấu quan
trọng nhất lại là việc trôi lâu nhất.

### 2.2 Bốn việc hạn 06/08 vẫn nằm ở «Chuẩn bị»

Hạn **ngày mai** mà chưa khởi động: Tọa đàm tăng trưởng nguồn vốn · XD CT thúc
đẩy CASA và hiệu quả BL · Chiến dịch iShop · Chiến dịch Pack2School. Ba thẻ sau
ghi ngày bắt đầu 03/08 — tức là cả bốn đều có cửa sổ ba ngày và cửa sổ đó sắp
đóng. Đây là nhóm rủi ro trễ hạn cao nhất theo §B3 mục 7.

### 2.3 Hai thẻ chỉ có tên khách hàng làm tiêu đề

«TRẦN ĐÌNH TUẤN» (đang làm, quá hạn 5 ngày) và «HUỲNH TẤN QUYỀN» (đã xong,
không có ngày nào). Một cái tên không nói được việc phải làm là gì — người
ngoài đọc bảng, hoặc chính cán bộ sau ba tháng, đều không biết thẻ này đòi hỏi
điều gì. Đề nghị bổ sung động từ: «Xử lý… / Tiếp cận… / Thu hồi…».

### 2.4 Hai thẻ có tiêu đề ngắn hơn mức hệ thống chấp nhận

Hệ thống chặn tiêu đề dưới 10 ký tự, và đã chặn đúng ở đây:

- «POS» → dùng chính mô tả của thẻ để bù:
  *POS — Rà soát POS không hiệu quả + Rà soát lệch hệ thống và thực tế*
- «CHI LƯƠNG» → thẻ **không có mô tả**, nên không có gì để bù mà không bịa.
  Nhập nguyên văn kèm ghi chú *(tiêu đề gốc trên Miro — thẻ chưa mô tả rõ nội
  dung việc)*. Đề nghị Trưởng phòng sửa lại cho đúng nghĩa.

### 2.5 Bốn thẻ thiếu hạn hoàn thành

Ba thẻ đã xong (Huỳnh Tấn Quyền, Backdrop kỷ niệm 20y, Móc khóa 20y) — mất dữ
liệu lịch sử, không ảnh hưởng điều hành. Một thẻ **đang làm**: «Cập nhật hàng
tháng diễn biến thị trường với công chứng» — nhưng thẻ này là việc lặp lại nên
không cần hạn (xem 2.6).

### 2.6 Hai việc lặp theo chu kỳ đang nằm trên Kanban tiến trình (§A3)

- «Cập nhật **hàng tháng** diễn biến thị trường với công chứng» — không có hạn
  → đã chuyển sang loại **Thường trực**, hợp lý.
- «CỜ ĐỎ MIRO — **hàng ngày** cập nhật CB không nhập Miro trước 8h» — nhưng thẻ
  lại **có hạn 15/07**. Một việc hàng ngày mà có ngày kết thúc là mâu thuẫn:
  hoặc nó là việc thường trực (thì bỏ hạn), hoặc nó là đợt triển khai có điểm
  dừng (thì tên thẻ đang mô tả sai). Giữ nguyên **Tiến trình** để con số quá
  hạn 21 ngày hiện đúng, và nêu ra để Trưởng phòng chốt.

### 2.7 Một thẻ vô chủ, hai thẻ ghi người phụ trách hai kiểu

- «TIẾP CẬN TỆP GIÁO VIÊN TRƯỜNG TÂN VIỆT» (đã xong) không có Assignee.
- «Sửa đổi chương trình Nhắc Nợ» ghi `Người phụ trách: Mai` và
  `Assignee: Nguyễn Thị Mai` — cùng người, hai kiểu viết.
- «TT và thanh toán quà 20 năm» ghi `Người phụ trách: Maint14 va Anhptv9`
  (hai tài khoản) nhưng `Assignee: Nguyễn Thị Mai` (một người). Đã lấy
  Assignee; nếu thực sự hai người cùng làm thì người thứ hai nên là **người
  phối hợp**, không phải nhét chung vào ô chủ thẻ.

### 2.8 WIP theo người — chưa ai nghẽn

Cao nhất 3 việc đang chạy (Phạm Thị Hòa), dưới ngưỡng 4 của §B3 mục 4.
Lưu ý: board ghi tên chị Hòa theo **hai kiểu** — «Hoà Phạm» và «Phạm thị hoà» —
nên nếu chỉ nhìn Miro sẽ tưởng là hai người và bỏ sót cảnh báo WIP.

## 3. Quy tắc ánh xạ

`To Do → Chuẩn bị` · `In process → Đang làm` · `Done → Hoàn thành` (100%).
`Ưu tiên: Cao → Ưu tiên`, `Trung bình → Thường`.
`Ngày bắt đầu / Ngày kết thúc` → ngày bắt đầu / hạn hoàn thành, thiếu thì để
trống. Trưởng phòng (Mai Hải Quân) và PGĐ phụ trách lấy từ danh mục phòng;
**Phó phòng để trống** vì board không ghi ai phụ trách mảng nào — Trưởng phòng
gán sau trong hộp thoại «Cấp phụ trách».

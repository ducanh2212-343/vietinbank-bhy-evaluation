# Nhập hai bảng PDCA của Phòng Tổ chức Tổng hợp

08/2026. Nguồn: hai frame Miro do Giám đốc gửi —
«PDCA CÔNG TÁC TỔNG HỢP» và «PDCA HÀNH CHÍNH QUẢN TRỊ».
Áp quy chế `phan-tich-kanban` (§A1 ba trường bắt buộc, §A3 phân loại tiến
trình / thường trực, §B3 các phép kiểm, §B5 báo cáo theo ngoại lệ).

---

## 1. Tổng quan

| | Dòng thô | Sau gộp trùng | Vào bảng |
| --- | ---: | ---: | --- |
| PDCA Công tác Tổng hợp | 26 | **26** | Mảng tổng hợp |
| PDCA Hành chính Quản trị | 63 | **40** | Mảng hành chính |

Bản xuất của board Hành chính có **23 dòng trùng** — cùng một thẻ xuất ra hai
đến ba lần, khác nhau ở chỗ bản này có `Category` bản kia không. Toàn bộ trùng
lặp nằm **trong cùng cột DONE**, không có thẻ nào mâu thuẫn trạng thái, nên gộp
theo tiêu đề là an toàn. Đã gộp và giữ bản có nhiều trường nhất.

Bốn thẻ trên board Hành chính có **tiêu đề rỗng** — không nhập, vì một thẻ
không tên thì không có gì để theo dõi.

## 2. Cảnh báo, xếp theo mức

### 2.1 Chín việc ĐANG CHẠY không có hạn hoàn thành

48/66 thẻ không có ngày hạn, nhưng 39 trong số đó đã ở cột DONE — thiếu hạn ở
đó chỉ là mất dữ liệu lịch sử. **Chín thẻ đang chạy mà không có hạn** mới là
vấn đề thật: không có hạn thì không đo được đúng hẹn, và bảng không cảnh báo
được gì. Năm trong chín thẻ đó đồng thời **vô chủ**.

### 2.2 Mười tám thẻ vô chủ

17 thẻ không ghi Assignee + 1 thẻ giao cho người **ngoài phòng**:

> «Rà soát chấm công qua hình thức quét khuôn mặt…» → **Nguyễn Mạnh Quân**,
> Cán bộ Điện toán **Phòng DVKH**.

Đã để trống người phụ trách chứ không gán bừa cho ai trong TCTH. Nếu đây là
việc liên phòng thì nên đánh dấu liên phòng và ghi rõ ai bên TCTH là đầu mối.

Riêng cột «Đang làm» có **5/9 thẻ vô chủ** — đây là nhóm nguy hiểm nhất: việc
đang chạy mà không ai chịu trách nhiệm.

### 2.3 Một thẻ có hai người phụ trách

> «Mua bánh trung thu tặng Khách hàng CBNV và CBNV» —
> `Assignee: Vũ Thị Năm` nhưng `Assigned To: Vũ Đức Nam`.

Hai trường khác nhau chỉ hai người khác nhau. Đã lấy `Assignee` (trường chuẩn
của thẻ Miro) và ghi nhận mâu thuẫn ở đây — §B3 mục 3: hai người ngang vai trên
một thẻ nghĩa là **không ai thực sự chịu trách nhiệm**.

### 2.4 Hai thẻ có hai mốc ngày lệch nhau

| Thẻ | Due Date | End date |
| --- | --- | --- |
| Mua bánh trung thu | 01/09/2026 | 15/09/2026 |
| Thiết kế đèn LED, trình chiếu cửa TSCN | 21/07/2026 | 24/07/2026 |

Đã lấy **End date** làm hạn hoàn thành. Cần chốt một mốc duy nhất trên Miro,
nếu không thì «đúng hẹn» đo theo mốc nào cũng cãi được.

### 2.5 Bốn việc lặp lại đang nằm trên Kanban tiến trình (§A3)

Việc lặp theo chu kỳ không có điểm «xong», để trên Kanban tiến trình sẽ vĩnh
viễn nằm ở «Đang làm» và làm nhiễu mọi chỉ số:

- Rà soát chấm công … **định kỳ hàng tháng** từ 4.2026 → đã đánh **Thường trực**
- Báo cáo số lượng công văn … **muộn nhất ngày 05 hàng tháng** → đã đánh **Thường trực**
- Tổng hợp báo cáo từ nhiều hệ thống … **hàng ngày** → đang ở DONE, **giữ nguyên**
- Báo cáo số lượng các lớp học **trong tháng** … → đang ở DONE, **giữ nguyên**

Hai thẻ cuối để nguyên vì đổi loại của một thẻ đã đánh dấu xong là sửa dữ liệu
gốc, không phải việc của đợt nhập. Đề nghị Trưởng phòng xem lại.

### 2.6 WIP theo người — không ai nghẽn

Nhiều nhất 2 việc đang làm/người (Nguyễn Thị Phượng, Vũ Đức Nam, Vũ Thị Thu Hà),
dưới ngưỡng cảnh báo 4 của §B3 mục 4. Nhưng con số này **chưa đáng tin** khi
còn 5 thẻ đang làm không có chủ.

## 3. Quy tắc ánh xạ đã dùng

- Cột: `TO DO → Chuẩn bị` · `DOING/In Progress → Đang làm` · `DONE → Hoàn thành` (100%).
- `Assignee` → người chịu trách nhiệm. Khớp tên **chính xác** sau khi bỏ dấu;
  không có tên nào phải đoán. Không khớp ai trong phòng → **để trống**.
- `Tags: LĐP: Chị Năm / Chị Hà` → **Phó phòng phụ trách** (5 thẻ). Đây là nhãn
  vai trò do chính board ghi, không phải suy diễn.
- Trưởng phòng = Vũ Thị Thu Hà, PGĐ phụ trách suy từ danh mục phòng.
- Lãnh đạo theo dõi = Phó phòng phụ trách nếu có, còn lại là Trưởng phòng.
- `End Date` → hạn hoàn thành; không có thì lấy `Due Date`; không có cả hai →
  **để trống và hiện cảnh báo**, không bịa ngày.
- `Start Date` → ngày bắt đầu.

**Không nhập**: các nhãn chức năng (`Tổng hợp`, `Hậu kiểm`, `CLDV`, `Category`)
và danh sách người được tag chung. Nhãn chức năng đã được thể hiện bằng chính
việc thẻ nằm ở bảng nào; còn danh sách tag thì không phân biệt được ai là người
phối hợp thật với ai chỉ được nhắc tên — gán bừa vào «người phối hợp» sẽ đẩy
thông báo hằng ngày cho những người không nhận việc.

## 4. Còn lại

Mảng tổ chức (bảng hạn chế) chưa có thẻ nào. Vài thẻ trên board Hành chính có
nội dung nhân sự nhạy cảm — quy hoạch chức danh, hồ sơ trình KLTCCT cho các
Trưởng phòng — hiện đang nằm ở **Mảng hành chính** mà cả phòng đọc được. Đây là
quyết định về bảo mật, không phải kỹ thuật, nên tôi để nguyên theo đúng board
gốc và nêu ra để Giám đốc quyết có chuyển sang Mảng tổ chức hay không.

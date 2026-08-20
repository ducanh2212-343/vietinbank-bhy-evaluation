# Vì sao cán bộ ghi nhịp mà không ai nhận được push

08/2026 — Giám đốc: *«Tôi cho cán bộ nhập nhưng không thấy push notification»*.

Truy ra **ba nguyên nhân xếp chồng**, cái sau bị cái trước che mất. Số liệu ở
thời điểm rà: trong 3 ngày có 4 nhịp và 5 trao đổi, nhưng bảng thông báo có
**0 tin loại NHỊP và 0 tin loại TRAO ĐỔI** — toàn bộ 36 tin đều là «anh/chị vừa
được giao một việc».

---

## 1. Đợt nhập liệu bắn tin «vừa được giao một việc» — và ăn hết hạn mức

Nhập 97 thẻ lịch sử từ Miro làm trigger INSERT bắn tin N13 cho từng người phụ
trách. Nội dung sai sự thật (việc từ tháng 3, không phải «vừa được giao»), và
tệ hơn: nó **chiếm sạch hạn mức tin trong ngày** của người nhận.

Chi tiết đường đi: đợt nhập TCTH chạy 04/08 lúc 17:59 — ngoài khung phát tin,
nên `ct2_moc_phat_gan_nhat()` dời toàn bộ sang khung sáng **05/08**. Sáng hôm
sau chị Vũ Thị Thu Hà mở máy đã có sẵn 3 tin nhập liệu chiếm chỗ.

**Đã vá**: `auth.uid() IS NULL` nghĩa là ghi bằng service role, tức nhập liệu
lịch sử — không bắn tin giao việc. Áp cho cả đầu việc lẫn hồ sơ tín dụng. Và đã
xoá 36 tin sai đó khỏi hàng đợi.

## 2. Trần chống nhiễu là MỘT rổ chung — một cơn lũ giết mọi loại tin khác

Trần 3 tin nhẹ/người/ngày đếm **gộp mọi loại**. Nên khi 3 suất của chị Thu Hà
đã bị tin nhập liệu chiếm, thì 08:57 chị Phượng ghi nhịp → tin báo cho chị Hà
bị trần nuốt, **im lặng, không dấu vết, không log**.

Đo được bằng số: `tran_thong_bao = 3`, và số tin của chị Thu Hà phát trong ngày
05/08 = **đúng 3**. Chạm trần chằn chặn.

**Đã vá**: trần vẫn còn — vẫn cần, vì một Trưởng phòng 9 cán bộ nhận đủ 9 nhịp
mỗi sáng thì tuần sau sẽ tắt thông báo — nhưng nay **đếm riêng từng mã sự
kiện**. Lũ ở loại tin này không bóp chết loại tin khác nữa.

## 3. Chỉ 27/100 cán bộ đã bật thông báo trên trình duyệt

Đây là nguyên nhân lớn nhất về mặt số người, và **không sửa được bằng SQL** —
Web Push đòi chính người dùng bấm «Cho phép» trên trình duyệt của họ.

| Phòng | Đã bật / Tổng |
| --- | --- |
| Ban Giám đốc | 3/4 |
| DVKH | 5/13 |
| PGD Khoái Châu · Yên Mỹ | 3/9 · 3/9 |
| TCTH | 3/8 |
| **Bán lẻ** | **2/8** |
| **KHDN** | **2/15** |
| Văn Giang · Văn Lâm · Ân Thi | 2/10 · 2/10 · 1/8 |
| HTTD | 1/6 |

Nghĩa là kể cả khi đường ống hoàn hảo, tin cũng chỉ tới được hơn một phần tư
Chi nhánh. Riêng KHDN — phòng có nhiều việc nhất — chỉ 2/15.

Nút **«Bật thông báo»** nằm ở trang chủ và tự ẩn khi đã bật. Trên iPhone/iPad
phải mở app từ biểu tượng đã «Thêm vào màn hình chính» mới bật được — đây là
giới hạn của iOS, không phải lỗi ứng dụng.

## Hai điều khác cần biết

**Tin không phát tức thì.** `ct2_moc_phat_gan_nhat()` gom tin vào các khung giờ
cố định. Nhịp ghi lúc 08:57 nằm chờ tới khung 09:06 mới đi. Đây là thiết kế cố
ý (chống dội tin), nhưng ai thử ngay sau khi bấm sẽ tưởng là hỏng.

**«Đã gửi» không có nghĩa là «đã tới».** `notify-ct2` đóng dấu `gui_luc` cho mọi
tin đến hạn, kể cả khi người nhận không có đăng ký push nào. Cả 36 tin đều
mang dấu «đã gửi» trong khi 34 người nhận không có thiết bị nào để nhận. Con số
này hiện không phản ánh thực tế giao nhận — nên đọc là «đã xử lý».

## Kiểm chứng sau khi vá

Chạy trên DB thật rồi rollback:

| Thao tác | Trước | Sau |
| --- | --- | --- |
| Cán bộ ghi nhịp | 0 tin | **2 tin** |
| Nhập liệu lịch sử | 3 tin/người | **0 tin** |

# Đọc thẳng board Miro — đối chiếu toàn bộ bàn PDTD KHDN

*GĐ hỏi: «Có cần tôi chụp lại bản chính xác trên Miro không?» — Không cần.
Hệ thống đọc thẳng được board qua kết nối Miro; đã kéo đủ 46 dòng của bảng
PDTD Phòng KHDN và đối chiếu từng thẻ với app (sáng 06/08).*

## Kết quả đối chiếu

**Khớp trọn** (không cần làm gì):

| Cột | Miro | App |
|---|---|---|
| Đến hạn GHTD 2 tháng tới | 2 (Đông Dương ×2) | 2 ✓ |
| Thu thập hồ sơ (7 thẻ Miro) | Khải Minh, Bossco, Mỹ Hương, Growfeed, Hải Nam, Thụy Hải, Thành Đạt | đủ 7 ✓ |
| Trình LĐP | Quỳnh Trang, Phú Thái, Đại Lợi (+Minh Hoàng — xem dưới) | 3/4 |
| Hoàn thiện HS GN | 0 | 0 ✓ |
| Hoàn thành | 22 thẻ | 22 ✓ — khớp từng tên |

**Hai thẻ lệch — đã sửa theo board** (migration `...sua_hai_the_lech`, áp production):

1. **CT Minh Hoàng**: Miro «(2) Trình LĐP» — app để Thu thập (thẻ nhập không
   mang trạng thái, đợt nhập đặt mặc định) → chuyển Trình LĐP.
2. **CT TMC Việt Nam**: Miro «(3) Trình LĐ Chi nhánh» — app để Trình TSC (đợt
   nhập đọc nhầm cột) → chuyển Trình LĐ Chi nhánh.

**Năm thẻ Miro CHƯA XẾP CỘT nào** («Remaining cards»): May Minh Anh Đô Lương,
Ngành Ong (KS Thành Công), Mặt Trời Việt, Ngân Hà, Dinh dưỡng Quốc tế Đài
Loan. App đang coi là «Thu thập hồ sơ». Giữ nguyên — nhưng đây là dữ liệu
khuyết trên board gốc, nên **nêu cho Phòng KHDN tự xếp**, không đoán hộ.

**Hai thẻ chỉ có trong app, không còn trên Miro** — cần Phòng xác nhận trước
khi động (không tự xoá):

- `KHDN-TD-2608-052` Công ty Hưng Phát (Cấp mới, Thu thập) — Miro chỉ còn một
  thẻ Hưng Phát ở Hoàn thành; có thể Phòng đã gộp/xoá thẻ này.
- `KHDN-TD-2608-095` Công ty CP Giấy Vạn Điểm (Thu thập, hạn mức còn 35 ngày)
  — không thấy trên board.

## Từ nay về sau

Không cần chụp màn hình để đối chiếu nữa — yêu cầu «đối chiếu board X với
app» là hệ thống tự đọc bảng Miro và diff từng thẻ như trên. Ảnh chụp chỉ còn
cần khi muốn chỉ một chi tiết hiển thị cụ thể trên giao diện.

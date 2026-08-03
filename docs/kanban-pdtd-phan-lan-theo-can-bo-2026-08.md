# Kanban PDTD: phân làn theo cán bộ, khoá kéo thả, dải đến hạn GHTD

08/2026. Trả lời yêu cầu: *"phân tách rõ phần của từng cán bộ… cần bổ sung
thanh trượt phía trên hoặc nghiên cứu phương án trượt phù hợp để tránh việc ấn
vào trượt lại chạm vào thay đổi trạng thái của hồ sơ (Miro hiện tại có chức
năng Lock/unlock)… phần đến hạn GHTD trong vòng 2 tháng cứ cho vào."*

---

## 1. Phân làn theo cán bộ

Chế độ «Cột» đổi từ bảy cột gộp chung sang **mỗi cán bộ một băng ngang** — đúng
cách board Miro của Phòng đang bày. Nhìn một băng là biết người đó đang ôm gì,
ở bước nào.

- Băng của người **nhiều cảnh báo đỏ nhất lên đầu** — cùng thứ tự với màn
  «Toàn cảnh», để hai cách xem kể cùng một câu chuyện.
- Đầu băng: tên + số hồ sơ đang chạy + tổng tiền + số cảnh báo đỏ. Tên **ghim
  mép trái** khi cuộn ngang, cuộn tới cột nào cũng biết đang nhìn hàng của ai.
- Hàng tiêu đề cột dùng chung phía trên, kèm số hồ sơ và tổng tiền mỗi bước.

## 2. Chống chạm nhầm — thay cho Lock/Unlock thủ công của Miro

Vuốt-để-cuộn và kéo-để-chuyển-bước là **cùng một cử chỉ** trên màn cảm ứng.
Miro bắt người dùng nhớ bấm Lock. Ở đây đảo mặc định:

| | |
|---|---|
| Mặc định | **Kéo thả KHOÁ** — vuốt lên thẻ chỉ cuộn bảng, không nhấc thẻ |
| Cần kéo | Bấm «Kéo thả đang khoá» → mở, nút chuyển màu hổ phách để thấy rõ đang ở chế độ nguy hiểm |
| Đổi cách xem | Khoá tự đóng lại |
| Chuyển bước không cần kéo | Hộp thoại chi tiết có nút «Chuyển bước tiếp» — lúc nào cũng dùng được, không phụ thuộc khoá |

Khoá ở đây là **tắt hẳn listener kéo** (dnd-kit `disabled`), không phải chặn ở
hàm xử lý — thẻ bị khoá thì trình duyệt xử lý cử chỉ như nội dung tĩnh, cuộn
mượt như thường.

Kèm theo: **thanh trượt ngang ở cả mép trên** bảng, đồng bộ hai chiều với
thanh dưới — bảng nhiều băng thì thanh dưới cùng nằm ngoài tầm mắt, muốn cuộn
phải kéo xuống đáy trang.

## 3. Dải «Đến hạn GHTD 2 tháng tới» — giữ cột, đổi bản chất

Phòng đã quen nhìn cột này trên Miro nên giữ lại đúng vị trí — nhưng là **cột
dẫn xuất** tính từ trường `ngay_den_han_ghtd`, không phải một trạng thái:

- Hồ sơ đang chạy có hạn mức đến hạn trong **60 ngày** (kể cả đã quá) tự hiện
  vào cột, **vẫn giữ nguyên bước thật** — thẻ ghi rõ «Đang ở: (3) Trình LĐ Chi
  nhánh». Không kéo vào/ra được.
- **Tái cấp/điều chỉnh chưa ghi ngày** cũng vào dải với nhãn «Chưa có ngày đến
  hạn — cần bổ sung» — đó chính là hai thẻ Đông Dương nằm ở cột này trên Miro
  mà không có ngày nào; giấu chúng đi là giấu đúng chỗ cần bổ sung nhất.

Miro không làm được thế: một thẻ chỉ nằm được ở một cột, vào cột đến hạn là
mất dấu bước. Đây là chỗ trường ngày có cấu trúc hơn hẳn nhãn dán — cùng một
hồ sơ hiện được ở cả hai nơi vì một nơi là *trạng thái*, nơi kia là *góc nhìn*.

Logic vào/ra dải nằm trong hàm thuần `hsThuocDaiDenHan()` — có test.

## 4. Đã kiểm chứng

- 523 test pass (thêm 4 cho `hsThuocDaiDenHan`), build sạch, lint sạch.
- Trình duyệt thật 1280px: phân làn đúng, tên ghim mép trái khi cuộn, thanh
  trượt trên đồng bộ hai chiều (kéo thanh trên 400px → bảng dưới theo đúng 400px).
- Kéo thẻ khi **khoá**: không có gì xảy ra. Mở khoá: thẻ nhấc lên được
  (opacity đổi, drop kích hoạt).
- 390px: trang không tràn ngang, bảng cuộn trong khung riêng.

## 5. Chưa làm

- Ghim hàng tiêu đề cột khi cuộn dọc (sticky top trong khung cuộn ngang là bài
  toán CSS không sạch — cần đổi cấu trúc cuộn nếu muốn).
- Thu gọn băng của một cán bộ (đóng/mở từng băng) khi Phòng đông người.

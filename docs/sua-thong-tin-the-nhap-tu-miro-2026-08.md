# Sửa thông tin thẻ đã nhập từ Miro

08/2026, theo yêu cầu của Giám đốc: *«thêm tính năng sửa các thông tin trong
các task đã được nhập từ file trên Miro, bao gồm nhưng không giới hạn các
trường về Người chịu trách nhiệm, ngày tháng, hoàn thành»*.

## Vì sao cần

97 thẻ nhập từ ba board Miro mang **nguyên vẹn cái sai của bản gốc**: 18 thẻ
vô chủ, 48 thẻ không hạn, 2 thẻ lấy tên khách hàng làm tiêu đề, thẻ ghi «Đúng
hẹn» trong khi quá hạn 145 ngày. Trước đợt này, đường duy nhất để sửa là mở
lại Miro sửa rồi nhập lại — tức là bỏ hết nhật ký PDCA đã tích được.

Ba đợt trước đã mở lần lượt: cấp phụ trách (`Ct2CapPhuTrach`), kế hoạch làm
(`Ct2PlanDialog`), chuyển cột (`ChuyenTrangThai`). Đợt này bịt nốt chỗ còn lại —
các trường 5W2H cơ bản.

## Sửa được gì

Nút **«Sửa thông tin thẻ»** trong hộp thoại chi tiết, chỉ **lãnh đạo Phòng**
thấy:

| Trường | Ghi chú |
| --- | --- |
| Tên việc | tối thiểu 10 ký tự — chặn trước, đúng luật DB |
| Người chịu trách nhiệm | danh sách cán bộ trong phòng |
| Bắt đầu từ ngày · Hạn hoàn thành | dời hạn có ghi vết và báo cả tuyến phụ trách |
| Mức ưu tiên | Thường · Ưu tiên · Trọng điểm BGĐ |
| Loại việc | Tiến trình ↔ Thường trực — sửa được 4 thẻ lặp lại đã nêu ở báo cáo nhập liệu |
| Tiến độ | nấc 25%, không gõ số (trên điện thoại gõ số là bỏ dở) |

Không gộp vào đây: kết quả đầu ra / gắn mục tiêu / cách làm (đã có «Sửa kế
hoạch làm»), và chuyển cột (đã có «Chuyển trạng thái»). Gộp hết vào một form
dài là quay lại đúng cái đã làm cán bộ bỏ dở form trên điện thoại.

## Ba luật giữ nguyên — hàng rào ở database, đây chỉ là gương

- **Chỉ lãnh đạo Phòng** đổi được người, hạn, ưu tiên, loại việc.
  Cán bộ vẫn cập nhật được tiến độ của việc mình làm.
- **Không xoá trắng** người phụ trách hay hạn đã có — đổi sang giá trị khác thì
  được. Chặn trước ở client để người dùng nhận câu tiếng Việt tử tế thay vì lỗi
  constraint thô.
- **Chỉ gửi trường thực sự đổi**, để nhật ký thay đổi không đầy dòng rác.

## Sửa kèm: dòng «Đúng hẹn» nói dối

Ảnh Giám đốc gửi có một thẻ ghi **«Đúng hẹn · 100% · hạn 13/3/2026 — quá hạn
145 ngày»** trên cùng một dòng.

`co_tinh_trang` là cờ **cán bộ tự đánh giá**, không có gì tự tính lại nó — thẻ
nhập từ board cũ đều mặc định XANH. Viền thẻ ngoài bảng đã đọc `mucChuY()` từ
đợt trước, nhưng dòng mô tả trong hộp thoại vẫn in thẳng cờ. Nay dòng này cũng
đọc `mucChuY()`: đỏ hiện **«Cần xử lý»**, vàng hiện **«Có rủi ro»**, chỉ khi
thật sự ổn mới in cờ cán bộ đặt.

## Kiểm chứng

Trên DB thật, đóng giả từng vai rồi rollback:

| Vai | Thao tác | Kết quả |
| --- | --- | --- |
| Giám đốc | đổi ngày bắt đầu · dời hạn · đổi ưu tiên · đổi tiến độ | ghi được ✅ |
| Giám đốc | xoá trắng hạn đã có | bị chặn ✅ |
| Chu Thị Thủy (cán bộ) | đổi hạn | bị chặn ✅ |
| Chu Thị Thủy (cán bộ) | cập nhật tiến độ việc mình làm | vẫn ghi được ✅ |

596 test pass · build sạch · lint sạch. Không cần migration — quyền vốn đã
đúng, đợt này chỉ mở đường vào.

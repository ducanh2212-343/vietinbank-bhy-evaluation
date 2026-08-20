# Đối chiếu board gốc KHDN — gỡ 6 thẻ dự kiến máy gieo

*Giám đốc gửi hai ảnh board Miro gốc (06/08): Nhựa Tuệ Minh «task xong rồi»
vẫn nằm trong «Đến hạn GHTD 2 tháng tới» của ứng dụng.*

## Board gốc nói gì

- **Nhựa Tuệ Minh nằm ở cột HOÀN THÀNH** trên board của chính Phòng, tag ngày
  `29/05/2026` — và theo chú giải ngay trên board: *«Ngày hết hạn: sử dụng
  tag»*, tức là **ngày hết hạn của hạn mức đã cấp** — thông tin lịch sử.
- Cột «Đến hạn GHTD 2 tháng tới» của Phòng chỉ có **đúng hai thẻ Đông Dương**.

## Máy đã suy sai ở đâu

Đợt 05/08 tôi suy: *hồ sơ hoàn thành + ngày hết hạn đã qua + chưa có hồ sơ nối
tiếp ⇒ khách cần tái cấp ⇒ gieo thẻ dự kiến* — và gieo 7 thẻ (còn 6 sau lần dọn
Hưng Phát). Board gốc bác bỏ: Phòng đã **khép** các khách đó. Suy luận từ dữ
liệu không thay được sổ sách của người làm thật — thẻ ở cột Hoàn thành trên
board gốc là chương đã khép, **máy không được mở lại hộ**.

## Đã dọn (migration `20260902090000`, áp production)

1. **Gỡ 6 thẻ dự kiến máy gieo** — nhận diện bằng đúng mẫu ghi chú lúc gieo,
   kèm điều kiện chưa có nhịp/trao đổi nào (kiểm trước: cả 6 đều nguyên vẹn).
   Thẻ dự kiến do NGƯỜI tạo sau này không bị đụng.
2. **Hai thẻ Đông Dương về cột «Đến hạn GHTD»** — đợt nhập (trước khi có trạng
   thái này) xếp tạm vào Thu thập hồ sơ, sớm hơn thực tế board.
3. **Cảnh báo «Hạn mức sắp hết» thôi đọc hồ sơ Hoàn thành.** Tín hiệu còn lại
   toàn việc thật: thẻ dự kiến chưa vào việc + hồ sơ đang chạy mà hạn mức
   cận/quá. Nhãn nhóm phía client đổi theo: «Chưa vào việc — thẻ dự kiến».

## Sau dọn — khớp board gốc từng dòng

- Cột dự kiến: 2 thẻ Đông Dương (đúng như Miro)
- Nhựa Tuệ Minh: một bản ghi Hoàn thành duy nhất, rời cả cột lẫn cảnh báo
- Cảnh báo KHDN: 6 hồ sơ **đang chạy** hạn mức cận/quá — Hải Nam (−6 ngày),
  Thaicom (−6), Mỹ Hương (còn 24), Thăng Long 2 (−98), Ngôi Sao Việt (−124),
  Giấy Vạn Điểm (còn 35)

619 test qua, tsc + lint sạch, build qua.

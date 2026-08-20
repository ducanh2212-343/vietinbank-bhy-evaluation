# Cột dự kiến nhận cả việc «cần sử dụng» — và 5 thẻ Miro chưa xếp

*Giám đốc chốt 06/08: đổi tên cột thành «Đến hạn GHTD **hoặc cần sử dụng**
trong 2 tháng tới», đưa 5 thẻ Miro chưa xếp cột vào đó.*

## Vì sao phải nới định nghĩa, không chỉ đổi chữ

Soi 5 thẻ ấy thì **không thẻ nào có ngày hạn mức đến hạn**. Chúng là nhu cầu
*cần dùng vốn*: Ngành Ong 290 tỷ (hạn xử lý 31/8), Đài Loan (10/8), Minh Anh
Đô Lương (20/8); Ngân Hà và Mặt Trời Việt chưa có mốc nào.

Cổng tạo cũ đòi bằng được `ngay_den_han_ghtd`. Giữ nguyên thì chính 5 thẻ GĐ
muốn đưa vào lại **không vào được** — hàng rào chặn đúng thứ nó sinh ra để
phục vụ. Nên luật đổi: thẻ dự kiến neo vào cửa sổ 2 tháng bằng **ít nhất một**
mốc — `ngay_den_han_ghtd` (hạn mức sắp hết) **hoặc** `han_xu_ly` (ngày khách
cần dùng vốn).

Hai loại mốc **không gộp làm một** vì chúng đọc khác nhau, và cách xử lý khác
nhau: quá mốc HẠN MỨC là khách **mất** hạn mức đang dùng; quá mốc CẦN DÙNG là
mình **lỡ** một cơ hội. Thẻ hiện nhãn tương ứng (`Đến hạn` / `Cần dùng`), cảnh
báo gọi đúng tên việc. Có cả hai mốc thì hạn mức thắng.

## Kết quả — 4/5 thẻ chuyển, 1 thẻ KHÔNG

| Thẻ | Kết quả |
|---|---|
| Đài Loan | → cột dự kiến · Cần dùng, còn 4 ngày |
| Ngành Ong (KS Thành Công) | → cột dự kiến · Cần dùng, còn 25 ngày |
| Ngân Hà | → cột dự kiến · chưa có ngày |
| Mặt Trời Việt | → cột dự kiến · chưa có ngày |
| **May Minh Anh Đô Lương** | **KHÔNG chuyển** — xem dưới |

**Minh Anh Đô Lương bị cổng chặn, và chặn đúng.** Cán bộ Phan Thế Huynh đã ghi
2 nhịp thật trên thẻ: *«E đã gửi list hồ sơ cung cấp đợi KH phản hồi»*, *«…đợi
KH tập hợp gửi»*. Việc đã bắt tay làm — lùi về «dự kiến» là xoá bằng chứng
người ta đã làm và cho đồng hồ chạy lại từ đầu. Điều kiện «chưa có nhịp nào»
trong câu lệnh chuyển đã giữ lại đúng thẻ này.

## Cần Phòng KHDN bổ sung

Cột dự kiến hiện có 6 thẻ, trong đó **4 thẻ chưa có ngày nào** (Đông Dương ×2,
Ngân Hà, Mặt Trời Việt) — không đo được «2 tháng tới» là tới bao giờ. Chúng
hiện nhãn vàng *«Chưa có ngày hạn mức hoặc ngày cần dùng»*. Không bịa ngày;
Phòng điền là hết cảnh báo.

## Đã kiểm

624 test qua (thêm 5 test cho hai loại mốc: đọc đúng loại, ưu tiên hạn mức khi
có cả hai, null khi trôi nổi, cảnh báo gọi đúng tên việc), tsc + lint sạch,
build qua. Migration `20260903090000` đã áp production.

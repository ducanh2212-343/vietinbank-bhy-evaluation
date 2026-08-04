# «Dòng thời gian» — một mạch kể chuyện cho mỗi thẻ, chung cả ba bàn

08/2026. Trả lời yêu cầu: *"xây dựng lại phần nhật ký PDCA, nhật ký trao đổi,
để thể hiện rõ phần nào là cán bộ báo cáo PDCA, nhưng phần trao đổi cũng thể
hiện trong tổng thể nhật ký của task… cả phần task của Chiêu thức 2 và Bắc
Hưng Yên Mark (cần đưa ra tên thống nhất)."*

---

## 1. Vấn đề: ba bàn, ba giọng kể

| Bàn | Trước đây |
|---|---|
| Đầu việc Chiêu thức 2 | Ba hộp chồng nhau: «Ghi nhịp hôm nay» · «Nhật ký PDCA» · «Trao đổi trên thẻ» |
| Hồ sơ PDTD | «Nhật ký hồ sơ» (kèm ô ghi) · «Trao đổi về hồ sơ» |
| Thẻ BHY Mark | «Timeline» (log hệ thống + tiến độ) · «Trao đổi trên thẻ» |

Cái hỏng chung: **báo cáo và trao đổi là hai danh sách tách rời**. Quản lý
muốn hiểu chuyện tuần trước phải tự ráp hai luồng theo trí nhớ — «cán bộ báo
50% hôm nào, mình hỏi lại hôm nào, câu trả lời nằm đâu». Còn dòng nào cũng
lặp lại đầy đủ ngày-tháng-giây nên màn đặc chữ.

## 2. Tên thống nhất: «Dòng thời gian»

Chọn tên BHY Mark đang dùng — quen thuộc, tả đúng bản chất. «Nhật ký PDCA»
không biến mất: nó thành **nhãn loại dòng** (huy hiệu P/D/C/A trên từng dòng
báo cáo) thay vì tên của cả khu.

## 3. Trộn nhưng không lẫn — ba quyết định

**Một mạch thời gian.** Báo cáo và trao đổi trộn theo giờ, mới nhất trước,
gom theo ngày (một vạch ngày, trong ngày chỉ còn giờ:phút — bỏ phần lặp
«4/8/2026» ở từng dòng).

**Hai hình dạng.** Báo cáo là **thẻ trắng viền trái theo cờ** tình trạng +
huy hiệu 📊 P/D/C/A — trang trọng, là hồ sơ chính thức. Trao đổi là **bong
bóng xám nhạt thụt lề** — nhẹ, là câu chuyện bên lề. Dòng hệ thống (tạo thẻ,
đổi trạng thái) hiện **mảnh không khung** — chú thích, không phải lời của ai.
Lướt bằng mắt phân biệt được trước khi kịp đọc chữ.

**Hai cửa viết.** Báo cáo đi qua form ghi nhịp có cấu trúc (cờ, %, nhãn PDCA)
phía trên thẻ; ô soạn trong Dòng thời gian **chỉ gửi trao đổi**, có ghi rõ
ngay trên ô. Không có nút nào để lỡ tay đăng báo cáo thành bình luận.

Kèm **bộ lọc một chạm**: Tất cả · 📊 Báo cáo · 💬 Trao đổi. Quản lý họp giao
ban bấm «Báo cáo» là còn đúng hồ sơ chính thức.

## 4. Kiến trúc

- `gopDongThoiGian()` trong `src/lib/ct2.ts` — hàm thuần trộn + lọc + gom
  ngày (múi giờ VN), có test. So mốc bằng `Date` chứ không so chuỗi — hai
  nguồn có thể trả hai định dạng ISO khác nhau.
- `Ct2DongThoiGian.tsx` thay thế `Ct2TrangTraoDoi.tsx` — giữ nguyên toàn bộ
  nghiệp vụ trao đổi (@nhắc tên một chạm, «Cần trả lời», cảm xúc, thu hồi,
  tra bù tên người phòng khác), thêm mạch trộn.
- Mỗi bàn tự chuẩn hoá nguồn báo cáo của mình về `DongBaoCao[]`: nhịp PDCA
  (đầu việc) · nhật ký hồ sơ (PDTD) · `kanban_card_logs` (BHY Mark, trong đó
  log tạo thẻ/đổi trạng thái/đổi deadline đánh dấu `he_thong`).

Không đổi database — thuần trình bày và một hàm thuần.

## 5. Đã kiểm chứng

574 test pass (thêm 4 cho `gopDongThoiGian`: trộn đúng thứ tự xuyên hai
nguồn, gom ngày theo giờ VN qua nửa đêm UTC, lọc đúng, hai định dạng ISO
xếp đúng). Build sạch, lint không thêm lỗi.

Trình duyệt thật 760px: hai loại dòng phân biệt được bằng mắt, vạch ngày
đúng, bộ lọc «Báo cáo» ẩn hết bong bóng, ô soạn ghi rõ chỉ gửi trao đổi.

## 6. Chưa làm

- Trả lời theo luồng (cha–con) trong trao đổi — bảng đã có `cha_id`, giao
  diện chưa dùng.
- Nhảy tới dòng báo cáo từ thông báo đẩy.

# Nhịp báo đủ tuyến, bỏ trần · Cài BHY ONE hay dùng web

08/2026, theo chỉ đạo của Giám đốc.

## 1. Ghi nhịp nay báo ĐỦ tuyến phụ trách và không chịu trần

GĐ chốt: *«tất cả người được giao phụ trách khi ghi nhịp thì sẽ push lên
notification của tất cả mọi người»*.

Đây là **đảo lại một nửa thang thông báo** dựng ở đợt trước. Lúc đó tôi cắt
nhịp xanh/vàng chỉ tới người bám sát, để cấp trên khỏi bị dội tin. GĐ quyết
ngược, và lý do đứng vững: giai đoạn đang tập thói quen thì **cả tuyến nhìn
thấy nhịp thở hằng ngày** quan trọng hơn sự yên tĩnh của cấp trên.

Hai thay đổi:

- Mọi nhịp — xanh, vàng, đỏ — đều đi tới `ct2_ds_nhan_khi_co_chuyen()`: cán bộ ·
  người phối hợp · lãnh đạo theo dõi · Phó phòng · Trưởng phòng · PGĐ phụ trách ·
  người tự bấm Theo dõi.
- `NHIP` **miễn trần** chống nhiễu, cùng nhóm với `N12` (trao đổi). Trần vẫn giữ
  cho các loại tin khác, và vẫn đếm riêng từng mã sự kiện.

**Rủi ro đã biết và GĐ chấp nhận**: Trưởng phòng KHDN 15 cán bộ sẽ nhận tới 15
tin mỗi sáng. Nếu sau này thấy dội quá, đường lùi là bật lại trần riêng cho
`NHIP` — sửa một dòng, không phải dựng lại toàn bộ.

## 2. Cần cài «BHY ONE» hay giữ nguyên web?

**Không có phần mềm nào để cài.** «BHY ONE» chính là trang `chieuthuc3.com` —
nó đã là PWA (`manifest.webmanifest`, `display: standalone`), nên khi «Thêm vào
màn hình chính» thì hiện ra như một app với tên BHY ONE. Cùng một thứ, hai cách
mở.

Câu trả lời **khác nhau theo máy**:

| Máy | Cần làm gì |
| --- | --- |
| **Android** | Mở web trên Chrome là **đủ**. Push chạy ngay trong tab thường, không cần thêm bước nào. |
| **iPhone / iPad** | **Bắt buộc** «Thêm vào MH chính» rồi mở từ biểu tượng BHY ONE. Safari trong tab thường **không cho** Web Push — giới hạn của iOS (chỉ có từ iOS 16.4 và chỉ ở chế độ đã cài). |

Nói gọn cho cán bộ: *Android thì bật thẳng trên trình duyệt; iPhone thì thêm ra
màn hình chính trước rồi mới bật được.*

## 3. Danh sách 73/100 cán bộ chưa bật

Xuất PDF `danh-sach-chua-bat-thong-bao.pdf` — gom theo phòng, có cột trống để
tích tay, kèm hướng dẫn ba bước cho cả Android lẫn iPhone.

Điểm đáng chú ý: **8 cán bộ lãnh đạo chưa bật**, trong đó có **2 Trưởng phòng**
(DVKH, Văn Giang) và **Trưởng phòng KHDN** — phòng nhiều việc nhất Chi nhánh
mới chỉ 2/15 người bật.

| Phòng | Chưa bật |
| --- | --- |
| Phòng KHDN | 13/15 |
| Phòng DVKH · Văn Giang · Văn Lâm | 8 mỗi phòng |
| Ân Thi | 7/8 |
| Bán lẻ · Khoái Châu · Yên Mỹ | 6 mỗi phòng |
| HTTD · TCTH | 5 mỗi phòng |
| Ban Giám đốc | 1/4 |

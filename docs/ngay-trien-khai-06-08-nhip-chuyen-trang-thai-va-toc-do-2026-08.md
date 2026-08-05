# Ngày triển khai 06/08/2026 — nhịp tính từ hôm nay · rà soát chuyển trạng thái · tốc độ nhập tính bằng giây

*Ba việc Giám đốc giao sáng ngày triển khai chính thức tại TCTH, KHDN, Bán lẻ.*

## 1. Nhịp tính từ ngày hôm nay

**Mốc `NGAY_TRIEN_KHAI = 2026-08-06`** (src/lib/cauHinhNhip.ts) — mọi thước đo
**kỷ luật nhịp** kẹp từ mốc này:

| Thước đo | Trước | Từ nay |
|---|---|---|
| Im lặng đầu việc (`soNgayImLang`) | đếm từ ngày nhập Miro → sáng khai trương cả bảng đã «im lặng 3 ngày» | đếm từ 06/08 — hôm nay 0, mai chưa ghi mới thành 1 |
| Im lặng hồ sơ PDTD (`hsNgayImLang`) | như trên | như trên |
| Bảng nhịp tuần/tháng (`ct2_bang_nhip_ky`) | tính cả ảnh chụp 03/08 (một người «mất nhịp» hôm hệ thống còn nhập liệu) | chỉ đếm từ 06/08; ảnh chụp cũ giữ nguyên trong DB, không vào thước đo |

**Cố ý KHÔNG lùi:** hạn hoàn thành, số ngày quá hạn, tuổi cột chờ — đó là lời
hứa với khách hàng và BGĐ theo tờ lịch, không phải kỷ luật nhịp. Thẻ quá hạn
145 ngày sáng nay vẫn đỏ «quá hạn 145 ngày».

**Sự cố chặn được trước 9h sáng:** cron chốt sổ nhịp (09:00, T2–T6) đã **gãy
im lặng hai ngày 04–05/08** — thẻ vô chủ nhập từ Miro (cố ý không bịa tên) làm
INSERT vỡ NOT NULL, và một dòng vỡ hủy cả lượt chốt của toàn chi nhánh. Đã vá:
thẻ vô chủ không nợ nhịp của ai nên đứng ngoài phép chốt (vấn đề «vô chủ» đã
được nêu ở cảnh báo thiếu trường). Chạy thử cho 06/08 có hoàn tác: 15 người
được chốt, không lỗi.

## 2. Rà soát chuyển trạng thái — mỗi đích hỏi gì, ai được làm

Đối chiếu từng đích chuyển giữa client (`lyDoChanChuyen`) và trigger database
(`f_ct2_truoc_sua_dau_viec`):

| Đích | Ai | Hỏi gì / điều kiện | Ghi chú |
|---|---|---|---|
| 📋 Chuẩn bị | chủ thẻ, lãnh đạo | — | |
| 🔨 Đang làm (từ Chuẩn bị, việc tiến trình) | chủ thẻ, lãnh đạo | Cổng 2 «Bắt đầu làm»: 3 câu (xong có gì · mục tiêu nào · mấy bước) + câu 4 tùy chọn (con số) — hệ thống tự viết dòng Plan, tự chuyển cột | mỗi màn một câu, không bắt gõ lại |
| 🤝 Chờ phối hợp | chủ thẻ, lãnh đạo | **chọn người đang giữ việc** — đồng hồ trách nhiệm đổi chủ | **cửa mới mở** |
| ⏳ Chờ duyệt | chủ thẻ, lãnh đạo | như trên | **cửa mới mở** |
| ✅ Hoàn thành | chủ thẻ, lãnh đạo | tiến độ = 100% | cổng Check/Act đã bỏ từ PR #105 |
| 🔒 Đã đóng | **chỉ lãnh đạo** | — (lãnh đạo rà rồi chốt) | **cửa mới mở** |
| ⛔ Dừng/Hủy | **chỉ lãnh đạo** | lý do ≥ 30 ký tự, lưu vết | nay ẩn hẳn với cán bộ thay vì để bấm rồi ăn lỗi |
| Mở lại thẻ đã đóng/hủy | **chỉ lãnh đạo** | — | **bịt lỗ**: bản cũ vô tình cho cán bộ kéo thẻ đã hủy vào cột chờ |
| Việc THƯỜNG TRỰC | — | không vào cột chờ / Hoàn thành | lọc sẵn khỏi ô chọn |

**Phát hiện chính của đợt rà:** ba trạng thái (hai cột chờ + Đã đóng) có luật
đầy đủ ở cả client lẫn trigger **nhưng không có cửa vào** — ô chọn đích chỉ bày
4 cột hiển thị. Hệ quả dây chuyền: đồng hồ «tuổi cột chờ» không bao giờ chạy,
tầng «Đang chờ chính tôi» của BGĐ không bao giờ có đầu việc, và thông báo «mời
anh/chị rà và đóng thẻ» trỏ tới một nút không tồn tại. Nay danh mục đích chuyển
(`CT2_TRANG_THAI_CHON`) đủ bảy trạng thái, lọc theo quyền và loại việc **trước
khi bày ra** — người dùng không chọn được thứ chắc chắn bị chặn.

## 3. Nhập buổi họp sáng — ngân sách thời gian tính bằng giây

Mục tiêu: cán bộ 6 thẻ ghi xong nhịp **ngay trong lúc họp đầu ngày**.

Ngân sách cũ (đo theo bước, ước lượng giây mỗi bước):

| Bước — đường cũ | Giây |
|---|---|
| Mở cổng, bấm «Ghi nhịp» → **điều hướng** sang trang Chiêu thức 2 | 3–5 (tải trang + dữ liệu) |
| Tự tìm lại khối «Việc của tôi», bấm «Ghi nhịp nhanh» | 3–6 |
| Mỗi thẻ: chạm vào ô câu để lấy con trỏ | 1–2 × 6 thẻ |
| Mỗi thẻ: chờ tải «câu gần nhất» của thẻ kế | ~1 × 6 thẻ |
| Gõ câu (≥15 ký tự) + bấm Lưu | 10–15 × 6 thẻ (phần việc thật) |
| **Tổng phần thừa ngoài gõ** | **≈ 20–30 giây** |

Đường mới:

| Bước — từ 06/08 | Giây |
|---|---|
| Bấm «Ghi nhịp ngay» trên trang chủ → **cửa lướt mở tại chỗ**, không điều hướng | < 1 |
| Con trỏ **tự nằm trong ô câu** (cờ + % đã điền sẵn theo thẻ) | 0 |
| Gõ câu → **Ctrl/Cmd+Enter** lưu, tay không rời bàn phím | 0 (thay cú bấm chuột) |
| Thẻ kế hiện ngay — nhật ký thẻ kế đã **nạp trước** trong lúc đang gõ | 0 |
| **Tổng phần thừa ngoài gõ** | **≈ 1–2 giây** |

Phần không cắt: chính câu nhịp. 15 ký tự tối thiểu, chặn trùng câu hôm qua,
cờ vàng/đỏ phải khai vướng mắc — đó là nội dung của kỷ luật, cắt nó là cắt
luôn lý do tồn tại của nhịp. Công thức giữ nguyên một dòng hướng dẫn:
**«Hôm qua đã làm gì · kế hoạch hôm nay · đề xuất gì (nếu có)»**.

## Đã kiểm

611 test qua (thêm 6: kẹp mốc triển khai ×2 lib, danh mục đích chuyển ×3, bịt
lỗ mở lại thẻ ×1), tsc + lint sạch, build qua. Chốt sổ 06/08 chạy thử 15 người
không lỗi (đã hoàn tác — bản thật do cron 9h ghi).

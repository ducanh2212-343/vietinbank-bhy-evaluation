# Kỷ yếu số — flipbook kỷ niệm 20 năm trên BHY ONE (08/2026)

Tab **«Kỷ yếu số»** (menu Trang chủ → Kỷ yếu số, đường dẫn `/one/ky-yeu-so`) hiển thị
ấn phẩm kỷ niệm 20 năm dưới dạng **sách lật trang như giấy thật**, kèm **nhạc nền kỷ
niệm**, thay cho việc phát hành file PDF rời hoặc dùng dịch vụ ngoài (Heyzine).

## Kiến trúc

```
Supabase Storage (bucket private `ky-yeu`)     Bảng ky_yeu_an_pham
  {id}/v{phien_ban}/ky-yeu.pdf  ◄──────────────  pdf_path, phien_ban, trang_thai
  {id}/nhac-nen.mp3                              nhac_path
        │ signed URL (6 giờ, chỉ cán bộ đăng nhập)
        ▼
Trình duyệt cán bộ
  pdf.js self-host (public/pdfjs/) render trang → canvas
  Engine cuộn giấy tự viết (canvas 2D) — không turn.js, không CSS rotateY
  IndexedDB cache trọn PDF theo khóa `{id}:{phien_ban}` → lần mở sau < 1.5s
  Web Audio: tiếng giấy tổng hợp + nhạc nền có ducking khi lật
```

- **Không** nội dung nào rời hạ tầng BHY ONE/Supabase; **không** thẻ `<script src="https://cdn…">`.
- Engine lật chỉ biết interface `NguonTrang` (`src/lib/ky-yeu/nguonTrang.ts`) — sau này
  đổi sang ảnh JPG render sẵn (phương án B) không phải sửa engine.
- Đặc tả toán học của engine nằm ngay đầu `src/lib/ky-yeu/engineCuonGiay.ts`; bất biến
  `F + πr + L = W` và `F − L = d` có test tại `src/lib/ky-yeu/__tests__/`.

## Thay ấn phẩm / nhạc nền (Phòng TCTH)

1. Vào **Quản trị chung → Nội dung cổng → Quản trị Kỷ yếu số** (`/quan-tri-ky-yeu`).
2. Bấm **Thay PDF**, chọn file mới → hệ thống tự tăng `phien_ban`, đọc số trang,
   đẩy file vào bucket rồi cập nhật bản ghi. Cán bộ mở tab là thấy bản mới
   (khóa cache IndexedDB đổi theo phiên bản) — **không cần build lại code**.
3. **Thêm/Thay nhạc nền** (mp3/m4a) và **Nghe thử** ngay tại trang.
4. **Xuất bản / Gỡ xuất bản** để bật tắt hiển thị với cán bộ.
5. Cảnh báo dung lượng: PDF > 25MB hoặc nhạc > 8MB sẽ được nhắc — nên nén trước
   (xem mục chịu tải bên dưới).

Phân quyền: mọi cán bộ đăng nhập (không gồm khách đối tác) đọc bản `xuat_ban`;
chỉ `tcth_admin` / `system_admin` được ghi (RLS + policy storage trong migration
`20260912090000_ky_yeu_so_an_pham.sql`).

## Phương án chịu tải 150 người xem đồng thời

Điểm nghẽn duy nhất là **tải file PDF lần đầu** — mọi thứ còn lại (render, lật trang)
chạy tại máy cán bộ, máy chủ không tốn gì thêm.

Con số: PDF hiện ~23MB → 150 người mở lần đầu cùng lúc ≈ **3,5GB** băng thông ra từ
Supabase Storage. Trên đường truyền chi nhánh 100–300Mbps, 150 người tải song song
23MB sẽ chờ 2–15 phút nếu dồn cùng một phút. Các lớp giảm tải đã cài sẵn trong code:

1. **Stream từng đoạn (HTTP Range)** — pdf.js hiện trang bìa ngay khi vài trăm KB
   đầu về tới nơi, phần còn lại tải nền. Cảm nhận «vào được sách» chỉ vài giây.
2. **IndexedDB** — mỗi máy chỉ tải PDF **một lần**; mở lại (kể cả sau sự kiện) đọc
   từ đĩa, dưới 1,5 giây, không tốn mạng.
3. **Nạp trước có ưu tiên + cache LRU 12 canvas** — máy văn phòng không GPU rời
   vẫn 60fps, RAM không phình.

Việc nên làm thêm trước «giờ G» (sự kiện 150 người mở cùng lúc):

- **Nén PDF còn ≤ 8–10MB** (ảnh JPEG chất lượng ~70, 140–150dpi là đủ nét cho màn
  hình): giảm 60–70% băng thông và thời gian chờ. Lệnh gợi ý:
  `gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -o kyyeu-nen.pdf kyyeu-goc.pdf`
  rồi thay qua trang quản trị.
- **Khởi động sớm**: gửi link `/one/ky-yeu-so` cho cán bộ mở TRƯỚC sự kiện (ví dụ
  gửi email trưa hôm trước). Ai đã mở một lần thì hôm sự kiện đọc từ IndexedDB,
  gần như không chạm mạng — đây là lớp giảm tải hiệu quả nhất.
- **Theo dõi hạn mức egress Supabase** (Dashboard → Usage): mỗi lượt tải đầu tốn
  đúng dung lượng file. 150 người × 10MB ≈ 1,5GB/đợt — nằm thoải mái trong gói
  Pro (250GB/tháng); gói Free (5GB/tháng) sẽ chật nếu PDF chưa nén.
- Nếu về sau lượng xem tăng mạnh (nhiều chi nhánh khác cùng xem), chuyển file sang
  **phương án B**: render sẵn từng trang thành JPG khi upload và phát qua CDN tĩnh
  (Cloudflare/Vercel đã có sẵn trong dự án) — interface `NguonTrang` đã trừu tượng
  hóa sẵn cho việc này, engine không phải đổi.

Giao diện đã tối ưu cho cả hai kênh sự kiện: **1366×768** máy văn phòng (hai trang
mở), **điện thoại < 820px** tự chuyển một trang + vuốt lật; thanh công cụ cuộn ngang
khi hẹp, không che nội dung.

## Điều khiển

| Thao tác | Cách dùng |
|---|---|
| Lật trang | Kéo mép giấy; bấm nửa trái/phải; nút ◀ ▶ ⏮ ⏭; phím `←` `→` `Space` `Home` `End`; vuốt trên điện thoại |
| Nhảy trang | Ô nhập số trang + Enter (không lật hàng loạt) |
| Lưới trang | Nút «Lưới» — toàn bộ trang thu nhỏ, đánh dấu trang đang xem |
| Phóng to | Nút «Phóng to» — render lại bản nét cao, cuộn xem, `Esc` đóng |
| Toàn màn hình | Nút hoặc phím `F` |
| Chia sẻ | «Chép liên kết» → `/one/ky-yeu-so?trang=12`, mở đúng trang |
| Nhạc nền | «Bật nhạc nền» (không bao giờ tự phát), thanh âm lượng riêng, tự hạ 45% khi lật trang, tự dừng khi rời tab |
| Tải PDF gốc | Chỉ vai trò quản trị thấy nút |

Khả năng tiếp cận: đi hết sách bằng bàn phím, focus vàng nhìn rõ trên nền navy,
`prefers-reduced-motion` → chuyển trang tức thời không cuộn giấy; trình duyệt quá cũ
(không PointerEvent) tự rơi về chế độ xem trượt đơn giản kèm một dòng báo.

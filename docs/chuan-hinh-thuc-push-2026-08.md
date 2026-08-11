# Chuẩn hình thức thông báo đẩy (push)

09/08/2026. Trả lời yêu cầu GĐ kèm ảnh màn hình khóa: *"thiết kế lại hình thức push
notifications để phân biệt rõ tên task, tên người báo cáo ghi nhịp/trao đổi, nội dung
ghi nhịp/trao đổi — hiện nay đang hơi rối, có tỷ lệ % và các dấu rất khó nhìn"*, và yêu
cầu tiếp theo: *"tính toán cho tất cả các loại push"*.

Bổ sung 11/08/2026 (mục 7): nhãn phân hệ `[CT2]`/`[CT3]`/`[Dấu ấn]` trong tiêu đề push
+ chuông trong app đậm tiêu đề và treo chip — trả lời yêu cầu GĐ: *"bôi đậm các tiêu đề
để dễ nhìn hơn, phân biệt Task chiêu thức 2, chiêu thức 3 upskill và BHY Mark"*.

## 1. Chỗ rối của format cũ

Ảnh màn hình khóa cho thấy ba lỗi cùng lúc:

1. **Tiêu đề dài gãy dòng** — «Mai Hải Quân vừa cập nhật hành động» chiếm hai dòng đậm,
   ăn hết chỗ của thân tin.
2. **Thân tin nối một chuỗi** — «tên việc · trạng thái · 25%» dính nhau; tên việc dài
   (có thẻ hàng trăm ký tự) nuốt sạch phần còn lại.
3. **Ba thứ người đọc cần thì không tách được**: tên việc, người báo, nội dung.

## 2. Chuẩn mới — ba luật

1. **Tiêu đề ngắn, mang con số quan trọng nhất.** Tin hành động cá nhân:
   `<Tên người> — <động từ> <N%>`. Tin tổng hợp: `<tên bản tin> — <con số chính>`.
   Tin sự kiện: giữ nhãn sự kiện («Có việc chờ anh/chị chốt»). Không để tiêu đề gãy dòng.
2. **Thân tin mỗi dòng một nhãn** — `Việc:` / `Hồ sơ:` / `Dấu ấn:` rồi `Nội dung:` /
   `Trao đổi:` / chi tiết. Tên đối tượng cắt 55–70 ký tự (hàm `ct2_cat` phía DB,
   `short()` phía edge function), nội dung cắt 140–160, có dấu ba chấm.
3. **Không nối các vế bằng «·»; không ký hiệu trang trí** (`↳`). Cảnh báo dùng đúng hai
   dấu: `⚠️` (vướng mắc) và `❗` (cần trả lời). Riêng `→` giữ cho lùi hạn vì nó là dữ
   liệu (hạn cũ → hạn mới), không phải trang trí.

Tin **kêu gọi hành động một câu** (nhắc nộp phiếu, nhắc quiz, mẹo tính năng) giữ dạng
câu văn — chuẩn nhãn áp cho tin BÁO CÁO có nhiều thành phần thông tin, không áp máy móc
cho câu một ý.

## 3. Bảng áp cho từng loại

| Loại tin | Nơi soạn | Tiêu đề mới | Thân tin mới |
|---|---|---|---|
| Cập nhật Kanban CT3 | `notify-kanban-update` | `📝 <Tên> — tiến độ 25%` / `🏁 <Tên> — báo hoàn thành` | `Việc:` + `Nội dung:` + `⚠️` khi có |
| Ghi nhịp đầu việc | `f_ct2_thong_bao_nhip` | `<Tên> — ghi nhịp 25%` / `— báo ĐANG VƯỚNG` / `— báo có rủi ro` | `Việc:` + `Nội dung:` + `⚠️ Vướng:` |
| Ghi nhịp hồ sơ | `f_ct2_hs_thong_bao_nhip` | `<Tên> — ghi nhịp hồ sơ` | `Hồ sơ:` + `Nội dung:` + `⚠️ Vướng:` |
| Trao đổi / bình luận | `f_ct2_thong_bao_binh_luan` | `<Tên> — trao đổi` / `— nhắc tên anh/chị` | `Việc:/Hồ sơ:/Dấu ấn:` + `Trao đổi:` + `❗ Cần trả lời` |
| Bồi bằng chứng dấu ấn | `f_ct2_thong_bao_bang_chung` | `<Tên> — bồi bằng chứng dấu ấn` | `Dấu ấn:` + `Phần <S>:` |
| Giao việc (N13) | `f_ct2_thong_bao_dau_viec` | giữ nhãn cũ | `Việc:` + `Hạn:` + hướng dẫn |
| Trọng điểm BGĐ (N14) | như trên | giữ | `Việc:` + một câu |
| Chờ ý kiến (N7) | như trên | giữ | `Việc:` + một câu |
| Chờ chốt (N15) | như trên | giữ | `Việc:` + một câu |
| Dừng/Hủy (N16) | như trên | giữ | `Việc:` + `Lý do:` |
| Lùi hạn (N17) | như trên | giữ | `Việc:` + `Hạn: cũ → mới` |
| Vòng đời hồ sơ (HS_*) | `f_ct2_thong_bao_ho_so` | giữ nhãn cũ | `Hồ sơ: <tên KH> (<số tiền>)` + chi tiết |
| Nhịp ngày cho TP | `ct2-nhip-bao-cao` | `📊 Nhịp sáng nay — N cán bộ cần nhắc` | `Phòng:` + `Đúng giờ: x/y` + `Mất nhịp:` + `Muộn:` |
| Nhịp tuần các cấp | như trên | `📈 Nhịp tuần <k/c> — giữ nhịp N%` | `Phạm vi:` + `Cần nhắc:` + `Đứng đầu:` |
| Kanban tuần lãnh đạo | `weekly-kanban-digest` | `📋 Kanban tuần <k/c> — hoàn thành N%` | `Chưa khởi động:` + `Quá hạn:` + `Chưa cập nhật tuần:` |
| Kanban tuần toàn phòng | như trên | giữ (đếm x/y chưa cập nhật) | `Chưa cập nhật: <tên>` xuống dòng `Đã cập nhật: <tên>` |
| Nhắc T6 cán bộ | như trên | giữ | câu văn (một ý) |
| Nhắc T6 lãnh đạo | như trên | giữ | `Chưa cập nhật: <tên>` + câu chốt |
| Digest việc tồn | `send-reminders` | giữ | mỗi việc một dòng (bỏ nối «;») |
| Toàn cảnh BGĐ | như trên | giữ | mỗi dòng một số liệu, bỏ đầu dòng «• » |
| Nhắc nộp phiếu | như trên | giữ | `Hạn nộp:` + câu hệ quả |
| Nhắc lịch nghỉ | `nhac-lich-nghi` | giữ | bỏ ký hiệu `↳` |
| Quiz / mẹo tính năng | `quiz-reminders`, `send-feature-tip-push` | giữ | câu một ý — không cần nhãn (quiz chưa chạy) |

Tin qua hàng đợi CT2 được `notify-ct2` tự thêm dấu mức ở đầu tiêu đề: 🟡 nhẹ · 🔴 đỏ ·
⛔ chặn — vì vậy các hàm soạn KHÔNG tự thêm emoji vào `tieu_de`.

## 4. Ví dụ trước / sau — đúng tin trong ảnh GĐ gửi

Trước:

> **📝 Mai Hải Quân vừa cập nh…ật hành động**
> Sử dụng AI làm công cụ thiết kế, tư vấn và hướng dẫn làm sản phẩm · Đang làm · 25%

Sau (dry-run bản đã triển khai, cùng log 08:12 ngày 27/07):

> **📝 Mai Hải Quân — tiến độ 25%**
> Việc: Sử dụng AI làm công cụ thiết kế, tư vấn và hướng dẫn làm sản phẩm
> Nội dung: Sử dụng AI thiết kế biểu mẫu

Chữ trạng thái (Phải làm/Đang làm) bỏ hẳn: con số tiến độ và động từ đã nói đủ, chữ đó
chính là thứ chen giữa gây rối.

## 5. Ràng buộc kỹ thuật phải giữ

- **Chỉ đổi chuỗi chữ.** Logic chọn người nhận, mức tin, điều kiện kích hoạt của mọi
  hàm giữ nguyên từng dòng — đợt này là đợt hình thức, trộn thêm logic vào là không rà
  nổi.
- Chuông trong ứng dụng (`Ct2ChuongThongBao`) hiển thị `noi_dung` bằng
  `whitespace-pre-wrap` + `line-clamp-2` → các dòng nhãn xuống dòng đúng, xem đủ khi mở.
- `ct2_cat(text, max)` là hàm cắt dùng chung phía DB — đổi độ dài cắt thì đổi một chỗ.
- Đã kiểm chứng: dry-run `notify-kanban-update` với đúng log trong ảnh; dry-run cả hai
  chế độ `ct2-nhip-bao-cao`; soạn thử nhịp/N15 bằng biểu thức mới trên dữ liệu thật.
  Nhân tiện bắt được một lỗi đường kiểm thử của `ct2-nhip-bao-cao` (thứ Hai tính từ
  tuần hiện tại thay vì tuần chứa `body.ngay` → khoảng ngày ngược, trả rỗng) — đã sửa.

## 6. Trạng thái triển khai (09/08/2026 tối)

| Nơi | Trạng thái |
|---|---|
| 6 hàm DB (`f_ct2_thong_bao_*`) + `ct2_cat` | ĐÃ áp production (2 migration) |
| `notify-kanban-update` v4 | ĐÃ deploy |
| `ct2-nhip-bao-cao` v3 | ĐÃ deploy — nhịp ngày 09:15 sáng thứ Hai chạy format mới |
| `weekly-kanban-digest`, `send-reminders` | Sửa trong repo, deploy theo lịch sáng thứ Hai (sau digest 06:30) |
| `nhac-lich-nghi` | Sửa trong repo — deploy cùng đợt kế tiếp, lần nhắc tới ~23/08 |

Sáng 11/08: digest 06:30 kiểm tra 15/15 thư gửi đủ → `weekly-kanban-digest` v5,
`send-reminders` v16, `nhac-lich-nghi` v2 đã deploy — toàn bộ 21 loại chạy chuẩn 09/08.

## 7. Nhãn phân hệ (bổ sung 11/08/2026)

Ba phân hệ cùng bắn push về một điện thoại: **Chiêu thức 2** (đầu việc + hồ sơ tín
dụng + nhịp), **Chiêu thức 3** (Kanban hành động phát triển — upskill), **Dấu ấn BHY
Mark**. GĐ yêu cầu nhìn tiêu đề phải biết ngay tin thuộc phân hệ nào.

### Nguồn sự thật: nhãn dòng đầu thân tin, không phải mã sự kiện

`ma_su_kien` không phân biệt được phân hệ — bình luận dùng chung `N12` và bằng chứng
dùng chung `NHIP` cho mọi loại đối tượng. Nhưng chuẩn 09/08 đã bắt thân tin mở đầu bằng
nhãn đối tượng, nên nhãn đó chính là mã phân hệ:

| Nhãn dòng đầu | Phân hệ | Tag tiêu đề |
|---|---|---|
| `Việc:` / `Hồ sơ:` / khác | Chiêu thức 2 | `[CT2]` |
| `Hành động:` | Chiêu thức 3 | `[CT3]` |
| `Dấu ấn:` | BHY Mark | `[Dấu ấn]` |

Hệ quả phải vá để nhãn đủ nghĩa (migration `20260917090000`):
- `f_ct2_thong_bao_binh_luan`: bình luận trên **thẻ Kanban** trước rơi vào nhãn mặc
  định `Việc:` — không tách được CT3 khỏi CT2. Nay nhánh `THE_KANBAN` dùng `Hành động:`.
- `f_ct2_thong_bao_bang_chung`: tiêu đề rút còn «… — bồi bằng chứng» (tag `[Dấu ấn]`
  đã nói phân hệ, khỏi lặp chữ).
- `notify-kanban-update`: thân tin đổi `Việc:` → `Hành động:` cho khớp quy ước.

### Nơi gắn tag

- **Tin qua hàng đợi CT2** → `notify-ct2` gắn TẬP TRUNG khi phát:
  `<dấu mức> [<phân hệ>] <tiêu đề>` (hàm `nhanPhanHe`, trùng luật `moduleThongBao`
  phía app). `LICH_NGHI` không tag — tin hạ tầng cho quản trị. Vì vậy các hàm soạn
  tiếp tục KHÔNG tự thêm emoji lẫn tag vào `tieu_de`; `ct2-nhip-bao-cao` v4 đã bỏ
  📊/📈 tự gắn (trước đó màn hình khóa hiện hai emoji chồng nhau: «🟡 📊 Nhịp…»).
- **Tin CT3 push thẳng** (`notify-kanban-update`, `weekly-kanban-digest`) → tự gắn
  `[CT3]` ngay sau emoji đầu tiêu đề, ở cả 8 mẫu tin.
- `send-reminders` giữ nguyên: digest việc tồn gộp nhiều phân hệ trong một tin, tin
  nhắc nộp phiếu thuộc hệ đánh giá 343 — không thuộc ba phân hệ trên.

### Bôi đậm nhãn: được ở chuông, KHÔNG được ở màn hình khóa

Câu hỏi GĐ 11/08: in đậm riêng «Việc:», «Nội dung:»… còn chữ sau để thường?

- **Màn hình khóa: không có đường làm.** Web Push chỉ nhận `body` là chuỗi chữ thuần
  (`showNotification(title, { body })`) — chuẩn không có trường định dạng, hệ điều hành
  cho đúng hai mức: tiêu đề đậm, thân thường. Đúng trên cả iOS lẫn Android.
  Mẹo ký tự Unicode đậm (𝗩𝗶ệ𝗰) **không dùng**: bảng ký tự đó thiếu nguyên âm tiếng
  Việt nên chữ hiện nửa đậm nửa thường, máy cũ ra ô vuông, trình đọc màn hình đọc
  thành «ký tự toán học in đậm V». Vì vậy nhãn phải tự đứng vững bằng CẤU TRÚC —
  đầu dòng, dấu hai chấm, mỗi dòng một nhãn. Đó là lý do luật 2 mục 2 tồn tại.
- **Chuông thì được** (HTML): nhãn `font-semibold` + đậm màu hơn một nấc
  (`text-foreground/75`), phần chữ theo sau giữ `text-muted-foreground`.

Nhãn nhận diện theo **hình dạng**, không theo danh sách cố định (`tachNhanDong`,
`src/lib/ct2.ts`): đầu dòng, chỉ chữ/số/khoảng trắng, tối đa 28 ký tự, cho phép một
dấu cảnh báo đứng trước (`⚠️ Vướng:`). Nhờ vậy nhãn mới sinh sau này (`Hạn nộp:`,
`Phần S3:`) tự khớp mà không phải sửa mã, còn câu văn có dấu hai chấm ở giữa
(«…chưa cập nhật. Hạn chót: hết Chủ nhật») thì không bị bôi nhầm — dấu chấm chặn lại.
Có test cho cả hai chiều.

### Chuông trong ứng dụng (`Ct2ChuongThongBao`)

- Tiêu đề đổi `font-medium` → `font-semibold` — chữ đậm, quét danh sách nhanh hơn
  (màn hình khóa thì OS vốn tự đậm tiêu đề, không cần làm gì).
- Chuông vốn là chuông CT2 nên KHÔNG dán nhãn cho số đông; chỉ tin «lạc dòng» đeo
  chip màu: `CT3` (tím), `Dấu ấn` (hổ phách) — đọc từ `moduleThongBao(noi_dung)`
  (`src/lib/ct2.ts`, có test). Tin cũ trước 11/08 mang nhãn `Việc:` cho thẻ Kanban
  sẽ hiện như CT2 — chấp nhận, danh sách 20 tin xoay vòng nhanh.

Ví dụ sau khi gắn (dry-run 11/08 trên dữ liệu thật):

> **📝 [CT3] Trần Văn Khái — tiến độ 0%**
> Hành động: Cần ứng dụng AI vào công việc cụ thể
> Nội dung: AI được dùng vào việc tra cứu, tạo thiệp chúc mừng sinh nhật…

> **🟡 [CT2] Nhịp sáng nay — 2 cán bộ cần nhắc**
> Phòng: Phòng KHDN
> Đúng giờ: 5/7
> Mất nhịp: Đỗ Việt Anh, Hàn Thị Thùy Linh

Triển khai 11/08: migration `20260917090000` đã áp; `notify-ct2` v5,
`notify-kanban-update` v5, `weekly-kanban-digest` v6, `ct2-nhip-bao-cao` v4 đã deploy;
phần chuông theo bản build frontend kế tiếp.

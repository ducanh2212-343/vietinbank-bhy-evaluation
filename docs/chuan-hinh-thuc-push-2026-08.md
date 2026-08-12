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
| **Nhắc nhịp sáng cho cán bộ** (12/08) | `ct2_nhac_nhip_sang` | `Sáng nay còn N việc phải ghi nhịp` | câu mở ngày (kho 78 câu, xoay vòng) + `Việc 1:`/`Việc 2:` (tối đa 2) + `Chuỗi đúng giờ:` khi ≥3 ngày + mốc giờ |

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

## 8. Bấm push phải tới đúng việc, kể cả khi phiên đã hết (12/08/2026)

GĐ báo: bấm thông báo lúc chưa đăng nhập (hoặc đã bị đăng xuất sau 1 tiếng) thì đăng
nhập xong **mất luôn** việc đang muốn xem. Tin đúng, và hỏng ở hai chỗ nối tiếp nhau
trên cùng một cú bấm:

**a) Cửa đăng nhập không nhớ đích đến.** Ba chỗ cùng vứt địa chỉ đang muốn tới:
`ProtectedRoutes` và hai chốt trong `AdminRoute` đẩy về `/dang-nhap` trống, `LoginRoute`
thì cứng `/one`, còn `Login.tsx` gọi thêm `navigate('/')`. Nay đích đến đi kèm qua
`?tiep=` trên thanh địa chỉ (`src/lib/dieuHuongDangNhap.ts`), và `LoginRoute` là **nơi
duy nhất** quyết định đi đâu sau đăng nhập — `Login.tsx` thôi tự điều hướng để hai lệnh
không đá nhau.

Vì sao dùng URL chứ không phải bộ nhớ của router: push mở cửa sổ mới hoàn toàn, và
người dùng có thể tải lại trang đăng nhập giữa chừng — trạng thái trong bộ nhớ mất theo.

`?tiep=` **chỉ nhận đường dẫn nội bộ**. Tham số chuyển hướng không kiểm tra là lỗ hổng
kinh điển: gửi link `/dang-nhap?tiep=https://trang-gia-mao…` để cán bộ đăng nhập thật
rồi bị ném sang trang giả mạo. Chặn cả `//tên-miền`, `/\tên-miền`, ký tự điều khiển
chèn giữa, và vòng lặp về chính cửa đăng nhập. Có test cho từng đường.

**b) Service worker nuốt lỗi mở trang.** `client.navigate(url)` **từ chối** khi cửa sổ
không do service worker điều khiển (tab mở trước khi SW kịp nắm quyền), nhưng lỗi đó bị
bỏ qua và cửa sổ vẫn được `focus()` — người dùng bấm thông báo mà cửa sổ đứng nguyên
trang cũ, y hệt triệu chứng «mất luôn». Nay có nhánh dự phòng mở cửa sổ mới.

Đã kiểm chứng bằng trình duyệt thật trên bản build: 4 đường push (thẻ việc CT2, hồ sơ
tín dụng, Kanban CT3, link sâu trang quản trị) đều giữ nguyên đích qua cửa đăng nhập;
2 đường chuyển hướng độc đều bị chặn ở lại trong hệ thống.

## 9. Nhắc nhịp sáng cho cán bộ — 07:30 ngày làm việc (12/08/2026)

Yêu cầu GĐ: *"xây dựng push cho cán bộ về các task cần cập nhật đầu giờ sáng, việc này
gửi lúc 7h30 sáng ngày làm việc."*

**Chỗ trống nó bổ.** Luồng nhịp trước đây chỉ báo SAU KHI ĐÃ LỠ: chốt sổ 09:00 → digest
cho Trưởng phòng 09:15 («sáng nay ai chưa ghi»). Người duy nhất còn kịp làm gì đó trước
mốc — chính cán bộ — lại không được nhắc. Nay khép vòng: nhắc người làm trước, báo người
quản trước khi hết giờ, tổng kết cho lãnh đạo sau.

| Mốc | Việc | Ai nhận |
|---|---|---|
| 06:45 | Mở nhịp | — |
| **07:30** | **Nhắc việc chưa ghi** | **Từng cán bộ còn nợ** |
| 08:31 | Hết đúng giờ | — |
| 08:45 | Hết ân hạn | — |
| 09:00 | Chốt sổ | — |
| 09:15 | Digest ai chưa ghi | Trưởng phòng |

**Ai nhận:** chỉ người còn nợ thật. Ghi hết trước 07:30 thì không nhận gì; không có việc
đang chạy cũng vậy. Im lặng là trạng thái đúng, không phải hệ thống hỏng.

**Đếm việc gì:** lấy nguyên định nghĩa của `ct2_chot_so_nhip` — đầu việc TIẾN TRÌNH đang
làm, có người chịu trách nhiệm. Cố ý KHÔNG mở sang hồ sơ tín dụng hay Kanban CT3: nhắc
thứ không nằm trong bảng chấm thì cán bộ làm xong vẫn bị trừ, còn thứ bị trừ thì không ai
nhắc — sai một lần là lần sau không ai đọc.

**Bấm vào mở thẳng thẻ:** còn đúng 1 việc thì tin gắn `dau_viec_id`, chuông và push đưa
tới đúng thẻ đó. Thực tế cán bộ giữ trung bình 1,3 việc đang chạy nên đa số tin mở đúng
một chạm. Nhiều việc thì để trống — về danh sách.

**Mốc giờ trong tin đọc từ `ct2_cau_hinh()`**, không chôn số: TCTH dời giờ ân hạn thì lời
nhắc tự đổi theo. Lãnh đạo phòng thực ra được tính đúng giờ tới 08:45, nhưng
`ct2_la_lanh_dao_phong()` trả lời *"TÔI có phải lãnh đạo phòng này không"* (dựa `auth.uid()`)
nên tác vụ nền không hỏi hộ người khác được — dùng chung mốc chặt hơn 08:31 cho mọi
người: lãnh đạo bị nhắc sớm 14 phút thì vô hại, báo "vẫn kịp" cho người đã muộn thì có hại.

Mẫu tin (dry-run dữ liệu thật, sau khi `notify-ct2` gắn dấu mức + nhãn phân hệ):

> **🟡 [CT2] Sáng nay còn 2 việc phải ghi nhịp**
> Cà phê chưa kịp nguội, nhịp đã kịp ghi.
> Việc 1: Hoàn thiện hs bảo lãnh và Hs PL cho cty mới: công ty tiến phát
> Việc 2: hoàn thiện cấp GHTD cho cty sơn tùng
> Ghi trước 08:31 là đúng giờ — sau 08:45 tính mất nhịp.

Từ 13/08, tin mở bằng MỘT CÂU MỞ NGÀY xoay vòng (kho 78 câu, 11 nhóm động cơ, không lặp
trong 63 ngày, có chế độ an_toan/tat cho ngày nhạy cảm) — «mở bằng người, đóng bằng
luật». Thiết kế, kho câu và quy tắc vận hành: docs/cau-mo-ngay-nhac-nhip-sang-2026-08.md.

**Chống nhắc trùng** khóa theo (loại tin, người, ngày giờ VN): cron chạy lại hay TCTH bấm
tay đều không sinh tin thứ hai trong ngày. **Ngày nghỉ im lặng** qua `ct2_la_ngay_lam_viec`
(cron chỉ biết thứ Hai–Sáu, không biết lễ).

`_that = false` là mặc định — gọi tay chỉ xem trước, không gửi. Cron gọi `(true)`.

Đã kiểm chứng trên database thật (giao dịch có rollback): ngày nghỉ im lặng ✓ · gửi thật
đặt đúng 1 tin ✓ · chạy lại không trùng ✓ · `phat_luc` ngay không bị hoãn ✓ · gắn thẻ để
bấm thẳng ✓ · mức NHE, kênh push+bell ✓.

**Lưu ý vận hành:** bảng `lich_nghi_le` hiện đang RỖNG, nên mọi thứ Hai–Sáu đều bị coi là
ngày làm việc — kể cả 02/09. TCTH cần nhập lịch nghỉ trước mỗi kỳ (tác vụ `nhac-lich-nghi`
nhắc trước 10 ngày), nếu không cán bộ sẽ bị nhắc ghi nhịp vào đúng ngày lễ.

## 10. Chuỗi đúng giờ (13/08/2026)

GĐ hỏi *"đã có tính năng cho những người duy trì chuỗi streak ghi nhịp đúng giờ chưa"* —
chốt làm cả hai hướng KHÔNG phá nguyên tắc «im lặng là đúng»:

- **Huy hiệu trong app** (tab «Của tôi»): `🔥 Chuỗi đúng giờ: N ngày`, hiện từ 2 ngày,
  **chỉ mình thấy** — RPC `ct2_chuoi_dung_gio_cua_toi` chỉ trả chuỗi của người đăng
  nhập, cán bộ không tra được chuỗi đồng nghiệp (nhịp là gương soi, không phải bảng
  so sánh). Mất chuỗi thì không hiện gì — im lặng, không phê phán.
- **Dệt vào tin 07:30 sẵn có**: người còn nợ mà đang giữ chuỗi ≥3 ngày nhận thêm dòng
  `Chuỗi đúng giờ: N ngày — giữ tiếp hôm nay.` ngay trước dòng luật. Không thêm tin
  nào; người đã ghi xong vẫn im lặng. Đây là loss-aversion kiểu Duolingo bằng số thật
  của chính người nhận.

Hướng thứ ba — push chúc mừng khi đạt mốc — **cố ý không làm**: người làm tốt bắt đầu
nhận tin là phá nguyên tắc số một; muốn thì GĐ chốt riêng.

Luật công bằng: **ngày nghỉ phép / không có việc không phá chuỗi** (ngày đó không có
ảnh chụp). Chuỗi tính đến lần chốt sổ 09:00 gần nhất, sàn 06/08 trùng Bảng nhịp.

> **🟡 [CT2] Sáng nay còn 1 việc phải ghi nhịp**
> Cà phê chưa kịp nguội, nhịp đã kịp ghi.
> Việc: Theo dõi tiến độ đền bù bảo hiểm công ty Mỹ Hương
> Chuỗi đúng giờ: 4 ngày — giữ tiếp hôm nay.
> Ghi trước 08:31 là đúng giờ — sau 08:45 tính mất nhịp.

Kiểm chứng 13/08: hàm khớp tính tay 100% trên toàn bộ ảnh chụp; 8 cán bộ đang giữ chuỗi
≥3 (dài nhất 5); dry-run tin sáng 13/08 có 7 người nhận dòng chuỗi. Nhân tiện sửa dòng
mốc giờ chôn cứng «8h00/8h30» ở tab «Của tôi» — nay đọc từ cấu hình, khớp với tin push.

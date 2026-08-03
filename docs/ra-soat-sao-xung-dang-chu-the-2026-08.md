# Rà soát Sao Xứng Đáng: trùng họ tên & chủ thể thi đua tập thể (03/08/2026)

Hai việc được đặt ra: (1) Nguyễn Thị Phượng đang bị tính trùng giữa Phòng Ân Thi
và Phòng Tổng hợp; (2) thi đua phòng ban đang tính theo tổng sao **cán bộ** của
phòng nhận được, trong khi chủ thể phải là **tập thể phòng**.

---

## 1. Nguyễn Thị Phượng — trùng họ tên, không phải trùng phiếu

### Dữ liệu thật

Chi nhánh có **hai cán bộ cùng tên Nguyễn Thị Phượng**, cả hai đều `active`:

| Hồ sơ | Phòng | Chức vụ |
|---|---|---|
| Nguyễn Thị Phượng | Phòng Tổ chức Tổng hợp | Phó phòng Tổ chức Tổng hợp |
| Nguyễn Thị Phượng | Phòng giao dịch Ân Thi | Phó phòng giao dịch phụ trách quầy |

Trong `star_records` mỗi chị đúng **1 phiếu, 1 sao**, không có phiếu nào nhập lặp:

| Phòng trên phiếu | Ngày | Người tặng | Serial | Lý do |
|---|---|---|---|---|
| Phòng Ân Thi | 19/05/2026 | Lý Văn Tám (Trưởng PGD Ân Thi) | 150 | Hỗ trợ cán bộ trong phòng mở tài khoản vốn KH FDI |
| Phòng TCTH | 28/07/2026 | Trần Đức Anh (Giám đốc) | 217 | Chủ động triển khai BHY Quizzi / Ideas / Sharing |

Hai phiếu khác ngày, khác người tặng, khác serial, khác nội dung → **hai người
khác nhau, không phải một phiếu bị nhập hai lần.** Bảng "Thống kê cá nhân" gộp
theo `(họ tên + phòng)` nên vẫn tách đúng hai dòng, mỗi dòng 1 sao.

### Lỗi thật nằm ở "Tôi được ghi nhận" trên trang chủ

`OneHomePage` lọc phiếu sao của người đăng nhập **chỉ theo họ tên**:

```ts
records.filter(r => !r.isCollective && r.name.trim().toLowerCase() === myName.trim().toLowerCase())
```

Hệ quả: cả hai chị Nguyễn Thị Phượng đều thấy **2 sao** trên thẻ "Sao Xứng Đáng
tích lũy" (và thấy cả lý do ghi nhận của người kia), trong khi mỗi người chỉ có 1
sao. Đây chính là chỗ đang tính trùng.

**Đã sửa:** thêm hàm `selectMyStarRecords` (`starStats.ts`) và hook `useMyStars`:

- Lấy các phiếu khớp họ tên (bỏ dấu cách thừa, không phân biệt hoa thường).
- Nếu các phiếu đó nằm ở **nhiều phòng** → lọc thêm theo phòng của người đăng
  nhập (`profiles.department_id` → `departments.name` → nhãn phòng trên phiếu).
- Nếu chỉ **một phòng** → giữ nguyên toàn bộ. Cố ý không lọc phòng ở trường hợp
  này để không làm mất sao của cán bộ có phiếu ghi lệch tên phòng (chuyển phòng,
  người nhập ghi tắt…). Chỉ can thiệp đúng ca trùng tên.
- Trùng tên mà không xác định được phòng → trả về rỗng, thà hiển thị 0 còn hơn
  cộng nhầm thành tích của đồng nghiệp. (Hiện 100/100 hồ sơ `active` đều có phòng
  nên nhánh này không xảy ra trên dữ liệu thật.)

### Lỗi kéo theo: 5 phòng giao dịch bị dồn về Phòng DVKH

Khi dò phòng cho việc trên mới lộ thêm một lỗi trong `standardizeDepartment`
(`starParser.ts`): luật bắt cụm chung `'giao dịch'` → `Phòng DVKH` đứng **trước**
các luật riêng của từng phòng giao dịch. Tên đầy đủ trong danh bạ là "Phòng giao
dịch Ân Thi / Khoái Châu / Văn Giang / Văn Lâm / Yên Mỹ" → **cả 5 phòng đều rơi
vào Phòng DVKH**.

Dữ liệu đang có trong `star_records` không dính lỗi này (file nhập trước đây ghi
"Phòng Ân Thi"), nhưng bất kỳ file Excel nào ghi tên phòng đầy đủ đều sẽ bị xếp
sai — đúng cơ chế khiến một cán bộ Ân Thi bị gán nhầm phòng.

**Đã sửa:** đẩy cụm chung `'giao dịch'` xuống **sau cùng**, chỉ dùng khi không
khớp phòng giao dịch có tên riêng nào. `Phòng Dịch vụ khách hàng`, `DVKH`,
`Giao dịch viên`, `Phòng giao dịch` (không kèm tên) vẫn về Phòng DVKH như cũ.

---

## 2. Thi đua phòng ban: xếp theo sao TẬP THỂ, không cộng sao cán bộ

### Hiện trạng

`departmentStats` cộng **tất cả** phiếu của phòng — cả phiếu cá nhân lẫn phiếu
tập thể — rồi xếp hạng theo tổng đó. Một ghi chú trong mã nguồn ghi rõ đây là
"sửa có chủ đích so với bản gốc" (bản gốc chỉ cộng phiếu tập thể).

Cách tính này sai chủ thể:

- **Cán bộ nhận sao** → thành tích và phần thưởng quy đổi về chính cán bộ đó
  (đã tính đủ ở tab "Thống kê cá nhân" và ở dòng "Dự trù kinh phí quà").
- **Tập thể phòng nhận sao** → là một chủ thể riêng, có phiếu riêng ("Tập thể
  Phòng …"), có mốc quà riêng.

Cộng gộp vừa tính hai lần cùng một ngôi sao ở hai bảng, vừa khiến phòng đông
người luôn xếp trên phòng ít người bất kể tập thể được ghi nhận thế nào.

### Đã sửa

`buildDepartmentStats` tách hai chỉ số:

- `collectiveStars` — sao **tập thể phòng** nhận được → **căn cứ duy nhất xếp hạng**,
  và cũng là căn cứ tính mốc quà + giá trị quà tặng của tập thể.
- `staffStars` / `staffCount` — sao và số cán bộ của phòng, giữ lại nhưng đánh
  dấu rõ **"(tham khảo)"**, không cộng vào thi đua.

Bằng điểm thì xét tiếp sao cán bộ rồi đến tên phòng, để thứ hạng không đổi ngẫu
nhiên giữa các lần tải trang.

### Thay đổi thứ hạng trên dữ liệu hiện tại

| Tập thể | Sao tập thể | Sao cán bộ (tham khảo) | Hạng mới | Hạng cũ |
|---|---:|---:|---:|---:|
| Tập thể Phòng Văn Lâm | 5 | 9 | 1 | 5 |
| Tập thể Phòng Ân Thi | 3 | 9 | 2 | 6 |
| Tập thể Phòng DVKH | 3 | 16 | 2 | 2 |
| Tập thể Phòng Khoái Châu | 3 | 8 | 2 | 8 |
| Tập thể Phòng Yên Mỹ | 3 | 9 | 2 | 6 |
| Tập thể Phòng Bán lẻ | 2 | 13 | 6 | 4 |
| Tập thể Tổ FDI | 2 | 0 | 6 | 11 |
| Tập thể Phòng KHDN | 1 | 25 | 8 | **1** |
| Tập thể Phòng Văn Giang | 1 | 8 | 8 | 10 |
| Tập thể Phòng HTTD | 0 | 10 | 10 | 9 |
| Tập thể Phòng TCTH | 0 | 16 | 10 | **3** |

Lưu ý để chủ chương trình biết trước: **Phòng TCTH và Phòng HTTD chưa từng được
ghi nhận một phiếu tập thể nào** nên về 0 sao thi đua, dù cán bộ hai phòng nhận
lần lượt 16 và 10 sao. Nếu chi nhánh muốn hai phòng này có mặt trong thi đua tập
thể thì việc cần làm là **trao phiếu cho tập thể phòng**, không phải sửa công
thức.

---

## 3. Cột "Chỉ tiêu / Tỷ lệ hoàn thành" đã gỡ khỏi bảng thi đua

Cùng một lỗi lệch chủ thể. `DEPT_QUOTAS` (32 / 24 / 20 sao mỗi phòng, cộng Giám
đốc 48 và mỗi Phó GĐ 40 = **412 sao**) là **lượng sao mỗi đơn vị được phân bổ để
TRAO ĐI**, đúng như bảng "Phân Bổ 412 Sao Năm 2026 Theo Đơn Vị" ở đầu trang. Lấy
sao phòng **nhận được** chia cho hạn mức sao phòng **được trao** là so hai đại
lượng khác nhau.

Đã thay thanh "Tỷ lệ hoàn thành chỉ tiêu" bằng thanh **"So với phòng dẫn đầu"**
(so sánh trong cùng một đại lượng: sao tập thể). Hạn mức 412 sao vẫn giữ trong
file Excel xuất ra, đổi tên cột thành **"Sao phòng được phân bổ để TRAO cả năm"**
cho đúng bản chất.

**Còn để ngỏ:** muốn theo dõi "đã trao bao nhiêu / trên hạn mức" thì cần quy
người tặng (`star_records.sender`) về đơn vị của họ. Dữ liệu hiện tại rất thuận:
14 người tặng đều là Giám đốc, Phó GĐ và Trưởng phòng, 13/14 khớp thẳng hồ sơ
`profiles` (riêng "Dương Thị Thanh Thuý" lệch cách viết dấu). Chưa làm trong đợt
này vì ngoài phạm vi yêu cầu — chờ chủ chương trình quyết.

---

## 4. Màn hình nhập sao: bỏ ô nhập, dẫn sang form Lark

### Hiện trạng

Đường ghi nhận thật của chi nhánh: **Lãnh đạo phòng / Ban Giám đốc nhập trên form
Lark → Lark tự đẩy sang Zalo OA của group toàn Chi nhánh** để vinh danh ngay.

Form nhập trên cổng (`StarRecognitionForm`) ghi thẳng vào `star_records` với
`source='form'`. Đối chiếu dữ liệu: **0 phiếu `source='form'`** — toàn bộ 141
phiếu / 146 sao đều là `source='import'`. Không ai từng dùng ô nhập này. Giữ lại
chỉ tạo ra một đường ghi nhận thứ hai, lệch với dữ liệu Lark mà Phòng TCTH dùng
để đối soát, và trái nguyên tắc "một chức năng một cửa" của cổng.

### Đã sửa

Khối "Ghi Nhận Sao Xứng Đáng" nay còn hai việc, đều là việc cổng làm tốt hơn Lark:

1. **Trợ giúp soạn đúng cấu trúc** "Cảm ơn … / vì đã … / đem lại …" (mục 3 văn
   bản triển khai), có nút **Copy lời ghi nhận** để dán sang form Lark.
2. **Dẫn thẳng sang form Lark**, kèm sơ đồ luồng
   `Form Lark → Zalo OA Chi nhánh → Phòng TCTH đối soát → Bảng tổng hợp trên cổng`
   và nêu rõ quyền phát Sao: Trưởng phòng cho cán bộ phòng mình, Ban Giám đốc cho
   toàn Chi nhánh; phiếu phải ghi nhận trên form **trước khi** tổ chức trao Sao.

Cán bộ không thuộc nhóm được phân quyền thấy thêm dòng hướng dẫn gửi đề xuất tới
Trưởng phòng phụ trách.

Link form Lark đặt ở hằng số `LARK_STAR_FORM_URL` trong `StarRecognitionForm.tsx`
— đổi link chỉ sửa một chỗ. Đã gỡ `submitFormRecord` khỏi `useStarRecords` (không
còn nơi gọi). Cột `source` và chính sách RLS cho `source='form'` vẫn giữ nguyên,
phòng khi sau này nối API Lark đẩy thẳng vào cổng.

---

## 5. Đối chiếu cổng với văn bản triển khai chính thức

Đọc lại toàn văn *"Thông báo triển khai chương trình ghi nhận Sao xứng đáng năm
2026"* (TB-CNBHY-TCTH, 5 trang).

### Khớp đúng

- Bảng phân bổ 412 Sao (32/24/20 theo quy mô phòng, GĐ 48, mỗi PGĐ 40).
- 8 mốc quà 1 → 20 Sao và giá trị tối đa từng mốc: khớp 100% `STAR_REWARD_TIERS`.
- 0,5 điểm KPI / 1 sao; ngân sách tủ quà 500 triệu; Phòng TCTH là đầu mối.
- Cấu trúc lời ghi nhận "Cảm ơn / vì đã / đem lại".
- **Xác nhận mục 2:** văn bản ghi rõ tập thể nhận Sao là chủ thể riêng, có KPI
  riêng và giá trị quy đổi quà riêng → cách xếp hạng mới là đúng quy chế.

### Đã sửa cho khớp văn bản

| Chỗ lệch | Trước | Nay |
|---|---|---|
| Hạn giao Sao quý | "Họp quý giao trước mồng 5" | Thêm ngoại lệ **Quý 1: trước 10/03/2026** |
| Nhãn cột 412 sao | "Cả năm" | "Sao **phát ra** / năm" + ghi chú đây không phải chỉ tiêu phải nhận về |
| Quy mô nhân sự | Chỉ ghi TCTH (16), KHDN (14) | Đủ 10 phòng: DVKH (13), Văn Lâm (12), Khoái Châu (10), Văn Giang (10), Yên Mỹ (10), Bán lẻ (9), Ân Thi (8), HTTD (7) |
| Ghi chú tập thể phân bổ Sao | "có thể phân bổ lại cho cá nhân tham gia trực tiếp thương vụ" | Nêu đủ: tối đa bằng số Sao được nhận; đã phân bổ thì **giữ KPI nhưng mất giá trị quy đổi quà** phần đã chia |
| Nguồn Sao ngoài phân bổ | Không nhắc | Nêu rõ còn Sao từ các chương trình/chiến dịch có gắn cơ chế Sao Xứng Đáng |

### Còn lệch — cần chủ chương trình quyết

**a) Công thức quy đổi quà so với chú thích mốc 8 Sao.** Chú thích 1 của văn bản:
mốc 1–6 Sao đổi thưởng vẫn tích lũy tiếp; **từ mốc 08 Sao trở lên, khi đổi quà
đóng dấu "ĐÃ ĐỔI QUÀ" và không tích lũy lên mốc cao hơn**. Trang tủ quà trên cổng
đã ghi đúng câu này, nhưng `getRewardBreakdown` lại cộng dồn đủ (gốc + mọi mốc 3
Sao + mốc 6 Sao + mốc cao nhất ≥ 8) — chữ và số trên cùng một trang đang nói khác
nhau. Ghi chú trong `starMath.ts` đã treo vấn đề này từ trước, chờ chủ chương
trình quyết.

Chênh lệch trên dữ liệu hiện tại (146 sao, chưa ai chạm mốc 8):

| Nhóm | Sao | Theo công thức đang chạy | Nếu chỉ tính 1 mốc cao nhất |
|---|---:|---:|---:|
| 70 cá nhân | 123 | 15.900.000 đ | 9.400.000 đ |
| 9 tập thể | 23 | 3.800.000 đ | 1.900.000 đ |

Chênh khoảng 1,7 lần và sẽ giãn rất nhanh khi có cán bộ vượt mốc 8–20 Sao (ví dụ
20 Sao: 49,3 triệu theo công thức đang chạy, 45 triệu nếu chỉ 1 mốc cao nhất).
Ngân sách trần là 500 triệu nên cách đọc nào cũng còn dư ở thời điểm này, nhưng
nên chốt trước khi có người tới mốc cao. **Chưa tự ý đổi** vì đây là con số tiền.

**b) Điểm KPI chưa được theo dõi trên cổng.** Văn bản quy định 0,5 điểm KPI/sao,
**trần 10 điểm/cá nhân hoặc tập thể/năm**. Cổng mới hiện "+0.5 Điểm KPI / 1 Sao"
ở phần giới thiệu, chưa cộng dồn và chưa cảnh báo khi chạm trần (20 sao là chạm
trần KPI). Chưa làm vì ngoài phạm vi yêu cầu.

**c) Sao tập thể đã phân bổ lại cho cá nhân chưa được mô hình hóa.** Đây là cơ
chế có thật trong văn bản và ảnh hưởng trực tiếp giá trị quy đổi quà của tập thể.
Hiện `star_records` không có trường nào ghi "sao này là sao tập thể chia lại", nên
không tính được phần tập thể bị trừ giá trị quy đổi. Cần thêm một cột đánh dấu ở
form Lark trước, rồi cổng mới xử lý được.

---

## 6. Việc đã làm

| Tệp | Thay đổi |
|---|---|
| `src/components/one/star/starStats.ts` | **Mới.** `buildIndividualStats`, `buildDepartmentStats` (xếp theo sao tập thể), `selectMyStarRecords` |
| `src/components/one/star/useMyStars.ts` | **Mới.** Hook lấy sao của người đăng nhập kèm phòng ban |
| `src/components/one/star/starParser.ts` | Sửa thứ tự nhận diện phòng giao dịch; xuất `standardizeDepartment` |
| `src/components/one/star/StarAnalytics.tsx` | Dùng hàm tổng hợp mới; bảng + sheet Excel "Thi đua Phòng ban" theo sao tập thể |
| `src/pages/one/OneHomePage.tsx` | "Tôi được ghi nhận" lọc theo họ tên **và** phòng |
| `src/components/one/star/StarRecognitionForm.tsx` | Bỏ ô nhập ghi vào DB; còn trợ giúp soạn lời ghi nhận + nút mở form Lark |
| `src/components/one/star/useStarRecords.ts` | Gỡ `submitFormRecord` (không còn nơi gọi) |
| `src/components/one/StarWorthy2026.tsx` | Bảng 412 Sao và ghi chú khớp văn bản triển khai |
| `src/components/one/star/__tests__/starStats.test.ts` | **Mới.** 15 ca kiểm thử |
| `src/components/one/star/__tests__/starParser.test.ts` | Thêm 4 ca cho nhận diện phòng giao dịch |

Không đụng tới dữ liệu trong `star_records` — không có bản ghi nào cần xóa hay
sửa, toàn bộ là lỗi cách tính ở tầng hiển thị.

**Chưa đổi:** thẻ "Dự trù kinh phí quà" vẫn chỉ cộng phần quy đổi của **cá nhân**
(đúng như nhãn "không gồm phiếu tập thể" đang ghi). Nay bảng thi đua đã hiện giá
trị quà của từng tập thể, chi nhánh có thể muốn cộng thêm phần này vào dự trù
ngân sách — cần chủ chương trình xác nhận trước khi đổi con số ngân sách.

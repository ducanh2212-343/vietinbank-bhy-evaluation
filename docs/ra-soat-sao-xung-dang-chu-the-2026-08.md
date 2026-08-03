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

## 4. Việc đã làm

| Tệp | Thay đổi |
|---|---|
| `src/components/one/star/starStats.ts` | **Mới.** `buildIndividualStats`, `buildDepartmentStats` (xếp theo sao tập thể), `selectMyStarRecords` |
| `src/components/one/star/useMyStars.ts` | **Mới.** Hook lấy sao của người đăng nhập kèm phòng ban |
| `src/components/one/star/starParser.ts` | Sửa thứ tự nhận diện phòng giao dịch; xuất `standardizeDepartment` |
| `src/components/one/star/StarAnalytics.tsx` | Dùng hàm tổng hợp mới; bảng + sheet Excel "Thi đua Phòng ban" theo sao tập thể |
| `src/pages/one/OneHomePage.tsx` | "Tôi được ghi nhận" lọc theo họ tên **và** phòng |
| `src/components/one/star/__tests__/starStats.test.ts` | **Mới.** 15 ca kiểm thử |
| `src/components/one/star/__tests__/starParser.test.ts` | Thêm 4 ca cho nhận diện phòng giao dịch |

Không đụng tới dữ liệu trong `star_records` — không có bản ghi nào cần xóa hay
sửa, toàn bộ là lỗi cách tính ở tầng hiển thị.

**Chưa đổi:** thẻ "Dự trù kinh phí quà" vẫn chỉ cộng phần quy đổi của **cá nhân**
(đúng như nhãn "không gồm phiếu tập thể" đang ghi). Nay bảng thi đua đã hiện giá
trị quà của từng tập thể, chi nhánh có thể muốn cộng thêm phần này vào dự trù
ngân sách — cần chủ chương trình xác nhận trước khi đổi con số ngân sách.

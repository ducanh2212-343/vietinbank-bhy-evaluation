# Rà soát bảng Kanban PDTD Phòng KHDN + phương án đưa vào dữ liệu

02/08/2026. Nguồn: board Miro «Kanban KHDN - PDTD», bảng 47 dòng.
Áp khung `phan-tich-kanban` (§B2 phân loại → §B3 phép kiểm chung → §B4 phép kiểm
riêng cho board có rủi ro tài chính → §B5 báo cáo theo ngoại lệ).

---

## 1. Tổng quan

47 hồ sơ tín dụng, 8 cán bộ phụ trách, 2 lãnh đạo được gán theo dõi.

| Bước | Số hồ sơ |
|---|---|
| (1) Thu thập hồ sơ | 6 |
| (2) Trình LĐP | 3 |
| (3) Trình LĐ Chi nhánh | 3 |
| (4) Trình Cấp PDTD TSC | 3 |
| (5) Hoàn thiện HS GN | **0** |
| (6) Hoàn thành | 22 |
| Đến hạn GHTD 2 tháng tới | 4 |
| **Không có trạng thái** | **6** |

Toàn bộ board đều là **card «Tiến trình»** theo §A3 — hồ sơ tín dụng có điểm bắt
đầu và điểm kết thúc rõ ràng. Không có card «Trạng thái thường trực» nào bị lẫn
vào, nên áp đủ bộ phép kiểm.

**Điểm làm tốt, cần giữ:** 47/47 hồ sơ đều có Assignee. Không có card vô chủ —
đây là thứ nhiều board khác không đạt được, và là điều kiện đầu tiên của §A1.

---

## 2. Cảnh báo, xếp theo mức nghiêm trọng

### Mức 1 — Rủi ro tài chính: cột «Đến hạn GHTD» không có ngày (§B4)

Đây là cột nguy hiểm nhất của board, và là **đúng chỗ quy chế §B4 yêu cầu bắt
buộc có ngày cụ thể trong trường Date**.

| Hồ sơ | Cán bộ | Vấn đề |
|---|---|---|
| Cơ cấu nợ Công ty Quỳnh Trang | CB-4 | End date **15/07/2026 — đã qua 18 ngày** mà vẫn nằm ở cột đến hạn |
| Cong ty nhua va co khi dong duong 2 | CB-2 | **Không có ngày nào** |
| Cong ty Nhua va khuon Dong Duong | CB-2 | **Không có ngày nào** |
| CT CP Bossco – Cụm CN Giai Phạm | CB-6 | **Không có ngày nào** |

3/4 hồ sơ trong cột này không có ngày → **không ai biết còn bao nhiêu ngày nữa
hạn mức hết**. Cột được lập ra đúng để cảnh báo sớm, nhưng thiếu ngày thì nó chỉ
còn là một danh sách tên.

Riêng Quỳnh Trang là mức nặng nhất: mốc đã trôi qua mà hồ sơ chưa chuyển bước.

### Mức 2 — Hai hồ sơ lớn nhất board không có trạng thái (§B3 #1)

| Hồ sơ | Số tiền | Cán bộ | Ưu tiên |
|---|---|---|---|
| Công ty Ngành Ong (KS Thành Công) | **290 tỷ** | CB-2 | High, Category TSC, Due 31/08/2026 |
| Công ty CP may Minh Anh Đô Lương | **250 tỷ** | CB-3 | High, Due 20/08/2026 |

Cả hai đều được lãnh đạo gán theo dõi và đánh dấu High, nhưng **không ở bước nào
trong quy trình**. Không đọc được «đang ở đâu» thì cũng không đo được có đúng
hẹn không — đây chính là câu hỏi cốt lõi mà mỗi card phải tự trả lời.

Bốn hồ sơ khác cũng thiếu trạng thái: Sản phẩm tài trợ đại lý Hưng Phát, Công ty
TNHH Mặt Trời Việt, Cty Ngân Hà (tăng GH trung hạn 15 tỷ), Công ty CP dinh dưỡng
quốc tế Đài Loan (có cả Due 15/07 và End 10/08 nhưng không có bước).

### Mức 3 — Ngày và số tiền nằm trong Tags, hệ thống không lọc được (§B4)

Quy chế §B4 nêu rõ: *hồ sơ đến hạn/sắp hết hạn mức bắt buộc có ngày trong trường
Date, không chấp nhận ghi tay trong tên task hoặc tag*.

Thực tế: **chỉ 16/47 hồ sơ có ngày trong trường Due Date hoặc End date.** 14 hồ
sơ khác ghi ngày dưới dạng tag (`05/03/2026`, `31/07/2026`, `30/08/2026`…).

Ví dụ rõ nhất — **CT Ngôi Sao Việt** đang ở bước (4) Trình Cấp PDTD TSC, có tag
`04/04/2026` nhưng hai trường ngày đều trống. Máy không sắp xếp, không lọc,
không đếm tuổi chờ được từ một cái nhãn chữ.

Số tiền cũng vậy, và còn không nhất quán:

- `250` (không đơn vị) · `290 tỷ` · `150 ty` · `30  tỷ` (hai dấu cách) · `15 ty` và `15 tỷ` cùng tồn tại
- `Tái Cấp` · `Tai cap` · `tái cấp` — ba cách viết cho cùng một loại hồ sơ

→ **Không cộng được tổng dư nợ đang trình**, không lọc được theo loại hồ sơ.
Đây đúng là lý do bàn PDTD trong hệ thống đặt `so_tien` là **số** và `loai_ho_so`
là **danh mục**, không phải nhãn chữ.

### Mức 4 — Nghẽn WIP theo người (§B3 #4)

Đếm hồ sơ **đang chạy** (chưa Hoàn thành) theo từng cán bộ:

| Cán bộ | Đang chạy | |
|---|---|---|
| CB-2 | **5** | vượt ngưỡng 4 |
| CB-3 | **4** | chạm ngưỡng |
| CB-5 | **4** | chạm ngưỡng |
| CB-4 | 3 | |
| CB-6 | 3 | |
| CB-1, CB-7, CB-8 | 2 | |

CB-2 đang giữ 5 hồ sơ chạy song song, trong đó có hồ sơ 290 tỷ chưa có trạng
thái và 2 hồ sơ đến hạn GHTD không có ngày. Đây là người cần hỏi trước.

### Mức 5 — Bước (5) Hoàn thiện HS GN không ai dùng

22 hồ sơ đã «Hoàn thành» nhưng **chưa từng có hồ sơ nào đi qua bước (5)**. Nghĩa
là thực tế cán bộ nhảy thẳng từ (4) Trình Cấp PDTD sang (6) Hoàn thành.

Hai khả năng, cần Phòng xác nhận chứ không suy đoán:
- Bước (5) không phản ánh đúng quy trình thật → nên bỏ khỏi bảng;
- Hoặc bước (5) có thật nhưng bị bỏ qua khi cập nhật → đang mất một chốt kiểm.

### Mức 6 — Thiếu dữ liệu hành chính

- **Category** chỉ 3/47 hồ sơ có (TSC ×1, PGD ×2) — trường gần như không dùng.
- **Priority** chỉ 4/47 có.
- **CHM CT Hưng Phát** (300 tỷ, Tái Cấp) đã «Hoàn thành» nhưng mang tag
  `31/03/2025` — nếu đó là ngày đến hạn GHTD thì mốc đã qua hơn một năm. Cần xác
  minh, không kết luận.

### Điểm mù không đánh giá được

Dữ liệu bảng trả về **không có mốc cập nhật gần nhất của từng dòng**, nên
**không đo được tuổi chờ ở các cột trình** (§A5, §B3 #5) — vốn là phép kiểm quan
trọng nhất với board có cấp phê duyệt. Cũng không đếm được tỷ lệ comment buổi
sáng (§B3 #8) dù quy chế trên chính board yêu cầu *«báo cáo tiến độ hằng ngày
trong comment mỗi sáng»*.

Đây chính là khoảng trống mà bàn PDTD trong hệ thống lấp được: mỗi hồ sơ có
`giu_tu` (đồng hồ chờ bắt đầu khi trình) và `nhip_gan_nhat` (lần cập nhật cuối),
nên tuổi chờ và «chưa cập nhật» tính được tự động.

---

## 3. Đề xuất hành động, theo thứ tự

1. **Điền ngày đến hạn GHTD cho 3 hồ sơ Đông Dương 2, Nhựa & khuôn Đông Dương,
   Bossco Giai Phạm** — vào trường Date, không phải tag.
2. **Xử lý Quỳnh Trang**: mốc 15/07 đã qua, cần cập nhật trạng thái thật hoặc
   dời mốc kèm lý do.
3. **Gán bước cho 2 hồ sơ 290 tỷ và 250 tỷ**, rồi tới 4 hồ sơ còn lại thiếu trạng thái.
4. **Trao đổi với CB-2** về 5 hồ sơ chạy song song — cần giãn hay cần hỗ trợ.
5. **Chốt số phận bước (5)** trong cuộc họp Phòng gần nhất.
6. **Chuyển ngày và số tiền từ tag sang trường có kiểu** — việc này giải quyết
   luôn khi đưa vào hệ thống (mục 4).

---

## 4. Đưa vào dữ liệu hệ thống

### Bàn PDTD đã sẵn sàng

| Kiểm tra | Kết quả |
|---|---|
| Phòng KHDN trong hệ thống | `Phòng KHDN` (mã KHDN), 15 cán bộ |
| Bàn PDTD đã bật cho phòng | ✅ có trong `ct2_phong_pdtd` |
| Hồ sơ hiện có | 0 — bảng còn trống |

### Ánh xạ trạng thái Miro → hệ thống

| Miro | Hệ thống |
|---|---|
| (1) Thu thập hồ sơ | `THU_THAP` |
| (2) Trình LĐP | `TRINH_LDP` |
| (3) Trình LĐ Chi nhánh | `TRINH_LDCN` |
| (4) Trình Cấp PDTD TSC | `TRINH_TSC` |
| (5) Hoàn thiện HS GN | `HOAN_THIEN_GN` |
| (6) Hoàn thành | `HOAN_THANH` |
| **Đến hạn GHTD 2 tháng tới** | **không phải một bước** → `THU_THAP` + điền `ngay_den_han_ghtd` |

Ánh xạ cuối cùng là điểm quan trọng nhất: trên Miro đó là một *cột*, nhưng bản
chất nó là *một trường ngày*. Đưa vào hệ thống theo đúng bản chất thì cảnh báo
«hạn mức sắp hết mà chưa có hồ sơ tái cấp» chạy được tự động, thay vì phải nhớ
kéo thẻ vào cột.

### Chuẩn hóa khi nhập

- Tên khách hàng: gỡ bao Delta JSON, chuẩn hóa hoa/thường, bỏ chú thích ngày lẫn trong tên.
- Số tiền: đọc từ tag về **số nguyên, đơn vị triệu đồng** (`150 ty` → 150 000).
- Loại hồ sơ: `Tái Cấp`/`Tai cap`/`tái cấp` → `TAI_CAP`; còn lại suy từ tên
  (`Điều chỉnh…` → `DIEU_CHINH`, `Cơ cấu nợ…` → `CO_CAU_NO`, `Dự án…` → `DU_AN`).
- Cấp phê duyệt: tag/Category `TSC` → `TSC`; còn lại `CHI_NHANH`.
- Ngày trong tag → `ngay_den_han_ghtd`; Due/End date → `han_xu_ly`.

### Việc còn vướng: ánh xạ người

Bảng Miro chỉ trả về **mã người nội bộ của Miro**, không có tên. Tám mã này phải
được ghép với 15 cán bộ Phòng KHDN trong hệ thống, và đây là thứ **không được
đoán**: mỗi dòng là một hồ sơ tín dụng thật, gán sai người là gán sai trách
nhiệm cho một khoản vay hàng trăm tỷ.

Dấu vết nhận diện từng mã (Trưởng phòng đọc là biết ngay ai):

| Mã | Số HS | Hồ sơ tiêu biểu |
|---|---|---|
| `…581198358613` | 4 | Tái chế giấy Quảng Bình · Điều chỉnh GHTD của GDT |
| `…581332121408` | 8 | Ngành Ong 290 tỷ · Khuôn mẫu Đông Dương · Thành Huy |
| `…581198496429` | 5 | Minh Anh Đô Lương 250 tỷ · Thịnh Phát 200 tỷ · TMC Việt Nam |
| `…581199535147` | 7 | Onsen Hội Vân · Quỳnh Trang · Nhật Anh · Thiên Sơn |
| `…581198990231` | 7 | Hưng Phát 300 tỷ · Phú Thái · Dinh dưỡng quốc tế Đài Loan |
| `…581198496589` | 6 | Nhựa Tuệ Minh · KCN Thăng Long 2 · Arizon · Đại Lợi |
| `…581339317860` | 5 | Thuỷ sản Thuỵ Hải 150 tỷ · Khải Minh · Mỹ Hương |
| `…595062301991` | 5 | Thaicom · Hiếu Thảo · Hải Nam · Tâm Phương Đức |

Hai mã ở cột «Assigned To» là lãnh đạo theo dõi:

| Mã | Số HS | Hồ sơ |
|---|---|---|
| `…581081623947` | 6 | Ngành Ong · Minh Anh Đô Lương · Quỳnh Trang · Thành Đạt · TMC · Thịnh Phát |
| `…546600259076` | 4 | Minh Hoàng · Mỹ Hương · GROWFEED · Đại Lợi |

### Ba việc cần quyết trước khi nhập

1. **Ánh xạ 8 + 2 mã trên sang cán bộ thật.**
2. **Có nhập 22 hồ sơ đã Hoàn thành không?** Nhập thì có lịch sử và thống kê;
   không nhập thì bàn chỉ có 25 hồ sơ đang chạy, nhẹ và sạch hơn. Khuyến nghị
   nhập cả, vì thống kê tháng cần mẫu số.
3. **Dữ liệu khách hàng thật** — 47 tên doanh nghiệp kèm số tiền vay. Việc này
   nên ghi thẳng vào database, **không đưa vào mã nguồn** trong repo.

---

## 5. Đối chiếu với phễu khách hàng (§B4)

Board này còn có bảng «Phễu lọc khách hàng» ở frame khác. Đánh giá đầy đủ đường
ống tín dụng cần đối chiếu cả hai — bảng PDTD chỉ cho thấy phần đã vào quy
trình, không thấy phần đang đàm phán phía trước. Chưa làm trong đợt này.

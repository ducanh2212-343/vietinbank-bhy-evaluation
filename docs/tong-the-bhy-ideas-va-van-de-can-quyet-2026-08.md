# Tổng thể chương trình Bắc Hưng Yên Ideas và các vấn đề còn phải quyết

**Lập ngày:** 16/08/2026 · Số liệu chốt tới 14/08/2026 · Chu kỳ chương trình 01/06 – 31/12/2026

Bản trình bày cho Ban Giám đốc: <https://claude.ai/code/artifact/38e1845e-64f2-40fc-a7e6-cefd571d9c93>

---

## 1. Hiện trạng

Ý tưởng đầu tiên vào hệ thống 01/07/2026, mới nhất 14/08/2026 — chương trình mới
thực chạy khoảng sáu tuần rưỡi dù chu kỳ tính từ 01/06.

| Chỉ số | Giá trị |
|---|---|
| Ý tưởng đã gửi | 134 |
| Phòng, tổ có ý tưởng | 11 |
| Đang được tính KPI | 20 (toàn bộ là Bén rễ nạp từ cấp độ sẵn có) |
| Tiền thưởng đã cam kết | 19.400.000đ / 100 triệu |
| Vươn cành · Lan tỏa | 0 · 0 |
| Đợt chấm Hội đồng | 0 (21 ý tưởng đang chờ) |
| Ghi trạng thái SMP | 0/134 |
| Đánh dấu khoán gọn | 0 người |

### Theo phòng

| Phòng, tổ | Ý tưởng | Ươm mầm | Bén rễ | CB tính KPI | Chỉ tiêu Ươm mầm theo đầu người |
|---|---:|---:|---:|---:|---:|
| Phòng HTTD | 25 | 23 | 2 | 6 | 72 |
| **Phòng KHDN** | 24 | 19 | 5 | 15 | **180** |
| PGD Văn Lâm | 24 | 21 | 3 | 10 | 120 |
| **Phòng DVKH** | 15 | 15 | 0 | 13 | **156** |
| Phòng TCTH | 15 | 12 | 3 | 8 | 96 |
| PGD Văn Giang | 8 | 4 | 4 | 10 | 120 |
| Phòng KHBL | 8 | 6 | 2 | 8 | 96 |
| PGD Khoái Châu | 7 | 7 | 0 | 9 | 108 |
| PGD Ân Thi | 4 | 3 | 1 | 8 | 96 |
| PGD Yên Mỹ | 2 | 2 | 0 | 9 | 108 |
| Ban Giám đốc | 2 | 2 | 0 | 4 | 48 |

Chỉ tiêu theo Thẻ điểm KPI 25/06/2026 (12 Ươm mầm mỗi cán bộ), chưa trừ khoán gọn
vì hồ sơ chưa ai được đánh dấu.

## 2. Cơ chế đang chạy

### Bốn cấp độ

| Cấp độ | Ai quyết | Nhịp | Thưởng | Ràng buộc |
|---|---|---|---:|---|
| Ươm mầm | TCTH chốt với Trưởng phòng | Theo tuần | 100.000đ | Tối đa 02/tuần/phòng |
| Bén rễ | TCTH trình, Giám đốc duyệt | Liên tục | 300.000đ | Không hạn mức |
| Vươn cành | Hội đồng BHY Ideas | Theo quý | 1.000.000đ | Điểm TB ≥ 3,5 |
| Lan tỏa | Hội đồng BHY Ideas | Kỳ riêng quý IV | 2–3 triệu | Điểm TB ≥ 4,0 |

### Hai trục không suy ra nhau

Theo chỉ đạo vận hành 08/2026 — *tiền thưởng có thể khuyến khích nhưng KPI thì
không* — mỗi ý tưởng mang hai thuộc tính tách rời:

- **Ghi nhận KPI** — chịu hạn mức 02/tuần/phòng, chặn ở tầng CSDL, admin cũng không nới được.
- **Tiền thưởng** — linh hoạt: hồi tố, khuyến khích, hoặc chuyển kỳ sau.

Nguyên tắc **thưởng lũy kế**: công nhận cấp nào thì trả bù các cấp dưới ý tưởng
chưa từng được thưởng; khóa `UNIQUE(idea_id, cap_do)` chống trả trùng.

### Bốn màn hình

| Đường dẫn | Dành cho | Việc chính |
|---|---|---|
| `/one/y-tuong` | Mọi người | Giới thiệu và tổng quan các mục |
| `/one/y-tuong/gui` | Mọi cán bộ | Gửi ý tưởng, tra bảng theo dõi |
| `/one/y-tuong/hoi-dong` | Thành viên Hội đồng | Chấm 5 tiêu chí, tổng hợp, quản trị đợt |
| `/one/y-tuong/van-hanh` | BGĐ, TCTH | Duyệt Bén rễ, chốt hạn mức, SMP, ngân sách |

### Hội đồng

14 thành viên, 1 Chủ tịch. Phiếu định danh theo tài khoản nhưng **ẩn danh với cả
TCTH và Ban Giám đốc** — chỉ System Admin truy cập phiếu định danh, Hội đồng nhận
bản tổng hợp sau khi Chủ tịch công bố. Chặn tự chấm hai lớp (theo tài khoản gửi và
theo họ tên trong nhóm đề xuất); người bị chặn trừ khỏi mẫu số quorum.

## 3. Nút thắt lớn nhất — hạn mức và chỉ tiêu KPI mâu thuẫn

Hai văn bản của cùng Chi nhánh đo cùng một việc bằng hai đơn vị khác nhau:

- **Quy chế Ideas** giới hạn theo *phòng và tuần*: 02 ý tưởng/tuần/phòng.
- **Thẻ điểm KPI** giao chỉ tiêu theo *đầu người*: 12 Ươm mầm hoặc 6 Bén rễ mỗi cán bộ.

| Con số | Giá trị |
|---|---:|
| Chỉ tiêu KPI cần (100 CB × 12) | 1.200 |
| Hạn mức quy chế cả chu kỳ (11 phòng × 2 × 31 tuần) | 682 |
| Thực tế đã gửi | 134 |
| Được ghi nhận nếu áp đúng hạn mức | **55** |

**Hệ quả:** áp đúng hạn mức thì **79/134 ý tưởng (59%) không bao giờ được tính
KPI** — không phải vì kém mà vì phòng đó tuần ấy gửi nhiều hơn hai. Đã có **18/31
tuần-phòng vượt trần**, **9/11 phòng** từng vượt, tuần cao nhất một phòng gửi 15.

Ngay cả khi mọi phòng dùng hết hạn mức suốt 31 tuần, cả Chi nhánh chỉ đạt 682 —
**bằng 57% chỉ tiêu**. Với cơ chế hiện tại, chỉ tiêu KPI ĐMST *không thể hoàn thành*.

## 4. Nhóm A — Vấn đề chặn, cần quyết trước khi chốt KPI

### A1. Hạn mức theo phòng và chỉ tiêu theo đầu người không quy đổi được

Phòng KHDN 15 người cần 180 ý tưởng, hạn mức cả chu kỳ cho 62.

**Cần quyết:** nâng hạn mức theo quy mô phòng; hạ chỉ tiêu KPI về mức hạn mức cho
phép; hoặc đổi chỉ tiêu từ "số ý tưởng được ghi nhận" sang "số ý tưởng đã gửi".

**Đang tạm xử lý:** ghi nhận KPI bám đúng hạn mức, không nới; tiền tách riêng nên
cán bộ vẫn được khuyến khích. Đây là cách giữ số liệu trung thực, không phải cách
giải quyết mâu thuẫn.

### A2. Chưa có danh sách nhân viên khoán gọn

Hồ sơ nhân sự chưa đánh dấu một ai nên mọi mẫu số đang tính thừa.

**Cần quyết:** ai lập, ai duyệt, cập nhật theo nhịp nào.

**Đang tạm xử lý:** cột `profiles.khoan_gon` đã có, hàm `bhy_ideas_so_cb_tinh_kpi`
đã trừ sẵn. Chỉ còn khâu nhập.

### A3. Chưa có ý tưởng nào đạt Vươn cành hay Lan tỏa

Thẻ điểm đặt điều kiện cần cho KPI ĐMST của TP/PP. Hiện 0 Vươn cành, 0 Lan tỏa nên
toàn bộ TP/PP ở mức 0 điểm — dưới ngưỡng thì tính 0 chứ không chia theo tỷ lệ.

**Cần quyết:** mở đợt chấm Hội đồng đầu tiên trước thời điểm nào.

**Đang tạm xử lý:** màn chấm điểm, hạn nộp, nhắc tự động, bản tổng hợp đã sẵn sàng.

## 5. Nhóm B — Đang chạy theo chỉ đạo, chưa có căn cứ văn bản

| Mã | Nội dung | Cần quyết | Đang tạm xử lý |
|---|---|---|---|
| B1 | Thưởng lũy kế khi vượt cấp | Ban hành thành văn, kèm trần một ý tưởng (hiện tối đa 4,4 triệu) | Trả bù đúng cấp chưa có tiền, khóa chống trùng ở tầng dữ liệu |
| B2 | Mốc hồi tố 16/08/2026 (13,4 triệu cho 134 ý tưởng) | Ra thông báo để kế toán có căn cứ | Mốc đã vào hệ thống, biên ngày neo theo giờ VN cả hai phía |
| B3 | Kỳ xét Lan tỏa riêng | Chốt mốc cụ thể, mỗi năm mấy kỳ | Mở đợt bất kỳ lúc nào, có 3 tầng đề xuất gồm Lan tỏa trực tiếp |
| B4 | Thời gian tối thiểu xét cấp cao | Xác nhận hoặc sửa mốc 30 ngày (Vươn cành) và 60 ngày (Lan tỏa) | Suy từ Phụ lục 05; hệ thống *cảnh báo* chứ không chặn |
| B5 | Quorum Hội đồng | Xác nhận 100% hay hạ về 2/3 | Đặt 100% theo chỉ đạo, hợp kịch bản họp tại chỗ |
| B6 | Ai được đề xuất Vươn cành/Lan tỏa | Ghi vào quy chế, kèm kênh để cán bộ đề nghị TCTH | Chỉ TCTH đưa vào đợt; chưa có kênh đề nghị |
| B7 | TCTH tạm giữ quyền chốt Ươm mầm | Tạm thời hay lâu dài, khi nào trả về TP | Để dạng công tắc `bhy_ideas_cau_hinh.ai_chon_uom_mam`, có lưu dấu vết chốt với TP |

## 6. Nhóm C — Quy chế có nhưng chưa đủ chi tiết

| Mã | Nội dung | Cần quyết | Đang tạm xử lý |
|---|---|---|---|
| C1 | Lan tỏa là khoảng 2–3 triệu | Căn cứ chọn mức, ai quyết | Lấy mức tối thiểu 2 triệu khi tính lũy kế và dự toán |
| C2 | "Chuyển kỳ xét sau" nhưng chu kỳ hết 31/12 | Ý tưởng tồn cuối kỳ xử lý ra sao | Thanh ngân sách cảnh báo từ 80%, không chặn duyệt |
| C3 | Nút "Đề xuất Hội đồng" ≠ Bén rễ | Khẳng định rõ trong văn bản | Đã rà: quy chế **không** quy định tự động Bén rễ; hệ thống giữ hai việc tách rời |
| C4 | Khai xung đột lợi ích rồi thì sao | Vẫn tính, giảm trọng số, hay loại | Mọi phiếu đều tính; số phiếu có khai hiện trên tổng hợp |
| C5 | Hai phòng gửi trùng một ý tưởng | Ghi cho phòng gửi trước, chia đôi, hay cả hai | Chưa có quy tắc; chỉ hỗ trợ phòng ngừa bằng ô tra cứu toàn CN |
| C6 | Quy trình đối chiếu SMP | Giao đầu mối và nhịp đối chiếu | Màn đối chiếu đã có; ghi "Đồng ý" là tự lập dòng Bén rễ, không chiếm hạn mức |
| C7 | Ý tưởng của người đã chuyển công tác/nghỉ việc | Tính cho phòng nào, còn được thưởng không | Sổ chốt tên phòng tại thời điểm ghi nhận; phần tiền chưa có quy tắc |

## 7. Nhóm D — Đã có công cụ, chưa khởi động

| Việc | Hiện trạng | Ảnh hưởng nếu chậm |
|---|---|---|
| Mở đợt chấm Hội đồng đầu tiên | 0 đợt, 21 ý tưởng chờ | TP/PP không có điểm ĐMST |
| Đánh dấu nhân viên khoán gọn | 0 người | Mẫu số chỉ tiêu lãnh đạo tính thừa |
| Đối chiếu kết quả SMP | 0/134 | Bỏ sót đường ghi nhận không chiếm hạn mức |
| TCTH chốt Ươm mầm với các TP | 20 dòng KPI, đều là Bén rễ nạp sẵn | Không phòng nào có Ươm mầm tính KPI |

## 8. Đề xuất thứ tự xử lý

1. **Quyết A1 trước tiên** — việc duy nhất càng để lâu càng khó sửa; mỗi tuần trôi
   qua lại thêm một loạt ý tưởng rơi ngoài hạn mức, không ghi nhận bù về sau được.
2. **Nhập danh sách khoán gọn (A2)** — hành chính, làm ngay được, không có thì mọi
   mẫu số KPI đều sai.
3. **Mở đợt chấm Hội đồng đầu tiên (A3)** với 21 ý tưởng đang chờ.
4. **Gom nhóm B thành một văn bản bổ sung quy chế** — bảy nội dung đều đã chạy thực
   tế nên chỉ là ghi lại điều đang làm.
5. **Nhóm C xử lý dần** khi phát sinh; riêng C6 (đầu mối SMP) nên giao ngay.

### Nhận định để cân nhắc

Phần lớn các vấn đề trên có chung một gốc: quy chế Ideas được viết như một chương
trình phong trào (khuyến khích, có thưởng, có hạn mức giữ ngân sách), rồi sau đó
được gắn thêm vai trò làm thước đo KPI. Hai vai này đòi hai thứ khác nhau —
phong trào cần mở, thước đo cần chặt và ổn định.

Nếu Chi nhánh xác định Ideas là thước đo KPI, nên sửa quy chế theo hướng **bỏ hạn
mức ghi nhận** và chuyển việc kiểm soát ngân sách sang **khâu xét thưởng** thay vì
khâu ghi nhận.

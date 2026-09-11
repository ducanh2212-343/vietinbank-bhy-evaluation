# FDI Hub — Lịch sử sản phẩm đã tạo và dữ liệu lịch sử

**Ngày:** 11/09/2026 · **Căn cứ:** yêu cầu của Giám đốc «nghiên cứu phần lịch sử các
sản phẩm đã tạo ra hoặc dữ liệu lịch sử» sau khi FDI Hub lên cổng (08/09) và có thống
kê sử dụng theo phòng (10/09). **Tính chất:** nghiên cứu và đề xuất, chưa làm mã.

---

## 1. Kết luận

FDI Hub hiện **không giữ lại bất cứ sản phẩm nào cán bộ tạo ra**. Cán bộ nhập tên
doanh nghiệp, bấm «Sao chép prompt», mang sang ChatGPT/Gemini rồi nhận báo cáo ở
đó — cổng chỉ biết «có người mở tab Báo cáo nhanh», không biết doanh nghiệp nào đã
được lập báo cáo, ai lập, kết quả ra sao. Cùng một doanh nghiệp, hai Phòng giao dịch
có thể đang cùng tiếp cận mà không phòng nào biết.

Có **hai lớp lịch sử** cần tách bạch, vì chi phí và rủi ro khác hẳn nhau:

| Lớp | Câu hỏi trả lời | Hiện trạng | Đề xuất |
| --- | --- | --- | --- |
| **A. Lịch sử sản phẩm** | Doanh nghiệp nào đã được lập báo cáo / gợi ý quà, do phòng nào, khi nào, kết quả ở đâu | Không có gì; bản nháp form nằm trên trình duyệt từng máy | Làm ngay **A1** (ghi phiếu sản phẩm, không lưu nội dung) + **A3** (cán bộ lưu kết quả vào hồ sơ); **A2** (AI chạy trong cổng) để sau, có điều kiện |
| **B. Dữ liệu lịch sử sử dụng** | Xu hướng dùng theo tuần, phòng nào bắt đầu từ khi nào, ai quay lại | Có bảng lượt xem từ 10/09, tab Thống kê mới chỉ có tổng theo khoảng | Thêm chuỗi thời gian theo tuần và chỉ số quay lại — việc nhỏ, làm cùng đợt với A1 |

Khuyến nghị lộ trình: **Đợt 1 (1–2 ngày): A1 + B.** **Đợt 2 (2–3 ngày): A3.**
**A2 chỉ làm khi mô hình AI trong cổng có tra cứu web** — báo cáo nhanh doanh nghiệp
sống nhờ tra cứu công khai, mô hình không tra cứu được thì kém hẳn ChatGPT/Gemini
đang dùng, cán bộ sẽ quay về cách cũ.

---

## 2. Hiện trạng: FDI Hub tạo ra gì, và nó đi đâu

| Sản phẩm | Cách tạo | Đi đâu | Cổng có biết không |
| --- | --- | --- | --- |
| Báo cáo nhanh khách hàng FDI | Nhập tên DN, MST, quốc gia, KCN → prompt chuẩn «FDI RM Skill» → sao chép | ChatGPT/Gemini của cá nhân; file Word/PDF nếu cán bộ tự tải | Chỉ biết lượt mở tab. Bản nháp 4 ô nhập nằm trong trình duyệt (`localStorage`) |
| Gợi ý quà tặng theo văn hóa & phong thủy | Nhập năm sinh, giới tính, quốc tịch, chức danh, dịp, ghi chú moment → prompt kèm catalogue → sao chép | ChatGPT/Gemini của cá nhân | Như trên; ghi chú có thể chứa thông tin cá nhân của khách |
| Kịch bản gọi điện, thư cảm ơn song ngữ | Sao chép nguyên văn | WeChat/Zalo/email của cán bộ | Không |
| Prompt nhanh, mẫu lệnh Xiaoxin | Sao chép | AI chat cá nhân | Không |
| Tiến độ hành trình 6 bước, checklist | Tích trên trang | Trình duyệt từng máy | Không |

Hai hệ quả nghiệp vụ:

1. **Không có sổ tiếp cận.** Lãnh đạo không trả lời được «tháng này Chi nhánh đã lập
   báo cáo cho bao nhiêu doanh nghiệp FDI, phòng nào, doanh nghiệp nào» — trong khi
   đây mới là thước đo tiếp cận thật, còn lượt mở tab chỉ là thước đo đọc cẩm nang.
2. **Không phát hiện trùng.** PGD Văn Lâm và Phòng KHDN cùng lập báo cáo một doanh
   nghiệp ở KCN Phố Nối là chuyện có thể xảy ra mà không ai thấy.

Hạ tầng sẵn có trên cổng để dùng lại:

| Sẵn có | Dùng cho |
| --- | --- |
| Edge function `ai-advisor`: prompt và model từng tác vụ chỉnh ở «Quản trị AI & Prompt», có giới hạn tần suất, nhật ký token và chi phí (`ai_usage_log`, `ai_model_pricing`) | Phương án A2 |
| Kho tư liệu `portal_uploads` (bài + tệp, phân chuyên mục, ảnh ký URL) | Phương án A3 nếu muốn lưu tệp báo cáo |
| Bảng lượt xem `fdi_hub_luot_xem` + RPC thống kê gác quyền ở SQL | Lớp B |
| Khuôn «bảng ghi qua RPC, đọc qua hàm SECURITY DEFINER theo phòng» đã dùng cho lượt xem | A1 |

---

## 3. Lớp A — Lịch sử sản phẩm: ba phương án

### A1. Ghi «phiếu sản phẩm» khi cán bộ sao chép prompt — không lưu nội dung

Mỗi lần bấm «Sao chép prompt đầy đủ» (báo cáo nhanh) hoặc «Sao chép prompt quà
tặng», cổng ghi một dòng: loại sản phẩm, đối tượng (tên DN + MST + quốc gia + KCN;
với quà tặng chỉ ghi quốc tịch, chức danh, dịp), người, phòng, thời điểm. **Không
ghi kết quả AI, không ghi năm sinh / giới tính / ghi chú moment** của khách.

| | |
| --- | --- |
| Được gì | Sổ tiếp cận theo doanh nghiệp: ai, phòng nào, khi nào; đếm được «số DN đã lập báo cáo / tháng / phòng»; **cảnh báo trùng** ngay lúc nhập tên DN («PGD Văn Lâm đã lập báo cáo DN này ngày 04/09 — liên hệ anh X»); form tự điền lại từ lần trước |
| Chi phí | 1–2 ngày. Một bảng, hai RPC, một tab «Lịch sử» trong FDI Hub. Không gọi AI, không tốn token |
| Rủi ro | Thấp. Dữ liệu là tên doanh nghiệp (công khai) và mã sản phẩm. Quà tặng không lưu thông tin cá nhân khách |
| Hạn chế | Không có nội dung báo cáo; muốn xem lại phải tìm trong ChatGPT cá nhân |

### A2. AI chạy ngay trong cổng, lưu trọn kết quả thành «Hồ sơ tiếp cận»

Thêm hai tác vụ `fdi_bao_cao_nhanh`, `fdi_qua_tang` vào `ai-advisor`; kết quả lưu
vào bảng hồ sơ, gắn doanh nghiệp, cả phòng dùng chung; lần sau mở lại không sinh
lại.

| | |
| --- | --- |
| Được gì | Lịch sử đầy đủ, tìm lại được, dùng chung trong phòng; lãnh đạo đọc thẳng báo cáo; tiến độ hành trình 6 bước có thể gắn theo từng doanh nghiệp thay vì theo trình duyệt |
| Chi phí | 4–6 ngày. Token: báo cáo nhanh đầy đủ ~15–25 nghìn token/lượt; với mô hình tiết kiệm đang cấu hình thì vài trăm đồng/lượt, không đáng kể so với công RM |
| Rủi ro lớn nhất | **Chất lượng.** Prompt «FDI RM Skill» yêu cầu tra cứu website tập đoàn, tình trạng niêm yết, báo cáo tài chính, tin 12 tháng — tức là cần mô hình **có tra cứu web**. `ai-advisor` hiện gọi mô hình qua gateway, chưa bật tra cứu; không tra cứu được thì mô hình sẽ «chưa có thông tin công khai» ở hầu hết mục, kém xa ChatGPT/Gemini bản có duyệt web mà cán bộ đang dùng |
| Rủi ro thứ hai | Đưa tên doanh nghiệp và ghi chú về khách vào mô hình bên ngoài qua tài khoản của Chi nhánh (thay vì tài khoản cá nhân) — về mặt tuân thủ là **rõ ràng hơn** cách hiện tại, nhưng cần Giám đốc chốt chính sách dữ liệu khách hàng đưa vào AI |
| Điều kiện làm | Có mô hình tra cứu web trong gateway (ví dụ Gemini có grounding) và chính sách dữ liệu được chốt |

### A3. Cán bộ tự lưu kết quả vào cổng sau khi chạy ở ChatGPT/Gemini

Thêm nút «Lưu kết quả vào hồ sơ» trên tab Báo cáo nhanh: dán văn bản (markdown)
hoặc tải tệp Word/PDF đã nhận từ AI; cổng gắn vào phiếu sản phẩm của A1.

| | |
| --- | --- |
| Được gì | Lịch sử có nội dung thật, giữ đúng chất lượng ChatGPT/Gemini đang có; không tốn token; lãnh đạo đọc được báo cáo; phòng dùng chung |
| Chi phí | 2–3 ngày, làm trên nền A1. Tệp lưu vào kho `bhy-one` như bài kho tư liệu |
| Rủi ro | Phụ thuộc kỷ luật: cán bộ quên lưu thì lịch sử thiếu. Giảm bằng nhắc ngay sau khi sao chép prompt («Chạy xong, quay lại đây lưu kết quả») và tính KPI theo số hồ sơ đã lưu, không theo số prompt đã sao chép |

### So sánh và khuyến nghị

| Tiêu chí | A1 | A2 | A3 |
| --- | --- | --- | --- |
| Có sổ tiếp cận theo DN | ✓ | ✓ | ✓ |
| Cảnh báo trùng giữa phòng | ✓ | ✓ | ✓ |
| Có nội dung báo cáo | ✗ | ✓ | ✓ |
| Chất lượng báo cáo | như hiện nay | **kém hơn** nếu chưa tra cứu web | như hiện nay |
| Tốn token | ✗ | ✓ | ✗ |
| Cần chốt chính sách DL khách hàng vào AI | ✗ | ✓ | ✗ |
| Công | 1–2 ngày | 4–6 ngày | +2–3 ngày |

Làm **A1 trước, A3 tiếp theo**. A2 giữ lại như hướng dài hạn, mở khi gateway có mô
hình tra cứu web — khi đó A1/A3 vẫn dùng nguyên, chỉ thêm nút «Sinh trong cổng».

### Thiết kế A1 + A3 (đủ để bắt tay làm)

**Bảng `fdi_hub_san_pham`** — một dòng = một sản phẩm cán bộ tạo:

| Cột | Ý nghĩa |
| --- | --- |
| `loai` | `bao-cao-nhanh` · `qua-tang` · `kich-ban` · `thu-cam-on` |
| `doi_tuong` | Tên doanh nghiệp (báo cáo) hoặc «khách [chức danh] – [quốc tịch]» (quà tặng) |
| `doi_tuong_chuan` | Tên DN bỏ dấu, viết thường, bỏ «công ty TNHH/CP» — để so trùng |
| `ma_so_thue` | Có thì so trùng chính xác theo MST |
| `thong_tin` jsonb | Báo cáo: quốc gia, KCN. Quà tặng: quốc tịch, chức danh, dịp. **Không** năm sinh, giới tính, ghi chú moment |
| `ket_qua` text, `tep` text | A3: markdown dán vào / đường dẫn tệp trong kho `bhy-one` |
| `profile_id`, `department_id`, `created_at` | Ai, phòng nào (chụp tại thời điểm), khi nào |

Ghi qua RPC (tự lấy hồ sơ + phòng như lượt xem). Đọc: cán bộ thấy sản phẩm **của
mình và của phòng mình**; lãnh đạo phòng / PGĐ / BGĐ / TCTH thấy toàn Chi nhánh.
Cảnh báo trùng: RPC `fdi_hub_tim_trung(ten, mst)` trả tên phòng + ngày của phiếu
gần nhất — hiện ngay dưới ô «Tên doanh nghiệp» khi gõ xong.

**Màn hình:** tab «Lịch sử» thứ mười một trong FDI Hub (mọi cán bộ thấy, nội dung
theo quyền). Ba khối: «Của tôi» · «Của phòng» · «Toàn Chi nhánh» (lãnh đạo). Mỗi
dòng: ngày, loại, doanh nghiệp/khách, người, phòng, nút «Mở lại form» (điền sẵn),
«Xem kết quả» (A3). Ô tìm theo tên DN. Bộ lọc loại và khoảng thời gian dùng lại của
tab Thống kê.

**Kết nối với Thống kê:** thêm hai ô số «Doanh nghiệp đã lập báo cáo» và «Hồ sơ đã
lưu» cạnh «Lượt mở tab», và cột «DN đã lập báo cáo» trong bảng Phòng giao dịch —
đây là thước đo tiếp cận, lượt mở tab chỉ là thước đo đọc.

---

## 4. Lớp B — Dữ liệu lịch sử sử dụng

Bảng `fdi_hub_luot_xem` đã tích luỹ từ 10/09/2026. Tab Thống kê hiện chỉ có tổng
trong khoảng đã chọn. Bổ sung (một RPC mới, một khối giao diện, ~1 ngày):

| Bổ sung | Trả lời gì |
| --- | --- |
| Lượt và người theo **tuần**, 12 tuần gần nhất, toàn Chi nhánh và từng Phòng giao dịch (đường nhỏ trong bảng phòng) | Dùng tăng hay giảm sau khi phát động; phòng nào bùng lên rồi tắt |
| **Ngày đầu tiên** mỗi phòng mở FDI Hub | Phòng nào vào muộn nhất |
| **Quay lại**: số cán bộ có lượt ở ≥ 2 tuần khác nhau trong 30 ngày | Dùng thật hay chỉ mở một lần vì được nhắc |
| Ngày trong tuần / khung giờ mở nhiều nhất | Chọn giờ nhắc, giờ đào tạo |

Chính sách giữ dữ liệu: lượt xem giữ **24 tháng** rồi gộp thành tổng theo tháng
(bảng nhỏ, không cần vội; ghi vào quy ước để sau này có chỗ dựa). Phiếu sản phẩm
(lớp A) giữ vĩnh viễn — đó là sổ tiếp cận.

---

## 5. Ba việc cần Giám đốc chốt

1. **Phạm vi đọc của cán bộ thường** với lịch sử sản phẩm: chỉ của mình, hay cả của
   phòng (đề xuất: cả phòng — để cùng phòng không lập trùng và học cách nhau làm).
2. **Chính sách dữ liệu khách hàng đưa vào AI**: có cho phép cổng gọi AI với tên
   doanh nghiệp và thông tin khách (A2) không, hay chỉ cho cán bộ dùng tài khoản cá
   nhân như hiện nay. Không chốt thì A2 không làm.
3. **Thước đo báo cáo lên BGĐ**: lấy «số doanh nghiệp đã lập báo cáo và lưu hồ sơ»
   làm chỉ tiêu tiếp cận FDI của Phòng giao dịch hay không. Nếu có, A3 là bắt buộc và
   nên gắn vào Kế hoạch hành động Chiêu thức 2 thay vì chỉ nằm trong FDI Hub.

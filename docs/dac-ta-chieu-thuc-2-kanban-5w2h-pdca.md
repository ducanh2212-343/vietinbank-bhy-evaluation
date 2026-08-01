# ĐẶC TẢ YÊU CẦU TÍNH NĂNG
## Khu 3 — CHIÊU THỨC 2: KẾ HOẠCH HÀNH ĐỘNG (Kanban 5W2H + PDCA)
**Hệ thống:** Cổng nội bộ Bắc Hưng Yên ONE · **Đơn vị:** VietinBank Chi nhánh Bắc Hưng Yên
**Phiên bản:** v1.0 — 01/08/2026 · **Người yêu cầu:** Giám đốc Chi nhánh · **Đầu mối vận hành:** Phòng Tổ chức Tổng hợp (TCTH)

---

## 0. TÓM TẮT ĐIỀU HÀNH — 5 quyết định thiết kế cốt lõi

Trước khi đi vào chi tiết, đây là 5 lựa chọn kiến trúc quyết định thành/bại của module này. Nếu chỉ đọc một phần, hãy đọc phần này.

| # | Quyết định | Lý do (trade-off đã cân nhắc) |
|---|---|---|
| 1 | **Tách hai cổng dữ liệu: "Cổng tạo việc" nặng — "Cổng cập nhật" nhẹ** | 5W2H đầy đủ chỉ bắt buộc **lúc khởi tạo** (do Phó/Trưởng phòng làm trên máy tính). Cập nhật hằng ngày chỉ yêu cầu **3 trường + 1 câu nhịp** (cán bộ làm trên điện thoại lúc 7h50). Nếu bắt điền đủ 5W2H mỗi sáng, tỷ lệ tuân thủ sẽ sụp trong 2 tuần. |
| 2 | **Nhật ký PDCA là append-only (không sửa, không xóa)** | Đây là bằng chứng trung thực, không phải ô ghi chú. Sửa được = mất giá trị đối chiếu. Sai thì ghi dòng đính chính mới. |
| 3 | **Mỗi đầu việc có duy nhất 01 người chịu trách nhiệm chính** | Việc liên phòng vẫn chỉ 1 chủ trì; các phòng khác là "phối hợp" có đầu việc con riêng. Hai chủ ngang vai = không ai chịu trách nhiệm. |
| 4 | **Đo NHỊP trước, đo KHỐI LƯỢNG sau** | Bảng thi đua xếp theo tỷ lệ cập nhật đúng giờ, không xếp theo số việc hoàn thành — để tránh việc "chẻ nhỏ đầu việc lấy thành tích". |
| 5 | **Cảnh báo theo cơ chế ngoại lệ (exception-based)** | Hệ thống chỉ đẩy thông báo khi **lệch chuẩn**. Không đẩy thông báo cho việc đang chạy bình thường — nếu không sau 3 tuần mọi người sẽ tắt thông báo. |

**Rủi ro lớn nhất cần chủ động phòng ngừa:** module này rất dễ bị cán bộ cảm nhận là "công cụ giám sát chấm công lúc 8h sáng". Nếu rơi vào cảm nhận đó, dữ liệu sẽ được điền cho có và toàn bộ giá trị quản trị mất sạch. Toàn bộ ngôn ngữ giao diện, nội dung thông báo và cách chấm thi đua trong đặc tả này được thiết kế theo hướng **"tấm gương soi cho chính cán bộ"** trước, **"báo cáo cho lãnh đạo"** sau — đúng triết lý đã áp dụng cho board Miro hiện hành.

---

## 1. PHẠM VI, VAI TRÒ VÀ THẨM QUYỀN

### 1.1. Năm cấp vai trò trong Chi nhánh

| Mã vai trò | Cấp | Phạm vi nhìn thấy | Quyền đặc thù |
|---|---|---|---|
| `CAN_BO` | Cán bộ | Toàn bộ đầu việc **của Phòng mình** (đọc); đầu việc mình phụ trách (ghi) | Cập nhật nhịp PDCA, kéo thẻ, bình luận, tạo đầu việc **nội bộ phòng** (cần Phó phòng duyệt) |
| `PHO_PHONG` | Phó Phòng | Toàn bộ Phòng mình + các chiến dịch liên phòng có tham gia | Tạo/sửa kế hoạch, **khởi tạo đầu việc liên phòng**, duyệt đầu việc cán bộ đề xuất, gán người |
| `TRUONG_PHONG` | Trưởng Phòng | Toàn bộ Phòng mình + chiến dịch liên phòng | Như Phó Phòng + chốt kế hoạch kỳ, đóng đầu việc, điều chỉnh hạn (có ghi vết) |
| `BAN_GIAM_DOC` | PGĐ phụ trách / Giám đốc | **Toàn bộ các Phòng được phân công phụ trách**; Giám đốc: toàn Chi nhánh | Xem toàn cảnh, chỉ đạo qua bình luận, đặt mức ưu tiên "Việc trọng điểm của BGĐ", yêu cầu giải trình |
| `TCTH_QUANTRI` | Phòng TCTH | **Toàn Chi nhánh** | Giám sát nhịp, cấu hình mốc giờ, quản trị danh mục, xuất báo cáo giao ban, đóng/gộp chiến dịch |

> **Nguyên tắc hiển thị (kế thừa từ cổng ONE):** không có quyền ở mục nào thì mục đó **không hiện**, không hiện rồi báo lỗi truy cập.

> **Nguyên tắc minh bạch nội bộ:** trong cùng một Phòng, **mọi cán bộ đều đọc được toàn bộ tiến độ của Phòng** — kể cả việc của Trưởng phòng. Đây là lựa chọn có chủ đích: minh bạch ngang hàng tạo áp lực tích cực mạnh hơn giám sát dọc.

### 1.2. Ma trận RACI theo loại hành động

| Hành động | Cán bộ | Phó Phòng | Trưởng Phòng | BGĐ phụ trách | TCTH |
|---|:--:|:--:|:--:|:--:|:--:|
| Tạo kế hoạch hành động kỳ (tháng/quý) | — | R | A | C | I |
| Tạo đầu việc trong phòng | R (đề xuất) | A | A | I | I |
| **Tạo đầu việc/chiến dịch liên phòng** | ✗ | **R** | **A** | C | I |
| Nhận việc & cập nhật nhịp hằng ngày | **R/A** | R/A | R/A | — | I |
| Duyệt chuyển trạng thái "Hoàn thành" | — | R | A | I | — |
| Điều chỉnh hạn hoàn thành (có ghi vết) | ✗ | R | A | C | I |
| Đóng/hủy đầu việc | ✗ | — | A | C | I |
| Cấu hình mốc giờ, ngưỡng cảnh báo | ✗ | ✗ | ✗ | C | **A** |

---

## 2. MÔ HÌNH DỮ LIỆU NGHIỆP VỤ

### 2.1. Bốn tầng phân cấp

```
CHIẾN DỊCH (mục tiêu lớn, có thể liên phòng — VD: "Tăng CASA quý IV/2026")
   └── KẾ HOẠCH HÀNH ĐỘNG (theo Phòng × kỳ — VD: "KHHĐ Phòng KHDN tháng 9/2026")
          └── ĐẦU VIỆC (card Kanban — đơn vị 5W2H, có 01 chủ duy nhất)
                 ├── NHỊP PDCA (nhật ký append-only, mỗi ngày ≥1 dòng khi việc đang chạy)
                 ├── BÌNH LUẬN / CHAT (hỏi–đáp, @nhắc tên, cảm xúc icon)
                 └── VIỆC CON (checklist, tùy chọn)
```

### 2.2. Phân loại đầu việc — bắt buộc chọn lúc tạo

Đây là bộ lọc quan trọng nhất để tránh nhiễu báo cáo:

| Loại | Định nghĩa | Cách hệ thống đối xử |
|---|---|---|
| **TIẾN TRÌNH** | Có điểm bắt đầu — điểm kết thúc thật (hồ sơ tín dụng, chiến dịch bán theo khách hàng cụ thể, dự án xây quy chế, case xử lý khiếu nại) | Vào Kanban, áp đầy đủ quy tắc nhịp/hạn/cảnh báo |
| **THƯỜNG TRỰC** | Vận hành lặp theo chu kỳ, không có điểm "xong" (quản lý NIM, cập nhật văn bản hằng tuần, rà soát nợ chứng từ định kỳ) | **Không vào cột Kanban tiến trình.** Đưa vào bảng chỉ số riêng, chỉ cảnh báo khi lệch ngưỡng. Không đòi nhịp hằng ngày |

> Hệ thống phải **chặn** việc đặt loại THƯỜNG TRỰC vào luồng Kanban tiến trình, và ngược lại không tính loại THƯỜNG TRỰC vào tỷ lệ "cập nhật đúng giờ".

### 2.3. Trường dữ liệu của Đầu việc (5W2H)

| Nhóm | Trường | Bắt buộc lúc TẠO | Ghi chú |
|---|---|:--:|---|
| **What** | `tieu_de` — tên đầu việc | ✅ | ≥ 10 ký tự, chặn các chuỗi rỗng nghĩa ("theo dõi", "làm việc") |
| **What** | `ket_qua_dau_ra` — sản phẩm/kết quả đo được | ✅ | Câu trả lời cho "làm xong thì có cái gì?" |
| **Why** | `muc_tieu_lien_ket` — gắn với chỉ tiêu/chiến dịch nào | ✅ | Chọn từ danh mục, không nhập tay |
| **Who** | `nguoi_chiu_trach_nhiem` | ✅ | **Duy nhất 01 người**. Không cho để trống "gán sau" |
| **Who** | `nguoi_phoi_hop[]` | ⬜ | Nhiều người / nhiều phòng |
| **Who** | `lanh_dao_theo_doi` | ✅ (tự điền) | Mặc định = Trưởng phòng; việc liên phòng = PGĐ phụ trách |
| **When** | `ngay_bat_dau`, `han_hoan_thanh` | ✅ | `han_hoan_thanh ≥ ngay_bat_dau`; chặn hạn vượt mốc kết thúc chiến dịch |
| **When** | `moc_kiem_soat[]` — mốc trung gian | ⬜ | Bắt buộc nếu đầu việc kéo dài > 30 ngày |
| **Where** | `pham_vi` — Phòng / PGD / toàn Chi nhánh | ✅ | |
| **How** | `cach_lam` — các bước triển khai | ✅ | ≥ 30 ký tự |
| **How much** | `chi_tieu_dinh_luong` + `don_vi` | ✅ với việc có số | VD: 12 KH / 50 tỷ / 3 hồ sơ |
| **How much** | `nguon_luc_du_kien` | ⬜ | Nhân sự, chi phí |
| Quản trị | `loai_dau_viec` (TIẾN TRÌNH / THƯỜNG TRỰC) | ✅ | Mục 2.2 |
| Quản trị | `muc_uu_tien` (Thường / Ưu tiên / **Trọng điểm BGĐ**) | ✅ | Mức "Trọng điểm BGĐ" chỉ BGĐ đặt được |
| Quản trị | `lien_phong` (bool) + `cac_phong_tham_gia[]` | ✅ nếu liên phòng | Chỉ Phó Phòng trở lên tạo được |

---

## 3. CỔNG KIỂM SOÁT DỮ LIỆU (VALIDATION GATE)

Yêu cầu "thiếu trường cần nhập thì không nhập được hành động" được cụ thể hóa thành **hai cổng khác nhau**:

### 3.1. Cổng A — Tạo đầu việc (chặt, trên máy tính)

- Nút **"Tạo đầu việc"** ở trạng thái **mờ (disabled)** cho đến khi đủ 100% trường bắt buộc ở mục 2.3.
- Bên cạnh nút hiển thị **thanh tiến độ hoàn thiện** (VD: "8/11 trường — còn thiếu: Kết quả đầu ra, Chỉ tiêu định lượng, Cách làm").
- Khi bấm vào trường còn thiếu → cuộn tới đúng ô đó, viền đỏ, hiện gợi ý mẫu câu.
- **Chặn cứng (hard block)**, không dùng cảnh báo mềm. Lý do: cho phép lưu nháp thiếu trường sẽ tạo ra kho card "vô chủ" — đúng lỗi đang gặp trên board Miro hiện tại.
- **Ngoại lệ duy nhất:** cán bộ được lưu **"Đề xuất việc"** (chỉ cần tiêu đề + lý do) gửi Phó Phòng; bản đề xuất **không hiện trên Kanban** cho tới khi Phó Phòng bổ sung đủ 5W2H và duyệt.

### 3.2. Cổng B — Cập nhật nhịp hằng ngày (nhẹ, trên điện thoại)

Chỉ **3 trường + 1 câu**, tối ưu cho thao tác dưới 45 giây:

| Trường | Cách nhập |
|---|---|
| **Trạng thái** | Chọn nhanh (chip bấm 1 lần) hoặc kéo thẻ |
| **% hoàn thành** | Thanh trượt hoặc 4 nấc: 0 / 25 / 50 / 75 / 100 |
| **Cờ tình trạng** | 🟢 Đúng hẹn · 🟡 Có rủi ro · 🔴 Đang vướng |
| **Câu nhịp PDCA** | Bắt buộc ≥ 15 ký tự, theo mẫu bên dưới |

**Quy tắc chống "điền cho có" (rất quan trọng):**
- Nếu chọn 🟡 hoặc 🔴 → hệ thống **bắt buộc** tách 2 ô: `Đang vướng vì...` và `Hôm nay tôi làm...` — không cho lưu nếu ô thứ hai trống.
- Hệ thống **từ chối** câu nhịp trùng khớp 100% với câu nhịp của chính đầu việc đó ngày hôm trước (chống copy-paste "đang làm bình thường"), hiện thông báo: *"Nội dung giống hệt hôm qua — hôm nay có gì khác không?"*
- Câu nhịp dưới 15 ký tự hoặc thuộc danh sách chặn ("ok", "đang làm", "bình thường", "vẫn thế") → không lưu được.

**Mẫu câu gợi ý hiện sẵn dưới ô nhập:**
- 🟢 *"Đã xong bước [X], dự kiến hoàn thành đúng hẹn ngày [dd/mm]."*
- 🟡 *"Đang chậm ở bước [X] vì [lý do]. Hôm nay tôi [hành động] để bắt kịp."*
- 🔴 *"Đang vướng [nguyên nhân, ai đang giữ]. Hôm nay tôi [hành động] và cần [ai] hỗ trợ [việc gì] trước [ngày]."*

### 3.3. Gắn nhãn PDCA vào từng dòng nhịp

Mỗi dòng nhật ký được gắn 1 trong 4 nhãn (hệ thống gợi ý theo trạng thái, cán bộ xác nhận):

| Nhãn | Khi nào dùng | Ràng buộc hệ thống |
|---|---|---|
| **P — Plan** | Lập/điều chỉnh cách làm, mốc | Bắt buộc có ≥ 1 dòng P trước khi chuyển sang "Đang làm" |
| **D — Do** | Ghi việc đã thực hiện | Dòng phổ biến nhất hằng ngày |
| **C — Check** | Đối chiếu kết quả với chỉ tiêu | **Bắt buộc ≥ 1 dòng C trước khi được chuyển sang "Hoàn thành"** |
| **A — Act** | Bài học, điều chỉnh, chuẩn hóa | Bắt buộc ≥ 1 dòng A khi đóng đầu việc; nội dung này tự động đề xuất đăng sang **BHY Sharing** (Kho tri thức) |

> Đây là điểm mấu chốt để **"PDCA đến từng đầu việc"**: vòng PDCA không nằm ở cấp kế hoạch, mà nằm ở cấp thẻ — hệ thống **chặn chuyển trạng thái** nếu vòng chưa khép.

---

## 4. BÀN KANBAN — CẤU TRÚC VÀ TÍNH NĂNG (tham chiếu Miro)

### 4.1. Cột trạng thái chuẩn toàn Chi nhánh

| # | Cột | Ý nghĩa | Quy tắc |
|---|---|---|---|
| 1 | 📋 **Chuẩn bị** | Đã lập kế hoạch, chưa khởi động | Cảnh báo nếu còn nằm đây khi chỉ còn ≤ 25% thời gian tới hạn |
| 2 | 🔨 **Đang làm** | Đang triển khai | **Giới hạn WIP: 4 việc/người**. Vượt → cảnh báo nghẽn theo người |
| 3 | 🤝 **Chờ phối hợp** | Chờ phòng/đơn vị khác | Đồng hồ đếm tuổi; thông báo đẩy tới **bên đang giữ việc**, không phải chủ trì |
| 4 | ⏳ **Chờ ý kiến / Chờ duyệt** | Chờ Lãnh đạo phòng / BGĐ / TSC | **Cột nguy hiểm nhất.** Tuổi > 3 ngày làm việc → tự escalate lên cấp trên của người đang giữ |
| 5 | ✅ **Hoàn thành** | Đã có kết quả, đã Check | Chỉ vào được khi có ≥1 dòng **C** và `% = 100` |
| 6 | 📦 **Đã đóng** | Trưởng phòng chốt, đã ghi bài học | Bắt buộc có dòng **A** |
| 7 | ⛔ **Dừng/Hủy** | Có lý do ghi rõ | Bắt buộc ghi lý do ≥ 30 ký tự |

**Quy tắc đặc thù cột 3 và 4 (khắc phục điểm yếu lớn nhất của board hiện tại):** khi thẻ nằm ở "Chờ phối hợp"/"Chờ duyệt", **đồng hồ trách nhiệm chuyển sang người đang giữ**. Cán bộ phụ trách **không bị tính là chậm nhịp** trong thời gian này. Đây là điều chỉnh quan trọng về mặt công bằng — nếu không, cán bộ sẽ né đưa việc vào cột chờ và tiến độ thật bị che giấu.

### 4.2. Tính năng học từ Miro — nên lấy và không nên lấy

| Tính năng Miro | Áp dụng? | Cách triển khai trên BHY ONE |
|---|:--:|---|
| Kéo–thả thẻ giữa cột | ✅ | Có trên cả web và điện thoại (chạm giữ 0.4s để kéo) |
| Làn ngang (swimlane) | ✅ | Nhóm theo **Người phụ trách** / **Chiến dịch** / **Mức ưu tiên** — đổi bằng 1 nút |
| Bộ lọc chip nhiều tiêu chí | ✅ | Lọc theo phòng, người, trạng thái, cờ 🟢🟡🔴, quá hạn, liên phòng |
| Bình luận + @nhắc tên trên thẻ | ✅ | Mục 7 |
| Biểu tượng cảm xúc (reaction) | ✅ | Mục 8 |
| Ảnh bìa / màu thẻ theo nhãn | ✅ | Màu viền tự động theo cờ tình trạng, không cho tự chọn tùy tiện |
| Theo dõi thẻ (watch/follow) | ✅ | BGĐ "theo dõi" thẻ trọng điểm → nhận thông báo riêng |
| Dòng thời gian hoạt động của thẻ | ✅ | Chính là nhật ký PDCA append-only |
| Sửa hàng loạt (bulk edit) | ✅ | Chỉ Trưởng/Phó phòng, giới hạn 20 thẻ/lần, có ghi vết |
| Mẫu bảng (template) | ✅ | Mẫu KHHĐ theo từng loại phòng: KHDN, KHCN, Kế toán, PGD |
| Chế độ trình chiếu (presentation) | ✅ | **Chế độ Giao ban**: toàn màn hình, hiện đúng phần lệch chuẩn |
| Bảng vẽ tự do vô hạn | ❌ | Không phù hợp dữ liệu ngân hàng; thay bằng chế độ Bảng/Lịch/Dòng thời gian |
| Sticky note tự do | ❌ | Mọi thông tin phải nằm trong trường có cấu trúc để lọc và báo cáo được |
| Chia sẻ link công khai ra ngoài | ❌ | Vi phạm nguyên tắc an toàn thông tin của cổng ONE |

### 4.3. Bốn chế độ xem cùng một dữ liệu

1. **Kanban** — mặc định, xem trạng thái.
2. **Bảng** — dạng dòng/cột, sắp xếp & lọc như Excel, xuất Excel.
3. **Lịch** — theo hạn hoàn thành, phát hiện dồn hạn cuối tháng.
4. **Dòng thời gian (Gantt rút gọn)** — cho chiến dịch liên phòng, nhìn phụ thuộc giữa các phòng.

---

## 5. NHỊP HẰNG NGÀY — MỐC 8H00 VÀ 8H30

### 5.1. Vòng đời một ngày làm việc

| Mốc | Sự kiện hệ thống | Đối tượng |
|---|---|---|
| **07:00** | Đẩy thông báo nhắc: *"Chào [tên], hôm nay anh/chị có [n] việc cần ghi nhịp. Bấm để cập nhật."* Kèm liên kết sâu tới danh sách việc của mình | Cán bộ có việc đang chạy |
| **07:00 – 08:00** | **Khung nhập nhịp của CÁN BỘ.** Nhập trong khung này được tính "đúng nhịp" ✅ | Toàn bộ cán bộ |
| **08:00** | **Chốt sổ nhịp cán bộ.** Hệ thống đóng băng ảnh chụp tình trạng, tính tỷ lệ theo phòng | Hệ thống |
| **08:00 – 08:30** | **Khung của LÃNH ĐẠO PHÒNG**: Trưởng/Phó phòng xem bảng tổng hợp phòng mình, bổ sung nhịp việc mình phụ trách, ghi **"Chỉ đạo trong ngày"** cho các thẻ 🔴 | Phó Phòng, Trưởng Phòng |
| **08:30** | **Chốt sổ nhịp lãnh đạo.** Sinh **Báo cáo giao ban 8h30** tự động, đẩy tới BGĐ phụ trách + TCTH | Hệ thống |
| **08:35** | Đẩy danh sách ngoại lệ tới BGĐ phụ trách và TCTH | BGĐ, TCTH |
| **17:30** | Nhắc nhẹ cuối ngày cho thẻ 🔴 chưa có hành động nào trong ngày | Người phụ trách + Trưởng phòng |

### 5.2. Bốn nguyên tắc bắt buộc để mốc giờ không trở thành "chấm công"

1. **Chỉ đòi nhịp với việc thực sự đang chạy.** Thẻ ở cột "Chuẩn bị", "Chờ duyệt", "Hoàn thành", loại THƯỜNG TRỰC → **không** tính vào mẫu số. Tránh việc cán bộ phải ghi nhịp cho việc mình không kiểm soát được.
2. **Nhịp theo NGƯỜI, không theo THẺ.** Một cán bộ có 6 thẻ đang chạy chỉ cần một lần vào ứng dụng — giao diện hiện danh sách 6 thẻ để lướt nhanh, mỗi thẻ 1 câu. Ghi đủ 6 = 1 lần đúng nhịp.
3. **Cho phép nghỉ có lý do.** Nghỉ phép/công tác/ốm khai báo trước → hệ thống tự loại khỏi mẫu số, không tính chậm nhịp. Đồng bộ với danh mục nghỉ phép nếu có.
4. **Ân hạn hợp lý.** Nhập từ 8h00–8h30 tính là **"nhịp muộn"** (🟡), không phải "mất nhịp". Chỉ sau 8h30 mới tính mất nhịp (🔴). Cấu hình được, mặc định như trên.

### 5.3. Thẻ cấu hình do TCTH quản lý

| Tham số | Mặc định | Ghi chú |
|---|---|---|
| Mốc chốt cán bộ | 08:00 | Theo giờ Việt Nam (UTC+7) |
| Mốc chốt lãnh đạo | 08:30 | |
| Ngày áp dụng | Thứ 2 – Thứ 6 | Loại trừ lễ/Tết theo lịch cấu hình sẵn |
| Ngưỡng tuổi cột "Chờ duyệt" | 3 ngày làm việc | |
| Ngưỡng WIP/người | 4 thẻ "Đang làm" | |
| Ngưỡng thẻ im lặng | 3 ngày không có nhịp | |

---

## 6. HỆ THỐNG THÔNG BÁO ĐẨY (PUSH NOTIFICATIONS)

### 6.1. Ma trận sự kiện → người nhận → kênh

| # | Sự kiện kích hoạt | Người nhận | Thời điểm | Kênh | Mức |
|---|---|---|---|---|:--:|
| N1 | Nhắc ghi nhịp buổi sáng | Người phụ trách | 07:00 | Push + chuông | Nhẹ |
| N2 | Chưa ghi nhịp lúc chốt sổ | Người phụ trách | 08:05 | Push | 🟡 |
| N3 | Danh sách cán bộ chưa ghi nhịp | Trưởng + Phó Phòng | 08:05 | Push + chuông | 🟡 |
| N4 | **Đầu việc quá hạn** | Người phụ trách + Trưởng phòng | Ngay khi qua 00:00 ngày quá hạn | Push + chuông + email | 🔴 |
| N5 | Quá hạn > 3 ngày, không có nhịp mới | + PGĐ phụ trách | 08:35 | Push + email | 🔴 |
| N6 | Quá hạn > 5 ngày | + TCTH, vào mục **Giải trình giao ban** | 08:35 | Push + email + báo cáo | ⛔ |
| N7 | Thẻ "Chờ duyệt" quá 3 ngày làm việc | **Người đang giữ việc** (người duyệt) + cấp trên của họ | 08:35 | Push | 🔴 |
| N8 | Thẻ "Chờ phối hợp" quá hạn cam kết | Đầu mối phòng phối hợp + Phó phòng phòng đó | 08:35 | Push | 🔴 |
| N9 | Sắp tới hạn (T-3, T-1) | Người phụ trách | 07:00 | Push | 🟡 |
| N10 | Vượt WIP (≥ 4 thẻ đang làm) | Người phụ trách + Phó phòng | Ngay khi vượt | Chuông | 🟡 |
| N11 | Thẻ im lặng ≥ 3 ngày dù chưa quá hạn | Người phụ trách | 08:05 | Chuông | 🟡 |
| N12 | Có người @nhắc tên bạn / trả lời bình luận | Người được nhắc | Ngay lập tức | Push | Nhẹ |
| N13 | Được giao đầu việc mới | Người được giao | Ngay lập tức | Push + email | Nhẹ |
| N14 | BGĐ đặt mức "Trọng điểm" cho thẻ | Toàn bộ liên quan | Ngay lập tức | Push | 🔴 |
| N15 | Thẻ được chuyển sang Hoàn thành | Trưởng phòng (để chốt) | Ngay lập tức | Chuông | Nhẹ |
| N16 | **Báo cáo giao ban 8h30** | BGĐ phụ trách + TCTH | 08:30 | Push + email (bản HTML) | — |
| N17 | Tổng hợp tuần (nhịp + việc chậm) | Trưởng phòng, BGĐ, TCTH | Thứ 2, 07:30 | Email | — |

### 6.2. Ba quy tắc chống "bội thực thông báo"

1. **Gộp theo người, không bắn theo thẻ.** Một người chậm 5 thẻ → nhận **1** thông báo liệt kê 5 thẻ, không nhận 5 thông báo.
2. **Trần thông báo:** tối đa 3 thông báo đẩy/người/ngày cho nhóm nhắc nhở (N1, N2, N9, N10, N11). Nhóm 🔴/⛔ và @nhắc tên không tính vào trần.
3. **Im lặng ngoài giờ:** không đẩy thông báo trước 07:00, sau 18:00, và ngày nghỉ — trừ mức ⛔ do BGĐ trực tiếp phát.

### 6.3. Nội dung thông báo — mẫu câu

> ❌ Không dùng: *"Bạn chưa cập nhật. Vui lòng cập nhật ngay."*
> ✅ Dùng: *"Việc «Hoàn thiện hồ sơ TSBĐ KH Minh Long» đã quá hạn 2 ngày và chưa có nhịp mới. Anh/chị đang vướng ở bước nào, có cần hỗ trợ gì không?"*

Toàn bộ nội dung thông báo phải: nêu **tên thẻ cụ thể**, nêu **con số cụ thể** (quá hạn mấy ngày), và kết thúc bằng **câu hỏi tự nhận thức**, không phải mệnh lệnh.

### 6.4. Kỹ thuật

- **Web Push (VAPID)** qua Service Worker của PWA cổng ONE — chạy cả trên điện thoại đã "Thêm vào màn hình chính".
- Chuông trong ứng dụng (in-app bell) là kênh dự phòng luôn có, kể cả khi người dùng từ chối quyền push.
- Email dùng cho mức 🔴/⛔ và báo cáo định kỳ.
- Hàng đợi thông báo lưu vào bảng, có trạng thái `da_gui / da_doc / da_xu_ly` để đo tỷ lệ phản hồi.

---

## 7. MÀN HÌNH TỔNG HỢP

### 7.1. M1 — "Việc của tôi" (mọi cán bộ, mặc định sau đăng nhập)

- Khối đầu trang: **"Hôm nay anh/chị cần ghi nhịp cho [n] việc"** + nút lớn *Ghi nhịp nhanh* (chế độ lướt từng thẻ).
- 4 ô số: Đang làm · Sắp tới hạn (≤3 ngày) · Quá hạn · Chuỗi ngày đúng nhịp 🔥.
- Danh sách thẻ của tôi, sắp xếp theo mức khẩn.

### 7.2. M2 — "Bảng của Phòng" (mọi cán bộ đọc toàn bộ Phòng)

- Kanban/Bảng/Lịch/Dòng thời gian của toàn Phòng.
- Dải chỉ số đầu trang: **% nhịp hôm nay** · số thẻ 🔴 · số thẻ quá hạn · số thẻ nghẽn ở cột chờ.
- **Bảng nhịp theo người**: tên · số thẻ đang chạy · nhịp hôm nay (✅/🟡/🔴) · chuỗi ngày · thẻ quá hạn.

### 7.3. M3 — "Chiến dịch liên phòng"

- Một chiến dịch, nhiều phòng: cột trái là danh sách phòng tham gia, mỗi phòng một làn ngang.
- **Bản đồ phụ thuộc:** thẻ A của Phòng X chặn thẻ B của Phòng Y → hiện mũi tên đỏ khi A chậm.
- Ô cảnh báo: *"Phòng nào đang là nút thắt của chiến dịch này"* — tính theo số thẻ của phòng khác đang bị chặn.

### 7.4. M4 — "Toàn cảnh Ban Giám đốc"

- Ma trận **Phòng × Trạng thái** (bản đồ nhiệt): mỗi ô là số thẻ, màu theo tỷ lệ chậm.
- **Top 10 việc rủi ro nhất toàn Chi nhánh**, xếp theo điểm rủi ro:
  `Điểm rủi ro = (số ngày quá hạn × 3) + (số ngày im lặng × 2) + (5 nếu là Trọng điểm BGĐ) + (3 nếu chặn phòng khác)`
- Danh sách **việc đang chờ chính BGĐ duyệt** kèm tuổi chờ — tự soi ngược lên lãnh đạo, không chỉ soi xuống cán bộ.
- Xu hướng 12 tuần: tỷ lệ đúng hạn, tỷ lệ nhịp, số thẻ nghẽn.

### 7.5. M5 — "Giám sát TCTH"

- Toàn Chi nhánh, so sánh giữa các Phòng.
- **Bảng xếp hạng thi đua**: sắp xếp **theo tỷ lệ nhịp trước**, khối lượng việc sau.
- Bộ phát hiện dữ liệu bất thường (chạy tự động, xuất danh sách cần xác minh):
  - thẻ "Hoàn thành" nhưng hạn còn ở tương lai;
  - thẻ có nhiều người ngang vai;
  - nhịp lặp lại nội dung nhiều ngày;
  - thẻ tạo và đóng trong cùng ngày (nghi ngờ tạo để lấy thành tích);
  - thẻ loại THƯỜNG TRỰC bị đặt nhầm vào luồng tiến trình.
- Xuất **Báo cáo giao ban** (Word/PDF) và **dữ liệu thô** (Excel).

### 7.6. M6 — "Chế độ Giao ban" (trình chiếu)

Toàn màn hình, chỉ hiện phần lệch chuẩn theo đúng nguyên tắc báo cáo ngoại lệ: 1) số tổng quan; 2) cảnh báo xếp theo mức nghiêm trọng; 3) đề xuất hành động — không đọc lại toàn bộ danh sách việc.

---

## 8. GIAO TIẾP TRÊN CỔNG (CHAT) VÀ BIỂU TƯỢNG

### 8.1. Ba lớp giao tiếp

| Lớp | Phạm vi | Mục đích |
|---|---|---|
| **Bình luận trên thẻ** | Gắn với 1 đầu việc | Hỏi–đáp đúng ngữ cảnh; là lớp chính, khuyến khích dùng nhiều nhất |
| **Kênh Phòng** | Toàn Phòng | Trao đổi chung về kế hoạch kỳ, thông báo nội bộ phòng |
| **Kênh Chiến dịch** | Các phòng tham gia | Trao đổi liên phòng, thay cho việc gọi điện từng người |

### 8.2. Yêu cầu chức năng chat

- **@nhắc tên** cá nhân, **@phòng**, **@lãnh đạo** (nhắc cả Trưởng + Phó phòng).
- Trả lời theo luồng (thread) trong bình luận thẻ, tránh loãng.
- Đính kèm ảnh và tệp (giới hạn 10MB/tệp; tự nén ảnh như module Sharing).
- **Đánh dấu "Cần trả lời"** — người nhận thấy đồng hồ đếm, quá 24h → nhắc lại; đây là cơ chế biến câu hỏi thành cam kết.
- **Chuyển bình luận thành đầu việc** — 1 nút, giữ nguyên ngữ cảnh.
- Ghim tối đa 3 bình luận quan trọng trên thẻ (dùng cho "Chỉ đạo của BGĐ").
- Tìm kiếm toàn văn trong bình luận theo phòng, người, khoảng thời gian.
- **Không xóa được bình luận** sau 15 phút; chỉ được đánh dấu thu hồi, vẫn lưu vết (yêu cầu kiểm soát nội bộ ngân hàng).
- Không có tin nhắn riêng tư 1–1 trong module này — giao tiếp công việc phải gắn ngữ cảnh và có thể kiểm chứng.

### 8.3. Biểu tượng (icon/emoji)

- **Biểu tượng trạng thái chuẩn hóa**, dùng thống nhất toàn hệ thống: 🟢 đúng hẹn · 🟡 rủi ro · 🔴 vướng · ⏳ chờ · ✅ xong · 📦 đóng · ⛔ dừng · 🔥 chuỗi nhịp · ⭐ trọng điểm BGĐ · 🤝 liên phòng.
- **Bộ cảm xúc rút gọn** cho bình luận: 👍 ✅ 👀 🎯 🙏 ❤️ 🔥 — cố ý giới hạn, tránh biến kênh công việc thành mạng xã hội.
- Bảng chọn emoji đầy đủ trong nội dung bình luận (Unicode, không dùng thư viện hình ảnh ngoài để giữ nguyên tắc không phụ thuộc CDN).
- Ảnh đại diện cán bộ hiển thị trên thẻ; nếu chưa có ảnh thì dùng chữ cái đầu trên nền màu theo phòng.
- **Không dùng emoji trong tên đầu việc** (ảnh hưởng tìm kiếm và xuất báo cáo) — hệ thống lọc bỏ khi lưu.

---

## 9. THI ĐUA VÀ GHI NHẬN

| Chỉ số | Trọng số | Cách tính |
|---|:--:|---|
| **Tỷ lệ nhịp đúng giờ** | **40%** | Số ngày ghi nhịp trước 8h00 / số ngày phải ghi |
| Tỷ lệ hoàn thành đúng hạn | 25% | Thẻ đóng đúng hạn / tổng thẻ đến hạn trong kỳ |
| Chất lượng nhịp | 15% | Tỷ lệ dòng nhịp có nêu được nguyên nhân + hành động (chấm tự động theo cấu trúc, không chấm văn phong) |
| Khép vòng PDCA | 10% | Tỷ lệ thẻ đóng có đủ dòng C và A |
| Hỗ trợ đồng đội | 10% | Số lần trả lời câu hỏi "Cần trả lời" của phòng khác trong hạn |

- Chuỗi ngày đúng nhịp 🔥 hiển thị công khai, không hiển thị "chuỗi ngày trượt" — chỉ tôn vinh, không bêu tên cá nhân trên bảng công khai.
- Danh sách chậm nhịp chỉ hiện trong phạm vi Phòng và cho cấp quản lý, **không** hiện trên bảng toàn Chi nhánh.
- Nội dung dòng **A (Act)** chất lượng cao → đề xuất tự động sang **Bắc Hưng Yên Sharing** và có thể gửi kèm **Sao Xứng Đáng**.

---

## 10. LƯỢC ĐỒ DỮ LIỆU KỸ THUẬT (Supabase / PostgreSQL)

```sql
-- Chiến dịch (có thể liên phòng)
create table ct2_chien_dich (
  id uuid primary key default gen_random_uuid(),
  ten text not null,
  muc_tieu text,
  ngay_bat_dau date not null,
  ngay_ket_thuc date not null,
  phong_chu_tri text not null references dm_phong(ma),
  cac_phong_tham_gia text[] default '{}',
  nguoi_tao uuid not null references nhan_su(id),
  trang_thai text not null default 'DANG_CHAY',
  created_at timestamptz default now()
);

-- Kế hoạch hành động theo Phòng × kỳ
create table ct2_ke_hoach (
  id uuid primary key default gen_random_uuid(),
  phong text not null references dm_phong(ma),
  ky text not null,                       -- '2026-09' | '2026-Q3'
  tieu_de text not null,
  trang_thai text not null default 'NHAP', -- NHAP | DA_CHOT | DA_DONG
  nguoi_chot uuid references nhan_su(id),
  chot_luc timestamptz,
  created_at timestamptz default now(),
  unique (phong, ky)
);

-- Đầu việc (thẻ Kanban) — 5W2H
create table ct2_dau_viec (
  id uuid primary key default gen_random_uuid(),
  ke_hoach_id uuid references ct2_ke_hoach(id) on delete cascade,
  chien_dich_id uuid references ct2_chien_dich(id),
  ma_hien_thi text unique,                -- KHDN-2609-012
  tieu_de text not null check (char_length(tieu_de) >= 10),
  ket_qua_dau_ra text not null,
  muc_tieu_lien_ket text not null,
  cach_lam text not null check (char_length(cach_lam) >= 30),
  chi_tieu_dinh_luong numeric,
  don_vi text,
  nguoi_chiu_trach_nhiem uuid not null references nhan_su(id),   -- DUY NHẤT 1
  nguoi_phoi_hop uuid[] default '{}',
  lanh_dao_theo_doi uuid not null references nhan_su(id),
  phong text not null references dm_phong(ma),
  pham_vi text not null,
  loai_dau_viec text not null check (loai_dau_viec in ('TIEN_TRINH','THUONG_TRUC')),
  lien_phong boolean default false,
  cac_phong_tham_gia text[] default '{}',
  muc_uu_tien text not null default 'THUONG'
      check (muc_uu_tien in ('THUONG','UU_TIEN','TRONG_DIEM_BGD')),
  trang_thai text not null default 'CHUAN_BI'
      check (trang_thai in ('CHUAN_BI','DANG_LAM','CHO_PHOI_HOP','CHO_DUYET',
                            'HOAN_THANH','DA_DONG','DUNG_HUY')),
  phan_tram int not null default 0 check (phan_tram between 0 and 100),
  co_tinh_trang text not null default 'XANH' check (co_tinh_trang in ('XANH','VANG','DO')),
  ngay_bat_dau date not null,
  han_hoan_thanh date not null,
  han_goc date not null,                  -- giữ hạn ban đầu để đo việc lùi hạn
  nguoi_dang_giu uuid references nhan_su(id),  -- khi ở CHO_DUYET / CHO_PHOI_HOP
  giu_tu timestamptz,
  nhip_gan_nhat timestamptz,
  nguoi_tao uuid not null references nhan_su(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint han_hop_le check (han_hoan_thanh >= ngay_bat_dau)
);

-- Nhật ký PDCA — CHỈ THÊM, KHÔNG SỬA, KHÔNG XÓA
create table ct2_nhip_pdca (
  id uuid primary key default gen_random_uuid(),
  dau_viec_id uuid not null references ct2_dau_viec(id) on delete cascade,
  nguoi_ghi uuid not null references nhan_su(id),
  nhan_pdca char(1) not null check (nhan_pdca in ('P','D','C','A')),
  noi_dung text not null check (char_length(noi_dung) >= 15),
  vuong_mac text,                         -- bắt buộc khi cờ VANG/DO
  hanh_dong_hom_nay text,                 -- bắt buộc khi cờ VANG/DO
  co_tinh_trang text not null,
  phan_tram int not null,
  ghi_luc timestamptz not null default now(),
  dung_nhip text not null                 -- DUNG_GIO | MUON | MAT_NHIP
);
revoke update, delete on ct2_nhip_pdca from authenticated;  -- append-only

-- Bình luận / chat
create table ct2_binh_luan (
  id uuid primary key default gen_random_uuid(),
  pham_vi text not null check (pham_vi in ('DAU_VIEC','PHONG','CHIEN_DICH')),
  doi_tuong_id uuid not null,
  cha_id uuid references ct2_binh_luan(id),
  nguoi_gui uuid not null references nhan_su(id),
  noi_dung text not null,
  nhac_ten uuid[] default '{}',
  tep_dinh_kem jsonb default '[]',
  can_tra_loi boolean default false,
  da_tra_loi_luc timestamptz,
  ghim boolean default false,
  thu_hoi boolean default false,
  created_at timestamptz default now()
);

create table ct2_cam_xuc (
  binh_luan_id uuid references ct2_binh_luan(id) on delete cascade,
  nguoi uuid references nhan_su(id),
  bieu_tuong text not null,
  primary key (binh_luan_id, nguoi, bieu_tuong)
);

-- Hàng đợi & vết thông báo
create table ct2_thong_bao (
  id uuid primary key default gen_random_uuid(),
  ma_su_kien text not null,               -- N1..N17
  nguoi_nhan uuid not null references nhan_su(id),
  dau_viec_id uuid references ct2_dau_viec(id),
  tieu_de text not null, noi_dung text not null,
  muc text not null,                      -- NHE | VANG | DO | CHAN
  kenh text[] not null,
  gui_luc timestamptz, doc_luc timestamptz, xu_ly_luc timestamptz,
  created_at timestamptz default now()
);

-- Ảnh chụp nhịp hằng ngày (chốt 8h00 / 8h30)
create table ct2_anh_chup_nhip (
  ngay date not null,
  nguoi uuid not null references nhan_su(id),
  phong text not null,
  so_viec_phai_ghi int not null,
  so_viec_da_ghi_truoc_8h int not null,
  so_viec_ghi_8h_8h30 int not null,
  ket_qua text not null,                  -- DUNG_GIO | MUON | MAT_NHIP | MIEN
  ly_do_mien text,
  primary key (ngay, nguoi)
);

-- Vết thay đổi (bắt buộc cho kiểm soát nội bộ)
create table ct2_nhat_ky_thay_doi (
  id bigserial primary key,
  bang text not null, ban_ghi_id uuid not null,
  truong text not null, gia_tri_cu text, gia_tri_moi text,
  nguoi_thuc_hien uuid not null, ly_do text,
  thoi_diem timestamptz default now()
);
```

**Ràng buộc nghiệp vụ cài ở tầng database (không chỉ ở giao diện):**

```sql
-- Chỉ vào HOAN_THANH khi đã có dòng Check và phần trăm = 100
create or replace function f_chan_hoan_thanh() returns trigger as $$
begin
  if new.trang_thai = 'HOAN_THANH' and old.trang_thai <> 'HOAN_THANH' then
    if new.phan_tram <> 100 then
      raise exception 'Chưa đạt 100%% — không thể chuyển sang Hoàn thành';
    end if;
    if not exists (select 1 from ct2_nhip_pdca
                   where dau_viec_id = new.id and nhan_pdca = 'C') then
      raise exception 'Thiếu bước Check (C) trong nhật ký PDCA';
    end if;
  end if;
  if new.trang_thai = 'DA_DONG'
     and not exists (select 1 from ct2_nhip_pdca
                     where dau_viec_id = new.id and nhan_pdca = 'A') then
    raise exception 'Thiếu bước Act (A) — chưa ghi bài học rút ra';
  end if;
  return new;
end $$ language plpgsql;

-- Chỉ Phó Phòng trở lên được tạo đầu việc liên phòng
create or replace function f_chan_lien_phong() returns trigger as $$
declare cap text;
begin
  if new.lien_phong then
    select vai_tro into cap from nhan_su where id = new.nguoi_tao;
    if cap not in ('PHO_PHONG','TRUONG_PHONG','BAN_GIAM_DOC','TCTH_QUANTRI') then
      raise exception 'Chỉ Phó Phòng trở lên được khởi tạo đầu việc liên phòng';
    end if;
  end if;
  return new;
end $$ language plpgsql;
```

**RLS (nguyên tắc):** `CAN_BO` đọc mọi bản ghi cùng `phong` + chiến dịch có tham gia, ghi chỉ trên bản ghi mình phụ trách; `PHO_PHONG`/`TRUONG_PHONG` thêm quyền ghi toàn phòng; `BAN_GIAM_DOC` đọc các phòng được phân công (bảng `dm_phu_trach`); `TCTH_QUANTRI` đọc toàn bộ. Lọc **tại máy chủ**, không lọc ở trình duyệt — đúng nguyên tắc "Lớp 2" trong tài liệu an toàn thông tin của cổng ONE.

**Tác vụ định giờ (pg_cron / Edge Function):**

| Giờ (UTC+7) | Tác vụ |
|---|---|
| 07:00 | Sinh danh sách việc cần ghi nhịp, đẩy N1, N9 |
| 08:00 | Chốt sổ cán bộ → ghi `ct2_anh_chup_nhip`, đẩy N2, N3 |
| 08:30 | Chốt sổ lãnh đạo → sinh Báo cáo giao ban, đẩy N16 |
| 08:35 | Quét ngoại lệ (quá hạn, tuổi cột chờ, WIP, im lặng) → đẩy N5–N8, N11 |
| 17:30 | Nhắc cuối ngày thẻ 🔴 |
| Thứ 2 07:30 | Tổng hợp tuần N17 |
| 00:05 hằng ngày | Cập nhật cờ quá hạn, tính điểm rủi ro |

---

## 11. TIÊU CHÍ NGHIỆM THU (mẫu Given–When–Then)

1. **Chặn thiếu trường:** *Cho* Phó Phòng đang tạo đầu việc thiếu "Kết quả đầu ra" — *Khi* bấm Tạo — *Thì* nút bị vô hiệu hóa, hiện đúng tên các trường còn thiếu, không có bản ghi nào được tạo.
2. **Chặn khép vòng PDCA:** *Cho* thẻ 100% nhưng chưa có dòng C — *Khi* kéo sang "Hoàn thành" — *Thì* hệ thống từ chối kèm thông báo tiếng Việt rõ ràng, thẻ bật về cột cũ.
3. **Chống nhịp trùng:** *Cho* nhịp hôm nay trùng 100% nội dung hôm qua — *Khi* bấm Lưu — *Thì* từ chối và gợi ý ghi rõ điểm khác biệt.
4. **Mốc 8h00:** *Cho* cán bộ ghi nhịp lúc 07:58 — *Thì* `ket_qua = DUNG_GIO`; ghi lúc 08:12 → `MUON`; chưa ghi tới 08:30 → `MAT_NHIP` và có thông báo N2 + N3.
5. **Đổi chủ đồng hồ:** *Cho* thẻ chuyển sang "Chờ duyệt" — *Thì* các ngày chờ **không** tính vào chậm nhịp của người phụ trách, và sau 3 ngày làm việc thông báo N7 đi tới **người duyệt**, không tới người phụ trách.
6. **Quyền liên phòng:** *Cho* tài khoản `CAN_BO` — *Khi* gọi API tạo đầu việc `lien_phong = true` — *Thì* database từ chối (không chỉ ẩn nút trên giao diện).
7. **Phân quyền đọc:** *Cho* cán bộ Phòng KHDN — *Khi* truy cập trực tiếp ID thẻ của Phòng Kế toán — *Thì* máy chủ trả về không có dữ liệu.
8. **Không sửa nhật ký:** *Cho* bất kỳ vai trò nào — *Khi* gọi UPDATE/DELETE trên `ct2_nhip_pdca` — *Thì* bị từ chối ở tầng quyền.
9. **Trần thông báo:** *Cho* một người có 5 thẻ chậm — *Thì* nhận **1** thông báo gộp, không nhận 5.
10. **Loại trừ hợp lệ:** *Cho* cán bộ đã khai nghỉ phép — *Thì* không bị tính mất nhịp và không nhận thông báo nhắc.
11. **Điện thoại:** *Cho* điện thoại 5 inch — *Khi* dùng "Ghi nhịp nhanh" cho 6 thẻ — *Thì* hoàn tất trong ≤ 60 giây, không cần cuộn ngang.
12. **Loại THƯỜNG TRỰC:** *Cho* thẻ loại THƯỜNG TRỰC — *Thì* không xuất hiện trong mẫu số tỷ lệ nhịp và không sinh cảnh báo quá hạn.

---

## 12. LỘ TRÌNH TRIỂN KHAI

| Giai đoạn | Thời lượng | Nội dung | Kết quả bàn giao |
|---|---|---|---|
| **GĐ1 — Lõi** | 3 tuần | Mô hình dữ liệu, RLS, Kanban 7 cột, cổng A/B, nhịp PDCA append-only, M1 + M2 | Chạy thử **02 phòng** (KHDN + TCTH) |
| **GĐ2 — Nhịp & Thông báo** | 2 tuần | Tác vụ định giờ 07:00/08:00/08:30, Web Push, N1–N11, Báo cáo giao ban | Thử nghiệm mốc giờ thật, chưa tính thi đua |
| **GĐ3 — Liên phòng & Giao tiếp** | 2 tuần | Chiến dịch liên phòng, M3, bình luận + @nhắc + "Cần trả lời", biểu tượng | Mở cho toàn bộ các Phòng |
| **GĐ4 — Quản trị & Thi đua** | 2 tuần | M4, M5, M6, bộ phát hiện bất thường, bảng thi đua, xuất báo cáo | TCTH vận hành chính thức |
| **GĐ5 — Ổn định** | 2 tuần | Tinh chỉnh ngưỡng theo dữ liệu thật, tối ưu điện thoại, tài liệu hướng dẫn | Bật tính thi đua chính thức |

**Điều kiện bật tính thi đua (không bật sớm):** sau ≥ 4 tuần chạy thật, tỷ lệ ghi nhịp toàn Chi nhánh ≥ 70% và tỷ lệ thẻ đủ 5W2H ≥ 90%. Bật thi đua khi dữ liệu còn xấu sẽ tạo phản ứng phòng vệ và làm hỏng chất lượng dữ liệu về sau.

---

## 13. RỦI RO VÀ ĐỐI SÁCH

| Rủi ro | Mức | Đối sách đã cài trong thiết kế |
|---|:--:|---|
| Cán bộ coi đây là công cụ chấm công | **Cao** | Ngôn ngữ "gương soi"; miễn trừ hợp lệ; ân hạn 8h00–8h30; không bêu tên công khai; đồng hồ chuyển sang người giữ việc |
| Ghi nhịp hình thức, sao chép | Cao | Chặn nội dung trùng; bắt buộc tách "vướng gì / hôm nay làm gì"; chấm chất lượng nhịp có trọng số |
| Bội thực thông báo → tắt push | Cao | Gộp theo người; trần 3/ngày; im lặng ngoài giờ; chỉ báo ngoại lệ |
| Chẻ nhỏ đầu việc lấy thành tích | Trung bình | Thi đua ưu tiên nhịp; phát hiện thẻ tạo–đóng trong ngày; Trưởng phòng chốt mới được đóng |
| Việc liên phòng không ai chịu trách nhiệm | Trung bình | Duy nhất 1 chủ trì; mỗi phòng phối hợp có đầu việc con riêng; bản đồ nút thắt |
| Bắt điền 5W2H làm chậm khởi tạo | Trung bình | Mẫu sẵn theo loại phòng; nhân bản thẻ kỳ trước; cán bộ chỉ cần "Đề xuất việc" 2 trường |
| Lộ thông tin ngoài phạm vi | Cao | Lọc tại máy chủ (RLS), không chia sẻ link công khai, ghi vết mọi thao tác |

---

## 14. HAI ĐỀ XUẤT MỞ RỘNG (giai đoạn sau)

1. **Trợ lý soạn nhịp bằng AI (tùy chọn, bật/tắt theo phòng):** khi cán bộ gõ câu nhịp quá sơ sài, hệ thống gợi ý 3 câu hỏi làm rõ thay vì tự viết hộ — giữ nguyên nguyên tắc "cán bộ tự nhận thức", tránh việc AI viết thay làm mất giá trị nhật ký.
2. **Cầu nối Miro → BHY ONE (một chiều, chạy song song 1 quý):** nhập dữ liệu từ các board Miro đang dùng vào module mới để không mất lịch sử, sau đó dừng hẳn Miro cho nghiệp vụ KHHĐ. Giữ Miro cho họp sáng tạo/phác thảo — đúng thế mạnh của nó.

---

*Tài liệu này là đặc tả yêu cầu tính năng, dùng làm đầu vào cho đội phát triển và cho Phòng TCTH khi ban hành quy chế vận hành kèm theo. Mọi ngưỡng số (mốc giờ, WIP, tuổi cột chờ, trọng số thi đua) đều thiết kế cấu hình được, để điều chỉnh theo thực tế sau giai đoạn chạy thử.*

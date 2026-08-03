# Kanban Phê duyệt tín dụng (PDTD) — thiết kế từ board Miro thật của Phòng KHDN

Bàn Kanban **thứ hai** trong Chiêu thức 2, chỉ bật cho phòng có nghiệp vụ cấp
tín dụng. Đơn vị theo dõi là **hồ sơ tín dụng của một khách hàng cụ thể**, khác
hẳn "đầu việc" của bàn kế hoạch hành động — nên tách bảng riêng.

Nguồn thiết kế: đọc trực tiếp board Miro PDTD đang chạy của Phòng KHDN
(`uXjVNkgsxsE=`, 47 hồ sơ) theo đúng trình tự quy chế `phan-tich-kanban` §B1 —
`context_get` → `table_list_rows` đọc từng dòng, không suy luận từ bản tóm tắt.

---

## 1. Rà soát board hiện tại (áp bộ kiểm §B3–B4)

**Quy mô:** 47 hồ sơ, trong đó **19 đang chạy**:

| Bước | Số hồ sơ |
|---|---|
| (1) Thu thập hồ sơ | 6 |
| (2) Trình LĐP | 3 |
| (3) Trình LĐ Chi nhánh | 3 |
| (4) Trình Cấp PDTD TSC | 3 |
| (5) Hoàn thiện HS GN | 0 |
| «Đến hạn GHTD 2 tháng tới» | 4 |

### Sáu lỗi dữ liệu, mỗi lỗi dẫn tới một quyết định thiết kế

**1. Số tiền nằm trong Tags dạng chữ.** Board dùng nhãn `"160 ty"`, `"180 ty"`,
`"70 ty"`, `"30  tỷ"` (hai dấu cách), `"250"`, `"31"`. Hệ quả: không cộng được
tổng dư nợ đang trình, không sắp theo quy mô, không lọc "hồ sơ trên 100 tỷ".
→ `so_tien` là **NUMERIC**, đơn vị **triệu đồng**, nhập bằng ô số. Giao diện
hiện lại theo cách người ngân hàng đọc (`160000` → «160 tỷ»).

**2. Ngày cũng nằm trong Tags** — `"31/07/2026"`, `"15/04/2026"`,
`"30/08/2026"` — trong khi bảng **đã có** hai cột ngày (Due Date, End date).
Dữ liệu ngày nằm rải ba chỗ nên không chỗ nào lọc cho đủ.
→ Mỗi loại ngày một cột riêng có nghĩa rõ ràng: `ngay_nhan`, `han_xu_ly`,
`ngay_den_han_ghtd`, `ngay_hoan_thanh`.

**3. «Đến hạn GHTD 2 tháng tới» bị để thành một TRẠNG THÁI** trong cùng cột
Status với 6 bước quy trình. Hệ quả kép: 4 hồ sơ nằm đó không ai biết đang ở
bước nào, mà tiến trình cũng bị thêm một cột không phải tiến trình.
→ Tách hẳn thành **trường ngày** `ngay_den_han_ghtd`. Hồ sơ sắp đến hạn hiện ở
dải cảnh báo riêng đầu bảng, vẫn giữ nguyên bước thật của nó.

**4. Hai cột người cùng gán người** — «Assignee» và «Assigned To». Đúng lỗi
§B3.3: *"nhiều người ngang vai cùng một card mà không phân vai → không ai thực
sự chịu trách nhiệm"*.
→ Một cột `can_bo` duy nhất. Người theo dõi là vai trò khác, tên trường khác.

**5. Tên hồ sơ trộn khách hàng với loại việc.** `"Onsen Hội Vân"` (chỉ tên KH)
nằm cạnh `"Tăng GHTD Công ty Thành Đạt"` và `"Điều chỉnh GHTD TDH và Ngắn hạn
của GDT"`. Không nhóm được theo khách hàng, không đếm được mỗi loại bao nhiêu.
→ Tách `khach_hang` và `loai_ho_so` (6 loại, danh mục đóng).

**6. Nhãn trùng nghĩa khác chính tả.** `"Tái Cấp"` / `"Tai cap"` / `"tái cấp"`
(ba biến thể cùng nghĩa); `"15 tỷ"` / `"15 ty"`; Priority có cả `"High"` lẫn
`"H"`; Category có **ba lựa chọn rỗng** khác màu.
→ Mọi phân loại là danh mục đóng có CHECK ở database, không cho gõ tay.

### Ba phát hiện khác cần nêu

- **Nhiều hồ sơ đang trình mà không có ngày nào**, kể cả hồ sơ **160 tỷ** đang
  ở bước «Trình LĐ Chi nhánh» (Tái cấp Tập đoàn Thaicom) và hồ sơ ở bước
  «Trình Cấp PDTD TSC» (Điều chỉnh GHTD của GDT). Đây là vi phạm §B3.1 trên
  chính nhóm hồ sơ rủi ro nhất.
  → `han_xu_ly` là **NOT NULL**. Không có hạn thì bảng không trả lời được câu
  hỏi "có đúng hẹn không" — tức là mất toàn bộ lý do tồn tại của nó.
- **Một hồ sơ không có Status** (Công ty CP may Minh Anh Đô Lương, 250, ưu tiên
  High) — thẻ trôi ngoài mọi cột.
- **Tên hồ sơ chứa JSON thô**: `{"format":"delta","ops":[{"insert":"..."}]}` —
  lỗi kỹ thuật của Miro làm hỏng tìm kiếm và xuất báo cáo.

---

## 2. Bàn PDTD trên BHY ONE

### Bảy cột theo đúng quy trình Phòng đang chạy

📂 Thu thập hồ sơ → 📤 Trình Lãnh đạo Phòng → 🏢 Trình LĐ Chi nhánh →
🏛️ Trình cấp PDTD TSC → 📝 Hoàn thiện HS giải ngân → ✅ Hoàn thành ·
⛔ Từ chối/Dừng

Giữ nguyên tên bước cán bộ đã quen — không đổi từ vựng nghiệp vụ.

### Trường của một hồ sơ

| Nhóm | Trường | Ghi chú |
|---|---|---|
| Khách hàng | `khach_hang` | Chỉ tên khách, tách khỏi loại việc |
| Loại việc | `loai_ho_so` | Cấp mới · Tái cấp · Điều chỉnh · Cơ cấu nợ · Dự án/TDH · Giải ngân |
| Tiền | `so_tien` (numeric), `ky_han` | Triệu đồng — cộng và lọc được |
| Thẩm quyền | `cap_phe_duyet` | Phòng · Chi nhánh · TSC |
| Người | `can_bo` (duy nhất 01), `nguoi_dang_giu` | Người giữ = ai đang cầm hồ sơ ở bước trình |
| Ngày | `ngay_nhan`, `han_xu_ly`, `ngay_den_han_ghtd`, `ngay_hoan_thanh` | Mỗi loại một cột |

### Cổng chặn ở tầng database

- **Không nhảy cấp:** hồ sơ thẩm quyền Chi nhánh không trình được lên TSC.
- **Không tắt bước:** phải qua «Hoàn thiện hồ sơ giải ngân» mới chốt Hoàn thành.
- **Từ chối/dừng** cần lãnh đạo Phòng + lý do ≥ 20 ký tự, có ghi vết.
- **Trình cấp trên phải chỉ rõ trình ai** — để đồng hồ chờ tính đúng người,
  đúng nguyên tắc §A5 «cột nguy hiểm nhất».
- **Số tiền, cấp phê duyệt, khách hàng, cán bộ phụ trách** chỉ lãnh đạo đổi
  được; mọi lần đổi số tiền và hạn xử lý đều ghi vào `ct2_nhat_ky_thay_doi`.
- **RLS chặt hơn bàn đầu việc:** hồ sơ tín dụng là dữ liệu khách hàng, chỉ
  phòng sở hữu + PGĐ phụ trách + BGĐ/TCTH đọc được. **Không** mở cho phòng khác
  qua đường chiến dịch chung như thẻ đầu việc.

### Ngưỡng chờ riêng cho từng cấp trình

| Bước | Ngưỡng |
|---|---|
| Trình Lãnh đạo Phòng | 2 ngày |
| Trình LĐ Chi nhánh | 3 ngày |
| Trình cấp PDTD TSC | 5 ngày |

Trình lên Trụ sở chính vốn lâu hơn — dùng chung một ngưỡng sẽ hoặc báo động giả
với TSC, hoặc bỏ sót nghẽn trong nội bộ Chi nhánh.

---

## 3. Ba thứ bản Miro không làm được

**1. Tổng dư nợ đang nằm ở từng bước.** Mỗi cột hiện số tiền cộng dồn; dải đầu
bảng hiện tổng dư nợ đang trình toàn phòng. Chỉ tính được vì số tiền là số.

**2. Cảnh báo đường ống hạn mức.** RPC `ct2_pdtd_sap_den_han` tìm khách hàng có
hạn mức đến hạn trong 60 ngày **mà chưa có hồ sơ tái cấp/điều chỉnh nào đang
chạy**. Đây là câu hỏi bản Miro không trả lời được: vì «đến hạn GHTD» bị để lẫn
thành một cột trạng thái nên không đối chiếu được với đường ống hồ sơ.

**3. Xếp hồ sơ theo rủi ro thật.** Trong mỗi cột: hồ sơ có cảnh báo đỏ lên
trước; cùng mức rủi ro thì **hồ sơ tiền lớn hơn lên trước** — tiền lớn hỏng thì
đau hơn. Thứ tự cảnh báo theo §B5: hạn mức sắp hết → quá hạn xử lý → nghẽn cột
chờ → thiếu dữ liệu hành chính.

---

## 4. Bật cho phòng nào

Bảng `ct2_phong_pdtd`. Đã bật sẵn: **KHDN · Bán lẻ · HTTD**. Phòng chưa bật thì
tab «Phê duyệt tín dụng» **không hiện** — đúng nguyên tắc hiển thị của cổng ONE:
không có quyền thì không hiện, không hiện rồi mới báo lỗi.

TCTH bật thêm cho phòng khác bằng một dòng:

```sql
insert into ct2_phong_pdtd (phong)
select id from departments where code = 'PHONG_GIAO_DICH_VAN_LAM';
```

---

## 5. Trạng thái triển khai

Migration `20260808090000_ct2_kanban_phe_duyet_tin_dung.sql` **đã áp** vào
project `whlysprzsguehxmrjwha` (01/08/2026). Kiểm chứng sau khi áp: 3 bảng đều
bật RLS, 6 policy, 3 phòng đã bật.

Mã nguồn: `src/lib/ct2TinDung.ts` (+19 test), `useCt2TinDung.ts`,
`Ct2CreditBoard.tsx`, `Ct2CreditDialogs.tsx`; tab thứ ba trong
`/one/chieu-thuc-2`.

### Chưa làm (đề xuất đợt sau)

- **Nhập lịch sử 47 hồ sơ từ Miro.** Nên nhập tay hoặc bán tự động vì dữ liệu
  nguồn cần làm sạch: tách tiền khỏi Tags, tách tên khách khỏi loại việc, gỡ
  JSON Delta trong tên, bổ sung hạn xử lý cho các hồ sơ đang thiếu. Không nên
  nhập máy móc — sẽ mang nguyên sáu lỗi trên sang hệ mới.
- Thông báo đẩy khi hồ sơ nghẽn quá ngưỡng chờ (đi cùng N1–N17 của GĐ2).
- Đối chiếu quy chế họp Hội đồng tín dụng với hồ sơ chuyển Hoàn thành (§B4).
- Nối với «phễu lọc khách hàng» để nhìn được đường ống phía trước.

# Lịch nghỉ lễ Chi nhánh + nhắc quản trị trước 10 ngày

08/2026. Trả lời yêu cầu: *"làm menu để nhập các ngày nghỉ, kỳ nghỉ trong năm,
tính năng nhắc quản trị trước 10 ngày… (vì các kỳ nghỉ này chính phủ sẽ duyệt
lịch cụ thể, nhưng 10 ngày trước khi diễn ra sẽ biết được để chủ động vào cài
đặt)"*.

---

## 1. Vì sao cần

Đợt trước đã tách bạch **ngày làm việc** khỏi **ngày lịch**, nhưng mới trừ được
thứ Bảy và Chủ nhật. Món nợ ghi rõ trong tài liệu đợt đó:

> *Ngày nghỉ lễ chưa trừ — Chi nhánh chưa có bảng lịch nghỉ.*

Hậu quả nếu để nguyên: hồ sơ trình trước kỳ nghỉ Tết sẽ báo đỏ **«chờ 9 ngày»**
đúng buổi sáng cơ quan mở cửa trở lại — cùng loại cảnh báo sai mà đợt trước vừa
sửa, chỉ khác là nặng gấp ba.

## 2. Nguyên tắc: máy nhắc, người quyết

Sáu mốc lễ tính được bằng máy — bốn mốc neo cứng vào dương lịch, hai mốc suy ra
từ âm lịch:

| Mốc | Ngày gốc | 2026 | 2027 |
|---|---|---|---|
| Tết Dương lịch | 01/01 | 01/01 | 01/01 |
| Tết Nguyên đán | mùng 1 tháng Giêng ÂL | **17/02** | **06/02** |
| Giỗ Tổ Hùng Vương | mùng 10 tháng 3 ÂL | **26/04** | **16/04** |
| Giải phóng miền Nam, thống nhất đất nước | 30/4 | 30/04 | 30/04 |
| Quốc tế Lao động | 01/5 | 01/05 | 01/05 |
| Quốc khánh | 02/9 | 02/09 | 02/09 |

Nhưng **lịch nghỉ cụ thể thì máy không đoán được**: nghỉ mấy ngày, hoán đổi ngày
nào, đi làm bù thứ Bảy nào — Chính phủ chốt từng năm và thường công bố trước vài
tuần. Nên hệ thống chỉ **nhắc trước 10 ngày**, còn người nhập là người quyết.

Hai ghi chú về danh sách:

- **30/4 là «Ngày Giải phóng miền Nam, thống nhất đất nước»**. «Giải phóng Thủ
  đô» là 10/10 — ngày kỷ niệm, không phải ngày nghỉ lễ hưởng nguyên lương, nên
  không đưa vào.
- **Đã thêm Quốc khánh 02/9** dù không nằm trong danh sách yêu cầu: nó cùng đúng
  một loại với 30/4 — nghỉ theo luật, lịch cụ thể do Chính phủ chốt. Nhắc 30/4
  mà bỏ 02/9 thì đến tháng 9 lại quên.

## 3. Âm lịch: phải là lịch Việt Nam, không phải lịch Trung Quốc

Tết và Giỗ Tổ neo vào âm lịch nên phải tính bằng thuật toán thiên văn (điểm sóc
+ kinh độ mặt trời), chạy ở **múi giờ +7**.

Đây không phải chi tiết vụn: lịch âm Việt Nam (+7) và lịch âm Trung Quốc (+8)
**lệch nhau vài ngày ở một số năm**, vì có năm điểm sóc rơi sát nửa đêm. Dùng
nhầm +8 là Tết lệch một ngày — với ngân hàng thì đó là lệch cả lịch trực.

Đã neo bằng test vào sáu mốc Tết đã biết (2023–2028). Ai đổi múi giờ hay sửa
thuật toán là test gãy ngay.

## 4. Bảng lịch nghỉ đi HAI CHIỀU

Chỉ bớt ngày làm việc là chưa đủ. Kỳ nghỉ dài thường kèm phương án hoán đổi:
nghỉ thêm ngày này, **đi làm bù thứ Bảy khác**. Nên bảng có hai loại:

| Loại | Tác dụng |
|---|---|
| `NGHI` | Bớt một ngày làm việc |
| `LAM_BU` | **Thêm** một ngày làm việc, kể cả khi rơi vào T7/CN |

Lưu theo **từng ngày** chứ không theo khoảng, để hàm đếm chỉ cần một phép tra
bảng thay vì xét chồng lấn khoảng. Các ngày cùng một kỳ chia sẻ `nhom_id` nên
giao diện vẫn hiện và xóa được cả cụm.

## 5. Nhập một lần cho cả kỳ

Kỳ nghỉ Tết có thể 9 ngày. Bắt quản trị bấm thêm 9 lần là cách chắc chắn để có
kỳ nhập thiếu ngày — nên có RPC `lich_nghi_them_ky(từ, đến, tên, loại)` bung ra
từng ngày trong một lần gọi. Nhập đè lên ngày đã có thì cập nhật chứ không báo
lỗi: sửa lại lịch sau khi Chính phủ điều chỉnh là chuyện bình thường.

## 6. Nhắc: ba lớp chống phiền

Lời nhắc mà phiền thì bị tắt, và tắt rồi thì đến Tết vẫn không ai nhập.

1. **Quét cả khoảng 10 ngày**, không bắt khớp đúng ngày thứ 10. Tác vụ chỉ chạy
   ngày thường, nên mốc nào có «đúng 10 ngày trước» rơi vào thứ Bảy sẽ không bao
   giờ được nhắc nếu bắt khớp cứng.
2. **Mốc đã có lịch nghỉ rồi thì thôi.** Quản trị làm xong việc, nhắc nữa là vô
   duyên.
3. **Bảng `lich_nghi_da_nhac` khóa theo (mốc, năm)** — mỗi mốc nhắc đúng một lần
   cho mỗi năm, dù tác vụ chạy lại bao nhiêu lần. Chèn được dòng khóa mới gửi
   tin, nên không có kẽ hở đua tranh.

Tin nhắc đi qua **đúng cửa `ct2_dat_thong_bao`** như mọi thông báo khác, nên vẫn
chịu luật hoãn ngoài giờ và không lách được trần. Mức 🔴 vì bỏ lỡ là cả Chi nhánh
đếm sai suốt kỳ nghỉ.

## 7. Màn hình quản trị

`Quản trị → Nội dung & Hệ thống → Lịch nghỉ lễ` (chỉ TCTH/quản trị hệ thống).

- **Dải cảnh báo đầu trang** — mốc nào còn ≤ 10 ngày mà chưa có lịch thì hiện ngay.
- **Sáu mốc lễ của năm** — mỗi mốc một ô, có dấu ✓ nếu đã nhập. Bấm vào là mở
  sẵn ô nhập với tên và ngày gốc điền trước.
- **Danh sách kỳ nghỉ đã nhập**, gộp theo cụm, xóa được cả cụm.
- Cả Chi nhánh **đọc** được lịch (cán bộ cần biết vì sao thẻ của mình không bị
  tính chậm); chỉ TCTH **sửa** được.

## 8. Đã triển khai

| Lớp | Nội dung |
|---|---|
| Thư viện | `src/lib/amLich.ts` — đổi âm ↔ dương (Hồ Ngọc Đức, +7) + sáu mốc lễ; `src/lib/lichNghi.ts` — sổ lịch dùng chung |
| Database | Migration `20260813090000_lich_nghi_le.sql`: bảng `lich_nghi_le` + RLS, RPC `lich_nghi_them_ky` / `lich_nghi_xoa_nhom`, bảng chống nhắc trùng |
| Đồng hồ | `ct2_ngay_lam_viec`, `ct2_la_ngay_lam_viec`, `ct2_moc_phat_gan_nhat` nay đọc lịch nghỉ; phía client `soNgayLamViec` / `laNgayLamViec` cũng vậy |
| Edge function | `nhac-lich-nghi` — quét mốc, chống trùng, gửi qua `ct2_dat_thong_bao` |
| Cron | `nhac-lich-nghi` chạy **07:05 giờ VN, T2–T6** |
| Giao diện | `src/pages/LichNghiAdminPage.tsx` + mục menu «Lịch nghỉ lễ» |

Migration **đã áp**, edge function **đã deploy**, cron **đã lên lịch**.

## 9. Kiểm chứng

Trên database thật (giao dịch có rollback), mốc kiểm 27/4 → 4/5/2026:

| Phép thử | Kết quả |
|---|---|
| Chưa nhập lịch | **5** ngày làm việc |
| Sau khi nhập kỳ nghỉ 30/4–03/5 | **3** ngày làm việc |
| 08/5 → 11/5 có ngày làm bù T7 09/5 | **2** ngày làm việc (thay vì 1) |
| `ct2_la_ngay_lam_viec('2026-04-30')` | `false` |
| Edge function chạy khô trên môi trường thật | HTTP 200, sáu mốc đúng ngày |

Phía client: **483 test pass**, thêm 25 test mới — trong đó sáu mốc Tết
2023–2028 và bài «thẻ chờ vắt qua kỳ nghỉ lễ không bị báo nghẽn oan».

## 10. Chưa làm

- **Lịch nghỉ phép cá nhân** (nghỉ phép năm, nghỉ ốm của từng cán bộ) — khác
  hẳn: đây là lịch chung toàn Chi nhánh. Nếu muốn đồng hồ chờ trừ cả ngày phép
  riêng của người đang giữ việc thì cần bảng khác và cần bàn kỹ, vì nó chạm vào
  dữ liệu nhân sự.
- **Tự đề xuất kỳ nghỉ theo thông lệ** (VD 30/4 rơi thứ Năm thì gợi ý nghỉ tới
  hết Chủ nhật). Cố ý chưa làm: gợi ý sai còn tệ hơn không gợi ý, vì quản trị dễ
  bấm đồng ý cho nhanh.
- **Nhập lịch nghỉ nhiều năm một lần** — hiện mỗi lần nhập một kỳ. Chưa cần cho
  tới khi có ai đó phải nhập lại cả lịch sử.

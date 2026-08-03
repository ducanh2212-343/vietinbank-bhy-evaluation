# Rà soát: nhịp Chiêu thức 2 chỉ chạy thứ 2 → thứ 6

08/2026. Trả lời yêu cầu: *"kiểm tra lại việc cập nhật chỉ là các ngày thường
thứ 2 đến thứ 6"*.

---

## 1. Kết quả rà soát

Quy tắc «chỉ ngày thường» trước đợt này mới được áp ở **đúng hai chỗ**:

| Đã đúng | Ở đâu |
|---|---|
| Khung làm tươi bảng tự động chỉ chạy T2–T6, 6h45–8h45 | `trongKhungNhip()` — `src/lib/ct2.ts` |
| Thông báo im lặng ngày nghỉ | `ct2_dat_thong_bao` — database |

**Mọi chỗ còn lại đếm ngày lịch và coi thứ Bảy như một ngày làm việc bình
thường.** Năm hậu quả cụ thể:

| # | Lỗi | Biểu hiện với cán bộ |
|---|---|---|
| 1 | `tuoiCho` / `hsTuoiCho` đếm ngày lịch | Hồ sơ trình **chiều thứ Sáu** → **sáng thứ Hai** đã báo đỏ «chờ 3 ngày», trong khi người duyệt chưa có một buổi làm việc nào |
| 2 | `soNgayImLang` đếm ngày lịch | Sáng thứ Hai **mọi** thẻ đang làm đều «im lặng 3 ngày», điểm rủi ro cả bảng vọt lên |
| 3 | Chấm giờ nhịp không xét thứ | Cán bộ tranh thủ ghi sáng thứ Bảy bị chấm **MẤT NHỊP** — bị phạt vì đi làm ngày nghỉ |
| 4 | Bảng nhịp phòng + chốt sổ vẫn chạy T7/CN | Mở bảng thứ Bảy thấy cả phòng xám ngắt «chưa ghi nhịp»; lịch sử có hai ngày 0% mỗi tuần kéo tụt mọi thống kê |
| 5 | Thông báo ngoài giờ bị **vứt hẳn** | Hồ sơ trình 18h30 thứ Sáu → người duyệt **không bao giờ** được báo |

Ba cái đầu đều là **cảnh báo sai**. Cảnh báo sai lặp vài lần là cán bộ thôi tin
bảng — đó mới là thiệt hại thật, không phải con số lệch.

## 2. Nguyên tắc phân biệt: đồng hồ nào trừ ngày nghỉ, đồng hồ nào không

Không phải mọi con số đều nên đổi. Ranh giới:

| Loại đồng hồ | Đơn vị | Vì sao |
|---|---|---|
| **Tuổi chờ · im lặng · nghẽn cột trình** | **Ngày làm việc** | Đo *người ta đã có bao nhiêu cơ hội xử lý*. Cuối tuần không ai có cơ hội nào |
| **Quá hạn hoàn thành · quá hạn xử lý hồ sơ · hạn mức GHTD** | **Ngày lịch** (giữ nguyên) | Hạn là lời hứa theo một ngày trên tờ lịch. Trễ hai ngày vắt qua cuối tuần thì với khách hàng và với BGĐ vẫn là trễ hai ngày |

Ngưỡng sẵn có đã nói bằng ngày làm việc từ đầu — `CT2_NGUONG_TUOI_CHO = 3`,
`HS_NGUONG_CHO` 2/3/5 theo quy chế Miro §A5 — chỉ có đồng hồ là đếm sai đơn vị.

## 3. Đã sửa

### Đếm ngày làm việc

Một hàm ở mỗi lớp, không rải công thức khắp nơi:
`soNgayLamViec()` trong `src/lib/ct2.ts` và `ct2_ngay_lam_viec(_tu, _den)` trong
database. Khi Chi nhánh có bảng lịch nghỉ lễ thì chỉ phải sửa đúng hai chỗ này.

Áp vào: `tuoiCho`, `soNgayImLang`, `hsTuoiCho`, và `tuoi_cho` của
`ct2_cho_toi_duyet` (màn «Điều hành của tôi» của BGĐ).

### Ngày nghỉ không chấm, không đòi, không chụp

| Chỗ | Trước | Sau |
|---|---|---|
| Chấm giờ nhịp (`f_ct2_truoc_ghi_nhip`) | T7 ghi lúc 9h → `MAT_NHIP` | → `KHONG_TINH`: vẫn lưu đủ nội dung, không chấm, không vào mẫu số |
| Bảng nhịp phòng (`ct2_nhip_phong_hom_nay`) | cả phòng `CHUA_GHI` | `NGAY_NGHI` → giao diện hiện một dòng bình thản |
| Ô «Nhịp hôm nay» đầu bảng | `0%` đỏ | `—` với nhãn «(ngày nghỉ)» |
| Chốt sổ (`ct2_chot_so_nhip`) | vẫn chụp ảnh T7/CN | trả 0, không ghi gì |

### Thông báo: hoãn chứ không vứt

Đây là sửa quan trọng nhất, vì luật cũ **làm mất tin**.

Mỗi thông báo nay mang cột `phat_luc` do `ct2_moc_phat_gan_nhat()` tính:

```
sinh trong T2–T6, 07:00–18:00  →  phát ngay
sinh trước 07:00 ngày thường   →  chờ 07:00 chính hôm đó
sinh sau 18:00, hoặc T7/CN     →  07:00 buổi sáng LÀM VIỆC kế tiếp
mức ⛔ (chặn)                   →  phát ngay, bất kể giờ nào
```

Kèm theo:
- Trần 3 tin nhắc nhẹ/người/ngày nay đếm theo **ngày phát**, không theo ngày
  sinh — nếu không, mười tin dồn tối thứ Sáu sẽ cùng đổ vào sáng thứ Hai.
- Cron `ct2-phat-thong-bao-hoan` chạy **07:00 giờ VN, thứ 2 → thứ 6** để phát
  nốt các tin đã hoãn qua đêm hoặc qua cuối tuần.
- **Chuông trong ứng dụng KHÔNG chờ `phat_luc`** — mở ứng dụng lúc nào cũng đọc
  được hết. Hoãn là hoãn tiếng chuông trên điện thoại, không phải giấu thông tin.

## 4. Kiểm chứng

Trên database thật (giao dịch có rollback), mốc kiểm là thứ Sáu 07/08/2026 →
thứ Hai 10/08/2026:

| Phép thử | Kết quả |
|---|---|
| `ct2_ngay_lam_viec('2026-08-07','2026-08-10')` | **1** (không phải 3) |
| `ct2_ngay_lam_viec('2026-08-01','2026-08-31')` | **21** ngày làm việc trong tháng 8 |
| `ct2_moc_phat_gan_nhat('2026-08-07 18:30')` | **2026-08-10 07:00** |
| `ct2_moc_phat_gan_nhat('2026-08-08 09:00')` (T7) | **2026-08-10 07:00** |
| `ct2_moc_phat_gan_nhat('2026-08-11 09:15')` | giữ nguyên — phát ngay |
| Tin mức NHẸ sinh Chủ nhật | **vào hàng đợi**, `phat_luc` = 7h thứ Hai (trước đây bị vứt) |
| Tin mức ⛔ sinh Chủ nhật | phát ngay |
| `ct2_nhip_phong_hom_nay` trên bảng thật (hôm nay CN) | trả `NGAY_NGHI` |

Phía client: 457 test pass, trong đó 6 test mới khóa đúng các tình huống trên.
Ba test cũ được sửa kỳ vọng vì chúng đang khóa **hành vi sai** — ví dụ hồ sơ
trình thứ Bảy 08/08 trước đây tính «4 ngày chờ» vào thứ Tư 12/08, nay là 3.

## 5. Chưa làm

- **Ngày nghỉ lễ** chưa trừ (30/4, 2/9, Tết…). Chi nhánh chưa có bảng lịch nghỉ
  trong hệ thống. Khi có, chỉ cần sửa `soNgayLamViec()` và `ct2_ngay_lam_viec()`
  — mọi nơi khác đã đi qua hai hàm này.
- **Ngày làm việc bù** (thứ Bảy đi làm theo lịch điều động) cũng cần chính bảng
  lịch đó, vì lúc ấy T7 phải tính là ngày làm việc.

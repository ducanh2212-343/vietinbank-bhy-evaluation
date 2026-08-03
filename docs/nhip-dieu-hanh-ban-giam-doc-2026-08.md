# Nhịp điều hành của Ban Giám đốc — Chiêu thức 2 · Kanban tuần · Bắc Hưng Yên Mark

Tài liệu tư vấn + thiết kế, 08/2026. Trả lời câu hỏi: *"BGĐ còn nhịp tuần Bắc
Hưng Yên Mark nữa, giải pháp phù hợp là gì?"*

---

## 1. Phát hiện đầu tiên: Bắc Hưng Yên Mark KHÔNG phải nhịp thứ ba

Thẻ dấu ấn sinh thẳng vào `kanban_cards` (`source_type = manager_assigned` +
`leadership_mark_id`), nên nó **đã dùng chung kỷ luật tuần** của Kanban: tuần
T2 00:00 → hết CN, digest T2 06:30, nhắc T6 15:00. Về cơ chế, Chi nhánh chỉ có
**hai nhịp**:

| Nhịp | Đo cái gì | Chu kỳ | Chốt sổ |
|---|---|---|---|
| **Ngày** — Chiêu thức 2 (PDCA) | Việc của Phòng | Mỗi sáng 7h–8h | 8h00 / 8h30 |
| **Tuần** — Kanban (gồm cả dấu ấn) | Phát triển năng lực + dấu ấn lãnh đạo | T2–CN | Hết CN |

Kết luận: **không được thêm nhịp thứ ba.** Ba loại deadline trong đầu một người
là quá tải, và đặc tả §6.2 đã cảnh báo về bội thực thông báo.

## 2. Vấn đề thật: bốn nơi phải nhìn, và một khoảng trống

Một Phó Giám đốc hiện phải đi qua:

1. Trang chủ ONE — nhịp sáng cá nhân + Kanban 38 skill
2. `/one/chieu-thuc-2` — bảng các phòng mình phụ trách
3. `/dau-an` — 4 dấu ấn + STAR
4. Kanban cá nhân — thẻ 38 skill + thẻ dấu ấn

Và **không nơi nào** cho họ thấy việc đang nằm trong tay chính họ — dù đặc tả
§7.4 nói rõ phải có: *"Danh sách việc đang chờ chính BGĐ duyệt kèm tuổi chờ —
tự soi ngược lên lãnh đạo, không chỉ soi xuống cán bộ."*

Đây mới là khoảng trống nghiêm trọng: cột "Chờ duyệt" được chính đặc tả gọi là
**"cột nguy hiểm nhất"**, mà người đang giữ việc lại không có màn hình nào nhắc
họ đang giữ gì.

## 3. Giải pháp: gộp NƠI NHÌN, giữ nguyên NHỊP

Màn **«Điều hành của tôi»** trên trang chủ ONE, chỉ hiện với BGĐ/PGĐ. Ba tầng
xếp theo mức cấp thiết, **không theo cấp bậc dữ liệu**:

### Tầng 1 — Đang chờ chính tôi *(đứng đầu)*

Gộp hai nguồn về một danh sách, kèm **tuổi chờ**:
- Đầu việc Chiêu thức 2 ở cột "Chờ duyệt"/"Chờ phối hợp" mà tôi là người giữ
- Hồ sơ tín dụng đang trình lên cấp tôi (trình đích danh, hoặc trình LĐ Chi
  nhánh mà tôi là PGĐ phụ trách phòng đó) — kèm số tiền

Việc chờ từ 3 ngày trở lên viền đỏ. Rỗng thì hiện *"Không có việc nào đang chờ
anh/chị — không ai bị chặn vì mình."*

Đứng đầu vì đây là phần lãnh đạo tự soi mình, và mỗi ngày trôi qua là một ngày
cả dây chuyền phía sau đứng lại.

### Tầng 2 — Phòng tôi phụ trách hôm nay *(nhịp ngày)*

Mỗi phòng một dòng: thanh nhịp (bao nhiêu người đã ghi / cần ghi), số thẻ 🔴,
số thẻ quá hạn, tổng việc đang chạy. Đọc được tỷ lệ mà không phải đọc số.

### Tầng 3 — Dấu ấn Bắc Hưng Yên Mark tuần này *(nhịp tuần)*

4 dấu ấn, chấm xanh = tuần này đã bồi bằng chứng, xám = chưa. Bấm vào là mở ô
ghi ngay tại chỗ, không phải sang trang khác.

## 4. Cải tiến riêng cho nhịp tuần của dấu ấn

Dấu ấn kéo dài cả kỳ T7–T8. Hỏi *"% bao nhiêu"* mỗi tuần cho một việc hai tháng
thì chỉ nhận lại *"vẫn đang làm"* — nhịp thành thủ tục.

**Đổi câu hỏi tuần: *"Tuần này có thêm bằng chứng gì?"*** Mỗi tuần bồi một mẩu
vào đúng phần của STAR:

| Chọn | Nghĩa |
|---|---|
| Hành động tôi đã làm | → Action |
| Kết quả đạt được | → Result |
| Bối cảnh mới phát sinh | → Situation |
| Nhiệm vụ được giao thêm | → Task |

Cuối kỳ STAR **tự đầy** — PGĐ không phải ngồi viết lại một lượt từ trí nhớ hai
tháng trước. Bảng `ct2_bang_chung_dau_an` là **append-only** như mọi nhật ký
khác của Chiêu thức 2: ghi sai thì bồi mẩu đính chính mới, không sửa đè.

Mốc tuần dùng đúng thứ Hai 00:00 giờ VN — **trùng `getVietnamWeekStart`** của
Kanban, để hai nơi không lệch tuần nhau.

## 5. Về email và thông báo

**Không sinh email mới.** Giữ nguyên digest T2 06:30 hiện có; khi làm GĐ2 thì
chỉ **thêm phần** cho BGĐ vào chính email đó (phòng phụ trách + dấu ấn tuần +
việc đang chờ mình). Đặc tả §6.2 đặt trần 3 thông báo nhắc/người/ngày — thêm
kênh mới là đi ngược lại.

## 6. Đã triển khai

| Lớp | Nội dung |
|---|---|
| Database | Bảng `ct2_bang_chung_dau_an` (append-only, RLS: chủ dấu ấn ghi, BGĐ/TCTH đọc) + 3 RPC `ct2_cho_toi_duyet`, `ct2_bgd_phong_cua_toi`, `ct2_dau_an_tuan_nay` |
| Dữ liệu UI | `useCt2Bgd.ts` — mỗi tầng một query độc lập, tầng nào lỗi không kéo sập tầng khác |
| Giao diện | `Ct2DieuHanhBgd.tsx` — 3 tầng + ô bồi bằng chứng ngay tại chỗ |
| Trang | Khối hiện trên trang chủ ONE, chỉ với vai trò `bgd`/`pgd`/admin |

Migration `20260810090000_ct2_dieu_hanh_bgd.sql` **đã áp** vào project
`whlysprzsguehxmrjwha`.

Nguyên tắc hiển thị giữ nguyên: **không có gì để điều hành thì khối không hiện**
— không bày khung rỗng ra trang chủ.

## 7. Chưa làm (đề xuất đợt sau)

- Thêm phần BGĐ vào digest email T2 06:30 (đi cùng GĐ2 — tác vụ định giờ).
- Gộp bằng chứng tuần vào 4 ô STAR của `leadership_marks` bằng một nút, và cho
  `exportLeadershipJourney` đọc thẳng từ `ct2_bang_chung_dau_an` để bản Word
  có dòng thời gian bằng chứng theo tuần.
- Màn M4 toàn cảnh Chi nhánh cho Giám đốc (ma trận Phòng × Trạng thái, Top 10
  việc rủi ro) — khác với màn này ở chỗ nhìn toàn cục thay vì nhìn phần của
  chính mình.

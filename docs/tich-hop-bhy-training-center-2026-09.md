# Tích hợp Bắc Hưng Yên Training Center vào Bắc Hưng Yên Ways

**Ngày:** 06/09/2026 · **Căn cứ:** Đặc tả tính năng Bắc Hưng Yên Training Center
bản 1.0 (tài liệu số 09), Chương trình 10 ngày Trưởng phòng KHDN Bản 4.0 (số 00),
Khung chia sẻ và tự suy ngẫm 1.0 (số 06), Sổ tay trả lời tin nhắn (số 07/07b).
**Phạm vi đợt này:** Giai đoạn 1 của đặc tả — chạy được cho chương trình đang có.

---

## 1. Kết luận

Training Center được dựng như **một thương hiệu thứ bảy trong Bắc Hưng Yên
Ways** và là **trung tâm nhiều chương trình**: danh mục xếp theo bốn nhóm đối
tượng của đặc tả (cán bộ mới · nâng cấp chuyên môn · quy hoạch · quản lý đương
nhiệm), mỗi chương trình có thành viên, lộ trình, bảng việc, phiếu riêng và
đường dẫn riêng (`/chuong-trinh/:id/…`). Chương trình 10 ngày của Trưởng phòng
KHDN chỉ là một mục — được nạp làm **chương trình mẫu** để Phòng TCTH nhân bản
cho vị trí quy hoạch khác. Không dựng phân hệ riêng trên thanh điều hướng:
đặc tả xác định điểm vào là «một ô trên trang chủ cổng», và cấu trúc menu chốt
08/2026 chỉ có sáu khu.

Hai tầng màn hình:

| Tầng | Đường dẫn | Ai dùng |
| --- | --- | --- |
| Trung tâm — danh mục, «chương trình của tôi» | `/one/training-center` | mọi cán bộ |
| Trung tâm — quản trị chương trình | `/one/training-center/quan-tri` | Phòng TCTH (tcth_admin, system_admin) |
| Chương trình — tổng quan, lộ trình, bảng việc, tự soi, lịch BGĐ | `/one/training-center/chuong-trinh/:id[/lo-trinh…]` | thành viên chương trình |

Bốn quyết định thiết kế quan trọng nhất:

| Quyết định | Cách làm | Vì sao |
| --- | --- | --- |
| Vai đọc từ **bảng thành viên chương trình**, không từ vai trò đăng nhập | `ttc_thanh_vien(vai: hoc_vien · huong_dan · bgd · quan_tri)`; mọi RLS gác bằng hàm `ttc_vai()` | Vai trò chung không tách được: Giám đốc mang `system_admin`, PGĐ phụ trách chỉ là một trong ba PGĐ, Phòng TCTH có nhiều `tcth_admin` nhưng chỉ một người quản trị chương trình |
| Ba việc gối đầu **không đẻ thẻ việc riêng** | Thẻ thật ở `ct2_dau_viec` (Chiêu thức 2); `ttc_viec_goi_dau` chỉ giữ WHY, tiêu chuẩn, mốc kiểm tra, nghiệm thu và **trỏ** sang thẻ đó | Cán bộ được giao ghi nhịp bằng đúng công cụ Phòng đang dùng; Kanban hàng ngày trên Training Center đọc thẻ thật qua RPC nên không bao giờ lệch với bảng Phòng |
| Tự soi và tự suy ngẫm **chỉ chính học viên đọc** — ở tầng RLS | Không có policy nào cho vai khác, kể cả `system_admin`; vai khác chỉ gọi được hàm trả cờ «đã điền N/8» | Đặc tả nói rõ: chỉ ẩn ở giao diện thì sớm muộn sẽ có người đọc được, và toàn bộ giá trị của phần tự soi mất đi |
| **Danh mục mở, chi tiết đóng** | `ttc_chuong_trinh` đọc được bởi mọi cán bộ; ngày, đầu việc, thành viên, tiến độ, điểm chỉ thành viên | Cán bộ nào cũng sẽ có lúc đứng trong một chương trình — phải thấy trước có gì; nhưng ai đang học gì, tiến độ ra sao là chuyện của chương trình đó |

---

## 2. Đối chiếu đặc tả với cổng hiện có

### 2.1 Những gì cổng đã có sẵn và được DÙNG LẠI

| Đặc tả yêu cầu | Cổng đã có | Cách nối |
| --- | --- | --- |
| Đăng nhập, vai, hồ sơ cán bộ | `profiles`, `user_roles`, `useAuth` | Thành viên chương trình trỏ về `profiles.id`; không tạo hệ đăng nhập riêng |
| Bảng việc Kanban 3 cột | Chiêu thức 2 — 7 trạng thái, `cotHienThi()` gấp về 3 cột | `cotBangViec()` dùng lại đúng luật gấp cột của Chiêu thức 2 để một thẻ đứng cùng cột ở cả hai bàn |
| Hộp thông báo trong ứng dụng | Hàng đợi `ct2_thong_bao` + chuông `Ct2ChuongThongBao` + push qua `notify-ct2` | Bốn mốc sinh tin qua `ct2_dat_thong_bao()` — hưởng nguyên luật im lặng ngoài giờ, kênh chuông + push, đánh dấu đã đọc |
| Đếm ngày làm việc, bỏ ngày nghỉ | `ct2_la_ngay_lam_viec()` đọc lịch nghỉ lễ | Hai cron 15:10 và 17:00 tự bỏ qua ngày nghỉ |
| Bộ màu, font, vỏ trang | `OnePageShell`, khuôn hero + tab của Ideas/Sao Xứng Đáng | Năm màn Training Center dùng đúng khuôn đó; điểm nhấn vàng đồng `#A8763E` theo đặc tả |
| Hộp thoại thẻ việc, cổng 2 (5W2H), ghi nhịp | `Ct2CardDialog`, `Ct2PlanDialog` | Kanban của Training Center mở thẳng hộp thoại của Chiêu thức 2 — không viết lại |

### 2.2 Những gì phải DỰNG MỚI

Chín bảng `ttc_*` (một migration, một file gỡ), bảy hàm quyền, hai hàm cờ
«đã điền», RPC Kanban học viên, hàm nhân bản chương trình mẫu, trigger «người
tạo là quản trị», hai trigger thông báo, hai hàm cron, lớp logic thuần
`src/lib/trainingCenter.ts` (có kiểm thử), lớp dữ liệu `useTrainingCenter.ts`,
màn danh mục, màn quản trị (tạo · nhân bản · thành viên · ngày · đầu việc) và
năm màn của từng chương trình.

**Nhiều học viên một chương trình** (hội nhập 30 ngày): tiến độ, điểm Bloom,
việc gối đầu, tự soi đều theo từng học viên; người hướng dẫn/BGĐ chọn học viên
đang xem ở đầu trang, tham số `?hv=` giữ lựa chọn khi chuyển màn.

### 2.3 Những gì đặc tả nêu nhưng ĐỂ LẠI giai đoạn sau (có chủ ý)

| Hạng mục | Giai đoạn | Lý do để lại |
| --- | --- | --- |
| Thư viện 18 biểu mẫu, tải ảnh phiếu viết tay | 2 | Đặt trong kho tư liệu chung của cổng (Sharing) theo đúng đặc tả Mục VIII; cần thống nhất nhãn theo chương trình trước |
| Phiếu cảm nhận ẩn danh của cán bộ (`staff_feedback`) | 2 | Chỉ dùng ở Ngày 7–8; giai đoạn 1 thu bằng phiếu giấy như tài liệu 00 đang quy định |
| Ghi nhận có mặt bằng định vị | 3 | Đặc tả yêu cầu lấy toạ độ thật tại cổng chi nhánh trước; cột toạ độ và bán kính đã có sẵn trên `ttc_chuong_trinh` |
| Web Push riêng | — | Không cần: tin đi qua `ct2_thong_bao` nên push đã có sẵn cho ai đã bật |

---

## 3. Phân quyền

### 3.1 Bốn vai và người được gán cho chương trình 10 ngày (mục đầu tiên của danh mục)

| Vai | Người | Được làm | Không được làm |
| --- | --- | --- | --- |
| `bgd` — Ban Giám đốc | Giám đốc Trần Đức Anh | Xem toàn bộ; chấm Bloom; **công bố** điểm; **nghiệm thu** ba việc gối đầu | Đọc tự soi / tự suy ngẫm; sửa nội dung việc gối đầu |
| `huong_dan` — Người hướng dẫn | PGĐ Nguyễn Đức Thái Hoàng | Xem tiến độ; chấm Bloom (phiếu riêng, độc lập) | Công bố điểm; nghiệm thu; đọc tự soi |
| `hoc_vien` — Học viên | Trưởng phòng Đỗ Việt Anh | Tích đầu việc; lập ba việc gối đầu; điền tự soi, tự suy ngẫm; xem điểm **sau khi công bố** | Sửa lịch; xem phiếu chấm trước công bố; tự nghiệm thu |
| `quan_tri` — Quản trị chương trình | Vũ Thị Thu Hà, Phòng TCTH | Sửa chương trình, ngày, đầu việc; thêm bớt thành viên; xem điểm để tổng hợp | Chấm điểm; đọc tự soi; sửa nội dung học viên đã nộp |

Thành viên được nạp **theo họ tên** trong `profiles` lúc áp migration (cùng cách
với đợt Dấu ấn BHY Mark). Tên nào chưa có hồ sơ thì bỏ qua — Phòng TCTH thêm ở
màn Quản trị chương trình. Người tạo một chương trình tự thành `quan_tri` của
nó (trigger). `system_admin` xem được như quản trị để bảo trì kỹ thuật, nhưng
**vẫn không đọc được** tự soi và tự suy ngẫm.

Ba chương trình dự kiến của ba nhóm còn lại được nạp ở trạng thái **Chuẩn bị**,
chưa có ngày và thành viên — để danh mục phản ánh đủ bốn nhóm ngay từ đầu và
TCTH có chỗ điền nội dung.

### 3.2 Ma trận đọc/ghi từng bảng (RLS)

| Bảng | Đọc | Ghi |
| --- | --- | --- |
| `ttc_chuong_trinh` | **mọi cán bộ** (danh mục) | tạo: system_admin/tcth_admin (tự thành quan_tri) · sửa: quan_tri · nhân bản: tcth_admin/system_admin |
| `ttc_thanh_vien` | thành viên | quan_tri |
| `ttc_ngay`, `ttc_dau_viec` | thành viên | quan_tri |
| `ttc_tien_do` | thành viên | chính học viên |
| `ttc_diem_bloom` | huong_dan, bgd, quan_tri; học viên chỉ khi `cong_bo` | chấm: huong_dan/bgd (phiếu của mình) · công bố: bgd |
| `ttc_tu_soi`, `ttc_suy_ngam` | **chỉ chính học viên** | chỉ chính học viên |
| `ttc_viec_goi_dau` | thành viên | nội dung: học viên · nghiệm thu: bgd (trigger chặn chéo) |

Điều hướng: thư mục Training Center có hai mục — «Danh mục chương trình» hiện
với mọi cán bộ (không gác bằng `minRole` vì vai nằm ở bảng riêng) và «Quản trị
chương trình (TCTH)» gác `minRole: admin`. Màn của từng chương trình mang id
trên đường dẫn nên không có mục menu riêng, tô sáng mục danh mục qua
`extraPaths`. Khách đối tác không có màn nào trong danh mục màn hình khách nên
đóng hoàn toàn (fail-closed như mọi route `/one` khác).

---

## 4. Luồng «3 việc lựa chọn với cán bộ»

```
Ngày 7–8 · Học viên lập phiếu WHY–WHAT–OWNER–STANDARD–DEADLINE–CHECKPOINT
        │   (Bảng việc › Việc gối đầu 1/2/3)
        ▼
Chiêu thức 2 · Học viên (Trưởng phòng) ghi việc trên bảng Phòng KHDN,
        │   người chịu trách nhiệm = CÁN BỘ được giao → cán bộ ghi nhịp PDCA như mọi thẻ
        ▼
Bảng việc › chọn thẻ vừa ghi làm «thẻ trên Chiêu thức 2» (ttc_viec_goi_dau.dau_viec_id)
        │
        ▼
Trang chủ Training Center › Kanban hàng ngày đọc thẻ thật qua RPC ttc_kanban_hoc_vien():
        │   thẻ do học viên chịu trách nhiệm + ba thẻ gối đầu (huy hiệu ①②③), gấp về 3 cột
        ▼
Ban Giám đốc nghiệm thu ngay trên phiếu gối đầu khi đủ sáu trường 5W2H
```

Nút «In báo cáo kết quả» trên Bảng việc in trang hiện tại thành một trang báo
cáo kết quả chỉ đạo và kèm cặp (tiêu chí nghiệm thu cuối của giai đoạn 1).

---

## 5. Bốn mốc thông báo — cân nhắc theo quy ước cổng

Quy ước cổng (CLAUDE.md §5): thêm loại tin mới là quyết định nghiệp vụ, mặc định
gộp vào tin đã có. Đặc tả Mục V đặt bốn mốc thành **ràng buộc thiết kế** và
Giám đốc đã duyệt, nên bốn mã sự kiện mới được thêm, đi qua đúng hàng đợi chung:

| Mã | Kích hoạt | Người nhận | Cơ chế |
| --- | --- | --- | --- |
| `TTC_DU_NGAY` | học viên tích đủ đầu việc trong ngày | bgd, huong_dan | trigger trên `ttc_tien_do` |
| `TTC_SAP_TRINH_BAY` | 15:10 ngày làm việc có phiên trình bày | bgd, huong_dan, hoc_vien | cron `ttc-nhac-sap-trinh-bay` |
| `TTC_CON_VIEC` | 17:00 còn đầu việc chưa tích | bgd, huong_dan | cron `ttc-nhac-con-viec` |
| `TTC_CUNG_CO` | một thang Bloom < 60% điểm tối đa | bgd | trigger trên `ttc_diem_bloom` |

Hình thức theo chuẩn push 09/08 (tiêu đề ngắn mang con số; thân tin mỗi dòng
một nhãn `Học viên:` / `Ngày:` / `Nội dung:`). Bấm vào tin mở thẳng Lộ trình;
luật đường dẫn ghi ở cả `duongDanThongBao` (client) lẫn `notify-ct2` (server)
— **cần deploy lại `notify-ct2`** để push mang nhãn `[Training Center]` và mở
đúng chỗ. Cùng một tin trong 24 giờ chỉ sinh một lần (chống trùng khi ghi
nhiều dòng một lệnh hoặc cron chạy lặp).

---

## 6. Kết quả chạy thử migration trên Postgres cục bộ

Dựng khung giả lập (`profiles`, `ct2_dau_viec`, `ct2_dat_thong_bao`, các hàm
quyền) rồi áp migration và kịch bản kiểm 11 bước:

- Nạp 4 chương trình (1 đang chạy làm mẫu + 3 dự kiến), 10 ngày, 102 đầu việc, 4 thành viên đúng vai.
- Người ngoài chương trình: thấy 4 mục danh mục, 0 ngày, 0 thành viên (RLS).
- TCTH tạo chương trình → tự là quản trị; nhân bản mẫu sang 05/10 → 10 ngày, 102 đầu việc, lịch 05→16/10; người thường nhân bản bị chặn.
- Học viên tích đủ Ngày 2 → đúng 2 tin `TTC_DU_NGAY` tới GĐ và PGĐ.
- Giám đốc, TCTH đọc thẳng `ttc_tu_soi`/`ttc_suy_ngam`: 0 dòng; hàm cờ: «đợt 1, 8/8 tiêu chí».
- PGĐ chấm Bloom có thang 9/20 → 1 tin `TTC_CUNG_CO` tới Giám đốc; học viên thấy 0 phiếu trước công bố, thấy điểm 66 sau công bố.
- Việc gối đầu: RPC trả 2 thẻ (thẻ cán bộ được giao + thẻ riêng học viên); học viên tự nghiệm thu bị chặn; Giám đốc sửa nội dung bị chặn; nghiệm thu ghi đúng người và mốc.
- Cron 15:10 gửi 1 tin/người, 17:00 gửi 1 tin còn 9 đầu việc.
- File gỡ chạy sạch, không còn bảng `ttc_*`.

Tải Ban Giám đốc theo lịch đã nạp (phút/ngày, GĐ · PGĐ): ngày 1: 240 · 115;
ngày 2: 60 · 60; ngày 3: 30 · 60; ngày 4: 30 · 70; ngày 5: 30 · 60; ngày 6:
30 · 70; ngày 7: 60 · 90; ngày 8: 30 · 100; ngày 9: 60 · 60; ngày 10: 160 · 135.
Bốn ngày (4, 6, 7, 8) PGĐ vượt trần 60 phút vì tài liệu Bản 4.0 xếp PGĐ vừa
nghe giải trình bài tập vừa quan sát hai phiên tương tác cán bộ. Màn Lịch Ban
Giám đốc **tô cảnh báo chứ không cắt** — đây là thông tin để Giám đốc quyết
định phân vai lại, không phải lỗi dữ liệu.

---

## 7. Việc còn lại trước 07/09 và sau đó

1. ~~Áp migration~~ **Đã áp** 06/09/2026 qua ba đợt (bảng + RLS · Kanban +
   thông báo + cron · seed); 4 dòng `ttc_thanh_vien` khớp đúng người, checksum
   102 đầu việc trùng bản chạy thử cục bộ.
2. **Deploy lại `notify-ct2`** để push của bốn mốc mở đúng Lộ trình.
3. Đứng tại cổng chi nhánh lấy toạ độ thật, cập nhật `vi_do`/`kinh_do` (chỉ
   cần khi bật ghi nhận có mặt ở giai đoạn 3).
4. Ngày 5: học viên chuyển 30 việc lên Chiêu thức 2 — Kanban hàng ngày trên
   Training Center tự có dữ liệu; Ngày 7–8 lập ba việc gối đầu và liên kết thẻ.
5. Phòng TCTH điền nội dung ba chương trình dự kiến (hoặc nhân bản từ mẫu) ở
   màn Quản trị chương trình. Còn lại giai đoạn 2–3: thư viện biểu mẫu, phiếu
   cảm nhận ẩn danh, ghi nhận có mặt bằng định vị.

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

---

## 8. Phiếu giao việc bảy ô + BGĐ sửa nội dung (bản mô tả yêu cầu sửa 06/09)

### 8.1 Rà soát trước khi sửa (Mục 4 bản mô tả)

| Câu hỏi | Kết quả rà soát |
| --- | --- |
| Phiếu nằm ở đâu | Thẻ «Việc gối đầu» trong `TtcBangViec.tsx` (Bảng việc của chương trình), 3 thẻ ngang, nhãn WHY / WHAT / OWNER / STANDARD / DEADLINE / CHECKPOINT |
| Dữ liệu lưu ở đâu | Bảng `ttc_viec_goi_dau` (một dòng = một việc gối đầu, cột `tieu_chuan`/`han`/`moc_kiem_tra`/`nghiem_thu`) |
| Có phiếu thật chưa | **0 phiếu**, 0 tiến độ, 0 điểm, 0 tự soi tại thời điểm rà (06/09) → Mục 12 (chuyển dữ liệu cũ) **không cần**, chỉ giữ câu lệnh chuyển tự động phòng khi có |
| Chuỗi tiếng Anh ở đâu | `TtcBangViec.tsx` (nhãn ô, câu «Học viên lập theo phiếu WHY – WHAT …»), chú thích trong `trainingCenter.ts`, chữ đầu việc Ngày 7 trong seed, tài liệu |

### 8.2 Những gì đã sửa

- **Máy chủ** — migration `20261009090000_ttc_phieu_giao_viec_bay_o.sql` (**đã
  áp** 06/09/2026 vào `whlysprzsguehxmrjwha`, tên `ttc_phieu_giao_viec_bay_o`;
  kiểm sau khi áp: 13 cột mới · 2 trigger · 3 policy đổi · 0 chuỗi tiếng Anh
  trong seed · chữ Ngày 1/2/7/8 đã đổi). Không đổi tên cột cũ; thêm đúng các
  cột Mục 5 (`dat_chuan[]`, `han_nop` có giờ, `diem_kiem` jsonb, `muc_giao`,
  `goi_y_cach_lam`, `nguon_luc`, `khoa_chuan`, `lich_su_chuan`, `trang_thai`,
  `nghiem_thu_ket_qua`, `so_lan_nghiem_thu`, `hoi_lai_giua_chung`,
  `muc_giao_cuoi_ky`). Trigger giữ luật ở tầng dữ liệu để giao diện không lách
  được: giao thiếu ô bị chặn kèm danh sách ô thiếu; khoá chuẩn một chiều; sửa
  chuẩn sau khoá bắt buộc một dòng lịch sử với lý do ≥ 20 ký tự; chỉ BGĐ nghiệm
  thu, nhận xét ≥ 30 ký tự, tự đếm số lần, Đạt → Hoàn thành, Chưa đạt → Đang
  làm; thẻ Hoàn thành không kéo lại. Cột cũ `tieu_chuan`/`han`/`moc_kiem_tra`
  được trigger tự đồng bộ từ cột mới nên báo cáo cũ vẫn đọc được.
- **Giao diện** — `TtcPhieuGiaoViec.tsx`: một cột dọc bảy ô tiếng Việt, mỗi ô
  có gợi ý dưới nhãn; kiểm tra khi lưu (Mục 7) trùng từng chữ bản mô tả; hạn
  nộp có giờ, điểm kiểm tự gợi ý ở 60 % quãng; hai ô tuỳ chọn gấp lại; nút
  «Giao việc» / «Lưu nháp» / «Điều chỉnh chuẩn» / «Nghiệm thu» / «Mở lại nghiệm
  thu» cao ≥ 44 px. Kanban: thẻ ①②③ đi theo trạng thái riêng của phiếu, dòng
  điểm kiểm trên mặt thẻ; thẻ Chiêu thức 2 đã liên kết nằm trong thẻ phiếu,
  không hiện hai lần.
- **BGĐ sửa nội dung chương trình** — hàm `ttc_sua_duoc_noi_dung(ct)` = vai
  `quan_tri` hoặc `bgd` trong chương trình, hoặc `system_admin`; ba policy ghi
  của `ttc_chuong_trinh` / `ttc_ngay` / `ttc_dau_viec` chuyển sang hàm này.
  Tạo mới, nhân bản, xếp thành viên **vẫn** của TCTH (policy không đổi). Trên
  giao diện: màn Quản trị mở cho TCTH và BGĐ của chương trình; trong chương
  trình có nút «Sửa nội dung chương trình» mở thẳng đúng mục (`?ct=`).

### 8.3 Đối chiếu danh sách nghiệm thu (Mục 14)

| # | Tiêu chí | Cách kiểm |
| --- | --- | --- |
| 1 | Bảy ô tiếng Việt, đúng thứ tự | `TTC_O_PHIEU` trong `src/lib/trainingCenter.ts`; test `phieuGiaoViec.test.ts` |
| 2 | Chặn đúng 7 quy tắc Mục 7 | 15 test đơn vị + kịch bản A–H trên Postgres cục bộ |
| 3 | Khoá chuẩn khi giao, điều chỉnh có lý do và lịch sử | trigger `f_ttc_goi_dau_truoc_sua` mục 2–3 |
| 4 | Nghiệm thu chỉ Đạt / Chưa đạt, đếm số lần, so mức giao | trigger mục 4; hộp thoại Nghiệm thu |
| 5 | Chuyển cột đúng luật | `chuyenCotPhieu` (client) trùng câu báo với trigger mục 5 |
| 6 | Không còn chuỗi tiếng Anh | `grep` mã nguồn + `SELECT` seed = 0 |
| 7 | Một cột, điền được trên điện thoại | `TtcBangViec` bọc `max-w-3xl`, không `grid-cols` |
| 8 | Không thêm cột ngoài Mục 5, không thêm loại push | migration chỉ có 13 cột Mục 5; `TTC_MA_SU_KIEN` giữ 4 mã |

---

## 9. Sửa lộ trình tại chỗ · nộp tệp đính kèm · nhắc trước giờ (yêu cầu 06/09, đợt 3)

Migration `20261010090000_ttc_lo_trinh_nop_tep_va_nhac.sql` — **đã áp** 06/09/2026
vào `whlysprzsguehxmrjwha` (tên `ttc_lo_trinh_nop_tep_va_nhac`). Kiểm sau khi áp:
bucket `bhy-training` riêng tư 20 MB · 3 policy Storage · trigger
`ttc_tien_do_truoc_ghi` · cron `ttc-nhac-theo-lich` (`*/5 0-11 * * 1-5`) · cấu hình
nhắc của chương trình 10 ngày đã nạp (30′ trước ngày, 15′ trước hết phần; người
nhận: Trần Đức Anh · Nguyễn Đức Thái Hoàng · Đỗ Việt Anh) · 23/24 đầu việc «nộp
lên Training Center» đã bật nộp tệp (trừ đầu việc có sản phẩm nằm sẵn trên Bảng
việc). File gỡ cùng tên trong `supabase/rollbacks/`; kịch bản A–H chạy thử trên
Postgres cục bộ (chặn tính năng lạ, PGĐ không sửa được, tích chưa nộp bị chặn,
policy kho tệp, cửa sổ 5 phút không gửi lặp, tắt là im, nhân bản bỏ người nhận,
gỡ sạch).

### 9.1 Sửa lộ trình chi tiết ngay trên màn Lộ trình

Quyền dùng lại `ttc_sua_duoc_noi_dung` (quản trị hoặc BGĐ của chương trình,
system_admin) — không mở thêm quyền nào. Trên Lộ trình: ô «+ Thêm ngày» cuối dải
ngày, nút «Sửa ngày» / «Thêm đầu việc» / thùng rác ở đầu ngày, bút sửa và thùng
rác trên từng dòng đầu việc. Hai hộp thoại soạn ngày và đầu việc tách ra
`TtcFormLoTrinh.tsx` để màn Quản trị và màn Lộ trình dùng chung một form.

### 9.2 Tính năng của từng đầu việc

Cột `ttc_dau_viec.tinh_nang text[]` ⊂ {NOP_TEP, GHI_CHU, DUONG_DAN}. Bật thì học
viên nộp ngay trên dòng đầu việc; **chưa nộp thì chưa tích hoàn thành được** —
trigger chặn với đúng câu «Đầu việc này yêu cầu nộp trước khi tích hoàn thành.
Còn thiếu: …», giao diện dùng cùng câu (`thieuDeTich`). Tệp nộp lưu ở bucket
riêng `bhy-training` (không dùng `bhy-one` vì bucket đó mọi cán bộ đọc được mọi
object), đường dẫn `<chương trình>/<user>/<đầu việc>/<uuid>.<đuôi>`: thư mục cấp 1
gác đọc theo thành viên chương trình, cấp 2 gác ghi/xoá theo chủ tệp. Người khác
trong chương trình mở tệp qua signed URL 1 giờ.

### 9.3 Nhắc trước giờ — «báo cho ai trong lần đào tạo này»

Cột `ttc_chuong_trinh.nhac` jsonb: `truoc_ngay` và `truoc_het_phan`, mỗi mốc
`{bat, phut, nguoi[]}`. Người nhận chọn **đích danh** trong danh sách thành viên
(không theo vai) — đúng cách Giám đốc mô tả: mỗi đợt một bộ người. Hàm
`ttc_nhac_theo_lich()` chạy mỗi 5 phút trong giờ làm việc; mốc = giờ đầu việc
sớm nhất − phút (ngày) hoặc giờ kết thúc muộn nhất của phần − phút (phần); gửi ở
tick đầu tiên rơi vào cửa sổ 5 phút nên không lặp. Hai mã tin mới
`TTC_SAP_BAT_DAU_NGAY` (tiêu đề ngày, giờ bắt đầu, văn bản, **Kiểm tra lại:**
phần chuẩn bị tối hôm trước) và `TTC_SAP_HET_PHAN` (phần, giờ kết thúc, đầu ra
phải nộp, **Chưa tích: học viên · n/m**). Đây là quyết định nghiệp vụ của Giám
đốc; bốn mốc cũ giữ nguyên. Tin đi qua `ct2_dat_thong_bao` nên vẫn im ngoài giờ
và tôn trọng trần tin nhẹ/ngày. Push mở về `/one/training-center/lo-trinh` —
trang mới tự chuyển sang Lộ trình của chương trình đang chạy của người đọc
(trước đây đường dẫn này chưa có route).

---

## 10. Điểm danh học viên — hai luồng (yêu cầu 06/09, đợt 4)

Migration `20261011090000_ttc_diem_danh.sql` — **đã áp** 06/09/2026 vào
`whlysprzsguehxmrjwha` (tên `ttc_diem_danh`). Kiểm sau khi áp: 2 bảng có RLS ·
3 policy · 7 hàm · cấu hình đã bật cho chương trình 10 ngày (hai luồng, muộn sau
15 phút, bán kính 250 m). File gỡ cùng tên trong `supabase/rollbacks/`; kịch bản
A–G chạy thử trên Postgres cục bộ.

### 10.1 Luồng 1 — điện thoại và định vị

Thẻ «Điểm danh Ngày N» nằm đầu màn Lộ trình, **chỉ hiện đúng ngày học hôm nay**.
Học viên bấm, trình duyệt xin quyền vị trí, toạ độ thô gửi lên RPC
`ttc_diem_danh_dinh_vi`. **Máy chủ** tính khoảng cách (Haversine, hàm
`ttc_khoang_cach_m`) và so với bán kính của chương trình — trình duyệt không có
đường nào ghi thẳng vào bảng, vì toạ độ do trình duyệt gửi thì ai cũng sửa được
trước khi gửi. Ngoài vùng thì câu báo nói rõ đang cách bao nhiêu mét và phạm vi
cho phép là bao nhiêu.

Toạ độ phòng học đặt ở màn Quản trị chương trình bằng nút **«Lấy toạ độ tại
đây»**: người của TCTH đứng giữa phòng học bấm một lần. Bán kính khuyến nghị
100–150 m cho một toà nhà; toạ độ đang dùng vẫn là toạ độ tạm tính khu vực
Phường Mỹ Hào nên bán kính tạm để 250 m.

### 10.2 Luồng 2 — quét tấm QR của ngày

`ttc_qr_ngay` giữ mã của từng ngày (16 ký tự ngẫu nhiên từ `gen_random_bytes`).
Mã **gắn với một ngày**: quét mã của ngày khác thì bị chặn kèm ngày của tấm QR.
Cấp lại mã (`ttc_cap_ma_qr(_ngay, true)`) làm mã cũ vô hiệu ngay — dùng khi tấm
in cũ bị chụp lan ra ngoài. Học viên không đọc được bảng mã (RLS chỉ mở cho
quản trị/BGĐ); họ quét ảnh, trình duyệt mở
`/one/training-center/diem-danh?ma=…`, trang tự gọi RPC một lần. Toạ độ gửi kèm
nếu máy cho phép — không có cũng ghi được, chỉ là BGĐ không có gì đối chiếu khi
nghi ngờ tấm QR bị chụp gửi ra ngoài.

**Tấm in** (`TtcTamQr.tsx`) dựng bằng thư viện `qrcode` (nạp tại chỗ khi mở hộp
thoại) và xuất bằng html2canvas: nút **Tải ảnh PNG** và **Bản in A5** (jsPDF,
có `autoPrint`). Màu trên tấm in viết thẳng bằng mã hex chứ không dùng biến CSS
theo chủ đề sáng/tối của cổng — html2canvas chụp màu đã tính của trình duyệt,
để biến thì tấm in ra khác nhau tuỳ máy người bấm. Mã QR đen tuyền trên nền
trắng vì máy in Chi nhánh in đen trắng. Nội dung tấm: tên trung tâm, tên chương
trình, **NGÀY 0N** cỡ lớn, thứ và ngày tháng, tiêu đề buổi, mã QR 280 px, ba
dòng hướng dẫn quét, một **châm ngôn EQ** (`CHAM_NGON_EQ`, 10 câu quay vòng theo
số thứ tự ngày — câu do Chi nhánh soạn, **không gán tên tác giả** để không in ra
một trích dẫn sai rồi treo trong phòng học mười ngày), chân trang ghi ngày in và
bốn ký tự cuối của mã để đối chiếu tấm nào mới nhất.

### 10.3 Theo dõi và ghi hộ

Khối «Điểm danh» ở màn Quản trị chương trình: cấu hình · danh sách tấm QR theo
ngày · bảng theo dõi từng ngày (có mặt / muộn mấy phút / vắng, kèm khoảng cách
đã ghi). Học viên quên điện thoại thì TCTH **ghi hộ** — bắt buộc lý do ≥ 10 ký
tự, lưu cả người ghi; dòng ghi hộ mang luồng `BO_SUNG` và không tính muộn. Sửa
một dòng điểm danh thì không có đường nào: muốn đổi phải xoá rồi ghi lại, để
không ai lặng lẽ sửa giờ điểm danh của người khác.

### 10.4 Phần cố ý KHÔNG làm

- **Không thêm loại push mới.** Quy ước của repo: thêm một loại tin là quyết
  định nghiệp vụ. Cán bộ đã nhận 21+ loại push và chỉ 27/100 người bật push;
  một tin «chưa điểm danh» nữa sẽ làm hỏng cả các tin cần hành động.
- **Không chặn quét QR khi thiếu định vị.** Tấm QR do PGĐ mở trong phòng vốn đã
  là bằng chứng có mặt; bắt thêm định vị chỉ làm học viên tắc ở cửa lớp.
- **Không nhận diện khuôn mặt, không ảnh chụp.** Ngoài phạm vi yêu cầu và kéo
  theo cả một tầng dữ liệu nhạy cảm mới.

---

## 11. Thẩm định định vị trước khi mở luồng (yêu cầu 06/09, đợt 5)

Yêu cầu của Giám đốc: «một số lớp sẽ chỉ mở QR; sau khi test định vị chính xác
mới mở phần định vị diện rộng». Migration
`20261012090000_ttc_tham_dinh_dinh_vi.sql` — **đã áp** 06/09/2026 vào
`whlysprzsguehxmrjwha` (tên `ttc_tham_dinh_dinh_vi`). Kiểm sau khi áp: bảng
`ttc_thu_dinh_vi` có RLS · 2 policy · trigger `ttc_chuong_trinh_truoc_sua` ·
4 hàm · lớp 10 ngày đã tự về **chỉ QR**. Kịch bản A–G chạy thử trên Postgres cục
bộ (chặn bật khi chưa thẩm định, người ngoài chương trình không thử được, hai
lần chưa đủ, lần thứ ba mới đạt, thu bán kính thì mất hiệu lực, RLS, gỡ sạch).

### 11.1 Ba mức của một lớp

| Mức | Luồng | Ai đặt |
| --- | --- | --- |
| Mặc định lớp mới | Chưa bật điểm danh | — |
| Bật, chưa thẩm định | Chỉ **QR** | TCTH / BGĐ tích một ô |
| Bật, đã thẩm định | **QR + định vị** | Mở được sau khi đo thử đạt |

`TTC_DIEM_DANH_MAC_DINH()` đổi từ `['DINH_VI','QR']` thành `['QR']`: mặc định mở
sẵn cả hai thì lớp nào quên rà lại là chạy thật bằng một toạ độ chưa ai đo.

### 11.2 Đo thử — RPC `ttc_thu_dinh_vi`

Nút «Thử tại chỗ này» trong khối Điểm danh của màn Quản trị. Mỗi lần bấm: lấy
toạ độ máy, máy chủ tính khoảng cách tới toạ độ phòng học, **ghi vào
`ttc_thu_dinh_vi` chứ không ghi điểm danh**, trả về khoảng cách + sai số + đã
thẩm định xong chưa. Có ô «Chỗ đứng khi thử» để ghi «giữa phòng · cuối phòng ·
cửa ra vào» — ba lần đo ở ba chỗ mới nói được điều gì về cả phòng. Thành viên
chương trình đều thử được (để PGĐ cầm máy đi quanh phòng đo hộ), riêng xoá lần
thử là của quản trị/BGĐ.

Bảng **lưu khoảng cách thô, không lưu kết luận đạt/không**: bán kính còn được
chỉnh, lưu con số thô thì đổi bán kính là các lần đo cũ tự được xét lại.

### 11.3 Cổng chặn — ở tầng dữ liệu

`ttc_dinh_vi_da_tham_dinh(_ct, _ban_kinh)`: **ba lần đo gần nhất** đều ≤ bán
kính. Trigger `f_ttc_chuong_trinh_truoc_sua` chặn mọi UPDATE bật luồng định vị
khi chưa đạt, kể cả UPDATE thẳng vào bảng. Giao diện làm mờ ô tích là lớp trải
nghiệm; hàng rào thật là trigger — vì mở nhầm luồng định vị cho một lớp có toạ
độ sai thì người phát hiện ra là học viên đang đứng ở cửa phòng lúc 7h30.

Chỉ xét **ba lần gần nhất** chứ không xét cả lịch sử: đổi phòng học thì các lần
đo cũ nói về một chỗ khác. Thu bán kính xuống dưới khoảng cách đã đo cũng làm
mất hiệu lực — phải đo lại, đúng như khi đổi phòng.

### 11.4 Bán kính đề xuất

`ketLuanThuDinhVi` tính: **chỗ xa nhất + sai số máy báo lớn nhất**, làm tròn lên
bội 50, kẹp trong 50–2000 m (đúng khoảng CHECK của cột `ban_kinh_m`). Nút «Dùng
bán kính đề xuất N m» điền thẳng vào ô. Đây là con số có căn cứ đo được, thay cho
việc đoán 100 hay 150 m.

### 11.5 Rà trước khi nhân rộng

Danh sách chương trình ở màn Quản trị hiện thêm dòng «Điểm danh: Chưa bật / QR /
Định vị + QR» cho từng lớp, để nhìn một lượt biết lớp nào đã mở gì trước khi
quyết định mở diện rộng.

---

## 12. Đợt 6 — Thay toàn bộ lộ trình 10 ngày và xếp lại vào giờ làm việc thật

### 12.1 Vì sao phải thay chứ không sửa từng chỗ

Khảo sát trước khi làm phát hiện **hai bản lộ trình khác nhau** đang tồn tại
song song: bản trong nguyên mẫu HTML mà Giám đốc gửi, và bản đang nằm trong
`ttc_dau_viec` trên production. Đối chiếu đủ mười ngày cho thấy bản nguyên mẫu
mới là bản khớp với bảng Mục 3.2 của đặc tả; bản trong database là bản Giám đốc
đã sửa tay trước đó và đã lệch đi.

Không đi sửa từng đầu việc vì hai lý do. Một: lệch ở cả tên, nội dung, người phụ
trách lẫn khung giờ — sửa từng cột thì diff không ai rà nổi, mà bỏ sót một dòng
là học viên nhìn thấy lịch sai. Hai: **production chưa có dữ liệu phái sinh nào**
— 0 tiến độ, 0 điểm Bloom, 0 điểm danh, 0 phiếu tự soi, 0 phiếu giao việc, 0 mã
QR — nên xoá và ghi lại không làm mất gì của ai. Đã kiểm đếm từng bảng trước khi
chạy DELETE, không suy đoán.

### 12.2 Khung giờ mới

Bản cũ có ngày bắt đầu **07:30** và có buổi sáng chạy quá 11:30. Giám đốc chốt
lại khung theo giờ làm việc thật của Chi nhánh:

| Buổi | Bắt đầu | Kết thúc |
| --- | --- | --- |
| Sáng | 08:00 | 11:30 |
| Chiều | 13:30 | tối đa 18:00 |

Kết quả sau khi xếp lại (đã đối chiếu trên production):

| Ngày | Đầu việc | Sáng | Chiều | Ngoài giờ |
| --- | --- | --- | --- | --- |
| 1 | 12 | 08:00–11:30 | 13:30–17:20 | pickleball 18:00–19:30 |
| 2 | 11 | 08:00–11:30 | 13:30–17:00 | — |
| 3 | 12 | 08:00–11:30 | 13:30–17:00 | — |
| 4 | 13 | 08:00–11:30 | 13:30–17:15 | — |
| 5 | 13 | 08:00–11:30 | 13:30–17:00 | pickleball 18:00–19:30 |
| 6 | 13 | 08:00–11:30 | 13:30–17:45 | pickleball 18:00–19:30 |
| 7 | 12 | 08:00–11:30 | 13:30–17:25 | — |
| 8 | 12 | 08:00–11:30 | 13:30–17:15 | — |
| 9 | 12 | 08:00–11:30 | 13:30–17:25 | — |
| 10 | 12 | 08:00–11:30 | 13:30–17:40 | pickleball 18:00–19:30 |

Tổng **122 đầu việc**, không đầu việc nào chồng lấn nhau, không đầu việc nào có
giờ kết thúc trước giờ bắt đầu.

### 12.3 Rút 30 phút thừa buổi sáng — rút theo tỷ lệ, không cắt một khối

Bản nguyên mẫu có buổi sáng dài 4 giờ, khung mới chỉ còn 3 giờ 30 phút. Ba mươi
phút thừa được rút khỏi **ba khối học viên tự làm** (đọc văn bản · phiếu Bloom ·
dựng slide) chứ không đụng vào các khối có Ban Giám đốc chủ trì — vì các khối đó
đã hẹn giờ với người thật.

Cách rút đầu tiên là «cắt khối dài nhất», và nó hỏng: toàn bộ 30 phút rơi vào
khối Đọc văn bản (80 → 50 phút), làm mất hẳn lượt đọc sâu. Cách thứ hai vẫn hỏng
vì công thức chia tỷ lệ dùng biến `thua` đã bị trừ dần trong vòng lặp, nên vòng
đầu ăn gần hết. Bản cuối chụp lại `thuaGoc` **trước** vòng lặp rồi mới chia tỷ
lệ: Đọc −20 · Bloom −5 · Slide −5. Ghi lại ở đây vì cùng một lỗi rất dễ lặp lại
khi sau này chèn thêm đầu việc vào buổi sáng.

### 12.4 Migration và đường lùi

`supabase/migrations/20261013090000_ttc_lo_trinh_ban_moi.sql` **đã áp** vào
`whlysprzsguehxmrjwha` ngày 06/09/2026, chia làm bốn lần áp vì file 52 KB vượt
giới hạn một lần gửi:

| Tên migration trên Supabase | Nội dung |
| --- | --- |
| `ttc_lo_trinh_ban_moi_1_ngay` | Bảng chụp + DELETE đầu việc cũ + UPDATE 10 ngày |
| `ttc_lo_trinh_ban_moi_2_dau_viec_1_4` | 48 đầu việc ngày 1–4 |
| `ttc_lo_trinh_ban_moi_3_dau_viec_5_7` | 38 đầu việc ngày 5–7 |
| `ttc_lo_trinh_ban_moi_4_dau_viec_8_10` | 36 đầu việc ngày 8–10 |

Trước khi xoá, migration **chụp nguyên trạng** vào hai bảng
`ttc_luu_lo_trinh_20261013` và `ttc_luu_ngay_20261013`. Hai bảng chụp này vẫn là
bảng thật trong `public`, nên vẫn `ENABLE ROW LEVEL SECURITY` và `REVOKE ALL …
FROM anon, authenticated` — lịch cũ là dữ liệu nội bộ, không vì nó là bản lưu mà
được lỏng tay. File gỡ
`supabase/rollbacks/20261013090000_ttc_lo_trinh_ban_moi_down.sql` khôi phục từ
hai bảng chụp rồi tự xoá chúng.

`lat_cat` và `cau_hoi_tu_soi` của cả mười ngày **được giữ nguyên**, không nằm
trong phạm vi thay.

### 12.5 Những gì chưa làm và vì sao

- **24 đầu việc dưới 30 phút.** Mục 6 của phụ lục đặt sàn 30 phút cho mọi đầu
  việc, nhưng nguyên mẫu có nhiều mốc 10 phút có thật và cần thiết: «Nhận đề —
  TCTH mở file», «Khoá bài», «Chuẩn bị trình bày». Ép lên 30 phút thì phải kéo
  dài những việc chỉ mất 10 phút, hoặc phải bỏ chúng đi. Giữ nguyên theo nguyên
  mẫu và để lại quyết định cho Giám đốc.
- **Cột `buoi` / `thoiLuong` / `gioCoDinh` và giao diện theo buổi** (Mục 3 trở đi
  của phụ lục) chưa làm, vì còn chờ trả lời Việc 2 (quy tắc «giờ cố định») và
  Việc 3 (sàn 30 phút).
- **Lỗi hiển thị `07:30:00`** vẫn còn: cột kiểu `time` trả về `HH:MM:SS` và bốn
  chỗ đang in thẳng (`TtcLoTrinh.tsx`, `TtcLichBgd.tsx`, `TtcQuanTri.tsx`,
  `TtcTrangChu.tsx`). Đây là lỗi có sẵn, không phải do đợt này sinh ra, và sửa nó
  là một việc riêng.

---

## 13. Đợt 7 — Bỏ nhắc theo giờ, báo cả lớp khi học viên tích hoàn thành

### 13.1 Vì sao bỏ hết nhắc theo giờ

Giám đốc 06/09/2026: «lịch chi tiết thì đây là gợi ý, bây giờ push chỉ khi nào
học viên ấn nút hoàn thành thì sẽ push cho toàn bộ người có liên quan trong khóa
học».

Bốn loại tin cũ đều tính mốc từ `gio_bat_dau` / `gio_ket_thuc` của lộ trình:

| Mã tin | Kích hoạt | Người nhận |
| --- | --- | --- |
| `TTC_SAP_BAT_DAU_NGAY` | cron 5 phút, trước giờ bắt đầu ngày | người được chọn |
| `TTC_SAP_HET_PHAN` | cron 5 phút, trước giờ hết mỗi phần | người được chọn |
| `TTC_SAP_TRINH_BAY` | cron 15:10 | BGĐ, hướng dẫn, học viên |
| `TTC_CON_VIEC` | cron 17:00 | BGĐ, hướng dẫn |

Từ khi lịch chuyển sang tư duy buổi sáng – buổi chiều (mục 12), giờ trong lộ
trình chỉ còn là gợi ý sắp xếp, không phải cam kết. Nhắc theo một con số không ai
cam kết thì tin **luôn sai lúc**: học viên đang làm việc khác thì bị giục, làm
xong sớm rồi vẫn bị nhắc. Vài lần như vậy là người ta tắt push — mà chỉ 27/100
cán bộ còn bật.

Bỏ hẳn chứ không tắt bằng công tắc: để lại bốn loại tin chết mà cron vẫn chạy là
cái bẫy cho người đến sau. Ba cron (`ttc-nhac-theo-lich`, `ttc-nhac-sap-trinh-bay`,
`ttc-nhac-con-viec`) và bốn hàm tương ứng đã gỡ khỏi database.

`TTC_DU_NGAY` (đủ cả ngày mới báo BGĐ) cũng bỏ, nhưng vì lý do khác: tin mới đã
mang sẵn con số N/M nên khi N = M nó tự nói là xong đủ ngày — giữ thêm một mã nữa
là gửi hai tin cho cùng một sự việc. Còn lại **đúng hai nguồn tin**:
`TTC_HOAN_THANH` và `TTC_CUNG_CO` (Bloom dưới 60%, giữ nguyên).

### 13.2 Tin mới — ai nhận và nội dung gì

Trigger `ttc_sau_tich_tien_do` bắt đúng lần chuyển **chưa tích → đã tích** (sửa
ghi chú của ô đã tích thì không báo lại), rồi gọi `ttc_bao_hoan_thanh`.

Người nhận: **toàn bộ `ttc_thanh_vien` của chương trình**. `ct2_dat_thong_bao` tự
loại người vừa tích, nên học viên không nhận tin về việc của chính mình. Người
không phải thành viên không nhận gì, kể cả khi id nằm trong cấu hình.

Hình thức theo chuẩn push 09/08/2026:

```
Ngày 3: đã xong 4/12 đầu việc
  Học viên: Đỗ Việt Anh
  Ngày: 3 · Từ công văn đến công việc
  Việc: Xây quy trình chuẩn triển khai văn bản tại Phòng KHDN
  Nội dung: Đã hoàn thành 4/12 đầu việc của ngày.
```

Tên đầu việc dài quá 70 ký tự bị cắt: lộ trình có đầu việc tên hơn 120 ký tự, để
nguyên thì dòng «Nội dung:» mang con số bị đẩy khuất khỏi màn hình khoá.

### 13.3 Gộp tin còn đang chờ phát

Trần thông báo đã bị bỏ từ 20260914090000, nên không còn gì chặn mười hai lần
tích trong một ngày thành mười hai tin. Trong giờ làm việc đó chính là điều Giám
đốc muốn — thấy tiến độ ngay lúc nó xảy ra. Nhưng tin sinh ngoài giờ nằm chờ tới
7h00 hôm sau; học viên làm bù buổi tối mà không gộp thì cả lớp mở máy sáng hôm
sau nhận một chuỗi tin về cùng một ngày lộ trình.

Nên: còn tin `TTC_HOAN_THANH` **cùng ngày lộ trình, cùng người nhận, chưa phát**
(`gui_luc IS NULL AND phat_luc > now()`) thì **cập nhật tin đó** thay vì đặt tin
mới; dòng «Việc:» đổi thành «… và các đầu việc trước đó trong ngày», con số N/M
tự cập nhật theo.

Đây là chỗ **duy nhất** trong repo được sửa thẳng `ct2_thong_bao` thay vì đi qua
`ct2_dat_thong_bao`. Lý do: gộp là sửa một tin đã đặt hợp lệ, không phải sinh tin
mới — các luật của cửa duy nhất (hoãn ngoài giờ, không tự nhắc mình) đã được áp
lúc tin đó ra đời và vẫn giữ nguyên hiệu lực. Điều kiện `gui_luc IS NULL` bảo
đảm không bao giờ sửa một tin người ta đã nhận được.

### 13.4 Cấu hình của từng lần đào tạo

Cột `ttc_chuong_trinh.nhac` đổi khuôn:

```json
{"khi_hoan_thanh": {"bat": true, "nguoi": []}}
```

`nguoi` **rỗng nghĩa là toàn bộ thành viên** — đúng lời Giám đốc, và cũng là mặc
định khi khoá thiếu. Chỉ `bat === false` mới là tắt; thiếu khoá không được hiểu là
tắt, vì một cấu hình chưa ai đụng đến phải chạy đúng ý mặc định chứ không im
lặng. Danh sách người của hai mốc cũ **không** được mang sang: người chọn để nhận
nhắc «sắp hết phần» không phải người muốn nhận tin «đã xong một đầu việc».

Màn Quản trị: khối «Nhắc trước giờ — báo cho ai» thay bằng «Báo khi học viên hoàn
thành một đầu việc» (`TtcCauHinhBao.tsx`). Màn Lộ trình: dải nhắc theo giờ thay
bằng một dòng nói ai sẽ biết khi tích xong. Hai màn dùng chung
`moTaNguoiNhanBao()` để không nói hai kiểu về cùng một cấu hình.

### 13.5 Đã kiểm chứng

Migration `20261015090000_ttc_bao_khi_hoan_thanh.sql` **đã áp** vào
`whlysprzsguehxmrjwha` ngày 06/09/2026 (tên `ttc_bao_khi_hoan_thanh`). Kiểm sau
khi áp: 0 cron `ttc-nhac*`, 0 hàm nhắc theo giờ còn lại, hàm và trigger mới có đủ,
mọi chương trình đã về cấu hình `{"khi_hoan_thanh":{"bat":true,"nguoi":[]}}`.

Chạy trên cụm Postgres 16 cục bộ với đủ chuỗi migration `ttc_*`:

| Kịch bản | Kết quả |
| --- | --- |
| Ngoài giờ, tích 3 đầu việc liên tiếp | 3 tin — đúng 1 tin/người nhận, nội dung «3/11» |
| Trong giờ, tin trước đã phát | mỗi lần tích là một tin mới |
| Sửa ghi chú của ô đã tích | 0 tin |
| Tắt công tắc | 0 tin |
| Chọn đích danh một người | chỉ người đó nhận |
| Người ngoài khóa học | 0 tin |
| Người vừa tích | 0 tin |
| Chạy file gỡ | hai hàm nhắc cũ dựng lại, `ttc_bao_hoan_thanh` biến mất, cấu hình về khuôn cũ |

File gỡ: `supabase/rollbacks/20261015090000_ttc_bao_khi_hoan_thanh_down.sql`. Hai
hàm nhắc theo cấu hình (`ttc_ten_phan` + `ttc_nhac_theo_lich` + cron 5 phút) không
chép lại trong file gỡ — nguyên văn nằm ở mục 5 của
`20261010090000_ttc_lo_trinh_nop_tep_va_nhac.sql`, chạy lại đoạn đó nếu cần. Chép
hai hàm dài vào file gỡ chỉ tạo thêm một bản thứ hai để lệch nhau.

---

## 14. Đợt 8 — Lịch ngày gom thành buổi, giờ chỉ còn là khuyến nghị

### 14.1 Yêu cầu

Giám đốc 06/09/2026: «chia thành 2 phần trong lịch hàng ngày là buổi sáng và
buổi chiều, phần thời gian chỉ là khuyến nghị khoảng thời gian làm thôi».

Đây là bước tiếp theo tự nhiên của mục 12 và 13: lộ trình đã xếp theo khung buổi,
nhắc theo giờ đã bỏ — nhưng giao diện vẫn còn trình bày lịch như một cái hẹn theo
phút. Năm mục theo loại việc (Khởi động · Nghiên cứu văn bản · Thực hành · Trình
bày · Tự suy ngẫm) cộng hai mốc giờ cứng trên từng dòng làm học viên đọc thành
«09:00 phải xong việc này», trong khi thực tế học viên tự sắp thứ tự trong buổi.

### 14.2 Không thêm cột `buoi` vào database

Phụ lục có gợi ý thêm cột `buoi`. Không làm, vì buổi **suy thẳng được từ
`gio_bat_dau`** đã có sẵn: trước 12:00 là sáng, 12:00–17:59 là chiều, từ 18:00 là
sau giờ làm việc. Thêm một cột nữa là đẻ nơi thứ hai nói cùng một chuyện, rồi có
ngày Phòng TCTH sửa giờ mà quên sửa buổi — đúng cái bẫy mà bảng «nguồn duy nhất»
trong `CLAUDE.md` sinh ra để tránh.

Dữ liệu giờ **giữ nguyên hoàn toàn**, không xoá, không đổi. Chỉ đổi cách trình
bày. Nhờ vậy lịch Ban Giám đốc vẫn tính được tải theo phút, và nếu sau này Giám
đốc muốn quay lại hiển thị mốc giờ thì chỉ là việc của giao diện.

Bốn buổi pickleball ở 18:00–19:30 tách thành nhóm thứ ba «Sau giờ làm việc».
Nhét chúng vào buổi chiều thì khung giờ khuyến nghị của chiều kéo tới 19:30 và
cán bộ đọc thành «chiều làm tới 7 rưỡi tối» — sai hẳn ý. Nhóm này rỗng ở sáu
ngày còn lại nên không hiện ra.

### 14.3 Giờ trình bày thành khuyến nghị như thế nào

| Trước | Sau |
| --- | --- |
| 5 mục theo loại việc | 2 mục: Buổi sáng · Buổi chiều (+ Sau giờ làm việc khi có) |
| Tiêu đề mục: tên loại việc | Tiêu đề mục: tên buổi + «khuyến nghị 08:00–11:30 · 5 đầu việc, khoảng 3 giờ 30 phút» |
| Mỗi dòng: `08:00` / `08:30` | Mỗi dòng: `30` `phút` |
| Loại việc là tiêu đề nhóm | Loại việc thành nhãn nhỏ ngay trên dòng đầu việc |

Loại việc không mất đi — nó chuyển từ tiêu đề nhóm thành một nhãn trên dòng, nên
người xem vẫn biết đầu việc nào thuộc phần nào mà không phải nhớ mình đang ở mục
nào.

Không có gì bị đánh dấu trễ theo giờ: `trangThaiViec` vốn chỉ tính theo **ngày**
(chưa tới ngày → Chưa mở, tới ngày → Đang làm, tích rồi → Hoàn thành), nên không
phải sửa gì để thoả ràng buộc «không tự động đánh dấu quá hạn theo giờ».

### 14.4 Sửa luôn lỗi «08:00:00»

Cột kiểu `time` của Postgres trả về `HH:MM:SS`. Bốn chỗ đang in thẳng nên cán bộ
thấy thừa hai chữ số giây. Thêm `gioNgan()` — cắt về `HH:MM` ở đúng một chỗ — và
dùng ở lịch Ban Giám đốc, màn Quản trị, trang chủ Training Center.

Hai chỗ nữa cùng gốc lỗi, không chỉ là hiển thị:

- **Trang chủ** so `v.gio_ket_thuc > gioHienTai` với `gioHienTai` dạng `HH:MM`.
  So chuỗi `'09:00:00' > '09:00'` ra đúng, nên đầu việc kết thúc đúng phút này
  vẫn bị tính là «còn tới».
- **Form sửa đầu việc** nạp `'09:00:00'` vào ô `<input type="time">` và phép kiểm
  «giờ kết thúc phải sau giờ bắt đầu» so hai chuỗi khác dạng. Cắt ngay lúc nạp
  form là xong cả hai.

### 14.5 Đã kiểm chứng

Thuần giao diện, **không có migration** trong đợt này. 11 test mới trong
`src/lib/__tests__/loTrinhTheoBuoi.test.ts`: ranh giới ba buổi (kể cả 11:30, 17:45,
18:00), khung giờ khuyến nghị lấy giờ kết thúc **muộn nhất** chứ không phải của
đầu việc cuối danh sách, buổi rỗng không xuất hiện, thời lượng đọc thành lời
(«1 giờ» chứ không «1 giờ 0 phút»), và `gioNgan` với chuỗi rỗng hay chuỗi hỏng.

Toàn bộ: `npm run test` 1132/1132 xanh, `tsc` sạch, `npm run build` xong.

---

## 15. Đợt 9 — Hai lỗi chặn người dùng thật, và vì sao chạy thử không bắt được

Trưởng phòng KHDN báo hai việc trong cùng một buổi: tích hoàn thành thì cổng báo
lỗi, và tạo mã QR thì không ra mã. Hai lỗi này **không liên quan nhau** và cùng
lọt qua toàn bộ vòng kiểm — ghi lại kỹ vì cả hai đều thuộc loại rất dễ lặp lại.

### 15.1 Lỗi 1 — trùng tên cột giữa hai phân hệ

```
insert or update on table "ct2_thong_bao"
violates foreign key constraint "ct2_thong_bao_dau_viec_id_fkey"
```

`ct2_thong_bao.dau_viec_id` có khoá ngoại tới **`ct2_dau_viec`** — thẻ việc của
Chiêu thức 2 — chứ không phải `ttc_dau_viec`. Hàm `ttc_bao_hoan_thanh` (mục 13)
truyền id của `ttc_dau_viec` vào tham số `_dau_viec_id` của `ct2_dat_thong_bao`
vì hai cột trùng tên. Trigger chạy `AFTER INSERT` nên khoá ngoại nổ làm **huỷ cả
lệnh ghi tiến độ**: học viên không tích được ô nào.

`ct2_thong_bao` là hàng đợi **dùng chung**, nhưng cả hai cột khoá ngoại của nó
(`dau_viec_id`, `ho_so_id`) đều thuộc về Chiêu thức 2. Tin của phân hệ khác chỉ
được để `NULL` ở hai cột đó. Trùng tên cột giữa hai phân hệ không có nghĩa là
cùng một thứ.

Bỏ `dau_viec_id` kéo theo phải đổi cách gộp tin: trước đây gộp bằng cách join
`ttc_dau_viec` qua chính cột đó. Nay nhận diện tin cùng (học viên, ngày lộ trình)
bằng **hai dòng đầu của thân tin** — so bằng `left(noi_dung, n)` chứ không `LIKE`,
để khỏi phải thoát dấu `%` và `_` có thể nằm trong tên người hoặc tiêu đề ngày.
Tin vẫn mở đúng màn Lộ trình vì `notify-ct2` định tuyến theo tiền tố `TTC_` của
mã sự kiện, không theo cột này.

**Vì sao chạy thử không bắt được:** stub `ct2_thong_bao` trên cụm cục bộ khai
`dau_viec_id uuid` trần, không có khoá ngoại. Đã bổ sung ràng buộc thật vào stub,
tái hiện đúng lỗi, rồi mới sửa.

### 15.2 Lỗi 2 — pgcrypto không nằm ở schema mình tưởng

`ttc_cap_ma_qr` sinh mã bằng `gen_random_bytes(12)` của pgcrypto. Trên project
`whlysprzsguehxmrjwha`, pgcrypto cài ở schema **`extensions`**; hàm lại khai
`SET search_path = public` nên không tìm thấy hàm và ném lỗi trước khi ghi được
dòng nào. Bằng chứng: `ttc_qr_ngay` có **0 dòng** — chưa lần nào cấp được mã kể
từ khi tính năng lên hệ thống.

Sửa thành `SET search_path = public, extensions`. Giữ `public` đứng trước để hàm
vẫn chạy đúng ở nơi cài pgcrypto vào public, và để mọi bảng `ttc_*` phân giải
như cũ.

**Vì sao chạy thử không bắt được:** cụm Postgres cục bộ có
`CREATE EXTENSION pgcrypto` vào `public` — đúng chỗ lệch giữa hai môi trường.
`gen_random_uuid()` dùng khắp nơi trong repo lại là hàm dựng sẵn của Postgres 13+,
không thuộc pgcrypto, nên không có tiền lệ nào cảnh báo. Đây là **hàm duy nhất
trong repo dùng tới pgcrypto**; từ nay hàm nào dùng tới nó phải khai cả
`extensions` trong search_path.

### 15.3 Bài học chung

Cả hai lỗi đều là **lệch giữa cụm cục bộ và database thật**, không phải lỗi
logic. Chạy thử cục bộ chỉ chứng minh được logic đúng; nó không thay được việc
đối chiếu ràng buộc và schema của chính project. Với migration đụng tới bảng của
phân hệ khác hoặc tới extension, phải kiểm hai thứ trên database thật trước khi
coi là xong:

```sql
-- khoá ngoại thật của bảng mình sắp ghi vào
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid = 'public.<bảng>'::regclass AND contype = 'f';
-- extension nằm ở schema nào
SELECT e.extname, n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace;
```

Và một dấu hiệu đáng lẽ phải thấy sớm hơn: **bảng đếm ra 0 dòng** sau khi tính
năng đã lên hệ thống mấy hôm. Sau mỗi đợt, nên đếm số dòng của các bảng mà tính
năng vừa mở phải sinh ra.

### 15.4 Đã áp và đã kiểm

| Migration | Trạng thái |
| --- | --- |
| `20261016090000_sua_tin_hoan_thanh_khoa_ngoai.sql` | **đã áp** 07/09/2026 |
| `20261017090000_sua_cap_ma_qr_pgcrypto.sql` | **đã áp** 07/09/2026 |

Kiểm trên cụm cục bộ (có bổ sung khoá ngoại thật): tích hoàn thành ghi được và
sinh tin với `dau_viec_id` để trống · ngoài giờ ba lần tích vẫn gộp thành một tin
mỗi người · trong giờ mỗi lần tích một tin · tên người chứa `%` và `_` không làm
vỡ phép gộp · hai ngày lộ trình khác nhau không bị gộp làm một.

Kiểm trên database thật: ghi một dòng tiến độ trong giao dịch có `ROLLBACK` →
ghi được, sinh 4 tin, không tin nào còn `dau_viec_id`, tiêu đề đúng dạng «Ngày 1:
đã xong 1/12 đầu việc»; và `gen_random_bytes` sinh được mã 16 ký tự trong
search_path mới.

Hai file gỡ đều ghi rõ chúng khôi phục lại **bản có lỗi**, chỉ dùng để dựng lại
hiện trường.

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

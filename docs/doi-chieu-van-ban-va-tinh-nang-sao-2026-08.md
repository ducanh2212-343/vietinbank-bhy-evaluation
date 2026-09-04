# Rà soát toàn diện tính năng "Sao Xứng Đáng" đối chiếu văn bản gốc — 29/08/2026

Văn bản đối chiếu: *Thông báo triển khai chương trình ghi nhận "SAO xứng đáng" năm
2026* (CN Bắc Hưng Yên, Phòng TCTH — bản PDF trên Drive chi nhánh).

## 1. Bảng đối chiếu từng mục văn bản ↔ cổng

| Mục văn bản | Nội dung quy định | Trên cổng (trước 29/08) | Sau đợt xây dựng này |
|---|---|---|---|
| 2. Phân quyền | TP phát sao cho CB phòng mình; BGĐ phát toàn CN | Không kiểm soát (dữ liệu nhập Excel) | **Có**: form tặng đọc danh bạ qua RLS — TP chỉ thấy CB phòng mình, PGĐ theo khối, BGĐ/TCTH toàn CN |
| 3. Cấu trúc 3 vế "Cảm ơn / vì đã / đem lại" | Bắt buộc trên mỗi sao | Có ô soạn lời nhưng vế "đem lại" KHÔNG có trong dữ liệu (cột bị ánh xạ sai khi nhập Excel) | **Có**: form tặng bắt buộc đủ 2 vế nội dung; RPC từ chối phiếu thiếu vế; phiếu mới lưu "đem lại" đúng cột |
| 3. Ghi nhận trên form trước khi trao | Mọi sao phải ghi nhận trước khi trao | Lark (đã tạm hoãn) | **Có**: ghi trực tiếp trên cổng, một nguồn duy nhất |
| 3. Tập thể phân bổ sao cho cán bộ | Tập thể chia lại tối đa bằng số sao nhận; KPI giữ, giá trị đổi quà giảm | Chưa có | **Chưa** — ghi nhận ở mục "Việc còn lại" (cần chốt quy trình họp phân bổ trước khi số hóa) |
| 4. Phân bổ sao theo quý cho người phát | TCTH giao sao cho TP + BGĐ trước mùng 5 tháng đầu quý (8/6/5 sao/quý; GĐ 12, PGĐ 10; tổng 412) | Chỉ hiển thị bảng quota tĩnh | **Có**: tính năng **Bàn giao sao** ghi từng đợt (ai nhận, dải số nào, quý nào), kèm bảng phân bổ tham chiếu và tiến độ đã tặng/còn giữ |
| 4. Sao ngoài phân bổ từ chương trình/chiến dịch | Vẫn hưởng KPI + đổi quà | Không phân biệt được với sao thường | **Có**: chế độ "Sao chương trình động lực" (entry_mode='program', lưu tên chương trình, lấy số từ kho TCTH) |
| 5.1 KPI | 0,5 điểm/sao, trần 10 điểm/đối tượng | Không hiển thị | **Có**: badge KPI trên bảng cá nhân + bảng thi đua phòng (hàm `getKpiPoints`, có test) |
| 5.2 Tủ quà | Các mốc 1→20 sao | Có đủ (starMath port từ app cũ) | Giữ nguyên. Lưu ý tồn tại từ trước: app cộng dồn mọi mốc kể cả ≥8 sao, trong khi văn bản ghi mốc ≥8 "đóng dấu ĐÃ ĐỔI QUÀ, không tích lũy tiếp" — starMath cố ý giữ theo app thật, chờ chủ chương trình chốt |
| 6. TCTH đầu mối phát sao, theo dõi, đối soát | — | Chỉ nhập Excel + xuất đối soát | **Có**: khu **Quản lý Sao** (khai báo lô in, sổ serial trực quan, thống kê tồn, hủy số hỏng, thu hồi bàn giao) |
| Serial sao (nguyên tắc vận hành đã chốt 08/2026) | 1 sao = 1 số serial, không trùng | Ô chữ tự do, đã 2 lần phát sinh trùng | **Có**: sổ sao ở CSDL, số chọn từ pool, RPC khóa số trong giao dịch — trùng là không thể ghi |

## 2. Kiến trúc tính năng mới

### Sổ sao (bảng `star_serials`)
Mỗi ngôi sao vật lý = một dòng, khóa chính là số serial. Vòng đời:
`in_stock` (kho TCTH) → `handed_over` (lãnh đạo giữ) → `awarded` (đã tặng, gắn phiếu);
số hỏng → `void`. Gỡ phiếu → số quay về trạng thái trước đó.

### Bàn giao (bảng `star_handovers` + RPC `handover_stars` / `revoke_handover`)
Số hóa mục 6 văn bản: TCTH bàn giao dải số cho từng lãnh đạo theo quý. Chỉ bàn giao
được số đang tồn kho; thu hồi trả số chưa tặng về kho, số đã tặng giữ nguyên.

### Tặng sao (RPC `award_star`) — 4 chế độ
| Chế độ | Ai dùng | Người tặng trên phiếu | Nguồn số serial |
|---|---|---|---|
| `self` — Tôi tặng | TP / PGĐ / BGĐ / TCTH | **Tự nhận diện theo tài khoản đăng nhập** | Pool sao của chính người tặng |
| `proxy` — Nhập hộ | TCTH | Lãnh đạo được chọn (từ danh sách đang giữ sao) | Pool sao của lãnh đạo đó |
| `program` — Sao chương trình động lực | TCTH | Tên chương trình/chiến dịch | Kho TCTH (`in_stock`) |
| `backfill` — Nhập bù sao đã trao (04/09) | TCTH | Lãnh đạo chọn từ **toàn danh bạ** | Gõ tay; nhận cả `in_stock` lẫn `handed_over` |

Chống trùng nằm trong giao dịch của RPC: ghi phiếu + `UPDATE` từng số với điều kiện
trạng thái; thiếu một số là hủy toàn bộ, báo lỗi liệt kê số hỏng. Hai người cùng bấm
một số → chỉ một phiếu được ghi. Đã kiểm thử trực tiếp trên CSDL các ca: tặng lại số
đã dùng, tặng số chưa bàn giao, người không có quyền — đều bị chặn với thông báo
tiếng Việt rõ ràng.

Người nhận chọn từ **danh bạ cán bộ** (không gõ tay tên) → hết lỗi trùng tên/lệch
chính tả; tập thể chọn từ danh sách phòng chuẩn. Phiếu mới lưu kèm
`sender_profile_id`, `recipient_profile_id`, `entry_mode`, `program_name`.

### Phòng thủ bổ sung
- Gỡ bỏ policy cũ cho phép mọi cán bộ INSERT thẳng phiếu `source='form'` (đường vòng
  qua sổ sao).
- Đường nhập Excel (`replaceAll`) **vẫn khóa** (starImportLock) — xem mục 4.
- Gỡ phiếu ghi trên cổng đi qua RPC `revoke_star_record`: xóa phiếu + trả số sao về
  pool người giữ, dùng được ngay cả khi đường Excel đang khóa.

## 3. Hiện trạng dữ liệu ngày 29/08 (đối chiếu lại sau 03/08)

- Bảng phiếu đã bị **nhập đè lại 2 lần (21/08 và 28/08)** từ bản kết xuất Lark —
  bản khóa nhập nằm trên nhánh chưa merge nên chưa chặn được. Đây là minh chứng
  trực tiếp cho rủi ro của đường `replaceAll` và lý do phải chuyển sang ghi từng
  phiếu có kiểm soát.
- Tin tốt: **nguồn Lark đã được chi nhánh làm sạch đúng báo cáo 03/08** — 5 phiếu
  nhập lặp cũ không còn, phiếu Chu Thị Thủy 28/07 đã mang số 184 ngay tại nguồn,
  Nguyễn Quốc Tân còn đúng 4 sao.
- Hiện có **164 phiếu / 170 sao**, quyển số đã dùng đến **266**.
- **Ca trùng MỚI cần chi nhánh xác nhận: serial 90** — Hà Minh Huệ (15/07) và
  Bùi Thị Hằng (05/08), cùng Phòng DVKH, cùng người tặng Nguyễn Thị Huyền, hai
  việc khác nhau → một phiếu ghi nhầm số (giống ca 194/184). Sổ sao tạm gắn số 90
  cho phiếu sớm hơn (Hà Minh Huệ); cần tra số thật trên sao vật lý của Bùi Thị Hằng
  rồi sửa phiếu.
- Sổ sao đã nạp: khai báo 1–266, trong đó 166 số `awarded` gắn đúng phiếu, 100 số
  tồn hệ thống chờ **đối soát kho thật** (đếm sao còn trong tủ TCTH — khu Quản lý
  Sao hiển thị sẵn danh sách dải tồn).

### Bổ sung — rà lại chiều 29/08 (sau khi rebase lên main, trước khi mở PR mới)

- **Form cũ trên production vẫn tạo được phiếu không hợp lệ**: ngày 28/08 xuất
  hiện một phiếu `source='form'` không có serial — "Nguyen Thi Huong Ly / PGD
  Ocean City / 1 sao" (id `8f23000e-adfc-4543-9ba6-97fcbbc0dcfd`, created_by
  `885b7295-56f5-4b2b-ab38-481972f56cd6`). *Đính chính 29/08 (chi nhánh xác
  nhận):* PGD Ocean City là **tên mới của Phòng Yên Mỹ** — phòng có thật, kết
  luận ban đầu "phòng không tồn tại" là sai. Tuy vậy phiếu vẫn không hợp lệ:
  người tạo là **cán bộ giao dịch viên** của chính phòng này (không thuộc nhóm
  được phát Sao theo mục 2 văn bản), tự ghi cho bản thân, và không có số serial
  — vi phạm nguyên tắc *chỉ ghi nhận sao theo số serial*. Đã gỡ (nội dung lưu
  tại đây); nếu đây là ghi nhận thật, Trưởng phòng ghi lại qua form mới với số
  serial đúng. Ca này cũng cho thấy policy INSERT tự do cũ nguy hiểm thế nào:
  cán bộ thường ghi thẳng được phiếu vào bảng chính. Lưu ý: sau khi policy đó
  bị gỡ 29/08, form cũ trên production giờ báo lỗi RLS với lãnh đạo — thêm một
  lý do phải deploy bản mới sớm.
- **Phòng Yên Mỹ đổi tên thành PGD Ocean City** (danh bạ: "Phòng giao dịch
  Ocean City"): nhãn chuẩn của chương trình Sao đổi theo — `DEPT_QUOTAS` (quota
  24 giữ nguyên), `standardizeDepartment` quy mọi cách viết cũ/mới về
  "PGD Ocean City", 14 phiếu cũ mang nhãn "Phòng Yên Mỹ" đã cập nhật trường
  phân loại (lời phiếu giữ nguyên lịch sử), và cầu nối Ideas ↔ danh bạ
  (`bhy_phong_ideas_sang_ho_so` + `HO_SO_PHONG_SANG_IDEAS`) nhận tên phòng mới
  (migration `phong_yen_my_doi_ten_pgd_ocean_city`, đã áp). Nhãn hiển thị bên
  Ideas vẫn là "PGD Yên Mỹ" — đổi là việc riêng vì đụng dữ liệu phiếu Ideas và
  cấu hình site (ghi ở mục Việc còn lại).
- **Phiếu "181 và 182"**: phiếu Vũ Đức Nam 12/08 (2 sao) ghi serial bằng chữ
  "và" nên bị bỏ sót khi nạp sổ. Đã chuẩn hóa thành "181, 182", gắn hai số vào
  sổ, và sửa `parseSerialText` tách theo mọi ký tự không phải chữ số (kèm test).
- **Advisor bảo mật**: default privileges của project tự cấp EXECUTE cho `anon`
  trên hàm mới → đã thu hồi trên cả 5 RPC; khóa `search_path` cho
  `touch_updated_at` (migration `star_rpcs_thu_hoi_quyen_anon_va_khoa_search_path`).
- Trạng thái chốt sau rà lại: **163 phiếu / 169 sao / 169 token serial khớp
  169**, 168 số `awarded` gắn đúng phiếu; lệch duy nhất còn lại là ca serial 90
  (chờ tra sao vật lý của Bùi Thị Hằng); tồn hệ thống 98 số.

## 3b. Danh mục phòng lấy từ danh bạ, không hardcode (30/08)

Cổng có màn **Tổ chức & Phân quyền → Quản lý Phòng ban & Chức danh**
(`/quan-ly-phong-ban`) cho phép **đổi tên, ngừng sử dụng và xoá** phòng ban.
Chương trình Sao trước đây giữ danh sách phòng riêng trong `DEPT_QUOTAS`, nên mỗi
lần chi nhánh sửa danh bạ là bảng thi đua lệch âm thầm — đúng như ca Phòng Yên Mỹ
đổi tên: phiếu cũ mang nhãn cũ, phòng mới không có dòng nào, không ai được báo.

Nay danh mục phòng của chương trình Sao **suy từ bảng `departments`**
(`starDepartments.ts` + `useStarDepartments`), và màn Quản lý Sao có khối **Đối
soát danh mục phòng** báo 5 loại lệch:

| Loại lệch | Nghĩa là gì |
|---|---|
| Phòng mới chưa có nhãn Sao | Phòng có trong danh bạ nhưng luật nhận tên chưa biết → phiếu không vào đúng dòng |
| Hai phòng chung một nhãn | Phòng giao dịch mới bị luật cụm chung "giao dịch" dồn vào Phòng DVKH |
| Nhãn cũ không còn phòng | Phiếu mang nhãn mà danh bạ không còn phòng nào khớp (dấu hiệu vừa đổi tên/xoá) |
| Phòng đã ngừng sử dụng | Phòng bị tắt trong danh bạ nhưng vẫn còn phiếu Sao |
| Quân số đổi bậc phân bổ | Quân số hiện tại rơi vào bậc sao/quý khác mức đang áp |

Nhờ vậy: phòng mới tạo hiện ngay trong ô chọn tập thể, phòng đổi tên hiện tên mới,
phòng ngừng dùng tự rời ô chọn nhưng phiếu cũ vẫn được cảnh báo thay vì mất tích.

**Ba điểm lệch quân số đang có thật** (bậc theo văn bản mục 4 tính trên quân số):

- **Phòng TCTH**: văn bản tính 16 người → 8 sao/quý (32/năm); danh bạ nay còn
  **8 người** → ứng với 5 sao/quý.
- **Phòng Khoái Châu**: văn bản tính 10 người → 6 sao/quý; danh bạ nay **9 người**
  → ứng với 5 sao/quý.
- **Phòng HTTD**: còn **6 người** — dưới mức 7 người thấp nhất của văn bản.

Hệ thống **không tự sửa hạn mức, và cũng không chặn theo hạn mức**: RPC
`handover_stars` chỉ kiểm số có trong kho hay không, không có một dòng nào so với
`DEPT_QUOTAS`. Vì vậy **TCTH giữ nguyên phân bổ theo số sao cũ là hoàn toàn hợp
lệ** — bàn giao 8 sao/quý cho Phòng TCTH vẫn chạy bình thường, cột "Sao phòng được
phân bổ để TRAO cả năm" trong file đối soát vẫn ghi đúng số đang áp.

Do đó ba dòng chênh quân số **tách khỏi nhóm "điểm cần xử lý"** (`laLechCanXuLy`),
xuống mục *"Chênh quân số so với văn bản — tham khảo, không phải lỗi"*. Nếu trộn
chung, cảnh báo đỏ sẽ hiện mãi vì chi nhánh không có gì để sửa, và bốn loại lệch
thật (phòng mới chưa có nhãn, hai phòng chung một nhãn, nhãn cũ không còn phòng,
phòng ngừng dùng còn phiếu) sẽ chìm theo.

Bù lại, khu bàn giao có thêm dòng **"Đã bàn giao [quý]: N sao cho M lãnh đạo"** kèm
số sao từng người đã nhận trong quý — chỗ để TCTH tự đối chiếu với mức mình đang
áp, dù là mức cũ theo văn bản hay mức mới theo quân số.

## 3c. Ý kiến Phòng TCTH 04/09 — tập thể chưa có chỗ, và người tặng / serial

Cán bộ TCTH nêu 4 điểm sau khi xem bản preview. Ba điểm đầu cùng một gốc: **có
những tập thể thật ngoài danh sách phòng ban**.

| Ý kiến | Hiện trạng tìm thấy | Đã làm |
|---|---|---|
| Bổ sung Ban Giám đốc | Cả 3 PGĐ có 4 sao cá nhân nhưng **đều bị xếp vào Phòng KHDN** — kể cả PGĐ phụ trách DVKH — vì form Lark cũ chỉ có ô "phòng" và chương trình Sao cố tình loại BGĐ khỏi danh mục | Ban Giám đốc là một tập thể trong danh mục (không hạn mức phân bổ, không báo lệch); luật nhận tên bắt đúng "Ban Giám đốc"/BGĐ, **không** bắt "giám đốc" trần vì chức danh "Phó giám đốc phụ trách KHDN" cũng chứa cụm đó; 4 phiếu PGĐ đã chuyển về "Ban Giám đốc" |
| Tổ FDI trong Phòng KHDN | Đã có 2 phiếu tập thể "Tập thể Tổ FDI" (department = Tổ FDI), nhưng không có cách ghi nhận cán bộ thuộc tổ | Danh mục **tổ / tập thể nhỏ** (`star_sub_units`), Tổ FDI thuộc Phòng KHDN; phiếu cá nhân có thêm `sub_unit` |
| Tổ truyền thông (liên phòng) | Chưa có gì | Cùng danh mục, `phong_cha = null` = liên phòng |
| Hiện Người tặng + Serial ở thống kê cá nhân | Khối cá nhân mở rộng chỉ có ngày, lý do, hiệu quả; tab Chi tiết không có cột người tặng/serial | Thêm cả hai chỗ, kèm tổ nếu có |

**Cách mô hình hóa tổ** (quyết định đáng ghi lại):

- Tổ là **dòng riêng trong bảng thi đua, lồng dưới phòng cha, không xếp hạng cùng
  phòng** (tổ liên phòng nằm cuối bảng). Sao tập thể của tổ = phiếu ghi cho "Tập
  thể Tổ …" — đúng cách 2 phiếu Tổ FDI đang ghi, nên dữ liệu cũ không phải sửa.
- Sao tập thể của tổ **không cộng vào phòng cha**: văn bản xếp hạng phòng theo sao
  ghi cho phòng; nếu chi nhánh muốn gộp thì đổi một chỗ trong `buildDepartmentStats`.
- Cán bộ thuộc tổ **vẫn thuộc phòng** (phiếu giữ `department` = phòng, chỉ gắn
  thêm `sub_unit`): bảng phòng không mất người, dòng tổ hiện thêm sao cá nhân để
  tham khảo. Việc "thuộc tổ" do lãnh đạo chọn khi tặng — không quản danh sách thành
  viên tổ, vì tổ liên phòng thay đổi theo đợt.
- Danh mục tổ do **TCTH tự thêm / ngừng dùng** ở khu Quản lý Sao — không hardcode,
  cùng bài học với danh mục phòng. RPC `award_star` từ chối tên tổ không có trong
  danh mục (chặn tổ tự phát gõ tay).

Migration `20260904090000_tap_the_nho_va_ban_giam_doc` **đã áp** (kèm rollback);
đồng thời thu hồi `anon` trên `star_serials` / `star_handovers` cho đúng quy ước.

## 3d. Sự cố "[object Object]" khi bàn giao (TCTH báo 04/09)

TCTH thử bàn giao trên bản preview, màn báo *"[object Object]"*, thoát vào lại không
thấy gì ghi nhận, nhập lại vẫn thế. Log máy chủ cho thấy **hai lớp**:

1. **Máy chủ từ chối đúng**: 5 lần liên tiếp bàn giao dải **209–220** — cả 12 số đã
   nằm trên phiếu thật (210 Hàn Thị Thùy Linh, 213 Vũ Đức Nam, 215 Trần Hà Trang,
   220 Nguyễn Mạnh Quân…). RPC `handover_stars` trả đúng *"Các số không còn trong
   kho (đã bàn giao/đã tặng/đã hủy): 209, 210, …, 220"*. Ba đợt trước đó (6–10 và
   274–278 cho Trưởng phòng Bán lẻ, 241–250 cho PGĐ KHDN) đều thành công — dữ liệu
   không hỏng.
2. **Màn hình nuốt thông báo**: `supabase.rpc()` trả `{ error }` là **object
   thường** `{ message, details, hint, code }`, chỉ bọc thành `Error` khi gọi
   `.throwOnError()` (postgrest-js 2.103, `dist/index.mjs` dòng 359–387). Hàm đọc
   lỗi cũ dùng `err instanceof Error ? err.message : String(err)` nên mọi lỗi từ
   máy chủ hiện thành "[object Object]". Lỗi có từ ngày đầu nhưng không lộ vì các
   RPC được kiểm thử bằng SQL, không qua trình duyệt.

Đã sửa: `starRpcError.ts` đọc `.message` từ mọi dạng (kèm 5 test, có ca "không
bao giờ ra [object Object]"); và khu bàn giao **soát dải số ngay khi gõ** — liệt kê
số đã tặng / đã bàn giao / chưa khai báo và khóa nút gửi cho tới khi dải sạch, để
TCTH không phải gửi rồi mới biết.

## 3e. Nhập bù sao đã trao + bước xác nhận (04/09, sau khi dừng đường Excel)

**Vì sao có chế độ thứ tư.** Đường nhập Excel dừng hẳn ngày 04/09, nhưng chi nhánh
vẫn phát sao thật ngoài đời và một số phiếu chưa kịp vào cổng. Đối chiếu tin Lark đẩy
ra nhóm Zalo chi nhánh thấy 12 phiếu gần nhất, trong đó **6 phiếu cổng chưa có**
(serial 64, 65, 75, 241, 250, 287). Không có đường nhập bù thì giai đoạn chuyển đổi
sẽ **mất sao của cán bộ** — đúng thứ chương trình không được phép làm.

Chế độ `backfill` khác ba chế độ cũ ở ba điểm, mỗi điểm có lý do vận hành:

| Điểm khác | Vì sao |
|---|---|
| Số serial **gõ tay**, không chọn từ pool | Sao đã trao rồi; số có thể còn nằm trong kho (chưa kịp ghi bàn giao) **hoặc** đang ở tay lãnh đạo — hai pool khác nhau, không gộp thành một ô chọn được |
| Người tặng chọn từ **toàn danh bạ** | Sao trao từ lâu, pool của lãnh đạo đó có thể đã hết sạch nên họ không còn trong danh sách "đang giữ sao" |
| Vế «đem lại» **không bắt buộc** | Mẫu Lark cũ không có trường này; 6 phiếu Zalo cũng không có. Chế độ `self` (lãnh đạo đang trao) vẫn bắt buộc đủ ba vế theo văn bản mục 3 |

Bù lại phần nới lỏng, số gõ tay được soi từng con ngay trên trình duyệt
(`phanLoaiSerialNhapBu`, cùng luật với nhánh `backfill` trong RPC): số đã gắn phiếu
khác, số đã hủy, số chưa khai báo lô in đều báo đỏ tại chỗ và khóa nút gửi. Hàng rào
thật vẫn nằm trong giao dịch của RPC — bản trên máy chỉ để người nhập biết trước.

**Bước xác nhận cho MỌI chế độ.** Phiếu ghi xong thì số serial bị khóa vĩnh viễn vào
phiếu, chỉ TCTH gỡ được, và con số đó là ngôi sao vật lý đã ở tay cán bộ. Nay nút
chính là «Xem lại & xác nhận», mở bảng liệt kê đủ: cách ghi nhận · người tặng (chế độ
"Tôi tặng" hiện **tên chính mình** — máy dùng chung, quên đăng xuất là ghi nhầm) ·
người/tập thể nhận · phòng ghi nhận · tổ · hai vế nội dung · ngày trao · số Sao và
serial. Bấm «Đúng rồi» mới ghi.

**Rà lại trường nhập theo văn bản** (yêu cầu 04/09): trường bắt buộc gắn dấu `*`;
ngày trao chặn ngày tương lai ngay trên ô chọn (`max`) **và** trong kiểm tra trước khi
gửi, khớp với `p_awarded_on > current_date` phía RPC; nhãn vế «đem lại» nói rõ khi nào
được để trống; chế độ nhập bù tự đếm số Sao theo số serial gõ vào (1 sao = 1 số) thay
vì bắt chọn lại; sau khi ghi xong **giữ nguyên người tặng và chế độ** vì nhập bù
thường là một loạt phiếu của cùng một lãnh đạo.

**Sáu phiếu Zalo đã nhập bù ngày 04/09** (`entry_mode='backfill'`, đã kiểm tra lại đủ
6 dòng, cả 6 số ở trạng thái `awarded` và gắn đúng người giữ):

| Serial | Người/tập thể nhận | Người tặng |
|---|---|---|
| 64, 65 | Tập thể PGD Ocean City | Phạm Minh Hải |
| 75 | Phạm Minh Huế | Đỗ Việt Anh |
| 241, 250 | Phạm Thị Diễm Ly | Nguyễn Đức Thái Hoàng |
| 287 | Chu Hồng Hải | Nguyễn Thị Huyền |

Hai điểm phải nói rõ để TCTH biết mà sửa: tin Zalo **không có ngày trao** nên cả 6
phiếu ghi ngày 04/09 (ngày nhập) — quý thống kê vẫn đúng nhưng ngày thì không phải
ngày trao thật; và phiếu serial 75 **tin Lark bỏ trống lý do**, tạm ghi
"(Tin Lark để trống lý do — chờ Phòng KHDN bổ sung)", cần Phòng KHDN điền lại.

## 4. Trình tự đưa vào vận hành

1. **Merge + deploy nhánh này** — chừng nào chưa deploy, màn nhập Excel cũ còn sống
   và mọi hàng rào chỉ nằm trên giấy. (Các RPC + bảng đã nằm sẵn trên CSDL, không
   phụ thuộc deploy.)
2. TCTH vào khu Quản lý Sao: đối soát tồn kho thật với 100 số tồn hệ thống; hủy số
   hỏng nếu có.
3. TCTH **bàn giao dải số Quý 3** cho từng lãnh đạo theo bảng phân bổ (làm mẫu 1–2
   người trước).
4. Lãnh đạo bắt đầu tặng sao trên cổng; TCTH dùng nhập hộ cho người chưa quen.
5. Chốt ca serial 90 (tra sao vật lý của Bùi Thị Hằng) — sửa phiếu bằng gỡ + ghi lại
   qua nhập hộ với số đúng.
6. Đường nhập Excel giữ khóa vĩnh viễn hoặc chuyển thành "nhập bổ sung có đối chiếu
   sổ sao" nếu còn cần nạp dữ liệu cũ.

## 5. Việc còn lại (chưa làm đợt này)

- **Phân bổ sao tập thể → cán bộ** (văn bản mục 3): cần chốt quy trình (ai ghi biên
  bản họp phòng, phân bổ tính vào phiếu mới hay tách phiếu gốc) trước khi số hóa.
- **Quy tắc mốc quà ≥8 sao** (đổi quà dừng tích lũy): starMath đang theo app thật
  (cộng dồn) — chủ chương trình chốt rồi mới sửa công thức.
- **Xác nhận danh sách lãnh đạo giữ sao Quý 3** để bàn giao đủ 15 đầu mối (10 TP +
  GĐ + 3 PGĐ + dự phòng chương trình).
- Backfill `sender_profile_id` cho các phiếu import cũ (khớp tên người tặng → hồ
  sơ) nếu muốn thống kê "ai đã phát bao nhiêu sao" chạy ngược về quá khứ.
- **Đổi nhãn Ideas "PGD Yên Mỹ" → "PGD Ocean City"**: đụng union type, dữ liệu
  phiếu Ideas đã lưu, `siteContent.departments_config` và hàm SQL — làm thành một
  đợt riêng khi chi nhánh muốn tên mới hiện cả bên Ideas.

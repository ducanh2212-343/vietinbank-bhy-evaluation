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

### Tặng sao (RPC `award_star`) — 3 chế độ
| Chế độ | Ai dùng | Người tặng trên phiếu | Nguồn số serial |
|---|---|---|---|
| `self` — Tôi tặng | TP / PGĐ / BGĐ / TCTH | **Tự nhận diện theo tài khoản đăng nhập** | Pool sao của chính người tặng |
| `proxy` — Nhập hộ | TCTH | Lãnh đạo được chọn (từ danh sách đang giữ sao) | Pool sao của lãnh đạo đó |
| `program` — Sao chương trình động lực | TCTH | Tên chương trình/chiến dịch | Kho TCTH (`in_stock`) |

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

Hệ thống **không tự sửa hạn mức** — phân bổ là quyết định của chi nhánh, đã giao
từ đầu năm. Khối đối soát chỉ nêu để TCTH cân nhắc khi giao sao quý sau.

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

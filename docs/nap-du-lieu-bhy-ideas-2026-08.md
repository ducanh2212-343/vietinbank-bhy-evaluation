# Nạp dữ liệu BHY Ideas từ cổng cũ (03/08/2026)

Nguồn: `TONG_HOP_Y_TUONG_SANG_KIEN_BHY_20260803.csv` — bản kết xuất của cổng BHY Ideas
cũ (Firebase), 113 phiếu từ 01/07/2026 đến 03/08/2026. File gốc **không commit vào repo**
(repo công khai, dữ liệu có email cá nhân của cán bộ và nội dung đề xuất nội bộ).

## Kết quả

| Hạng mục | Kết quả |
|---|---|
| `portal_ideas` | **113/113 ý tưởng** nạp mới |
| `portal_idea_comments` | **21/21 bình luận** (cột "Y kien binh luan") |
| Phiếu gửi thẳng trên cổng mới | **1 phiếu giữ nguyên** (không bị đụng tới) → tổng 114 |
| Chủ sở hữu khớp tài khoản thật | **111/113 phiếu** về đúng cán bộ (43 người) — xem mục "Gán chủ sở hữu" |
| Đối chiếu nội dung với file gốc | **113/113 khớp md5** (tiêu đề, thực trạng, giải pháp, lợi ích, người đề xuất, phòng) |
| Đối chiếu cột phân loại | **khớp md5 toàn bộ** (cấp đề xuất, phạm vi, phòng, demo, cấp độ, cờ Hội đồng, email, thời điểm gửi) |

Phân bố sau khi nạp: 69 "Đề xuất TSC" / 44 "Nội bộ CN"; 94 "Ươm mầm" / 19 "Bén rễ";
16 phiếu gắn cờ đề xuất Hội đồng; 24 phiếu có sản phẩm demo; trải đủ 11 đơn vị.

## Cách làm

1. `node scripts/import-bhy-one/import-ideas-csv.mjs <file.csv> > payload.json`
   — đọc CSV, chuẩn hoá và sinh gói JSON.
2. `SELECT public.admin_import_ideas_csv('<payload>'::jsonb);`
   — hàm nạp dữ liệu (migration `20260817090000_bhy_ideas_nap_du_lieu_csv.sql`).
   Gói lớn có thể chia lô, hàm cộng dồn được (xem mục idempotent bên dưới).

### Quy ước dữ liệu

- **Khoá `legacy_id`** = `bhy-ideas-csv:<thời điểm gửi>` (ví dụ `bhy-ideas-csv:20260803T110657`).
  Cả 113 phiếu có mốc giây riêng và mốc này không đổi giữa các lần kết xuất → chạy lại
  chỉ cập nhật, không tạo bản trùng.
- **Idempotent theo lô**: ý tưởng ngoài gói không bị đụng tới; bình luận đến từ CSV chỉ
  bị thay ở đúng những ý tưởng có trong gói, nên nạp nhiều lô liên tiếp không xoá lô trước.
  Bình luận cán bộ nhập trên cổng (`legacy_id` NULL) luôn được giữ.
- **Thời gian**: cột "Ngay gui" là giờ Việt Nam (`toLocaleString` vi-VN) → quy về ISO `+07:00`.
- **Chủ sở hữu**: xem mục riêng bên dưới.
- **Bình luận**: dạng `[Tên (tài khoản)]: nội dung`; tài khoản cổng cũ được dò sang hồ sơ
  cán bộ để hiển thị tên thật thay vì mã đăng nhập.
- **Chuẩn hoá NFC**: một ô trong file gốc để dấu tiếng Việt ở dạng tách rời (NFD) — nhìn
  giống hệt nhưng khác chuỗi byte. Script gộp về NFC cho khớp phần còn lại của dữ liệu.
- **Lượt thích**: file kết xuất không có cột lượt thích/không thích → `seed_likes` và
  `seed_unlikes` để 0. Đây là dữ liệu duy nhất của cổng cũ không khôi phục được.

## Gán chủ sở hữu phiếu (`created_by`)

Đợt đầu gán theo **email người gửi** — sai bản chất, vì nhiều phòng dùng chung một tài
khoản để gửi hộ: 13 phiếu qua tài khoản Trưởng phòng DVKH, 5 phiếu qua email chung Phòng
Bán lẻ, 3 phiếu qua tài khoản Trưởng PGD Ân Thi, 2 phiếu qua tài khoản Phó phòng TCTH.
Gán theo email thì công đổi mới sáng tạo dồn hết về trưởng/phó phòng.

Từ migration `20260820090000`, thứ tự xác định chủ sở hữu là:

1. **Tên người đề xuất** — bỏ dấu, gộp khoảng trắng, không phân biệt hoa thường
   (`bhy_tim_can_bo_theo_ten`). Phiếu nhóm `"A, B, C"` lấy người đứng đầu làm chủ sở hữu
   nhưng **giữ nguyên** ô tên để không mất tên đồng tác giả.
2. **Bí danh** trong `portal_idea_proposer_alias` (phiếu ghi tên đăng nhập: `lypham`,
   `duy.nd`, `PHUONGNT5`). Quản trị bổ sung dần khi gặp trường hợp mới.
3. **Email người gửi** khớp `profiles.email`.
4. Tài khoản system_admin.

Tên trên phiếu được chuẩn hoá lại theo `profiles.full_name` (nguồn chuẩn là chieuthuc3),
bản gốc lưu ở `custom_values->>'ten_goc_tren_phieu'` — 49 phiếu đã chuẩn hoá.

**Trùng tên:** chi nhánh có 2 chị **Nguyễn Thị Phượng** (Phó phòng TCTH – tcth_admin, và
Phó phòng giao dịch Ân Thi). Hàm dò phân giải bằng phòng ghi trên phiếu; đã kiểm chứng
21 bình luận + 2 ý tưởng về chị TCTH, 1 ý tưởng "Đặt ngoại tệ trùng lặp" về chị Ân Thi,
không có bản ghi nào lẫn sang nhau. Ngoài ra còn 1 hồ sơ thứ ba trùng tên ở trạng thái
`deleted` — hàm chỉ dò hồ sơ `active` nên không bị dính.

**Kết quả:** **113/113 phiếu** về đúng cán bộ, phân bổ cho **44 người** (trước đó 22).
Hai phiếu Phòng DVKH ghi `Haich` và `Nguyễn Đức Mạnh` đã được xác nhận là Chu Hồng Hải và
Vũ Đức Mạnh, bổ sung vào bảng bí danh ở migration `20260821090000`.

Gặp bí danh mới thì chỉ cần thêm một dòng vào `portal_idea_proposer_alias` rồi chạy lại
`admin_import_ideas_csv` với gói JSON cũ.

Hai email `thuylt120996@gmail.com` và `thuylt231096@gmail.com` cùng ghi tên "Lê Thị Thuý"
– Phòng HTTD: đã xác nhận là **một cán bộ dùng hai email**, cả 9 phiếu gộp về hồ sơ
**Lê Thị Thúy**.

## Form gửi ý tưởng trên cổng mới

Nguồn gốc của toàn bộ việc chỉnh tay ở trên là ô "Cán bộ / Nhóm đề xuất" và "Phòng/Ban"
để cán bộ tự gõ. Cán bộ đã đăng nhập rồi thì không có lý do gì phải khai lại, nên form
đã bỏ hai ô tự do đó:

- **Cán bộ đề xuất** và **Phòng/Ban** lấy thẳng từ hồ sơ nhân sự của tài khoản đang đăng
  nhập, hiển thị cố định. `created_by` gán đúng người ngay từ lúc gửi.
- **Đồng đề xuất**: chọn nhiều cán bộ từ danh bạ (ý tưởng nhóm). Ô `proposer` ghi
  `"Người chính, Đồng tác giả 1, Đồng tác giả 2"` — giữ nguyên nếp của dữ liệu cũ, còn
  `created_by` là người đứng đầu.
- **Quản trị TCTH/hệ thống** được chọn cán bộ khác trong danh bạ để nhập hộ (phiếu giấy),
  và phiếu vẫn đứng tên đúng cán bộ đó chứ không đứng tên người nhập.
- Hồ sơ chưa gắn Phòng/Ban thì form báo rõ và chặn gửi, thay vì cho chọn bừa.

Danh bạ lấy qua RPC `bhy_danh_ba_can_bo` (migration `20260822090000`) — chỉ trả họ tên và
phòng, không lộ email/điện thoại/ngày sinh, và chặn khách đối tác. Cần RPC riêng vì RLS
bảng `profiles` không cho cán bộ thường đọc hồ sơ người khác.

Ở chế độ **sửa** ý tưởng, người đề xuất và phòng giữ nguyên giá trị đã lưu (kể cả chuỗi
nhiều tác giả của dữ liệu cũ) — muốn đổi thì đi đường quản trị, không sửa lẫn trong form.

## Xem toàn chi nhánh & tra trùng ý tưởng

RLS `portal_ideas` cho **mọi cán bộ xem toàn bộ ý tưởng của tất cả phòng ban**
(`Staff can view portal ideas` — điều kiện `is_staff`), không giới hạn theo phòng. Chỉ
khách đối tác (`guest`) bị chặn. Bảng theo dõi nhóm theo phòng, mặc định mở hết.

Bổ sung **ô tìm kiếm không dấu** trên toàn bộ nội dung phiếu (tiêu đề, người đề xuất,
phòng, thực trạng, giải pháp, lợi ích) để cán bộ tra trước khi gửi, tránh đề xuất trùng
ý tưởng phòng khác đã có. Gõ "giai ngan" vẫn ra "giải ngân". Khi lọc không ra kết quả,
thông báo nói rõ là "chưa ai đề xuất nội dung này" thay vì "chưa có ý tưởng nào".

## Kết xuất báo cáo cho Phòng TCTH (phục vụ cộng/trừ KPI)

Nút **Xuất Excel** và bộ lọc khoảng ngày chỉ hiện với `tcth_admin` / `system_admin` —
đúng đối tượng, không cần sửa.

Trước đây nút này xuất **CSV thuần** — mở lên là một khối chữ, phải tự căn cột. Nay xuất
**file .xlsx thật, 4 sheet**:

| Sheet | Nội dung |
|---|---|
| **Danh sách ý tưởng** | 24 cột chi tiết, mỗi phiếu một dòng |
| **Tổng hợp theo cán bộ** | Mỗi cán bộ một dòng: tổng ý tưởng, số theo từng cấp độ, đề xuất Hội đồng, có Demo, dự toán thưởng — xếp giảm dần |
| **Tổng hợp theo phòng** | Như trên nhưng theo phòng, kèm số cán bộ tham gia |
| **Tổng quan** | Khoảng thời gian, tổng số ý tưởng, số cán bộ/phòng tham gia, phân bổ cấp độ, tổng dự toán thưởng |

Định dạng: tiêu đề in đậm nền đỏ/xanh thương hiệu, khoá dòng tiêu đề khi cuộn, bật bộ lọc
tự động, cột đã đo bề rộng, ô văn bản dài tự xuống dòng, nền xen kẽ cho dễ dò ngang.
Cột ngày là **ô kiểu ngày** và cột thưởng là **số có định dạng tiền** — lọc, sắp xếp,
`SUMIF` được ngay, không phải chuyển kiểu như khi mở CSV.

Dùng ExcelJS (nạp động, chỉ tải khi bấm xuất) vì thư viện `xlsx` bản cộng đồng sẵn có
trong dự án không ghi được định dạng ô.

Bộ cột chi tiết giữ nguyên trật tự quen thuộc của file cũ, bổ sung 8 cột phục vụ KPI:

| Cột | Nguồn | Vì sao cần |
|---|---|---|
| `Mã cán bộ` | `profiles.employee_code` | Khoá ghép với hệ thống nhân sự/KPI |
| `Họ tên theo hồ sơ` | `profiles.full_name` | Tên chuẩn, không phụ thuộc cách gõ trên phiếu |
| `Phòng theo hồ sơ` | `departments.name` | Phòng thực tế của cán bộ |
| `Chức vụ` | `profiles.position` | Phân biệt cán bộ / lãnh đạo khi tính KPI |
| `Đồng đề xuất` | phần sau dấu phẩy của ô người đề xuất | Chia công ý tưởng nhóm |
| `Lượt thích` / `Lượt không thích` | `portal_idea_votes` + seed | Mức độ đồng thuận |
| `Cập nhật gần nhất` | `portal_ideas.updated_at` | Chốt kỳ khi ý tưởng chuyển Vươn cành / Lan tỏa |

Cột email người gửi trước đây ghi cứng `N/A`, nay trả đúng email tài khoản đã gửi phiếu.

Hồ sơ chủ sở hữu lấy qua `useIdeaOwnerProfiles`, chỉ tải khi người xem là quản trị (RLS
`profiles` chỉ mở toàn bộ hồ sơ cho `system_admin` / `tcth_admin` / `bgd`).

> **Việc cần làm trước khi tính KPI:** hiện **0/100 hồ sơ có `employee_code`**, nên cột
> `Mã cán bộ` sẽ rỗng. Muốn ghép tự động với bảng KPI nhân sự thì phải điền mã cán bộ
> vào hồ sơ trước; trong lúc chờ, ghép tạm bằng `Họ tên theo hồ sơ` + `Phòng theo hồ sơ`.

## Bảo mật

`public.admin_import_ideas_csv` là `SECURITY DEFINER` nhưng đã `REVOKE ALL ... FROM PUBLIC,
anon, authenticated` — chỉ gọi được từ phía máy chủ (service role / SQL Editor). Hàm còn
tự chặn nếu người gọi đã đăng nhập mà không phải `system_admin`/`tcth_admin`.

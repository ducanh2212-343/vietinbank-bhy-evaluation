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

**Kết quả:** 111/113 phiếu về đúng cán bộ, phân bổ cho **43 người** (trước đó 22).
Còn 2 phiếu Phòng DVKH chưa xác định, tạm để dưới tài khoản người gửi:

| Ô "Cán bộ đề xuất" | Vướng mắc |
|---|---|
| `Haich` | Viết tắt, chưa rõ là ai (Chu Hồng Hải?) |
| `Nguyễn Đức Mạnh` | chieuthuc3 chỉ có **Vũ Đức Mạnh** (DVKH) — nhầm họ hay người khác? |

Khi xác định được, chỉ cần thêm một dòng vào `portal_idea_proposer_alias` rồi chạy lại
`admin_import_ideas_csv` với gói JSON cũ.

**Điểm còn ngỏ:** hai email `thuylt120996@gmail.com` và `thuylt231096@gmail.com` cùng ghi
tên "Lê Thị Thuý" – Phòng HTTD, nhưng chieuthuc3 chỉ có một hồ sơ **Lê Thị Thúy**. Theo
quy tắc ưu tiên tên, cả 9 phiếu đang gộp về một người. Nếu thực tế là hai cán bộ trùng
tên thì cần tạo hồ sơ thứ hai và tách lại.

## Bảo mật

`public.admin_import_ideas_csv` là `SECURITY DEFINER` nhưng đã `REVOKE ALL ... FROM PUBLIC,
anon, authenticated` — chỉ gọi được từ phía máy chủ (service role / SQL Editor). Hàm còn
tự chặn nếu người gọi đã đăng nhập mà không phải `system_admin`/`tcth_admin`.

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
| Chủ sở hữu khớp tài khoản thật | **21/36 email** khớp hồ sơ cán bộ; số còn lại gán system_admin |
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
- **Chủ sở hữu**: dò `profiles.email` / `profiles.personal_email` theo email người gửi;
  không khớp thì gán tài khoản system_admin (như các đợt import trước). Nhờ vậy 21 cán bộ
  thấy đúng phiếu của mình trên cổng và tự sửa được.
- **Bình luận**: dạng `[Tên (tài khoản)]: nội dung`; tài khoản cổng cũ được dò sang hồ sơ
  cán bộ để hiển thị tên thật thay vì mã đăng nhập.
- **Chuẩn hoá NFC**: một ô trong file gốc để dấu tiếng Việt ở dạng tách rời (NFD) — nhìn
  giống hệt nhưng khác chuỗi byte. Script gộp về NFC cho khớp phần còn lại của dữ liệu.
- **Lượt thích**: file kết xuất không có cột lượt thích/không thích → `seed_likes` và
  `seed_unlikes` để 0. Đây là dữ liệu duy nhất của cổng cũ không khôi phục được.

## Bảo mật

`public.admin_import_ideas_csv` là `SECURITY DEFINER` nhưng đã `REVOKE ALL ... FROM PUBLIC,
anon, authenticated` — chỉ gọi được từ phía máy chủ (service role / SQL Editor). Hàm còn
tự chặn nếu người gọi đã đăng nhập mà không phải `system_admin`/`tcth_admin`.

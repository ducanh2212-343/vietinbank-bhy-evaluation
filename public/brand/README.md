# Ảnh thương hiệu "Cây ký ức" — 20 năm VietinBank Bắc Hưng Yên

Upload các file ảnh sau vào đúng thư mục này (`public/brand/`), đúng tên file.
Website tự động dùng ảnh ngay sau khi deploy; khi chưa có ảnh sẽ hiển thị bản vẽ vector dự phòng.

Ảnh hiện dùng định dạng **WebP** (nhẹ, nét) — đã được tối ưu sẵn:

| File đang dùng | Nội dung | Kích thước |
|---|---|---|
| `cay-ky-uc.webp` | Ảnh cây ký ức | 800×800 · ~124KB |
| `huy-hieu-20.webp` | Huy hiệu "20 năm 2006–2026" | 320×320 · ~10KB |
| `mascot.webp` | Linh vật (tùy chọn) | 480×480 · ~35KB |

## Muốn đổi ảnh khác
Cách 1 (khuyến nghị): gửi ảnh cho Claude Code, sẽ tự chuyển sang WebP đúng tên và tối ưu.
Cách 2: tự tạo file WebP cùng tên rồi upload đè (giữ nền sáng/trong suốt; web tự bọc khung trắng bo tròn khi đặt trên nền navy).

Vị trí hiển thị: panel trang Đăng nhập, banner trang Tổng quan, dải 20 năm trên sidebar.

## Logo Chi nhánh cho danh thiếp số

| File | Nội dung | Dùng ở |
|---|---|---|
| `logo-cn-bhy.svg` | Logo VietinBank + «Chi Nhánh Bắc Hưng Yên» trên nền xanh nhạt bo góc (vector, ~10 KB, tách từ tệp PDF logo do Chi nhánh cung cấp) | Trang danh thiếp số công khai (`/card/<slug>`, chỉ mẫu thẻ cán bộ) và chèn giữa mã QR |

Đổi logo: thay đúng tên tệp, giữ tỉ lệ khung 144 × 88 (hằng số `KHUNG_LOGO` trong `src/lib/danhThiep/qr.ts` tính vùng trắng giữa mã QR theo tỉ lệ này).

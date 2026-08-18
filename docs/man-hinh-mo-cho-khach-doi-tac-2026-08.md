# Chọn màn hình mở cho từng khách đối tác (08/2026)

## Vì sao đổi

Tài khoản khách (role `guest`) trước nay vào được đúng bốn màn: Trang chủ ONE,
Tin tức nội bộ, Bắc Hưng Yên Sharing và Bắc Hưng Yên Connect. Danh sách ấy đóng
cứng trong cây điều hướng (`guestVisible` của `src/lib/navigation.ts`), nên:

- mở thêm một màn cho **một** đối tác là mở cho **mọi** khách;
- mỗi lần đổi là phải sửa mã nguồn và phát hành lại bản mới.

Nay mỗi tài khoản khách mang danh sách riêng — Phòng TCTH tự tick ở màn
**Quản trị tài khoản khách** (`/quan-tri-khach`), có hiệu lực ngay.

## Cách dùng

**Khi cấp tài khoản mới:** ô «Màn hình khách được xem» nằm ngay dưới phần thông
tin, mặc định tick sẵn bộ bốn màn cũ. Bỏ bớt hoặc mở thêm trước khi bấm «Tạo tài
khoản khách».

**Với khách đang có:** bảng danh sách có cột «Màn hình được xem»; bấm nút **Màn
hình** ở cột thao tác để mở hộp thoại tick lại rồi lưu. Bỏ tick là khách mất
đường vào ngay ở lần tải trang sau — bấm link cũ sẽ bị đưa về Trang chủ ONE.

## Danh mục màn hình mở được

| Mã | Màn hình | Ghi chú |
|---|---|---|
| `trang-chu` | Trang chủ ONE | Cửa vào, luôn mở — không tắt được |
| `tin-tuc` | Tin tức nội bộ | Chỉ tin đã đánh dấu «Chia sẻ đối tác» |
| `sharing` | Bắc Hưng Yên Sharing | Chỉ tư liệu đã đánh dấu «Chia sẻ đối tác» |
| `connect` | Bắc Hưng Yên Connect | Nội dung giới thiệu |
| `cay-ky-uc` | Cây Ký Ức | Kỷ yếu 20 năm — có ảnh tập thể, lưu bút nội bộ |
| `ghi-nhan` | Sao Xứng Đáng | Ô gửi sao và phân tích nội bộ vẫn ẩn |
| `credit-360` | Bắc Hưng Yên Credit 360 | Sổ phiên họp vẫn ẩn |
| `ideas` | Bắc Hưng Yên Ideas | Chỉ trang giới thiệu; gửi/chấm điểm/vận hành vẫn ẩn |
| `bhy-3806` | Khung năng lực 3806 | Nội dung giới thiệu, không kèm dữ liệu cán bộ |

Các màn nghiệp vụ khác (Chiêu thức 2, Quizzi, toàn bộ phân hệ Phát triển nhân sự
343, khu quản trị) **không** nằm trong danh mục — không có cách nào mở cho khách
từ giao diện.

## Ranh giới cần nhớ

- **Mở màn hình chỉ mở đường vào.** Phần nội bộ bên trong từng màn (ô nhập, bảng
  dữ liệu, phân tích) vẫn tự ẩn với khách như trước.
- **RLS vẫn là hàng rào thật.** Khách hết hạn hoặc chưa được mở màn thì máy chủ
  không trả dữ liệu, không phụ thuộc giao diện. Cây Ký Ức có thêm policy riêng
  (`guest_screen_allowed`) cho bảng `ky_yeu_an_pham` và bucket `ky-yeu`.
- **Fail-closed.** Đường dẫn không nằm trong danh mục thì khách không vào được,
  kể cả route mới thêm sau này trong `/one`. Route con cũng không ăn theo: mở
  `/one/y-tuong` không mở `/one/y-tuong/gui`.

## Nơi cần sửa khi thêm một màn hình vào danh mục

1. `src/lib/manHinhKhach.ts` — thêm mã, tên, mô tả, đường dẫn.
2. `src/lib/navigation.ts` — đặt `guestScreen: '<mã>'` lên mục lá tương ứng.
3. `supabase/functions/_shared/guestScreens.ts` và ràng buộc
   `guest_access_allowed_screens_hop_le` — thêm cùng mã.
4. Nếu màn đó đọc bảng/bucket đang khóa theo `is_staff()`, mở thêm policy theo
   `guest_screen_allowed(auth.uid(), '<mã>')`.

Test `src/lib/__tests__/manHinhKhach.test.ts` và phần phân quyền của
`src/lib/__tests__/navigation.test.ts` khóa các quy ước trên — quên bước nào là
test đỏ.

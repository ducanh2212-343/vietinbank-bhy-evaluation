# Chọn màn hình mở cho từng khách đối tác (08/2026)

## Vì sao đổi

Tài khoản khách (role `guest`) trước nay vào được đúng bốn màn: Trang chủ ONE,
Tin tức nội bộ, Bắc Hưng Yên Sharing và Bắc Hưng Yên Connect. Danh sách ấy đóng
cứng trong cây điều hướng (`guestVisible` của `src/lib/navigation.ts`), nên:

- mở thêm một màn cho **một** đối tác là mở cho **mọi** khách;
- mỗi lần đổi là phải sửa mã nguồn và phát hành lại bản mới.

Nay mỗi tài khoản khách mang danh sách riêng — Phòng TCTH tự tick ở màn
**Quản trị tài khoản khách** (`/quan-tri-khach`), có hiệu lực ngay.

## Cấp tài khoản: không cần email

Đối tác chỉ cần **tên đăng nhập** và **tên công ty / tên người dùng** — cấp ngay
tại chỗ trong buổi làm việc, không phải chờ xin email.

- Chỉ cần gõ ô **tên công ty / tên người dùng** — tên đăng nhập tự suy ra
  ("Công ty ABC" → `cong.ty.abc`), muốn khác thì gõ đè lên ô tên đăng nhập.
- Ô tên đăng nhập báo ngay tại chỗ nếu chưa hợp lệ (nút Cấp khóa lại), và cảnh
  báo nếu tên ấy đã cấp cho khách khác — bấm tiếp là **cập nhật** khách đó chứ
  không tạo tài khoản thứ hai.
- Cấp xong hiện **thẻ bàn giao** gồm cả tên đăng nhập lẫn mật khẩu tạm, có nút
  «Sao chép cả hai» để dán vào tin nhắn gửi đối tác.
- Bấm «Tạo tài khoản khách» là có mật khẩu tạm — **chỉ hiện một lần**, đọc/gửi
  cho đối tác qua kênh an toàn; họ phải đổi ở lần đăng nhập đầu.
- Khách đăng nhập bằng đúng tên đăng nhập ấy (không có `@`) ở trang đăng nhập.
- **Khách quên mật khẩu:** họ không có hòm thư thật nên không tự đặt lại được —
  bấm nút **Mật khẩu** ở bảng danh sách để cấp lại mật khẩu tạm.

Tài khoản khách cấp trước đợt này (bằng email thật) vẫn đăng nhập, gia hạn, sửa
màn hình và cấp lại mật khẩu bình thường.

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

## Khi màn hình báo lỗi lạ

Màn hình chạy trên Vercel còn cơ sở dữ liệu và edge function nằm trên Supabase —
**merge code xong chưa phải là xong**. Ngày 18/08 tài khoản `lylyai` không cấp
được chính vì thế: edge function trên máy chủ còn bản cũ (bản cũ bắt buộc email)
nên nó chặn ngay, mà màn hình thì đã bỏ ô email từ lâu.

Hai việc phải làm mỗi khi đợt này đổi:

1. Áp migration trong `supabase/migrations/` (thiếu → lỗi có chữ `allowed_screens`).
2. Deploy lại `create-guest-user` (thiếu → lỗi có chữ `Email không hợp lệ`).

`dienGiaiLoiKhach()` trong `src/lib/invokeError.ts` nhận diện đúng hai lỗi ấy và
in thẳng việc phải làm ra màn hình, để lần sau không phải đoán.

Test `src/lib/__tests__/manHinhKhach.test.ts` và phần phân quyền của
`src/lib/__tests__/navigation.test.ts` khóa các quy ước trên — quên bước nào là
test đỏ.

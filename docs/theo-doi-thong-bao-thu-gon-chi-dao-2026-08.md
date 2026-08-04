# Thông báo đủ cấp phụ trách · GĐ theo dõi · thu gọn việc xong · nguồn «chỉ đạo»

08/2026, theo chỉ đạo của Giám đốc Chi nhánh. Năm việc trong một đợt.

---

## 1. Sửa dữ liệu: Trưởng phòng TCTH

GĐ xác nhận Trưởng phòng TCTH là **Vũ Thị Thu Hà** — trước đó hệ thống gieo
nhầm thành viên «Mảng tổ chức» theo vai trò manager (Vũ Thị Năm). Đã sửa:
`departments.manager_id` của TCTH = Vũ Thị Thu Hà, và thành viên duy nhất
của Mảng tổ chức (hạn chế) nay là chị Thu Hà — chị tự thêm Phó phụ trách.

## 2. Thông báo tới đủ cấp khi có nhịp / trao đổi

Trước đây: **ghi nhịp không báo ai cả** (stand-up sáng chỉ ai mở bảng mới
thấy), trao đổi chỉ báo cán bộ + người phối hợp + người được nhắc.

Nay MỘT hàm `ct2_ds_nhan_dau_viec()` quyết danh sách nhận, mọi trigger cùng
đọc: **cán bộ · người phối hợp · Phó phòng · Trưởng phòng · PGĐ phụ trách ·
lãnh đạo theo dõi · người bấm Theo dõi** (thẻ hoặc phòng).

- Nhịp cờ **đỏ** («đang vướng») đi mức **DO** — không chịu trần: điểm nghẽn
  là thứ GĐ cần thấy ngay. (08/2026: mọi mức đều CHỈ push + chuông, không
  email — xem `20260820090000`, Resend có hạn mức nên email để dành cho đặt
  lại mật khẩu và digest tuần.)
- Nhịp xanh/vàng và trao đổi đi mức NHẸ, **chịu trần chống nhiễu** (mặc định
  3 tin nhẹ/người/ngày — TCTH chỉnh trong «Cài đặt ngày giờ»). «Tối thiểu
  những người này trong danh sách nhận» không có nghĩa là bỏ van chống dội
  tin: một trưởng phòng 9 cán bộ mà nhận đủ 9 nhịp sáng mỗi ngày thì sang
  tuần sẽ tắt thông báo, và lúc đó tin cờ đỏ cũng chết theo.

## 3. GĐ theo dõi cả phòng hoặc từng thẻ

Bảng `ct2_theo_doi` (RLS: ai cũng chỉ thấy/đặt/bỏ của chính mình):

- Nút **«👁 Theo dõi phòng»** trên trang Chiêu thức 2 (chỉ vai BGĐ thấy) —
  nhận mọi nhịp và trao đổi của phòng đó.
- Nút **«👁 Theo dõi thẻ»** trong hộp thoại chi tiết — theo sát một việc.

## 4. Thu gọn việc đã hoàn thành

Cột «Hoàn thành» và «Dừng/Hủy» mặc định chỉ hé **3 thẻ** + nút «Hiện thêm N
thẻ đã kết thúc» — việc xong tích lại theo tháng sẽ kéo bảng dài vô tận, mà
thứ cần nhìn mỗi sáng là việc ĐANG chạy.

## 5. Nguồn việc «Chỉ đạo của cấp trên»

Thêm 📌 CHI_DAO bên cạnh Kế hoạch / Giao ban / Chủ động (CHECK ở DB + chip
ở form). Chọn chip là xong — GĐ quyết không hỏi thêm «ai chỉ đạo»: mỗi ô
nhập thêm là một lý do để cán bộ bỏ dở form.

## Kiểm chứng & triển khai

Migration `20260819090000` toàn bộ bổ sung, **đã áp** — bản web cũ không
ảnh hưởng. 576 test pass, build sạch. Trình duyệt thật: cột Hoàn thành 8 thẻ
hé 3 + «Hiện thêm 5», mở/thu gọn đúng.

Chưa làm: trang gom «mọi vướng mắc đang mở toàn Chi nhánh» cho GĐ (đã nêu ở
đợt Dòng thời gian — vẫn là mảnh đáng làm nhất tiếp theo).

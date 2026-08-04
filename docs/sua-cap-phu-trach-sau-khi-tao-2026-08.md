# Sửa ba cấp phụ trách sau khi thẻ đã tạo

08/2026 — theo phản ánh của Giám đốc: *«task đã nhập của những phòng như KHDN
thì user giám đốc không sửa được phó phòng, trưởng phòng và pgd phụ trách»*.

Mổ ra thì không phải một lỗi mà **ba lỗi chồng nhau**, hai trong số đó nằm ở
dữ liệu chứ không ở quyền.

---

## 1. Không có chỗ để sửa (nguyên nhân chính)

Ba cột `pho_phong` / `truong_phong` / `pgd_phu_trach` chỉ đặt được ở form **tạo
thẻ**. Trong hộp thoại chi tiết chúng là chữ chết — mà đã thế thì 23 thẻ nhập
từ board Miro cũ (KHDN 22, BGĐ 1, ra đời trước khi có ba cột này) không còn
đường nào để điền ngoài xoá thẻ tạo lại, tức là mất sạch nhật ký PDCA.

Tệ hơn: khối này **ẩn hoàn toàn khi cả ba đều trống**, nên đúng 23 thẻ cần sửa
lại là 23 thẻ không nhìn thấy dòng «Cấp phụ trách» nào.

Nay khối luôn hiện. Trống thì ghi rõ «— chưa gán cấp phụ trách» (chữ hổ phách),
lãnh đạo có nút **«Gán cấp phụ trách»** / **«Sửa»** mở form ba ô ngay tại chỗ.
Mở form thì Trưởng phòng và PGĐ điền sẵn theo danh mục phòng, **chỉ điền vào ô
đang trống** — không bao giờ đè lên lựa chọn đã có của con người.

## 2. `departments.manager_id` rỗng ở toàn bộ 10 phòng

Tính năng «tự link Trưởng phòng/PGĐ» đọc `departments.manager_id`. Cột này chỉ
TCTH có giá trị (đợt trước GĐ xác nhận Vũ Thị Thu Hà) — chín phòng còn lại
trống trơn từ đầu. Kéo theo `ct2_pgd_cua_phong()` (đi qua Trưởng phòng) luôn
trả NULL. Nói cách khác phần «tự động» chưa từng có gì để tự động.

Đã nối, **không bịa người**: chỉ trỏ tới người mà chính hồ sơ của họ ghi
`position = 'Trưởng phòng …'` và đang mang vai `manager`, và chỉ khi phòng đó
có **đúng một** người như vậy. Kết quả 10/12 phòng có Trưởng phòng và PGĐ; hai
phòng để trống đúng (BGĐ, và «Phòng giao dịch» là mục cũ không có nhân sự).

`ct2_pgd_cua_phong()` thêm đường dự phòng: phòng chưa có Trưởng phòng thì lấy
PGĐ mà **đa số cán bộ trong phòng tự khai** trong hồ sơ. Vẫn là dữ liệu người
khai, không phải suy đoán sơ đồ tổ chức.

## 3. Nút «👁 Theo dõi» tàng hình với chính Giám đốc

Giao diện dò `roles.includes('bgd')`. Trong danh bạ thật **không ai mang vai
`bgd`** — Giám đốc Chi nhánh (Trần Đức Anh) mang vai `system_admin`. Nên hai
nút «Theo dõi phòng» / «Theo dõi thẻ» làm ở đợt trước không hiện với đúng người
được làm ra để phục vụ. Nay dùng `isAdmin || isPgd`, cùng mốc mà DB dùng
(`can_view_all_action_plans()` gồm cả `system_admin`).

---

## Hàng rào ở đâu

Quyền **ghi** vốn đã đúng, không phải nới: policy UPDATE của `ct2_dau_viec` đi
qua `ct2_sua_duoc_phong()` → `can_view_all_action_plans()` → Giám đốc sửa được
thẻ của mọi phòng.

Chỗ **hở** đã vá: `f_ct2_truoc_sua_dau_viec()` liệt kê những trường cán bộ
thường không được đổi (tiêu đề, người chịu trách nhiệm, hạn, ưu tiên…) nhưng
danh sách viết trước khi có ba cột cấp phụ trách — chủ thẻ đang tự đổi được
Trưởng phòng của chính việc mình làm. Gán ai là cấp phụ trách là quyết định của
lãnh đạo, không phải của người thực hiện.

## Kiểm chứng

Chạy thẳng trên DB thật, đóng giả từng vai bằng `request.jwt.claims`, toàn bộ
trong transaction rồi rollback (đã đối chiếu lại: 23 thẻ nguyên vẹn, chưa gán):

| Vai | Thao tác | Kết quả |
| --- | --- | --- |
| Giám đốc (`system_admin`) | gán TP + PGĐ cho thẻ KHDN | ghi được 1 dòng ✅ |
| Cán bộ (chủ thẻ) | đổi `truong_phong` | bị trigger chặn ✅ |
| Trưởng phòng KHDN | gán `pho_phong` | ghi được 1 dòng ✅ |
| — | mặc định TP/PGĐ của KHDN | đều có giá trị ✅ |

596 test pass, build sạch, lint sạch trên các tệp đã sửa.

## Còn lại

22 thẻ KHDN vẫn đang trống ba cấp — nay sửa được nhưng phải mở từng thẻ. Nếu GĐ
muốn, làm thêm một nút «gán mặc định cho cả bảng» cho lãnh đạo là việc nhỏ.

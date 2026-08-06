# Phó phòng là lãnh đạo phòng — vá quyền LĐP ngày triển khai (06/08/2026)

## Phản ánh từ cán bộ (Phòng KHDN, ngay ngày ra mắt)

> - Trên Kanban PDTD, LĐP đang không thấy hồ sơ của CB nào
> - User lãnh đạo Phòng chưa nhìn được user cán bộ phụ trách
> - Khi thêm thẻ mới, user LĐP không chọn được người phụ trách là cán bộ
> - Các thẻ hiện hữu: user LĐP không sửa được nội dung, không chuyển luồng
>   được, không giao lại được cán bộ phụ trách
>
> Đề xuất: User LĐP nhìn được user toàn phòng và tác nghiệp được các nội dung trên.

## Truy nguyên: bốn triệu chứng, một gốc

Tài khoản **Trưởng phòng** theo danh mục hoạt động hoàn hảo — đóng vai TP KHDN
(Đỗ Việt Anh) kiểm chứng trực tiếp trên production: thấy 17 hồ sơ nhân sự,
48 hồ sơ PDTD, 31 đầu việc, đủ quyền sửa/chuyển/giao.

Người phản ánh là **Phó phòng**. Trong `user_roles`, mọi Phó phòng đều mang vai
`employee` — hệ thống chỉ mới cấp vai `manager` cho đúng một Trưởng phòng mỗi
phòng (theo `departments.manager_id`). Từ một chỗ đó, cả bốn triệu chứng nở ra:

| Triệu chứng | Cơ chế |
| --- | --- |
| Không thấy hồ sơ «của CB nào» | RLS `profiles` cho employee chỉ thấy mình + tuyến trên → bản đồ tên rỗng → mọi băng cán bộ trên bàn PDTD hiện «Chưa rõ cán bộ». Hồ sơ vẫn tải về (48 dòng) nhưng không gắn được với ai. |
| Không nhìn được user cán bộ | Cùng RLS trên — đóng vai Phó phòng Lê Văn Trưởng chỉ thấy đúng 4 người: mình, TP, PGĐ, GĐ. |
| Thêm thẻ không chọn được cán bộ | Picker lấy từ danh bạ đã bị che; policy INSERT cũng chỉ cho employee tự nhận việc về mình. |
| Không sửa / không chuyển / không giao lại | `ct2_la_lanh_dao_phong()` đòi vai `manager` → mọi policy UPDATE trên `ct2_dau_viec`, `ct2_ho_so_tin_dung` đóng; client (`laLanhDao`) cũng giấu nút. |

## Cách chữa: chức danh quyết định vai

Migration `20260905090000_pho_phong_mang_vai_manager.sql` — mọi profile đang
hoạt động có chức danh bắt đầu bằng **«Phó phòng»** mà còn mang vai `employee`
thì nâng lên `manager`. Đã áp production, **12 người** được nâng:

- KHDN: Hàn Thị Thùy Linh, Lê Văn Trưởng, Phạm Thị Diễm Ly
- Bán lẻ: Trần Hà Trang · DVKH: Nguyễn Thị Thu Hiên
- 7 Phó phòng giao dịch tại 5 PGD (Ân Thi, Khoái Châu, Văn Giang ×2, Văn Lâm, Yên Mỹ ×2)

Không đụng: hai Phó phòng TCTH đã đúng vai từ trước (Vũ Thị Năm = manager —
chính là tiền lệ cho cách chữa này; Nguyễn Thị Phượng = tcth_admin, vai cao
hơn), và các **Kiểm soát viên** — kiểm soát không phải lãnh đạo phòng.

**Không cần sửa một dòng mã nào**: client và RLS đều đã đọc vai từ
`user_roles`, chỉ dữ liệu vai bị thiếu.

## Kiểm chứng sau vá (đóng vai Lê Văn Trưởng, transaction rollback — không để dấu)

- Danh bạ: 17 người (đủ toàn phòng + tuyến) — trước vá: 4
- Bàn PDTD: 48 hồ sơ, băng cán bộ có tên đầy đủ
- `ct2_la_lanh_dao_phong` = true, `ct2_sua_duoc_phong` = true
- Sửa được hồ sơ của cán bộ khác (UPDATE qua RLS: 1 dòng)
- Sửa được thẻ đầu việc của cán bộ khác (UPDATE qua RLS: 1 dòng)

## Vai `manager` mở thêm gì — Giám đốc nắm để khỏi bất ngờ

Vai là toàn cục, không riêng Kanban. Phó phòng giờ cũng:

- Thấy tab **Bảng nhịp** của phòng trong Chiêu thức 2
- Xem/chấm **đánh giá** cán bộ trong phòng như Trưởng phòng
- Sửa hồ sơ nhân sự của cán bộ trong phòng (danh bạ)

Đó chính là nghĩa của «lãnh đạo phòng» — nhưng nếu Giám đốc muốn Phó phòng
hẹp hơn Trưởng phòng ở mảng nào, cần nói rõ để tách vai riêng.

## Bổ sung cùng ngày: lãnh đạo phòng thấy MỌI bảng của phòng mình

Giám đốc chốt tiếp: «Tôi muốn Phó Phòng thấy toàn bộ task kanban của Phòng mình.»

Đo trên production: thẻ ở Kanban chung và bảng chế độ PHÒNG thì cả phòng thấy
sẵn (Phó phòng KHDN thấy đủ 34/34 — con số 31 đo trước đó chỉ là 3 thẻ mới
tạo giữa hai phép đo, ngày ra mắt phòng đang nhập liên tục). Lỗ hổng cấu trúc
duy nhất: bảng chế độ **HẠN CHẾ** chỉ mở cho thành viên + BGĐ — Trưởng/Phó
phòng của chính phòng đó mà không là thành viên thì mù cả bảng lẫn thẻ
(TCTH «Mảng tổ chức» là ca thật).

Migration `20260906090000_lanh_dao_phong_thay_moi_bang_cua_phong.sql` thêm
nhánh `ct2_la_lanh_dao_phong(b.phong)` vào `ct2_xem_duoc_bang()` để lãnh đạo
phòng thấy cả bảng hạn chế.

**Nhưng Giám đốc chỉnh lại ngay trong ngày**: «Mảng tổ chức» chính là việc
riêng cần bảo mật giữa Trưởng phòng Vũ Thị Thu Hà và Giám đốc — Phó phòng
không được thấy. Nhánh vừa thêm làm hở đúng ca bảo mật đầu tiên, nên
`20260907090000_bang_han_che_bao_mat_theo_thanh_vien.sql` gỡ nó đi, hàm quay
về định nghĩa cũ. Luật chốt:

- Việc CHUNG của phòng nằm ở Kanban chung + bảng chế độ PHÒNG — cả phòng
  (dĩ nhiên gồm Trưởng/Phó phòng) thấy đủ, đo thực tế PP KHDN 34/34 thẻ.
- Bảng **HẠN CHẾ nghĩa là bảo mật theo thành viên**: chỉ người được thêm
  đích danh + Ban Giám đốc + system_admin. Muốn Phó phòng nào thấy một bảng
  hạn chế cụ thể thì thêm họ làm thành viên bảng đó — van chỉnh từng bảng,
  không phải luật chung.

Kiểm chứng sau hai lượt (đóng vai, rollback):

- Phó phòng TCTH Vũ Thị Năm: 2 bảng chế độ PHÒNG + 68 thẻ toàn phòng;
  «Mảng tổ chức» đã khép lại đúng yêu cầu bảo mật
- Trưởng phòng Vũ Thị Thu Hà: vẫn đủ 3 bảng (thấy «Mảng tổ chức» nhờ là
  thành viên); Giám đốc vào bằng vai bgd
- Cán bộ Chu Thị Thủy (không lãnh đạo): vẫn chỉ 2 bảng chế độ PHÒNG
- Bảng riêng «Việc của …» của Ban Giám đốc: kín như cũ

## Lưu ý vận hành

Đây là **backfill**, không phải luật tự động. Khi thêm Phó phòng mới trên màn
Thêm cán bộ, phải chọn vai **Quản lý** — quên là bộ triệu chứng này quay lại
với người mới.

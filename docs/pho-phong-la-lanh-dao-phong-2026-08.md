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

## Lưu ý vận hành

Đây là **backfill**, không phải luật tự động. Khi thêm Phó phòng mới trên màn
Thêm cán bộ, phải chọn vai **Quản lý** — quên là bộ triệu chứng này quay lại
với người mới.

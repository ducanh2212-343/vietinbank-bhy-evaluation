# Sửa tên/nội dung công việc — theo đề xuất của Trưởng phòng KHDN (08/2026)

## Đề xuất

Trưởng phòng KHDN muốn sửa được **tên và nội dung** của công việc.

## Rà hai bàn: một bàn đã đủ, một bàn quyền có mà đường không

**Đầu việc Kanban** — đã đủ từ các đợt trước, không phải làm gì thêm:

| Muốn sửa | Đường vào (đều mở cho lãnh đạo Phòng) |
| --- | --- |
| Tên việc, người làm, ngày, ưu tiên, loại, tiến độ | «Sửa thông tin thẻ» trong hộp thoại chi tiết |
| Nội dung: kết quả đầu ra · gắn mục tiêu · cách làm | «Sửa kế hoạch làm» |
| Cấp phụ trách (PP/TP/PGĐ, lãnh đạo theo dõi) | mục «Cấp phụ trách» |

**Hồ sơ PDTD** — trigger `f_ct2_hs_truoc_sua` vốn ĐÃ cho lãnh đạo phòng đổi
tên khách hàng / cán bộ phụ trách / loại hồ sơ, nhưng client không có ô nhập
nào: tên khách là tiêu đề tĩnh, cán bộ là dòng chỉ-đọc. Quyền nằm chết trong
DB — gõ sai tên khách hay cần giao lại hồ sơ là bó tay.

## Đã làm

### Client — mục «Bổ sung / sửa thông tin» của hộp thoại hồ sơ

Thêm ba ô, **chỉ lãnh đạo Phòng thấy** (cán bộ vẫn chỉ thấy các ô cũ):

- **Tên khách hàng** — sửa tại chỗ, tối thiểu 3 ký tự
- **Cán bộ phụ trách** — chọn trong cán bộ của phòng; đổi là giao lại hồ sơ,
  form nhắc ngay «người mới sẽ nhận thông báo, lần đổi được lưu vết»
- **Loại hồ sơ** — cấp mới / tái cấp / điều chỉnh / cơ cấu nợ / dự án / giải ngân

Vẫn ba luật cũ của form: chỉ gửi trường thực sự đổi · chặn trước bằng câu
tiếng Việt · hàng rào thật ở database.

### Database — migration `20260908090000` vá hai chỗ khuyết đi kèm

1. **Nhật ký**: trigger chỉ ghi vết trạng thái / số tiền / hạn xử lý. Đổi tên
   khách và đổi cán bộ — hai thay đổi nặng ký nhất về trách nhiệm — nay cũng
   vào `ct2_nhat_ky_thay_doi`.
2. **Thông báo**: `HS_GIAO` trước chỉ bắn khi MỞ hồ sơ mới. Giao lại hồ sơ
   đang chạy thì người mới không biết gì — nay can_bo đổi là người mới nhận
   ngay «Hồ sơ tín dụng được giao lại cho anh/chị» kèm khách hàng, số tiền,
   hạn xử lý.

## Kiểm chứng trên production (danh tính TP KHDN, transaction rollback)

Đổi tên khách + giao hồ sơ THU_THAP cho cán bộ khác trong một lệnh:
vết `khach_hang` ✅ · vết `can_bo` ✅ · thông báo tới người được giao ✅.
Cán bộ thường đổi các trường này vẫn bị trigger chặn như cũ (luật có sẵn).

Bài học đo đạc ghi lại cho lần sau: INSERT do trigger sinh ra trong CTE
data-modifying **không đọc được trong cùng câu lệnh** (cùng snapshot) — phép
đo đầu trả 0/0/0 giả; phải tách UPDATE và SELECT thành hai lệnh trong cùng
transaction.

627/627 test · typecheck (`tsconfig.app.json`) · build sạch.

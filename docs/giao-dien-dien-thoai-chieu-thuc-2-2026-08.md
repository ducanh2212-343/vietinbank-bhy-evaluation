# Rà giao diện điện thoại — Chiêu thức 2

08/2026. Trả lời báo lỗi của Giám đốc: *"không chọn được bảng khác ngoài
bảng kanban của phòng. rà lại toàn bộ giao diện khi dùng điện thoại."*

---

## Lỗi chặn: ba trong bốn tab bấm không tới

`TabsList` của thư viện là `inline-flex` **không có cuộn**. Ở khổ 390px, bốn
nhãn tiếng Việt («Việc của tôi» · «Kanban của Phòng» · «Phê duyệt tín dụng» ·
«Bảng nhịp») rộng ~500px — tràn khỏi màn, «Phê duyệt tín dụng» còn mỗi cái
icon ở mép phải và «Bảng nhịp» **mất hẳn**. Đó chính là «không chọn được
bảng khác»: không phải chọn sai, mà là **bấm không tới**.

Hai lớp sửa, đo bằng trình duyệt thật chứ không ước lượng:

| | Trước | Sau |
|---|---|---|
| Tổng rộng 4 tab @390px | ~500px | **363px** (khung 374px) |
| Tab nằm trọn trong màn | 2/4 | **4/4** |

- **Nhãn ngắn trên điện thoại**, đủ dài trên máy tính: Của tôi · Phòng · Tín
  dụng · Nhịp (`sm:hidden` / `hidden sm:inline`).
- **Khung cuộn ngang** bọc ngoài làm lưới an toàn cho máy hẹp hơn 390px hoặc
  cỡ chữ hệ thống lớn — không bao giờ lặp lại cảnh mất tab.

## Ba chỗ khác chật trên điện thoại

**Hàng điều khiển xếp ba tầng.** Select phòng `w-full` chiếm trọn một hàng,
nút «Ghi việc» một hàng, nút «Theo dõi phòng» một hàng — đẩy bảng Kanban
xuống quá nửa màn. Nay **một hàng**: select co lại (`flex-1 min-w-0`), nút
Theo dõi thu thành icon 👁, nút Ghi việc giữ nguyên cỡ chạm được.

**Dải chip chọn bảng xuống nhiều hàng.** Đổi sang cuộn ngang (`shrink-0
whitespace-nowrap`) — cùng kiểu với dải nhịp phòng, một hàng dù có bao nhiêu
mảng.

**Ba cấp phụ trách chiếm ba dòng** trong hộp thoại chi tiết. Gộp một ô «Cấp
phụ trách» với nhãn viết tắt PP · TP · PGĐ — bớt bốn dòng, vì đây là thông
tin tra cứu chứ không phải thứ đọc mỗi ngày.

**Tên trong dải nhịp bị cắt** (`w-14` = 56px không đủ cho «Huyền Trang»).
Nới lên `w-16`.

## Đã kiểm chứng ở 390px bằng trình duyệt thật

| Màn | Kết quả |
|---|---|
| Trang Chiêu thức 2, tab Kanban của Phòng | không tràn ngang (390/390), 4/4 tab bấm được |
| Chế độ Cột (Kanban ngang) | không tràn trang — bảng cuộn trong khung riêng |
| Hộp thoại chi tiết thẻ | không tràn, ba cấp phụ trách gọn một dòng |
| Hộp thoại tạo bảng Kanban | không tràn, ba nhóm lựa chọn đủ chỗ chạm |

596 test pass, build sạch, lint sạch. Thuần giao diện — không đổi database.

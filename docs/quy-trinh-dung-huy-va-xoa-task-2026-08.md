# Quy trình dừng / hủy / xoá một đầu việc

08/2026 — nghiên cứu theo yêu cầu của Giám đốc. Kết luận ngắn: **hệ thống hiện
có «Dừng/Hủy» và KHÔNG có «Xoá»** — và chỗ thiếu thật không phải nút xoá, mà là
đường dọn thẻ nhập nhầm.

---

## 1. Hiện trạng

### Dừng/Hủy — có, và có rào tử tế

Chuyển thẻ sang cột **⛔ Dừng/Hủy** (`DUNG_HUY`). Trigger
`f_ct2_truoc_sua_dau_viec` chặn hai điều:

- Chỉ **lãnh đạo Phòng trở lên** làm được (`ct2_sua_duoc_phong`).
- Bắt buộc `ly_do_dung_huy` **≥ 30 ký tự**.

Thẻ ở lại bảng, nằm trong cột Dừng/Hủy, mặc định chỉ hé 3 thẻ. Nhật ký PDCA và
trao đổi giữ nguyên. Với PDTD, tương đương là bước **Từ chối / Dừng**
(`TU_CHOI`), cũng đòi lý do.

Đây là thiết kế đúng cho **hủy nghiệp vụ**: việc có thật, đã bàn, nay không làm
nữa. Vết phải còn.

### Xoá — không có, và đang bị chặn bằng cách hơi mong manh

Không bảng `ct2_*` nào có **policy DELETE**, nên RLS từ chối theo mặc định. Ứng
dụng cũng không có nút xoá nào.

Nhưng: `authenticated` **và cả `anon`** đang được **GRANT DELETE** trên toàn bộ
bảng `ct2_*`. Hôm nay vô hại vì RLS chặn, nhưng cái chặn là *sự vắng mặt của
một policy*, không phải một quyết định. Ai đó thêm policy DELETE cho một mục
đích khác là cửa mở sẵn. Nên thu hồi GRANT cho `anon` và chỉ cấp DELETE đúng
bảng thật sự cần.

### Nếu xoá cứng thì mất gì

Khoá ngoại trỏ về `ct2_dau_viec` / `ct2_ho_so_tin_dung`:

| Bảng con | Khi xoá thẻ cha |
| --- | --- |
| `ct2_nhip_pdca` | **CASCADE — xoá theo** |
| `ct2_nhip_ho_so` | **CASCADE — xoá theo** |
| `ct2_thong_bao` | CASCADE — xoá theo |
| `ct2_de_xuat` | SET NULL (giữ đề xuất, mất liên kết) |

Nghĩa là một lệnh xoá thẻ sẽ **xoá sạch nhật ký PDCA** của thẻ đó, không hỏi
lại. Đây là lý do mạnh nhất để không mở nút «Xoá» cho bảng Kanban.

## 2. Chỗ thiếu thật

Dừng/Hủy phục vụ đúng **hủy nghiệp vụ**, nhưng đang bị dùng nhầm cho một ca
khác hẳn: **thẻ nhập nhầm** — gõ sai, tạo trùng, chọn nhầm phòng, bấm nhầm nút.

Bắt một thẻ gõ nhầm phải có ≥30 ký tự lý do rồi nằm vĩnh viễn trong cột Dừng/Hủy
là sai loại thước. Hệ quả thấy được: cột Dừng/Hủy lẫn rác với quyết định thật,
và số liệu «bao nhiêu việc bị hủy trong kỳ» mất nghĩa.

## 3. Đề nghị: hai đường, tách bạch

### Đường A — «Dừng/Hủy» (giữ nguyên)

Việc có thật, không làm nữa. Lãnh đạo Phòng, lý do ≥30 ký tự, thẻ ở lại có vết.
Không đổi gì.

### Đường B — «Gỡ thẻ nhập nhầm» (làm mới)

Cửa hẹp, có điều kiện chặt để không thành cửa xoá vạn năng:

- Chỉ mở khi thẻ **còn sạch**: trạng thái `CHUAN_BI`, **chưa có nhịp PDCA nào**,
  **chưa có trao đổi nào**, và **được tạo trong vòng 24 giờ**.
- Chỉ **người tạo thẻ** hoặc **lãnh đạo Phòng** thấy nút.
- **Không xoá vật lý.** Đặt `da_go = true` + `go_boi` + `go_luc` + lý do ngắn
  (một dòng, không bắt 30 ký tự). Thẻ biến khỏi mọi bảng và mọi thống kê, còn
  nguyên trong DB.
- TCTH có màn «thẻ đã gỡ» để phục hồi nếu gỡ nhầm.

Vì sao không xoá vật lý dù thẻ «còn sạch»: điều kiện *chưa có nhịp, chưa có trao
đổi* kiểm ở thời điểm bấm, còn thông báo thì có thể đã bắn đi rồi. Xoá hẳn dòng
làm thông báo trỏ vào hư không. Cờ `da_go` rẻ hơn và hoàn tác được.

### Kèm theo: dọn quyền

- `REVOKE DELETE ... FROM anon` trên toàn bộ `ct2_*`.
- Giữ DELETE cho `authenticated` chỉ ở những bảng thật sự cần xoá dòng
  (`ct2_theo_doi`, `ct2_bang_thanh_vien`, `ct2_cam_xuc`), thu hồi ở phần còn lại.
- Xoá cứng một đầu việc: chỉ `service_role`, tức là chỉ qua can thiệp có chủ ý
  của quản trị, không qua giao diện.

## 4. Ước lượng

| Việc | Quy mô |
| --- | --- |
| Cột `da_go/go_boi/go_luc/ly_do_go` + trigger điều kiện + lọc khỏi mọi truy vấn | 1 migration |
| Nút «Gỡ thẻ nhập nhầm» trong hộp thoại + xác nhận | ~60 dòng |
| Màn «thẻ đã gỡ» cho TCTH + phục hồi | ~80 dòng |
| Dọn GRANT DELETE | 1 migration ngắn, làm được ngay và độc lập |

Chưa làm gì — chờ Giám đốc chốt. Riêng phần **dọn GRANT DELETE** thì nên làm
sớm và không phụ thuộc quyết định nào ở trên.

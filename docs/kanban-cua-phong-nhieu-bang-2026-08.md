# «Kanban của Phòng»: 4 cột, nhiều bảng theo mảng, liên phòng, cấp phụ trách

08/2026, theo chỉ đạo trực tiếp của Giám đốc Chi nhánh.

---

## 1. Đổi tên và bỏ ba cột

«Bảng của Phòng» → **«Kanban của Phòng»**. Bảng từ 7 cột còn **4 cột**:
Chuẩn bị · Đang làm · Hoàn thành · Dừng/Hủy. Bỏ «Chờ phối hợp», «Chờ ý
kiến/duyệt», «Đã đóng».

Vì sao bỏ được mà không tiếc: Kanban vận hành theo stand-up hằng ngày — trạng
thái «chờ» diễn đạt bằng cờ vàng/đỏ kèm câu «Đang vướng vì…» trong nhịp, chỗ
đó nói được VÌ SAO chờ, còn một cột chờ thì không. Kiểm tra dữ liệu thật
trước khi bỏ: **0 thẻ** đang ở ba trạng thái này trên toàn hệ thống.

An toàn dữ liệu: mã trạng thái cũ vẫn hợp lệ trong kiểu và database; thẻ di
sản (nếu có) được `cotHienThi()` xếp về cột gần nghĩa nhất (chờ → Đang làm,
đã đóng → Hoàn thành) — **không thẻ nào biến mất**. Đã kiểm bằng trình duyệt
với một thẻ CHO_DUYET giả lập.

Ô thống kê «Nghẽn cột chờ» (không còn cột chờ để đo) thay bằng «Thẻ thiếu
thông tin».

## 2. Nhiều bảng Kanban một phòng

Bảng `ct2_bang`: mỗi phòng ngoài **Kanban chung** tạo thêm bảng cùng mẫu cho
từng mảng công việc. Dải chip chọn bảng nằm trên đầu tab.

**Bảng liên phòng đặt ở PHÒNG ĐẦU MỐI** — đây là câu trả lời cho câu hỏi
«cho vào đâu» của GĐ. Không treo lên trang chủ Chiêu thức 2: trang chủ là
nơi tổng hợp, không phải nơi sở hữu việc; một bảng phải có đúng một phòng
chịu trách nhiệm. Người phòng khác được thêm làm thành viên thì bảng **tự
hiện trong màn của họ** (chip nét đứt, ghi tên phòng đầu mối).

**Phân quyền thành viên** — hàng rào là RLS, không phải giao diện:

| Chế độ | Ai thấy |
|---|---|
| PHONG | Ai xem được Kanban phòng thì xem được |
| HAN_CHE 🔒 | Chỉ thành viên đích danh + BGĐ. Người khác không thấy cả cái chip |

Chỉ lãnh đạo phòng (hoặc BGĐ) tạo bảng — bảng mọc tự do là bảng chết tự do.
Không có DELETE: bảng chứa lịch sử đầu việc.

## 3. Mảng của Phòng TCTH — gieo sẵn

Ba bảng theo đúng ví dụ của GĐ: **Mảng hành chính** (cả phòng) · **Mảng tổng
hợp** (cả phòng) · **Mảng tổ chức** (🔒 hạn chế).

Về «chỉ GĐ và Trưởng phòng hoặc Phó phụ trách thấy được»: hệ thống **không
đoán ai là "phó phụ trách" từ chức danh** — danh sách thành viên chính là
hàng rào. Đã gieo Trưởng phòng TCTH (vai trò manager) làm thành viên đầu
tiên; Trưởng phòng tự thêm Phó phụ trách bằng nút «⚙️ Thành viên & cài đặt».
BGĐ luôn xem được (yêu cầu gốc: Giám đốc phải thấy).

## 4. Ba cấp phụ trách khi ghi việc

Khối «Các cấp phụ trách» trong hộp thoại Ghi việc: **Phó phòng · Trưởng
phòng · PGĐ phụ trách**.

- Trưởng phòng tự điền từ danh mục phòng (`manager_id`) — sửa được.
- **PGĐ phụ trách tự link** qua RPC `ct2_pgd_cua_phong` (pgd_id của Trưởng
  phòng) — sửa được, đúng yêu cầu «tự động link, chỉnh sửa được». Danh sách
  ứng viên PGĐ suy từ danh bạ (ai đang là pgd_id của ít nhất một cán bộ).
- Phó phòng chọn tay — hệ thống không biết phó nào phụ trách mảng việc nào.
- `lanh_dao_theo_doi` (định tuyến thông báo) = Trưởng phòng đã chọn, giữ
  nguyên cơ chế cũ.

Hộp thoại chi tiết thẻ hiện cấp nào đã gán, không bày ô trống vô nghĩa.

## 5. Thứ tự triển khai

Migration `20260818090000` **toàn bộ là bổ sung** (bảng mới + cột nullable)
— đã áp trước, bản web cũ không ảnh hưởng. Không có bước nhập dữ liệu.

## 6. Đã kiểm chứng

576 test pass (thêm 2: bốn cột đúng danh sách; thẻ trạng thái cũ xếp về cột
gần nghĩa). Build sạch, lint sạch. Trình duyệt thật: bảng 4 cột, thẻ
CHO_DUYET di sản hiện trong «Đang làm», hộp thoại tạo bảng đủ ba nhóm lựa
chọn.

## 7. Chưa làm

- Sửa ba cấp phụ trách SAU khi tạo thẻ (hiện chỉ nhập lúc ghi việc; sửa sau
  cần thêm mục vào hộp thoại chi tiết).
- Chuyển thẻ giữa các bảng của cùng phòng.
- Báo cáo gộp theo bảng trong màn điều hành BGĐ.

# Bấm thông báo mở thẳng việc liên quan — để trao đổi luôn

Giám đốc đặt hàng 07/08/2026: *«khi hiện thông báo thì ấn vào thông báo sẽ
hiển thị luôn task/hoặc công việc có liên quan để có thể trao đổi luôn»*.

## Rà hiện trạng: một nửa đã có, một nửa hổng

| Loại tin | Trước | Sau |
| --- | --- | --- |
| Đầu việc Kanban (giao việc, nhịp, trao đổi) | Đã mở thẳng thẻ (`?the=`) | Giữ nguyên |
| **Hồ sơ PDTD** (được giao, trình duyệt, trả về, từ chối, nhịp, trao đổi) | Chỉ mở chung tab tín dụng — người duyệt tự tìm giữa 48 hồ sơ | **Mở thẳng hồ sơ** (`?ho_so=`), hộp thoại có sẵn ô Trao đổi |

Gốc của lỗ hổng: bảng `ct2_thong_bao` chỉ có cột `dau_viec_id`, không có chỗ
ghi tin này nói về hồ sơ nào. Với người phê duyệt — đối tượng nhận nhiều tin
«Có hồ sơ chờ anh/chị» nhất — đây chính là chỗ rơi.

## Đã làm

**Database — migration `20260912090000`** (đã áp production):

- `ct2_thong_bao` thêm `ho_so_id` (FK, ON DELETE SET NULL).
- `ct2_dat_thong_bao` nhận thêm `_ho_so_id` — đổi chữ ký nên phải DROP/CREATE;
  tham số mới có DEFAULT NULL nên **mọi chỗ gọi 6 tham số cũ chạy nguyên**,
  không phải đụng các hàm phát tin không liên quan hồ sơ. ACL tái lập đúng
  hiện trạng đo trước khi đổi (postgres + service_role).
- Ba hàm phát tin hồ sơ truyền mã vào: `f_ct2_thong_bao_ho_so` (giao/giao
  lại · trình · trả · từ chối), `f_ct2_hs_thong_bao_nhip` (nhịp),
  `f_ct2_thong_bao_binh_luan` (trao đổi phạm vi hồ sơ).

**Đường dẫn — hai nơi phải trùng nhau:**

- `notify-ct2` (push) và `duongDanThongBao()` (chuông) cùng thêm nhánh:
  `dau_viec_id` thắng → `ho_so_id` → mã `HS_*` không mã (tin cũ trước
  08/2026) vẫn về tab tín dụng → mặc định.

**Client — `OneMove2Page`:** đường `?ho_so=` đối xứng với `?the=` — tải riêng
một hồ sơ (không tìm trong board vì người nhận có thể đang đứng phòng khác
và board chưa tải xong), chuyển bảng về đúng phòng của hồ sơ, mở hộp thoại,
xoá tham số sau khi dùng. Ô Trao đổi nằm ngay trong hộp thoại — đúng chữ
«để có thể trao đổi luôn».

## Kiểm chứng trên production (rollback, không để dấu)

- Đóng vai Ngô Thị Nhung ghi nhịp hồ sơ Đại Lợi → 3 tin cho TP Đỗ Việt Anh,
  PGĐ Thái Hoàng, PP Diễm Ly — **tin nào cũng mang đúng mã hồ sơ**.
- Gọi kiểu 6 tham số cũ → chạy nguyên (hồi quy chữ ký).
- 632/632 test (thêm test đường dẫn: hồ sơ mở thẳng, đầu việc thắng khi có
  cả hai, tin cũ không mã về tab) · typecheck · build sạch.

## Lưu ý

- Tin phát **trước** đợt này không có mã hồ sơ → bấm vẫn về tab tín dụng như
  cũ, không hỏng.
- Phần chuông + mở hồ sơ trên màn hình cần deploy bản build mới; push (đường
  dẫn trong notification) đã chạy ngay vì edge function đã triển khai.

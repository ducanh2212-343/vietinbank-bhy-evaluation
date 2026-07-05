# ĐỢT CẢI TIẾN 4 — Các hạng mục còn lại từ báo cáo rà soát

**Ngày:** 05/07/2026. TypeScript sạch, build OK, 17/17 test pass ở mỗi bước.

## 4.1. Hợp nhất nguồn dữ liệu xếp sao (đã xong)

**Vấn đề:** Báo cáo đọc bảng chuẩn `staff_star_classifications`, còn Tổng quan / Phân nhóm cán bộ / Đội ngũ phòng ban / Danh sách cán bộ / Chi tiết cán bộ đọc bảng cũ `admin_evaluations.classification`, KHÔNG lọc theo kỳ → số liệu 4 nhóm sao lệch nhau giữa các trang; ma trận cộng dồn nhiều kỳ (1 cán bộ xuất hiện nhiều nhóm), tile "Chưa phân nhóm" có thể âm.

**Sửa:**
- Thêm helper dùng chung `src/lib/starClassification.ts`:
  - `fetchDefaultCycle()` — kỳ quý mới nhất.
  - `fetchStarByEmployee(cycleId)` — bản đồ xếp sao/cán bộ, chọn bản ghi ưu tiên **giống hệt logic của Báo cáo** (đã duyệt trước, cấp GĐ > PGĐ > TP) → đảm bảo mọi trang ra cùng con số.
  - Hằng số nhãn/màu nhóm sao dùng chung.
- Chuyển 5 trang sang nguồn chuẩn, lọc theo **kỳ mới nhất**: `Overview` (đếm mỗi cán bộ tối đa 1 lần → hết âm "Chưa phân nhóm"), `StaffGrouping` (lọc `status='active'`, hiển thị tên kỳ, hết cộng dồn nhiều kỳ), `StaffList`, `TeamOverview` (cột "Nhóm"), `StaffDetail` (badge nhóm).
- Không đổi bảng/ghi dữ liệu — chỉ đổi đường ĐỌC hiển thị. Các cột legacy khác (mức skill, completion_status) tạm giữ nguyên (ngoài phạm vi hợp nhất xếp sao).

**Lưu ý:** Hiện cả hai bảng đều rỗng (đang pilot) nên chưa thấy khác biệt trực quan; đây là sửa PHÒNG NGỪA để khi bắt đầu xếp sao kỳ tới, số liệu đồng nhất mọi trang.

## Các hạng mục kế tiếp (sẽ làm tiếp)
- Khóa lạc quan chống ghi đè từ tab cũ / 2 người cùng sửa.
- Gói "Bàn giao nhân sự" khi chuyển phòng/nghỉ việc + lưu trữ trước khi xóa.
- Nối email nhắc việc (phiếu bị trả, chờ duyệt quá hạn, thẻ chờ xác nhận).

# Kanban Phòng lên trang chủ · tinh gọn cửa nhập · bàn PDTD bỏ cột trùng

*Tháng 8/2026 — theo bốn chỉ đạo liên tiếp của Giám đốc trong một buổi.*

## 1. «Kanban Phòng của tôi» ngay trên trang chủ

Giống Kanban phát triển cá nhân: vào cổng là thấy việc của mình theo cột, và
**nhập được tại chỗ** — ghi nhịp nhanh, mở thẻ, ghi việc mới — không phải nhảy
sang trang Chiêu thức 2 rồi tự tìm thẻ của mình giữa thẻ cả phòng.

- Chia **theo bảng**, không gộp: TCTH có «Mảng Tổng hợp» và «Mảng Hành chính»
  riêng — gộp lại là xoá đúng ranh giới phòng đã tự vạch. Mỗi bảng một chip,
  chip có chấm đỏ khi bảng có thẻ cần xử lý.
- Ba cột Chuẩn bị / Đang làm / Hoàn thành; thẻ xong chỉ giữ **14 ngày** trên
  trang chủ (bảng Phòng vẫn giữ đủ).
- Không kéo-thả ở đây: chuyển cột có cổng chặn cần chỗ giải thích, đi qua hộp
  thoại thẻ như cũ.
- «Ghi nhịp nhanh» tách thành `Ct2GhiNhipNhanh` dùng chung — trước nằm kẹt
  trong trang Chiêu thức 2, hai nơi cần thì phải có một cửa, không phải hai bản sao.

## 2. Bỏ ô chọn P/D/C/A khi ghi nhịp

Cùng lý lẽ đợt bỏ cổng Check/Act: Kanban là vòng lặp làm-liên-tục, bắt cán bộ
mỗi sáng phân loại câu của mình vào bốn ô lý thuyết là thêm một bước suy nghĩ
không đổi lấy quyết định nào. Cột `nhan_pdca` **vẫn ghi** (suy từ trạng thái
thẻ) nên nhật ký cũ đọc tiếp được; dòng Kế hoạch vẫn phân biệt được trên dòng
thời gian (🧭), còn lại đều là 📊 Báo cáo.

## 3. Hộp thoại thẻ thu gọn

GĐ chê dàn trang dài, rộng, nhiều lời dẫn. Đã: thu khổ (max-w-3xl → 2xl), cảnh
báo thiếu thông tin còn một dòng, khối «Bắt đầu làm» còn một dòng, các trường
5W2H **trống thì không bày** («— chưa ghi» ×3 chỉ làm dài trang), lời dẫn của
dòng thời gian gỡ hết. Hướng dẫn duy nhất còn giữ là công thức ghi nhịp — đúng
nguyên văn đặt hàng:

> **Hôm qua đã làm gì · kế hoạch hôm nay · đề xuất gì (nếu có)**

(`CT2_CONG_THUC_NHIP` trong `src/lib/ct2.ts`; placeholder đổi theo cờ.)

## 4. Bàn PDTD: bỏ cột «Đến hạn GHTD 2 tháng tới», giữ cảnh báo

Các hồ sơ đến hạn GHTD được **cho trước vào bảng** chính là để đi tiếp sang
«Thu thập hồ sơ» — chúng nằm ở bước thật, việc gì phải hiện trùng thêm ở một
cột giả nữa. Đã bỏ cột dẫn xuất. Giữ lại đúng thứ có giá trị điều hành:

- Ô **«Hạn mức sắp hết»** trên dải số — **bấm vào ra tên khách hàng**, chia
  hai nhóm: *chưa có hồ sơ* (nguy hiểm nhất — không nằm trên bảng của ai) và
  *hồ sơ đang chạy, chưa xong*. Bấm tên mở thẳng hồ sơ.
- Khách đã có hồ sơ tái cấp **hoàn thành** nối tiếp hạn cũ thì thôi cảnh báo —
  cờ `da_xong_ho_so_moi` mới trong RPC `ct2_pdtd_sap_den_han`
  (migration `20260828090000`, đã áp production; DROP/CREATE xong có REVOKE
  lại anon vì ACL mặc định mở EXECUTE cho PUBLIC).
- **Hàng tiêu đề cột dính khi cuộn xuống** — bảng có khung cuộn dọc riêng
  (max-h 75vh) vì `sticky top` không ăn theo trang bên trong một khung
  overflow; kéo tới băng cán bộ thứ mấy vẫn biết cột nào là cột nào.

Kiểm chứng trên dữ liệu KHDN: 13 khách trong cửa sổ 60 ngày = 7 chưa có hồ sơ
+ 6 đang chạy chưa xong (3 THU_THAP, 3 TRINH_TSC), 0 đã xong — khớp từng dòng
với phân loại của client.

## Đã kiểm

592 test qua (4 test của hàm dải đến hạn client đã gỡ theo cột), tsc sạch,
lint sạch trên các tệp chạm tới, build production qua.

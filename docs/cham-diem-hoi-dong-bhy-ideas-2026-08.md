# Chấm điểm Hội đồng Bac Hung Yen Ideas — 08/2026

Thay Google Form của **Phụ lục 06** (quy chế chương trình Bac Hung Yen Ideas)
bằng phiếu chấm ngay trong BHY One, tại `/one/y-tuong/hoi-dong`.

## Nghiệp vụ (bám quy chế mục VI + Phụ lục 06/07)

- Phòng TCTH mở **đợt chấm**, trình các ý tưởng đã bật cờ «Đề xuất Hội đồng»
  ở bảng theo dõi, cấp mã `BHYI-<năm>-NNN` và **tầng xét** (3 tầng, xem dưới).
  Kỳ quý xét Vươn cành; **kỳ xét Lan tỏa là đợt riêng** do TCTH mở tại thời
  điểm phù hợp (đầu hoặc cuối quý IV) để đánh giá quá trình triển khai của
  các ý tưởng đã đạt Vươn cành.
- Thành viên Hội đồng (Ban Giám đốc, PGĐ, Trưởng/Phó phòng, lãnh đạo TCTH —
  vai trò `bgd`/`pgd`/`manager`/`tcth_admin`; người được Giám đốc bổ sung thì
  cấp vai trò tương ứng) chấm **một phiếu định danh/ý tưởng**:
  - A1–A3 (họ tên, chức danh, tài khoản) lấy từ tài khoản đăng nhập — không khai lại;
  - A4 khai xung đột lợi ích; C1–C5 chấm 5 tiêu chí thang 1–5;
  - D1 đề xuất; D2 góp ý (bắt buộc khi «Không xét thưởng»/«Cần bổ sung» —
    ràng buộc cả ở CHECK constraint).
  - Phiếu sửa được đến khi đợt **chốt** (RLS chặn theo trạng thái đợt).
- **Bảo mật điểm cá nhân** (chốt 08/2026 — chặt hơn quy chế): kết quả chấm của
  từng thành viên **ẩn danh với cả Phòng TCTH và Ban Giám đốc**, chỉ System
  Admin đọc được phiếu định danh (RLS chỉ mở cho vai trò `system_admin`).
  TCTH vẫn vận hành đầy đủ trên dữ liệu ẩn danh: RPC `bhy_ideas_hd_phieu_an_danh`
  trả phiếu không danh tính, không mốc thời gian gửi (tránh suy ngược người
  chấm theo giờ), sắp theo uuid ngẫu nhiên. Thành viên xem **bản tổng hợp**
  (Phụ lục 07) qua RPC sau khi đợt chốt, góp ý ẩn danh.
- **Xung đột lợi ích (mục VI.4)**: thành viên khai báo trong phiếu (câu A4);
  lời khai hiện trên phiếu ẩn danh và được ĐẾM trong bản tổng hợp («⚠ n khai
  XĐLI») để Hội đồng cân nhắc khi kết luận. **Mọi phiếu đều tính vào điểm** —
  cơ chế «phiếu tham khảo» (loại phiếu khỏi điểm TB) đã bỏ theo chốt vận hành:
  khi phiếu ẩn danh với cả TCTH thì việc gạt loại từng phiếu không còn cách
  thao tác minh bạch; trường hợp cần thiết, Hội đồng đề nghị thành viên có
  xung đột KHÔNG chấm ý tưởng đó ngay từ đầu.

## Ba tầng xét và mô hình thưởng CỘNG DỒN

Chốt vận hành 08/2026 (văn bản chương trình sẽ cập nhật cụ thể sau):

| Tầng trình Hội đồng | Đối tượng | Ngưỡng (mục VI.3) | Thưởng khi đạt |
|---|---|---|---|
| **Xét Vươn cành** (kỳ quý) | Ý tưởng chưa đạt Vươn cành | TB chung ≥ 3,5 · An toàn/rủi ro ≥ 3 · ≥ 2/3 đồng ý | 1.000.000đ |
| **Xét nâng lên Lan tỏa** (kỳ xét riêng, đầu/cuối quý IV) | Ý tưởng **đã đạt Vươn cành** (đã nhận 1M) | TB chung ≥ 4,0 · Nhân rộng ≥ 4 · An toàn ≥ 3 · ≥ 2/3 đồng ý Lan tỏa | **Thưởng thêm** 2.000.000–3.000.000đ |
| **⚡ Xét thẳng Lan tỏa** (đặc biệt) | Ý tưởng chưa qua Vươn cành được xét thẳng — mang **dấu hiệu nhận diện riêng** trên phiếu chấm và cảnh báo ở khung quản trị | Như Lan tỏa; hụt Lan tỏa nhưng đủ Vươn cành thì hạ về Vươn cành | **Gộp cả hai mức** 3.000.000–4.000.000đ |

Ở kỳ xét nâng lên Lan tỏa, nếu không đạt thì ý tưởng **giữ Cấp độ Vươn cành**,
không thưởng lại mức Vươn cành. Khung quản trị lọc ứng viên theo tầng: kỳ xét
nâng chỉ liệt kê ý tưởng đang ở cấp độ Vươn cành.

Quy ước đã chốt trong code (unit test kèm theo):

- «Số phiếu hợp lệ» = số thành viên đã gửi phiếu (mọi phiếu đều tính); tỷ lệ
  2/3 so trên số này và so **nguyên** (`3×đồng ý ≥ 2×hợp lệ`) để biên 2/3
  không trượt số thực.
- Đồng ý **Vươn cành** tính cả phiếu «Đồng ý Lan tỏa» (tầng cao bao hàm tầng dưới);
  đồng ý **Lan tỏa** chỉ tính phiếu Lan tỏa.
- Điểm TB chung = trung bình 5 điểm TB tiêu chí (Phụ lục 07).
- Kết luận hệ thống chỉ là **gợi ý theo ngưỡng**, không vượt quá tầng TCTH trình;
  quyết định cuối cùng thuộc Hội đồng. Sau khi Hội đồng chốt, TCTH cập nhật cấp
  độ phát triển của ý tưởng ở bảng theo dõi BHY Ideas như hiện nay.
- Lưu ý dự toán: bảng thống kê/Excel hiện đếm ý tưởng theo cấp độ HIỆN TẠI với
  đơn giá một cấp (Lan tỏa = 3M cận trên). Khi văn bản chốt mô hình cộng dồn,
  cần rà lại cách dự toán (ý tưởng Lan tỏa thực nhận 1M + 2-3M).

## Kỹ thuật

- Migration `20260924090000_bhy_ideas_cham_diem_hoi_dong.sql`: 3 bảng
  `portal_idea_council_rounds/_items/_votes`, hàm thành viên
  `bhy_ideas_hd_la_thanh_vien`, RPC tổng hợp `bhy_ideas_hd_tong_hop`,
  trigger chặn cột quản trị của phiếu. FK item→ý tưởng để `RESTRICT`:
  ý tưởng đã trình Hội đồng thì chủ phiếu không xóa được nữa.
- UI: `src/pages/one/OneIdeaCouncilPage.tsx` + `src/components/one/ideas/council/*`
  (form phiếu, bảng tổng hợp Phụ lục 07, khung quản trị TCTH).
- Nút vào trang chỉ hiện với thành viên Hội đồng (khối giới thiệu BHY Ideas).

## Lỗi phát hiện khi rà soát module Ideas (đã vá cùng đợt)

1. **Bình luận ý tưởng bị RLS chặn hoàn toàn**: `addComment` không gửi
   `user_id`, cột không có DEFAULT trong khi policy đòi `user_id = auth.uid()`
   → mọi bình luận mới đều lỗi. Vá kép: client gửi `user_id` tường minh +
   migration đặt `DEFAULT auth.uid()`.
2. **Đếm thiếu khi quá 1000 dòng**: các truy vấn ý tưởng/vote/bình luận dùng
   giới hạn mặc định 1000 dòng của Supabase, vượt là đếm thiếu âm thầm →
   `usePortalIdeas` tải theo trang (`taiHetTrang`).
3. Chính tả khối giới thiệu: «Hiểu quả» → «Hiệu quả».

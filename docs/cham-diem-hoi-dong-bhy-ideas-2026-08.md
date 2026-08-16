# Chấm điểm Hội đồng Bac Hung Yen Ideas — 08/2026

Thay Google Form của **Phụ lục 06** (quy chế chương trình Bac Hung Yen Ideas)
bằng phiếu chấm ngay trong BHY One, tại `/one/y-tuong/hoi-dong`.

## Nghiệp vụ (bám quy chế mục VI + Phụ lục 06/07)

- Phòng TCTH mở **đợt chấm**, trình các ý tưởng đã bật cờ «Đề xuất Hội đồng»
  ở bảng theo dõi, cấp mã `BHYI-<năm>-NNN` và **tầng xét** (3 tầng, xem dưới).
  Kỳ quý xét Vươn cành; **kỳ xét Lan tỏa là đợt riêng** do TCTH mở tại thời
  điểm phù hợp (đầu hoặc cuối quý IV) để đánh giá quá trình triển khai của
  các ý tưởng đã đạt Vươn cành.
- **Thành viên Hội đồng là BẢNG DỮ LIỆU** `portal_idea_council_members`
  (học từ `council_members` của Hội đồng đầu mối đã vận hành thực tế): Giám
  đốc quyết định thành phần từng thời kỳ, TCTH cập nhật ở khung quản trị;
  người nghỉ dài hạn tắt `is_active` (giữ phiếu cũ, không tính quorum); cờ
  `is_chair` = **Chủ tịch Hội đồng** (GĐ CN). Seed ban đầu chép từ
  `council_members` đang hoạt động.
- Thành viên chấm **một phiếu định danh/ý tưởng**, **HAI PHA Nháp → Gửi**
  (như Hội đồng đầu mối — nháp lưu dở được, không vào tổng hợp):
  - A1–A3 (họ tên, chức danh, tài khoản) lấy từ tài khoản đăng nhập — không khai lại;
  - A4 khai xung đột lợi ích; C1–C5 chấm 5 tiêu chí thang 1–5;
  - D1 đề xuất; D2 góp ý (bắt buộc khi «Không xét thưởng»/«Cần bổ sung» —
    ràng buộc cả ở CHECK constraint, chỉ áp cho phiếu GỬI);
  - phiếu (kể cả đã gửi) sửa được đến khi đợt **chốt**; nháp tự xóa được khi
    đợt còn mở, phiếu đã gửi chỉ System Admin xóa; `submitted_at` do DB đóng dấu.
- **Chặn tự chấm HAI LỚP** (bài học «đã xảy ra 1 lần» của Hội đồng đầu mối):
  RLS chặn thành viên chấm ý tưởng mà mình là tài khoản gửi phiếu
  (`created_by`) HOẶC có họ tên trong nhóm đề xuất (so khớp danh sách tách
  dấu phẩy, chuẩn hóa lowercase). Người bị chặn cũng bị trừ khỏi mẫu số
  quorum của ý tưởng đó. Cùng PHÒNG đề xuất thì vẫn chấm + khai A4.
- **Hạn gửi phiếu + tự chốt + nhắc PUSH** (không email — chốt 08/2026):
  `voting_deadline` đặt ở khung quản trị; cron `bhy-ideas-hoi-dong-nhac`
  (09:00 VN, T2–T6) gọi edge function `notify-idea-council`: quá hạn → tự
  chuyển đợt sang «đã chốt»; còn ≤3 ngày → push nhắc thành viên còn thiếu
  phiếu. TCTH cũng bấm nhắc tay (từng người / tất cả) ở mục Tiến độ.
- **Tiến độ đôn đốc** (RPC `bhy_ideas_hd_tien_do`, quyền TCTH + Chủ tịch):
  hiện TÊN THẬT + đã gửi x/y + số nháp + mã ý tưởng còn thiếu — **tuyệt đối
  không kèm điểm** (tách «ai đã nộp» khỏi «ai chấm bao nhiêu», đúng mục đích
  quy chế «kiểm soát số lượt chấm, đánh giá mức độ tham gia»).
- **Bảo mật điểm cá nhân** (chốt 08/2026 — chặt hơn quy chế): kết quả chấm của
  từng thành viên **ẩn danh với cả Phòng TCTH và Ban Giám đốc**, chỉ System
  Admin đọc được phiếu định danh (RLS chỉ mở cho vai trò `system_admin`).
  TCTH vẫn vận hành đầy đủ trên dữ liệu ẩn danh: RPC `bhy_ideas_hd_phieu_an_danh`
  trả phiếu không danh tính, không mốc thời gian gửi (tránh suy ngược người
  chấm theo giờ), sắp theo uuid ngẫu nhiên — và **chỉ mở sau khi đợt chốt**
  (TCTH cũng là người chấm, không nhìn điểm giữa chừng).
- **Phong tỏa kết quả — Công bố TÁCH KHỎI Chốt đợt** (bài học results_embargo
  của Hội đồng đầu mối): bản tổng hợp (Phụ lục 07) bị khóa với MỌI người —
  kể cả Admin TCTH — cho đến khi **Chủ tịch Hội đồng hoặc System Admin bấm
  «Công bố»** (RPC `bhy_ideas_hd_cong_bo`; hai vai trò này cũng là nhóm duy
  nhất vượt khóa xem trước, bản xem vẫn ẩn danh). Chốt đợt chỉ dừng nhận
  phiếu; công bố mới mở kết quả.
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

- «Số phiếu hợp lệ» = số thành viên đã GỬI phiếu (nháp không tính; mọi phiếu
  gửi đều tính); tỷ lệ 2/3 so trên số này và so **nguyên**
  (`3×đồng ý ≥ 2×hợp lệ`) để biên 2/3 không trượt số thực.
- **QUORUM KÉP** (chốt 08/2026 — câu «2/3 thành viên Hội đồng tham gia chấm
  đồng ý» của quy chế đọc được hai cách nên ghép cả hai): (a) số phiếu đã gửi
  ≥ 2/3 tổng thành viên đủ điều kiện chấm ý tưởng đó (mẫu số = thành viên
  đang hoạt động trừ người bị chặn tự chấm — RPC trả `eligible_members`);
  (b) trong số phiếu đó ≥ 2/3 đồng ý. Hụt quorum thì chưa xét, lý do hiện rõ
  trong bảng tổng hợp.
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

- Migration `20260924090000_bhy_ideas_cham_diem_hoi_dong.sql`: 4 bảng
  `portal_idea_council_members/_rounds/_items/_votes`; hàm
  `bhy_ideas_hd_la_thanh_vien` + `bhy_ideas_hd_la_chu_tich`; RPC
  `bhy_ideas_hd_tong_hop` (tổng hợp, embargo) · `bhy_ideas_hd_phieu_an_danh`
  (phiếu ẩn danh, sau chốt) · `bhy_ideas_hd_cong_bo` (công bố) ·
  `bhy_ideas_hd_tien_do` (đôn đốc); trigger chặn cột quản trị + đóng mốc gửi;
  cron `bhy-ideas-hoi-dong-nhac`. FK item→ý tưởng để `RESTRICT`:
  ý tưởng đã trình Hội đồng thì chủ phiếu không xóa được nữa.
- Edge function `supabase/functions/notify-idea-council/index.ts`: nhắc PUSH
  (UI TCTH bấm hoặc cron), tự chốt đợt quá hạn — **cần deploy cùng migration**
  (`supabase functions deploy notify-idea-council`). Dùng chung hạ tầng
  push_subscriptions + VAPID Vault, ghi lỗi thiết bị theo bài học 20260911.
- UI: `src/pages/one/OneIdeaCouncilPage.tsx` + `src/components/one/ideas/council/*`
  (form phiếu 2 pha, bảng tổng hợp Phụ lục 07 + nút công bố, khung quản trị
  TCTH: đợt/hạn chấm, trình ý tưởng, tiến độ + nhắc push, đội hình Hội đồng).
- Nút vào trang chỉ hiện với thành viên Hội đồng/admin (khối giới thiệu BHY Ideas).

## Lỗi phát hiện khi rà soát module Ideas (đã vá cùng đợt)

1. **Bình luận ý tưởng bị RLS chặn hoàn toàn**: `addComment` không gửi
   `user_id`, cột không có DEFAULT trong khi policy đòi `user_id = auth.uid()`
   → mọi bình luận mới đều lỗi. Vá kép: client gửi `user_id` tường minh +
   migration đặt `DEFAULT auth.uid()`.
2. **Đếm thiếu khi quá 1000 dòng**: các truy vấn ý tưởng/vote/bình luận dùng
   giới hạn mặc định 1000 dòng của Supabase, vượt là đếm thiếu âm thầm →
   `usePortalIdeas` tải theo trang (`taiHetTrang`).
3. Chính tả khối giới thiệu: «Hiểu quả» → «Hiệu quả».

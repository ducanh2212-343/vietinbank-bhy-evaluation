# Chấm điểm Hội đồng Bac Hung Yen Ideas — 08/2026

Thay Google Form của **Phụ lục 06** (quy chế chương trình Bac Hung Yen Ideas)
bằng phiếu chấm ngay trong BHY One, tại `/one/y-tuong/hoi-dong`.

## Nghiệp vụ (bám quy chế mục VI + Phụ lục 06/07)

- Hàng quý Phòng TCTH mở **đợt chấm**, trình các ý tưởng đề xuất Cấp độ
  **Vươn cành** / **Lan tỏa** (đã bật cờ «Đề xuất Hội đồng» ở bảng theo dõi),
  cấp mã `BHYI-<năm>-NNN` và tầng đề xuất.
- Thành viên Hội đồng (Ban Giám đốc, PGĐ, Trưởng/Phó phòng, lãnh đạo TCTH —
  vai trò `bgd`/`pgd`/`manager`/`tcth_admin`; người được Giám đốc bổ sung thì
  cấp vai trò tương ứng) chấm **một phiếu định danh/ý tưởng**:
  - A1–A3 (họ tên, chức danh, tài khoản) lấy từ tài khoản đăng nhập — không khai lại;
  - A4 khai xung đột lợi ích; C1–C5 chấm 5 tiêu chí thang 1–5;
  - D1 đề xuất; D2 góp ý (bắt buộc khi «Không xét thưởng»/«Cần bổ sung» —
    ràng buộc cả ở CHECK constraint).
  - Phiếu sửa được đến khi đợt **chốt** (RLS chặn theo trạng thái đợt).
- **Bảo mật điểm cá nhân** đúng quy chế: thành viên chỉ đọc phiếu của mình;
  phiếu chi tiết chỉ TCTH/System admin đọc; thành viên xem **bản tổng hợp**
  (Phụ lục 07) qua RPC sau khi đợt chốt, góp ý trả về ẩn danh.
- **Xung đột lợi ích**: khai báo ghi trên phiếu; với ý tưởng Lan tỏa/ảnh hưởng
  lớn, Hội đồng có thể quyết định phiếu «tính tham khảo» — TCTH gạt cờ, phiếu
  bị loại khỏi điểm TB và tỷ lệ đồng ý (cờ này chỉ admin sửa được, trigger chặn).

## Ngưỡng xét thưởng (mục VI.3) — logic tại `src/lib/ideaCouncil.ts`

| Tầng | Điều kiện | Thưởng |
|---|---|---|
| Vươn cành | TB chung ≥ 3,5 · An toàn/rủi ro ≥ 3 · ≥ 2/3 thành viên tham gia chấm đồng ý | 1.000.000đ |
| Lan tỏa | TB chung ≥ 4,0 · Nhân rộng ≥ 4 · An toàn ≥ 3 · ≥ 2/3 đồng ý Lan tỏa | 2.000.000–3.000.000đ |

Quy ước đã chốt trong code (unit test kèm theo):

- «Số phiếu hợp lệ» = phiếu đã gửi trừ phiếu tham khảo; tỷ lệ 2/3 so trên số
  này và so **nguyên** (`3×đồng ý ≥ 2×hợp lệ`) để biên 2/3 không trượt số thực.
- Đồng ý **Vươn cành** tính cả phiếu «Đồng ý Lan tỏa» (tầng cao bao hàm tầng dưới);
  đồng ý **Lan tỏa** chỉ tính phiếu Lan tỏa.
- Điểm TB chung = trung bình 5 điểm TB tiêu chí (Phụ lục 07).
- Kết luận hệ thống chỉ là **gợi ý theo ngưỡng**, không vượt quá tầng TCTH trình;
  quyết định cuối cùng thuộc Hội đồng.

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

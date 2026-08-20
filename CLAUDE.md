# Quy ước làm việc trên repo này

Đọc file này trước khi sửa bất cứ thứ gì. Repo thường xuyên có **3–4 nhánh
`claude/*` chạy song song từ các phiên làm việc khác nhau** — mọi quy ước dưới
đây tồn tại để các nhánh đó không giẫm lên nhau.

Ứng dụng: cổng **Bắc Hưng Yên ONE** của VietinBank Chi nhánh Bắc Hưng Yên,
~150 cán bộ dùng hằng ngày. Vite + React + TypeScript + Tailwind + shadcn/ui,
backend Supabase.

---

## 1. Mỗi PR đổi giao diện/nghiệp vụ PHẢI kèm một mục lịch sử phiên bản

Đây là quy ước dễ quên nhất và là quy ước có cổng chặn tự động.

```sh
npm run phien-ban -- ten-ngan-khong-dau --loai=tinh-nang --phan-he=chieu-thuc-2
```

- **Một lần cập nhật = MỘT FILE MỚI** trong `src/data/changelog/`. Thêm mục là
  thêm file, **không sửa file nào đang có** — nhờ vậy hai nhánh song song không
  bao giờ xung đột git ở đây. Nhiều việc rời rạc trong một PR thì nhiều file.
- **KHÔNG tự đặt số phiên bản.** Người viết chỉ khai `loai`
  (`lon` → X · `tinh-nang` → Y · `sua-loi` → Z); `src/lib/lichSuPhienBan.ts` tự
  tính X.Y.Z. Đặt tay thì hai nhánh cùng chọn một số rồi phải sửa lúc gộp.
- **Ngày trong mục là ngày lên hệ thống**, không phải ngày viết code. Không lùi ngày.
- Viết cho **cán bộ** đọc: không tên bảng, không tên hàm, không số migration.
  `tieuDe` (≤ 80 ký tự, cán bộ được gì) · `tomTat` (thay cho cách cũ nào) ·
  `diemChinh` (1–5 gạch đầu dòng).
- PR thuần kỹ thuật (dọn mã, đổi test/tài liệu/cấu hình build, nhập dữ liệu)
  không cần mục — ghi `[khong-can-changelog]` vào commit message.

Tự kiểm trước khi mở PR: `npm run phien-ban:kiem-tra -- origin/main`.
Quy ước đầy đủ + nghiên cứu: `docs/lich-su-phien-ban-va-bao-tin-moi-2026-08.md`.

## 2. Trước khi kết thúc việc

```sh
npm run test                              # phải xanh toàn bộ
npx tsc --noEmit -p tsconfig.app.json     # phải sạch
```

**Đừng chạy `npm run lint` rồi đi sửa hàng loạt.** Repo đang nợ 544 lỗi lint có
sẵn (phần lớn là `no-explicit-any` ở các chỗ `(supabase as any)` cho bảng chưa
regenerate `types.ts`). Sửa nợ đó là một việc riêng, trộn vào PR tính năng thì
không ai rà nổi diff. Code mới cứ theo khuôn đang có.

## 3. Database

- Migration nằm ở `supabase/migrations/`, đặt tên `2026MMDD090000_ten_viet_khong_dau.sql`,
  **áp thủ công** vào project `whlysprzsguehxmrjwha` (SQL Editor / `supabase db push`).
  Vercel và CI **không** tự áp.
- Mỗi migration kèm một file gỡ ở `supabase/rollbacks/<cùng tên>_down.sql`.
- Ghi rõ trong PR: migration này **đã áp** hay **chưa áp**. README ghi lại trạng
  thái từng đợt — đây là nguồn duy nhất biết database thật đang ở đâu.
- RLS là hàng rào thật, không phải giao diện. Bảng mới luôn `ENABLE ROW LEVEL
  SECURITY` + `REVOKE ALL ... FROM anon`. Khách đối tác (`guest`) mặc định
  **không** thấy gì.

## 4. Những nơi là NGUỒN DUY NHẤT — đừng đẻ nơi thứ hai

| Việc | Nguồn duy nhất |
| --- | --- |
| Cây điều hướng (thanh ngang, menu dọc, tab điện thoại, ⌘K, breadcrumb) | `src/lib/navigation.ts` |
| Lịch sử phiên bản | `src/data/changelog/` + `src/lib/lichSuPhienBan.ts` |
| Thông báo tới cán bộ | hàng đợi `ct2_thong_bao`; push chỉ là một kênh phát |
| Đếm ngày làm việc, mốc giờ nhịp | lịch nghỉ lễ trong `/lich-nghi-le` |
| Màn hình mở cho khách đối tác | `src/lib/manHinhKhach.ts` (bản máy chủ: `supabase/functions/_shared/guestScreens.ts` — hai bản phải y hệt) |

Luật nào áp cho cả client lẫn edge function thì **hai bên phải trùng nhau từng
dòng** và ghi chú chéo (ví dụ `duongDanThongBao` ở `src/lib/ct2.ts` với
`duongDan` trong `supabase/functions/notify-ct2/index.ts`).

## 5. Thông báo cho cán bộ

- Hình thức push theo chuẩn 09/08/2026: tiêu đề ngắn mang con số, thân tin mỗi
  dòng một nhãn (`Việc:` / `Hồ sơ:` / `Nội dung:`), không nối bằng «·».
  Chi tiết: `docs/chuan-hinh-thuc-push-2026-08.md`.
- Cán bộ đã nhận 21+ loại push và **chỉ 27/100 người bật push**. Thêm một loại
  tin mới là quyết định nghiệp vụ, không phải quyết định kỹ thuật — cân trước
  khi thêm, và mặc định là gộp vào tin đã có.
- Tin sinh ngoài giờ tự nằm chờ tới 7h00 buổi làm việc kế tiếp
  (`ct2_moc_phat_gan_nhat()`). Đừng mở ngoại lệ.

## 6. Ngôn ngữ và cách viết

- **Tiếng Việt** cho tên biến/hàm mới, comment, commit message, chữ trên giao diện.
  Mã cũ tiếng Anh thì cứ để yên, không đổi tên hàng loạt trong PR tính năng.
- Comment giải thích **vì sao**, không mô tả lại mã. Đặc biệt: khi một cách làm
  trông kỳ lạ, ghi lại cách làm cũ đã hỏng thế nào — repo này có nhiều quyết
  định ngược trực giác vì đã va phải sự cố thật.
- Commit message: một dòng đầu nói kết quả cho người dùng, thân bài nói vì sao.

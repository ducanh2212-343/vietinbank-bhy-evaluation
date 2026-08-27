## Việc này giải quyết chuyện gì

<!-- Một đoạn: cán bộ/lãnh đạo đang vướng gì, sau thay đổi này thì khác ra sao. -->

## Cách làm

<!-- Những quyết định đáng nói và lý do. Không cần liệt kê lại từng file. -->

## Mục lịch sử phiên bản

<!--
BẮT BUỘC nếu PR đổi thứ cán bộ nhìn thấy hoặc thao tác được (kể cả sửa lỗi).
Tạo bằng:  npm run phien-ban -- ten-ngan --loai=tinh-nang --phan-he=chieu-thuc-2
Một lần cập nhật = MỘT FILE MỚI trong src/data/changelog/ — không sửa file cũ,
không tự đặt số phiên bản (hệ thống tự tính). Nhiều việc rời rạc thì nhiều file.
PR thuần kỹ thuật: ghi [khong-can-changelog] vào commit message và nói lý do ở đây.
-->

- [ ] Đã thêm file `src/data/changelog/<ngày>-<slug>.ts`, hoặc PR thuần kỹ thuật (nêu lý do)

## Đã kiểm chứng

- [ ] `npm run test`
- [ ] `npx tsc --noEmit -p tsconfig.app.json`
- [ ] Nếu có migration: kèm file `supabase/rollbacks/<tên>_down.sql` và ghi rõ **đã áp** hay **chưa áp** vào project

## Cần làm khi triển khai

<!-- Áp migration nào, deploy edge function nào, bấm công bố phiên bản hay chưa. Không có thì ghi "Không". -->

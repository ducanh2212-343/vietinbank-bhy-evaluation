-- SỬA TIẾP PHIẾU QUÝ II CỦA PGĐ NGUYỄN THỊ THÙY LINH (27/07/2026, đợt 2)
--
-- Sau khi GĐ được gán làm PGĐ phụ trách của PGĐ Thùy Linh (kiêm nhiệm — pgd_id =
-- director_id = GĐ), vai thực thi của GĐ trên phiếu chuyển 'director' → 'pgd'
-- (quy tắc kiêm nhiệm trong getReviewerLevel). Hệ quả:
--   1. Ô "Kết luận & định hướng phát triển" giờ đọc/ghi pgd_overall_review, trong khi
--      kết luận GĐ đã viết nằm ở director_overall_review → ô hiện TRỐNG, GĐ tưởng mất.
--   2. Phiếu bị ép sang 'Trả lại' bằng dropdown admin → return_target/return_reason
--      đều NULL: cán bộ không thấy lý do trả, banner phía cán bộ trống.
--
-- Sửa: chuyển kết luận về pgd_overall_review (ô đang hiển thị + BM01 đọc theo vai);
-- điền đích trả 'employee' và lý do trả — trích nguyên văn câu chỉ đạo trong kết luận
-- của GĐ ("Cần xây dựng lại Kế hoạch hành động."), không thêm nội dung mới.
--
-- Lưu ý: lệnh dưới CŨNG set director_overall_review = '{}' nhưng bị trigger
-- trg_protect_overall_reviews khôi phục (thiết kế chống ghi rỗng đè nhận xét) —
-- phần dọn bản sao đó nằm ở migration 20260802100500 (tắt trigger tạm thời).

UPDATE public.form_submissions
   SET pgd_overall_review      = director_overall_review,
       director_overall_review = '{}'::jsonb,
       return_target           = COALESCE(return_target, 'employee'),
       return_reason           = COALESCE(return_reason, 'Cần xây dựng lại Kế hoạch hành động.')
 WHERE id = 'a706ebd8-aec1-4d21-b4cf-b12de4a2a179'
   AND status = 'returned'
   AND COALESCE(pgd_overall_review, '{}'::jsonb) = '{}'::jsonb
   AND director_overall_review ? 'next_focus';

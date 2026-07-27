-- KIÊM NHIỆM PGĐ + GIÁM ĐỐC: chuyển kết luận đã viết sang đúng cột (27/07/2026)
--
-- Bối cảnh: Giám đốc trực tiếp phụ trách Phòng TCTH nên 3 hồ sơ có
-- pgd_id = director_id = Giám đốc. Trước bản vá, getReviewerLevel trả vai 'director'
-- (giám sát, KHÔNG có nút phê duyệt) → phiếu kẹt ở 'reviewed', và kết luận Giám đốc
-- viết bị ghi vào cột director_overall_review.
--
-- Sau bản vá (src/lib/reviewerScope.ts), người kiêm nhiệm nhận vai 'pgd' → ô kết luận
-- đọc/ghi pgd_overall_review. Chuyển nội dung đã viết sang cột này để không "mất chữ";
-- GIỮ NGUYÊN bản gốc ở director_overall_review làm dấu vết.

UPDATE public.form_submissions fs
   SET pgd_overall_review = fs.director_overall_review
  FROM public.profiles p
 WHERE p.id = fs.employee_id
   AND p.pgd_id IS NOT NULL
   AND p.pgd_id = p.director_id
   AND fs.director_overall_review IS NOT NULL
   AND fs.director_overall_review <> '{}'::jsonb
   AND (fs.pgd_overall_review IS NULL OR fs.pgd_overall_review = '{}'::jsonb);

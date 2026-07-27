-- BACKFILL NGƯỜI ĐÁNH GIÁ CHO PHIẾU ĐÃ DUYỆT QUÝ II/2026 (27/07/2026)
--
-- Migration 20260730090000_form_reviewer_fallback đã bịt gốc lỗi phiếu vô chủ, nhưng
-- phần backfill khi đó chỉ chạm status 'submitted'/'reviewed'. Còn sót các phiếu đã ở
-- trạng thái 'approved' mà reviewer_id NULL: 94 phiếu Quý I + 5 phiếu Quý II.
--
-- Hệ quả: exportBM01Data tra tên người đánh giá từ reviewer_id → dòng ký "Người đánh
-- giá" trong file Word BM01 để trống; danh sách Phiếu đã duyệt cũng trống cột này.
--
-- PHẠM VI CỐ TÌNH BÓ HẸP Ở QUÝ II/2026 — KHÔNG đụng 94 phiếu Quý I/2026 (kỳ nhập từ
-- hệ thống cũ, tuyến báo cáo hiện tại không phản ánh đúng người đã duyệt lúc đó).
--
-- Căn cứ với 5 phiếu Quý II (đều là CB Phòng Hỗ trợ tín dụng, manager_id NULL,
-- pgd_id = Nguyễn Thị Thùy Linh): manager_overall_review = '{}' (rỗng — không Trưởng
-- phòng nào nhận xét) trong khi pgd_overall_review có nội dung thật do PGĐ ký, kèm
-- pgd_review_status = 'approved'. Đúng ca "duyệt gộp một bước": PGĐ Thùy Linh vừa
-- đánh giá vừa phê duyệt. COALESCE(manager_id, pgd_id, director_id) trả về đúng người
-- thực tế đã đánh giá, không phải gán theo sơ đồ tổ chức.
--
-- An toàn: hàng đợi duyệt chỉ nạp status in ('submitted','reviewed','returned') nên
-- phiếu approved không sống lại trong queue của ai; trigger form_reviewer_fallback chỉ
-- chạy nhánh gán khi NEW.status = 'submitted'; điều kiện reviewer_id IS NULL khiến
-- lệnh idempotent và không thể ghi đè phiếu đã có người đánh giá.

UPDATE public.form_submissions fs
   SET reviewer_id = COALESCE(p.manager_id, p.pgd_id, p.director_id)
  FROM public.profiles p, public.evaluation_cycles ec
 WHERE p.id = fs.employee_id
   AND ec.id = fs.cycle_id
   AND ec.name = 'Quý II/2026'
   AND fs.status = 'approved'
   AND fs.reviewer_id IS NULL
   AND COALESCE(p.manager_id, p.pgd_id, p.director_id) IS NOT NULL;

-- GỠ PHÊ DUYỆT ÉP CHO PHIẾU QUÝ II CỦA PGĐ NGUYỄN THỊ THÙY LINH (27/07/2026)
--
-- Bối cảnh: GĐ (người đánh giá duy nhất của PGĐ — luồng duyệt gộp một bước) bị khoá
-- nút "Đánh giá & phê duyệt" vì gate chống hình thức: 5 skill lõi chưa chấm
-- (SK01/SK04/SK07/SK35/SK37), 4 skill chấm lệch thiếu nhận xét trao đổi
-- (SK02/SK03/SK31/SK38), 2/6 nhóm thái độ chưa đánh giá. GĐ dùng dropdown admin
-- "Trạng thái biểu mẫu" ép phiếu sang approved lúc 27/07 03:50.
--
-- Hệ quả sai: trigger record_skill_level_achievements chốt level bằng
-- COALESCE(manager, self) → 5 skill GĐ CHƯA chấm bị ghi thành tích theo mức TỰ
-- đánh giá (SK04/SK35/SK37 = L3, SK01/SK07 = L2); first_reviewed_at/first_approved_at
-- bị đóng dấu 03:50 dù chưa hề có bước rà soát; pgd_review_status vẫn 'pending'.
--
-- Sửa: xoá thành tích level ghi từ phiếu này (sẽ được ghi LẠI đúng khi GĐ phê duyệt
-- thật), gỡ 2 mốc thời gian ép, trả phiếu về 'submitted' để GĐ chấm nốt rồi bấm
-- "Đánh giá & phê duyệt" — hoặc "Trả lại cán bộ" nếu kế hoạch phát triển chưa phù hợp.
--
-- Quy tắc chốt level đi kèm (code): level cấp trên chấm là level cuối cùng —
-- useHistoricalSkillLevels đổi ưu tiên manager trước self, khớp effectiveLevel/BM01.

-- 1. Xoá thành tích level ghi nhầm từ lần ép duyệt (đúng 17 dòng lúc 03:50:55)
DELETE FROM public.skill_level_achievements
 WHERE form_id = 'a706ebd8-aec1-4d21-b4cf-b12de4a2a179';

-- 2. Trả phiếu về trạng thái chờ GĐ xử lý. Trigger check_status_transition không có
--    nhánh approved→submitted (ngoài quyền system_admin qua auth.uid() — NULL trong
--    migration) nên tắt tạm trong transaction này.
ALTER TABLE public.form_submissions DISABLE TRIGGER trg_check_status_transition;

UPDATE public.form_submissions
   SET status = 'submitted',
       first_reviewed_at = NULL,
       first_approved_at = NULL
 WHERE id = 'a706ebd8-aec1-4d21-b4cf-b12de4a2a179'
   AND status = 'approved';

ALTER TABLE public.form_submissions ENABLE TRIGGER trg_check_status_transition;

-- ============================================================================
-- KHÔI PHỤC LẠI VIỆC THU HỒI QUYỀN ĐÃ BỊ ĐẶT LẠI ÂM THẦM
--
-- Migration 20260815090000_va_lo_hong_anon_execute_va_is_staff.sql từng thu hồi
-- quyền chạy của người lạ trên `suggest_skill_mentors` và `get_campaign_progress`
-- vì đó là hai chỗ rò thật. Rà ngày 24/08/2026 cho thấy quyền ĐÃ QUAY LẠI:
-- ACL hiện có mục `=X/postgres`, tức PUBLIC (và do đó cả anon) chạy được.
--
-- VÌ SAO QUAY LẠI: `CREATE OR REPLACE FUNCTION` giữ nguyên quyền, nhưng
-- `DROP FUNCTION` + `CREATE FUNCTION` thì KHÔNG — quyền trở về mặc định của
-- Postgres là PUBLIC có EXECUTE. Một migration sau đó tạo lại hàm theo cách thứ
-- hai là đủ để lặng lẽ mở lại cửa, không ai thấy trong diff.
--
-- BÀI HỌC GHI LẠI CHO LẦN SAU: hễ DROP rồi CREATE lại một hàm SECURITY DEFINER
-- thì phải viết lại luôn cặp REVOKE/GRANT ngay dưới nó trong cùng migration.
--
-- Mức độ lộ đo được lúc rà là thấp (hai hàm chỉ trả về con số tổng hợp, không ra
-- danh sách người), nên đây là dọn đúng nguyên tắc chứ không phải chữa cháy.
--
-- KHÔNG đụng tới `authenticated`: cả bốn hàm đều đang được cán bộ ĐÃ ĐĂNG NHẬP
-- gọi từ giao diện (LearningCampaignsPage, MentorSuggestion, usePortalIdeas),
-- cắt quyền đó là gãy tính năng.
-- ============================================================================

-- Hai hàm từng được vá rồi bị đặt lại
REVOKE ALL ON FUNCTION public.get_campaign_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_progress(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.suggest_skill_mentors(uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suggest_skill_mentors(uuid, uuid, integer) TO authenticated, service_role;

-- Hai hàm quản trị: chốt chặn bên trong VIẾT ĐÚNG CHIỀU (raise cho mọi người
-- không phải quản trị, kể cả khách vãng lai vì has_role(NULL, …) là false) nên
-- không khai thác được. Thu hồi thêm ở lớp quyền cho khỏi phụ thuộc một dòng mã.
REVOKE ALL ON FUNCTION public.admin_update_idea_status(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_idea_status(uuid, text, text, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.decide_plan_change_request(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_plan_change_request(uuid, boolean, text) TO authenticated, service_role;

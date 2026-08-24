-- GỠ: trả quyền chạy cho người lạ trên bốn hàm. Chỉ dùng khi buộc phải khôi phục.
GRANT EXECUTE ON FUNCTION public.get_campaign_progress(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.suggest_skill_mentors(uuid, uuid, integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_idea_status(uuid, text, text, boolean) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_plan_change_request(uuid, boolean, text) TO PUBLIC;

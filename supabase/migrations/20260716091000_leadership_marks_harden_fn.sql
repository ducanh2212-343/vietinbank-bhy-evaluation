-- Hardening: các hàm trigger của dấu ấn không cần expose qua PostgREST RPC.
REVOKE EXECUTE ON FUNCTION public.guard_leadership_mark_owner_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_kanban_leadership_mark() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_kanban_leadership_mark_skill() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_leadership_mark_skill_limit() FROM anon, authenticated;

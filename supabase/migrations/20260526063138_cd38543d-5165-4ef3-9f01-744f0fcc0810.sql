
REVOKE EXECUTE ON FUNCTION public.get_my_pgd_scope_dept_ids() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_pgd_scope_dept_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;

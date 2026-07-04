-- Hard-delete a staff member and ALL of their own records, atomically.
-- Records where the person only acted on OTHERS (reviewer/approver/manager)
-- are nullified so those other people's data survives.
-- Returns the auth user_id (may be NULL) so the caller can delete the auth user.
CREATE OR REPLACE FUNCTION public.hard_delete_staff(p_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy hồ sơ cán bộ';
  END IF;

  -- 1) Nullify references where this person acted on OTHERS' records
  UPDATE public.form_submissions SET reviewer_id = NULL WHERE reviewer_id = p_profile_id;
  UPDATE public.form_submissions SET returned_by = NULL WHERE returned_by = p_profile_id;
  UPDATE public.staff_star_classifications SET approver_id = NULL WHERE approver_id = p_profile_id;
  UPDATE public.staff_star_classifications SET override_by = NULL WHERE override_by = p_profile_id;
  UPDATE public.staff_star_classifications SET evaluator_id = NULL WHERE evaluator_id = p_profile_id;
  UPDATE public.training_proposals SET approved_by = NULL WHERE approved_by = p_profile_id;
  UPDATE public.profiles SET manager_id = NULL WHERE manager_id = p_profile_id;
  UPDATE public.profiles SET pgd_id = NULL WHERE pgd_id = p_profile_id;
  UPDATE public.profiles SET director_id = NULL WHERE director_id = p_profile_id;
  UPDATE public.departments SET manager_id = NULL WHERE manager_id = p_profile_id;

  -- 2) Delete this person's own records (form_submissions cascades to all its
  --    child action/assessment tables; kanban_cards cascades to its logs).
  DELETE FROM public.kanban_cards WHERE profile_id = p_profile_id;
  DELETE FROM public.form_submissions WHERE employee_id = p_profile_id;
  DELETE FROM public.staff_star_classifications WHERE employee_id = p_profile_id;
  DELETE FROM public.form04_staff_classifications WHERE employee_id = p_profile_id;
  DELETE FROM public.training_proposals WHERE employee_id = p_profile_id;
  DELETE FROM public.admin_comments WHERE employee_id = p_profile_id;
  DELETE FROM public.admin_evaluations WHERE employee_id = p_profile_id;

  -- 3) Delete records keyed by the auth user
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.ai_usage_log WHERE user_id = v_user_id;
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
  END IF;

  -- 4) Delete the profile itself
  DELETE FROM public.profiles WHERE id = p_profile_id;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.hard_delete_staff(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hard_delete_staff(uuid) TO service_role;

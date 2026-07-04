-- Fix: profiles_self_update_guard blocked service_role (edge function) updates.
-- In a service_role context auth.uid() is NULL, so none of the admin-role
-- bypass checks matched, and the ownership check `NEW.user_id <> auth.uid()`
-- evaluated to NULL (not TRUE) so it did not return early — falling through to
-- the sensitive-field block. This broke re-creating/updating existing staff via
-- the create-staff-user / bulk-create-staff-users edge functions.
--
-- Edge functions enforce their own STAFF_CREATOR_ROLES authorization before
-- touching profiles, and unauthenticated end-users can't reach an UPDATE here
-- (RLS requires user_id = auth.uid()). So when auth.uid() IS NULL the caller is
-- the trusted backend and should bypass this owner-only field guard.
CREATE OR REPLACE FUNCTION public.profiles_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trusted backend/service-role context (no end-user JWT).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins/managers/pgd bypass
  IF public.has_role(auth.uid(), 'system_admin'::app_role)
     OR public.has_role(auth.uid(), 'bgd'::app_role)
     OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
     OR public.has_role(auth.uid(), 'manager'::app_role)
     OR public.has_role(auth.uid(), 'pgd'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Only guard when the editor is the owner of the row
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Block changes to sensitive fields
  IF NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.employee_code IS DISTINCT FROM OLD.employee_code
     OR NEW.department_id IS DISTINCT FROM OLD.department_id
     OR NEW.position_id IS DISTINCT FROM OLD.position_id
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.manager_id IS DISTINCT FROM OLD.manager_id
     OR NEW.pgd_id IS DISTINCT FROM OLD.pgd_id
     OR NEW.director_id IS DISTINCT FROM OLD.director_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.join_date IS DISTINCT FROM OLD.join_date
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Bạn không có quyền sửa các trường nhân sự nhạy cảm. Vui lòng liên hệ quản trị.';
  END IF;

  RETURN NEW;
END;
$$;


-- 1. Add 'returned' to evaluation_status enum
ALTER TYPE evaluation_status ADD VALUE IF NOT EXISTS 'returned';

-- 2. Add new self-editable columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS hobbies text;

-- 3. Trigger to prevent employees from editing sensitive profile fields themselves
CREATE OR REPLACE FUNCTION public.profiles_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Admins/managers/pgd bypass
  IF public.has_role(auth.uid(), 'system_admin'::app_role)
     OR public.has_role(auth.uid(), 'bgd'::app_role)
     OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
     OR public.has_role(auth.uid(), 'manager'::app_role)
     OR public.has_role(auth.uid(), 'pgd'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Only guard when the editor is the owner of the row
  IF NEW.user_id <> auth.uid() THEN
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

DROP TRIGGER IF EXISTS trg_profiles_self_update_guard ON public.profiles;
CREATE TRIGGER trg_profiles_self_update_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_self_update_guard();

-- 4. Allow users to UPDATE their own profile (guard trigger enforces field-level limits)
DROP POLICY IF EXISTS "Users can update own profile limited" ON public.profiles;
CREATE POLICY "Users can update own profile limited"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. Avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

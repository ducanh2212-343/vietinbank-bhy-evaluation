
CREATE OR REPLACE FUNCTION public.get_my_supervisor_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT unnest(ARRAY[manager_id, pgd_id, director_id])
    FROM public.profiles WHERE user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Users can view own supervisors" ON public.profiles;
CREATE POLICY "Users can view own supervisors"
ON public.profiles FOR SELECT TO authenticated
USING (id = ANY(public.get_my_supervisor_ids()));

CREATE OR REPLACE FUNCTION public.sync_manager_role_from_position()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.position IS NULL THEN RETURN NEW; END IF;
  IF NEW.position ILIKE 'Trưởng%' OR NEW.position ILIKE 'Phó%' THEN
    -- upgrade only if currently employee or no role row
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id) THEN
      UPDATE public.user_roles
        SET role = 'manager'
        WHERE user_id = NEW.user_id
          AND role = 'employee';
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'manager');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_manager_role_from_position ON public.profiles;
CREATE TRIGGER trg_sync_manager_role_from_position
AFTER INSERT OR UPDATE OF position ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_manager_role_from_position();

-- Backfill: upgrade employee -> manager for Trưởng/Phó
UPDATE public.user_roles ur
SET role = 'manager'
FROM public.profiles p
WHERE ur.user_id = p.user_id
  AND ur.role = 'employee'
  AND (p.position ILIKE 'Trưởng%' OR p.position ILIKE 'Phó%');

-- Insert manager role for Trưởng/Phó that have no row yet
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.user_id, 'manager'::app_role
FROM public.profiles p
WHERE p.user_id IS NOT NULL
  AND (p.position ILIKE 'Trưởng%' OR p.position ILIKE 'Phó%')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id);

CREATE OR REPLACE FUNCTION public.sync_form_reviewer_on_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_reviewer uuid;
BEGIN
  IF NEW.manager_id IS NOT DISTINCT FROM OLD.manager_id
     AND NEW.pgd_id IS NOT DISTINCT FROM OLD.pgd_id
     AND NEW.director_id IS NOT DISTINCT FROM OLD.director_id
     AND NEW.position IS NOT DISTINCT FROM OLD.position THEN
    RETURN NEW;
  END IF;

  IF NEW.position ILIKE '%giám đốc chi nhánh%' THEN
    v_new_reviewer := NEW.id;
  ELSIF NEW.position ILIKE 'trưởng%' THEN
    v_new_reviewer := COALESCE(NEW.pgd_id, NEW.director_id, NEW.manager_id);
  ELSE
    v_new_reviewer := COALESCE(NEW.manager_id, NEW.pgd_id, NEW.director_id);
  END IF;

  IF v_new_reviewer IS NULL THEN RETURN NEW; END IF;

  UPDATE public.form_submissions
     SET reviewer_id = v_new_reviewer,
         updated_at  = now()
   WHERE employee_id = NEW.id
     AND status::text IN ('draft','submitted','returned','reviewed')
     AND reviewer_id IS DISTINCT FROM v_new_reviewer;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_form_reviewer ON public.profiles;
CREATE TRIGGER trg_sync_form_reviewer
AFTER UPDATE OF manager_id, pgd_id, director_id, position ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_form_reviewer_on_profile_change();

-- Backfill ngay cho dữ liệu hiện tại
UPDATE public.form_submissions fs
   SET reviewer_id = CASE
     WHEN p.position ILIKE '%giám đốc chi nhánh%' THEN p.id
     WHEN p.position ILIKE 'trưởng%' THEN COALESCE(p.pgd_id, p.director_id, p.manager_id)
     ELSE COALESCE(p.manager_id, p.pgd_id, p.director_id)
   END,
   updated_at = now()
  FROM public.profiles p
 WHERE fs.employee_id = p.id
   AND fs.status::text IN ('draft','submitted','returned','reviewed')
   AND fs.reviewer_id IS DISTINCT FROM CASE
     WHEN p.position ILIKE '%giám đốc chi nhánh%' THEN p.id
     WHEN p.position ILIKE 'trưởng%' THEN COALESCE(p.pgd_id, p.director_id, p.manager_id)
     ELSE COALESCE(p.manager_id, p.pgd_id, p.director_id)
   END
   AND CASE
     WHEN p.position ILIKE '%giám đốc chi nhánh%' THEN p.id
     WHEN p.position ILIKE 'trưởng%' THEN COALESCE(p.pgd_id, p.director_id, p.manager_id)
     ELSE COALESCE(p.manager_id, p.pgd_id, p.director_id)
   END IS NOT NULL;
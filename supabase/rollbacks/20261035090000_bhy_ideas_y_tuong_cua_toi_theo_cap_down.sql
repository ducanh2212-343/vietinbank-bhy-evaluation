-- Gỡ 20261035090000: bỏ hàm «ý tưởng của tôi theo cấp», trả bhy_ideas_phong_lien_quan
-- về bản tự tách tên (20261032090000), rồi bỏ hàm tách tên dùng chung. Không đụng dữ liệu.
DROP FUNCTION IF EXISTS public.bhy_ideas_y_tuong_cua_toi();

CREATE OR REPLACE FUNCTION public.bhy_ideas_phong_lien_quan(_idea_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ten AS (
    SELECT lower(btrim(regexp_replace(x, '[.;,\s]+$', ''))) AS ten
    FROM public.portal_ideas i, unnest(string_to_array(i.proposer, ',')) AS x
    WHERE i.id = _idea_id AND btrim(x) <> ''
  ),
  khop AS (
    SELECT t.ten,
           (SELECT count(*) FROM public.profiles p WHERE lower(btrim(p.full_name)) = t.ten) AS n,
           (SELECT p.department_id FROM public.profiles p WHERE lower(btrim(p.full_name)) = t.ten LIMIT 1) AS phong
    FROM ten t
  )
  SELECT coalesce(array_agg(DISTINCT phong), '{}'::uuid[])
  FROM (
    SELECT i.phong_id AS phong FROM public.portal_ideas i WHERE i.id = _idea_id AND i.phong_id IS NOT NULL
    UNION
    SELECT k.phong FROM khop k WHERE k.n = 1 AND k.phong IS NOT NULL
  ) t
$$;

DROP FUNCTION IF EXISTS public.bhy_ideas_tach_ten_de_xuat(text);

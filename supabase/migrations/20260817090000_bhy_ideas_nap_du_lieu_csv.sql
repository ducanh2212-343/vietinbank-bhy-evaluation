-- BHY Ideas: nạp dữ liệu từ file kết xuất CSV của cổng cũ.
-- Gói JSON do scripts/import-bhy-one/import-ideas-csv.mjs sinh ra:
--   { "ideas": [ {legacy_id, level, ...} ], "comments": [ {legacy_id, idea_legacy_id, ...} ] }
--
-- Idempotent: khoá legacy_id 'bhy-ideas-csv:<thời điểm gửi>'. Ý tưởng nằm ngoài gói
-- (phiếu gửi thẳng trên cổng mới) không bị đụng tới; bình luận đến từ CSV chỉ được
-- thay ở đúng những ý tưởng có trong gói (nạp theo lô không xoá lô trước), bình luận
-- nhập trên cổng (legacy_id NULL) giữ nguyên.

CREATE OR REPLACE FUNCTION public.admin_import_ideas_csv(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _fallback_owner UUID;
  _ideas_count INTEGER;
  _comments_count INTEGER;
BEGIN
  -- Người dùng đã đăng nhập phải là quản trị; gọi phía máy chủ (service role,
  -- psql, SQL Editor — auth.uid() NULL) thì cho qua để chạy được kịch bản nạp dữ liệu.
  IF auth.uid() IS NOT NULL
     AND NOT (has_role(auth.uid(), 'system_admin'::app_role)
              OR has_role(auth.uid(), 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ quản trị viên được nạp dữ liệu ý tưởng';
  END IF;

  -- created_by bắt buộc: không dò được cán bộ theo email thì gán tài khoản system_admin
  SELECT user_id INTO _fallback_owner
  FROM public.user_roles WHERE role = 'system_admin'::app_role
  ORDER BY created_at LIMIT 1;
  IF _fallback_owner IS NULL THEN
    RAISE EXCEPTION 'Chưa có tài khoản system_admin để gán created_by';
  END IF;

  WITH src AS (
    SELECT * FROM jsonb_to_recordset(COALESCE(_payload -> 'ideas', '[]'::jsonb)) AS x(
      legacy_id TEXT, level TEXT, applicability TEXT, title TEXT, current_status TEXT,
      proposed_solution TEXT, expected_benefits TEXT, department_name TEXT, has_demo BOOLEAN,
      proposer TEXT, development_level TEXT, council_proposal BOOLEAN, creator_email TEXT,
      created_at TIMESTAMPTZ)
  ), upserted AS (
    INSERT INTO public.portal_ideas (
      legacy_id, level, applicability, title, current_status, proposed_solution,
      expected_benefits, department_name, has_demo, proposer, development_level,
      council_proposal, creator_email, created_by, created_at)
    SELECT s.legacy_id, s.level, s.applicability, s.title, s.current_status, s.proposed_solution,
           s.expected_benefits, s.department_name, COALESCE(s.has_demo, false), s.proposer,
           COALESCE(s.development_level, 'Ươm mầm'), COALESCE(s.council_proposal, false),
           s.creator_email, COALESCE(p.user_id, _fallback_owner), s.created_at
    FROM src s
    -- Chủ sở hữu = cán bộ có email trùng email người gửi (email cơ quan hoặc cá nhân)
    LEFT JOIN LATERAL (
      SELECT pr.user_id FROM public.profiles pr
      WHERE s.creator_email IS NOT NULL
        AND (lower(pr.email) = s.creator_email OR lower(pr.personal_email) = s.creator_email)
      ORDER BY pr.created_at LIMIT 1
    ) p ON true
    ON CONFLICT (legacy_id) DO UPDATE SET
      level = EXCLUDED.level,
      applicability = EXCLUDED.applicability,
      title = EXCLUDED.title,
      current_status = EXCLUDED.current_status,
      proposed_solution = EXCLUDED.proposed_solution,
      expected_benefits = EXCLUDED.expected_benefits,
      department_name = EXCLUDED.department_name,
      has_demo = EXCLUDED.has_demo,
      proposer = EXCLUDED.proposer,
      development_level = EXCLUDED.development_level,
      council_proposal = EXCLUDED.council_proposal,
      creator_email = EXCLUDED.creator_email,
      created_by = EXCLUDED.created_by,
      created_at = EXCLUDED.created_at
    RETURNING 1)
  SELECT count(*) INTO _ideas_count FROM upserted;

  -- Chỉ dọn bình luận CSV của những ý tưởng có trong gói lần này
  DELETE FROM public.portal_idea_comments c
  USING public.portal_ideas i
  WHERE c.idea_id = i.id
    AND c.legacy_id LIKE 'bhy-ideas-csv:%'
    AND i.legacy_id IN (
      SELECT x.legacy_id FROM jsonb_to_recordset(COALESCE(_payload -> 'ideas', '[]'::jsonb))
        AS x(legacy_id TEXT));

  WITH src AS (
    SELECT * FROM jsonb_to_recordset(COALESCE(_payload -> 'comments', '[]'::jsonb)) AS x(
      legacy_id TEXT, idea_legacy_id TEXT, account TEXT, user_name TEXT, body TEXT,
      created_at TIMESTAMPTZ)
  ), inserted AS (
    INSERT INTO public.portal_idea_comments (idea_id, legacy_id, user_id, user_name, body, created_at)
    SELECT i.id, c.legacy_id, p.user_id, COALESCE(p.full_name, c.user_name), c.body, c.created_at
    FROM src c
    JOIN public.portal_ideas i ON i.legacy_id = c.idea_legacy_id
    -- Tài khoản cổng cũ (vd 'phuongnt5151089') → hồ sơ cán bộ để hiện đúng tên
    LEFT JOIN LATERAL (
      SELECT pr.user_id, pr.full_name FROM public.profiles pr
      WHERE c.account IS NOT NULL AND (
        lower(pr.email) = lower(c.account) || '@gmail.com'
        OR lower(pr.email) = lower(c.account) || '@vietinbank.vn'
        OR lower(pr.personal_email) = lower(c.account) || '@gmail.com'
        OR lower(pr.personal_email) = lower(c.account) || '@vietinbank.vn')
      ORDER BY pr.created_at LIMIT 1
    ) p ON true
    RETURNING 1)
  SELECT count(*) INTO _comments_count FROM inserted;

  RETURN jsonb_build_object('ideas', _ideas_count, 'comments', _comments_count);
END;
$fn$;

-- Chỉ gọi được từ phía máy chủ (service role); không mở cho anon/authenticated
REVOKE ALL ON FUNCTION public.admin_import_ideas_csv(jsonb) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.admin_import_ideas_csv(jsonb) IS
  'Nạp ý tưởng BHY Ideas từ gói JSON của scripts/import-bhy-one/import-ideas-csv.mjs (idempotent theo legacy_id).';

-- Đổi thứ tự xác định chủ sở hữu phiếu BHY Ideas: TÊN NGƯỜI ĐỀ XUẤT trước, email sau.
-- Lý do: nhiều phiếu gửi bằng tài khoản dùng chung của phòng (13 phiếu qua tài khoản
-- Trưởng phòng DVKH, 5 phiếu qua email chung Phòng Bán lẻ, 3 phiếu qua tài khoản Trưởng
-- PGD Ân Thi…). Nếu gán theo email thì công đổi mới sáng tạo bị dồn về trưởng/phó phòng,
-- trong khi thống kê Vươn cành / Lan tỏa sau này phải về đúng cán bộ đề xuất.
-- Hồ sơ chieuthuc3 (profiles) là nguồn chuẩn cho họ tên và phòng.

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
  IF auth.uid() IS NOT NULL
     AND NOT (has_role(auth.uid(), 'system_admin'::app_role)
              OR has_role(auth.uid(), 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ quản trị viên được nạp dữ liệu ý tưởng';
  END IF;

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
           s.expected_benefits, s.department_name, COALESCE(s.has_demo, false),
           -- Chuẩn hoá tên theo hồ sơ chieuthuc3 khi dò được và phiếu chỉ có một tác giả
           CASE WHEN theo_ten.uid IS NOT NULL AND position(',' IN s.proposer) = 0
                THEN (SELECT pr.full_name FROM public.profiles pr WHERE pr.user_id = theo_ten.uid)
                ELSE s.proposer END,
           COALESCE(s.development_level, 'Ươm mầm'), COALESCE(s.council_proposal, false),
           s.creator_email,
           -- 1) tên người đề xuất  2) email người gửi  3) tài khoản quản trị
           COALESCE(theo_ten.uid, theo_email.user_id, _fallback_owner),
           s.created_at
    FROM src s
    LEFT JOIN LATERAL (
      SELECT public.bhy_tim_can_bo_theo_ten(s.proposer, s.department_name) AS uid
    ) theo_ten ON true
    LEFT JOIN LATERAL (
      SELECT pr.user_id FROM public.profiles pr
      WHERE s.creator_email IS NOT NULL
        AND (lower(pr.email) = s.creator_email OR lower(pr.personal_email) = s.creator_email)
      ORDER BY pr.created_at LIMIT 1
    ) theo_email ON true
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

REVOKE ALL ON FUNCTION public.admin_import_ideas_csv(jsonb) FROM PUBLIC, anon, authenticated;

-- Áp quy tắc mới cho các phiếu đã nạp. Giữ nguyên tên gốc trên phiếu trong custom_values
-- để còn đối chiếu lại với file kết xuất khi cần.
WITH gan AS (
  SELECT i.id,
         public.bhy_tim_can_bo_theo_ten(i.proposer, i.department_name) AS uid_ten,
         (SELECT pr.user_id FROM public.profiles pr
            WHERE i.creator_email IS NOT NULL AND lower(pr.email) = lower(i.creator_email)
            ORDER BY pr.created_at LIMIT 1) AS uid_email
  FROM public.portal_ideas i
  WHERE i.legacy_id LIKE 'bhy-ideas-csv:%'
)
UPDATE public.portal_ideas i SET
  created_by = COALESCE(g.uid_ten, g.uid_email, i.created_by),
  proposer = CASE WHEN g.uid_ten IS NOT NULL AND position(',' IN i.proposer) = 0
                  THEN (SELECT pr.full_name FROM public.profiles pr WHERE pr.user_id = g.uid_ten)
                  ELSE i.proposer END,
  custom_values = CASE
    WHEN g.uid_ten IS NOT NULL AND position(',' IN i.proposer) = 0
     AND i.proposer IS DISTINCT FROM (SELECT pr.full_name FROM public.profiles pr WHERE pr.user_id = g.uid_ten)
    THEN COALESCE(i.custom_values, '{}'::jsonb) || jsonb_build_object('ten_goc_tren_phieu', i.proposer)
    ELSE i.custom_values END
FROM gan g
WHERE g.id = i.id;

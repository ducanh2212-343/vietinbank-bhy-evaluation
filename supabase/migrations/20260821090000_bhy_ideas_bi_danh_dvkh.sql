-- Hai bí danh Phòng DVKH đã được xác nhận: 'Haich' = Chu Hồng Hải,
-- 'Nguyễn Đức Mạnh' = Vũ Đức Mạnh (ghi nhầm họ trên phiếu).
-- Sau migration này 113/113 phiếu BHY Ideas về đúng cán bộ đề xuất.
INSERT INTO public.portal_idea_proposer_alias (bi_danh, user_id, ghi_chu)
SELECT v.bi_danh, p.user_id, v.ghi_chu
FROM (VALUES
  ('haich',           'honghai9119@gmail.com',    'Viết tắt trên phiếu, đã xác nhận là Chu Hồng Hải'),
  ('nguyen duc manh', 'bonbon25122017@gmail.com', 'Phiếu ghi nhầm họ, đã xác nhận là Vũ Đức Mạnh')
) AS v(bi_danh, email, ghi_chu)
JOIN public.profiles p ON lower(p.email) = v.email
ON CONFLICT (bi_danh) DO NOTHING;

WITH gan AS (
  SELECT i.id, public.bhy_tim_can_bo_theo_ten(i.proposer, i.department_name) AS uid_ten
  FROM public.portal_ideas i WHERE i.legacy_id LIKE 'bhy-ideas-csv:%'
)
UPDATE public.portal_ideas i SET
  created_by = g.uid_ten,
  proposer = (SELECT pr.full_name FROM public.profiles pr WHERE pr.user_id = g.uid_ten),
  custom_values = COALESCE(i.custom_values, '{}'::jsonb)
                  || jsonb_build_object('ten_goc_tren_phieu', i.proposer)
FROM gan g
WHERE g.id = i.id AND g.uid_ten IS NOT NULL
  AND position(',' IN i.proposer) = 0
  AND public.bhy_chuan_hoa_ten(i.proposer)
      <> public.bhy_chuan_hoa_ten((SELECT pr.full_name FROM public.profiles pr WHERE pr.user_id = g.uid_ten));

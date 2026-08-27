-- Gỡ: đưa bhy_ideas_ung_vien_ben_re() về bản không có cột cap_de_xuat.
-- Phải DROP trước vì kiểu trả về đổi.
DROP FUNCTION IF EXISTS public.bhy_ideas_ung_vien_ben_re();

CREATE OR REPLACE FUNCTION public.bhy_ideas_ung_vien_ben_re()
RETURNS TABLE (
  idea_id uuid,
  title text,
  proposer text,
  phong text,
  current_status text,
  proposed_solution text,
  expected_benefits text,
  created_at timestamptz,
  development_level text,
  smp_trang_thai text,
  da_tung_tu_choi boolean,
  danh_gia_tcth jsonb,
  diem_tcth smallint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.title, i.proposer, i.department_name,
    i.current_status, i.proposed_solution, i.expected_benefits,
    i.created_at, i.development_level, i.smp_trang_thai,
    coalesce(a.trang_thai = 'tu_choi', false),
    a.danh_gia_tcth,
    a.diem_tcth
  FROM public.portal_ideas i
  LEFT JOIN public.portal_idea_awards a
    ON a.idea_id = i.id AND a.cap_do = 'Bén rễ'
  WHERE public.is_content_admin(auth.uid())
    AND coalesce(a.trang_thai, 'chua_co') NOT IN ('da_ghi_nhan', 'cho_gd_duyet')
  ORDER BY i.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_ung_vien_ben_re() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_ung_vien_ben_re() TO authenticated, service_role;

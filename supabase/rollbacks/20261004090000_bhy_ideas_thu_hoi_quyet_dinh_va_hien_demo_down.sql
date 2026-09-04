-- Gỡ migration 20261004090000: bỏ thu hồi, đưa các hàm về bản 20261003090000.
-- Dòng đang ở trạng thái 'thu_hoi' phải về 'tu_choi' trước khi thu hẹp CHECK.

DROP FUNCTION IF EXISTS public.bhy_ideas_gd_da_quyet_gan_day(integer);
DROP FUNCTION IF EXISTS public.bhy_ideas_rut_ho_so_ben_re(uuid, text);
DROP FUNCTION IF EXISTS public.bhy_ideas_gd_thu_hoi_ben_re(uuid, text);
DROP FUNCTION IF EXISTS public.bhy_ideas_thu_hoi_luy_ke(uuid, text);

UPDATE public.portal_idea_awards SET trang_thai = 'tu_choi' WHERE trang_thai = 'thu_hoi';
ALTER TABLE public.portal_idea_awards DROP CONSTRAINT IF EXISTS portal_idea_awards_trang_thai_check;
ALTER TABLE public.portal_idea_awards
  ADD CONSTRAINT portal_idea_awards_trang_thai_check
  CHECK (trang_thai IN ('cho_gd_duyet', 'da_ghi_nhan', 'tu_choi'));

-- Hàm điểm về bản cũ (0 khi chưa chấm) — dữ liệu diem_gd/diem_tcth đã sửa về NULL giữ nguyên
CREATE OR REPLACE FUNCTION public.bhy_ideas_diem_danh_gia(_phieu jsonb)
RETURNS smallint LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _phieu IS NULL OR jsonb_typeof(_phieu) <> 'object' THEN NULL
    ELSE (
      SELECT coalesce(sum(least(2, greatest(0, coalesce((_phieu ->> ma)::numeric, 0))))::smallint, 0)
      FROM unnest(ARRAY['d1','d2','d3','d4','d5']) AS ma
    )
  END
$$;

DROP FUNCTION IF EXISTS public.bhy_ideas_viec_cua_giam_doc();
CREATE OR REPLACE FUNCTION public.bhy_ideas_viec_cua_giam_doc()
RETURNS TABLE (
  idea_id uuid, title text, proposer text, expected_benefits text, current_status text,
  proposed_solution text, phong text, created_at timestamptz, trinh_luc timestamptz,
  nguoi_trinh text, ghi_chu text, so_ngay_cho integer, danh_gia_tcth jsonb, diem_tcth smallint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.title, i.proposer, i.expected_benefits, i.current_status, i.proposed_solution,
    a.phong, i.created_at, a.ghi_nhan_luc,
    (SELECT p.full_name FROM public.profiles p WHERE p.user_id = a.nguoi_ghi_nhan LIMIT 1),
    a.ghi_chu, GREATEST(0, EXTRACT(DAY FROM (now() - a.ghi_nhan_luc))::int), a.danh_gia_tcth, a.diem_tcth
  FROM public.portal_idea_awards a JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE a.trang_thai = 'cho_gd_duyet' AND a.cap_do = 'Bén rễ' AND public.is_staff(auth.uid())
  ORDER BY a.ghi_nhan_luc
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_viec_cua_giam_doc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_viec_cua_giam_doc() TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.bhy_ideas_ung_vien_ben_re();
CREATE OR REPLACE FUNCTION public.bhy_ideas_ung_vien_ben_re()
RETURNS TABLE (
  idea_id uuid, title text, proposer text, phong text, current_status text, proposed_solution text,
  expected_benefits text, created_at timestamptz, development_level text, smp_trang_thai text,
  da_tung_tu_choi boolean, danh_gia_tcth jsonb, diem_tcth smallint, cap_de_xuat text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.title, i.proposer, i.department_name, i.current_status, i.proposed_solution,
    i.expected_benefits, i.created_at, i.development_level, i.smp_trang_thai,
    coalesce(a.trang_thai = 'tu_choi', false), a.danh_gia_tcth, a.diem_tcth, i.level
  FROM public.portal_ideas i
  LEFT JOIN public.portal_idea_awards a ON a.idea_id = i.id AND a.cap_do = 'Bén rễ'
  WHERE public.is_content_admin(auth.uid())
    AND coalesce(a.trang_thai, 'chua_co') NOT IN ('da_ghi_nhan', 'cho_gd_duyet')
  ORDER BY i.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_ung_vien_ben_re() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_ung_vien_ben_re() TO authenticated, service_role;

-- gd_duyet / trinh / cap_nhat_smp: các bản cũ nằm trong migration 20260928090000 và
-- 20260926090000 — chạy lại đúng đoạn CREATE OR REPLACE tương ứng nếu cần lùi hẳn.
-- Các cột mới giữ lại (không DROP) để không mất vết thu hồi đã ghi.

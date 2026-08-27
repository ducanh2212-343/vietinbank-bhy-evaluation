-- ============================================================================
-- BHY Ideas — ỨNG VIÊN BÉN RỄ TRẢ THÊM CẤP ĐỀ XUẤT (Nội bộ CN / Đề xuất TSC)
--
-- Vận hành 27/08/2026, Phòng TCTH nêu: hai đường lên Bén rễ cần hai cách làm
-- khác hẳn nhau, mà màn «Đánh giá & trình» lại đổ chung một danh sách.
--
--   · Đề xuất NỘI BỘ CN → TCTH chấm phiếu 5 câu rồi trình Giám đốc  (đường 1)
--   · Đề xuất TSC       → TCTH chỉ khớp trạng thái với phê duyệt của Trụ sở
--                         chính ở màn Đối chiếu SMP, KHÔNG chấm phiếu (đường 2)
--
-- Không tách được thì TCTH phải lướt qua 109 phiếu đường 2 để tìm 44 phiếu
-- đường 1 — đúng phần việc cần làm lại là phần bị lẫn nhiều nhất.
--
-- Hàm cũ không trả cột level nên giao diện không lọc được. Đổi kiểu trả về nên
-- phải DROP rồi tạo lại: CREATE OR REPLACE không đổi được RETURNS TABLE.
--
-- Chỉ THÊM một cột, không đổi điều kiện lọc — số ứng viên trước và sau y hệt.
-- ============================================================================

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
  diem_tcth smallint,
  -- Cấp đề xuất: 'Nội bộ CN' hoặc 'Đề xuất TSC' — quyết định ý tưởng đi đường
  -- nào trong hai đường lên Bén rễ của quy chế mục 4
  cap_de_xuat text
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
    a.diem_tcth,
    i.level
  FROM public.portal_ideas i
  LEFT JOIN public.portal_idea_awards a
    ON a.idea_id = i.id AND a.cap_do = 'Bén rễ'
  WHERE public.is_content_admin(auth.uid())
    -- Chưa được công nhận Bén rễ và không đang chờ Giám đốc
    AND coalesce(a.trang_thai, 'chua_co') NOT IN ('da_ghi_nhan', 'cho_gd_duyet')
  ORDER BY i.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.bhy_ideas_ung_vien_ben_re() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_ung_vien_ben_re() TO authenticated, service_role;

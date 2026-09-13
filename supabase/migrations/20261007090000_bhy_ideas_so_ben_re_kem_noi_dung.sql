-- ============================================================================
-- BHY Ideas — SỔ BÉN RỄ KÈM NỘI DUNG Ý TƯỞNG ĐỂ THAO TÁC NGAY TRÊN SỔ
--
-- Giám đốc (03/09/2026): «trong màn hình sổ Bén rễ có thể ấn vào sáng kiến
-- luôn hoặc có nút thu hồi». Sổ hiện chỉ là danh sách dòng — muốn đọc ý tưởng
-- hay thu hồi phải sang tab khác tìm lại. Hàm sổ trả thêm nội dung ý tưởng,
-- phiếu TCTH, lời trình và vết thu hồi để mở ngay tại chỗ.
-- Đổi kiểu trả về nên DROP rồi tạo lại; điều kiện lọc giữ nguyên.
-- ============================================================================
DROP FUNCTION IF EXISTS public.bhy_ideas_so_ben_re();
CREATE OR REPLACE FUNCTION public.bhy_ideas_so_ben_re()
RETURNS TABLE (
  idea_id uuid, title text, proposer text, phong text, has_demo boolean, cap_de_xuat text,
  development_level text, trang_thai text, duyet_cn boolean, duyet_tsc boolean, ghi_nhan_kpi boolean,
  muc_thuong integer, tra_ve_boi text, ly_do_tra_ve text, tra_ve_luc timestamptz,
  so_lan_bo_sung smallint, bo_sung_luc timestamptz, nguoi_duyet text, duyet_luc timestamptz,
  nguoi_trinh text, trinh_luc timestamptz, smp_ma text, smp_trang_thai text,
  diem_tcth smallint, diem_gd smallint, y_kien_gd text, moc_gan_nhat timestamptz,
  ly_do_ket_luan text, ket_luan_luc timestamptz, phoi_hop_ten text[],
  current_status text, proposed_solution text, expected_benefits text,
  danh_gia_tcth jsonb, ghi_chu text, bo_sung_ghi_chu text,
  ly_do_thu_hoi text, thu_hoi_luc timestamptz, so_lan_thu_hoi smallint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.title, i.proposer, a.phong, i.has_demo, i.level, i.development_level,
    a.trang_thai, a.duyet_cn, a.duyet_tsc, a.ghi_nhan_kpi, a.muc_thuong,
    a.tra_ve_boi, a.ly_do_tra_ve, a.tra_ve_luc, a.so_lan_bo_sung, a.bo_sung_luc,
    (SELECT p.full_name FROM public.profiles p WHERE p.user_id = a.nguoi_duyet LIMIT 1),
    a.duyet_luc,
    (SELECT p.full_name FROM public.profiles p WHERE p.user_id = a.nguoi_ghi_nhan LIMIT 1),
    a.ghi_nhan_luc,
    i.smp_ma, i.smp_trang_thai,
    a.diem_tcth, a.diem_gd, a.y_kien_gd,
    GREATEST(a.ghi_nhan_luc, coalesce(a.duyet_luc, a.ghi_nhan_luc), coalesce(a.tra_ve_luc, a.ghi_nhan_luc),
             coalesce(a.bo_sung_luc, a.ghi_nhan_luc), coalesce(a.ket_luan_luc, a.ghi_nhan_luc),
             coalesce(a.updated_at, a.ghi_nhan_luc)),
    a.ly_do_ket_luan, a.ket_luan_luc,
    ARRAY(SELECT p.title FROM public.portal_ideas p WHERE p.id = ANY(a.phoi_hop_voi)),
    i.current_status, i.proposed_solution, i.expected_benefits,
    a.danh_gia_tcth, a.ghi_chu, a.bo_sung_ghi_chu,
    a.ly_do_thu_hoi, a.thu_hoi_luc, a.so_lan_thu_hoi
  FROM public.portal_idea_awards a
  JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE a.cap_do = 'Bén rễ'
    AND (public.bhy_ideas_la_giam_doc() OR public.is_content_admin(auth.uid()))
  ORDER BY 27 DESC
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_so_ben_re() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_so_ben_re() TO authenticated, service_role;

-- Gỡ 20261007090000: đưa bhy_ideas_so_ben_re() về đúng bản 20261006090000
-- (bỏ 9 cột nội dung ý tưởng / phiếu TCTH / vết thu hồi). Không cột bảng nào,
-- không dòng dữ liệu nào bị đụng — chỉ hàm đọc đổi kiểu trả về nên phải DROP.
--
-- Bản gỡ chép nguyên văn định nghĩa cũ vào đây, KHÔNG bảo người gỡ «chạy lại
-- đoạn 4) của migration trước»: lúc phải gỡ gấp thì không ai muốn đi tìm và cắt
-- đúng đoạn giữa một file 879 dòng.
DROP FUNCTION IF EXISTS public.bhy_ideas_so_ben_re();
CREATE OR REPLACE FUNCTION public.bhy_ideas_so_ben_re()
RETURNS TABLE (
  idea_id uuid, title text, proposer text, phong text, has_demo boolean, cap_de_xuat text,
  development_level text, trang_thai text, duyet_cn boolean, duyet_tsc boolean, ghi_nhan_kpi boolean,
  muc_thuong integer, tra_ve_boi text, ly_do_tra_ve text, tra_ve_luc timestamptz,
  so_lan_bo_sung smallint, bo_sung_luc timestamptz, nguoi_duyet text, duyet_luc timestamptz,
  nguoi_trinh text, trinh_luc timestamptz, smp_ma text, smp_trang_thai text,
  diem_tcth smallint, diem_gd smallint, y_kien_gd text, moc_gan_nhat timestamptz,
  ly_do_ket_luan text, ket_luan_luc timestamptz, phoi_hop_ten text[]
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
    ARRAY(SELECT p.title FROM public.portal_ideas p WHERE p.id = ANY(a.phoi_hop_voi))
  FROM public.portal_idea_awards a
  JOIN public.portal_ideas i ON i.id = a.idea_id
  WHERE a.cap_do = 'Bén rễ'
    AND (public.bhy_ideas_la_giam_doc() OR public.is_content_admin(auth.uid()))
  ORDER BY 27 DESC
$$;
REVOKE ALL ON FUNCTION public.bhy_ideas_so_ben_re() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_so_ben_re() TO authenticated, service_role;

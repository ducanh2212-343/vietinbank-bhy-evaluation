-- ============================================================================
-- BHY Ideas — Ý KIẾN HỘI ĐỒNG mở cho chủ ý tưởng, lãnh đạo phòng, Ban Giám đốc, TCTH
--
-- Giám đốc (16/09/2026): «chủ ý tưởng và admin TCTH, Ban Giám đốc, và lãnh đạo
-- Phòng có ý tưởng, đọc được các ý kiến của các thành viên Hội đồng».
--
-- Trước đây góp ý D2 chỉ thành viên Hội đồng xem được ở bảng tổng hợp; người
-- viết ra ý tưởng — chính người cần đọc nhất để hoàn thiện — lại không thấy.
--
-- Ẩn danh GIỮ NGUYÊN (chốt 08/2026): chỉ trả nội dung góp ý + con số tổng hợp,
-- không tên, không mốc giờ. Chỉ đợt ĐÃ CÔNG BỐ (khóa kết quả là hết thấy).
-- Chỉ phiếu hợp lệ — phiếu cùng phòng / liên phòng đã loại thì góp ý cũng
-- không đưa ra, cho khớp với điểm.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.bhy_ideas_hd_y_kien_hoi_dong()
RETURNS TABLE (
  idea_id uuid, round_id uuid, round_name text, cap_xet text, cong_bo_luc timestamptz,
  ket_luan text, avg_overall numeric, total_votes integer, eligible_members integer,
  agree integer, rec_khong_xet integer, rec_can_bo_sung integer, gop_y jsonb, vai text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ten text;
  v_phong uuid;
  v_la_tcth boolean;
  v_la_bgd boolean;
  v_la_ld_phong boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  SELECT lower(btrim(coalesce(p.full_name, ''))), p.department_id INTO v_ten, v_phong
    FROM public.profiles p WHERE p.user_id = v_uid LIMIT 1;
  v_la_tcth := public.is_content_admin(v_uid);
  v_la_bgd := public.bhy_ideas_la_giam_doc();
  -- Lãnh đạo phòng = vai manager/pgd VÀ cùng phòng (phong_id) với ý tưởng
  v_la_ld_phong := public.has_role(v_uid, 'manager'::app_role) OR public.has_role(v_uid, 'pgd'::app_role);

  RETURN QUERY
  SELECT it.idea_id, r.id, r.name, r.cap_xet, r.ghi_so_luc,
         t.ket_luan, t.avg_overall, t.total_votes, t.eligible_members,
         CASE r.cap_xet WHEN 'Lan tỏa' THEN t.agree_lan_toa ELSE t.agree_vuon_canh END,
         t.rec_khong_xet, t.rec_can_bo_sung, t.gop_y,
         CASE
           WHEN i.created_by = v_uid OR (v_ten <> '' AND v_ten = ANY (
                  SELECT lower(btrim(regexp_replace(x, '[.;,\s]+$', ''))) FROM unnest(string_to_array(i.proposer, ',')) AS x))
             THEN 'chu_y_tuong'
           WHEN v_la_tcth THEN 'tcth'
           WHEN v_la_bgd THEN 'ban_giam_doc'
           WHEN v_la_ld_phong AND v_phong IS NOT NULL AND v_phong = i.phong_id THEN 'lanh_dao_phong'
         END
  FROM public.portal_idea_council_items it
  JOIN public.portal_idea_council_rounds r ON r.id = it.round_id AND r.results_published
  JOIN public.portal_ideas i ON i.id = it.idea_id
  CROSS JOIN LATERAL public.bhy_ideas_hd_tinh_item(it.id) t
  WHERE i.created_by = v_uid
     OR (v_ten <> '' AND v_ten = ANY (
          SELECT lower(btrim(regexp_replace(x, '[.;,\s]+$', ''))) FROM unnest(string_to_array(i.proposer, ',')) AS x))
     OR v_la_tcth
     OR v_la_bgd
     OR (v_la_ld_phong AND v_phong IS NOT NULL AND v_phong = i.phong_id)
  ORDER BY r.created_at DESC, it.idea_code;
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_hd_y_kien_hoi_dong() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_hd_y_kien_hoi_dong() TO authenticated, service_role;
